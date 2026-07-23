// ========================= API-CONNECTIVITY-SCRIPT.JS =========================
// Estado global e configuração das APIs (Plano §1 — Roteamento Multi-API)

const state = {
    cnpjList: [],
    results: [],
    rawInputData: null,       // Dados brutos da planilha original para Merge
    isProcessing: false,
    isPaused: false,
    currentIndex: 0,
    apiDelay: 300,
    maxParallelRequests: 3,
    requestsInProgress: 0,
    pendingRequests: [],
    cnpjCache: {},
    autoPauseEnabled: true,
    autoPauseDelay: 30,
    consecutiveErrors: 0,
    autoPauseTimer: null,
    errorTypeToHandle: null,
    isAutoPaused: false,
    connectionTestInProgress: false,
    scoreConfig: {
        cepOrigem: '',
        cnaes: [
            { codigo: '5611203', label: 'Lanchonetes/Sorveterias/Açaí', peso: 40 },
            { codigo: '4721104', label: 'Comércio Doces/Sorvetes', peso: 40 },
            { codigo: '1053800', label: 'Fabricação de Gelados', peso: 40 },
            { codigo: '4721102', label: 'Padarias/Confeitarias', peso: 25 }
        ],
        cidades: ['Piracicaba', 'Campinas', 'Americana', 'Santa Bárbara', 'Limeira', 'Sumaré']
    },

    deepMergeEnabled: false,

    // §1.1 — Fila de APIs na ordem customizável pelo usuário
    apis: [
        { id: 'brasilapi',       name: 'BrasilAPI',       url: 'https://brasilapi.com.br/api/cnpj/v1/{cnpj}',                                        active: true, consecutiveFailures: 0, isFallback: false, totalUsed: 0 },
        { id: 'publica_cnpj_ws', name: 'Publica CNPJ WS', url: 'https://publica.cnpj.ws/cnpj/{cnpj}',                                                active: true, consecutiveFailures: 0, isFallback: false, totalUsed: 0 },
        { id: 'minhareceita',    name: 'minhaReceita',    url: 'https://minhareceita.org/{cnpj}',                                                     active: true, consecutiveFailures: 0, isFallback: false, totalUsed: 0 },
        { id: 'receitaws',       name: 'ReceitaWS',       url: 'https://www.receitaws.com.br/v1/cnpj/{cnpj}',                                         active: true, consecutiveFailures: 0, isFallback: false, totalUsed: 0 },
        { id: 'opencnpj',        name: 'OpenCNPJ',        url: 'https://api.opencnpj.org/{cnpj}?dataset=receita',                                    active: true, consecutiveFailures: 0, isFallback: true,  totalUsed: 0 },
        { id: 'invertexto',      name: 'Invertexto',      url: 'https://api.invertexto.com/v1/cnpj/{cnpj}?token=20128|Wk9IhRx5wlalJlRxy2Vt5KV1bpP0wFtB', active: true, consecutiveFailures: 0, isFallback: true,  totalUsed: 0 },
        { id: 'cnpja',           name: 'CNPJa',           url: 'https://cnpja.com/office/{cnpj}/__data.json?x-sveltekit-invalidated=001',            active: true, consecutiveFailures: 0, isFallback: true,  totalUsed: 0 },
        { id: 'casadosdados',    name: 'Casa dos Dados',  url: 'https://casadosdados.com.br/solucao/cnpj/{cnpj}',                                    active: true, consecutiveFailures: 0, isFallback: true,  totalUsed: 0 }
    ]
};

// DOM Elements Reference — preenchido pelo ui-enhancement na init()
const elements = {};

