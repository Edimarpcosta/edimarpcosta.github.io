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
        seenCnpjs: new Set(), // deduplicação em tempo real
        duplicatesSkipped: 0,
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
        ddds: []
    },

    // Mapa de refresh callbacks por key (preenchido no initChips)
    _chipRefreshers: {},

    // ===== REFERÊNCIAS DOM (preenchido no init) =====
    els: {},

    // ========================= PAYLOAD BUILDER =========================
    buildPayload() {
        const uf = (this.els.ufInput?.value || '').toUpperCase().trim();
        const situacao = this.els.situacaoSelect?.value || 'ativa';

        // Checkboxes de filtros avançados
        const getCheck = (id) => document.getElementById(id)?.checked || false;

        const payload = {
            "cnpj": [],
            "cnpj_raiz": [],
            "situacao_cadastral": situacao === '_todas' ? [] : [situacao],
            "codigo_atividade_principal": this.filters.cnaes,
            "codigo_natureza_juridica": this.filters.naturezaJuridica,
            "incluir_atividade_secundaria": false,
            "uf": uf ? [uf] : [],
            "municipio": this.filters.cidades,
            "bairro": this.filters.bairros,
            "cep": this.filters.ceps,
            "ddd": this.filters.ddds,
            "telefone": [],
            "data_abertura": this._getDataAberturaFilter(),
            "capital_social": this._getCapitalSocialFilter(),
            "mei": { "optante": false, "excluir_optante": false },
            "simples": { "optante": false, "excluir_optante": false },
            "mais_filtros": {
                "somente_matriz": getCheck('mf_somente_matriz'),
                "somente_filial": getCheck('mf_somente_filial'),
                "com_email": getCheck('mf_com_email'),
                "com_telefone": getCheck('mf_com_telefone'),
                "somente_fixo": getCheck('mf_somente_fixo'),
                "somente_celular": getCheck('mf_somente_celular'),
                "excluir_empresas_visualizadas": false,
                "excluir_email_contab": false
            },
            "limite": 100,
            "pagina": 1,
            "busca_textual": this.filters.termos.length > 0 ? [{
                "texto": this.filters.termos,
                "tipo_busca": "radical",
                "razao_social": true,
                "nome_fantasia": true,
                "nome_socio": true
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
    syncEditorToFilters() {
        const payload = this.getPayloadFromEditor();
        if (!payload) {
            alert('JSON inválido! Corrija a sintaxe antes de sincronizar.');
            return;
        }

        // UF
        if (this.els.ufInput && payload.uf && payload.uf.length > 0) {
            this.els.ufInput.value = payload.uf[0];
        }

        // Situação
        if (this.els.situacaoSelect) {
            if (!payload.situacao_cadastral || payload.situacao_cadastral.length === 0) {
                this.els.situacaoSelect.value = '_todas';
            } else {
                this.els.situacaoSelect.value = payload.situacao_cadastral[0];
            }
        }

        // Chips
        this.filters.cidades = payload.municipio || [];
        this.filters.cnaes = payload.codigo_atividade_principal || [];
        this.filters.naturezaJuridica = payload.codigo_natureza_juridica || [];
        this.filters.bairros = payload.bairro || [];
        this.filters.ceps = payload.cep || [];
        this.filters.ddds = payload.ddd || [];

        // Termos de busca
        if (payload.busca_textual && payload.busca_textual.length > 0 && payload.busca_textual[0].texto) {
            this.filters.termos = payload.busca_textual[0].texto.map(t => t.toUpperCase());
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

        this.log('✓ Filtros visuais sincronizados do JSON editado.', 'succ');
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

            // Ao pressionar Enter: aceita valor único OU lista com vírgula
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const raw = input.value.trim();
                    if (!raw) return;

                    // Splittar por vírgula, ponto-e-vírgula ou pipe
                    const parts = raw.split(/[,;|]+/).map(p => p.trim().toUpperCase()).filter(p => p.length > 0);

                    let added = 0;
                    parts.forEach(v => {
                        if (!self.filters[key].includes(v)) {
                            self.filters[key].push(v);
                            added++;
                        }
                    });

                    input.value = '';
                    if (added > 0) refresh();
                }
            });

            // Suporte a colar (Ctrl+V) com split automático
            input.addEventListener('paste', e => {
                // Delay para o conteúdo colado estar no input
                setTimeout(() => {
                    const raw = input.value.trim();
                    if (!raw) return;

                    const parts = raw.split(/[,;|]+/).map(p => p.trim().toUpperCase()).filter(p => p.length > 0);

                    // Se colou mais de 1 item, processa automaticamente
                    if (parts.length > 1) {
                        let added = 0;
                        parts.forEach(v => {
                            if (!self.filters[key].includes(v)) {
                                self.filters[key].push(v);
                                added++;
                            }
                        });
                        input.value = '';
                        if (added > 0) refresh();
                    }
                    // Se colou 1 item só, deixa o user dar Enter
                }, 50);
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

        this.clearLog();
        this.log('=== FASE 1: INICIANDO MINERAÇÃO ===', 'info');
        this.log(`Endpoint: ${this.state.endpoint}`, 'info');
        if (this.state.maxPages > 0) this.log(`⚡ Limite: ${this.state.maxPages} páginas`, 'info');

        // UI
        this.els.startMineBtn?.classList.add('hidden');
        this.els.stopMineBtn?.classList.remove('hidden');
        this.els.transferBtn?.classList.add('hidden');
        this.els.exportMineBtn?.classList.add('hidden');
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
        const headers = {
            "api-key": this.state.apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://portal.casadosdados.com.br",
            "Referer": "https://portal.casadosdados.com.br/"
        };
        const miningStartTime = this.state.miningStartTime;

        try {
            let pag = this.state.currentPage + 1;
            let totalPag = this.state.totalPages || pag; // fallback

            while (this.state.running && pag <= totalPag) {
                // Max pages limit
                if (this.state.maxPages > 0 && pag > this.state.maxPages) {
                    this.log(`⚡ Limite de ${this.state.maxPages} páginas atingido. Extração parcial.`, 'warn');
                    break;
                }

                // Se o user editou o JSON manualmente, usar o do editor
                let payload;
                if (this.els.jsonEditor && this.els.jsonEditor._userEditing) {
                    payload = this.getPayloadFromEditor();
                    if (!payload) {
                        this.log('[ERRO] JSON do editor inválido. Usando filtros visuais.', 'err');
                        payload = this.buildPayload();
                    }
                } else {
                    payload = this.buildPayload();
                }
                payload.pagina = pag;

                this.log(`→ Requisitando página ${pag}...`, 'info');

                // ===== RETRY COM BACKOFF EXPONENCIAL =====
                let res = null;
                const MAX_RETRIES = 5;
                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                    const pageStart = Date.now();
                    res = await fetch(this.state.endpoint, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(payload)
                    });
                    
                    if (res.status === 429) {
                        const baseDelay = 3000 * Math.pow(2, attempt - 1); // 3s, 6s, 12s, 24s, 48s
                        const jitter = baseDelay * 0.2 * (Math.random() - 0.5); // ±10% jitter
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
                    break; // Sucesso
                }

                if (!res || !res.ok) {
                    this.log(`❌ Falha definitiva na página ${pag} após ${MAX_RETRIES} tentativas.`, 'err');
                    break;
                }

                const data = await res.json();
                
                if (pag === 1 || this.state.totalPages === 0) {
                    this.state.totalRecords = data.data?.count || data.total || 0;
                    this.state.totalPages = data.data?.pageCount || Math.ceil(this.state.totalRecords / 100) || 1;
                    totalPag = this.state.totalPages;
                    this.log(`Encontrados: ${this.state.totalRecords} CNPJs em ${totalPag} páginas.`, 'succ');
                }

                const pageCnpjs = data.data?.cnpj || data.cnpjs || [];
                let addedThisPage = 0;

                pageCnpjs.forEach(item => {
                    const cleanCnpj = String(item.cnpj).replace(/\D/g, '');
                    if (this.state.seenCnpjs.has(cleanCnpj)) {
                        this.state.duplicatesSkipped++;
                        return; // Ignora duplicados na raiz
                    }
                    this.state.seenCnpjs.add(cleanCnpj);
                    
                    // Extração Enriquecida
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
                    addedThisPage++;
                });

                this.state.currentPage = pag;
                this.saveSession(); // Salva estado para resume (#16)

                // Atualizar tabela prévia periodicamente ou na primeira pág
                if (pag === 1 || pag % 5 === 0 || pag === totalPag) {
                    this.renderMineTable();
                }

                this.updateProgress(pag, totalPag);
                this.updateMineStats();
                
                if (pag < totalPag && this.state.running) {
                    // Controla o tempo real vs delay desejado
                    const elapsed = Date.now() - (this.state.pageTimes.length > 0 ? this.state.pageTimes[this.state.pageTimes.length - 1] : Date.now());
                    const remainingDelay = Math.max(0, this.state.delayBetweenPages - elapsed);
                    if (remainingDelay > 0) {
                        await new Promise(resolve => setTimeout(resolve, remainingDelay));
                    }
                    this.state.pageTimes.push(Date.now() - (Date.now() - elapsed)); // armazena tempo real
                    if (this.state.pageTimes.length > 5) this.state.pageTimes.shift(); // keep last 5
                }
                
                pag++;
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
                const duration = ((Date.now() - miningStartTime) / 1000).toFixed(0);
                this.log(`\n=== MINERAÇÃO CONCLUÍDA: ${this.state.leads.length} CNPJs na memória (${duration}s) ===`, 'succ');
                if (this.state.duplicatesSkipped > 0) {
                    this.log(`   ${this.state.duplicatesSkipped} duplicados ignorados.`, 'info');
                }
                // Salvar no histórico
                this.saveToHistory();
                // Notificação ao concluir (#8)
                this._notifyComplete();
                // Limpar sessão pois foi concluída
                this.clearSession();
            } else {
                this.log('=== MINERAÇÃO ENCERRADA SEM RESULTADOS ===', 'warn');
                this.clearSession();
            }
            this.updateProgress(this.state.currentPage, this.state.totalPages);
            this.updateMineStats();
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

    // ========================= EXPORTAÇÃO DIRETA DA MINERAÇÃO =========================
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

        // Aba de resumo
        const summary = [
            ['RESUMO DA MINERAÇÃO'],
            [''],
            ['Data', new Date().toLocaleString('pt-BR')],
            ['Total Encontrados', this.state.totalRecords],
            ['Total Extraídos', this.state.leads.length],
            ['Duplicados Ignorados', this.state.duplicatesSkipped],
            ['Páginas Processadas', `${this.state.currentPage}/${this.state.totalPages}`],
            [''],
            ['FILTROS UTILIZADOS'],
            ['UF', this.els.ufInput?.value || ''],
            ['Situação', this.els.situacaoSelect?.value || ''],
            ['Municípios', this.filters.cidades.join(', ')],
            ['Termos', this.filters.termos.join(', ')],
            ['CNAEs', this.filters.cnaes.join(', ')],
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), 'Resumo');

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 16).replace(/[-:T]/g, '').slice(0, 12);
        XLSX.writeFile(workbook, `mineracao_${dateStr}.xlsx`);
        this.log(`✅ Exportação direta: ${rows.length} CNPJs salvos em mineracao_${dateStr}.xlsx`, 'succ');
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
        const wrap = document.getElementById('mineResultsWrap');
        const btn = document.getElementById('toggleTableModeBtn');
        if (!wrap || !btn) return;
        
        const isCompact = wrap.classList.toggle('mine-table-compact');
        btn.textContent = isCompact ? 'Modo Padrão' : 'Modo Expandido';
        this.log(`Tabela alterada para modo ${isCompact ? 'Compacto' : 'Expandido'}.`, 'info');
    },

    renderMineTable() {
        const body = this.els.mineTableBody;
        if (!body) return;

        // Limita a 200 linhas no DOM para performance
        const MAX = 200;
        const leads = this.state.leads;
        const slice = leads.slice(0, MAX);

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
            if (leads.length > MAX) {
                info.textContent = `Mostrando ${MAX} de ${leads.length} resultados. Todos serão transferidos.`;
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

        // Scroll suave até a seção de enriquecimento
        document.getElementById('enrichmentSection')?.scrollIntoView({ behavior: 'smooth' });
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
            mineTableBody: document.getElementById('mineTableBody'),
            mineTableInfo: document.getElementById('mineTableInfo'),
        };

        // Restaurar API Key do localStorage
        const savedKey = localStorage.getItem('casadosdados_api_key');
        if (savedKey && this.els.apiKeyInput) {
            this.els.apiKeyInput.value = savedKey;
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

        // Botão Testar API Key
        document.getElementById('testApiKeyBtn')?.addEventListener('click', () => this.testApiKey());

        // Atualizar payload ao mudar UF ou Situação
        this.els.ufInput?.addEventListener('input', () => this.buildPayload());
        this.els.situacaoSelect?.addEventListener('change', () => this.buildPayload());

        // Filtros avançados — qualquer checkbox mine-filter
        document.querySelectorAll('.mine-filter-check').forEach(cb => {
            cb.addEventListener('change', () => this.buildPayload());
        });

        // Toggle da seção
        document.getElementById('miningToggleBtn')?.addEventListener('click', () => this.toggleSection());

        // Editor JSON — tracking de foco para não sobrescrever enquanto user edita
        if (this.els.jsonEditor) {
            this.els.jsonEditor._userEditing = false;

            this.els.jsonEditor.addEventListener('focus', () => {
                this.els.jsonEditor._userEditing = true;
            });

            // Validação em tempo real enquanto digita
            this.els.jsonEditor.addEventListener('input', () => {
                this.validateEditor();
            });
        }

        // Botão "Sincronizar do Editor"
        document.getElementById('syncFromEditorBtn')?.addEventListener('click', () => this.syncEditorToFilters());

        // Botão "Resetar Editor" — volta o editor para refletir os filtros visuais
        document.getElementById('resetEditorBtn')?.addEventListener('click', () => {
            if (this.els.jsonEditor) this.els.jsonEditor._userEditing = false;
            this.buildPayload();
            this.log('Editor resetado para os filtros visuais.', 'info');
        });

        // Botões de limpar chips
        document.querySelectorAll('.mine-clear-chips-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.clearKey;
                if (key) this.clearChips(key);
            });
        });

        // Botão limpar todos
        document.getElementById('clearAllChipsBtn')?.addEventListener('click', () => this.clearAllChips());

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

        // Build inicial do payload
        this.buildPayload();

        // Verificar sessão pausada
        this.checkSession();

        console.log('%c⛏️ Mining Engine carregado!', 'background:#f59e0b; color:#000; padding:4px 8px; border-radius:4px; font-weight:bold');
    }
};

// Auto-init quando DOM pronto (será chamado pelo DOMContentLoaded junto com init())
// O init será invocado pelo ui-enhancement-script.js para garantir ordem
