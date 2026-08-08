// ========================= MINING-ENGINE-SCRIPT.JS =========================
// Fase 1 — Motor de Mineração via API Casa dos Dados (v5/cnpj/pesquisa)
// Porta as funcionalidades do minerador.html para o sistema GetLista modular.

const MiningEngine = {
    // ===== ESTADO =====
    state: {
        running: false,
        leads: [],
        currentPage: 0,
        totalPages: 0,
        totalRecords: 0,
        apiKey: '',
        endpoint: 'https://api.casadosdados.com.br/v5/cnpj/pesquisa',
        delayBetweenPages: 3000, // ms — prevenção de ban de IP
        maxPages: 0, // 0 = sem limite
        pageTimes: [], // tempos de cada página para ETA
        seenCnpjs: new Set(), // deduplication em tempo real
        duplicatesSkipped: 0,
        tableExpanded: false,
        excludedFromBlocklist: 0, // CNPJs excluídos por estar na blocklist
    },

    // ===== FILTROS (gerenciados por chip system) =====
    // Termos iniciais carregados do payload.txt de referência
    filters: {
        cidades: [],
        termos: ['SORVETE', 'ACAI', 'AÇAI', 'MILK SHAKE', 'MILKSHAKE', 'PICOLE', 'PICOLÉ', 'PALETA MEXICANA', 'GELATERIA', 'GELATO', 'SORVETERIA'],
        cnaes: [],
        naturezaJuridica: [],
        bairros: [],
        ceps: [],
        ddds: [],
        cnpjRaiz: [],
        telefone: []
    },

    // Mapa de refresh callbacks por key (preenchido no initChips)
    _chipRefreshers: {},

    // Cache de cidades por UF e lista completa
    _ufCitiesCache: {},
    _allUfCities: [],

    // Helper para normalização de texto (remove acentos, espaços duplos e símbolos)
    _normalizeString(str) {
        if (!str) return '';
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Z0-9]/gi, ' ')
            .replace(/\s+/g, ' ')
            .toUpperCase()
            .trim();
    },

    // Retorna o nome oficial do município corrigido de acordo com a UF informada
    getOfficialCityName(typedCity, uf) {
        if (!typedCity) return '';
        const cleanTyped = typedCity.trim();
        if (!cleanTyped) return '';

        const targetUf = (uf || this.els.ufInput?.value || 'SP').toUpperCase().trim();
        const cities = this._ufCitiesCache[targetUf] || this._allUfCities || [];

        if (!cities || cities.length === 0) {
            return cleanTyped.toUpperCase();
        }

        const upperTyped = cleanTyped.toUpperCase();
        // 1. Exato (case-insensitive)
        const exactMatch = cities.find(c => c.toUpperCase() === upperTyped);
        if (exactMatch) return exactMatch;

        // 2. Normalizado (sem acentos, sem apóstrofos/hífens)
        const normTyped = this._normalizeString(cleanTyped);
        const normMatch = cities.find(c => this._normalizeString(c) === normTyped);
        if (normMatch) return normMatch;

        // Fallback mantém maiúsculas
        return upperTyped;
    },

    // Helper para cálculo da distância de Levenshtein entre duas strings
    _levenshteinDistance(a, b) {
        if (!a || !b) return (a || b).length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    },

    // Encontra todos os municípios correspondentes por radical/prefixo de 3/4 letras ou similaridade
    _findCitySuggestions(unmatchedCity, citiesList) {
        if (!citiesList || citiesList.length === 0) return [];
        const normInput = this._normalizeString(unmatchedCity);
        if (!normInput) return [];

        const radical4 = normInput.length >= 4 ? normInput.slice(0, 4) : normInput;
        const radical3 = normInput.length >= 3 ? normInput.slice(0, 3) : normInput;

        // 1. Busca por prefixo/radical de 4 letras ou 3 letras
        let matches = citiesList.filter(c => {
            const normC = this._normalizeString(c);
            return normC.startsWith(radical4) || normC.includes(radical4) || normC.startsWith(radical3);
        });

        // 2. Se o radical não trouxe correspondências, busca por Levenshtein
        if (matches.length === 0) {
            matches = citiesList.filter(c => {
                const normC = this._normalizeString(c);
                const dist = this._levenshteinDistance(normInput, normC);
                return dist <= Math.max(3, Math.floor(normInput.length * 0.45));
            });
        }

        // Ordena por relevância: quem começa com o radical fica no topo, depois por menor distância
        matches.sort((a, b) => {
            const normA = this._normalizeString(a);
            const normB = this._normalizeString(b);
            const aStart = normA.startsWith(radical4) ? 0 : 1;
            const bStart = normB.startsWith(radical4) ? 0 : 1;
            if (aStart !== bStart) return aStart - bStart;
            return this._levenshteinDistance(normInput, normA) - this._levenshteinDistance(normInput, normB);
        });

        return matches;
    },

    // Exibe o painel de alerta "Cidades não encontradas... Você quis dizer...?" agrupado por radical
    showCitiesValidationNotice(unmatchedItems) {
        const noticeEl = document.getElementById('mineCitiesValidationNotice');
        const unmatchedTextEl = document.getElementById('mineUnmatchedCitiesText');
        const suggestionsContainer = document.getElementById('mineCitySuggestionsContainer');
        if (!noticeEl || !unmatchedTextEl || !suggestionsContainer) return;

        if (!unmatchedItems || unmatchedItems.length === 0) {
            noticeEl.classList.add('hidden');
            return;
        }

        const unmatchedNames = unmatchedItems.map(item => item.original).join(', ');
        unmatchedTextEl.textContent = unmatchedNames;

        let html = '';
        unmatchedItems.forEach(item => {
            const suggestions = item.suggestions || [];
            if (suggestions.length > 0) {
                html += `
                    <div class="w-full mt-1.5 mb-2">
                        <span class="text-[11px] font-semibold block mb-1" style="color:#c7d2fe;">
                            🔍 Possíveis correspondências para "<strong style="color:#ffffff;">${item.original}</strong>" (${suggestions.length} cidades encontradas):
                        </span>
                        <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08);">
                            ${suggestions.map(city => `
                                <button type="button" class="mine-suggested-city-btn" data-city="${city}" style="background:rgba(99,102,241,0.25); border:1px solid rgba(99,102,241,0.5); color:#a5b4fc; padding:3px 9px; border-radius:4px; font-weight:600; cursor:pointer; font-size:0.75rem; transition:all 0.15s;">
                                    + ${city}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="w-full mt-1 text-xs text-gray-400">
                        Nenhuma cidade correspondente a "${item.original}" encontrada na UF. Verifique a grafia.
                    </div>
                `;
            }
        });

        suggestionsContainer.innerHTML = html;

        suggestionsContainer.querySelectorAll('.mine-suggested-city-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const cityToAdd = btn.dataset.city;
                const normCity = this._normalizeString(cityToAdd);
                if (normCity && !this.filters.cidades.includes(normCity)) {
                    this.filters.cidades.push(normCity);
                    if (this._chipRefreshers.cidades) this._chipRefreshers.cidades();
                    this.buildPayload();
                }
                btn.style.opacity = '0.4';
                btn.style.pointerEvents = 'none';
                btn.textContent = '✓ ' + cityToAdd;
            });
        });

        noticeEl.classList.remove('hidden');

        const closeBtn = document.getElementById('mineCloseCitiesNoticeBtn');
        if (closeBtn) {
            closeBtn.onclick = () => noticeEl.classList.add('hidden');
        }
    },

    // Cache de CNAEs pesquisados e mapa de validação
    _cnaeCache: {},
    _cnaeKnownMap: {},

    // Filtra e classifica uma lista de CNAEs por código ou descrição (com suporte a radicais/plural)
    _filterCnaeList(list, query) {
        if (!list || !Array.isArray(list) || list.length === 0) return [];
        const rawQ = String(query || '').trim();
        if (!rawQ) return [];

        const normQ = this._normalizeString(rawQ);
        const cleanNumeric = rawQ.replace(/\D/g, '');

        // Stems/Radicais dos termos (ex: SORVETES -> SORVET, PADARIAS -> PADARI)
        const tokens = normQ.split(/\s+/).filter(t => t.length >= 2);
        const stems = tokens.map(t => {
            if (t.length > 4 && t.endsWith('ES')) return t.slice(0, -2);
            if (t.length > 3 && t.endsWith('S')) return t.slice(0, -1);
            return t;
        });

        const matches = list.map(item => {
            const code = String(item.code || item.codigo || '').replace(/\D/g, '');
            const name = item.name || item.descricao || item.text || '';
            const normName = this._normalizeString(name);
            if (!code && !normName) return null;

            let score = 0;

            // 1. Busca Numérica no Código CNAE
            if (cleanNumeric.length > 0) {
                if (code === cleanNumeric) score += 100;
                else if (code.startsWith(cleanNumeric)) score += 80;
                else if (code.includes(cleanNumeric)) score += 50;
            }

            // 2. Busca Textual na Descrição
            if (normQ.length > 0) {
                if (normName === normQ) score += 90;
                else if (normName.startsWith(normQ)) score += 70;
                else if (normName.includes(normQ)) score += 60;
                else {
                    // Match por radicais/tokens (ex: SORVETES encontra SORVETES / SORVETE)
                    let tokenMatches = 0;
                    tokens.forEach((tok, idx) => {
                        const stem = stems[idx] || tok;
                        if (normName.includes(tok) || normName.includes(stem)) {
                            tokenMatches++;
                        }
                    });
                    if (tokenMatches > 0) {
                        score += (tokenMatches / tokens.length) * 40;
                    }
                }
            }

            if (score > 0) {
                return { code, name, score };
            }
            return null;
        }).filter(Boolean);

        matches.sort((a, b) => b.score - a.score);

        return matches.map(m => ({ code: m.code, name: m.name }));
    },

    // Lista estática da API da Casa dos Dados para Natureza Jurídica (fallback offline & instantâneo)
    _allNatjurList: [
        { "name": "ÓRGÃO PÚBLICO DO PODER EXECUTIVO FEDERAL", "code": "1015" },
        { "name": "ORGAO PUBLICO DO PODER EXECUTIVO ESTADUAL OU DO DISTRITO FEDERAL", "code": "1023" },
        { "name": "ORGAO PUBLICO DO PODER EXECUTIVO MUNICIPAL", "code": "1031" },
        { "name": "ÓRGÃO PÚBLICO DO PODER LEGISLATIVO FEDERAL", "code": "1040" },
        { "name": "ÓRGÃO PÚBLICO DO PODER LEGISLATIVO ESTADUAL OU DO DISTRITO FEDERAL", "code": "1058" },
        { "name": "ORGAO PUBLICO DO PODER LEGISLATIVO MUNICIPAL", "code": "1066" },
        { "name": "ÓRGÃO PÚBLICO DO PODER JUDICIÁRIO FEDERAL", "code": "1074" },
        { "name": "ÓRGÃO PÚBLICO DO PODER JUDICIÁRIO ESTADUAL", "code": "1082" },
        { "name": "AUTARQUIA FEDERAL", "code": "1104" },
        { "name": "AUTARQUIA ESTADUAL OU DO DISTRITO FEDERAL", "code": "1112" },
        { "name": "AUTARQUIA MUNICIPAL", "code": "1120" },
        { "name": "FUNDAÇÃO PÚBLICA DE DIREITO PÚBLICO FEDERAL", "code": "1139" },
        { "name": "FUNDACAO PUB. DE DIREITO PUB. EST. OU DO DF", "code": "1147" },
        { "name": "FUNDAÇÃO PÚBLICA DE DIREITO PÚBLICO MUNICIPAL", "code": "1155" },
        { "name": "ÓRGÃO PÚBLICO AUTÔNOMO FEDERAL", "code": "1163" },
        { "name": "ÓRGÃO PÚBLICO AUTÔNOMO ESTADUAL OU DO DISTRITO FEDERAL", "code": "1171" },
        { "name": "ÓRGÃO PÚBLICO AUTÔNOMO MUNICIPAL", "code": "1180" },
        { "name": "COMISSÃO POLINACIONAL", "code": "1198" },
        { "name": "CONSORCIO PUB.DE DIREITO PUB. (ASS. PUB.)", "code": "1210" },
        { "name": "CONSÓRCIO PÚBLICO DE DIREITO PRIVADO", "code": "1228" },
        { "name": "ESTADO OU DISTRITO FEDERAL", "code": "1236" },
        { "name": "MUNICÍPIO", "code": "1244" },
        { "name": "FUNDAÇÃO PÚBLICA DE DIREITO PRIVADO FEDERAL", "code": "1252" },
        { "name": "FUNDAÇÃO PÚBLICA DE DIREITO PRIVADO ESTADUAL OU DO DISTRITO FEDERAL", "code": "1260" },
        { "name": "FUNDAÇÃO PÚBLICA DE DIREITO PRIVADO MUNICIPAL", "code": "1279" },
        { "name": "FUNDO PÚBLICO DA ADMINISTRAÇÃO INDIRETA FEDERAL", "code": "1287" },
        { "name": "FUNDO PÚBLICO DA ADMINISTRAÇÃO INDIRETA ESTADUAL OU DO DISTRITO FEDERAL", "code": "1295" },
        { "name": "FUNDO PÚBLICO DA ADMINISTRAÇÃO INDIRETA MUNICIPAL", "code": "1309" },
        { "name": "FUNDO PÚBLICO DA ADMINISTRAÇÃO DIRETA FEDERAL", "code": "1317" },
        { "name": "FUNDO PÚBLICO DA ADMINISTRAÇÃO DIRETA ESTADUAL OU DO DISTRITO FEDERAL", "code": "1325" },
        { "name": "FUNDO PÚBLICO DA ADMINISTRAÇÃO DIRETA MUNICIPAL", "code": "1333" },
        { "name": "UNIÃO", "code": "1341" },
        { "name": "ENTIDADE PÚBLICA SOB REGIME ESPECIAL", "code": "1350" },
        { "name": "EMPRESA PUBLICA", "code": "2011" },
        { "name": "SOCIEDADE DE ECONOMIA MISTA", "code": "2038" },
        { "name": "SOCIEDADE ANÔNIMA ABERTA", "code": "2046" },
        { "name": "SOCIEDADE ANONIMA FECHADA", "code": "2054" },
        { "name": "SOCIEDADE EMPRESARIA LIMITADA", "code": "2062" },
        { "name": "SOCIEDADE EMPRESARIA EM NOME COLETIVO", "code": "2070" },
        { "name": "SOCIEDADE EMPRESÁRIA EM COMANDITA SIMPLES", "code": "2089" },
        { "name": "SOCIEDADE EMPRESÁRIA EM COMANDITA POR AÇÕES", "code": "2097" },
        { "name": "SOCIEDADE MERCANTIL DE CAPITAL E INDÚSTRIA", "code": "2100" },
        { "name": "SOCIEDADE EM CONTA DE PARTICIPACAO", "code": "2127" },
        { "name": "EMPRESARIO (INDIVIDUAL)", "code": "2135" },
        { "name": "COOPERATIVA", "code": "2143" },
        { "name": "CONSORCIO DE SOCIEDADES", "code": "2151" },
        { "name": "GRUPO DE SOCIEDADES", "code": "2160" },
        { "name": "ESTABELECIMENTO, NO BRASIL, DE SOCIEDADE ESTRANGEIRA", "code": "2178" },
        { "name": "EMPRESA DOMICILIADA NO EXTERIOR", "code": "2216" },
        { "name": "CLUBE/FUNDO DE INVESTIMENTO", "code": "2224" },
        { "name": "SOCIEDADE SIMPLES PURA", "code": "2232" },
        { "name": "SOCIEDADE SIMPLES LIMITADA", "code": "2240" },
        { "name": "SOCIEDADE SIMPLES EM NOME COLETIVO", "code": "2259" },
        { "name": "SOCIEDADE SIMPLES EM COMANDITA SIMPLES", "code": "2267" },
        { "name": "EMPRESA BINACIONAL", "code": "2275" },
        { "name": "CONSÓRCIO DE EMPREGADORES", "code": "2283" },
        { "name": "CONSÓRCIO SIMPLES", "code": "2291" },
        { "name": "EMPRESA INDIVIDUAL DE RESP.LIMITADA (DE NATUREZA EMPRESARIA)", "code": "2305" },
        { "name": "EMPRESA INDIVIDUAL DE RESPONSABILIDADE LIMITADA (DE NATUREZA SIMPLES)", "code": "2313" },
        { "name": "NATUREZA JURIDICA INVALIDA", "code": "2321" },
        { "name": "COOPERATIVAS DE CONSUMO", "code": "2330" },
        { "name": "EMPRESA SIMPLES DE INOVAÇÃO", "code": "2348" },
        { "name": "SERVICO NOTARIAL E REGISTRAL (CARTORIO)", "code": "3034" },
        { "name": "FUNDACAO PRIVADA", "code": "3069" },
        { "name": "SERVIÇO SOCIAL AUTÔNOMO", "code": "3077" },
        { "name": "CONDOMINIO EDILICIO", "code": "3085" },
        { "name": "COMISSÃO DE CONCILIAÇÃO PRÉVIA", "code": "3107" },
        { "name": "ENTIDADE DE MEDIACAO E ARBITRAGEM", "code": "3115" },
        { "name": "ENTIDADE SINDICAL", "code": "3131" },
        { "name": "ESTABELECIMENTO, NO BRASIL, DE FUNDAÇÃO OU ASSOCIAÇÃO ESTRANGEIRAS", "code": "3204" },
        { "name": "FUNDAÇÃO OU ASSOCIAÇÃO DOMICILIADA NO EXTERIOR", "code": "3212" },
        { "name": "ORGANIZACAO RELIGIOSA", "code": "3220" },
        { "name": "COMUNIDADE INDÍGENA", "code": "3239" },
        { "name": "FUNDO PRIVADO", "code": "3247" },
        { "name": "ORGAO DE DIRECAO NACIONAL DE PARTIDO POLITICO", "code": "3255" },
        { "name": "ORGAO DE DIRECAO REGIONAL DE PARTIDO POLITICO", "code": "3263" },
        { "name": "ORGAO DE DIRECAO LOCAL DE PARTIDO POLITICO", "code": "3271" },
        { "name": "COMITÊ FINANCEIRO DE PARTIDO POLÍTICO", "code": "3280" },
        { "name": "FRENTE PLEBISCITÁRIA OU REFERENDÁRIA", "code": "3298" },
        { "name": "ORGANIZACAO SOCIAL (OS)", "code": "3301" },
        { "name": "PLANO DE BENEFÍCIOS DE PREVIDÊNCIA COMPLEMENTAR FECHADA", "code": "3328" },
        { "name": "ASSOCIACAO PRIVADA", "code": "3999" },
        { "name": "EMPRESA INDIVIDUAL IMOBILIARIA", "code": "4014" },
        { "name": "CANDIDATO A CARGO POLITICO ELETIVO", "code": "4090" },
        { "name": "PRODUTOR RURAL (PESSOA FISICA)", "code": "4120" },
        { "name": "ORGANIZAÇÃO INTERNACIONAL", "code": "5010" },
        { "name": "REPRESENTAÇÃO DIPLOMÁTICA ESTRANGEIRA", "code": "5029" },
        { "name": "OUTRAS INSTITUIÇÕES EXTRATERRITORIAIS", "code": "5037" },
        { "name": "NATUREZA JURÍDICA NÃO INFORMADA", "code": "8885" }
    ],

    // Busca sugestões de Natureza Jurídica por descrição ou código
    async _findNatjurSuggestions(query) {
        const rawQ = String(query || '').trim();
        if (!rawQ) return [];

        const normQ = this._normalizeString(rawQ);
        const cleanNumeric = rawQ.replace(/\D/g, '');

        let list = this._allNatjurList || [];

        try {
            if (!this._natjurApiLoaded) {
                const res = await fetch('https://api.casadosdados.com.br/v4/public/cnpj/busca/natureza-juridica');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        list = data;
                        this._allNatjurList = data;
                        this._natjurApiLoaded = true;
                    }
                }
            }
        } catch (e) {
            // Silencioso
        }

        const matches = list.map(item => {
            const code = String(item.code || '').trim();
            const name = item.name || '';
            const normName = this._normalizeString(name);

            let score = 0;
            if (cleanNumeric.length > 0) {
                if (code === cleanNumeric) score += 100;
                else if (code.startsWith(cleanNumeric)) score += 80;
                else if (code.includes(cleanNumeric)) score += 50;
            }

            if (normQ.length > 0) {
                if (normName === normQ) score += 90;
                else if (normName.startsWith(normQ)) score += 70;
                else if (normName.includes(normQ)) score += 60;
                else {
                    const tokens = normQ.split(/\s+/).filter(t => t.length >= 2);
                    let tokenMatches = 0;
                    tokens.forEach(t => {
                        if (normName.includes(t)) tokenMatches++;
                    });
                    if (tokenMatches > 0) {
                        score += (tokenMatches / tokens.length) * 40;
                    }
                }
            }

            if (score > 0) return { code, name, score };
            return null;
        }).filter(Boolean);

        matches.sort((a, b) => b.score - a.score);
        return matches.map(m => ({ code: m.code, name: m.name }));
    },

    // Busca sugestões de CNAE por termo ou código via API/Cache
    async _findCnaeSuggestions(unmatchedItem) {
        const q = String(unmatchedItem || '').trim().toUpperCase();
        if (!q) return [];

        if (this._cnaeCache[q]) return this._cnaeCache[q];

        let rawList = [];
        try {
            const res = await fetch(`https://api.casadosdados.com.br/v4/public/cnpj/busca/cnae?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    rawList = data;
                } else if (data && typeof data === 'object') {
                    rawList = data.data || data.results || data.cnaes || [];
                }
            }
        } catch (e) {
            console.warn('Erro ao buscar sugestões de CNAE:', e);
        }

        // Fallback para cnae.json se a API falhar ou não retornar dados
        if (rawList.length === 0 && this._localCnaeDb) {
            rawList = this._localCnaeDb;
        }

        // Aplica o filtro inteligente client-side (com radicais e relevância)
        let results = this._filterCnaeList(rawList, q);

        // Se ainda não achou e temos cnae.json local, tenta filtrar no banco local
        if (results.length === 0 && this._localCnaeDb && rawList !== this._localCnaeDb) {
            results = this._filterCnaeList(this._localCnaeDb, q);
        }

        results.forEach(c => {
            if (c.code) this._cnaeKnownMap[c.code] = c.name;
        });

        this._cnaeCache[q] = results;
        return results;
    },

    // Exibe o painel de alerta "CNAEs não encontrados... Você quis dizer...?"
    async showCnaeValidationNotice(unmatchedItems) {
        const noticeEl = document.getElementById('mineCnaeValidationNotice');
        const unmatchedTextEl = document.getElementById('mineUnmatchedCnaesText');
        const suggestionsContainer = document.getElementById('mineCnaeSuggestionsContainer');
        if (!noticeEl || !unmatchedTextEl || !suggestionsContainer) return;

        if (!unmatchedItems || unmatchedItems.length === 0) {
            noticeEl.classList.add('hidden');
            return;
        }

        const unmatchedNames = unmatchedItems.map(item => item.original).join(', ');
        unmatchedTextEl.textContent = unmatchedNames;

        let html = '';
        for (const item of unmatchedItems) {
            const suggestions = await this._findCnaeSuggestions(item.original);
            if (suggestions.length > 0) {
                html += `
                    <div class="w-full mt-1.5 mb-2">
                        <span class="text-[11px] font-semibold block mb-1" style="color:#c7d2fe;">
                            🔍 CNAEs correspondentes para "<strong style="color:#ffffff;">${item.original}</strong>" (${suggestions.length} encontrados):
                        </span>
                        <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08);">
                            ${suggestions.map(c => `
                                <button type="button" class="mine-suggested-cnae-btn" data-code="${c.code}" style="background:rgba(99,102,241,0.25); border:1px solid rgba(99,102,241,0.5); color:#a5b4fc; padding:3px 9px; border-radius:4px; font-weight:600; cursor:pointer; font-size:0.75rem; transition:all 0.15s;" title="${c.name}">
                                    + ${c.code} (${c.name})
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="w-full mt-1 text-xs text-gray-400">
                        Nenhum CNAE correspondente a "${item.original}" encontrado. Verifique o código ou nome.
                    </div>
                `;
            }
        }

        suggestionsContainer.innerHTML = html;

        suggestionsContainer.querySelectorAll('.mine-suggested-cnae-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const codeToAdd = btn.dataset.code;
                if (codeToAdd && !this.filters.cnaes.includes(codeToAdd)) {
                    this.filters.cnaes.push(codeToAdd);
                    if (this._chipRefreshers.cnaes) this._chipRefreshers.cnaes();
                    this.buildPayload();
                }
                btn.style.opacity = '0.4';
                btn.style.pointerEvents = 'none';
                btn.textContent = '✓ ' + codeToAdd;
            });
        });

        noticeEl.classList.remove('hidden');

        const closeBtn = document.getElementById('mineCloseCnaeNoticeBtn');
        if (closeBtn) {
            closeBtn.onclick = () => noticeEl.classList.add('hidden');
        }
    },

    // ===== REFERÊNCIAS DOM (preenchido no init) =====
    els: {},

    // ========================= PAYLOAD BUILDER =========================
    buildPayload() {
        const uf = (this.els.ufInput?.value || '').toUpperCase().trim();
        const situacao = this.els.situacaoSelect?.value || 'ativa';

        // Checkboxes de filtros avançados
        const getCheck = (id) => document.getElementById(id)?.checked || false;

        // Configuração dos controles de busca textual
        const tipoBusca = document.getElementById('searchTermTipoBusca')?.value || 'radical';
        const razaoSocial = document.getElementById('searchTermRazaoSocial')?.checked ?? true;
        const nomeFantasia = document.getElementById('searchTermNomeFantasia')?.checked ?? true;
        const nomeSocio = document.getElementById('searchTermNomeSocio')?.checked ?? false;

        // Cidades garantidamente sem acento no payload (padrão Casa dos Dados)
        const unaccentedCities = this.filters.cidades.map(c => this._normalizeString(c));

        // MEI
        const meiVal = document.getElementById('mineMeiSelect')?.value || 'todos';
        const meiObj = {
            "optante": meiVal === 'apenas_mei',
            "excluir_optante": meiVal === 'excluir_mei'
        };

        // Simples Nacional
        const simplesVal = document.getElementById('mineSimplesSelect')?.value || 'todos';
        const simplesObj = {
            "optante": simplesVal === 'apenas_simples',
            "excluir_optante": simplesVal === 'excluir_simples'
        };

        const payload = {
            "cnpj": [],
            "cnpj_raiz": this.filters.cnpjRaiz || [],
            "situacao_cadastral": situacao === '_todas' ? [] : [situacao],
            "codigo_atividade_principal": this.filters.cnaes,
            "codigo_natureza_juridica": this.filters.naturezaJuridica,
            "incluir_atividade_secundaria": document.getElementById('mineCnaeSecundariaCheck')?.checked || false,
            "uf": (uf && uf !== '_TODOS' && uf !== 'TODOS') ? [uf] : [],
            "municipio": unaccentedCities,
            "bairro": this.filters.bairros,
            "cep": this.filters.ceps,
            "ddd": this.filters.ddds,
            "telefone": this.filters.telefone || [],
            "data_abertura": this._getDataAberturaFilter(),
            "capital_social": this._getCapitalSocialFilter(),
            "mei": meiObj,
            "simples": simplesObj,
            "mais_filtros": {
                "somente_matriz": getCheck('mf_somente_matriz'),
                "somente_filial": getCheck('mf_somente_filial'),
                "com_email": getCheck('mf_com_email'),
                "com_telefone": getCheck('mf_com_telefone'),
                "somente_fixo": getCheck('mf_somente_fixo'),
                "somente_celular": getCheck('mf_somente_celular'),
                "excluir_empresas_visualizadas": getCheck('mf_excluir_empresas_visualizadas'),
                "excluir_email_contab": getCheck('mf_excluir_email_contab')
            },
            "limite": 100,
            "pagina": 1,
            "busca_textual": this.filters.termos.length > 0 ? [{
                "texto": this.filters.termos,
                "tipo_busca": tipoBusca,
                "razao_social": razaoSocial,
                "nome_fantasia": nomeFantasia,
                "nome_socio": nomeSocio
            }] : []
        };

        // Atualiza editor (se não está em foco / editando manualmente)
        if (this.els.jsonEditor && !this.els.jsonEditor._userEditing) {
            this.els.jsonEditor.value = JSON.stringify(payload, null, 2);
        }

        return payload;
    },
    _getDataAberturaFilter() {
        const daDe = document.getElementById('mineDataDe')?.value;
        const daAte = document.getElementById('mineDataAte')?.value;
        const res = {};
        if (daDe) res.de = daDe;
        if (daAte) res.ate = daAte;
        return Object.keys(res).length > 0 ? res : {};
    },

    _getCapitalSocialFilter() {
        const minStr = document.getElementById('mineCapitalMin')?.value;
        const maxStr = document.getElementById('mineCapitalMax')?.value;
        const min = minStr ? parseFloat(minStr) : 0;
        const max = maxStr ? parseFloat(maxStr) : 0;
        return (min > 0 || max > 0) ? { minimo: min, maximo: max } : { minimo: 0, maximo: 0 };
    },

    // ========================= PAYLOAD EDITOR =========================
    // Lê o JSON do editor (prioridade sobre filtros visuais quando editado)
    getPayloadFromEditor() {
        if (!this.els.jsonEditor) return null;
        try {
            const parsed = JSON.parse(this.els.jsonEditor.value);
            return parsed;
        } catch (e) {
            return null; // JSON inválido
        }
    },

    // Valida e destaca erros no editor
    validateEditor() {
        if (!this.els.jsonEditor) return true;
        try {
            JSON.parse(this.els.jsonEditor.value);
            this.els.jsonEditor.style.borderColor = 'rgba(74, 222, 128, 0.4)';
            if (this.els.jsonEditorStatus) {
                this.els.jsonEditorStatus.textContent = '✓ JSON válido';
                this.els.jsonEditorStatus.style.color = '#4ade80';
            }
            return true;
        } catch (e) {
            this.els.jsonEditor.style.borderColor = 'rgba(248, 113, 113, 0.6)';
            if (this.els.jsonEditorStatus) {
                this.els.jsonEditorStatus.textContent = '✗ ' + e.message;
                this.els.jsonEditorStatus.style.color = '#f87171';
            }
            return false;
        }
    },

    // Sincroniza do editor para os filtros visuais
    syncEditorToFilters(options = {}) {
        const payload = this.getPayloadFromEditor();
        if (!payload) {
            if (!options.silent) {
                alert('JSON inválido! Corrija a sintaxe antes de sincronizar.');
            }
            return;
        }

        const currentUf = (this.els.ufInput?.value || 'SP').toUpperCase().trim();

        // UF
        if (this.els.ufInput) {
            if (!payload.uf || payload.uf.length === 0) {
                this.els.ufInput.value = '_todos';
            } else {
                const newUf = payload.uf[0].toUpperCase().trim();
                if (newUf !== currentUf) {
                    this.els.ufInput.value = newUf;
                    this.loadCitiesList(newUf);
                }
            }
        }

        // Situação
        if (this.els.situacaoSelect) {
            if (!payload.situacao_cadastral || payload.situacao_cadastral.length === 0) {
                this.els.situacaoSelect.value = '_todas';
            } else {
                this.els.situacaoSelect.value = payload.situacao_cadastral[0];
            }
        }

        // Chips - garante que cidades fiquem sem acento e em maiúsculas (padrão Casa dos Dados)
        this.filters.cidades = (payload.municipio || []).map(c => this._normalizeString(c));
        this.filters.cnaes = payload.codigo_atividade_principal || [];
        this.filters.naturezaJuridica = payload.codigo_natureza_juridica || [];
        this.filters.bairros = payload.bairro || [];
        this.filters.ceps = payload.cep || [];
        this.filters.ddds = payload.ddd || [];
        this.filters.cnpjRaiz = payload.cnpj_raiz || [];
        this.filters.telefone = payload.telefone || [];

        // MEI
        const meiSel = document.getElementById('mineMeiSelect');
        if (meiSel) {
            const mei = payload.mei || {};
            if (mei.optante) meiSel.value = 'apenas_mei';
            else if (mei.excluir_optante) meiSel.value = 'excluir_mei';
            else meiSel.value = 'todos';
        }

        // Simples Nacional
        const simplesSel = document.getElementById('mineSimplesSelect');
        if (simplesSel) {
            const simples = payload.simples || {};
            if (simples.optante) simplesSel.value = 'apenas_simples';
            else if (simples.excluir_optante) simplesSel.value = 'excluir_simples';
            else simplesSel.value = 'todos';
        }

        // Termos de busca e controles de busca
        if (payload.busca_textual && payload.busca_textual.length > 0 && payload.busca_textual[0].texto) {
            const bt = payload.busca_textual[0];
            this.filters.termos = (bt.texto || []).map(t => t.toUpperCase());
            const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
            setCheck('searchTermRazaoSocial', bt.razao_social);
            setCheck('searchTermNomeFantasia', bt.nome_fantasia);
            setCheck('searchTermNomeSocio', bt.nome_socio);
            const tipoSel = document.getElementById('searchTermTipoBusca');
            if (tipoSel && bt.tipo_busca) tipoSel.value = bt.tipo_busca;
        } else {
            this.filters.termos = [];
        }

        // Checkboxes
        const mf = payload.mais_filtros || {};
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
        setCheck('mf_somente_matriz', mf.somente_matriz);
        setCheck('mf_somente_filial', mf.somente_filial);
        setCheck('mf_com_email', mf.com_email);
        setCheck('mf_com_telefone', mf.com_telefone);
        setCheck('mf_somente_fixo', mf.somente_fixo);
        setCheck('mf_somente_celular', mf.somente_celular);
        setCheck('mf_excluir_empresas_visualizadas', mf.excluir_empresas_visualizadas);
        setCheck('mf_excluir_email_contab', mf.excluir_email_contab);

        // Capital Social
        const cs = payload.capital_social || {};
        const csMin = document.getElementById('mineCapitalMin');
        const csMax = document.getElementById('mineCapitalMax');
        if (csMin) csMin.value = cs.minimo || 0;
        if (csMax) csMax.value = cs.maximo || 0;

        // Data Abertura
        const da = payload.data_abertura || {};
        const daDe = document.getElementById('mineDataDe');
        const daAte = document.getElementById('mineDataAte');
        if (daDe) daDe.value = da.de || '';
        if (daAte) daAte.value = da.ate || '';

        // Refresh todos os chips
        Object.keys(this._chipRefreshers).forEach(k => this._chipRefreshers[k]());

        if (!options.silent) {
            this.log('✓ Filtros visuais sincronizados do JSON editado.', 'succ');
        }
    },

    // ========================= TERMINAL LOG =========================
    log(msg, type = 'info') {
        const terminal = this.els.terminal;
        if (!terminal) return;
        const time = new Date().toLocaleTimeString('pt-BR');
        const cls = { info: 'mine-log-info', warn: 'mine-log-warn', err: 'mine-log-err', succ: 'mine-log-succ' }[type] || 'mine-log-info';
        terminal.innerHTML += `<div class="${cls}">[${time}] ${msg}</div>`;
        terminal.scrollTop = terminal.scrollHeight;
    },

    clearLog() {
        if (this.els.terminal) this.els.terminal.innerHTML = '<div class="mine-log-info">--- Console Standby ---</div>';
    },

    // ========================= PROGRESSO =========================
    updateProgress(current, total) {
        const bar = this.els.progressBar;
        if (!bar) return;
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        bar.style.width = `${pct}%`;
        bar.textContent = `${pct}%`;
    },

    updateMineStats() {
        const el = (id) => document.getElementById(id);
        if (el('mineStatTotal')) el('mineStatTotal').textContent = this.state.totalRecords;
        if (el('mineStatExtracts')) el('mineStatExtracts').textContent = this.state.leads.length;
        if (el('mineStatExcluded')) el('mineStatExcluded').textContent = this.state.excludedFromBlocklist;

        // Page info with max pages indicator
        const maxLabel = this.state.maxPages > 0 ? ` (máx:${this.state.maxPages})` : '';
        if (el('mineStatPage')) el('mineStatPage').textContent = `${this.state.currentPage}/${this.state.totalPages}${maxLabel}`;

        // ETA calculation based on moving average of page times
        if (el('mineStatEta')) {
            const times = this.state.pageTimes;
            if (times.length > 0 && this.state.currentPage < this.state.totalPages) {
                const lastN = times.slice(-5);
                const avg = lastN.reduce((a, b) => a + b, 0) / lastN.length;
                const effectiveTotal = this.state.maxPages > 0
                    ? Math.min(this.state.totalPages, this.state.maxPages)
                    : this.state.totalPages;
                const remaining = effectiveTotal - this.state.currentPage;
                const etaMs = remaining * avg;
                if (etaMs < 60000) {
                    el('mineStatEta').textContent = `~${Math.ceil(etaMs / 1000)}s`;
                } else {
                    const m = Math.floor(etaMs / 60000);
                    const s = Math.ceil((etaMs % 60000) / 1000);
                    el('mineStatEta').textContent = `~${m}m${s}s`;
                }
            } else if (this.state.currentPage >= this.state.totalPages && this.state.totalPages > 0) {
                el('mineStatEta').textContent = 'Concluído';
            } else {
                el('mineStatEta').textContent = '—';
            }
        }

        // Duplicates skipped
        if (el('mineStatDupes')) el('mineStatDupes').textContent = this.state.duplicatesSkipped;

        // Velocidade (CNPJs/s)
        if (el('mineStatSpeed') && this.state.miningStartTime) {
            const elapsedMs = Date.now() - this.state.miningStartTime;
            if (elapsedMs > 1000) {
                const speed = this.state.leads.length / (elapsedMs / 1000);
                el('mineStatSpeed').textContent = speed.toFixed(1);
            } else {
                el('mineStatSpeed').textContent = '0';
            }
        }
    },

    // ========================= CHIP SYSTEM =========================
    initChips() {
        const self = this;

        document.querySelectorAll('.mine-chip-input').forEach(input => {
            const key = input.dataset.key;
            const container = input.parentElement;

            const refresh = () => {
                container.querySelectorAll('.mine-chip').forEach(c => c.remove());
                self.filters[key].forEach((val, idx) => {
                    const chip = document.createElement('div');
                    chip.className = 'mine-chip';
                    chip.innerHTML = `${val} <span data-key="${key}" data-idx="${idx}">×</span>`;
                    container.insertBefore(chip, input);
                });
                self.buildPayload();
            };

            // Salvar referência do refresh para syncEditorToFilters
            self._chipRefreshers[key] = refresh;

            // Função para processar os valores digitados (suporta vírgula, linebreak \n, ;, |, \t)
            const processValues = (rawText) => {
                if (!rawText) return 0;
                const currentUf = (self.els.ufInput?.value || 'SP').toUpperCase().trim();
                const parts = rawText.split(/[,;|\r\n\t]+/).map(p => p.trim()).filter(p => p.length > 0);
                let added = 0;
                const unmatchedCities = [];
                const unmatchedCnaes = [];

                parts.forEach(v => {
                    if (key === 'cnpjRaiz') {
                        const cleanDigits = v.replace(/\D/g, '').slice(0, 8);
                        if (cleanDigits && !self.filters.cnpjRaiz.includes(cleanDigits)) {
                            self.filters.cnpjRaiz.push(cleanDigits);
                            added++;
                        }
                    } else if (key === 'cnaes') {
                        const cleanDigits = v.replace(/\D/g, '');
                        // Valida se é um código numérico de 7 dígitos (ou 5/7 dígitos conhecido)
                        if (cleanDigits.length === 7 || (cleanDigits.length >= 5 && self._cnaeKnownMap[cleanDigits])) {
                            if (!self.filters.cnaes.includes(cleanDigits)) {
                                self.filters.cnaes.push(cleanDigits);
                                added++;
                            }
                        } else {
                            unmatchedCnaes.push({ original: v });
                        }
                    } else if (key === 'cidades') {
                        const normV = self._normalizeString(v);
                        const ufCities = self._ufCitiesCache[currentUf] || self._allUfCities || [];
                        const matchedCity = ufCities.find(c => self._normalizeString(c) === normV);

                        if (matchedCity) {
                            const finalCity = self._normalizeString(matchedCity);
                            if (!self.filters.cidades.includes(finalCity)) {
                                self.filters.cidades.push(finalCity);
                                added++;
                            }
                        } else {
                            // Não encontrada na lista oficial da UF — busca correspondências por radical (ex: 4 letras)
                            const suggestions = self._findCitySuggestions(v, ufCities);
                            unmatchedCities.push({ original: v, suggestions });
                        }
                    } else {
                        const finalVal = v.toUpperCase();
                        if (finalVal && !self.filters[key].includes(finalVal)) {
                            self.filters[key].push(finalVal);
                            added++;
                        }
                    }
                });

                if (key === 'cidades') {
                    self.showCitiesValidationNotice(unmatchedCities);
                } else if (key === 'cnaes' && unmatchedCnaes.length > 0) {
                    self.showCnaeValidationNotice(unmatchedCnaes);
                }

                return added;
            };

            // Ao pressionar Enter: aceita valor único OU lista com vírgula
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const raw = input.value.trim();
                    if (!raw) return;

                    const added = processValues(raw);
                    input.value = '';
                    if (added > 0) refresh();
                }
            });

            // Ao perder o foco (blur): processa o que estiver digitado no campo
            input.addEventListener('blur', e => {
                const raw = input.value.trim();
                if (!raw) return;

                const added = processValues(raw);
                input.value = '';
                if (added > 0) refresh();
            });

            // Suporte a colar (Ctrl+V) com split automático capturando texto multilinha do clipboard
            input.addEventListener('paste', e => {
                const pasteText = (e.clipboardData || window.clipboardData)?.getData('text');
                if (pasteText) {
                    e.preventDefault();
                    const added = processValues(pasteText);
                    input.value = '';
                    if (added > 0) refresh();
                }
            });

            // Delegação de evento para remover chips
            container.addEventListener('click', e => {
                const span = e.target.closest('span[data-key]');
                if (span) {
                    const k = span.dataset.key;
                    const i = parseInt(span.dataset.idx);
                    self.filters[k].splice(i, 1);
                    // Recalcular referências de refresh do filtro correto
                    if (self._chipRefreshers[k]) self._chipRefreshers[k]();
                }
            });

            refresh();
        });
    },

    // Limpa todos os chips de um filtro específico
    clearChips(key) {
        this.filters[key] = [];
        if (this._chipRefreshers[key]) this._chipRefreshers[key]();
    },

    // Limpa TODOS os chips de todos os filtros
    clearAllChips() {
        Object.keys(this.filters).forEach(k => {
            this.filters[k] = [];
        });
        Object.keys(this._chipRefreshers).forEach(k => this._chipRefreshers[k]());
    },

    // ========================= BLOCKLIST HELPERS =========================
    // Normaliza um CNPJ para string alfanumérica maiúscula com zero-padding
    normalizeCnpjForBlocklist(raw) {
        if (!raw) return '';
        const clean = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (/^\d{1,13}$/.test(clean)) return clean.padStart(14, '0');
        return clean;
    },

    // Verifica se um CNPJ (14 dígitos) está na blocklist (exato ou por raiz)
    isInBlocklist(cnpj14) {
        const active = document.getElementById('blocklistActiveCheck')?.checked ?? true;
        if (!active) return false;
        if (!state.cnpjsJaAtendidos || state.cnpjsJaAtendidos.size === 0) return false;
        const clean = this.normalizeCnpjForBlocklist(cnpj14);
        if (state.cnpjsJaAtendidos.has(clean)) return true;
        const matchByRoot = document.getElementById('blocklistMatchByRoot')?.checked ?? true;
        if (matchByRoot && clean.length >= 8) {
            const root = clean.substring(0, 8);
            if (state.cnpjsJaAtendidos.has(root)) return true;
        }
        return false;
    },

    // ========================= MOTOR DE EXTRAÇÃO =========================
    async startMining() {
        const key = this.els.apiKeyInput?.value?.trim();
        if (!key) {
            alert('API Key da Casa dos Dados é obrigatória!');
            return;
        }

        // Verificar se o JSON do editor é válido (se o user editou manualmente)
        if (this.els.jsonEditor && this.els.jsonEditor._userEditing) {
            if (!this.validateEditor()) {
                alert('O JSON no editor está inválido! Corrija antes de minerar.');
                return;
            }
        }

        // Salvar key no localStorage
        localStorage.setItem('casadosdados_api_key', key);

        this.state.apiKey = key;
        this.state.endpoint = this.els.endpointInput?.value?.trim() || this.state.endpoint;
        this.state.delayBetweenPages = parseInt(this.els.pageDelayInput?.value) || 3000;
        this.state.maxPages = parseInt(this.els.maxPagesInput?.value) || 0;
        this.state.running = true;
        this.state.leads = [];
        this.state.currentPage = 0;
        this.state.totalPages = 0;
        this.state.totalRecords = 0;
        this.state.pageTimes = [];
        this.state.seenCnpjs = new Set();
        this.state.duplicatesSkipped = 0;
        this.state.excludedFromBlocklist = 0;

        this.clearLog();
        this.log('=== FASE 1: INICIANDO MINERAÇÃO ===', 'info');
        this.log(`Endpoint: ${this.state.endpoint}`, 'info');
        if (this.state.maxPages > 0) this.log(`⚡ Limite: ${this.state.maxPages} páginas`, 'info');

        // UI
        this.els.startMineBtn?.classList.add('hidden');
        this.els.stopMineBtn?.classList.remove('hidden');
        this.els.transferBtn?.classList.add('hidden');
        this.els.exportMineBtn?.classList.add('hidden');
        this.els.exportMineJsonBtn?.classList.add('hidden');
        if (this.els.mineSpinner) this.els.mineSpinner.classList.remove('hidden');

        const headers = {
            "api-key": this.state.apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://portal.casadosdados.com.br",
            "Referer": "https://portal.casadosdados.com.br/"
        };

        this.state.miningStartTime = Date.now();
        
        // Iniciar loop
        this._miningLoop();
    },
    async _miningLoop() {
        this.state.miningStartTime = Date.now();
        const smartDouble = document.getElementById('smartDoubleMiningCheck')?.checked ?? true;
        const hasCnaes = this.filters.cnaes && this.filters.cnaes.length > 0;
        const hasTermos = this.filters.termos && this.filters.termos.length > 0;
        const customPayload = (this._userHasCustomJson || this.els.jsonEditor?._userEditing) ? this.getPayloadFromEditor() : null;

        try {
            if (customPayload) {
                this.log('📝 [Payload Personalizado] Executando mineração utilizando o JSON exato do editor (preservando campos customizados/novos)...', 'succ');
                await this._executeMiningPass(customPayload);
            } else if (smartDouble && hasCnaes && hasTermos) {
                this.log('🔍 [Busca Dupla Inteligente] Ativada! Executando mineração em 2 etapas para extração completa...', 'succ');
                
                // Etapa 1: Mineração por CNAE
                const payloadCnae = this.buildPayload();
                payloadCnae.busca_textual = [];
                await this._executeMiningPass(payloadCnae, '=== ETAPA 1/2: MINERAÇÃO POR CNAES ===');

                // Etapa 2: Mineração por Termos de Busca
                if (this.state.running) {
                    const payloadTermos = this.buildPayload();
                    payloadTermos.codigo_atividade_principal = [];
                    payloadTermos.incluir_atividade_secundaria = false;
                    await this._executeMiningPass(payloadTermos, '=== ETAPA 2/2: MINERAÇÃO POR TERMOS DE BUSCA ===');
                }
            } else {
                // Mineração padrão em payload único
                const payload = this.buildPayload();
                await this._executeMiningPass(payload);
            }

            if (!this.state.running) {
                this.log(`⚠️ Mineração pausada/parada pelo usuário.`, 'warn');
            }
        } catch (err) {
            this.log(`❌ Erro crítico: ${err.message}`, 'err');
            console.error(err);
        } finally {
            this.state.running = false;
            this.els.startMineBtn?.classList.remove('hidden');
            this.els.stopMineBtn?.classList.add('hidden');
            if (this.els.mineSpinner) this.els.mineSpinner.classList.add('hidden');

            if (this.state.leads.length > 0) {
                this.els.transferBtn?.classList.remove('hidden');
                this.els.transferBtnFase2?.classList.remove('hidden');
                this.els.clearResultsBtn?.classList.remove('hidden');
                this.els.exportMineBtn?.classList.remove('hidden');
                this.els.exportMineJsonBtn?.classList.remove('hidden');
                const duration = ((Date.now() - this.state.miningStartTime) / 1000).toFixed(0);
                this.log(`\n=== MINERAÇÃO CONCLUÍDA: ${this.state.leads.length} CNPJs únicos na memória (${duration}s) ===`, 'succ');
                if (this.state.duplicatesSkipped > 0) {
                    this.log(`   ${this.state.duplicatesSkipped} duplicados ignorados.`, 'info');
                }
                this.saveToHistory();
            }
        }
    },

    async _executeMiningPass(payloadBase, passTitle) {
        const headers = {
            "api-key": this.state.apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://portal.casadosdados.com.br",
            "Referer": "https://portal.casadosdados.com.br/"
        };

        let pag = 1;
        let totalPag = 1;

        if (passTitle) this.log(passTitle, 'info');

        while (this.state.running && pag <= totalPag) {
            const iterationStart = Date.now();
            if (this.state.maxPages > 0 && pag > this.state.maxPages) {
                this.log(`⚡ Limite de ${this.state.maxPages} páginas atingido nesta etapa.`, 'warn');
                break;
            }

            const payload = JSON.parse(JSON.stringify(payloadBase));
            payload.pagina = pag;

            this.log(`→ Requisitando página ${pag}...`, 'info');

            let res = null;
            const MAX_RETRIES = 5;
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                res = await fetch(this.state.endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });
                
                if (res.status === 429) {
                    const baseDelay = 3000 * Math.pow(2, attempt - 1);
                    const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
                    const delay = Math.round(baseDelay + jitter);
                    this.log(`[Rate Limit] Erro 429 na pág ${pag}. Tentativa ${attempt}/${MAX_RETRIES}. Aguardando ${Math.round(delay/1000)}s...`, 'warn');
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                if (!res.ok) {
                    this.log(`[Erro] HTTP ${res.status} na pág ${pag}. Tentativa ${attempt}/${MAX_RETRIES}.`, 'err');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }
                break;
            }

            if (!res || !res.ok) {
                this.log(`❌ Falha definitiva na página ${pag} após ${MAX_RETRIES} tentativas.`, 'err');
                break;
            }

            const data = await res.json();
            
            if (pag === 1) {
                const passTotalRecords = data.data?.count || data.total || 0;
                totalPag = data.data?.pageCount || Math.ceil(passTotalRecords / 100) || 1;
                this.state.totalRecords += passTotalRecords;
                this.state.totalPages = Math.max(this.state.totalPages, totalPag);
                this.log(`Encontrados: ${passTotalRecords} CNPJs em ${totalPag} páginas nesta etapa.`, 'succ');
            }

            const pageCnpjs = data.data?.cnpj || data.cnpjs || [];

            pageCnpjs.forEach(item => {
                const cleanCnpj = utils.cleanCnpjStr(item.cnpj);
                if (this.state.seenCnpjs.has(cleanCnpj)) {
                    this.state.duplicatesSkipped++;
                    return;
                }
                if (this.isInBlocklist(cleanCnpj)) {
                    this.state.excludedFromBlocklist++;
                    this.log(`[⛔ SKIP] ${item.cnpj || cleanCnpj} — já atendido (blocklist)`, 'warn');
                    return;
                }
                this.state.seenCnpjs.add(cleanCnpj);
                
                const sit = item.situacao_cadastral || {};
                const end = item.endereco || {};
                const lead = {
                    cnpj: item.cnpj,
                    razao_social: item.razao_social,
                    nome_fantasia: item.nome_fantasia || '',
                    situacao: typeof sit === 'object' ? (sit.situacao_atual || '') : sit,
                    data_situacao: typeof sit === 'object' ? (sit.data || '').split('T')[0] : (item.data_situacao_cadastral || ''),
                    data_abertura: (item.data_inicio_atividade || item.data_abertura || '').split('T')[0],
                    natureza_juridica: item.natureza_juridica?.descricao || item.natureza_juridica || '',
                    cnae_principal: item.atividade_principal?.codigo || item.cnae_principal || '',
                    cnae_descricao: item.atividade_principal?.descricao || item.cnae_principal_descricao || '',
                    logradouro: end.logradouro || item.logradouro || '',
                    numero: end.numero || item.numero || '',
                    complemento: end.complemento || item.complemento || '',
                    bairro: end.bairro || item.bairro || '',
                    municipio: end.municipio || item.municipio || '',
                    uf: end.uf || item.uf || '',
                    cep: end.cep || item.cep || '',
                    telefone1: item.telefone1 || item.ddd_telefone_1 || '',
                    telefone2: item.telefone2 || item.ddd_telefone_2 || '',
                    email: item.email || '',
                    capital_social: item.capital_social || 0,
                    porte: item.porte?.descricao || item.porte || ''
                };
                this.state.leads.push(lead);
            });

            this.state.currentPage = pag;
            this.saveSession();

            if (pag === 1 || pag % 5 === 0 || pag === totalPag) {
                this.renderMineTable();
            }

            this.updateProgress(pag, totalPag);
            this.updateMineStats();
            
            if (pag < totalPag && this.state.running) {
                const elapsed = Date.now() - iterationStart;
                const remainingDelay = Math.max(0, this.state.delayBetweenPages - elapsed);
                if (remainingDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, remainingDelay));
                }
                this.state.pageTimes.push(Date.now() - iterationStart);
                if (this.state.pageTimes.length > 5) this.state.pageTimes.shift();
            }

            pag++;
        }
    },

    stopMining() {
        this.state.running = false;
        this.log('⛔ Sinal de parada enviado. Encerrando após a página atual...', 'warn');
    },

    // ========================= PERSISTÊNCIA DE SESSÃO (#16) =========================
    saveSession() {
        try {
            const sessionData = {
                apiKey: this.state.apiKey,
                endpoint: this.state.endpoint,
                delayBetweenPages: this.state.delayBetweenPages,
                maxPages: this.state.maxPages,
                leads: this.state.leads,
                currentPage: this.state.currentPage,
                totalPages: this.state.totalPages,
                totalRecords: this.state.totalRecords,
                pageTimes: this.state.pageTimes,
                seenCnpjs: Array.from(this.state.seenCnpjs),
                duplicatesSkipped: this.state.duplicatesSkipped,
                filters: this.filters,
                miningStartTime: this.state.miningStartTime
            };
            sessionStorage.setItem('mining_session_state', JSON.stringify(sessionData));
        } catch (e) {
            console.warn('Não foi possível salvar a sessão.', e);
        }
    },

    clearSession() {
        sessionStorage.removeItem('mining_session_state');
    },

    checkSession() {
        const saved = sessionStorage.getItem('mining_session_state');
        if (!saved) return;
        try {
            const s = JSON.parse(saved);
            if (s.currentPage < s.totalPages && s.leads.length > 0) {
                const btn = document.createElement('button');
                btn.id = 'resumeSessionBtn';
                btn.className = 'btn-primary btn-warning';
                btn.innerHTML = `⚠️ Retomar Sessão (${s.leads.length} CNPJs - Pág ${s.currentPage}/${s.totalPages})`;
                btn.onclick = () => this.resumeSession(s);
                this.els.startMineBtn?.parentNode.insertBefore(btn, this.els.startMineBtn.nextSibling);
            }
        } catch (e) {
            this.clearSession();
        }
    },

    resumeSession(s) {
        if (!confirm(`Retomar mineração a partir da página ${s.currentPage + 1}?`)) {
            document.getElementById('resumeSessionBtn')?.remove();
            this.clearSession();
            return;
        }
        
        this.state.apiKey = s.apiKey;
        this.state.endpoint = s.endpoint;
        this.state.delayBetweenPages = s.delayBetweenPages;
        this.state.maxPages = s.maxPages;
        this.state.leads = s.leads;
        this.state.currentPage = s.currentPage;
        this.state.totalPages = s.totalPages;
        this.state.totalRecords = s.totalRecords;
        this.state.pageTimes = s.pageTimes || [];
        this.state.seenCnpjs = new Set(s.seenCnpjs || []);
        this.state.duplicatesSkipped = s.duplicatesSkipped || 0;
        this.filters = s.filters;
        this.state.miningStartTime = s.miningStartTime || Date.now();
        this.state.running = true;

        document.getElementById('resumeSessionBtn')?.remove();
        
        this.els.startMineBtn?.classList.add('hidden');
        this.els.stopMineBtn?.classList.remove('hidden');
        if (this.els.mineSpinner) this.els.mineSpinner.classList.remove('hidden');
        
        this.log('=== FASE 1: RETOMANDO MINERAÇÃO ===', 'info');
        this.log(`Retomando da página ${this.state.currentPage + 1}...`, 'info');
        
        this.renderMineTable();
        this.updateMineStats();
        
        this._miningLoop();
    },

    // ========================= TESTE DE API KEY =========================
    async testApiKey() {
        const key = this.els.apiKeyInput?.value?.trim();
        if (!key) { alert('Insira uma API Key primeiro.'); return; }

        const badge = document.getElementById('mineKeyTestResult');
        const btn = document.getElementById('testApiKeyBtn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Testando...'; }

        try {
            const testPayload = {
                "situacao_cadastral": ["ativa"],
                "uf": ["SP"],
                "limite": 1,
                "pagina": 1,
                "busca_textual": []
            };

            const res = await fetch(this.state.endpoint, {
                method: 'POST',
                headers: {
                    "api-key": key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Origin": "https://portal.casadosdados.com.br",
                    "Referer": "https://portal.casadosdados.com.br/"
                },
                body: JSON.stringify(testPayload)
            });

            if (res.ok) {
                const data = await res.json();
                if (badge) {
                    badge.textContent = `✅ Válida (${(data.total || 0).toLocaleString()} empresas no universo)`;
                    badge.style.color = '#4ade80';
                }
                localStorage.setItem('casadosdados_api_key', key);
                this.log('🔑 API Key válida!', 'succ');
            } else if (res.status === 401 || res.status === 403) {
                if (badge) { badge.textContent = '❌ Inválida ou expirada'; badge.style.color = '#f87171'; }
                this.log('🔑 API Key inválida ou expirada.', 'err');
            } else {
                if (badge) { badge.textContent = `⚠ Erro ${res.status}`; badge.style.color = '#fbbf24'; }
            }
        } catch (e) {
            if (badge) { badge.textContent = '⚠ Erro de conexão'; badge.style.color = '#fbbf24'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '🔑 Testar'; }
        }
    },

    // ========================= GERADOR DE NOMES INTELIGENTES DE ARQUIVOS =========================
    _generateSmartFilename(ext = 'xlsx') {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        const dateSuffix = `${day}_${month}_${year}`;

        // Função para sanitizar strings para nome de arquivo do SO
        const sanitize = (str) => {
            if (!str) return '';
            return this._normalizeString(String(str))
                .replace(/[^A-Z0-9]/gi, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '');
        };

        // Regra 1: Busca por CNPJ Raiz (ex: 53153938 - COBASI)
        if (this.filters.cnpjRaiz && this.filters.cnpjRaiz.length > 0) {
            const rootStr = this.filters.cnpjRaiz.join('_');
            let companyName = '';
            
            if (this.state.leads && this.state.leads.length > 0) {
                const first = this.state.leads[0];
                const rawName = first.nome_fantasia || first.razao_social || '';
                companyName = sanitize(rawName).slice(0, 35);
            }

            if (companyName) {
                return `Filiais_raiz_${rootStr}_${companyName}_${dateSuffix}.${ext}`;
            }
            return `Filiais_raiz_${rootStr}_${dateSuffix}.${ext}`;
        }

        // Regra 2: Busca por Cidades (até 7 cidades)
        if (this.filters.cidades && this.filters.cidades.length > 0) {
            const cityList = this.filters.cidades.slice(0, 7).map(c => sanitize(c));
            const citiesStr = cityList.join('_');
            return `Mineracao_${citiesStr}_${dateSuffix}.${ext}`;
        }

        // Regra 2.5: Extrair cidades únicas dos próprios leads minerados se não houver filtro explícito de cidades
        if (this.state.leads && this.state.leads.length > 0) {
            const leadCitiesSet = new Set();
            this.state.leads.forEach(l => {
                if (l.municipio) {
                    const s = sanitize(l.municipio);
                    if (s) leadCitiesSet.add(s);
                }
            });
            const leadCitiesList = Array.from(leadCitiesSet).slice(0, 5);
            if (leadCitiesList.length > 0) {
                const citiesStr = leadCitiesList.join('_');
                return `Mineracao_${citiesStr}_${dateSuffix}.${ext}`;
            }
        }

        // Regra 3: Busca por Termos Textuais
        if (this.filters.termos && this.filters.termos.length > 0) {
            const termList = this.filters.termos.slice(0, 3).map(t => sanitize(t));
            const termsStr = termList.join('_');
            return `Mineracao_${termsStr}_${dateSuffix}.${ext}`;
        }

        // Regra 4: Busca por CNAEs
        if (this.filters.cnaes && this.filters.cnaes.length > 0) {
            const cnaeList = this.filters.cnaes.slice(0, 3).map(c => sanitize(c));
            const cnaesStr = cnaeList.join('_');
            return `Mineracao_CNAE_${cnaesStr}_${dateSuffix}.${ext}`;
        }

        // Regra 5: Fallback padrão
        return `Mineracao_CasaDosDados_${dateSuffix}.${ext}`;
    },

    // ========================= EXPORTAÇÃO DIRETA DA MINERAÇÃO (EXCEL / JSON) =========================
    exportMined() {
        if (this.state.leads.length === 0) {
            alert('Nenhum dado minerado para exportar.');
            return;
        }
        if (typeof XLSX === 'undefined') {
            alert('Biblioteca XLSX não carregada.');
            return;
        }

        const workbook = XLSX.utils.book_new();

        // 1. Aba de Dados Minerados
        const rows = this.state.leads.map(lead => ({
            'CNPJ': lead.cnpj,
            'Razão Social': lead.razao_social,
            'Nome Fantasia': lead.nome_fantasia || '',
            'Situação': lead.situacao || '',
            'Data Situação': lead.data_situacao || '',
            'Data Abertura': lead.data_abertura || '',
            'Natureza Jurídica': lead.natureza_juridica || '',
            'CNAE Principal': lead.cnae_principal || '',
            'Descrição CNAE': lead.cnae_descricao || '',
            'Logradouro': lead.logradouro || '',
            'Número': lead.numero || '',
            'Complemento': lead.complemento || '',
            'Bairro': lead.bairro || '',
            'Município': lead.municipio || '',
            'UF': lead.uf || '',
            'CEP': lead.cep || '',
            'Telefone 1': lead.telefone1 || '',
            'Telefone 2': lead.telefone2 || '',
            'Email': lead.email || '',
            'Capital Social': lead.capital_social || '',
            'Porte': lead.porte || '',
        }));

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Minerados');

        // 2. Aba de Resumo com Metadados, Todos os Termos de Busca e Payload JSON para Repetir
        const currentPayload = (this._userHasCustomJson || this.els.jsonEditor?._userEditing) 
            ? (this.getPayloadFromEditor() || this.buildPayload()) 
            : this.buildPayload();

        const rawJsonString = JSON.stringify(currentPayload, null, 2);
        const getCheckText = (id) => document.getElementById(id)?.checked ? 'Sim' : 'Não';
        const meiVal = document.getElementById('mineMeiSelect')?.value || 'todos';
        const simplesVal = document.getElementById('mineSimplesSelect')?.value || 'todos';
        const ufVal = this.els.ufInput?.value === '_todos' ? 'Todos os Estados (Brasil Inteiro)' : (this.els.ufInput?.value || '—');

        const summaryRows = [
            ['📋 RESUMO DA MINERAÇÃO E TERMOS DE BUSCA'],
            [''],
            ['--- METADADOS DA EXECUÇÃO ---', ''],
            ['Data e Hora da Extração', new Date().toLocaleString('pt-BR')],
            ['Total Registros Encontrados na API', this.state.totalRecords || this.state.leads.length],
            ['Total CNPJs Únicos Extraídos', this.state.leads.length],
            ['Duplicados Ignorados', this.state.duplicatesSkipped || 0],
            ['Páginas Processadas', `${this.state.currentPage}/${this.state.totalPages}`],
            ['Endpoint de Pesquisa', this.state.endpoint],
            [''],
            ['--- FILTROS E TERMOS UTILIZADOS ---', ''],
            ['UF (Estado)', ufVal],
            ['Situação Cadastral', this.els.situacaoSelect?.value || '—'],
            ['Municípios', this.filters.cidades.length > 0 ? this.filters.cidades.join(', ') : '— (Nenhum)'],
            ['CNPJ Raiz', this.filters.cnpjRaiz.length > 0 ? this.filters.cnpjRaiz.join(', ') : '— (Nenhum)'],
            ['CNAEs', this.filters.cnaes.length > 0 ? this.filters.cnaes.join(', ') : '— (Nenhum)'],
            ['Naturezas Jurídicas', this.filters.naturezaJuridica.length > 0 ? this.filters.naturezaJuridica.join(', ') : '— (Nenhum)'],
            ['Termos de Busca (Palavras-Chave)', this.filters.termos.length > 0 ? this.filters.termos.join(', ') : '— (Nenhum)'],
            ['Tipo de Busca Textual', document.getElementById('searchTermTipoBusca')?.value || 'radical'],
            ['Campos de Busca Textual', `Razão Social: ${getCheckText('searchTermRazaoSocial')} | Nome Fantasia: ${getCheckText('searchTermNomeFantasia')} | Sócio: ${getCheckText('searchTermNomeSocio')}`],
            ['Filtro MEI', meiVal === 'apenas_mei' ? 'Apenas MEI' : (meiVal === 'excluir_mei' ? 'Excluir MEI' : 'Todos')],
            ['Filtro Simples Nacional', simplesVal === 'apenas_simples' ? 'Apenas Simples' : (simplesVal === 'excluir_simples' ? 'Excluir Simples' : 'Todos')],
            ['Filtros Avançados', `Somente Matriz: ${getCheckText('mf_somente_matriz')} | Somente Filial: ${getCheckText('mf_somente_filial')} | Com E-mail: ${getCheckText('mf_com_email')} | Com Telefone: ${getCheckText('mf_com_telefone')} | Excluir E-mail Contábil: ${getCheckText('mf_excluir_email_contab')} | Excluir Visualizadas: ${getCheckText('mf_excluir_empresas_visualizadas')}`],
            ['Bairros', this.filters.bairros.length > 0 ? this.filters.bairros.join(', ') : '—'],
            ['CEPs', this.filters.ceps.length > 0 ? this.filters.ceps.join(', ') : '—'],
            ['DDDs', this.filters.ddds.length > 0 ? this.filters.ddds.join(', ') : '—'],
            ['Telefones', this.filters.telefone.length > 0 ? this.filters.telefone.join(', ') : '—'],
            [''],
            ['--- PAYLOAD JSON COMPLETO DA PESQUISA (Para Copiar/Repetir) ---', ''],
            [rawJsonString]
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
        summarySheet['!cols'] = [{ wch: 35 }, { wch: 85 }];
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

        const filename = this._generateSmartFilename('xlsx');
        XLSX.writeFile(workbook, filename);
        this.log(`✅ Exportação Excel concluída: ${rows.length} CNPJs salvos em "${filename}" com aba Resumo e Payload!`, 'succ');
    },

    exportMinedJson() {
        if (this.state.leads.length === 0) {
            alert('Nenhum dado minerado para exportar.');
            return;
        }

        const currentPayload = (this._userHasCustomJson || this.els.jsonEditor?._userEditing) 
            ? (this.getPayloadFromEditor() || this.buildPayload()) 
            : this.buildPayload();

        const exportData = {
            metadata: {
                data_exportacao: new Date().toISOString(),
                total_encontrados_api: this.state.totalRecords || this.state.leads.length,
                total_extraidos: this.state.leads.length,
                duplicados_ignorados: this.state.duplicatesSkipped || 0,
                paginas_processadas: `${this.state.currentPage}/${this.state.totalPages}`,
                endpoint: this.state.endpoint
            },
            payload_pesquisa: currentPayload,
            leads: this.state.leads
        };

        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = this._generateSmartFilename('json');
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.log(`✅ Exportação JSON concluída: ${this.state.leads.length} CNPJs salvos em "${filename}"!`, 'succ');
    },

    // ========================= PRESETS DE FILTROS =========================
    savePreset() {
        const name = prompt('Nome do preset:');
        if (!name || !name.trim()) return;

        const presets = JSON.parse(localStorage.getItem('mining_presets') || '[]');
        if (presets.length >= 20) {
            alert('Limite de 20 presets atingido. Exclua um antes de salvar.');
            return;
        }

        const getCheck = (id) => document.getElementById(id)?.checked || false;
        const preset = {
            name: name.trim(),
            filters: JSON.parse(JSON.stringify(this.filters)),
            uf: this.els.ufInput?.value || '',
            situacao: this.els.situacaoSelect?.value || 'ativa',
            maisFilters: {
                somente_matriz: getCheck('mf_somente_matriz'),
                somente_filial: getCheck('mf_somente_filial'),
                com_email: getCheck('mf_com_email'),
                com_telefone: getCheck('mf_com_telefone'),
                somente_fixo: getCheck('mf_somente_fixo'),
                somente_celular: getCheck('mf_somente_celular'),
            },
            delay: parseInt(this.els.pageDelayInput?.value) || 3000,
            maxPages: parseInt(this.els.maxPagesInput?.value) || 0,
            createdAt: new Date().toISOString()
        };

        presets.push(preset);
        localStorage.setItem('mining_presets', JSON.stringify(presets));
        this.refreshPresetsDropdown();
        this.log(`💾 Preset "${name}" salvo!`, 'succ');
    },

    loadPreset(index) {
        const presets = JSON.parse(localStorage.getItem('mining_presets') || '[]');
        const p = presets[index];
        if (!p) return;

        // Aplicar filtros
        this.filters = JSON.parse(JSON.stringify(p.filters));
        if (this.els.ufInput) this.els.ufInput.value = p.uf || '';
        if (this.els.situacaoSelect) this.els.situacaoSelect.value = p.situacao || 'ativa';
        if (this.els.pageDelayInput) this.els.pageDelayInput.value = p.delay || 3000;
        if (this.els.maxPagesInput) this.els.maxPagesInput.value = p.maxPages || 0;

        // Checkboxes
        const mf = p.maisFilters || {};
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
        setCheck('mf_somente_matriz', mf.somente_matriz);
        setCheck('mf_somente_filial', mf.somente_filial);
        setCheck('mf_com_email', mf.com_email);
        setCheck('mf_com_telefone', mf.com_telefone);
        setCheck('mf_somente_fixo', mf.somente_fixo);
        setCheck('mf_somente_celular', mf.somente_celular);

        // Refresh chips e payload
        Object.keys(this._chipRefreshers).forEach(k => this._chipRefreshers[k]());
        if (this.els.jsonEditor) this.els.jsonEditor._userEditing = false;
        this.buildPayload();
        this.log(`📂 Preset "${p.name}" carregado.`, 'succ');
    },

    deletePreset(index) {
        const presets = JSON.parse(localStorage.getItem('mining_presets') || '[]');
        const name = presets[index]?.name || '';
        if (!confirm(`Excluir preset "${name}"?`)) return;
        presets.splice(index, 1);
        localStorage.setItem('mining_presets', JSON.stringify(presets));
        this.refreshPresetsDropdown();
        this.log(`🗑 Preset "${name}" excluído.`, 'info');
    },

    refreshPresetsDropdown() {
        const container = document.getElementById('minePresetsContainer');
        if (!container) return;
        const presets = JSON.parse(localStorage.getItem('mining_presets') || '[]');
        if (presets.length === 0) {
            container.innerHTML = '<span class="text-xs" style="color:#64748b">Nenhum preset salvo</span>';
            return;
        }
        container.innerHTML = presets.map((p, i) => `
            <div style="display:flex; align-items:center; gap:6px; padding:4px 0;">
                <button onclick="MiningEngine.loadPreset(${i})" class="btn-secondary" style="padding:3px 10px; font-size:0.72rem; flex:1; text-align:left;">${p.name}</button>
                <button onclick="MiningEngine.deletePreset(${i})" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:0.8rem; padding:2px;" title="Excluir">✕</button>
            </div>
        `).join('');
    },

    exportPresets() {
        const presets = localStorage.getItem('mining_presets') || '[]';
        const blob = new Blob([presets], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `presets_casadosdados_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.log('📤 Presets exportados com sucesso.', 'succ');
    },

    importPresets() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const parsed = JSON.parse(ev.target.result);
                    if (!Array.isArray(parsed)) throw new Error('Formato inválido');
                    localStorage.setItem('mining_presets', JSON.stringify(parsed));
                    this.refreshPresetsDropdown();
                    if (parsed.length > 0) {
                        this.loadPreset(0);
                    }
                    this.log('📥 Presets importados e aplicados com sucesso.', 'succ');
                } catch (err) {
                    alert('Erro ao importar presets: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    // ========================= HISTÓRICO DE MINERAÇÕES =========================
    saveToHistory() {
        const history = JSON.parse(localStorage.getItem('mining_history') || '[]');
        const entry = {
            filtros: {
                uf: this.els.ufInput?.value || '',
                situacao: this.els.situacaoSelect?.value || '',
                cidades: this.filters.cidades.slice(0, 5).join(', '),
                termos: this.filters.termos.slice(0, 5).join(', '),
            },
            totalEncontrado: this.state.totalRecords,
            totalExtraido: this.state.leads.length,
            duplicados: this.state.duplicatesSkipped,
            paginas: `${this.state.currentPage}/${this.state.totalPages}`,
            data: new Date().toLocaleString('pt-BR'),
            timestamp: Date.now()
        };
        history.unshift(entry);
        // FIFO limit 50
        if (history.length > 50) history.length = 50;
        localStorage.setItem('mining_history', JSON.stringify(history));
    },

    showHistory() {
        const history = JSON.parse(localStorage.getItem('mining_history') || '[]');
        const modal = document.getElementById('detailsModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');
        if (!modal || !title || !content) return;

        title.textContent = '📜 Histórico de Minerações';

        if (history.length === 0) {
            content.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:2rem;">Nenhuma mineração registrada.</p>';
        } else {
            let html = `<div style="overflow-x:auto;"><table><thead><tr>
                <th>Data</th><th>UF</th><th>Cidades</th><th>Termos</th><th>Encontrados</th><th>Extraídos</th><th>Páginas</th>
            </tr></thead><tbody>`;
            history.forEach(h => {
                html += `<tr>
                    <td style="white-space:nowrap">${h.data}</td>
                    <td>${h.filtros?.uf || '—'}</td>
                    <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${h.filtros?.cidades || ''}">${h.filtros?.cidades || '—'}</td>
                    <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${h.filtros?.termos || ''}">${h.filtros?.termos || '—'}</td>
                    <td style="color:#fbbf24">${(h.totalEncontrado || 0).toLocaleString()}</td>
                    <td style="color:#4ade80">${(h.totalExtraido || 0).toLocaleString()}</td>
                    <td>${h.paginas || '—'}</td>
                </tr>`;
            });
            html += `</tbody></table></div>
                <div style="text-align:center; margin-top:1rem;">
                    <button onclick="if(confirm('Limpar todo o histórico?')){localStorage.removeItem('mining_history');MiningEngine.showHistory();}" class="btn-secondary" style="font-size:0.75rem; border-color:rgba(248,113,113,0.3); color:#f87171;">🗑 Limpar Histórico</button>
                </div>`;
            content.innerHTML = html;
        }
        modal.style.display = 'flex';
    },

    // ========================= NOTIFICAÇÃO AO CONCLUIR =========================
    _notifyComplete() {
        const notify = document.getElementById('mineNotifyCheck')?.checked;
        if (!notify) return;

        const count = this.state.leads.length;
        const msg = `Mineração concluída: ${count} CNPJs extraídos.`;

        // Browser Notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⛏️ GetLista Prospecta', { body: msg, icon: '⛏️' });
        }

        // Beep sound via AudioContext
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.08;
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) { /* silent fallback */ }

        // Flash document title
        const originalTitle = document.title;
        let flash = 0;
        const interval = setInterval(() => {
            document.title = flash % 2 === 0 ? `✅ Concluído! — ${count} CNPJs` : originalTitle;
            flash++;
            if (flash >= 8) { clearInterval(interval); document.title = originalTitle; }
        }, 800);
    },

    // ========================= TABELA PRÉVIA =========================
    toggleTableMode() {
        const btn = document.getElementById('toggleTableModeBtn');
        if (!btn) return;
        
        this.state.tableExpanded = !this.state.tableExpanded;
        btn.textContent = this.state.tableExpanded ? 'Modo Padrão' : 'Modo Expandido';
        this.renderMineTable();
        this.log(`Tabela alterada para modo ${this.state.tableExpanded ? 'Expandido' : 'Padrão'}.`, 'info');
    },

    renderMineTable() {
        const body = this.els.mineTableBody;
        if (!body) return;

        const maxRows = this.state.tableExpanded ? 50 : 3;
        const leads = this.state.leads;
        const slice = leads.slice(0, maxRows);

        body.innerHTML = slice.map((lead, i) => {
            const cnpjFmt = lead.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
            const cidade = lead.municipio ? `${lead.municipio}/${lead.uf || ''}` : '—';
            return `<tr>
                <td style="font-family:monospace; font-size:0.8rem">${cnpjFmt}</td>
                <td>${lead.razao_social}</td>
                <td>${lead.nome_fantasia || '—'}</td>
                <td>${cidade}</td>
                <td>${lead.situacao || '—'}</td>
                <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${lead.cnae_descricao || ''}">${lead.cnae_descricao || '—'}</td>
            </tr>`;
        }).join('');

        const info = this.els.mineTableInfo;
        if (info) {
            if (leads.length > maxRows) {
                info.textContent = `Mostrando ${maxRows} de ${leads.length} resultados. Todos serão transferidos/exportados.`;
                info.classList.remove('hidden');
            } else {
                info.classList.add('hidden');
            }
        }
    },

    // ========================= BRIDGE → FASE 2 =========================
    transferToEnrichment() {
        if (this.state.leads.length === 0) {
            alert('Nenhum CNPJ minerado para transferir.');
            return;
        }

        // Deduplicar CNPJs
        const seen = new Set();
        const uniqueCnpjs = [];
        this.state.leads.forEach(lead => {
            const clean = String(lead.cnpj).replace(/\D/g, '').padStart(14, '0');
            if (clean.length === 14 && !seen.has(clean)) {
                seen.add(clean);
                uniqueCnpjs.push(clean);
            }
        });

        this.log(`📥 Transferindo ${uniqueCnpjs.length} CNPJs únicos para a Fase 2 (Enriquecimento)...`, 'succ');

        // Usa o handler do sistema existente
        if (typeof uiControllers !== 'undefined' && uiControllers.handleLoadedCnpjs) {
            uiControllers.handleLoadedCnpjs(uniqueCnpjs, 'mineração Casa dos Dados');
        } else {
            // Fallback direto no state
            state.cnpjList = uniqueCnpjs;
            state.results = new Array(uniqueCnpjs.length);
            state.currentIndex = 0;
            if (typeof utils !== 'undefined') {
                utils.updateStatus(`${uniqueCnpjs.length} CNPJs carregados da mineração.`);
                utils.updateProgressBar(0, uniqueCnpjs.length);
                utils.updateStats();
            }
            document.getElementById('controlsSection')?.classList.remove('hidden');
            document.getElementById('resultsSection')?.classList.remove('hidden');
        }

        // Scroll suave até o botão ▶ Iniciar Consulta Padrão (startBtn) na Etapa 3 (Enriquecimento)
        const targetBtn = document.getElementById('startBtn') || document.getElementById('controlsSection');
        if (targetBtn) {
            targetBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            try { targetBtn.focus({ preventScroll: true }); } catch (e) {}
        }
    },

    // ========================= LIMPAR RESULTADOS =========================
    clearMinedResults() {
        if (this.state.leads.length === 0) return;
        if (!confirm("Tem certeza que deseja limpar os resultados atuais? Os parâmetros de pesquisa serão mantidos.")) return;
        
        this.state.leads = [];
        this.state.currentPage = 0;
        this.state.totalPages = 0;
        this.state.totalRecords = 0;
        this.state.pageTimes = [];
        this.state.seenCnpjs.clear();
        this.state.duplicatesSkipped = 0;
        
        this.clearSession();
        this.renderMineTable();
        
        this.log('🗑 Resultados limpos. Pronto para nova pesquisa.', 'info');
        
        this.els.transferBtn?.classList.add('hidden');
        this.els.transferBtnFase2?.classList.add('hidden');
        this.els.clearResultsBtn?.classList.add('hidden');
        this.els.exportMineBtn?.classList.add('hidden');
        this.els.exportMineJsonBtn?.classList.add('hidden');
        if (this.els.mineTableInfo) this.els.mineTableInfo.classList.add('hidden');
    },

    // ========================= SEÇÃO COLAPSÁVEL =========================
    toggleSection() {
        const content = document.getElementById('miningContent');
        const icon = document.getElementById('miningToggleIcon');
        if (!content) return;
        const isHidden = content.classList.contains('hidden');
        if (isHidden) {
            content.classList.remove('hidden');
            if (icon) icon.textContent = '▼';
        } else {
            content.classList.add('hidden');
            if (icon) icon.textContent = '▶';
        }
    },

    // ========================= INIT =========================
    init() {
        // Mapear elementos DOM
        this.els = {
            apiKeyInput: document.getElementById('mineApiKey'),
            endpointInput: document.getElementById('mineEndpoint'),
            ufInput: document.getElementById('mineUf'),
            situacaoSelect: document.getElementById('mineSituacao'),
            pageDelayInput: document.getElementById('minePageDelay'),
            maxPagesInput: document.getElementById('mineMaxPages'),
            jsonEditor: document.getElementById('mineJsonEditor'),
            jsonEditorStatus: document.getElementById('mineJsonEditorStatus'),
            terminal: document.getElementById('mineTerminal'),
            progressBar: document.getElementById('mineProgressBar'),
            mineSpinner: document.getElementById('mineSpinner'),
            startMineBtn: document.getElementById('startMineBtn'),
            stopMineBtn: document.getElementById('stopMineBtn'),
            transferBtn: document.getElementById('transferMineBtn'),
            transferBtnFase2: document.getElementById('transferMineBtnFase2'),
            clearResultsBtn: document.getElementById('clearMineResultsBtn'),
            exportMineBtn: document.getElementById('exportMineBtn'),
            exportMineJsonBtn: document.getElementById('exportMineJsonBtn'),
            mineTableBody: document.getElementById('mineTableBody'),
            mineTableInfo: document.getElementById('mineTableInfo'),
            ramosSelect: document.getElementById('mineRamosSelect'),
            searchCitiesBtn: document.getElementById('mineSearchCitiesBtn'),
            citiesPanel: document.getElementById('mineCitiesPanel'),
            closeCitiesPanelBtn: document.getElementById('mineCloseCitiesPanelBtn'),
            citiesFilterInput: document.getElementById('mineCitiesFilterInput'),
            citiesList: document.getElementById('mineCitiesList'),
            cnaeApiCheck: document.getElementById('mineCnaeApiCheck'),
            cnaeSecundariaCheck: document.getElementById('mineCnaeSecundariaCheck'),
            cnaePanel: document.getElementById('mineCnaePanel'),
            closeCnaePanelBtn: document.getElementById('mineCloseCnaePanelBtn'),
            cnaeFilterInput: document.getElementById('mineCnaeFilterInput'),
            cnaeList: document.getElementById('mineCnaeList')
        };

        // Restaurar API Key do localStorage
        const savedKey = localStorage.getItem('casadosdados_api_key');
        if (savedKey && this.els.apiKeyInput) {
            this.els.apiKeyInput.value = savedKey;
        } else if (this.els.apiKeyInput) {
            fetch('chave_api_csa.txt')
                .then(r => r.text())
                .then(text => {
                    const cleanKey = text.trim();
                    if (cleanKey && cleanKey.length > 20) {
                        this.els.apiKeyInput.value = cleanKey;
                        localStorage.setItem('casadosdados_api_key', cleanKey);
                        this.log('🔑 API Key carregada do arquivo local.', 'info');
                    }
                })
                .catch(err => {
                    console.warn('Erro ao carregar chave_api_csa.txt:', err);
                });
        }

        // Inicializar chips
        this.initChips();

        // Event listeners — Botões principais
        this.els.startMineBtn?.addEventListener('click', () => this.startMining());
        this.els.stopMineBtn?.addEventListener('click', () => this.stopMining());
        this.els.transferBtn?.addEventListener('click', () => this.transferToEnrichment());
        this.els.transferBtnFase2?.addEventListener('click', () => this.transferToEnrichment());
        this.els.clearResultsBtn?.addEventListener('click', () => this.clearMinedResults());
        this.els.exportMineBtn?.addEventListener('click', () => this.exportMined());
        this.els.exportMineJsonBtn?.addEventListener('click', () => this.exportMinedJson());

        // Botão Testar API Key
        document.getElementById('testApiKeyBtn')?.addEventListener('click', () => this.testApiKey());

        // Atualizar payload e carregar cidades ao mudar UF ou Situação
        const handleUfChange = () => {
            const uf = (this.els.ufInput?.value || 'SP').toUpperCase().trim();
            this.buildPayload();
            this.loadCitiesList(uf);
        };
        this.els.ufInput?.addEventListener('change', handleUfChange);
        this.els.ufInput?.addEventListener('input', handleUfChange);
        this.els.situacaoSelect?.addEventListener('change', () => this.buildPayload());
        document.getElementById('mineMeiSelect')?.addEventListener('change', () => this.buildPayload());
        document.getElementById('mineSimplesSelect')?.addEventListener('change', () => this.buildPayload());

        // Filtros avançados — qualquer checkbox mine-filter
        document.querySelectorAll('.mine-filter-check').forEach(cb => {
            cb.addEventListener('change', () => this.buildPayload());
        });

        // Toggle da seção
        document.getElementById('miningToggleBtn')?.addEventListener('click', () => this.toggleSection());

        // Editor JSON — tracking de foco e sincronização automática bidirecional em tempo real
        if (this.els.jsonEditor) {
            this.els.jsonEditor._userEditing = false;

            this.els.jsonEditor.addEventListener('focus', () => {
                this.els.jsonEditor._userEditing = true;
            });

            // Validação e auto-sincronização bidirecional do Editor JSON -> Filtros Visuais em tempo real
            this.els.jsonEditor.addEventListener('input', () => {
                this._userHasCustomJson = true;
                const isValid = this.validateEditor();
                if (isValid) {
                    this.syncEditorToFilters({ silent: true });
                }
            });

            this.els.jsonEditor.addEventListener('blur', () => {
                this.els.jsonEditor._userEditing = false;
                if (this.validateEditor()) {
                    this.syncEditorToFilters({ silent: true });
                }
            });
        }

        // Botão "Sincronizar do Editor"
        document.getElementById('syncFromEditorBtn')?.addEventListener('click', () => {
            this._userHasCustomJson = true;
            this.syncEditorToFilters();
        });

        // Botão "Resetar Editor" — volta o editor para refletir os filtros visuais
        document.getElementById('resetEditorBtn')?.addEventListener('click', () => {
            this._userHasCustomJson = false;
            if (this.els.jsonEditor) this.els.jsonEditor._userEditing = false;
            this.buildPayload();
            this.log('Editor resetado para os filtros visuais.', 'info');
        });

        // Botões de limpar chips
        document.querySelectorAll('.mine-clear-chips-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.clearKey;
                if (key) {
                    this.clearChips(key);
                    // Atualizar checklists se visíveis
                    if (key === 'cidades') {
                        document.querySelectorAll('.mine-city-cb').forEach(cb => cb.checked = false);
                    } else if (key === 'cnaes') {
                        document.querySelectorAll('.mine-cnae-cb').forEach(cb => cb.checked = false);
                    }
                }
            });
        });

        // Botão limpar todos
        document.getElementById('clearAllChipsBtn')?.addEventListener('click', () => {
            this.clearAllChips();
            document.querySelectorAll('.mine-city-cb, .mine-cnae-cb').forEach(cb => cb.checked = false);
        });

        // Presets
        document.getElementById('savePresetBtn')?.addEventListener('click', () => this.savePreset());
        document.getElementById('exportPresetBtn')?.addEventListener('click', () => this.exportPresets());
        document.getElementById('importPresetBtn')?.addEventListener('click', () => this.importPresets());
        this.refreshPresetsDropdown();

        // Histórico
        document.getElementById('showHistoryBtn')?.addEventListener('click', () => this.showHistory());

        // Toggle Table Mode
        document.getElementById('toggleTableModeBtn')?.addEventListener('click', () => this.toggleTableMode());

        // Notificação — pedir permissão
        if ('Notification' in window && Notification.permission === 'default') {
            document.getElementById('mineNotifyCheck')?.addEventListener('change', (e) => {
                if (e.target.checked) Notification.requestPermission();
            });
        }

        // === EVENT LISTENERS DAS NOVAS APIS (RAMOS, CIDADES, CNAES) ===

        // Ramos Select
        // ========================= PRESETS DE RAMOS DE ATUAÇÃO =========================
        // Atualizado com Máxima ABRANGÊNCIA ("Arrastão") e Filtros Linguísticos Anti-Ruído
        const RAMOS_PRESETS = {
            // 1. Indústria e Atacado de Gelados (Foco em insumos pesados, gorduras, bases e liga)
            gelados_atacado: {
                termos: [
                    "SORVETE", "SORVET", "GELATO", "GELAT", "ICE CREAM", "GELADOS COMESTIVEIS",
                    "ACAI", "AÇAI", "DISTRIBUIDORA DE SORVETE", "FABRICA DE SORVETE", 
                    "INDÚSTRIA DE SORVETE", "INDUSTRIA DE SORVETE", "ATACADO DE ACAI", 
                    "ATACADO DE AÇAI", "DISTRIBUIDORA DE ACAI", "DISTRIBUIDORA DE AÇAI",
                    "FABRICA DE ACAI", "FABRICA DE AÇAI"
                ]
            },

            // 2. Varejo, Gelaterias, Açaíterias e Sobremesas Geladas (Ponto de venda e balcão)
            gelados_varejo: {
                termos: [
                    "ACAI", "AÇAI", "SORVETE", "SORVET", "GELATO", "GELAT", "ICE CREAM", 
                    "GELADOS COMESTIVEIS", "SORBET", "SHERBET", "GRANITA", "RASPADINHA", 
                    "PICOLE", "PICOLÉ", "PICOLES", "PICOLÉS", "PALETAS", "PALETERIA", 
                    "GELADINHO", "GELINHO", "JUJU", "SACOLE", "SACOLÉ", "DINDIN", "DIN DIN", 
                    "CHUPCHUP", "CHUP CHUP", "CHUP-CHUP", "MILKSHAKE", "MILK SHAKE", "SHAKE", 
                    "FROZEN", "FROZEN YOGURT", "SMOOTHIE", "CASQUINHA", "CASCAO", "CASCÃO", "SUNDAE"
                ]
            },

            // 3. Gelados Total (Tudo do setor de sorvetes, açaí, gelatos, picolés e geladinhos)
            gelados_total: {
                termos: [
                    "ACAI", "AÇAI", "SORVETE", "SORVET", "GELATO", "GELAT", "ICE CREAM", 
                    "GELADOS COMESTIVEIS", "SORBET", "SHERBET", "GRANITA", "RASPADINHA", 
                    "PICOLE", "PICOLÉ", "PICOLES", "PICOLÉS", "PALETAS", "PALETERIA", 
                    "GELADINHO", "GELINHO", "JUJU", "SACOLE", "SACOLÉ", "DINDIN", "DIN DIN", 
                    "CHUPCHUP", "CHUP CHUP", "CHUP-CHUP", "MILKSHAKE", "MILK SHAKE", "SHAKE", 
                    "FROZEN", "FROZEN YOGURT", "SMOOTHIE", "CASQUINHA", "CASCAO", "CASCÃO", "SUNDAE",
                    "DISTRIBUIDORA DE SORVETE", "FABRICA DE SORVETE", "INDÚSTRIA DE SORVETE", 
                    "ATACADO DE ACAI", "DISTRIBUIDORA DE ACAI", "FABRICA DE ACAI"
                ]
            },

            // 4. Panificação - Sniper (Industrial, Atacado, Moinhos e Fábricas)
            panificacao_atacado: {
                termos: [
                    "PANIFICADORA", "PANIFICAÇÃO", "PANIFICACAO", "MOINHO", "MOINHO DE FARINHA", 
                    "FABRICA DE PAES", "FÁBRICA DE PÃES", "DISTRIBUIDORA DE PAES", "DISTRIBUIDORA DE PÃES", 
                    "DISTRIBUIDORA DE DOCES", "CONFEITARIA ATACADISTA", "INDUSTRIA DE ALIMENTOS", 
                    "INDÚSTRIA DE ALIMENTOS", "MASSAS ALIMENTICIAS", "MASSAS ALIMENTÍCIAS"
                ]
            },

            // 5. Panificação - Arrastão (Padarias de Bairro, Confeiteiras, Docerias e Tortas)
            panificacao_varejo: {
                termos: [
                    "PADARIA", "PANIFICADORA", "CONFEITARIA", "DOCERIA", "DOCES", "PAES", "PÃES", 
                    "BOLO", "BOLOS", "PATISSERIE", "PATISSERIA", "CHURROS", "CHURRERIA", 
                    "DOCES ARTESANAIS", "BOUTIQUE DE PAES", "BOUTIQUE DE PÃES", "BREAD", "CAKE", 
                    "CAKES", "SONHO", "SONHERIA", "TORTA", "TORTAS"
                ]
            },

            // 6. Panificação Total (Indústria + Varejo + Padarias + Confeiteiras + Atacado)
            panificacao_total: {
                termos: [
                    "PADARIA", "PANIFICADORA", "PANIFICAÇÃO", "PANIFICACAO", "CONFEITARIA", "DOCERIA", 
                    "DOCES", "PAES", "PÃES", "BOLO", "BOLOS", "PATISSERIE", "PATISSERIA", "CHURROS", 
                    "CHURRERIA", "DOCES ARTESANAIS", "BOUTIQUE DE PAES", "BREAD", "CAKE", "CAKES", 
                    "SONHO", "SONHERIA", "TORTA", "TORTAS", "MOINHO", "FABRICA DE PAES", 
                    "DISTRIBUIDORA DE PAES", "DISTRIBUIDORA DE DOCES", "CONFEITARIA ATACADISTA"
                ]
            },

            // 7. Revenda - Master (Supermercados, Mercados, Atacarejos, Mercearias e Empórios)
            revenda_supermercados: {
                termos: [
                    "SUPERMERCADO", "SUPERMERCADOS", "MERCADO", "MERCADOS", "MINIMERCADO", 
                    "MINIMERCADOS", "ATACAREJO", "MERCEARIA", "EMPORIO", "EMPÓRIO", "ARMAZEM", 
                    "ARMAZÉM", "HIPERMERCADO", "DISTRIBUIDORA DE ALIMENTOS", "MERCADINHO", "EXPRESS"
                ]
            },

            // 8. Lazer / Conveniência - Sniper (Postos, Conveniências, Buffets, Lanchonetes, Cafés)
            revenda_conveniencia: {
                termos: [
                    "CONVENIENCIA", "CONVENIÊNCIA", "POSTO DE COMBUSTIVEL", "POSTO DE COMBUSTÍVEL", 
                    "BUFFET", "BUFFET INFANTIL", "PARQUE", "LANCHONETE", "CANTINA", "FAST FOOD", 
                    "CAFETERIA", "CAFETERIAS", "HAMBURGUERIA", "CREPERIA", "PASTELARIA", "PIZZARIA", 
                    "ARENA", "CLUBE"
                ]
            },

            // 9. A Máquina Total (Dominação Geral - Combinação Completa sem Colisões de Ruído)
            maquina_total: {
                termos: [
                    "SORVETE", "SORVET", "GELATO", "GELAT", "ICE CREAM", "GELADOS COMESTIVEIS", 
                    "ACAI", "AÇAI", "PICOLE", "PICOLÉ", "PICOLES", "PICOLÉS", "PALETAS", "PALETERIA", 
                    "MILKSHAKE", "MILK SHAKE", "SHAKE", "FROZEN", "FROZEN YOGURT", "PADARIA", 
                    "PANIFICADORA", "PANIFICAÇÃO", "CONFEITARIA", "DOCERIA", "PAES", "PÃES", 
                    "BOLO", "BOLOS", "CHURROS", "DOCES", "SUPERMERCADO", "MERCADO", "MINIMERCADO", 
                    "ATACAREJO", "MERCEARIA", "EMPORIO", "EMPÓRIO", "CONVENIENCIA", "CONVENIÊNCIA", 
                    "BUFFET", "LANCHONETE", "CAFETERIA", "HAMBURGUERIA"
                ]
            }
        };

        this.els.ramosSelect?.addEventListener('change', (e) => {
            const val = e.target.value;
            if (!val) return;

            const tipoSel = document.getElementById('searchTermTipoBusca');
            const rsCheck = document.getElementById('searchTermRazaoSocial');
            const nfCheck = document.getElementById('searchTermNomeFantasia');
            const nsCheck = document.getElementById('searchTermNomeSocio');

            if (val === 'socio_busca_exata') {
                if (tipoSel) tipoSel.value = 'exata';
                if (rsCheck) rsCheck.checked = true;
                if (nfCheck) nfCheck.checked = true;
                if (nsCheck) nsCheck.checked = true;

                this.buildPayload();
                this.log('👨‍💼 Modo de Busca em Sócios ativado: tipo_busca=exata, razao_social=true, nome_fantasia=true, nome_socio=true.', 'succ');
                return;
            }

            if (!RAMOS_PRESETS[val]) return;
            const preset = RAMOS_PRESETS[val];
            this.filters.termos = [...preset.termos];

            // Padrão Empresas ao escolher qualquer ramo normal
            if (tipoSel) tipoSel.value = 'radical';
            if (rsCheck) rsCheck.checked = true;
            if (nfCheck) nfCheck.checked = true;
            if (nsCheck) nsCheck.checked = false;

            if (this._chipRefreshers.termos) this._chipRefreshers.termos();
            this.buildPayload();
            this.log(`🏭 Ramo de Atividade carregado: ${val}. Termos atualizados, CNAEs mantidos opcionais.`, 'succ');
        });

        // Listeners dos controles de busca textual
        ['searchTermTipoBusca', 'searchTermRazaoSocial', 'searchTermNomeFantasia', 'searchTermNomeSocio'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.buildPayload();
            });
        });

        // Cidades Panel
        this.els.searchCitiesBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            const panel = this.els.citiesPanel;
            if (panel) {
                const isHidden = panel.classList.contains('hidden');
                if (isHidden) {
                    panel.classList.remove('hidden');
                    this.loadCitiesList();
                } else {
                    panel.classList.add('hidden');
                }
            }
        });

        this.els.closeCitiesPanelBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.els.citiesPanel?.classList.add('hidden');
        });

        this.els.citiesFilterInput?.addEventListener('input', (e) => {
            this.filterCitiesList(e.target.value);
        });

        // CNAE API Search Toggle
        this.els.cnaeApiCheck?.addEventListener('change', (e) => {
            const panel = this.els.cnaePanel;
            if (panel) {
                if (e.target.checked) {
                    panel.classList.remove('hidden');
                    this.loadCnaeDatabase();
                    this.searchCnaes(this.els.cnaeFilterInput?.value || '');
                } else {
                    panel.classList.add('hidden');
                }
            }
        });

        this.els.cnaeSecundariaCheck?.addEventListener('change', () => {
            this.buildPayload();
        });

        this.els.closeCnaePanelBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.els.cnaePanel?.classList.add('hidden');
            if (this.els.cnaeApiCheck) this.els.cnaeApiCheck.checked = false;
        });

        // Debounce para busca de CNAE
        let cnaeSearchTimeout;
        this.els.cnaeFilterInput?.addEventListener('input', (e) => {
            clearTimeout(cnaeSearchTimeout);
            cnaeSearchTimeout = setTimeout(() => {
                this.searchCnaes(e.target.value);
            }, 300);
        });

        // Inicializar autocomplete de municípios, CNAEs e Natureza Jurídica e pré-carregar cidades da UF padrão
        this.initCitiesAutocomplete();
        this.initCnaesAutocomplete();
        this.initNatjurAutocomplete();
        this.loadCitiesList(this.els.ufInput?.value || 'SP');

        // Build inicial do payload
        this.buildPayload();

        // Verificar sessão pausada
        this.checkSession();

        console.log('%c⛏️ Mining Engine carregado!', 'background:#f59e0b; color:#000; padding:4px 8px; border-radius:4px; font-weight:bold');
    },

    // ========================= MÉTODOS AUXILIARES NOVOS (CIDADES E CNAES) =========================
    async loadCitiesList(ufParam) {
        const uf = (ufParam || this.els.ufInput?.value || 'SP').toUpperCase().trim();
        const listContainer = this.els.citiesList;
        const ufLabel = document.getElementById('mineCitiesUfLabel');
        if (ufLabel) ufLabel.textContent = uf === '_TODOS' ? 'Brasil Inteiro' : uf;

        if (uf === '_TODOS' || !uf) {
            if (listContainer) {
                listContainer.innerHTML = '<span class="text-xs text-gray-400 p-1">🌐 Todos os Estados selecionados (sem filtro por UF).</span>';
            }
            this._allUfCities = [];
            return [];
        }

        // Retorna do cache de UF se já estiver carregado
        if (this._ufCitiesCache[uf] && this._ufCitiesCache[uf].length > 0) {
            this._allUfCities = this._ufCitiesCache[uf];
            if (listContainer) this.renderCitiesChecklist(this._allUfCities);
            return this._allUfCities;
        }

        if (listContainer) {
            listContainer.innerHTML = '<span class="text-xs text-blue-500 p-1">⏳ Carregando municípios...</span>';
        }

        try {
            let cities = [];
            // 1. Tenta a API oficial da Casa dos Dados primeiro (retorna cidades exatamente como no backend, sem acentos)
            try {
                const res = await fetch(`https://api.casadosdados.com.br/v4/public/cnpj/busca/municipio/${uf}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        cities = data.map(c => typeof c === 'object' ? (c.municipio || c.nome || c.name || '') : String(c));
                    } else if (data && typeof data === 'object') {
                        const list = data.data || data.municipios || data.results || [];
                        cities = list.map(c => typeof c === 'object' ? (c.municipio || c.nome || c.name || '') : String(c));
                    }
                }
            } catch (errCsa) {
                console.warn('Erro ao carregar via Casa dos Dados, tentando IBGE:', errCsa);
            }

            // 2. Fallback para IBGE API caso Casa dos Dados falhe
            if (cities.length === 0) {
                const ibgeRes = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
                if (ibgeRes.ok) {
                    const ibgeData = await ibgeRes.json();
                    if (Array.isArray(ibgeData) && ibgeData.length > 0) {
                        cities = ibgeData.map(item => item.nome || '');
                    }
                }
            }

            // Garante normalização (maiúsculas e sem acento no formato Casa dos Dados)
            cities = Array.from(new Set(cities.filter(Boolean).map(c => this._normalizeString(c)))).sort();
            this._ufCitiesCache[uf] = cities;
            this._allUfCities = cities;

            if (listContainer) this.renderCitiesChecklist(cities);
            return cities;
        } catch (e) {
            if (listContainer) {
                listContainer.innerHTML = `<span class="text-xs text-red-500 p-1">❌ Erro: ${e.message}</span>`;
            }
            console.error('Erro ao carregar cidades:', e);
            return [];
        }
    },

    // Sistema de sugestão/autocomplete direto no campo de Municípios
    initCitiesAutocomplete() {
        const self = this;
        const input = document.querySelector('.mine-chip-input[data-key="cidades"]');
        const dropdown = document.getElementById('mineCitiesAutocompleteList');
        if (!input || !dropdown) return;

        let activeIndex = -1;

        const hideDropdown = () => {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
            activeIndex = -1;
        };

        const addCityChip = (cityName) => {
            const currentUf = (self.els.ufInput?.value || 'SP').toUpperCase().trim();
            const officialName = self.getOfficialCityName(cityName, currentUf);
            if (officialName && !self.filters.cidades.includes(officialName)) {
                self.filters.cidades.push(officialName);
                if (self._chipRefreshers.cidades) self._chipRefreshers.cidades();
                self.buildPayload();
            }
            input.value = '';
            hideDropdown();
            input.focus();
        };

        input.addEventListener('input', async () => {
            const val = input.value;
            const currentUf = (self.els.ufInput?.value || 'SP').toUpperCase().trim();

            // Ao digitar vírgula ou colar com quebra de linha, converte os termos anteriores
            if (val.includes(',') || val.includes('\n') || val.includes('\r') || val.includes(';')) {
                const parts = val.split(/[,;\r\n]+/);
                const completed = parts.slice(0, -1).join(',');
                const remaining = parts[parts.length - 1];

                if (completed.trim()) {
                    const added = processValues(completed);
                    if (added > 0 && self._chipRefreshers.cidades) self._chipRefreshers.cidades();
                    self.buildPayload();
                }
                input.value = remaining.trimStart();
                if (!input.value.trim()) {
                    hideDropdown();
                    return;
                }
            }

            const query = input.value.trim();
            if (query.length < 1) {
                hideDropdown();
                return;
            }

            let cities = self._ufCitiesCache[currentUf];
            if (!cities || cities.length === 0) {
                cities = await self.loadCitiesList(currentUf);
            }

            if (!cities || cities.length === 0) {
                hideDropdown();
                return;
            }

            const normQuery = self._normalizeString(query);
            const matches = cities.filter(c => {
                if (self.filters.cidades.includes(c)) return false;
                return self._normalizeString(c).includes(normQuery);
            }).slice(0, 12);

            if (matches.length === 0) {
                hideDropdown();
                return;
            }

            dropdown.innerHTML = matches.map((city, idx) => `
                <div class="mine-autocomplete-item ${idx === activeIndex ? 'active' : ''}" data-city="${city}">
                    <span>${city}</span>
                    <span class="uf-tag">${currentUf}</span>
                </div>
            `).join('');

            dropdown.classList.remove('hidden');

            dropdown.querySelectorAll('.mine-autocomplete-item').forEach(item => {
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    addCityChip(item.dataset.city);
                });
            });
        });

        input.addEventListener('keydown', (e) => {
            if (dropdown.classList.contains('hidden')) return;
            const items = dropdown.querySelectorAll('.mine-autocomplete-item');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                items.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
                items[activeIndex]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                items.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
                items[activeIndex]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (activeIndex >= 0 && items[activeIndex]) {
                    e.preventDefault();
                    addCityChip(items[activeIndex].dataset.city);
                } else if (items.length === 1) {
                    e.preventDefault();
                    addCityChip(items[0].dataset.city);
                }
            } else if (e.key === 'Escape') {
                hideDropdown();
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(hideDropdown, 200);
        });
    },

    initCnaesAutocomplete() {
        const self = this;
        const input = document.querySelector('.mine-chip-input[data-key="cnaes"]');
        const dropdown = document.getElementById('mineCnaeAutocompleteList');
        if (!input || !dropdown) return;

        let activeIndex = -1;
        let searchDebounce = null;

        const hideDropdown = () => {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
            activeIndex = -1;
        };

        const addCnaeChip = (cnaeCode) => {
            const cleanCode = String(cnaeCode).replace(/\D/g, '');
            if (cleanCode && !self.filters.cnaes.includes(cleanCode)) {
                self.filters.cnaes.push(cleanCode);
                if (self._chipRefreshers.cnaes) self._chipRefreshers.cnaes();
                self.buildPayload();
            }
            input.value = '';
            hideDropdown();
            input.focus();
        };

        input.addEventListener('input', () => {
            const val = input.value;

            // Ao digitar vírgula ou colar com quebra de linha, processa CNAEs inseridos
            if (val.includes(',') || val.includes('\n') || val.includes('\r') || val.includes(';')) {
                const parts = val.split(/[,;\r\n]+/);
                const completed = parts.slice(0, -1).join(',');
                const remaining = parts[parts.length - 1];

                if (completed.trim()) {
                    if (self._chipProcessors && self._chipProcessors.cnaes) {
                        self._chipProcessors.cnaes(completed);
                    }
                    if (self._chipRefreshers.cnaes) self._chipRefreshers.cnaes();
                    self.buildPayload();
                }
                input.value = remaining.trimStart();
                if (!input.value.trim()) {
                    hideDropdown();
                    return;
                }
            }

            const query = input.value.trim();
            if (query.length < 1) {
                hideDropdown();
                return;
            }

            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(async () => {
                const suggestions = await self._findCnaeSuggestions(query);
                const filtered = suggestions.filter(c => !self.filters.cnaes.includes(c.code)).slice(0, 12);

                if (filtered.length === 0) {
                    hideDropdown();
                    return;
                }

                dropdown.innerHTML = filtered.map((c, idx) => `
                    <div class="mine-autocomplete-item ${idx === activeIndex ? 'active' : ''}" data-code="${c.code}">
                        <span><strong>${c.code}</strong> - ${c.name}</span>
                    </div>
                `).join('');

                dropdown.classList.remove('hidden');

                dropdown.querySelectorAll('.mine-autocomplete-item').forEach(item => {
                    item.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        addCnaeChip(item.dataset.code);
                    });
                });
            }, 250);
        });

        input.addEventListener('keydown', (e) => {
            if (dropdown.classList.contains('hidden')) return;
            const items = dropdown.querySelectorAll('.mine-autocomplete-item');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                items.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
                items[activeIndex]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                items.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
                items[activeIndex]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (activeIndex >= 0 && items[activeIndex]) {
                    e.preventDefault();
                    addCnaeChip(items[activeIndex].dataset.code);
                } else if (items.length === 1) {
                    e.preventDefault();
                    addCnaeChip(items[0].dataset.code);
                }
            } else if (e.key === 'Escape') {
                hideDropdown();
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(hideDropdown, 200);
        });
    },

    initNatjurAutocomplete() {
        const self = this;
        const input = document.querySelector('.mine-chip-input[data-key="naturezaJuridica"]');
        const dropdown = document.getElementById('mineNatjurAutocompleteList');
        if (!input || !dropdown) return;

        let activeIndex = -1;
        let searchDebounce = null;

        const hideDropdown = () => {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
            activeIndex = -1;
        };

        const addNatjurChip = (code) => {
            const cleanCode = String(code).replace(/\D/g, '');
            if (cleanCode && !self.filters.naturezaJuridica.includes(cleanCode)) {
                self.filters.naturezaJuridica.push(cleanCode);
                if (self._chipRefreshers.naturezaJuridica) self._chipRefreshers.naturezaJuridica();
                self.buildPayload();
            }
            input.value = '';
            hideDropdown();
            input.focus();
        };

        input.addEventListener('input', () => {
            const val = input.value;

            if (val.includes(',') || val.includes('\n') || val.includes('\r') || val.includes(';')) {
                const parts = val.split(/[,;\r\n]+/);
                const completed = parts.slice(0, -1).join(',');
                const remaining = parts[parts.length - 1];

                if (completed.trim()) {
                    if (self._chipProcessors && self._chipProcessors.naturezaJuridica) {
                        self._chipProcessors.naturezaJuridica(completed);
                    }
                    if (self._chipRefreshers.naturezaJuridica) self._chipRefreshers.naturezaJuridica();
                    self.buildPayload();
                }
                input.value = remaining.trimStart();
                if (!input.value.trim()) {
                    hideDropdown();
                    return;
                }
            }

            const query = input.value.trim();
            if (query.length < 1) {
                hideDropdown();
                return;
            }

            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(async () => {
                const suggestions = await self._findNatjurSuggestions(query);
                const filtered = suggestions.filter(n => !self.filters.naturezaJuridica.includes(n.code)).slice(0, 12);

                if (filtered.length === 0) {
                    hideDropdown();
                    return;
                }

                dropdown.innerHTML = filtered.map((n, idx) => `
                    <div class="mine-autocomplete-item ${idx === activeIndex ? 'active' : ''}" data-code="${n.code}">
                        <span><strong>${n.code}</strong> - ${n.name}</span>
                    </div>
                `).join('');

                dropdown.classList.remove('hidden');

                dropdown.querySelectorAll('.mine-autocomplete-item').forEach(item => {
                    item.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        addNatjurChip(item.dataset.code);
                    });
                });
            }, 120);
        });

        input.addEventListener('keydown', (e) => {
            if (dropdown.classList.contains('hidden')) return;
            const items = dropdown.querySelectorAll('.mine-autocomplete-item');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                items.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
                items[activeIndex]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                items.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
                items[activeIndex]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (activeIndex >= 0 && items[activeIndex]) {
                    e.preventDefault();
                    addNatjurChip(items[activeIndex].dataset.code);
                } else if (items.length === 1) {
                    e.preventDefault();
                    addNatjurChip(items[0].dataset.code);
                }
            } else if (e.key === 'Escape') {
                hideDropdown();
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(hideDropdown, 200);
        });
    },

    renderCitiesChecklist(cities) {
        const listContainer = this.els.citiesList;
        if (!listContainer) return;
        
        if (cities.length === 0) {
            listContainer.innerHTML = '<span class="text-xs text-gray-500 p-1">Nenhum município.</span>';
            return;
        }

        listContainer.innerHTML = cities.map(city => {
            const checked = this.filters.cidades.includes(city) ? 'checked' : '';
            return `
                <label class="flex items-center gap-2 cursor-pointer p-1 hover-row rounded transition-colors" style="user-select:none; color:var(--color-text); margin:0;">
                    <input type="checkbox" value="${city}" class="mine-city-cb" ${checked} style="accent-color:#6366f1; width:14px; height:14px;">
                    <span>${city}</span>
                </label>
            `;
        }).join('');

        // Listeners nos checkboxes
        listContainer.querySelectorAll('.mine-city-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const city = e.target.value;
                if (e.target.checked) {
                    if (!this.filters.cidades.includes(city)) {
                        this.filters.cidades.push(city);
                    }
                } else {
                    this.filters.cidades = this.filters.cidades.filter(c => c !== city);
                }
                if (this._chipRefreshers.cidades) this._chipRefreshers.cidades();
                this.buildPayload();
            });
        });
    },

    filterCitiesList(query) {
        if (!this._allUfCities) return;
        const q = query.toUpperCase().trim();
        const filtered = this._allUfCities.filter(c => c.includes(q));
        this.renderCitiesChecklist(filtered);
    },

    async loadCnaeDatabase() {
        if (this._localCnaeDb) return;
        // Evita erro de CORS quando acessado direto por protocolo file://
        if (window.location.protocol === 'file:') {
            return;
        }
        try {
            const res = await fetch('cnae.json');
            if (res.ok) {
                this._localCnaeDb = await res.json();
                console.log(`CNAE database carregado localmente: ${this._localCnaeDb.length} itens`);
            }
        } catch (e) {
            // Silencioso em caso de restrição local
        }
    },

    async searchCnaes(query) {
        const listContainer = this.els.cnaeList;
        if (!listContainer) return;

        const q = query.trim().toUpperCase();
        if (!q) {
            listContainer.innerHTML = '<span class="text-xs text-gray-500 p-1">Digite algo para pesquisar...</span>';
            return;
        }

        let rawList = [];
        try {
            const res = await fetch(`https://api.casadosdados.com.br/v4/public/cnpj/busca/cnae?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    rawList = data;
                } else if (data && typeof data === 'object') {
                    rawList = data.data || data.results || data.cnaes || [];
                }
            }
        } catch (e) {
            console.warn('API de busca de CNAE offline. Usando fallback local:', e);
        }

        let results = this._filterCnaeList(rawList, q);

        if (results.length === 0 && this._localCnaeDb) {
            results = this._filterCnaeList(this._localCnaeDb, q);
        }

        results = results.slice(0, 50);
        this.renderCnaeChecklist(results);
    },

    renderCnaeChecklist(cnaes) {
        const listContainer = this.els.cnaeList;
        if (!listContainer) return;

        if (cnaes.length === 0) {
            listContainer.innerHTML = '<span class="text-xs text-gray-500 p-1">Nenhum CNAE encontrado.</span>';
            return;
        }

        listContainer.innerHTML = cnaes.map(c => {
            const checked = this.filters.cnaes.includes(c.code) ? 'checked' : '';
            return `
                <label class="flex items-center gap-2 cursor-pointer p-1 hover-row rounded transition-colors" style="user-select:none; color:var(--color-text); margin:0;">
                    <input type="checkbox" value="${c.code}" class="mine-cnae-cb" ${checked} style="accent-color:#6366f1; width:14px; height:14px;">
                    <span><strong>${c.code}</strong> - ${c.name}</span>
                </label>
            `;
        }).join('');

        listContainer.querySelectorAll('.mine-cnae-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const code = e.target.value;
                if (e.target.checked) {
                    if (!this.filters.cnaes.includes(code)) {
                        this.filters.cnaes.push(code);
                    }
                } else {
                    this.filters.cnaes = this.filters.cnaes.filter(c => c !== code);
                }
                if (this._chipRefreshers.cnaes) this._chipRefreshers.cnaes();
                this.buildPayload();
            });
        });
    }
};

// Auto-init quando DOM pronto (será chamado pelo DOMContentLoaded junto com init())
// O init será invocado pelo ui-enhancement-script.js para garantir ordem
