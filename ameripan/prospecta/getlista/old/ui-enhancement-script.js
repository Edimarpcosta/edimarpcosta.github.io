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
    // Procurar a seção de configurações
    const configSection = document.querySelector('.bg-gray-50.p-4.rounded-lg.border.border-gray-200.mb-4');
    
    if (!configSection) {
      console.warn('Seção de configurações não encontrada para adicionar seletor de APIs');
      return;
    }
    
    // Verificar se o seletor já existe
    if (document.getElementById('apiSelectionPanel')) {
      return;
    }
    
    // Criar o seletor de APIs
    const apiSelector = document.createElement('div');
    apiSelector.id = 'apiSelectionPanel';
    apiSelector.className = 'mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg';
    apiSelector.innerHTML = `
      <h3 class="font-medium mb-2 text-blue-800">Sistema de Fallback entre APIs</h3>
      <p class="text-sm text-blue-700 mb-3">
        Define a ordem de consulta em caso de falha. Se uma API falhar, tentará a próxima.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
        <div class="flex items-center">
          <span class="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-center font-medium mr-2">1</span>
          <select id="api1" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="BrasilAPI" selected>BrasilAPI</option>
            <option value="minhaReceita">minhaReceita</option>
            <option value="ReceitaWS">ReceitaWS</option>
          </select>
        </div>
        <div class="flex items-center">
          <span class="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-center font-medium mr-2">2</span>
          <select id="api2" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="BrasilAPI">BrasilAPI</option>
            <option value="minhaReceita" selected>minhaReceita</option>
            <option value="ReceitaWS">ReceitaWS</option>
          </select>
        </div>
        <div class="flex items-center">
          <span class="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-center font-medium mr-2">3</span>
          <select id="api3" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="BrasilAPI">BrasilAPI</option>
            <option value="minhaReceita">minhaReceita</option>
            <option value="ReceitaWS" selected>ReceitaWS</option>
          </select>
        </div>
      </div>
      <div class="flex justify-between mt-2">
        <button id="testAllApisBtn" class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
          Testar Todas as APIs
        </button>
        <div id="apiStatusIndicators" class="flex items-center space-x-2">
          <span class="text-xs text-gray-500">Status:</span>
          <span id="statusBrasilAPI" class="px-2 py-1 rounded-full text-xs bg-gray-200">BrasilAPI</span>
          <span id="statusminhaReceita" class="px-2 py-1 rounded-full text-xs bg-gray-200">minhaReceita</span>
          <span id="statusReceitaWS" class="px-2 py-1 rounded-full text-xs bg-gray-200">ReceitaWS</span>
        </div>
      </div>
    `;
    
    // Adicionar o seletor à seção de configurações
    configSection.appendChild(apiSelector);
    
    // Adicionar evento ao botão de teste
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
   * Atualiza os indicadores de status das APIs
   * @param {Object|string} results Status de cada API ou status geral
   */
  updateApiStatusIndicators(results) {
    const apiNames = ['BrasilAPI', 'minhaReceita', 'ReceitaWS'];
    
    apiNames.forEach(apiName => {
      const indicator = document.getElementById(`status${apiName}`);
      if (!indicator) return;
      
      // Resetar classes
      indicator.className = 'px-2 py-1 rounded-full text-xs';
      
      // Aplicar status
      if (results === 'pending') {
        indicator.classList.add('bg-yellow-200', 'text-yellow-800');
        indicator.innerHTML = `<span class="animate-pulse">${apiName}</span>`;
      } else if (results === 'error') {
        indicator.classList.add('bg-red-200', 'text-red-800');
        indicator.textContent = apiName;
      } else if (typeof results === 'object') {
        const status = results[apiName];
        if (status === true) {
          indicator.classList.add('bg-green-200', 'text-green-800');
          indicator.innerHTML = `${apiName} ✓`;
        } else {
          indicator.classList.add('bg-red-200', 'text-red-800');
          indicator.innerHTML = `${apiName} ✗`;
        }
      } else {
        indicator.classList.add('bg-gray-200', 'text-gray-800');
        indicator.textContent = apiName;
      }
    });
  },
  
  /**
   * Adiciona botão para limpar cache
   */
  addClearCacheButton() {
    // Localizar o contêiner de botões na seção de controles
    const buttonContainer = document.querySelector('#controlsSection .flex.flex-wrap.gap-3.mt-4');
    
    if (!buttonContainer) {
      console.warn('Contêiner de botões não encontrado');
      return;
    }
    
    // Verificar se o botão já existe
    if (document.getElementById('clearCacheBtn')) {
      return;
    }
    
    // Criar botão de limpar cache
    const clearCacheBtn = document.createElement('button');
    clearCacheBtn.id = 'clearCacheBtn';
    clearCacheBtn.className = 'px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2';
    clearCacheBtn.innerHTML = '<span class="flex items-center"><svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>Limpar Cache</span>';
    
    // Adicionar evento de clique
    clearCacheBtn.addEventListener('click', function() {
      // Perguntar antes de limpar para confirmar a ação
      if (confirm('Tem certeza que deseja limpar o cache de CNPJs consultados? Isso fará com que todos os CNPJs sejam reconsultados na API.')) {
        uiEnhancer.clearCnpjCache();
      }
    });
    
    // Adicionar o botão ao contêiner
    buttonContainer.appendChild(clearCacheBtn);
  },
  
  /**
   * Limpa o cache de CNPJs
   */
  clearCnpjCache() {
    try {
      // Verificar se o processamento está em andamento
      if (state.isProcessing && !state.isPaused) {
        alert('Por favor, pause o processamento antes de limpar o cache.');
        return;
      }
      
      // Guardar o tamanho do cache para feedback
      const cacheSize = Object.keys(state.cnpjCache).length;
      
      // Limpar o cache
      state.cnpjCache = {};
      
      // Atualizar o status
      utils.updateStatus(`Cache limpo com sucesso! ${cacheSize} CNPJs removidos do cache.`);
      
      // Mostrar feedback visual
      this.showCacheClearedFeedback();
      
      console.log(`Cache de CNPJs limpo. ${cacheSize} entradas removidas.`);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      alert('Ocorreu um erro ao limpar o cache. Verifique o console para mais detalhes.');
    }
  },
  
  /**
   * Mostra feedback visual ao limpar cache
   */
  showCacheClearedFeedback() {
    const statusText = document.getElementById('statusText');
    
    if (statusText) {
      // Guardar a classe original
      const originalClass = statusText.className;
      
      // Adicionar efeito visual
      statusText.classList.add('text-green-600', 'font-medium');
      
      // Remover o efeito após alguns segundos
      setTimeout(() => {
        statusText.className = originalClass;
      }, 3000);
    }
    
    // Também atualizar o contador de cache
    const cacheInfo = document.getElementById('cacheInfo');
    if (cacheInfo) {
      cacheInfo.textContent = 'Cache: 0 CNPJ(s)';
      cacheInfo.classList.add('hidden');
    }
  },
  
  /**
   * Adiciona informação de cache ao status
   */
  enhanceStatusInfo() {
    // Adicionar contador de cache na interface
    const statusContainer = document.getElementById('statusText')?.parentNode;
    
    if (!statusContainer) {
      console.warn('Container de status não encontrado');
      return;
    }
    
    // Verificar se já existe
    if (document.getElementById('cacheInfo')) {
      return;
    }
    
    const cacheInfo = document.createElement('span');
    cacheInfo.id = 'cacheInfo';
    cacheInfo.className = 'ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full hidden';
    cacheInfo.textContent = 'Cache: 0 CNPJ(s)';
    
    statusContainer.appendChild(cacheInfo);
    
    // Atualizar informações de cache periodicamente
    setInterval(() => {
      const cacheCount = Object.keys(state.cnpjCache || {}).length;
      const cacheInfo = document.getElementById('cacheInfo');
      
      if (cacheInfo) {
        cacheInfo.textContent = `Cache: ${cacheCount} CNPJ(s)`;
        
        // Esconder se não tiver cache
        if (cacheCount === 0) {
          cacheInfo.classList.add('hidden');
        } else {
          cacheInfo.classList.remove('hidden');
        }
      }
    }, 2000);
  },
  
  /**
   * Melhora a exibição de erros na interface
   */
  improveErrorDisplay() {
    // Sobrescrever a função addResultToTable para mostrar melhor os erros
    if (uiControllers && uiControllers.addResultToTable) {
      const originalAddResultToTable = uiControllers.addResultToTable;
      
      uiControllers.addResultToTable = function(result, index) {
        // Verificar se já existe uma linha para este índice
        const existingRow = document.querySelector(`.result-row-${index}`);
        
        // Verificar se é um CNPJ não encontrado para mostrar uma mensagem diferente
        const isNotFound = result.notFound || (result.error && result.errorMessage && 
                        result.errorMessage.includes("não encontrado"));
        
        // Obter a origem da API para exibir na interface
        const apiOrigem = result.api_origem || result.apiOrigem || '';
        const apiOrigemDisplay = apiOrigem ? `<span class="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">${apiOrigem}</span>` : '';
        
        if (existingRow) {
          // Atualizar linha existente
          if (result.error) {
            // Estilo diferente para CNPJ não encontrado vs. erro real
            if (isNotFound) {
              existingRow.innerHTML = `
                <td class="py-2 px-4 border-b border-gray-200">${utils.formatCnpjForDisplay(result.cnpj)}</td>
                <td class="py-2 px-4 border-b border-gray-200 text-orange-600" colspan="5">
                  <i>CNPJ não encontrado na base da Receita Federal</i> ${apiOrigemDisplay}
                </td>
                <td class="py-2 px-4 border-b border-gray-200"></td>
              `;
            } else {
              existingRow.innerHTML = `
                <td class="py-2 px-4 border-b border-gray-200">${utils.formatCnpjForDisplay(result.cnpj)}</td>
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
            existingRow.innerHTML = `
              <td class="py-2 px-4 border-b border-gray-200">${utils.formatCnpjForDisplay(result.cnpj)}</td>
              <td class="py-2 px-4 border-b border-gray-200">
                ${result.razao_social || '-'} 
                ${apiOrigemDisplay}
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
        } else {
          // Criar nova linha
          const row = document.createElement('tr');
          row.className = `result-row-${index}`;
          
          if (result.error) {
            // Estilo diferente para CNPJ não encontrado vs. erro real
            if (isNotFound) {
              row.innerHTML = `
                <td class="py-2 px-4 border-b border-gray-200">${utils.formatCnpjForDisplay(result.cnpj)}</td>
                <td class="py-2 px-4 border-b border-gray-200 text-orange-600" colspan="5">
                  <i>CNPJ não encontrado na base da Receita Federal</i> ${apiOrigemDisplay}
                </td>
                <td class="py-2 px-4 border-b border-gray-200"></td>
              `;
            } else {
              row.innerHTML = `
                <td class="py-2 px-4 border-b border-gray-200">${utils.formatCnpjForDisplay(result.cnpj)}</td>
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
            // Linha com dados
            row.innerHTML = `
              <td class="py-2 px-4 border-b border-gray-200">${utils.formatCnpjForDisplay(result.cnpj)}</td>
              <td class="py-2 px-4 border-b border-gray-200">
                ${result.razao_social || '-'} 
                ${apiOrigemDisplay}
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
          
          // Limitar o número de linhas visíveis para melhorar a performance
          if (elements.resultsBody.children.length < 100) {
            elements.resultsBody.appendChild(row);
          }
        }
        
        // Adicionar evento aos botões via delegação (uma única vez)
        if (!window.tableEventsRegistered) {
          elements.resultsBody.addEventListener('click', function(e) {
            // Botão de detalhes
            if (e.target.classList.contains('details-btn')) {
              const index = e.target.getAttribute('data-index');
              uiControllers.showDetails(state.results[index]);
            }
            
            // Botão de retry
            if (e.target.classList.contains('retry-btn')) {
              const index = parseInt(e.target.getAttribute('data-index'));
              uiEnhancer.retrySingleCnpj(index);
            }
          });
          
          window.tableEventsRegistered = true;
        }
      };
    }
    
    // Melhorar a função de exibição de detalhes
    if (uiControllers && uiControllers.showDetails) {
      const originalShowDetails = uiControllers.showDetails;
      
      uiControllers.showDetails = function(result) {
        // Chamar a implementação original
        originalShowDetails.call(this, result);
        
        // Adicionar informação sobre a origem da API
        const apiOrigem = result.api_origem || result.apiOrigem || 'Desconhecida';
        
        // Adicionar badge informando a origem no título
        setTimeout(() => {
          const modalTitle = document.getElementById('modalTitle');
          if (modalTitle && !modalTitle.querySelector('.api-badge')) {
            const apiBadge = document.createElement('span');
            apiBadge.className = 'api-badge ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full';
            apiBadge.textContent = `API: ${apiOrigem}`;
            modalTitle.appendChild(apiBadge);
          }
        }, 100);
      };
    }
  },
  
  /**
   * Tenta novamente a consulta de um único CNPJ
   * @param {number} index Índice do CNPJ no array de resultados
   */
  async retrySingleCnpj(index) {
    if (state.isProcessing && !state.isPaused) {
      alert('Por favor, pause o processamento antes de tentar novamente um CNPJ específico.');
      return;
    }
    
    const cnpj = state.cnpjList[index];
    if (!cnpj) {
      console.error('CNPJ não encontrado no índice', index);
      return;
    }
    
    // Atualizar linha na tabela para mostrar que está processando
    const row = document.querySelector(`.result-row-${index}`);
    if (row) {
      row.innerHTML = `
        <td class="py-2 px-4 border-b border-gray-200">${utils.formatCnpjForDisplay(cnpj)}</td>
        <td class="py-2 px-4 border-b border-gray-200" colspan="5">
          <div class="flex items-center">
            <span class="loading-spinner mr-2"></span>
            <span>Consultando CNPJ novamente...</span>
          </div>
        </td>
        <td class="py-2 px-4 border-b border-gray-200"></td>
      `;
    }
    
    try {
      // Remover do cache para forçar nova consulta
      const formattedCnpj = utils.formatCnpjForApi(cnpj);
      if (state.cnpjCache[formattedCnpj]) {
        delete state.cnpjCache[formattedCnpj];
      }
      
      // Executar consulta novamente
      const result = await dataHandlers.fetchCnpjData(cnpj);
      
      // Atualizar resultado no estado
      state.results[index] = result;
      
      // Atualizar tabela
      uiControllers.addResultToTable(result, index);
      
      console.log(`CNPJ ${cnpj} reconsultado com sucesso:`, result);
    } catch (error) {
      console.error(`Erro ao reconsultar CNPJ ${cnpj}:`, error);
      
      // Atualizar com o erro
      const errorResult = {
        cnpj: cnpj,
        error: true,
        errorMessage: error.message || 'Erro desconhecido na reconsulta',
        errorType: 'retry_failed'
      };
      
      // Atualizar estado e tabela
      state.results[index] = errorResult;
      uiControllers.addResultToTable(errorResult, index);
    }
  },
  
  /**
   * Configura o cronômetro de contagem regressiva
   */
  setupCountdownTimer() {
    // Verificar se já existe o objeto global countdownTimer
    if (!window.countdownTimer) {
      window.countdownTimer = {
        timerElement: null,
        countdownInterval: null,
        remainingSeconds: 0,
        onComplete: null,
        
        // Inicializar o cronômetro
        init(elementId) {
          this.timerElement = document.getElementById(elementId);
          if (!this.timerElement) {
            console.error(`Elemento de cronômetro #${elementId} não encontrado`);
            return false;
          }
          return true;
        },
        
        // Iniciar contagem regressiva
        start(seconds, onCompleteCallback) {
          if (!this.timerElement) return false;
          
          // Limpar timer anterior se existir
          this.stop();
          
          this.remainingSeconds = seconds;
          this.onComplete = onCompleteCallback;
          
          // Formatar e mostrar tempo inicial
          this.updateDisplay();
          
          // Iniciar intervalo
          this.countdownInterval = setInterval(() => {
            this.remainingSeconds--;
            this.updateDisplay();
            
            if (this.remainingSeconds <= 0) {
              this.stop();
              if (typeof this.onComplete === 'function') {
                this.onComplete();
              }
            }
          }, 1000);
          
          return true;
        },
        
        // Parar contagem
        stop() {
          if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
          }
        },
        
        // Atualizar exibição do tempo
        updateDisplay() {
          if (!this.timerElement) return;
          
          const minutes = Math.floor(this.remainingSeconds / 60);
          const seconds = this.remainingSeconds % 60;
          
          // Formatar MM:SS
          this.timerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      };
      
      // Inicializar o cronômetro com o elemento correto
      setTimeout(() => {
        window.countdownTimer.init('autoPauseCountdown');
      }, 1000);
    }
  }
};

// Iniciar as melhorias na interface
uiEnhancer.init();