// ========================= UTILITÁRIOS COMPARTILHADOS =========================
const utils = {
    // Preserva suporte a CNPJ Alfanumérico (RFB 2026+)
    cleanCnpjStr(str) {
        if (!str) return '';
        return String(str).toUpperCase().replace(/[^A-Z0-9]/g, '');
    },
    formatCnpjForDisplay(cnpj) {
        if (!cnpj) return '-';
        const c = this.cleanCnpjStr(cnpj);
        if (c.length !== 14) return cnpj;
        return c.replace(/^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})([0-9]{2})$/, '$1.$2.$3/$4-$5');
    },
    formatCnpjForApi(cnpj) {
        let c = this.cleanCnpjStr(cnpj);
        while (c.length < 14) c = '0' + c;
        return c;
    },
    // Validação matemática RFB (suporta alfanumérico)
    getCharVal(c) {
        const code = String(c).charCodeAt(0);
        if (code >= 48 && code <= 57) return code - 48; // 0-9
        if (code >= 65 && code <= 90) return code - 48; // Letras A-Z (Serpro: charCode - 48, A=17)
        return 0;
    },
    calculateCnpjCheckDigits(base12) {
        if (!base12 || base12.length !== 12) return null;
        let sum1 = 0;
        const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        for (let i = 0; i < 12; i++) {
            sum1 += this.getCharVal(base12[i]) * weights1[i];
        }
        let rest1 = sum1 % 11;
        let dv1 = rest1 < 2 ? 0 : 11 - rest1;

        const base13 = base12 + dv1;
        let sum2 = 0;
        const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        for (let i = 0; i < 13; i++) {
            sum2 += this.getCharVal(base13[i]) * weights2[i];
        }
        let rest2 = sum2 % 11;
        let dv2 = rest2 < 2 ? 0 : 11 - rest2;

        return `${dv1}${dv2}`;
    },
    isValidCnpj(cnpj) {
        const clean = this.cleanCnpjStr(cnpj);
        if (clean.length !== 14) return false;
        if (/^(\w)\1+$/.test(clean)) return false;
        if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(clean)) return false;
        const base12 = clean.substring(0, 12);
        const currentDv = clean.substring(12, 14);
        return currentDv === this.calculateCnpjCheckDigits(base12);
    },
    // Idade e maturidade comercial
    calculateAge(aberturaStr) {
        if (!aberturaStr || aberturaStr === '-') return null;
        try {
            let birthDate = null;
            if (aberturaStr.includes('/')) {
                const parts = aberturaStr.split('/');
                if (parts.length === 3) birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
            } else if (aberturaStr.includes('-')) {
                const parts = aberturaStr.split('-');
                if (parts.length === 3) birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
            }
            if (!birthDate || isNaN(birthDate.getTime())) return null;
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age < 0 ? 0 : age;
        } catch (e) {
            return null;
        }
    },
    getAgeDescription(age) {
        if (age === null) return { class: 'badge', text: 'Desconhecida', commercial: 'Sem informação temporal.' };
        if (age < 2) return { class: 'badge-status-inativa', text: 'Startup/Recém-Criada', commercial: 'Empresa nova (<2 anos). Decisores ágeis.' };
        if (age < 5) return { class: 'badge-origin', text: 'Em Crescimento', commercial: 'Empresa com 2 a 5 anos de mercado em expansão.' };
        return { class: 'badge-status-ativa', text: 'Maturidade Consolidada', commercial: 'Empresa sólida (>5 anos de atividade).' };
    },
    detectAccountingContact(phone, email, fantasy, socialReason) {
        const pattern = /(contab|accounting|assessoria|escritorio|fiscal|consultoria)/gi;
        const testText = `${fantasy || ''} ${socialReason || ''} ${email || ''}`;
        return pattern.test(testText);
    },
    // Haversine KM
    haversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    async fetchCepCoords(cep) {
        if (!cep) return null;
        const cleanCep = String(cep).replace(/\D/g, '');
        if (cleanCep.length !== 8) return null;
        const cacheKey = `cep_coords_${cleanCep}`;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (_) {}
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
            if (!res.ok) return null;
            const data = await res.json();
            const coords = data.location && data.location.coordinates;
            const result = {
                lat: coords && coords.latitude ? +coords.latitude : null,
                lon: coords && coords.longitude ? +coords.longitude : null,
                cidade: data.city || '', uf: data.state || ''
            };
            if (result.lat !== null) {
                try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch (_) {}
            }
            return result;
        } catch (_) { return null; }
    },
    // Motor de Score B2B Ameripan em Lote
    async calculateB2bScore(item) {
        if (!item || item.error) return { score: 0, temp: 'Frio ❄️', reasons: [], age: null, isAccounting: false };
        let score = 0;
        const reasons = [];
        const scoreCfg = state.scoreConfig;

        const stripNums = s => String(s || '').replace(/[^0-9]/g, '');
        const cnaeMatch = (a, b) => stripNums(a) === stripNums(b) && stripNums(a).length > 0;

        // CNAE Principal
        const cnaePrincipalCod = stripNums(item.cnae_fiscal || item.cnae_principal);
        if (cnaePrincipalCod) {
            for (const cfg of scoreCfg.cnaes) {
                if (cnaeMatch(cnaePrincipalCod, cfg.codigo)) {
                    score += cfg.peso;
                    reasons.push(`+${cfg.peso} CNAE principal: ${cfg.label} (${cnaePrincipalCod}).`);
                    break;
                }
            }
        }

        // CNAE Secundário (+15)
        const secList = item.cnaes_secundarios || item.cnae_secundarias || [];
        if (Array.isArray(secList)) {
            for (const sec of secList) {
                const secCod = stripNums(sec.codigo || sec);
                if (cnaeMatch(secCod, cnaePrincipalCod)) continue;
                const cfgMatch = scoreCfg.cnaes.find(cfg => cnaeMatch(secCod, cfg.codigo));
                if (cfgMatch) {
                    score += 15;
                    reasons.push(`+15 CNAE secundário compatível (${secCod}).`);
                    break;
                }
            }
        }

        // Simples Nacional / MEI (+10)
        const isOptante = item.simples_nacional?.optante === true || item.opcao_pelo_simples === true || String(item.simples || '').toLowerCase() === 'sim';
        if (isOptante) {
            score += 10;
            reasons.push('+10 Optante pelo Simples Nacional.');
        }

        // Capital Social (R$ 20k - 300k) (+10)
        const cs = Number(item.capital_social) || 0;
        if (cs >= 20000 && cs <= 300000) {
            score += 10;
            reasons.push(`+10 Capital Social na faixa ideal (R$ ${cs.toLocaleString('pt-BR')}).`);
        }

        // Idade (6 meses a 5 anos) (+10)
        const age = this.calculateAge(item.data_inicio_atividade || item.abertura);
        if (age !== null && age >= 1 && age <= 5) {
            score += 10;
            reasons.push('+10 Janela de alta receptividade comercial (1-5 anos de atividade).');
        }

        // E-mail institucional (+10)
        const email = String(item.email || '').toLowerCase();
        const emailFree = ['gmail', 'hotmail', 'outlook', 'yahoo', 'bol.com', 'uol.com'];
        if (email && email !== '-' && !emailFree.some(f => email.includes(f))) {
            score += 10;
            reasons.push('+10 E-mail institucional próprio.');
        }

        // Obras CNO (+20)
        if (item.cno && item.cno.obras && item.cno.obras.length > 0) {
            score += 20;
            reasons.push(`+20 ${item.cno.obras.length} obra(s) vinculada(s) no CNO.`);
        }

        // Geocodificação / Haversine (se CEP de Origem estiver configurado)
        const cepOrig = stripNums(scoreCfg.cepOrigem);
        const cepDest = stripNums(item.cep);
        if (cepOrig.length === 8 && cepDest.length === 8) {
            if (cepOrig === cepDest) {
                score += 25;
                reasons.push('+25 CEP idêntico ao de origem (0 km).');
            } else {
                const origCoords = await this.fetchCepCoords(cepOrig);
                const destCoords = await this.fetchCepCoords(cepDest);
                if (origCoords && destCoords && origCoords.lat !== null && destCoords.lat !== null) {
                    const km = this.haversineKm(origCoords.lat, origCoords.lon, destCoords.lat, destCoords.lon);
                    const kmR = Math.round(km);
                    if (km <= 15) { score += 25; reasons.push(`+25 ~${kmR} km da origem (≤ 15 km).`); }
                    else if (km <= 35) { score += 20; reasons.push(`+20 ~${kmR} km da origem (15–35 km).`); }
                    else if (km <= 60) { score += 10; reasons.push(`+10 ~${kmR} km da origem (35–60 km).`); }
                } else if (item.municipio && scoreCfg.cidades.some(c => item.municipio.toLowerCase().includes(c.toLowerCase()))) {
                    score += 20;
                    reasons.push(`+20 Município ${item.municipio} na área de cobertura.`);
                }
            }
        } else if (item.municipio && scoreCfg.cidades.some(c => item.municipio.toLowerCase().includes(c.toLowerCase()))) {
            score += 20;
            reasons.push(`+20 Município ${item.municipio} na área de cobertura.`);
        }

        const isAccounting = this.detectAccountingContact(item.ddd_telefone_1 || item.telefone, item.email, item.nome_fantasia, item.razao_social);

        let temp = 'Frio ❄️';
        if (score >= 70) temp = 'Quente 🔥';
        else if (score >= 35) temp = 'Morno ⚡';

        return { score, temp, reasons, age, isAccounting };
    },

    updateProgressBar(current, total) {
        if (!elements.progressBar) return;
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        elements.progressBar.style.width = `${pct}%`;
        elements.progressBar.textContent = `${pct}%`;
    },
    showLoading()  { elements.loadingSpinner?.classList.remove('hidden'); },
    hideLoading()  { elements.loadingSpinner?.classList.add('hidden'); },
    updateStatus(msg) { if (elements.statusText) elements.statusText.textContent = msg; },
    checkFileApiSupport() {
        if (window.File && window.FileReader && window.FileList && window.Blob) return true;
        alert('Seu navegador não suporta a API de arquivos.');
        return false;
    },
    sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
    // §4.1 — Higienização de contatos para prospecção
    cleanPhone(phone) {
        if (!phone) return '';
        return String(phone).replace(/\D/g, '');
    },
    // Atualiza estatísticas rápidas
    updateStats() {
        const total = state.cnpjList.length;
        const processed = state.results.filter(r => r !== undefined).length;
        const errors = state.results.filter(r => r && r.error).length;
        const success = processed - errors;
        const pending = total - processed;
        const el = (id) => document.getElementById(id);
        if (el('statTotal'))   el('statTotal').textContent = total;
        if (el('statSuccess')) el('statSuccess').textContent = success;
        if (el('statError'))   el('statError').textContent = errors;
        if (el('statPending')) el('statPending').textContent = pending;
        const panel = el('statsPanel');
        if (panel && total > 0) panel.classList.remove('hidden');
    },

    // ===== GERENCIAMENTO DE REORDENAÇÃO DE APIS =====
    moveApiUp(index) {
        if (index <= 0 || index >= state.apis.length) return;
        const temp = state.apis[index];
        state.apis[index] = state.apis[index - 1];
        state.apis[index - 1] = temp;
        this.saveApiOrder();
        if (typeof uiControllers !== 'undefined' && uiControllers.renderApiQueueStatus) {
            uiControllers.renderApiQueueStatus();
        }
    },
    moveApiDown(index) {
        if (index < 0 || index >= state.apis.length - 1) return;
        const temp = state.apis[index];
        state.apis[index] = state.apis[index + 1];
        state.apis[index + 1] = temp;
        this.saveApiOrder();
        if (typeof uiControllers !== 'undefined' && uiControllers.renderApiQueueStatus) {
            uiControllers.renderApiQueueStatus();
        }
    },
    toggleApiActive(index) {
        if (index < 0 || index >= state.apis.length) return;
        state.apis[index].active = !state.apis[index].active;
        this.saveApiOrder();
        if (typeof uiControllers !== 'undefined' && uiControllers.renderApiQueueStatus) {
            uiControllers.renderApiQueueStatus();
        }
    },
    saveApiOrder() {
        try {
            const orderData = state.apis.map(a => ({ id: a.id, active: a.active }));
            localStorage.setItem('cnpj_apis_order', JSON.stringify(orderData));
        } catch (e) {}
    },
    loadApiOrder() {
        try {
            const saved = localStorage.getItem('cnpj_apis_order');
            if (saved) {
                const parsed = JSON.parse(saved);
                const apiMap = new Map(state.apis.map(a => [a.id, a]));
                const newApis = [];
                parsed.forEach(item => {
                    const apiObj = apiMap.get(item.id);
                    if (apiObj) {
                        apiObj.active = item.active;
                        newApis.push(apiObj);
                        apiMap.delete(item.id);
                    }
                });
                apiMap.forEach(apiObj => newApis.push(apiObj));
                state.apis = newApis;
            }
        } catch (e) {}
    },

    demoteApiToLast(apiId) {
        const idx = state.apis.findIndex(a => a.id === apiId);
        if (idx !== -1 && idx < state.apis.length - 1) {
            const [target] = state.apis.splice(idx, 1);
            state.apis.push(target);
            this.saveApiOrder();
            if (typeof uiControllers !== 'undefined' && uiControllers.renderApiQueueStatus) {
                uiControllers.renderApiQueueStatus();
            }
        }
    },
    isCnpjDataComplete(data) {
        if (!data) return false;

        const hasFantasia = !!(data.nome_fantasia && data.nome_fantasia.trim());
        const hasEmail = !!(data.email && data.email.includes('@'));
        const hasPhone1 = !!(data.ddd_telefone_1 && data.ddd_telefone_1.replace(/\D/g, '').length >= 8);
        const hasPhone2 = !!(data.ddd_telefone_2 && data.ddd_telefone_2.replace(/\D/g, '').length >= 8);
        const hasCapital = !!(data.capital_social && Number(data.capital_social) > 0);
        const hasCnaesSec = Array.isArray(data.cnaes_secundarios) && data.cnaes_secundarios.length > 0;

        const nat = (data.natureza_juridica || '').toUpperCase();
        const porte = (data.porte || '').toUpperCase();
        const isEmpresarioOuMei = nat.includes('EMPRESÁRIO') || nat.includes('INDIVIDUAL') || porte.includes('MEI') || data.optante_mei === true;

        const hasQsa = (Array.isArray(data.qsa) && data.qsa.length > 0) || isEmpresarioOuMei;

        // Completo se possui contato (email ou telefone), QSA (ou individual) e dados financeiros/societários
        return (hasEmail || hasPhone1) && hasQsa && (hasCapital || isEmpresarioOuMei) && (hasPhone2 || hasCnaesSec || hasFantasia);
    },

    // ===== MESCLAGEM DE DADOS (DEEP MERGE MULTI-API) =====
    mergeCnpjData(base, incoming) {
        if (!base || !incoming) return base || incoming;
        if (!base.nome_fantasia && incoming.nome_fantasia) base.nome_fantasia = incoming.nome_fantasia;
        if (!base.email && incoming.email) base.email = incoming.email;
        if (!base.ddd_telefone_1 && incoming.ddd_telefone_1) base.ddd_telefone_1 = incoming.ddd_telefone_1;
        if (!base.ddd_telefone_2 && incoming.ddd_telefone_2 && incoming.ddd_telefone_2 !== base.ddd_telefone_1) base.ddd_telefone_2 = incoming.ddd_telefone_2;
        if ((!base.qsa || base.qsa.length === 0) && incoming.qsa && incoming.qsa.length > 0) base.qsa = incoming.qsa;
        if ((!base.cnaes_secundarios || base.cnaes_secundarios.length === 0) && incoming.cnaes_secundarios && incoming.cnaes_secundarios.length > 0) base.cnaes_secundarios = incoming.cnaes_secundarios;
        if (!base.capital_social && incoming.capital_social) base.capital_social = incoming.capital_social;
        if (!base.porte && incoming.porte) base.porte = incoming.porte;
        if (!base.natureza_juridica && incoming.natureza_juridica) base.natureza_juridica = incoming.natureza_juridica;
        if (!base.data_inicio_atividade && incoming.data_inicio_atividade) base.data_inicio_atividade = incoming.data_inicio_atividade;
        if (!base.apis_consultadas) base.apis_consultadas = [base.api_origem || 'Original'];
        if (incoming.api_origem && !base.apis_consultadas.includes(incoming.api_origem)) base.apis_consultadas.push(incoming.api_origem);
        return base;
    }
};

