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
    },

    // ===== FILTROS (gerenciados por chip system) =====
    // Termos iniciais carregados do payload.txt de referência
    filters: {
        cidades: [],
        termos: ['SORVETE', 'ACAI', 'AÇAI', 'MILK SHAKE', 'MILKSHAKE', 'PICOLE', 'PICOLÉ', 'PALETA MEXICANA', 'GELATERIA', 'GELATO', 'SORVETERIA'],
        cnaes: [],
        naturezaJuridica: []
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
            "bairro": [],
            "cep": [],
            "ddd": [],
            "telefone": [],
            "data_abertura": {},
            "capital_social": { "minimo": 0, "maximo": 0 },
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
        if (el('mineStatPage')) el('mineStatPage').textContent = `${this.state.currentPage}/${this.state.totalPages}`;
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
        this.state.running = true;
        this.state.leads = [];
        this.state.currentPage = 0;
        this.state.totalPages = 0;
        this.state.totalRecords = 0;

        this.clearLog();
        this.log('=== FASE 1: INICIANDO MINERAÇÃO ===', 'info');
        this.log(`Endpoint: ${this.state.endpoint}`, 'info');

        // UI
        this.els.startMineBtn?.classList.add('hidden');
        this.els.stopMineBtn?.classList.remove('hidden');
        this.els.transferBtn?.classList.add('hidden');
        if (this.els.mineSpinner) this.els.mineSpinner.classList.remove('hidden');

        const headers = {
            "api-key": this.state.apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://portal.casadosdados.com.br",
            "Referer": "https://portal.casadosdados.com.br/"
        };

        try {
            let pag = 1;
            let totalPag = 1;

            while (this.state.running && pag <= totalPag) {
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

                const res = await fetch(this.state.endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    if (res.status === 429) {
                        this.log(`[RATE LIMIT] Servidor respondeu 429. Aguardando 10s antes de tentar novamente...`, 'warn');
                        await new Promise(r => setTimeout(r, 10000));
                        continue; // Retry mesma página
                    }
                    throw new Error(`HTTP ${res.status} — ${res.statusText}`);
                }

                const data = await res.json();

                if (pag === 1) {
                    const total = data.total || 0;
                    if (total === 0) {
                        this.log('Retorno vazio. Nenhuma empresa encontrada com esses filtros.', 'warn');
                        break;
                    }
                    totalPag = Math.ceil(total / 100);
                    this.state.totalPages = totalPag;
                    this.state.totalRecords = total;
                    this.log(`✓ ${total} empresas detectadas → ${totalPag} páginas.`, 'succ');
                }

                const cnpjs = data.cnpjs || [];
                if (cnpjs.length === 0) {
                    this.log('Página sem resultados. Encerrando.', 'warn');
                    break;
                }

                cnpjs.forEach(emp => {
                    const sit = emp.situacao_cadastral || {};
                    this.state.leads.push({
                        cnpj: emp.cnpj || '',
                        razao_social: emp.razao_social || '',
                        nome_fantasia: emp.nome_fantasia || '',
                        situacao: typeof sit === 'object' ? (sit.situacao_atual || '') : sit,
                        data_situacao: typeof sit === 'object' ? (sit.data || '').split('T')[0] : ''
                    });
                });

                this.state.currentPage = pag;
                this.updateProgress(pag, totalPag);
                this.updateMineStats();
                this.renderMineTable();
                this.log(`   Lote ${pag}/${totalPag} extraído. Acumulado: ${this.state.leads.length}`, 'succ');

                pag++;

                if (pag <= totalPag && this.state.running) {
                    const delay = this.state.delayBetweenPages;
                    this.log(`   Aguardando ${(delay / 1000).toFixed(1)}s (prevenção de ban)...`, 'info');
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        } catch (e) {
            this.log(`[ERRO CRÍTICO] ${e.message}`, 'err');
        } finally {
            this.state.running = false;
            this.els.startMineBtn?.classList.remove('hidden');
            this.els.stopMineBtn?.classList.add('hidden');
            if (this.els.mineSpinner) this.els.mineSpinner.classList.add('hidden');

            if (this.state.leads.length > 0) {
                this.els.transferBtn?.classList.remove('hidden');
                this.log(`\n=== MINERAÇÃO CONCLUÍDA: ${this.state.leads.length} CNPJs na memória ===`, 'succ');
            } else {
                this.log('=== MINERAÇÃO ENCERRADA SEM RESULTADOS ===', 'warn');
            }
            this.updateProgress(this.state.currentPage, this.state.totalPages);
            this.updateMineStats();
        }
    },

    stopMining() {
        this.state.running = false;
        this.log('⛔ Sinal de parada enviado. Encerrando após a página atual...', 'warn');
    },

    // ========================= TABELA PRÉVIA =========================
    renderMineTable() {
        const body = this.els.mineTableBody;
        if (!body) return;

        // Limita a 200 linhas no DOM para performance
        const MAX = 200;
        const leads = this.state.leads;
        const slice = leads.slice(0, MAX);

        body.innerHTML = slice.map((lead, i) => {
            const cnpjFmt = lead.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
            return `<tr>
                <td style="font-family:monospace; font-size:0.8rem">${cnpjFmt}</td>
                <td>${lead.razao_social}</td>
                <td>${lead.nome_fantasia || '—'}</td>
                <td>${lead.situacao || '—'}</td>
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
            jsonEditor: document.getElementById('mineJsonEditor'),
            jsonEditorStatus: document.getElementById('mineJsonEditorStatus'),
            terminal: document.getElementById('mineTerminal'),
            progressBar: document.getElementById('mineProgressBar'),
            mineSpinner: document.getElementById('mineSpinner'),
            startMineBtn: document.getElementById('startMineBtn'),
            stopMineBtn: document.getElementById('stopMineBtn'),
            transferBtn: document.getElementById('transferMineBtn'),
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

        // Build inicial do payload
        this.buildPayload();

        console.log('%c⛏️ Mining Engine carregado!', 'background:#f59e0b; color:#000; padding:4px 8px; border-radius:4px; font-weight:bold');
    }
};

// Auto-init quando DOM pronto (será chamado pelo DOMContentLoaded junto com init())
// O init será invocado pelo ui-enhancement-script.js para garantir ordem
