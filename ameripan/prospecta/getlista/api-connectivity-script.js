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

    // §1.1 — Fila de APIs na ordem exata do plano
    apis: [
        { id: 'brasilapi',       name: 'BrasilAPI',       url: 'https://brasilapi.com.br/api/cnpj/v1/{cnpj}',                                        active: true, consecutiveFailures: 0, isFallback: false, totalUsed: 0 },
        { id: 'publica_cnpj_ws', name: 'Publica CNPJ WS', url: 'https://publica.cnpj.ws/cnpj/{cnpj}',                                                active: true, consecutiveFailures: 0, isFallback: false, totalUsed: 0 },
        { id: 'minhareceita',    name: 'minhaReceita',    url: 'https://minhareceita.org/{cnpj}',                                                     active: true, consecutiveFailures: 0, isFallback: false, totalUsed: 0 },
        { id: 'receitaws',       name: 'ReceitaWS',       url: 'https://www.receitaws.com.br/v1/cnpj/{cnpj}',                                         active: true, consecutiveFailures: 0, isFallback: false, totalUsed: 0 },
        { id: 'invertexto',      name: 'Invertexto',      url: 'https://api.invertexto.com/v1/cnpj/{cnpj}?token=20128|Wk9IhRx5wlalJlRxy2Vt5KV1bpP0wFtB', active: true, consecutiveFailures: 0, isFallback: true,  totalUsed: 0 }
    ]
};

// DOM Elements Reference — preenchido pelo ui-enhancement na init()
const elements = {};

// ========================= UTILITÁRIOS COMPARTILHADOS =========================
const utils = {
    formatCnpjForDisplay(cnpj) {
        if (!cnpj) return '-';
        const c = String(cnpj).replace(/\D/g, '');
        if (c.length !== 14) return cnpj;
        return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    },
    formatCnpjForApi(cnpj) {
        let c = String(cnpj).replace(/\D/g, '');
        while (c.length < 14) c = '0' + c;
        return c;
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
    }
};

// ========================= §2.2 — ADAPTADORES (Normalização de Payload) =========================
// Cada API retorna um JSON diferente. Os Adapters convertem todos para um formato único.
const apiAdapters = {
    brasilapi: (data) => {
        // BrasilAPI já retorna no formato mais limpo; adicionamos api_origem
        data.api_origem = 'BrasilAPI';
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
    })
};

// ========================= HANDLERS DE REQUISIÇÃO =========================
const dataHandlers = {
    // Requisição individual a uma API específica
    async fetchWithApi(apiDef, formattedCnpj, signal) {
        const url = apiDef.url.replace('{cnpj}', formattedCnpj);
        const response = await fetch(url, { signal });

        if (!response.ok) {
            if (response.status === 404) {
                // Tenta ler body pra confirmar se é "não encontrado" real
                try {
                    const text = await response.text();
                    if (text.includes('não encontrado') || text.includes('CNPJ rejeitado') || text.includes('not found') || apiDef.id === 'minhareceita') {
                        throw new Error('404_NOT_FOUND');
                    }
                } catch (e) {
                    if (e.message === '404_NOT_FOUND') throw e;
                }
            }
            throw new Error(`HTTP_${response.status}`);
        }

        const data = await response.json();
        // ReceitaWS retorna 200 com status: "ERROR"
        if (data.status === 'ERROR') throw new Error(data.message || 'API_ERROR');

        return apiAdapters[apiDef.id](data);
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

        // §1.2 — Ordenação dinâmica: isFallback por último, quem tem mais falhas fica atrás
        const sortedApis = state.apis.filter(a => a.active).sort((a, b) => {
            if (a.isFallback !== b.isFallback) return a.isFallback ? 1 : -1;
            return a.consecutiveFailures - b.consecutiveFailures;
        });

        if (sortedApis.length === 0) {
            state.pendingRequests = state.pendingRequests.filter(r => r !== requestEntry);
            throw new Error('Nenhuma API ativa/disponível.');
        }

        let successData = null;

        for (const api of sortedApis) {
            try {
                if (state.isPaused) throw new Error('pausado');

                successData = await this.fetchWithApi(api, formattedCnpj, controller.signal);

                // Sucesso!
                api.consecutiveFailures = 0;
                api.totalUsed++;
                state.consecutiveErrors = 0;
                if (typeof backoffStrategy !== 'undefined') backoffStrategy.reset();
                console.log(`[✓] ${cnpj} via ${api.name}`);
                break;

            } catch (error) {
                if (error.name === 'AbortError' || error.message.includes('pausado')) {
                    state.pendingRequests = state.pendingRequests.filter(r => r !== requestEntry);
                    return { cnpj, error: true, errorMessage: 'Abortado (pausa)', aborted: true };
                }

                console.warn(`[✗] ${api.name} → ${cnpj}: ${error.message}`);

                if (error.message === '404_NOT_FOUND') {
                    notFoundCount++;
                    lastErrorMsg = 'CNPJ não encontrado';
                    lastErrorType = '404';
                    // §1.2 — "not found" não conta como falha de conexão
                } else {
                    // §1.2 — Punição dinâmica por falha de rede/rate-limit
                    api.consecutiveFailures++;
                    // §1.2 — Descarte (Skip) se excedeu tentativas
                    if (api.consecutiveFailures >= 3) {
                        console.error(`[SKIP] ${api.name} desativada (${api.consecutiveFailures} falhas)`);
                        api.active = false;
                    }
                    if (error.message.includes('429') || error.message.includes('Too Many')) {
                        lastErrorMsg = 'Rate Limit (429)';
                        lastErrorType = 'rate_limit';
                    } else {
                        lastErrorMsg = error.message;
                        lastErrorType = 'connection';
                    }
                }
            }
        }

        state.pendingRequests = state.pendingRequests.filter(r => r !== requestEntry);

        if (successData) {
            state.cnpjCache[formattedCnpj] = successData;
            return successData;
        }

        // Todas retornaram "não encontrado"
        if (lastErrorType === '404' && notFoundCount === sortedApis.length) {
            return { cnpj, error: true, errorMessage: 'CNPJ não encontrado em nenhuma API', skipErrorPause: true };
        }
        // Pelo menos alguma era 404 mas outras deram erro
        if (lastErrorType === '404') {
            return { cnpj, error: true, errorMessage: 'CNPJ não encontrado', skipErrorPause: true };
        }

        // §2.3 — Pausa Real: todas as 5 falharam com erro de conexão/rate-limit
        state.consecutiveErrors++;
        return { cnpj, error: true, errorMessage: lastErrorMsg, errorType: lastErrorType };
    }
};