// ========================= §2.2 — ADAPTADORES (Normalização de Payload) =========================
// Cada API retorna um JSON diferente. Os Adapters convertem todos para um formato único.
const apiAdapters = {
    brasilapi: (data) => {
        data.api_origem = 'BrasilAPI';
        // BrasilAPI separa tipo de logradouro — juntar para ficar "RUA NOME DA RUA"
        if (data.descricao_tipo_de_logradouro && data.logradouro) {
            const tipo = data.descricao_tipo_de_logradouro.trim();
            if (!data.logradouro.toUpperCase().startsWith(tipo.toUpperCase())) {
                data.logradouro = tipo + ' ' + data.logradouro;
            }
        }
        return data;
    },
    publica_cnpj_ws: (data) => {
        const est = data.estabelecimento || {};
        return {
            cnpj: est.cnpj,
            razao_social: data.razao_social,
            nome_fantasia: est.nome_fantasia || '',
            descricao_situacao_cadastral: est.situacao_cadastral,
            data_inicio_atividade: est.data_inicio_atividade,
            cnae_fiscal: est.atividade_principal?.id,
            cnae_fiscal_descricao: est.atividade_principal?.descricao,
            natureza_juridica: data.natureza_juridica?.descricao || '',
            logradouro: ((est.tipo_logradouro || '') + ' ' + (est.logradouro || '')).trim(),
            numero: est.numero,
            complemento: est.complemento || '',
            bairro: est.bairro,
            municipio: est.cidade?.nome,
            uf: est.estado?.sigla,
            cep: est.cep,
            ddd_telefone_1: (est.ddd1 && est.telefone1) ? `${est.ddd1}${est.telefone1}` : '',
            ddd_telefone_2: (est.ddd2 && est.telefone2) ? `${est.ddd2}${est.telefone2}` : '',
            email: est.email || '',
            capital_social: parseFloat(data.capital_social) || 0,
            porte: data.porte?.descricao || '',
            qsa: data.socios?.map(s => ({ nome_socio: s.nome, qualificacao_socio: s.qualificacao_socio?.descricao || s.qualificacao || '' })) || [],
            cnaes_secundarios: est.atividades_secundarias?.map(a => ({ codigo: a.id, descricao: a.descricao })) || [],
            api_origem: 'Publica CNPJ WS'
        };
    },
    minhareceita: (data) => {
        // minhaReceita usa estrutura praticamente idêntica à BrasilAPI
        data.api_origem = 'minhaReceita';
        return data;
    },
    receitaws: (data) => ({
        cnpj: data.cnpj?.replace(/\D/g, ''),
        razao_social: data.nome,
        nome_fantasia: data.fantasia,
        descricao_situacao_cadastral: data.situacao,
        data_inicio_atividade: data.abertura,
        cnae_fiscal: data.atividade_principal?.[0]?.code?.replace(/\D/g, ''),
        cnae_fiscal_descricao: data.atividade_principal?.[0]?.text,
        natureza_juridica: data.natureza_juridica,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep?.replace(/\D/g, ''),
        ddd_telefone_1: data.telefone,
        ddd_telefone_2: '',
        email: data.email,
        capital_social: parseFloat(String(data.capital_social || '0').replace(/\./g, '').replace(',', '.')) || 0,
        porte: data.porte,
        qsa: data.qsa?.map(s => ({ nome_socio: s.nome, qualificacao_socio: s.qual })) || [],
        cnaes_secundarios: data.atividades_secundarias?.map(a => ({ codigo: a.code?.replace(/\D/g, ''), descricao: a.text })) || [],
        api_origem: 'ReceitaWS'
    }),
    invertexto: (data) => ({
        cnpj: data.cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || '',
        descricao_situacao_cadastral: data.situacao?.nome,
        data_inicio_atividade: data.data_inicio || data.data_inicio_atividade,
        cnae_fiscal: data.atividade_principal?.codigo,
        cnae_fiscal_descricao: data.atividade_principal?.nome || data.atividade_principal?.descricao,
        natureza_juridica: data.natureza_juridica?.nome || data.natureza_juridica,
        logradouro: ((data.endereco?.tipo_logradouro || '') + ' ' + (data.endereco?.logradouro || '')).trim(),
        numero: data.endereco?.numero,
        complemento: data.endereco?.complemento || '',
        bairro: data.endereco?.bairro,
        municipio: data.endereco?.municipio,
        uf: data.endereco?.uf || data.endereco?.estado,
        cep: data.endereco?.cep,
        ddd_telefone_1: data.telefone1 || data.telefones?.[0] || '',
        ddd_telefone_2: data.telefones?.[1] || '',
        email: data.email || '',
        capital_social: parseFloat(data.capital_social) || 0,
        porte: data.porte?.nome || data.porte,
        qsa: data.socios?.map(s => ({ nome_socio: s.nome, qualificacao_socio: s.qualificacao, data_entrada_sociedade: s.data_entrada })) || [],
        cnaes_secundarios: data.atividades_secundarias?.map(a => ({ codigo: a.codigo, descricao: a.nome || a.descricao })) || [],
        api_origem: 'Invertexto'
    }),
    opencnpj: (data) => {
        const principalCnaeObj = data.cnaes?.find(c => c.is_principal);
        const secCnaes = data.cnaes?.filter(c => !c.is_principal).map(c => ({
            codigo: c.codigo,
            descricao: c.descricao
        })) || [];
        const formattedQsa = data.QSA?.map(s => ({
            nome_socio: s.nome_socio,
            qualificacao_socio: s.qualificacao_socio || ''
        })) || [];
        const ddd_tel1 = data.telefones?.[0] ? `${data.telefones[0].ddd || ''}${data.telefones[0].numero || ''}` : '';
        const ddd_tel2 = data.telefones?.[1] ? `${data.telefones[1].ddd || ''}${data.telefones[1].numero || ''}` : '';

        return {
            cnpj: data.cnpj ? String(data.cnpj).replace(/\D/g, '') : '',
            razao_social: data.razao_social || '',
            nome_fantasia: data.nome_fantasia || '',
            descricao_situacao_cadastral: data.situacao_cadastral || '',
            data_inicio_atividade: data.data_inicio_atividade || '',
            cnae_fiscal: data.cnae_principal || principalCnaeObj?.codigo || '',
            cnae_fiscal_descricao: principalCnaeObj?.descricao || '',
            natureza_juridica: data.natureza_juridica || '',
            logradouro: ((data.tipo_logradouro || '') + ' ' + (data.logradouro || '')).trim(),
            numero: data.numero || '',
            complemento: data.complemento || '',
            bairro: data.bairro || '',
            municipio: data.municipio || '',
            uf: data.uf || '',
            cep: data.cep ? String(data.cep).replace(/\D/g, '') : '',
            ddd_telefone_1: ddd_tel1,
            ddd_telefone_2: ddd_tel2,
            email: data.email || '',
            capital_social: parseFloat(String(data.capital_social || '0').replace(/\./g, '').replace(',', '.')) || 0,
            porte: data.porte_empresa || '',
            qsa: formattedQsa,
            cnaes_secundarios: secCnaes,
            api_origem: 'OpenCNPJ'
        };
    },
    cnpja: (data) => {
        if (!data || !data.nodes) throw new Error('Invalid CNPJa response structure');
        const dataNode = data.nodes.find(n => n && n.type === 'data' && Array.isArray(n.data));
        if (!dataNode) throw new Error('CNPJa SvelteKit data node not found');
        const flatList = dataNode.data;
        
        const cache = new Map();
        function resolve(index) {
            if (index === null || index === undefined) return null;
            if (typeof index !== 'number') return index;
            if (cache.has(index)) return cache.get(index);
            
            const val = flatList[index];
            if (val === null || val === undefined) return val;
            if (Array.isArray(val)) {
                const arr = [];
                cache.set(index, arr);
                for (const item of val) {
                    arr.push(resolve(item));
                }
                return arr;
            }
            if (typeof val === 'object') {
                const obj = {};
                cache.set(index, obj);
                for (const key in val) {
                    obj[key] = resolve(val[key]);
                }
                return obj;
            }
            return val;
        }

        const root = resolve(0);
        const office = root?.office;
        if (!office) throw new Error('CNPJa office details not resolved');
        
        const company = office.company || {};
        
        const principalCnae = office.mainActivity ? String(office.mainActivity.id || '').replace(/\D/g, '') : '';
        const principalCnaeDesc = office.mainActivity ? office.mainActivity.text || '' : '';
        
        const secCnaes = office.sideActivities ? office.sideActivities.map(s => ({
            codigo: s ? String(s.id || '').replace(/\D/g, '') : '',
            descricao: s ? s.text || '' : ''
        })).filter(c => c.codigo) : [];
        
        const formattedQsa = company.members ? company.members.map(m => ({
            nome_socio: m?.person?.name || '',
            qualificacao_socio: m?.role?.text || ''
        })).filter(s => s.nome_socio) : [];
        
        const tel1 = office.phones && office.phones[0] ? `${office.phones[0].area || ''}${office.phones[0].number || ''}`.replace(/\D/g, '') : '';
        const tel2 = office.phones && office.phones[1] ? `${office.phones[1].area || ''}${office.phones[1].number || ''}`.replace(/\D/g, '') : '';
        const email = office.emails && office.emails[0] ? office.emails[0].address || '' : '';
        
        return {
            cnpj: office.taxId ? String(office.taxId).replace(/\D/g, '') : '',
            razao_social: company.name || '',
            nome_fantasia: office.alias || company.name || '',
            descricao_situacao_cadastral: office.status?.text || (typeof office.status === 'string' ? office.status : 'Ativa'),
            data_inicio_atividade: office.founded || '',
            cnae_fiscal: principalCnae,
            cnae_fiscal_descricao: principalCnaeDesc,
            natureza_juridica: company.nature?.text || '',
            logradouro: office.address ? `${office.address.street || ''}`.trim() : '',
            numero: office.address?.number || '',
            complemento: office.address?.details || '',
            bairro: office.address?.district || '',
            municipio: office.address?.city || '',
            uf: office.address?.state || '',
            cep: office.address?.zip ? String(office.address.zip).replace(/\D/g, '') : '',
            ddd_telefone_1: tel1,
            ddd_telefone_2: tel2,
            email: email,
            capital_social: parseFloat(company.equity) || 0,
            porte: company.size?.acronym || company.size?.text || '',
            qsa: formattedQsa,
            cnaes_secundarios: secCnaes,
            api_origem: 'CNPJa'
        };
    },

    casadosdados: (data) => {
        if (!data || (!data.razao_social && !data.nome_fantasia)) return null;
        return {
            cnpj: data.cnpj ? String(data.cnpj).replace(/\D/g, '') : '',
            razao_social: data.razao_social || '',
            nome_fantasia: data.nome_fantasia || '',
            descricao_situacao_cadastral: data.situacao || data.descricao_situacao_cadastral || 'Ativa',
            data_inicio_atividade: data.data_abertura || data.data_inicio_atividade || '',
            cnae_fiscal: data.cnae_principal || '',
            cnae_fiscal_descricao: data.cnae_principal_descricao || '',
            natureza_juridica: data.natureza_juridica || '',
            logradouro: data.logradouro || '',
            numero: data.numero || '',
            complemento: data.complemento || '',
            bairro: data.bairro || '',
            municipio: data.municipio || '',
            uf: data.uf || '',
            cep: data.cep ? String(data.cep).replace(/\D/g, '') : '',
            ddd_telefone_1: data.telefone || data.ddd_telefone_1 || '',
            ddd_telefone_2: data.ddd_telefone_2 || '',
            email: data.email || '',
            capital_social: parseFloat(data.capital_social) || 0,
            porte: data.porte || '',
            qsa: data.qsa || [],
            cnaes_secundarios: data.cnaes_secundarios || [],
            api_origem: 'Casa dos Dados'
        };
    }
};

