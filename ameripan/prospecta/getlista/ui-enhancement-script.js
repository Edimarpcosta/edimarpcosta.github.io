// ========================= UI-ENHANCEMENT-SCRIPT.JS =========================
// §1.2 — UI para Fila de APIs
// §2 — Controles de processamento com pausa/resume inteligente
// §4.3 — Virtualização leve de tabela + Modal de Detalhes completo

const uiControllers = {
    // ===== CARREGAMENTO =====
    async loadFromCsv() {
        if (!utils.checkFileApiSupport()) return;
        const fileInput = elements.csvFile;
        if (!fileInput.files || fileInput.files.length === 0) return alert('Selecione um arquivo (.csv ou .xlsx).');
        try {
            utils.showLoading();
            utils.updateStatus('Lendo planilha...');
            const cnpjs = await dataHandlers.loadSpreadsheet(fileInput.files[0]);
            this.handleLoadedCnpjs(cnpjs, 'arquivo');
        } catch (err) {
            console.error(err);
            alert('Erro ao processar: ' + err.message);
        } finally {
            utils.hideLoading();
        }
    },

    loadFromText() {
        const text = elements.cnpjListTextarea.value.trim();
        if (!text) return alert('Por favor, insira CNPJs.');
        const cnpjs = dataHandlers.processListText(text);
        this.handleLoadedCnpjs(cnpjs, 'lista');
    },

    handleLoadedCnpjs(cnpjs, source) {
        if (cnpjs.length === 0) {
            alert('Nenhum CNPJ com 14 dígitos encontrado.');
            return utils.updateStatus('Nenhum CNPJ encontrado.');
        }
        state.cnpjList = cnpjs;
        state.results = new Array(cnpjs.length);
        state.currentIndex = 0;
        utils.updateStatus(`${cnpjs.length} CNPJs carregados da ${source}.`);
        elements.controlsSection.classList.remove('hidden');
        elements.resultsSection.classList.remove('hidden');
        elements.resultsBody.innerHTML = '';
        utils.updateProgressBar(0, cnpjs.length);
        utils.updateStats();
        this.renderApiQueueStatus();
    },

    // ===== PROCESSAMENTO =====
    async startProcessing(forceDeepMode = false) {
        if (state.isProcessing) return;
        if (state.cnpjList.length === 0) return alert('Carregue CNPJs primeiro.');

        // Ler configs da UI
        state.apiDelay = parseInt(elements.apiDelayInput?.value) || 300;
        state.maxParallelRequests = parseInt(elements.maxParallelRequestsInput?.value) || 3;
        state.autoPauseEnabled = elements.autoPauseEnabledCheckbox?.checked ?? true;
        state.autoPauseDelay = parseInt(elements.autoPauseDelayInput?.value) || 30;

        const deepCheck = document.getElementById('deepMergeEnabledCheck');
        if (forceDeepMode) {
            state.deepMergeEnabled = true;
            if (deepCheck) deepCheck.checked = true;
        } else {
            state.deepMergeEnabled = deepCheck?.checked ?? false;
        }

        state.isProcessing = true;
        state.isPaused = false;
        state.consecutiveErrors = 0;
        state.pendingRequests = [];
        // Re-ativar APIs que foram desativadas em rodadas anteriores
        state.apis.forEach(api => { api.active = true; api.consecutiveFailures = 0; });

        state.globalRequestCounter = 0;
        if (typeof backoffStrategy !== 'undefined') backoffStrategy.reset();
        if (state.autoPauseTimer) { clearTimeout(state.autoPauseTimer); state.autoPauseTimer = null; }

        const alert_el = document.getElementById('autoPauseAlert');
        if (alert_el) alert_el.style.display = 'none';

        const startDeepBtn = document.getElementById('startDeepBtn');
        elements.startBtn?.classList.add('hidden');
        if (startDeepBtn) startDeepBtn.classList.add('hidden');

        elements.pauseBtn.classList.remove('hidden');
        elements.resumeBtn.classList.add('hidden');
        elements.stopBtn?.classList.remove('hidden');

        utils.showLoading();

        const modeMsg = state.deepMergeEnabled ? ' 🔍 (Modo Profundo Multi-API)' : '';
        // §1.2 — Testar conexões antes de iniciar
        utils.updateStatus(`Testando conexões das APIs${modeMsg}...`);
        const testResult = await dataHandlers.testApisConnection();
        this.renderApiQueueStatus();

        if (!testResult.anyWorking) {
            utils.updateStatus('⚠ Nenhuma API respondeu. Verifique sua conexão.');
            utils.hideLoading();
            elements.startBtn?.classList.remove('hidden');
            if (startDeepBtn) startDeepBtn.classList.remove('hidden');
            elements.pauseBtn.classList.add('hidden');
            state.isProcessing = false;
            return;
        }

        utils.updateStatus(`Iniciando consultas${modeMsg}...`);
        await this.processNextBatch();
    },

    pauseProcessing() {
        if (!state.isProcessing) return;
        state.isPaused = true;
        state.pendingRequests.forEach(r => { try { r.controller.abort(); } catch (e) { } });
        state.pendingRequests = [];
        state.requestsInProgress = 0;
        if (state.autoPauseTimer) { clearTimeout(state.autoPauseTimer); state.autoPauseTimer = null; }
        const a = document.getElementById('autoPauseAlert');
        if (a) a.style.display = 'none';
        elements.pauseBtn.classList.add('hidden');
        elements.resumeBtn.classList.remove('hidden');
        elements.stopBtn?.classList.remove('hidden');
        utils.hideLoading();
        const done = state.results.filter(r => r !== undefined).length;
        utils.updateStatus(`Pausado. ${done}/${state.cnpjList.length} processados.`);
        if (done > 0) {
            [elements.exportMaposcopeBtn, elements.exportCompletoBtn].forEach(btn => {
                if (btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
            });
            this.renderGroupedResults();
        }
    },

    async resumeProcessing() {
        if (state.requestsInProgress > 0) return alert('Aguarde as requisições ativas.');
        if (state.autoPauseTimer) { clearTimeout(state.autoPauseTimer); state.autoPauseTimer = null; }
        if (countdownTimer.timerElement) countdownTimer.stop();
        const a = document.getElementById('autoPauseAlert');
        if (a) { a.style.display = 'none'; a.classList.remove('pulse'); }

        state.isPaused = false;
        state.isAutoPaused = false;
        state.consecutiveErrors = 0;
        elements.pauseBtn.classList.remove('hidden');
        elements.resumeBtn.classList.add('hidden');
        elements.stopBtn?.classList.remove('hidden');

        utils.showLoading();
        utils.updateStatus('Retomando...');

        // Encontra pendentes
        const pending = [];
        for (let i = 0; i < state.cnpjList.length; i++) {
            if (state.results[i] === undefined) pending.push(i);
        }
        if (pending.length > 0) {
            state.currentIndex = pending[0];
            await this.processNextBatch();
        } else {
            this.completeProcessing();
        }
    },

    stopProcessing() {
        state.isProcessing = false;
        state.isPaused = false;
        state.isAutoPaused = false;
        
        state.pendingRequests.forEach(r => { try { r.controller.abort(); } catch (e) { } });
        state.pendingRequests = [];
        state.requestsInProgress = 0;
        
        if (state.autoPauseTimer) { clearTimeout(state.autoPauseTimer); state.autoPauseTimer = null; }
        if (countdownTimer.timerElement) countdownTimer.stop();
        
        const a = document.getElementById('autoPauseAlert');
        if (a) { a.style.display = 'none'; a.classList.remove('pulse'); }
        
        state.currentIndex = 0;
        state.results = new Array(state.cnpjList.length);
        state.consecutiveErrors = 0;
        state.cnpjCache = {}; // Limpa cache para começar do zero real
        
        elements.resultsBody.innerHTML = '';
        const infoEl = document.getElementById('tableInfoRow');
        if (infoEl) infoEl.classList.add('hidden');
        
        utils.updateProgressBar(0, state.cnpjList.length);
        utils.updateStats();
        utils.hideLoading();
        utils.updateStatus('Processamento parado. Dados limpos.');
        
        elements.startBtn.classList.remove('hidden');
        document.getElementById('startDeepBtn')?.classList.remove('hidden');
        elements.pauseBtn.classList.add('hidden');
        elements.resumeBtn.classList.add('hidden');
        elements.stopBtn?.classList.add('hidden');
        
        [elements.exportMaposcopeBtn, elements.exportCompletoBtn].forEach(btn => {
            if (btn) { btn.disabled = true; btn.classList.add('opacity-50'); }
        });
        
        this.renderApiQueueStatus();
        this.renderGroupedResults();
    },

    // §2.3 — triggerAutoPause só dispara quando TODAS as 5 APIs falharam
    triggerAutoPause(errorMessage, errorType) {
        if (state.isPaused || !state.autoPauseEnabled) return;
        state.isPaused = true;
        state.isAutoPaused = true;
        state.errorTypeToHandle = errorType;

        state.pendingRequests.forEach(r => { try { r.controller.abort(); } catch (e) { } });
        state.pendingRequests = [];
        state.requestsInProgress = 0;

        elements.pauseBtn.classList.add('hidden');
        elements.resumeBtn.classList.remove('hidden');
        elements.stopBtn?.classList.remove('hidden');
        utils.hideLoading();
        const done = state.results.filter(r => r !== undefined).length;
        if (done > 0) {
            [elements.exportMaposcopeBtn, elements.exportCompletoBtn].forEach(btn => {
                if (btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
            });
            this.renderGroupedResults();
        }

        let delay = state.autoPauseDelay;
        if (errorType === 'rate_limit' && typeof backoffStrategy !== 'undefined') {
            delay = backoffStrategy.getDelayInSeconds();
        }

        const alertEl = document.getElementById('autoPauseAlert');
        if (alertEl) {
            alertEl.style.display = 'block';
            alertEl.classList.add('pulse');
            document.getElementById('autoPauseReason').textContent = `Erro: ${errorMessage}`;
            document.getElementById('currentPauseDelay').value = delay;
            countdownTimer.init('autoPauseCountdown');
            countdownTimer.start(delay, () => {
                if (state.isPaused && state.isAutoPaused) this.resumeProcessing();
            });
        }
        utils.updateStatus(`⏸ Pausa automática — todas as APIs falharam`);
    },

    // ===== PROCESSAMENTO EM LOTE =====
    async processNextBatch() {
        if (!state.isProcessing || state.isPaused) return;

        const processCnpj = async (index) => {
            if (index >= state.cnpjList.length || state.isPaused || !state.isProcessing) return;
            const cnpj = state.cnpjList[index];
            state.requestsInProgress++;

            try {
                if (state.isPaused || !state.isProcessing) { state.requestsInProgress--; return; }

                const result = await dataHandlers.fetchCnpjData(cnpj);
                if (result.aborted || state.isPaused || !state.isProcessing) { state.requestsInProgress--; return; }

                state.results[index] = result;
                setTimeout(() => this.addResultToTable(result, index), 0);

                const count = state.results.filter(r => r !== undefined).length;
                if (!state.isPaused && state.isProcessing) {
                    utils.updateStatus(`Processados ${count} de ${state.cnpjList.length} CNPJs...`);
                    utils.updateProgressBar(count, state.cnpjList.length);
                    utils.updateStats();
                }
                if (count >= state.cnpjList.length && state.isProcessing) this.completeProcessing();

            } catch (err) {
                if (!state.isPaused && state.isProcessing) {
                    state.results[index] = { cnpj, error: true, errorMessage: err.message };
                    setTimeout(() => this.addResultToTable(state.results[index], index), 0);
                    if (err.message.includes('Nenhuma API')) this.triggerAutoPause(err.message, 'rate_limit');
                }
            } finally {
                state.requestsInProgress--;
                this.renderApiQueueStatus();
                if (!state.isPaused && state.isProcessing) {
                    const next = state.currentIndex++;
                    if (next < state.cnpjList.length) {
                        setTimeout(() => processCnpj(next), state.apiDelay);
                    }
                }
            }
        };

        try {
            const batchSize = Math.min(state.maxParallelRequests, state.cnpjList.length - state.currentIndex);
            for (let i = 0; i < batchSize; i++) {
                const idx = state.currentIndex + i;
                if (idx < state.cnpjList.length) {
                    setTimeout(() => processCnpj(idx), i * 120);
                }
            }
            state.currentIndex += batchSize;
        } catch (err) {
            this.pauseProcessing();
        }
    },

    completeProcessing() {
        state.isProcessing = false;
        elements.pauseBtn.classList.add('hidden');
        elements.resumeBtn.classList.add('hidden');
        elements.stopBtn?.classList.add('hidden');
        elements.startBtn.classList.remove('hidden');
        document.getElementById('startDeepBtn')?.classList.remove('hidden');
        utils.hideLoading();

        const total = state.results.filter(r => r !== undefined).length;
        const errs = state.results.filter(r => r && r.error).length;
        utils.updateStatus(`✅ Concluído! ${total} processados (${total - errs} ✓ | ${errs} ✗)`);
        utils.updateProgressBar(state.cnpjList.length, state.cnpjList.length);
        utils.updateStats();

        // Habilita exportação
        [elements.exportMaposcopeBtn, elements.exportCompletoBtn].forEach(btn => {
            if (btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
        });

        // Re-render groups if enabled
        this.renderGroupedResults();

        // ===== BLOCKLIST: Enriquecimento automático dos já-atendidos (opcional) =====
        const enrichCheck = document.getElementById('enrichAtendidosCheck');
        if (enrichCheck?.checked && state.cnpjsJaAtendidos && state.cnpjsJaAtendidos.size > 0) {
            if (typeof dataHandlers !== 'undefined' && dataHandlers.enrichAtendidos) {
                setTimeout(() => {
                    utils.updateStatus('🔄 Iniciando enriquecimento dos já-atendidos (opcional)...');
                    dataHandlers.enrichAtendidos();
                }, 1500);
            }
        }

        // ===== BLOCKLIST: Matching de CPFs da lista com sócios (QSA) =====
        if (state.cpfsJaAtendidos && state.cpfsJaAtendidos.length > 0) {
            setTimeout(() => {
                if (typeof dataHandlers !== 'undefined' && dataHandlers.matchCpfsWithQsa) {
                    dataHandlers.matchCpfsWithQsa();
                    const btn = document.getElementById('exportCpfSocioBtn');
                    if (btn && state.cpfSocioMatches && state.cpfSocioMatches.length > 0) {
                        btn.disabled = false;
                        btn.classList.remove('hidden');
                        btn.style.opacity = '1';
                        btn.title = `${state.cpfSocioMatches.length} possível(is) sócio(s) encontrado(s)`;
                        utils.updateStatus(`🔍 ${state.cpfSocioMatches.length} possível(is) sócio(s) detectado(s) via QSA!`);
                    }
                }
            }, 800);
        }
    },


    // ===== §4.3 — TABELA COM VIRTUALIZAÇÃO LEVE =====
    addResultToTable(result, index) {
        // Limita renderização DOM a MAX_VISIBLE_ROWS linhas
        const MAX_VISIBLE_ROWS = 200;
        let row = document.querySelector(`.result-row-${index}`);

        const cnoEnabled = document.getElementById('cnoEnabled')?.checked;
        const cnoOnlyActive = document.getElementById('cnoOnlyActive')?.checked;
        let shouldHide = false;
        if (!result.error && cnoEnabled && cnoOnlyActive) {
            const hasActive = result.cno && result.cno.obras && result.cno.obras.some(o => o.situacao?.descricao?.toUpperCase() === 'ATIVA');
            if (!hasActive) shouldHide = true;
        }

        if (!row && elements.resultsBody.children.length >= MAX_VISIBLE_ROWS) {
            const infoEl = document.getElementById('tableInfoRow');
            if (infoEl) {
                const total = state.results.filter(r => r !== undefined).length;
                infoEl.textContent = `Mostrando ${MAX_VISIBLE_ROWS} de ${total} resultados na tela. Todos serão exportados.`;
                infoEl.classList.remove('hidden');
            }
            return;
        }

        if (!row) {
            row = document.createElement('tr');
            row.className = `result-row-${index} hover-row cursor-pointer`;
            row.style.cursor = 'pointer';
            row.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                uiControllers.showDetails(result);
            });
            elements.resultsBody.appendChild(row);
        }

        if (result.error) {
            row.innerHTML = `
                <td><span class="badge badge-status-inativa">-</span></td>
                <td>${utils.formatCnpjForDisplay(result.cnpj)}</td>
                <td colspan="6" style="color:#f87171">${result.errorMessage}</td>
                <td></td>`;
        } else {
            const scoreInfo = result.scoreInfo || { score: 0, temp: 'Frio ❄️' };
            let badgeClass = 'badge-status-inativa';
            if (scoreInfo.score >= 70) badgeClass = 'badge-status-ativa';
            else if (scoreInfo.score >= 35) badgeClass = 'badge-origin';

            row.innerHTML = `
                <td><span class="badge ${badgeClass}" title="${(scoreInfo.reasons || []).join(' | ')}">${scoreInfo.score || 0} ${scoreInfo.temp || ''}</span></td>
                <td>${utils.formatCnpjForDisplay(result.cnpj)}</td>
                <td>${result.razao_social || '-'}</td>
                <td>${result.nome_fantasia || '-'}</td>
                <td>${result.descricao_situacao_cadastral || '-'}</td>
                <td>${result.municipio || '-'}/${result.uf || '-'}</td>
                <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${result.cnae_fiscal_descricao || ''}">${result.cnae_fiscal_descricao || '-'}</td>
                <td><span class="api-badge ${result.api_origem === 'Invertexto' ? 'api-fallback' : 'api-active'}">${result.api_origem || '?'}</span></td>
                <td><button class="details-btn" data-index="${index}">Ver</button></td>`;
        }

        if (shouldHide) {
            row.style.display = 'none';
        } else {
            row.style.display = '';
        }
    },

    // ===== FILTRAGEM DINÂMICA EM TEMPO REAL =====
    getFilteredResults() {
        if (!state.results || state.results.length === 0) return [];

        // 1. Filtros de Situação Cadastral (topo)
        const exportAll = document.getElementById('exportAll')?.checked ?? true;
        const selectedStatuses = new Set(
            Array.from(document.querySelectorAll('.export-status:checked')).map(cb => cb.value.toUpperCase())
        );

        // 2. Temperatura Lead
        const tempQuente = document.getElementById('filterTempQuente')?.checked;
        const tempMorno = document.getElementById('filterTempMorno')?.checked;
        const filterTempFrio = document.getElementById('filterTempFrio')?.checked;
        const hasTempFilter = (tempQuente || tempMorno || filterTempFrio) && !(tempQuente && tempMorno && filterTempFrio);

        // 3. Inputs de Filtro
        const empresaTerm = (document.getElementById('filterEmpresa')?.value || '').trim().toLowerCase();
        const socioTerm = (document.getElementById('filterSocio')?.value || '').trim().toLowerCase();
        const cnpjTerm = (document.getElementById('filterCnpj')?.value || '').trim().replace(/\D/g, '');
        const localTerm = (document.getElementById('filterLocal')?.value || '').trim().toLowerCase();
        const cnaeTerm = (document.getElementById('filterCnae')?.value || '').trim().toLowerCase();
        const capMinInput = document.getElementById('filterCapitalMin')?.value;
        const capMaxInput = document.getElementById('filterCapitalMax')?.value;
        const capMin = capMinInput !== undefined && capMinInput !== '' ? parseFloat(capMinInput) : NaN;
        const capMax = capMaxInput !== undefined && capMaxInput !== '' ? parseFloat(capMaxInput) : NaN;
        const obrasFilter = document.getElementById('filterObras')?.value || 'todos';
        const ieFilter = document.getElementById('filterIe')?.value || 'todos';

        // Suporte a CNO Obras Ativas
        const cnoEnabled = document.getElementById('cnoEnabled')?.checked;
        const cnoOnlyActive = document.getElementById('cnoOnlyActive')?.checked;

        return state.results.filter(r => {
            if (!r || r.error) return false;

            // CNO Obras Ativas (configuração global)
            if (cnoEnabled && cnoOnlyActive) {
                const hasActive = r.cno && r.cno.obras && r.cno.obras.some(o => o.situacao?.descricao?.toUpperCase() === 'ATIVA');
                if (!hasActive) return false;
            }

            // Situação Cadastral
            if (!exportAll && selectedStatuses.size > 0) {
                const st = (r.descricao_situacao_cadastral || r.situacao || '').toUpperCase();
                if (!selectedStatuses.has(st)) return false;
            }

            // Temperatura Lead
            if (hasTempFilter) {
                const score = r.scoreInfo?.score || 0;
                let passTemp = false;
                if (tempQuente && score >= 70) passTemp = true;
                if (tempMorno && score >= 35 && score < 70) passTemp = true;
                if (filterTempFrio && score < 35) passTemp = true;
                if (!passTemp) return false;
            }

            // Empresa (Razão Social / Nome Fantasia)
            if (empresaTerm) {
                const rs = (r.razao_social || '').toLowerCase();
                const fant = (r.nome_fantasia || '').toLowerCase();
                if (!rs.includes(empresaTerm) && !fant.includes(empresaTerm)) return false;
            }

            // Sócio (QSA)
            if (socioTerm) {
                const hasSocioMatch = Array.isArray(r.qsa) && r.qsa.some(s => {
                    const nome = (s.nome_socio || s.nome || '').toLowerCase();
                    return nome.includes(socioTerm);
                });
                if (!hasSocioMatch) return false;
            }

            // CNPJ / Raiz
            if (cnpjTerm) {
                const cleanCnpj = String(r.cnpj || '').replace(/\D/g, '');
                if (!cleanCnpj.includes(cnpjTerm)) return false;
            }

            // Local (Cidade / Bairro / UF / Logradouro)
            if (localTerm) {
                const mun = (r.municipio || '').toLowerCase();
                const uf = (r.uf || '').toLowerCase();
                const bairro = (r.bairro || '').toLowerCase();
                const logr = (r.logradouro || '').toLowerCase();
                if (!mun.includes(localTerm) && !uf.includes(localTerm) && !bairro.includes(localTerm) && !logr.includes(localTerm)) return false;
            }

            // CNAE
            if (cnaeTerm) {
                const cnaeCod = String(r.cnae_fiscal || '').toLowerCase();
                const cnaeDesc = (r.cnae_fiscal_descricao || '').toLowerCase();
                let hasCnaeSec = false;
                if (Array.isArray(r.cnaes_secundarios)) {
                    hasCnaeSec = r.cnaes_secundarios.some(c => 
                        String(c.codigo || '').toLowerCase().includes(cnaeTerm) ||
                        (c.descricao || '').toLowerCase().includes(cnaeTerm)
                    );
                }
                if (!cnaeCod.includes(cnaeTerm) && !cnaeDesc.includes(cnaeTerm) && !hasCnaeSec) return false;
            }

            // Capital Social
            const cap = Number(r.capital_social) || 0;
            if (!isNaN(capMin) && cap < capMin) return false;
            if (!isNaN(capMax) && cap > capMax) return false;

            // Obras CNO
            if (obrasFilter === 'com_obras') {
                if (!r.cno || !r.cno.obras || r.cno.obras.length === 0) return false;
            } else if (obrasFilter === 'obras_ativas') {
                const hasActive = r.cno && r.cno.obras && r.cno.obras.some(o => o.situacao?.descricao?.toUpperCase() === 'ATIVA');
                if (!hasActive) return false;
            } else if (obrasFilter === 'sem_obras') {
                if (r.cno && r.cno.obras && r.cno.obras.length > 0) return false;
            }

            // Inscrição Estadual
            if (ieFilter === 'com_ie') {
                if (!r.inscricao_estadual || r.inscricao_estadual === '-') return false;
            } else if (ieFilter === 'sem_ie') {
                if (r.inscricao_estadual && r.inscricao_estadual !== '-') return false;
            }

            return true;
        });
    },

    applyFilters() {
        const filtered = this.getFilteredResults();
        const filteredSet = new Set(filtered);

        // 1. Atualiza visibilidade da tabela principal
        state.results.forEach((result, index) => {
            if (!result) return;
            const row = document.querySelector(`.result-row-${index}`);
            if (!row) return;
            if (filteredSet.has(result)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // 2. Atualiza contador e estatísticas
        const counterEl = document.getElementById('filteredResultsCounter');
        const total = state.results.filter(r => r && !r.error).length;
        if (counterEl) {
            if (filtered.length === total) {
                counterEl.textContent = `Exibindo todos os ${total} resultados`;
                counterEl.style.background = 'rgba(99,102,241,0.15)';
                counterEl.style.color = '#6366f1';
            } else {
                counterEl.textContent = `Filtrados: ${filtered.length} de ${total} resultados`;
                counterEl.style.background = 'rgba(234,179,8,0.2)';
                counterEl.style.color = '#ca8a04';
            }
        }

        // 3. Atualiza agrupamentos com apenas os itens filtrados
        this.renderGroupedResults(filtered);
    },

    resetFilters() {
        const setCb = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

        setCb('filterTempQuente', false);
        setCb('filterTempMorno', false);
        setCb('filterTempFrio', false);
        setVal('filterEmpresa', '');
        setVal('filterSocio', '');
        setVal('filterCnpj', '');
        setVal('filterLocal', '');
        setVal('filterCnae', '');
        setVal('filterCapitalMin', '');
        setVal('filterCapitalMax', '');
        setVal('filterObras', 'todos');
        setVal('filterIe', 'todos');
        
        this.applyFilters();
    },

    applyTableFilters() {
        this.applyFilters();
    },

    // ===== §4.4 — RENDERIZAÇÃO DE GRUPOS (FASE 2) =====
    renderGroupedResults(filteredList = null) {
        const groupRoot = document.getElementById('groupRoot')?.checked;
        const groupCity = document.getElementById('groupCity')?.checked;
        const container = document.getElementById('groupedResultsContainer');
        const tableWrap = document.querySelector('.overflow-x-auto');

        if (!groupRoot && !groupCity) {
            if (container) container.classList.add('hidden');
            if (tableWrap) tableWrap.classList.remove('hidden');
            return;
        }

        if (container) container.classList.remove('hidden');
        if (tableWrap) tableWrap.classList.add('hidden');

        const highContrastColors = ['#FF4136', '#0074D9', '#2ECC40', '#FF851B', '#B10DC9', '#3D9970', '#FFDC00', '#F012BE', '#7FDBFF', '#39CCCC', '#FF6347', '#4682B4'];
        
        const groups = new Map();
        const listToGroup = filteredList || this.getFilteredResults();

        listToGroup.forEach((r) => {
            if (!r || r.error) return;
            const idx = state.results.indexOf(r);
            
            let root = groupRoot ? String(r.cnpj).replace(/\D/g, '').substring(0, 8) : '';
            let city = groupCity ? (r.municipio || 'SEM CIDADE').toUpperCase() : '';
            
            let keyParts = [];
            if (groupRoot) keyParts.push(`Raiz: ${root}`);
            if (groupCity) keyParts.push(`Cidade: ${city}`);
            let key = keyParts.join(' | ');
            
            if (!groups.has(key)) {
                groups.set(key, { root: root, members: [] });
            }
            groups.get(key).members.push({ result: r, index: idx });
        });

        if (groups.size === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">Nenhum resultado processado com sucesso para agrupar.</div>';
            return;
        }

        let html = '';
        let colorIndex = 0;
        
        const expandDefault = document.getElementById('expandResultsDefault')?.checked ?? false;
        const displayStyle = expandDefault ? 'block' : 'none';
        const indicator = expandDefault ? '▼' : '▶';

        groups.forEach((groupData, key) => {
            const color = highContrastColors[colorIndex % highContrastColors.length];
            colorIndex++;
            
            // Pega a razão social da primeira empresa do grupo
            const firstCompany = groupData.members[0]?.result;
            const companyName = firstCompany?.razao_social || firstCompany?.nome_fantasia || '';
            
            let headerText = key;
            if (groupRoot && companyName) {
                headerText = `${key} — ${companyName}`;
            }

            html += `<div class="cnpj-group">
                <div class="cnpj-group-header cursor-pointer select-none" onclick="const list = this.nextElementSibling; const ind = this.querySelector('.group-indicator'); if (list.style.display === 'none') { list.style.display = 'block'; ind.textContent = '▼'; } else { list.style.display = 'none'; ind.textContent = '▶'; }">
                    <span class="count" style="background-color: ${color};">${groupData.members.length}x</span>
                    <span class="font-bold" style="color:var(--color-text)">${headerText}</span>
                    <span class="group-indicator ml-auto text-xs font-bold" style="color:var(--color-text-muted)">${indicator}</span>
                </div>
                <ul class="cnpj-members-list" style="display: ${displayStyle};">`;
                
            groupData.members.forEach(member => {
                const r = member.result;
                const cnpjFormatted = utils.formatCnpjForDisplay(r.cnpj);
                let cnpjDisplay = cnpjFormatted;
                
                if (groupRoot && groupData.root && cnpjFormatted.length >= 10) {
                    cnpjDisplay = `<mark style="background-color: ${color};">${cnpjFormatted.substring(0, 10)}</mark>${cnpjFormatted.substring(10)}`;
                }
                
                html += `<li onclick="uiControllers.showDetails(state.results[${member.index}])" class="cursor-pointer">
                    <div>
                        ${cnpjDisplay} - <span style="color:var(--color-text); font-weight:600">${r.razao_social || 'Sem Nome'}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-medium" style="color:var(--color-text-muted)">${r.municipio || ''}/${r.uf || ''}</span>
                        <button class="details-btn px-2 py-1 text-xs rounded font-bold" style="background:var(--bg-details-btn); border:1px solid var(--border-details-btn); color:var(--color-details-btn); cursor:pointer;" data-index="${member.index}" onclick="event.stopPropagation(); uiControllers.showDetails(state.results[${member.index}])">Ver</button>
                    </div>
                </li>`;
            });
            
            html += `</ul></div>`;
        });
        
        container.innerHTML = html;
    },

    // ===== MODAL DE DETALHES COMPLETO =====
    showDetails(result) {
        if (!result || result.error) return;

        window._currentModalData = result;

        const modal = document.getElementById('detailsModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');

        if (title) {
            title.innerHTML = `<span style="color:var(--color-text); font-weight:700">${result.razao_social || 'Detalhes'}</span> <span style="color:var(--color-text-muted); font-size:0.9em">— ${utils.formatCnpjForDisplay(result.cnpj)}</span>`;
        }

        const tel1 = utils.cleanPhone(result.ddd_telefone_1);
        const tel2 = utils.cleanPhone(result.ddd_telefone_2);

        const scoreInfo = result.scoreInfo || { score: 0, temp: 'Frio ❄️', reasons: [] };
        const ageVal = utils.calculateAge(result.data_inicio_atividade || result.abertura);
        const ageDesc = utils.getAgeDescription(ageVal);
        const isAccounting = utils.detectAccountingContact(result.ddd_telefone_1, result.email, result.nome_fantasia, result.razao_social);

        let html = `
        <!-- CARD DE SCORE B2B -->
        <div style="background:var(--bg-header); border:1px solid var(--border-header); border-radius:0.75rem; padding:1.25rem;" class="mb-5">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; font-weight:800; box-shadow:0 4px 12px rgba(99,102,241,0.4)">
                        <span style="font-size:1.2rem; line-height:1">${scoreInfo.score || 0}</span>
                        <span style="font-size:0.5rem; text-transform:uppercase">SCORE</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-base font-bold" style="color:var(--color-text)">${scoreInfo.temp || 'Frio ❄️'}</span>
                            <span class="text-xs px-2.5 py-0.5 rounded font-bold" style="background:var(--bg-badge); border:1px solid var(--border-card); color:var(--color-accent)">${ageDesc.text}</span>
                            ${isAccounting ? '<span class="text-xs px-2.5 py-0.5 rounded font-bold" style="background:rgba(245,158,11,0.2); border:1px solid rgba(245,158,11,0.4); color:#d97706">⚠️ Contato Contábil</span>' : ''}
                        </div>
                        <p class="text-xs font-medium mt-1" style="color:var(--color-text-muted)">${ageDesc.commercial}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="dataHandlers.exportPdfProfissional(window._currentModalData)" class="btn-primary" style="font-size:0.75rem; padding:0.4rem 0.8rem; background:linear-gradient(135deg,#a855f7,#7c3aed)">📄 Exportar PDF</button>
                    <button onclick="dataHandlers.injetarLeadNoCRM(window._currentModalData)" class="btn-primary btn-warning" style="font-size:0.75rem; padding:0.4rem 0.8rem">🚀 Injetar no CRM</button>
                </div>
            </div>
            ${scoreInfo.reasons && scoreInfo.reasons.length > 0 ? `
            <div class="mt-3 pt-3 border-t text-xs" style="border-color:var(--border-card);">
                <p class="font-bold mb-1" style="color:var(--color-accent)">Aceleradores de Venda Detectados:</p>
                <ul class="list-disc pl-4 space-y-0.5 font-medium" style="color:var(--color-text)">
                    ${scoreInfo.reasons.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Informações Básicas -->
            <div style="background:var(--bg-badge); border:1px solid var(--border-card); border-radius:0.5rem; padding:1rem;">
                <div class="flex justify-between items-center cursor-pointer select-none mb-3" onclick="const s = this.nextElementSibling; const ind = this.querySelector('.sec-ind'); if (s.classList.contains('hidden')) { s.classList.remove('hidden'); ind.textContent = '▼'; } else { s.classList.add('hidden'); ind.textContent = '▶'; }">
                    <h3 class="font-bold text-base" style="color:var(--color-accent)">Informações Básicas</h3>
                    <span class="sec-ind text-xs font-bold" style="color:var(--color-text-muted)">▼</span>
                </div>
                <div class="space-y-2 text-sm">
                    <p><span style="color:var(--color-text-muted); font-weight:600">CNPJ:</span> <span style="color:var(--color-text); font-weight:600">${utils.formatCnpjForDisplay(result.cnpj)}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Razão Social:</span> <span style="color:var(--color-text); font-weight:600">${result.razao_social || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Inscrição Estadual (IE):</span> <span style="color:var(--color-text); font-weight:700">${result.inscricao_estadual || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Nome Fantasia:</span> <span style="color:var(--color-text); font-weight:600">${result.nome_fantasia || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Natureza Jurídica:</span> <span style="color:var(--color-text); font-weight:600">${result.natureza_juridica || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Porte:</span> <span style="color:var(--color-text); font-weight:600">${result.porte || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Situação:</span> <span style="color:var(--color-text); font-weight:600">${result.descricao_situacao_cadastral || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Abertura:</span> <span style="color:var(--color-text); font-weight:600">${result.data_inicio_atividade || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Capital Social:</span> <span style="color:var(--color-text); font-weight:600">${result.capital_social ? 'R$ ' + Number(result.capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Fonte API:</span> <span class="api-badge api-active">${result.api_origem || '?'}</span></p>
                </div>
            </div>

            <!-- Endereço & Contato -->
            <div style="background:var(--bg-badge); border:1px solid var(--border-card); border-radius:0.5rem; padding:1rem;">
                <div class="flex justify-between items-center cursor-pointer select-none mb-3" onclick="const s = this.nextElementSibling; const ind = this.querySelector('.sec-ind'); if (s.classList.contains('hidden')) { s.classList.remove('hidden'); ind.textContent = '▼'; } else { s.classList.add('hidden'); ind.textContent = '▶'; }">
                    <h3 class="font-bold text-base" style="color:var(--color-accent)">Endereço & Contato</h3>
                    <span class="sec-ind text-xs font-bold" style="color:var(--color-text-muted)">▼</span>
                </div>
                <div class="space-y-2 text-sm">
                    <p><span style="color:var(--color-text-muted); font-weight:600">Endereço:</span> <span style="color:var(--color-text); font-weight:600">${result.logradouro || ''}, ${result.numero || 'S/N'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Complemento:</span> <span style="color:var(--color-text); font-weight:600">${result.complemento || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Bairro:</span> <span style="color:var(--color-text); font-weight:600">${result.bairro || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Cidade/UF:</span> <span style="color:var(--color-text); font-weight:600">${result.municipio || '-'} / ${result.uf || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">CEP:</span> <span style="color:var(--color-text); font-weight:600">${result.cep || '-'}</span></p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Telefone 1:</span> <span style="color:var(--color-text); font-weight:600">${result.ddd_telefone_1 || '-'}</span>
                        ${tel1.length >= 10 ? `<a href="https://wa.me/55${tel1}" target="_blank" style="color:#16a34a; font-weight:700; margin-left:8px; text-decoration:underline;">📱 WhatsApp</a>` : ''}</p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Telefone 2:</span> <span style="color:var(--color-text); font-weight:600">${result.ddd_telefone_2 || '-'}</span>
                        ${tel2.length >= 10 ? `<a href="https://wa.me/55${tel2}" target="_blank" style="color:#16a34a; font-weight:700; margin-left:8px; text-decoration:underline;">📱 WhatsApp</a>` : ''}</p>
                    <p><span style="color:var(--color-text-muted); font-weight:600">Email:</span> <span style="color:var(--color-text); font-weight:600">${result.email || '-'}</span></p>
                </div>
            </div>
        </div>`;

        // Atividades Econômicas
        html += `
        <div class="mt-6" style="background:var(--bg-badge); border:1px solid var(--border-card); border-radius:0.5rem; padding:1rem;">
            <div class="flex justify-between items-center cursor-pointer select-none mb-3" onclick="const s = this.nextElementSibling; const ind = this.querySelector('.sec-ind'); if (s.classList.contains('hidden')) { s.classList.remove('hidden'); ind.textContent = '▼'; } else { s.classList.add('hidden'); ind.textContent = '▶'; }">
                <h3 class="font-bold text-base" style="color:var(--color-accent)">Atividades Econômicas</h3>
                <span class="sec-ind text-xs font-bold" style="color:var(--color-text-muted)">▼</span>
            </div>
            <div class="text-sm">
                <p><span style="color:var(--color-text-muted); font-weight:600">Principal:</span> <span style="color:var(--color-text); font-weight:600">${result.cnae_fiscal || ''} — ${result.cnae_fiscal_descricao || '-'}</span></p>`;
        if (result.cnaes_secundarios && result.cnaes_secundarios.length > 0) {
            html += `<p style="color:var(--color-text-muted); font-weight:600; margin-top:8px">Secundárias:</p><ul style="list-style:disc; padding-left:1.5rem; margin-top:4px; color:var(--color-text); font-weight:500">`;
            result.cnaes_secundarios.forEach(c => {
                html += `<li>${c.codigo || ''} — ${c.descricao || '-'}</li>`;
            });
            html += `</ul>`;
        }
        html += `</div></div>`;

        // Quadro Societário
        if (result.qsa && result.qsa.length > 0) {
            html += `
            <div class="mt-6" style="background:var(--bg-badge); border:1px solid var(--border-card); border-radius:0.5rem; padding:1rem;">
                <div class="flex justify-between items-center cursor-pointer select-none mb-3" onclick="const s = this.nextElementSibling; const ind = this.querySelector('.sec-ind'); if (s.classList.contains('hidden')) { s.classList.remove('hidden'); ind.textContent = '▼'; } else { s.classList.add('hidden'); ind.textContent = '▶'; }">
                    <h3 class="font-bold text-base" style="color:var(--color-accent)">Quadro Societário</h3>
                    <span class="sec-ind text-xs font-bold" style="color:var(--color-text-muted)">▼</span>
                </div>
                <div class="space-y-3">`;
            result.qsa.forEach(s => {
                const nomeBusca = encodeURIComponent((s.nome_socio || '').trim().replace(/\s+/g, '+'));
                const socUrl = `https://casadosdados.com.br/solucao/cnpj?q=${nomeBusca}`;

                html += `<div style="background:var(--bg-input); border:1px solid var(--border-card); border-radius:0.5rem; padding:0.75rem;" class="text-sm">
                     <p style="color:var(--color-text); font-weight:700">${s.nome_socio || '-'}</p>
                     <p style="color:var(--color-text-muted); font-weight:500">${s.qualificacao_socio || ''} ${s.data_entrada_sociedade ? '• Entrada: ' + s.data_entrada_sociedade : ''}</p>
                     <div style="margin-top:0.4rem;">
                         <a href="${socUrl}" target="_blank" title="Buscar outras empresas de ${s.nome_socio} na Casa dos Dados" style="display:inline-flex;align-items:center;gap:0.25rem;font-size:0.75rem;font-weight:700;text-decoration:none;color:#6366f1;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);padding:0.2rem 0.5rem;border-radius:0.25rem;cursor:pointer;">
                             🏢 Ver Sociedades na Casa dos Dados
                         </a>
                     </div>
                </div>`;
            });
            html += `</div></div>`;
        }

        // Cadastro Nacional de Obras (CNO)
        if (result.cno && result.cno.obras && result.cno.obras.length > 0) {
            const hasActiveWorks = result.cno.obras.some(o => o.situacao?.descricao?.toUpperCase() === 'ATIVA');
            const statusColor = hasActiveWorks ? '#16a34a' : '#dc2626';
            html += `
            <div class="mt-6" style="background:var(--bg-badge); border:1px solid var(--border-card); border-radius:0.5rem; padding:1rem;">
                <div class="flex justify-between items-center cursor-pointer select-none mb-3" onclick="const s = this.nextElementSibling; const ind = this.querySelector('.sec-ind'); if (s.classList.contains('hidden')) { s.classList.remove('hidden'); ind.textContent = '▼'; } else { s.classList.add('hidden'); ind.textContent = '▶'; }">
                    <h3 class="font-bold text-base flex items-center gap-2" style="color:var(--color-accent)">
                        🏗️ Cadastro Nacional de Obras (CNO)
                        <span class="text-xs px-2 py-0.5 rounded font-bold" style="background:var(--bg-badge); border:1px solid var(--border-card); color:${statusColor}">
                            ${result.cno.obras.length} obra(s) (${hasActiveWorks ? 'Possui Obras Ativas' : 'Sem Obras Ativas'})
                        </span>
                    </h3>
                    <span class="sec-ind text-xs font-bold" style="color:var(--color-text-muted)">▼</span>
                </div>
                <div class="space-y-3">`;
            result.cno.obras.forEach(o => {
                const isAct = o.situacao?.descricao?.toUpperCase() === 'ATIVA';
                const sColor = isAct ? '#16a34a' : '#dc2626';

                const addrParts = [
                    o.tipo_logradouro && o.tipo_logradouro !== 'OUTROS' ? o.tipo_logradouro : '',
                    o.logradouro || '',
                    o.numero && o.numero !== 'sn' && o.numero !== 'SN' ? o.numero : '',
                    o.complemento || '',
                    o.bairro || '',
                    o.municipio || '',
                    o.uf || '',
                    o.cep ? o.cep : ''
                ].filter(Boolean).join(', ');

                const addressUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrParts)}`;

                let mapLinks = `<a href="${addressUrl}" target="_blank"
                    title="Buscar endereço no Google Maps"
                    style="text-decoration:none; color:#0284c7; font-size:0.75rem; font-weight:700; display:inline-flex; align-items:center; gap:0.2rem; background:rgba(2,132,199,0.1); padding:0.2rem 0.5rem; border-radius:0.25rem; border:1px solid rgba(2,132,199,0.3); margin-right: 0.35rem;">
                    📍 Ver no Mapa
                </a>`;

                if (o.codigo_localizacao) {
                    const plusUrl = `https://maps.google.com/?q=${encodeURIComponent(o.codigo_localizacao)}`;
                    mapLinks += `<a href="${plusUrl}" target="_blank"
                        title="Abrir pelo código de localização: ${o.codigo_localizacao}"
                        style="text-decoration:none; color:#059669; font-size:0.75rem; font-weight:700; display:inline-flex; align-items:center; gap:0.2rem; background:rgba(5,150,105,0.1); padding:0.2rem 0.5rem; border-radius:0.25rem; border:1px solid rgba(5,150,105,0.3);">
                        🎯 Plus Code: ${o.codigo_localizacao}
                    </a>`;
                }

                html += `<div style="background:var(--bg-input); border:1px solid var(--border-card); border-radius:0.5rem; padding:0.75rem;" class="text-sm">
                    <div class="flex justify-between items-start mb-1">
                        <p style="color:var(--color-text); font-weight:700">${o.nome || o.nome_empresarial || 'Obra sem nome'}</p>
                        <span class="text-xs px-2 py-0.5 rounded font-bold" style="background:var(--bg-badge); border:1px solid var(--border-card); color:${sColor}">
                            ${o.situacao?.descricao || 'ATIVA'}
                        </span>
                    </div>
                    <p style="color:var(--color-text-muted); font-weight:500">CNO: <span style="color:var(--color-text); font-weight:600">${o.cno || '-'}</span> • Início: <span style="color:var(--color-text); font-weight:600">${o.data_inicio || '-'}</span> • Área: <span style="color:var(--color-text); font-weight:600">${o.area_total || '0'} ${o.unidade_medida || 'm²'}</span></p>
                    <p style="color:var(--color-text-muted); font-weight:500" class="text-xs mt-1">Endereço: ${o.tipo_logradouro || ''} ${o.logradouro || ''}, ${o.numero || ''} ${o.complemento ? '(' + o.complemento + ')' : ''} - ${o.bairro || ''}, ${o.municipio || ''}/${o.uf || ''}</p>
                    <div style="margin-top:0.4rem;">
                        ${mapLinks}
                    </div>
                </div>`;
            });
            html += `</div></div>`;
        } else if (document.getElementById('cnoEnabled')?.checked) {
            html += `
            <div class="mt-6" style="background:var(--bg-badge); border:1px solid var(--border-card); border-radius:0.5rem; padding:1rem;">
                <div class="flex justify-between items-center cursor-pointer select-none mb-1">
                    <h3 class="font-bold text-base flex items-center gap-2" style="color:var(--color-accent)">🏗️ Cadastro Nacional de Obras (CNO)</h3>
                </div>
                <div class="text-xs font-semibold mt-1" style="color:var(--color-text-muted)">Nenhuma obra localizada para este CNPJ.</div>
            </div>`;
        }

        // Histórico de Enriquecimento Profundo (Multi-API)
        if (result.deepMergeLogs && result.deepMergeLogs.length > 0) {
            html += `
            <div class="mt-6" style="background:var(--bg-badge); border:1px solid var(--border-card); border-radius:0.5rem; padding:1rem;">
                <h3 class="font-bold text-base mb-2 flex items-center gap-2" style="color:var(--color-accent)">🔍 Histórico de Enriquecimento Profundo (Multi-API)</h3>
                <ul class="space-y-1.5 text-xs font-semibold" style="color:var(--color-text)">
                    ${result.deepMergeLogs.map(log => `<li class="flex items-center gap-1">${log}</li>`).join('')}
                </ul>
            </div>`;
        }

        content.innerHTML = html;
        modal.style.display = 'flex';
    },

    closeDetails() {
        const modal = document.getElementById('detailsModal');
        if (modal) modal.style.display = 'none';
    },

    // ===== §1.2 — UI DA FILA DE APIs =====
    renderApiQueueStatus() {
        const container = document.getElementById('apiQueueStatus');
        if (container) {
            container.innerHTML = state.apis.map(api => {
                let cls = api.active ? 'api-active' : 'api-inactive';
                if (api.isFallback && api.active) cls = 'api-fallback';
                
                let extraStatus = '';
                if (api.cooldownUntil && Date.now() < api.cooldownUntil) {
                    cls = 'api-fallback';
                    extraStatus = ' (⏳ Cooldown 429)';
                } else if (api.consecutiveFailures > 0) {
                    extraStatus = ` (${api.consecutiveFailures}✗)`;
                }

                const icon = api.active ? '✓' : '✗';
                const pingStr = api.ping ? ` ⚡${api.ping}ms` : '';
                const used = api.totalUsed > 0 ? ` [${api.totalUsed}]` : '';
                return `<span class="api-badge ${cls}" title="${api.name}: ${api.ping ? api.ping + 'ms' : 'Sem ping medido'}">${icon} ${api.name}${pingStr}${extraStatus}${used}</span>`;
            }).join('');
        }

        const orderingList = document.getElementById('apiOrderingList');
        if (orderingList) {
            orderingList.innerHTML = state.apis.map((api, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === state.apis.length - 1;
                return `
                <div class="flex items-center justify-between p-2 rounded" style="background:var(--bg-badge); border:1px solid var(--border-card);">
                    <label class="flex items-center gap-2 cursor-pointer text-sm font-medium" style="color:var(--color-text)">
                        <input type="checkbox" ${api.active ? 'checked' : ''} onchange="utils.toggleApiActive(${idx})" class="w-4 h-4 rounded" style="accent-color:#6366f1">
                        <span>${idx + 1}. ${api.name}</span>
                        ${api.isFallback ? '<span class="text-xs px-1.5 py-0.5 rounded" style="background:rgba(245,158,11,0.15); color:#f59e0b">Fallback</span>' : ''}
                    </label>
                    <div class="flex items-center gap-1">
                        <button type="button" onclick="utils.moveApiUp(${idx})" ${isFirst ? 'disabled style="opacity:0.3; cursor:not-allowed"' : ''} class="px-2.5 py-1 rounded text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors" style="background:var(--btn-sec-bg); border:1px solid var(--btn-sec-border); color:var(--color-text)">↑</button>
                        <button type="button" onclick="utils.moveApiDown(${idx})" ${isLast ? 'disabled style="opacity:0.3; cursor:not-allowed"' : ''} class="px-2.5 py-1 rounded text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors" style="background:var(--btn-sec-bg); border:1px solid var(--btn-sec-border); color:var(--color-text)">↓</button>
                    </div>
                </div>`;
            }).join('');
        }
    },

    // ===== §4.5 — RE-TENTATIVA INTELIGENTE DE CNPJs COM FALHA =====
    showFailedCnpjsModal() {
        const failedItems = state.results.filter(r => r && r.error);
        if (failedItems.length === 0) {
            alert('Excelente! Nenhum CNPJ apresentou erro ou falha no lote atual.');
            return;
        }

        const modal = document.getElementById('detailsModal');
        const content = document.getElementById('detailsContent');
        if (!modal || !content) return;

        let html = `
        <div class="flex items-center justify-between pb-3 border-b border-gray-700/30">
            <div>
                <h2 class="text-xl font-bold" style="color:#ef4444">⚠️ CNPJs com Falha de Consulta (${failedItems.length})</h2>
                <p class="text-xs" style="color:var(--color-text-muted)">Escolha como deseja re-tentar a busca destes CNPJs nas APIs disponíveis:</p>
            </div>
            <button onclick="uiControllers.closeDetails()" class="text-gray-400 hover:text-white font-bold text-lg px-2">✕</button>
        </div>

        <div class="my-4 flex flex-wrap gap-2">
            <button onclick="uiControllers.retryFailedCnpjs('untried_only')" class="px-3 py-2 rounded text-xs font-bold text-white shadow" style="background:linear-gradient(135deg,#0284c7,#0369a1); cursor:pointer;">
                🔄 Re-tentar apenas com APIs NÃO consultadas (ex: Casa dos Dados, CNPJa, Invertexto)
            </button>
            <button onclick="uiControllers.retryFailedCnpjs('all_apis')" class="px-3 py-2 rounded text-xs font-bold text-white shadow" style="background:linear-gradient(135deg,#6366f1,#4f46e5); cursor:pointer;">
                ⚡ Re-tentar TODAS as APIs novamente
            </button>
        </div>

        <div class="space-y-3 max-h-96 overflow-y-auto pr-1">`;

        failedItems.forEach(item => {
            const formattedCnpj = utils.formatCnpjForDisplay(item.cnpj);
            
            html += `
            <div class="p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs" style="background:var(--bg-badge); border:1px solid var(--border-card);">
                <div>
                    <span class="font-bold text-sm" style="color:var(--color-text)">${formattedCnpj}</span>
                    <span class="ml-2 font-semibold" style="color:#ef4444">${item.errorMessage || 'Falhou nas APIs'}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="uiControllers.retrySingleCnpj('${item.cnpj}', 'untried_only')" class="px-2.5 py-1 rounded text-xs font-bold text-white" style="background:#0284c7; cursor:pointer;" title="Re-testa usando APIs ainda não tentadas para este CNPJ (ex: Casa dos Dados)">
                        🔄 Apenas Não Usadas
                    </button>
                    <button onclick="uiControllers.retrySingleCnpj('${item.cnpj}', 'all_apis')" class="px-2.5 py-1 rounded text-xs font-bold text-white" style="background:#6366f1; cursor:pointer;" title="Força a busca em todas as APIs ativas">
                        ⚡ Todas APIs
                    </button>
                </div>
            </div>`;
        });

        html += `</div>`;
        content.innerHTML = html;
        modal.style.display = 'flex';
    },

    async retrySingleCnpj(cnpj, mode = 'untried_only') {
        const index = state.results.findIndex(r => r && r.cnpj === cnpj);
        if (index === -1) return;

        const target = state.results[index];
        utils.updateStatus(`🔄 Re-tentando CNPJ ${utils.formatCnpjForDisplay(cnpj)} (${mode === 'untried_only' ? 'APIs não usadas' : 'todas as APIs'})...`);

        if (mode === 'all_apis') {
            state.apis.forEach(a => {
                a.active = true;
                a.consecutiveFailures = 0;
                a.cooldownUntil = null;
            });
        }

        const formattedCnpj = utils.formatCnpjForApi(cnpj);
        let apisToTry = state.apis.filter(a => a.active);

        // Se untried_only, prioriza APIs como Casa dos Dados / CNPJa / Invertexto ou APIs que ainda não haviam falhado para este CNPJ
        if (mode === 'untried_only' && target.failures && target.failures.length > 0) {
            const triedNames = target.failures.map(f => f.split(':')[0].trim());
            const untried = apisToTry.filter(a => !triedNames.includes(a.name));
            if (untried.length > 0) {
                apisToTry = untried;
            } else {
                apisToTry = state.apis.filter(a => a.id === 'casadosdados' || a.id === 'cnpja' || a.id === 'invertexto' || a.id === 'opencnpj');
            }
        }

        let successData = null;
        for (const api of apisToTry) {
            try {
                const data = await dataHandlers.fetchWithApi(api, formattedCnpj);
                if (data) {
                    successData = data;
                    break;
                }
            } catch (err) {
                console.warn(`[Retry Single] ${api.name} → ${cnpj}: ${err.message}`);
            }
        }

        if (successData) {
            const scoreInfo = utils.calculateB2bScore(successData);
            successData.scoreInfo = scoreInfo;
            state.results[index] = successData;
            this.addResultToTable(successData, index);
            utils.updateStatus(`✅ CNPJ ${utils.formatCnpjForDisplay(cnpj)} recuperado com sucesso via ${successData.api_origem}!`);
        } else {
            utils.updateStatus(`❌ CNPJ ${utils.formatCnpjForDisplay(cnpj)} não pôde ser recuperado nas APIs consultadas.`);
        }

        utils.updateStats();
        this.applyFilters();
    },

    async retryFailedCnpjs(mode = 'untried_only') {
        const failedItems = state.results.filter(r => r && r.error);
        if (failedItems.length === 0) return alert('Nenhum CNPJ com falha para re-tentar.');

        this.closeDetails();
        utils.updateStatus(`🔄 Re-tentando ${failedItems.length} CNPJs com falha...`);

        for (const item of failedItems) {
            await this.retrySingleCnpj(item.cnpj, mode);
            await utils.sleep(300);
        }

        utils.updateStatus('✅ Re-tentativa de CNPJs com falha concluída!');
    }
};

// ========================= INICIALIZAÇÃO =========================
function init() {
    // Carrega ordem customizada de APIs se existir
    if (typeof utils !== 'undefined' && utils.loadApiOrder) {
        utils.loadApiOrder();
    }

    // Theme Switcher Logic
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeToggleIcon = document.getElementById('themeToggleIcon');
    const themeToggleText = document.getElementById('themeToggleText');

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('theme-dark');
            document.body.classList.remove('theme-light');
            if (themeToggleIcon) themeToggleIcon.textContent = '🌙';
            if (themeToggleText) themeToggleText.textContent = 'Modo Escuro';
        } else {
            document.body.classList.remove('theme-dark');
            document.body.classList.add('theme-light');
            if (themeToggleIcon) themeToggleIcon.textContent = '☀️';
            if (themeToggleText) themeToggleText.textContent = 'Modo Claro';
        }
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    themeToggleBtn?.addEventListener('click', () => {
        const isDark = document.body.classList.contains('theme-dark');
        const nextTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('theme', nextTheme);
        applyTheme(nextTheme);
    });

    // CNO Checkboxes Logic
    const cnoEnabledCheckbox = document.getElementById('cnoEnabled');
    const cnoOnlyActiveWrapper = document.getElementById('cnoOnlyActiveWrapper');
    const cnoOnlyActiveCheckbox = document.getElementById('cnoOnlyActive');

    function toggleCnoSubFilter() {
        if (cnoEnabledCheckbox && cnoEnabledCheckbox.checked) {
            cnoOnlyActiveWrapper?.classList.remove('hidden');
        } else {
            cnoOnlyActiveWrapper?.classList.add('hidden');
            if (cnoOnlyActiveCheckbox) cnoOnlyActiveCheckbox.checked = false;
        }
    }
    cnoEnabledCheckbox?.addEventListener('change', toggleCnoSubFilter);
    toggleCnoSubFilter();

    // Preferência de Colapso/Expansão Default
    const expandCheck = document.getElementById('expandResultsDefault');
    if (expandCheck) {
        const savedExpand = localStorage.getItem('expandResultsDefault');
        if (savedExpand !== null) {
            expandCheck.checked = savedExpand === 'true';
        } else {
            expandCheck.checked = false; // default is collapsed
        }
        expandCheck.addEventListener('change', () => {
            localStorage.setItem('expandResultsDefault', expandCheck.checked);
            uiControllers.renderGroupedResults();
        });
    }

    // Mapear todos os elementos DOM
    Object.assign(elements, {
        csvFile: document.getElementById('csvFile'),
        cnpjListTextarea: document.getElementById('cnpjList'),
        loadCsvBtn: document.getElementById('loadCsvBtn'),
        loadListBtn: document.getElementById('loadListBtn'),
        controlsSection: document.getElementById('controlsSection'),
        resultsSection: document.getElementById('resultsSection'),
        progressBar: document.getElementById('progressBar'),
        statusText: document.getElementById('statusText'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        startBtn: document.getElementById('startBtn'),
        pauseBtn: document.getElementById('pauseBtn'),
        resumeBtn: document.getElementById('resumeBtn'),
        stopBtn: document.getElementById('stopBtn'),
        exportMaposcopeBtn: document.getElementById('exportMaposcopeBtn'),
        exportCompletoBtn: document.getElementById('exportCompletoBtn'),
        resultsTable: document.getElementById('resultsTable'),
        resultsBody: document.getElementById('resultsBody'),
        apiDelayInput: document.getElementById('apiDelay'),
        maxParallelRequestsInput: document.getElementById('maxParallelRequests'),
        autoPauseEnabledCheckbox: document.getElementById('autoPauseEnabled'),
        autoPauseDelayInput: document.getElementById('autoPauseDelay')
    });

    // Event Listeners — botões principais
    elements.loadCsvBtn?.addEventListener('click', () => uiControllers.loadFromCsv());
    elements.loadListBtn?.addEventListener('click', () => uiControllers.loadFromText());
    elements.startBtn?.addEventListener('click', () => uiControllers.startProcessing());
    elements.pauseBtn?.addEventListener('click', () => uiControllers.pauseProcessing());
    elements.resumeBtn?.addEventListener('click', () => uiControllers.resumeProcessing());
    elements.stopBtn?.addEventListener('click', () => uiControllers.stopProcessing());
    elements.exportMaposcopeBtn?.addEventListener('click', () => dataHandlers.exportMaposcope());
    elements.exportCompletoBtn?.addEventListener('click', () => dataHandlers.exportCompleto());

    // Event Listeners — Agrupamento
    document.getElementById('groupRoot')?.addEventListener('change', () => uiControllers.renderGroupedResults());
    document.getElementById('groupCity')?.addEventListener('change', () => uiControllers.renderGroupedResults());

    // Botão "Testar Todas"
    document.getElementById('testAllApisBtn')?.addEventListener('click', async () => {
        utils.updateStatus('Testando APIs...');
        await dataHandlers.testApisConnection();
        uiControllers.renderApiQueueStatus();
        utils.updateStatus('Teste concluído.');
    });

    // Botões da pausa automática
    document.getElementById('testConnectionBtn')?.addEventListener('click', async () => {
        const status = document.getElementById('connectionTestStatus');
        if (status) status.textContent = 'Testando...';
        const result = await dataHandlers.testApisConnection();
        uiControllers.renderApiQueueStatus();
        if (status) {
            status.textContent = result.anyWorking ? '✅ API(s) disponível!' : '❌ Todas indisponíveis';
            status.style.color = result.anyWorking ? '#4ade80' : '#f87171';
        }
    });

    document.getElementById('cancelAutoPauseBtn')?.addEventListener('click', () => {
        if (state.autoPauseTimer) { clearTimeout(state.autoPauseTimer); state.autoPauseTimer = null; }
        if (countdownTimer.timerElement) countdownTimer.stop();
        state.isAutoPaused = false;
        const a = document.getElementById('autoPauseAlert');
        if (a) { a.style.display = 'none'; a.classList.remove('pulse'); }
        uiControllers.resumeProcessing();
    });

    // Modal — delegação de evento
    // Garante que closeDetails seja acessível globalmente (para onclick inline e outros contextos)
    window.closeDetails = () => uiControllers.closeDetails();

    document.getElementById('closeModalBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        uiControllers.closeDetails();
    });
    document.getElementById('detailsModal')?.addEventListener('click', (e) => {
        // Fecha ao clicar no overlay (fundo escuro), mas não ao clicar no conteúdo
        if (!e.target.closest('.modal-content')) uiControllers.closeDetails();
    });

    // Delegação para botões "Ver" na tabela
    elements.resultsBody?.addEventListener('click', (e) => {
        if (e.target.classList.contains('details-btn')) {
            const idx = parseInt(e.target.getAttribute('data-index'));
            if (state.results[idx] && !state.results[idx].error) {
                uiControllers.showDetails(state.results[idx]);
            }
        }
    });

    // Exportação desabilitada inicialmente
    [elements.exportMaposcopeBtn, elements.exportCompletoBtn].forEach(btn => {
        if (btn) { btn.disabled = true; btn.classList.add('opacity-50'); }
    });

    // Inicializar Blocklist (já-atendidos) — carregar localStorage e wire-up events
    // Toggle do painel
    document.getElementById('blocklistToggleBtn')?.addEventListener('click', () => blocklistController.toggle());

    // Botões da blocklist
    document.getElementById('loadBlocklistBtn')?.addEventListener('click', () => blocklistController.load());
    document.getElementById('clearBlocklistBtn')?.addEventListener('click', () => blocklistController.clear());
    document.getElementById('downloadBlocklistRawBtn')?.addEventListener('click', () => dataHandlers.downloadBlocklistRaw());

    // Botões de exportação dos já-atendidos (Fase 2)
    document.getElementById('downloadAtendidosEnriquecidosBtn')?.addEventListener('click', () => dataHandlers.downloadAtendidosEnriquecidos());
    document.getElementById('exportCompletoComAtendeBtn')?.addEventListener('click', () => dataHandlers.exportCompletoComAtende());
    document.getElementById('exportCpfSocioBtn')?.addEventListener('click', () => dataHandlers.exportCpfSocioReport());

    // Carregar blocklist do localStorage ao abrir
    blocklistController.loadFromStorage();

    // Inicializar Mining Engine (Fase 1)
    if (typeof MiningEngine !== 'undefined') {
        MiningEngine.init();
    }

    console.log('%c✅ GetLista Prospecta carregado com sucesso!', 'background:#4ade80; color:#064e3b; padding:4px 8px; border-radius:4px; font-weight:bold');
}

document.addEventListener('DOMContentLoaded', init);

// ========================= BLOCKLIST CONTROLLER =========================
// Gerencia o estado e a UI dos CNPJs já atendidos (blocklist) e CPFs (possíveis sócios)
const blocklistController = {

    // Normaliza e classifica uma entrada da lista
    _normalizeEntry(raw) {
        if (!raw) return { type: 'invalid', value: null };
        const clean = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (clean.length === 0) return { type: 'invalid', value: null };

        // CPF: exatamente 11 dígitos NUMÉRICOS
        if (/^\d{11}$/.test(clean)) {
            return { type: 'cpf', value: clean };
        }

        // CNPJ numérico incompleto (9–13 dígitos): aplica zero-left padStart para 14
        if (/^\d{9,13}$/.test(clean)) {
            return { type: 'cnpj', value: clean.padStart(14, '0'), wasPadded: true };
        }

        // CNPJ completo (14 caracteres A-Z0-9, últimos 2 numéricos)
        if (/^[A-Z0-9]{12}[0-9]{2}$/.test(clean)) {
            return { type: 'cnpj', value: clean };
        }

        // Raiz CNPJ (8 caracteres A-Z0-9, exclui todas as filiais)
        if (/^[A-Z0-9]{8}$/.test(clean)) {
            return { type: 'root', value: clean };
        }

        return { type: 'invalid', value: clean };
    },

    // Carrega a blocklist a partir da textarea, salva no state e no localStorage
    load() {
        const textarea = document.getElementById('blocklistTextarea');
        const raw = textarea?.value?.trim() || '';
        const lines = raw.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

        state.cnpjsJaAtendidos = new Set();
        state.cpfsJaAtendidos = [];
        let stats = { cnpj: 0, root: 0, cpf: 0, invalid: 0, padded: 0 };

        lines.forEach(line => {
            const { type, value, wasPadded } = this._normalizeEntry(line);
            if (type === 'cnpj') {
                state.cnpjsJaAtendidos.add(value);
                stats.cnpj++;
                if (wasPadded) stats.padded++;
            } else if (type === 'root') {
                state.cnpjsJaAtendidos.add(value);
                stats.root++;
            } else if (type === 'cpf') {
                state.cpfsJaAtendidos.push(value);
                stats.cpf++;
            } else {
                stats.invalid++;
            }
        });

        const totalPj = state.cnpjsJaAtendidos.size;

        // Salvar no localStorage
        localStorage.setItem('getlista_blocklist', JSON.stringify(Array.from(state.cnpjsJaAtendidos)));
        localStorage.setItem('getlista_blocklist_cpfs', JSON.stringify(state.cpfsJaAtendidos));

        // Atualizar UI
        this._updateUIStats(totalPj, stats.cpf, stats.invalid);

        // Feedback
        const msg = `✅ ${totalPj} PJ(s) (${stats.padded} c/ zero-pad, ${stats.root} raízes) e ${stats.cpf} CPF(s) (possíveis sócios) carregados` +
            (stats.invalid > 0 ? ` | ⚠️ ${stats.invalid} linha(s) inválida(s) ignorada(s).` : '.');
        this._showStatus(msg);

        if (typeof utils !== 'undefined') {
            utils.updateStatus(`🚫 Blocklist: ${totalPj} PJs e ${stats.cpf} CPFs carregados.`);
        }
    },

    // Limpa toda a blocklist
    clear() {
        if (!confirm('Limpar toda a blocklist e lista de CPFs?')) return;
        state.cnpjsJaAtendidos = new Set();
        state.cpfsJaAtendidos = [];
        state.resultsJaAtendidos = [];
        state.cpfSocioMatches = [];
        localStorage.removeItem('getlista_blocklist');
        localStorage.removeItem('getlista_blocklist_cpfs');
        const textarea = document.getElementById('blocklistTextarea');
        if (textarea) textarea.value = '';
        this._updateUIStats(0, 0, 0);
        this._showStatus('Blocklist limpa. Nenhum CNPJ será excluído e nenhum CPF será cruzado.');
    },

    // Carrega do localStorage (chamado no init)
    loadFromStorage() {
        try {
            const savedPj = localStorage.getItem('getlista_blocklist');
            const savedCpf = localStorage.getItem('getlista_blocklist_cpfs');

            if (savedPj) {
                const arrPj = JSON.parse(savedPj);
                if (Array.isArray(arrPj) && arrPj.length > 0) {
                    state.cnpjsJaAtendidos = new Set(arrPj);
                }
            }
            if (savedCpf) {
                const arrCpf = JSON.parse(savedCpf);
                if (Array.isArray(arrCpf) && arrCpf.length > 0) {
                    state.cpfsJaAtendidos = arrCpf;
                }
            }

            const totalPj = state.cnpjsJaAtendidos ? state.cnpjsJaAtendidos.size : 0;
            const totalCpf = state.cpfsJaAtendidos ? state.cpfsJaAtendidos.length : 0;

            if (totalPj > 0 || totalCpf > 0) {
                const textarea = document.getElementById('blocklistTextarea');
                if (textarea && textarea.value.trim() === '') {
                    const allLines = [...Array.from(state.cnpjsJaAtendidos), ...(state.cpfsJaAtendidos || [])];
                    textarea.value = allLines.join('\n');
                }
                this._updateUIStats(totalPj, totalCpf, 0);
                this._showStatus(`💾 ${totalPj} PJs e ${totalCpf} CPFs carregados do histórico (localStorage).`);
            }
        } catch (e) {
            console.warn('[Blocklist] Erro ao carregar localStorage:', e);
        }
    },

    // Atualiza badges e botões da UI
    _updateUIStats(totalPj, totalCpf, totalInvalid) {
        const pjBadge = document.getElementById('blocklistCounterBadge');
        const cpfBadge = document.getElementById('blocklistCpfBadge');
        const invalidBadge = document.getElementById('blocklistInvalidBadge');
        const downloadBtn = document.getElementById('downloadBlocklistRawBtn');

        if (pjBadge) {
            if (totalPj > 0) {
                pjBadge.textContent = `${totalPj} PJ${totalPj !== 1 ? 's' : ''}`;
                pjBadge.classList.remove('hidden');
            } else {
                pjBadge.classList.add('hidden');
            }
        }

        if (cpfBadge) {
            if (totalCpf > 0) {
                cpfBadge.textContent = `${totalCpf} CPF${totalCpf !== 1 ? 's' : ''} (sócios)`;
                cpfBadge.classList.remove('hidden');
            } else {
                cpfBadge.classList.add('hidden');
            }
        }

        if (invalidBadge) {
            if (totalInvalid > 0) {
                invalidBadge.textContent = `${totalInvalid} inválido${totalInvalid !== 1 ? 's' : ''}`;
                invalidBadge.classList.remove('hidden');
            } else {
                invalidBadge.classList.add('hidden');
            }
        }

        if (downloadBtn) {
            const total = totalPj + totalCpf;
            downloadBtn.disabled = total === 0;
            downloadBtn.style.opacity = total > 0 ? '1' : '0.5';
            downloadBtn.title = total > 0 ? `Baixar lista com ${total} registros` : 'Carregue a blocklist primeiro';
        }
    },

    // Exibe mensagem de status no painel
    _showStatus(msg) {
        const el = document.getElementById('blocklistStatusMsg');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
        clearTimeout(this._statusTimer);
        this._statusTimer = setTimeout(() => el.classList.add('hidden'), 8000);
    },

    // Colapsa/expande o conteúdo do painel
    toggle() {
        const content = document.getElementById('blocklistContent');
        const icon = document.getElementById('blocklistToggleIcon');
        if (!content) return;
        const isHidden = content.classList.contains('hidden');
        content.classList.toggle('hidden');
        if (icon) icon.textContent = isHidden ? '▼' : '▶';
    }
};
