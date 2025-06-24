// =========================== SCRIPT DE APRIMORAMENTO DA INTERFACE ===========================
/**
 * Script responsável por adicionar melhorias na interface,
 * como seleção de APIs, indicadores de status, e relatórios de erros.
 */

const uiEnhancer = {
  /**
   * Inicializa as melhorias de interface
   */
  init() {
    // Verificar se o DOM está pronto antes de modificá-lo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEnhancements());
    } else {
      this.setupEnhancements();
    }
  },
  
  /**
   * Configura todas as melhorias na interface
   */
  setupEnhancements() {
    try {
      // Adicionar pequeno delay para garantir que outros scripts já foram carregados
      setTimeout(() => {
        this.addApiSelectorPanel();
        this.addClearCacheButton();
        this.enhanceStatusInfo();
        this.improveErrorDisplay();
        
        // Integrar cronômetro de contagem regressiva
        this.setupCountdownTimer();
        
        console.log('✅ Melhorias de interface aplicadas com sucesso');
      }, 1000);
    } catch (error) {
      console.error('Erro ao aplicar melhorias de interface:', error);
    }
  },
  
  /**
   * Adiciona seletor de APIs na interface
   */
  addApiSelectorPanel() {
    const configSection = document.querySelector('.bg-gray-50.p-4.rounded-lg.border.border-gray-200.mb-4');
    if (!configSection || document.getElementById('apiSelectionPanel')) return;
    
    const apiSelector = document.createElement('div');
    apiSelector.id = 'apiSelectionPanel';
    apiSelector.className = 'mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg';
    apiSelector.innerHTML = `
      <h3 class="font-medium mb-2 text-blue-800">Sistema de Fallback entre APIs</h3>
      <p class="text-sm text-blue-700 mb-3">
        Define a ordem de prioridade para a consulta. Se uma API falhar, o sistema tentará a próxima da lista.
      </p>
      <div id="apiOrderList" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
        </div>
      <div class="flex justify-between items-center mt-2 flex-wrap">
        <button id="testAllApisBtn" class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm mb-2 md:mb-0">
          Testar Todas as APIs
        </button>
        <div id="apiStatusIndicators" class="flex items-center space-x-2 flex-wrap">
          </div>
      </div>
    `;
    
    configSection.appendChild(apiSelector);
    this.populateApiSelectors();
    
    document.getElementById('testAllApisBtn')?.addEventListener('click', async () => {
      this.updateApiStatusIndicators('pending');
      try {
        const results = await window.apiTestSystem.testAllApiConnections();
        this.updateApiStatusIndicators(results);
      } catch (error) {
        console.error('Erro ao testar APIs:', error);
        this.updateApiStatusIndicators('error');
      }
    });
  },

  /**
   * Popula dinamicamente os seletores e indicadores de API (VERSÃO ATUALIZADA COM INVERTEXTO)
   */
  populateApiSelectors() {
      const apiOrderList = document.getElementById('apiOrderList');
      const apiStatusIndicators = document.getElementById('apiStatusIndicators');
      if (!apiOrderList || !apiStatusIndicators) return;

      const apiOptions = `
          <option value="BrasilAPI">BrasilAPI</option>
          <option value="Invertexto">Invertexto</option>
          <option value="PublicaCnpjWs">Publica CNPJ WS</option>
          <option value="minhaReceita">minhaReceita</option>
          <option value="ReceitaWS">ReceitaWS</option>
      `;

      // Ordem padrão na interface, conforme solicitado
      const initialOrder = ['BrasilAPI', 'Invertexto', 'PublicaCnpjWs', 'ReceitaWS', 'minhaReceita'];

      for (let i = 0; i < 5; i++) {
          const selectorContainer = document.createElement('div');
          selectorContainer.className = 'flex items-center';
          selectorContainer.innerHTML = `
              <span class="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-center font-medium mr-2">${i + 1}</span>
              <select id="api${i + 1}" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  ${apiOptions}
              </select>
          `;
          apiOrderList.appendChild(selectorContainer);
          if(initialOrder[i]) {
            document.getElementById(`api${i + 1}`).value = initialOrder[i];
          }
      }

      // Lista de APIs para os indicadores de status
      const allApis = ['BrasilAPI', 'Invertexto', 'PublicaCnpjWs', 'minhaReceita', 'ReceitaWS'];
      apiStatusIndicators.innerHTML = '<span class="text-xs text-gray-500 mr-2">Status:</span>';
      allApis.forEach(apiName => {
          const indicator = document.createElement('span');
          indicator.id = `status${apiName}`;
          indicator.className = 'px-2 py-1 rounded-full text-xs bg-gray-200';
          indicator.textContent = apiName.replace('Ws', 'WS');
          apiStatusIndicators.appendChild(indicator);
      });
  },
  
  /**
   * Atualiza os indicadores de status das APIs (VERSÃO ATUALIZADA COM INVERTEXTO)
   */
  updateApiStatusIndicators(results) {
    const apiNames = ['BrasilAPI', 'Invertexto', 'PublicaCnpjWs', 'minhaReceita', 'ReceitaWS'];
    
    apiNames.forEach(apiName => {
      const indicator = document.getElementById(`status${apiName}`);
      if (!indicator) return;
      
      indicator.className = 'px-2 py-1 rounded-full text-xs';
      
      const displayName = apiName.replace('Ws', 'WS');

      if (results === 'pending') {
        indicator.classList.add('bg-yellow-200', 'text-yellow-800');
        indicator.innerHTML = `<span class="animate-pulse">${displayName}</span>`;
      } else if (results === 'error') {
        indicator.classList.add('bg-red-200', 'text-red-800');
        indicator.textContent = displayName;
      } else if (typeof results === 'object' && results[apiName] !== undefined) {
        const status = results[apiName];
        if (status === true) {
          indicator.classList.add('bg-green-200', 'text-green-800');
          indicator.innerHTML = `${displayName} ✓`;
        } else {
          indicator.classList.add('bg-red-200', 'text-red-800');
          indicator.innerHTML = `${displayName} ✗`;
        }
      } else {
        indicator.classList.add('bg-gray-200', 'text-gray-800');
        indicator.textContent = displayName;
      }
    });
  },
  
  addClearCacheButton() {
    const buttonContainer = document.querySelector('#controlsSection .flex.flex-wrap.gap-3.mt-4');
    if (!buttonContainer || document.getElementById('clearCacheBtn')) return;
    
    const clearCacheBtn = document.createElement('button');
    clearCacheBtn.id = 'clearCacheBtn';
    clearCacheBtn.className = 'px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2';
    clearCacheBtn.innerHTML = '<span class="flex items-center"><svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>Limpar Cache</span>';
    
    clearCacheBtn.addEventListener('click', function() {
      if (confirm('Tem certeza que deseja limpar o cache de CNPJs consultados? Isso fará com que todos os CNPJs sejam reconsultados na API.')) {
        uiEnhancer.clearCnpjCache();
      }
    });
    
    buttonContainer.appendChild(clearCacheBtn);
  },
  
  clearCnpjCache() {
    try {
      if (typeof state !== 'undefined' && state.isProcessing && !state.isPaused) {
        alert('Por favor, pause o processamento antes de limpar o cache.');
        return;
      }
      
      const cacheSize = typeof state !== 'undefined' ? Object.keys(state.cnpjCache).length : 0;
      if (typeof state !== 'undefined') state.cnpjCache = {};
      
      if (typeof utils !== 'undefined') utils.updateStatus(`Cache limpo com sucesso! ${cacheSize} CNPJs removidos do cache.`);
      this.showCacheClearedFeedback();
      
      console.log(`Cache de CNPJs limpo. ${cacheSize} entradas removidas.`);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      alert('Ocorreu um erro ao limpar o cache. Verifique o console para mais detalhes.');
    }
  },
  
  showCacheClearedFeedback() {
    const statusText = document.getElementById('statusText');
    if (statusText) {
      const originalClass = statusText.className;
      statusText.classList.add('text-green-600', 'font-medium');
      setTimeout(() => {
        statusText.className = originalClass;
      }, 3000);
    }
    
    const cacheInfo = document.getElementById('cacheInfo');
    if (cacheInfo) {
      cacheInfo.textContent = 'Cache: 0 CNPJ(s)';
      cacheInfo.classList.add('hidden');
    }
  },
  
  enhanceStatusInfo() {
    const statusContainer = document.getElementById('statusText')?.parentNode;
    if (!statusContainer || document.getElementById('cacheInfo')) return;
    
    const cacheInfo = document.createElement('span');
    cacheInfo.id = 'cacheInfo';
    cacheInfo.className = 'ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full hidden';
    cacheInfo.textContent = 'Cache: 0 CNPJ(s)';
    statusContainer.appendChild(cacheInfo);
    
    setInterval(() => {
      const cacheCount = (typeof state !== 'undefined' && state.cnpjCache) ? Object.keys(state.cnpjCache).length : 0;
      if (cacheInfo) {
        cacheInfo.textContent = `Cache: ${cacheCount} CNPJ(s)`;
        cacheInfo.classList.toggle('hidden', cacheCount === 0);
      }
    }, 2000);
  },
  
  improveErrorDisplay() {
    if (typeof uiControllers !== 'undefined' && uiControllers.addResultToTable) {
      uiControllers.addResultToTable = function(result, index) {
        const rowId = `result-row-${index}`;
        let row = document.getElementById(rowId);
        
        if (!row) {
            row = document.createElement('tr');
            row.id = rowId;
            row.className = `result-row-${index}`;
            if (elements.resultsBody.children.length < 100) {
                elements.resultsBody.appendChild(row);
            }
        }

        const isNotFound = result.notFound || (result.error && result.errorMessage?.toLowerCase().includes("não encontrado"));
        const apiOrigem = result.api_origem || '';
        const apiOrigemDisplay = apiOrigem ? `<span class="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-800 text-xs rounded-md font-mono">${apiOrigem}</span>` : '';
        const cnpjDisplay = utils.formatCnpjForDisplay(result.cnpj);
        
        let rowHTML = '';
        if (result.error) {
          if (isNotFound) {
            rowHTML = `
              <td class="py-2 px-4 border-b border-gray-200">${cnpjDisplay}</td>
              <td class="py-2 px-4 border-b border-gray-200 text-orange-600" colspan="5">
                <i>CNPJ não encontrado na base de dados</i>
              </td>
              <td class="py-2 px-4 border-b border-gray-200">
                <button class="retry-btn px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs" data-index="${index}">
                  Tentar
                </button>
              </td>
            `;
          } else {
            rowHTML = `
              <td class="py-2 px-4 border-b border-gray-200">${cnpjDisplay}</td>
              <td class="py-2 px-4 border-b border-gray-200 text-red-600" colspan="5">
                <span>Erro: ${result.errorMessage}</span> ${apiOrigemDisplay}
              </td>
              <td class="py-2 px-4 border-b border-gray-200">
                <button class="retry-btn px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs" data-index="${index}">
                  Tentar Novamente
                </button>
              </td>
            `;
          }
        } else {
          rowHTML = `
            <td class="py-2 px-4 border-b border-gray-200">${cnpjDisplay}</td>
            <td class="py-2 px-4 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <span>${result.razao_social || '-'}</span>
                ${apiOrigemDisplay}
              </div>
            </td>
            <td class="py-2 px-4 border-b border-gray-200">${result.nome_fantasia || '-'}</td>
            <td class="py-2 px-4 border-b border-gray-200">${result.descricao_situacao_cadastral || '-'}</td>
            <td class="py-2 px-4 border-b border-gray-200">${result.municipio || '-'}/${result.uf || '-'}</td>
            <td class="py-2 px-4 border-b border-gray-200">${result.cnae_fiscal_descricao || '-'}</td>
            <td class="py-2 px-4 border-b border-gray-200">
              <button class="details-btn px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200" data-index="${index}">
                Detalhes
              </button>
            </td>
          `;
        }
        row.innerHTML = rowHTML;
        
        if (!window.tableEventsRegistered) {
          elements.resultsBody.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('details-btn')) {
              const index = e.target.getAttribute('data-index');
              uiControllers.showDetails(state.results[index]);
            }
            if (e.target && e.target.classList.contains('retry-btn')) {
              const index = parseInt(e.target.getAttribute('data-index'));
              uiEnhancer.retrySingleCnpj(index);
            }
          });
          window.tableEventsRegistered = true;
        }
      };
    }

    if (typeof uiControllers !== 'undefined' && uiControllers.showDetails) {
        const originalShowDetails = uiControllers.showDetails;
        uiControllers.showDetails = function(result) {
            originalShowDetails.call(this, result);
            
            setTimeout(() => {
                const modalTitle = document.getElementById('modalTitle');
                if (modalTitle && !modalTitle.querySelector('.api-badge')) {
                    const apiOrigem = result.api_origem || 'Desconhecida';
                    const apiBadge = document.createElement('span');
                    apiBadge.className = 'api-badge ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full';
                    apiBadge.textContent = `API: ${apiOrigem}`;
                    modalTitle.appendChild(apiBadge);
                }
            }, 100);
        };
    }
  },
  
  async retrySingleCnpj(index) {
    if (typeof state !== 'undefined' && state.isProcessing && !state.isPaused) {
      alert('Por favor, pause o processamento antes de tentar novamente um CNPJ específico.');
      return;
    }
    
    const cnpj = state.cnpjList[index];
    if (!cnpj) return;
    
    const row = document.getElementById(`result-row-${index}`);
    if (row) {
      row.innerHTML = `
        <td class="py-2 px-4 border-b border-gray-200">${utils.formatCnpjForDisplay(cnpj)}</td>
        <td class="py-2 px-4 border-b border-gray-200" colspan="6">
          <div class="flex items-center text-blue-600">
            <span class="loading-spinner mr-2" style="border-top-color: #2563eb;"></span>
            <span>Reconsultando...</span>
          </div>
        </td>
      `;
    }
    
    try {
      const formattedCnpj = utils.formatCnpjForApi(cnpj);
      if (state.cnpjCache[formattedCnpj]) delete state.cnpjCache[formattedCnpj];
      
      const result = await dataHandlers.fetchCnpjData(cnpj);
      state.results[index] = result;
      uiControllers.addResultToTable(result, index);
      
    } catch (error) {
      const errorResult = { cnpj: cnpj, error: true, errorMessage: error.message || 'Erro na reconsulta' };
      state.results[index] = errorResult;
      uiControllers.addResultToTable(errorResult, index);
    }
  },
  
  setupCountdownTimer() {
    if (!window.countdownTimer) {
      window.countdownTimer = {
        timerElement: null,
        countdownInterval: null,
        remainingSeconds: 0,
        onComplete: null,
        
        init(elementId) { this.timerElement = document.getElementById(elementId); return !!this.timerElement; },
        
        start(seconds, onCompleteCallback) {
          if (!this.timerElement) return;
          this.stop();
          this.remainingSeconds = seconds;
          this.onComplete = onCompleteCallback;
          this.updateDisplay();
          this.countdownInterval = setInterval(() => {
            this.remainingSeconds--;
            this.updateDisplay();
            if (this.remainingSeconds <= 0) {
              this.stop();
              if (typeof this.onComplete === 'function') this.onComplete();
            }
          }, 1000);
        },
        
        stop() { clearInterval(this.countdownInterval); this.countdownInterval = null; },
        
        updateDisplay() {
          if (!this.timerElement) return;
          const minutes = Math.floor(this.remainingSeconds / 60);
          const seconds = this.remainingSeconds % 60;
          this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      };
      
      setTimeout(() => window.countdownTimer.init('autoPauseCountdown'), 1000);
    }
  }
};

uiEnhancer.init();