// ========================= HANDLERS DE REQUISIÇÃO =========================
const dataHandlers = {
    // Requisição individual a uma API específica
    async fetchWithApi(apiDef, formattedCnpj, parentSignal) {
        const cleanCnpj = String(formattedCnpj).replace(/\D/g, '');
        const url = apiDef.url.replace('{cnpj}', cleanCnpj);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 segundos de timeout máximo por API
        
        const onParentAbort = () => controller.abort();
        if (parentSignal) {
            parentSignal.addEventListener('abort', onParentAbort);
        }

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (parentSignal) {
                parentSignal.removeEventListener('abort', onParentAbort);
            }

            if (!response.ok) {
                if (response.status === 404) {
                    try {
                        const text = await response.text();
                        if (text.includes('não encontrado') || text.includes('CNPJ rejeitado') || text.includes('not found') || apiDef.id === 'minhareceita' || apiDef.id === 'cnpja') {
                            throw new Error('404_NOT_FOUND');
                        }
                    } catch (e) {
                        if (e.message === '404_NOT_FOUND') throw e;
                    }
                }
                throw new Error(`HTTP_${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'ERROR') throw new Error(data.message || 'API_ERROR');
            return apiAdapters[apiDef.id](data);
        } catch (err) {
            clearTimeout(timeoutId);
            if (parentSignal) {
                parentSignal.removeEventListener('abort', onParentAbort);
            }
            if (err.name === 'AbortError') {
                if (parentSignal && parentSignal.aborted) {
                    throw new Error('pausado');
                } else {
                    throw new Error('TIMEOUT');
                }
            }
            throw err;
        }
    },

    async fetchCnoData(formattedCnpj) {
        const cleanCnpj = String(formattedCnpj).replace(/\D/g, '');
        const directUrl = `https://api.opencnpj.org/${cleanCnpj}?dataset=cno`;
        
        // Tenta chamada direta com timeout de 4 segundos
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 4000);
        try {
            const response = await fetch(directUrl, { signal: ctrl.signal });
            clearTimeout(tid);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            clearTimeout(tid);
            console.warn(`[CNO Direto] Falhou ou deu timeout para ${cleanCnpj}. Tentando proxy AllOrigins...`);
        }

        // Tenta via AllOrigins Proxy como fallback
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`;
        const ctrlProxy = new AbortController();
        const tidProxy = setTimeout(() => ctrlProxy.abort(), 4000);
        try {
            const response = await fetch(proxyUrl, { signal: ctrlProxy.signal });
            clearTimeout(tidProxy);
            if (response.ok) {
                const wrapper = await response.json();
                if (wrapper && wrapper.contents) {
                    return JSON.parse(wrapper.contents);
                }
            }
        } catch (e) {
            clearTimeout(tidProxy);
            console.warn(`[CNO Proxy] Falhou ao buscar CNO via proxy: ${e.message}`);
        }
        return null;
    },

    // §1.2 — Teste de conectividade "Ping" com CNPJ do Banco do Brasil
    async testApisConnection() {
        const testCnpj = '00000000000191';
        const results = {};
        let passCount = 0;

        for (const api of state.apis) {
            try {
                const ctrl = new AbortController();
                const tid = setTimeout(() => ctrl.abort(), 5000);
                const url = api.url.replace('{cnpj}', testCnpj);
                const fetchUrl = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
                const res = await fetch(fetchUrl, { signal: ctrl.signal });
                clearTimeout(tid);

                if (res.ok) {
                    results[api.name] = true;
                    api.consecutiveFailures = 0;
                    api.active = true;
                    passCount++;
                    console.log(`✅ ${api.name} OK`);
                } else {
                    results[api.name] = false;
                    console.warn(`⚠️ ${api.name} → ${res.status}`);
                }
            } catch (e) {
                results[api.name] = false;
                console.warn(`❌ ${api.name} → ${e.message}`);
            }
        }

        return { results, anyWorking: passCount > 0 };
    },

    // §1 + §2.1 — Orquestrador de Fallback Multi-API (Cascata)
    async fetchCnpjData(cnpj) {
        if (state.isPaused) throw new Error('Processamento pausado pelo usuário');

        const formattedCnpj = utils.formatCnpjForApi(cnpj);
        if (state.cnpjCache[formattedCnpj]) return state.cnpjCache[formattedCnpj];

        const controller = new AbortController();
        const requestEntry = { cnpj, controller };
        state.pendingRequests.push(requestEntry);

        let lastErrorMsg = '';
        let lastErrorType = 'generic';
        let notFoundCount = 0;
        const failures = [];

        // Ordenação respeita a ordem definida pelo usuário em state.apis
        const sortedApis = state.apis.filter(a => a.active);

        if (sortedApis.length === 0) {
            state.pendingRequests = state.pendingRequests.filter(r => r !== requestEntry);
            throw new Error('Nenhuma API ativa/disponível.');
        }

        let successData = null;
        const usedApis = [];

        for (const api of sortedApis) {
            // Se a API estiver em cooldown temporário (ex: 429 Rate Limit), pula temporariamente sem marcar falha permanente
            if (api.cooldownUntil && Date.now() < api.cooldownUntil) {
                console.log(`[⏳ Cooldown] Pulando ${api.name} para ${cnpj} (cooldown ativo)`);
                continue;
            }
            if (api.cooldownUntil && Date.now() >= api.cooldownUntil) {
                api.cooldownUntil = null;
                api.consecutiveFailures = 0;
            }

            try {
                if (state.isPaused) throw new Error('pausado');

                const data = await this.fetchWithApi(api, formattedCnpj, controller.signal);

                if (data) {
                    api.consecutiveFailures = 0;
                    api.totalUsed++;
                    state.consecutiveErrors = 0;
                    if (typeof backoffStrategy !== 'undefined') backoffStrategy.reset();
                    usedApis.push(api.name);

                    if (!successData) {
                        successData = data;
                        console.log(`[✓] ${cnpj} via ${api.name}`);
                    } else {
                        // Modo Profundo: mescla dados adicionais obtidos de outras APIs
                        utils.mergeCnpjData(successData, data);
                        console.log(`[🔍 Deep Merge] ${cnpj} enriquecido via ${api.name}`);
                    }

                    // Se não estiver no modo Enriquecimento Profundo, encerra na 1ª API com sucesso
                    if (!state.deepMergeEnabled) {
                        break;
                    }

                    // Encerramento Inteligente no Modo Profundo:
                    // Se o CNPJ já obteve 100% dos dados essenciais (contato, QSA, capital), evita chamadas desnecessárias nas demais APIs!
                    if (utils.isCnpjDataComplete(successData)) {
                        console.log(`[✨ Modo Profundo Completo] ${cnpj} obteve 100% dos dados essenciais. Encerrando consultas adicionais.`);
                        break;
                    }
                }

            } catch (error) {
                if (error.name === 'AbortError' || error.message.includes('pausado')) {
                    state.pendingRequests = state.pendingRequests.filter(r => r !== requestEntry);
                    return { cnpj, error: true, errorMessage: 'Abortado (pausa)', aborted: true };
                }

                console.warn(`[✗] ${api.name} → ${cnpj}: ${error.message}`);
                
                let apiErrText = error.message;
                if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
                    apiErrText = 'Erro de Conexão/CORS';
                }
                failures.push(`${api.name}: ${apiErrText}`);

                if (error.message === '404_NOT_FOUND') {
                    notFoundCount++;
                    lastErrorMsg = 'CNPJ não encontrado';
                    lastErrorType = '404';
                } else if (error.message.includes('429') || error.message.includes('Too Many')) {
                    lastErrorMsg = 'Rate Limit (429)';
                    lastErrorType = 'rate_limit';
                    // Tratamento Inteligente de Rate Limit: coloca em cooldown de 15s e joga a API para o final da fila de prioridade
                    api.cooldownUntil = Date.now() + 15000;
                    utils.demoteApiToLast(api.id);
                    console.warn(`[⏳ Rate Limit 429] ${api.name} colocada em cooldown de 15s e reordenada para o final da fila.`);
                } else {
                    api.consecutiveFailures++;
                    if (api.consecutiveFailures >= 3) {
                        console.error(`[SKIP] ${api.name} desativada temporariamente (${api.consecutiveFailures} falhas)`);
                        api.active = false;
                    }
                    lastErrorMsg = error.message;
                    lastErrorType = 'connection';
                }
            }
        }

        state.pendingRequests = state.pendingRequests.filter(r => r !== requestEntry);

        if (successData) {
            const cnoCheckbox = document.getElementById('cnoEnabled');
            if (cnoCheckbox && cnoCheckbox.checked) {
                try {
                    const cnoResult = await this.fetchCnoData(formattedCnpj);
                    if (cnoResult && cnoResult.cno) {
                        successData.cno = cnoResult.cno;
                    }
                } catch (cnoErr) {
                    console.warn(`[CNO] Falha silenciosa ao obter obras: ${cnoErr.message}`);
                }
            }

            // Marca se passou por Deep Merge
            if (usedApis.length > 1) {
                successData.isDeepMerged = true;
                successData.apis_consultadas = usedApis;
            }

            // Recalcula Score B2B Ameripan para o resultado final
            try {
                successData.scoreInfo = await utils.calculateB2bScore(successData);
            } catch (scoreErr) {
                console.warn(`[Score B2B] Falha ao calcular score: ${scoreErr.message}`);
            }

            state.cnpjCache[formattedCnpj] = successData;
            return successData;
        }

        // Todas retornaram "não encontrado"
        if (lastErrorType === '404' && notFoundCount === sortedApis.length) {
            return { cnpj, error: true, errorMessage: 'CNPJ não encontrado em nenhuma API', skipErrorPause: true };
        }
        // Pelo menos alguma era 404 mas outras deram erro
        if (lastErrorType === '404') {
            return { cnpj, error: true, errorMessage: `CNPJ não encontrado. Detalhes: [${failures.join(' | ')}]`, skipErrorPause: true };
        }

        // §2.3 — Pausa Real: todas as falharam com erro de conexão/rate-limit
        state.consecutiveErrors++;
        return { cnpj, error: true, errorMessage: `Falha nas APIs: [${failures.join(' | ')}]`, errorType: lastErrorType };
    },

    // ===== REENRIQUECER RESULTADOS EXISTENTES VIA DEEP MERGE =====
    async reenrichWithDeepMerge() {
        if (!state.results || state.results.length === 0) {
            return alert('Nenhum resultado para reenriquecer.');
        }
        const confirmRun = confirm('Deseja consultar APIs secundárias para preencher dados faltantes nos leads já carregados?\n\nEste processo pode levar alguns segundos.');
        if (!confirmRun) return;

        const prevDeep = state.deepMergeEnabled;
        state.deepMergeEnabled = true;
        utils.updateStatus('🔍 Reenriquecendo lista com Modo Profundo...');

        let updatedCount = 0;
        for (let i = 0; i < state.results.length; i++) {
            const item = state.results[i];
            if (!item || item.error || !item.cnpj) continue;

            // Apaga cache para forçar requisições faltantes
            const formattedCnpj = utils.formatCnpjForApi(item.cnpj);
            delete state.cnpjCache[formattedCnpj];

            try {
                const enriched = await this.fetchCnpjData(item.cnpj);
                if (enriched && !enriched.error) {
                    state.results[i] = enriched;
                    if (typeof uiControllers !== 'undefined' && uiControllers.addResultToTable) {
                        uiControllers.addResultToTable(enriched, i);
                    }
                    updatedCount++;
                }
            } catch (e) {
                console.warn(`Falha ao reenriquecer CNPJ ${item.cnpj}: ${e.message}`);
            }
        }

        state.deepMergeEnabled = prevDeep;
        if (typeof uiControllers !== 'undefined') {
            uiControllers.renderGroupedResults();
        }
        utils.updateStatus(`✅ Reenriquecimento concluído! ${updatedCount} leads atualizados.`);
        alert(`✅ Reenriquecimento concluído! ${updatedCount} leads foram complementados via Modo Profundo.`);
    }
};
