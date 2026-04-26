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
    async startProcessing() {
        if (state.isProcessing) return;
        if (state.cnpjList.length === 0) return alert('Carregue CNPJs primeiro.');

        // Ler configs da UI
        state.apiDelay = parseInt(elements.apiDelayInput?.value) || 300;
        state.maxParallelRequests = parseInt(elements.maxParallelRequestsInput?.value) || 3;
        state.autoPauseEnabled = elements.autoPauseEnabledCheckbox?.checked ?? true;
        state.autoPauseDelay = parseInt(elements.autoPauseDelayInput?.value) || 30;

        state.isProcessing = true;
        state.isPaused = false;
        state.consecutiveErrors = 0;
        state.pendingRequests = [];
        // Re-ativar APIs que foram desativadas em rodadas anteriores
        state.apis.forEach(api => { api.active = true; api.consecutiveFailures = 0; });

        if (typeof backoffStrategy !== 'undefined') backoffStrategy.reset();
        if (state.autoPauseTimer) { clearTimeout(state.autoPauseTimer); state.autoPauseTimer = null; }

        const alert_el = document.getElementById('autoPauseAlert');
        if (alert_el) alert_el.style.display = 'none';

        elements.startBtn.classList.add('hidden');
        elements.pauseBtn.classList.remove('hidden');
        elements.resumeBtn.classList.add('hidden');

        utils.showLoading();

        // §1.2 — Testar conexões antes de iniciar
        utils.updateStatus('Testando conexões das APIs...');
        const testResult = await dataHandlers.testApisConnection();
        this.renderApiQueueStatus();

        if (!testResult.anyWorking) {
            utils.updateStatus('⚠ Nenhuma API respondeu. Verifique sua conexão.');
            utils.hideLoading();
            elements.startBtn.classList.remove('hidden');
            elements.pauseBtn.classList.add('hidden');
            state.isProcessing = false;
            return;
        }

        utils.updateStatus('Iniciando consultas...');
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
        utils.hideLoading();
        const done = state.results.filter(r => r !== undefined).length;
        utils.updateStatus(`Pausado. ${done}/${state.cnpjList.length} processados.`);
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
        utils.hideLoading();

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
            if (index >= state.cnpjList.length || state.isPaused) return;
            const cnpj = state.cnpjList[index];
            state.requestsInProgress++;

            try {
                if (state.isPaused) { state.requestsInProgress--; return; }

                const result = await dataHandlers.fetchCnpjData(cnpj);
                if (result.aborted || state.isPaused) { state.requestsInProgress--; return; }

                state.results[index] = result;
                setTimeout(() => this.addResultToTable(result, index), 0);

                const count = state.results.filter(r => r !== undefined).length;
                if (!state.isPaused) {
                    utils.updateStatus(`Processados ${count} de ${state.cnpjList.length} CNPJs...`);
                    utils.updateProgressBar(count, state.cnpjList.length);
                    utils.updateStats();
                }
                if (count >= state.cnpjList.length) this.completeProcessing();

            } catch (err) {
                if (!state.isPaused) {
                    state.results[index] = { cnpj, error: true, errorMessage: err.message };
                    setTimeout(() => this.addResultToTable(state.results[index], index), 0);
                    if (err.message.includes('Nenhuma API')) this.triggerAutoPause(err.message, 'rate_limit');
                }
            } finally {
                state.requestsInProgress--;
                this.renderApiQueueStatus();
                if (!state.isPaused) {
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
        elements.startBtn.classList.remove('hidden');
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
    },

    // ===== §4.3 — TABELA COM VIRTUALIZAÇÃO LEVE =====
    addResultToTable(result, index) {
        // Limita renderização DOM a MAX_VISIBLE_ROWS linhas
        const MAX_VISIBLE_ROWS = 200;
        let row = document.querySelector(`.result-row-${index}`);

        if (!row && elements.resultsBody.children.length >= MAX_VISIBLE_ROWS) {
            // Atualiza info mas não renderiza a linha
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
            row.className = `result-row-${index}`;
            elements.resultsBody.appendChild(row);
        }

        if (result.error) {
            row.innerHTML = `
                <td>${utils.formatCnpjForDisplay(result.cnpj)}</td>
                <td colspan="6" style="color:#f87171">${result.errorMessage}</td>
                <td></td>`;
        } else {
            row.innerHTML = `
                <td>${utils.formatCnpjForDisplay(result.cnpj)}</td>
                <td>${result.razao_social || '-'}</td>
                <td>${result.nome_fantasia || '-'}</td>
                <td>${result.descricao_situacao_cadastral || '-'}</td>
                <td>${result.municipio || '-'}/${result.uf || '-'}</td>
                <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${result.cnae_fiscal_descricao || ''}">${result.cnae_fiscal_descricao || '-'}</td>
                <td><span class="api-badge ${result.api_origem === 'Invertexto' ? 'api-fallback' : 'api-active'}">${result.api_origem || '?'}</span></td>
                <td><button class="details-btn" data-index="${index}">Ver</button></td>`;
        }
    },

    // ===== §4.4 — RENDERIZAÇÃO DE GRUPOS (FASE 2) =====
    renderGroupedResults() {
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
        
        state.results.forEach((r, idx) => {
            if (!r || r.error) return;
            
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
        
        groups.forEach((groupData, key) => {
            const color = highContrastColors[colorIndex % highContrastColors.length];
            colorIndex++;
            
            html += `<div class="cnpj-group">
                <div class="cnpj-group-header">
                    <span class="count" style="background-color: ${color};">${groupData.members.length}x</span>
                    <span>${key}</span>
                </div>
                <ul class="cnpj-members-list">`;
                
            groupData.members.forEach(member => {
                const r = member.result;
                const cnpjFormatted = utils.formatCnpjForDisplay(r.cnpj);
                let cnpjDisplay = cnpjFormatted;
                
                if (groupRoot && groupData.root && cnpjFormatted.length >= 10) {
                    cnpjDisplay = `<mark style="background-color: ${color};">${cnpjFormatted.substring(0, 10)}</mark>${cnpjFormatted.substring(10)}`;
                }
                
                html += `<li>
                    <div>
                        ${cnpjDisplay} - <span style="color:#e2e8f0">${r.razao_social || 'Sem Nome'}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs" style="color:#64748b">${r.municipio || ''}/${r.uf || ''}</span>
                        <button class="details-btn px-2 py-1 text-xs rounded hover:bg-gray-600" style="background:rgba(255,255,255,0.1); border:none; color:white; cursor:pointer;" data-index="${member.index}">Ver</button>
                    </div>
                </li>`;
            });
            
            html += `</ul></div>`;
        });
        
        container.innerHTML = html;
        
        container.querySelectorAll('.details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                if (!isNaN(idx)) uiControllers.showDetails(state.results[idx]);
            });
        });
    },

    // ===== MODAL DE DETALHES COMPLETO =====
    showDetails(result) {
        if (!result || result.error) return;

        const modal = document.getElementById('detailsModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');

        title.textContent = `${result.razao_social || 'Detalhes'} — ${utils.formatCnpjForDisplay(result.cnpj)}`;

        const tel1 = utils.cleanPhone(result.ddd_telefone_1);
        const tel2 = utils.cleanPhone(result.ddd_telefone_2);

        let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h3 class="font-medium text-indigo-300 mb-3">Informações Básicas</h3>
                <div class="space-y-2 text-sm" style="color:#cbd5e1">
                    <p><span style="color:#94a3b8">CNPJ:</span> ${utils.formatCnpjForDisplay(result.cnpj)}</p>
                    <p><span style="color:#94a3b8">Razão Social:</span> ${result.razao_social || '-'}</p>
                    <p><span style="color:#94a3b8">Nome Fantasia:</span> ${result.nome_fantasia || '-'}</p>
                    <p><span style="color:#94a3b8">Natureza Jurídica:</span> ${result.natureza_juridica || '-'}</p>
                    <p><span style="color:#94a3b8">Porte:</span> ${result.porte || '-'}</p>
                    <p><span style="color:#94a3b8">Situação:</span> ${result.descricao_situacao_cadastral || '-'}</p>
                    <p><span style="color:#94a3b8">Abertura:</span> ${result.data_inicio_atividade || '-'}</p>
                    <p><span style="color:#94a3b8">Capital Social:</span> ${result.capital_social ? 'R$ ' + Number(result.capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</p>
                    <p><span style="color:#94a3b8">Fonte:</span> <span class="api-badge api-active">${result.api_origem || '?'}</span></p>
                </div>
            </div>
            <div>
                <h3 class="font-medium text-indigo-300 mb-3">Endereço & Contato</h3>
                <div class="space-y-2 text-sm" style="color:#cbd5e1">
                    <p><span style="color:#94a3b8">Endereço:</span> ${result.logradouro || ''}, ${result.numero || 'S/N'}</p>
                    <p><span style="color:#94a3b8">Complemento:</span> ${result.complemento || '-'}</p>
                    <p><span style="color:#94a3b8">Bairro:</span> ${result.bairro || '-'}</p>
                    <p><span style="color:#94a3b8">Cidade/UF:</span> ${result.municipio || '-'} / ${result.uf || '-'}</p>
                    <p><span style="color:#94a3b8">CEP:</span> ${result.cep || '-'}</p>
                    <p><span style="color:#94a3b8">Telefone 1:</span> ${result.ddd_telefone_1 || '-'}
                        ${tel1.length >= 10 ? `<a href="https://wa.me/55${tel1}" target="_blank" style="color:#4ade80; margin-left:8px">📱 WhatsApp</a>` : ''}</p>
                    <p><span style="color:#94a3b8">Telefone 2:</span> ${result.ddd_telefone_2 || '-'}
                        ${tel2.length >= 10 ? `<a href="https://wa.me/55${tel2}" target="_blank" style="color:#4ade80; margin-left:8px">📱 WhatsApp</a>` : ''}</p>
                    <p><span style="color:#94a3b8">Email:</span> ${result.email || '-'}</p>
                </div>
            </div>
        </div>`;

        // Atividades Econômicas
        html += `<div class="mt-6">
            <h3 class="font-medium text-indigo-300 mb-3">Atividades Econômicas</h3>
            <div class="text-sm" style="color:#cbd5e1">
                <p><span style="color:#94a3b8">Principal:</span> ${result.cnae_fiscal || ''} — ${result.cnae_fiscal_descricao || '-'}</p>`;
        if (result.cnaes_secundarios && result.cnaes_secundarios.length > 0) {
            html += `<p style="color:#94a3b8; margin-top:8px">Secundárias:</p><ul style="list-style:disc; padding-left:1.5rem; margin-top:4px">`;
            result.cnaes_secundarios.forEach(c => {
                html += `<li>${c.codigo || ''} — ${c.descricao || '-'}</li>`;
            });
            html += `</ul>`;
        }
        html += `</div></div>`;

        // Quadro Societário
        if (result.qsa && result.qsa.length > 0) {
            html += `<div class="mt-6">
                <h3 class="font-medium text-indigo-300 mb-3">Quadro Societário</h3>
                <div class="space-y-3">`;
            result.qsa.forEach(s => {
                html += `<div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:0.5rem; padding:0.75rem;" class="text-sm" >
                    <p style="color:#e2e8f0; font-weight:500">${s.nome_socio || '-'}</p>
                    <p style="color:#94a3b8">${s.qualificacao_socio || ''} ${s.data_entrada_sociedade ? '• Entrada: ' + s.data_entrada_sociedade : ''}</p>
                </div>`;
            });
            html += `</div></div>`;
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
        if (!container) return;

        container.innerHTML = state.apis.map(api => {
            let cls = api.active ? 'api-active' : 'api-inactive';
            if (api.isFallback && api.active) cls = 'api-fallback';
            const icon = api.active ? '✓' : '✗';
            const fails = api.consecutiveFailures > 0 ? ` (${api.consecutiveFailures}✗)` : '';
            const used = api.totalUsed > 0 ? ` [${api.totalUsed}]` : '';
            return `<span class="api-badge ${cls}">${icon} ${api.name}${fails}${used}</span>`;
        }).join('');
    }
};

// ========================= INICIALIZAÇÃO =========================
function init() {
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

    // Inicializar Mining Engine (Fase 1)
    if (typeof MiningEngine !== 'undefined') {
        MiningEngine.init();
    }

    console.log('%c✅ GetLista Prospecta carregado com sucesso!', 'background:#4ade80; color:#064e3b; padding:4px 8px; border-radius:4px; font-weight:bold');
}

document.addEventListener('DOMContentLoaded', init);
