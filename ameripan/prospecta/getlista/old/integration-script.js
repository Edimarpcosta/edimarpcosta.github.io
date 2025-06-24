// =========================== SCRIPT DE INTEGRAÇÃO FINAL ===========================
/**
 * Script responsável por integrar todas as melhorias no sistema original,
 * substituindo as funções necessárias do sistema de consulta de CNPJs.
 */

// Registrar o script apenas uma vez
if (!window.integrationInitialized) {
  window.integrationInitialized = true;

  // Sobrescrever a função de consulta de CNPJ original
  dataHandlers.fetchCnpjData = async function(cnpj) {
    try {
      // Verificar se o processamento foi pausado
      if (state.isPaused) {
        console.log('Processamento pausado. Abortando consulta do CNPJ', cnpj);
        throw new Error('Processamento pausado pelo usuário');
      }
      
      const formattedCnpj = utils.formatCnpjForApi(cnpj);
      
      // Verificar se já temos este CNPJ em cache
      if (state.cnpjCache[formattedCnpj]) {
        console.log(`Usando dados em cache para CNPJ ${formattedCnpj}`);
        
        // Resetar contadores de erro ao usar cache com sucesso
        window.errorHandlerSystem.resetErrorCount();
        window.errorHandlerSystem.resetBackoff();
        
        return state.cnpjCache[formattedCnpj];
      }
      
      // Criar um controlador de aborto para esta requisição
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Registrar esta requisição para possível aborto
      const requestEntry = { cnpj, controller };
      state.pendingRequests.push(requestEntry);
      
      // ===== MELHORIAS: TESTE COM CNPJ PADRÃO =====
      // Se este for o primeiro CNPJ após uma pausa ou no início do processamento,
      // testar primeiro com o CNPJ do Banco do Brasil
      if (state.currentIndex === 0 || state.consecutiveErrors > 0) {
        console.log('Testando conectividade com CNPJ padrão antes de prosseguir...');
        
        const testResult = await window.apiTestSystem.testApiConnection('BrasilAPI');
        
        if (!testResult) {
          console.warn('Teste de conectividade falhou. Tentando APIs alternativas...');
        } else {
          console.log('Teste de conectividade bem-sucedido, prosseguindo com a consulta.');
        }
      }
      
      try {
        // ===== MELHORIAS: SISTEMA DE FALLBACK ENTRE APIS =====
        // Usar o sistema de fallback para consultar em múltiplas APIs
        console.log(`Consultando CNPJ ${formattedCnpj} com sistema de fallback entre APIs...`);
        
        const resultado = await window.apiTestSystem.consultarCnpjComFallback(formattedCnpj);
        
        // Remover da lista de requisições pendentes
        state.pendingRequests = state.pendingRequests.filter(req => req !== requestEntry);
        
        // Registrar qual API foi usada
        const apiUsada = resultado.api_origem || resultado.origem;
        console.log(`CNPJ ${formattedCnpj} consultado com sucesso via API: ${apiUsada}`);
        
        // Adicionar metadados ao resultado
        if (!resultado.api_origem && resultado.origem) {
          resultado.api_origem = resultado.origem;
        }
        
        // Salvar no cache
        state.cnpjCache[formattedCnpj] = resultado;
        
        // Resetar contadores de erro
        window.errorHandlerSystem.resetErrorCount();
        window.errorHandlerSystem.resetBackoff();
        
        return resultado;
      } catch (error) {
        // Remover da lista de requisições pendentes
        state.pendingRequests = state.pendingRequests.filter(req => req !== requestEntry);
        
        // ===== MELHORIAS: TRATAMENTO DE ERROS POR TIPO =====
        // Classificar o tipo de erro
        const errorType = window.errorHandlerSystem.classifyError(error);
        
        // Se for um erro de "não encontrado", tratar de forma diferente
        if (errorType === 'not_found' || error.message.includes('não encontrado')) {
          console.log(`CNPJ ${formattedCnpj} não encontrado em nenhuma API`);
          
          // Não contar como erro consecutivo
          return { 
            cnpj: cnpj, 
            error: true, 
            errorMessage: "CNPJ não encontrado em nenhuma das APIs consultadas",
            notFound: true,
            skipErrorCount: true,
            api_origem: 'Todas'
          };
        }
        
        // Incrementar contador de erros consecutivos
        window.errorHandlerSystem.incrementErrorCount();
        
        // Obter mensagem amigável
        const errorMessage = window.errorHandlerSystem.getFriendlyErrorMessage(errorType, error);
        
        // Verificar se deve pausar automaticamente
        if (state.autoPauseEnabled && window.errorHandlerSystem.shouldAutoPause(errorType)) {
          // Determinar o tempo de pausa
          let pauseTime = state.autoPauseDelay;
          
          // Para erros de taxa, usar backoff exponencial
          if (errorType === 'rate_limit') {
            pauseTime = window.errorHandlerSystem.getDelayInSeconds();
          }
          
          // Pausar automaticamente
          pauseProcessing(errorMessage, pauseTime);
        }
        
        // Retornar informações do erro
        return { 
          cnpj: cnpj, 
          error: true, 
          errorMessage: errorMessage,
          errorType: errorType,
          originalError: error.message
        };
      }
    } catch (error) {
      // Tratar erros de abortamento
      if (error.name === 'AbortError' || error.message.includes('pausado')) {
        console.log(`Requisição para CNPJ ${cnpj} foi abortada devido à pausa.`);
        return { 
          cnpj: cnpj, 
          error: true, 
          errorMessage: "Requisição abortada (pausa)",
          aborted: true
        };
      }
      
      // Tratar outros erros não capturados
      console.error(`Erro inesperado ao consultar CNPJ ${cnpj}:`, error);
      return { 
        cnpj: cnpj, 
        error: true, 
        errorMessage: `Erro inesperado: ${error.message}`,
        errorType: 'unknown'
      };
    }
  };

  // Sobrescrever a função de pausa automática
  window.pauseProcessing = function(errorMessage, delay) {
    console.log(`Pausando processamento por ${delay} segundos devido a: ${errorMessage}`);
    
    // Certificar que foi definido como pausado
    state.isPaused = true;
    state.isAutoPaused = true;
    
    // Cancelar requisições pendentes
    if (uiControllers && uiControllers.cancelPendingRequests) {
      uiControllers.cancelPendingRequests();
    }
    
    // Atualizar interface
    if (document.getElementById('pauseBtn')) {
      document.getElementById('pauseBtn').classList.add('hidden');
    }
    if (document.getElementById('resumeBtn')) {
      document.getElementById('resumeBtn').classList.remove('hidden');
    }
    
    utils.hideLoading();
    
    // Exibir alerta de pausa automática
    const autoPauseAlert = document.getElementById('autoPauseAlert');
    const autoPauseReason = document.getElementById('autoPauseReason');
    const autoPauseCountdown = document.getElementById('autoPauseCountdown');
    const currentPauseDelay = document.getElementById('currentPauseDelay');
    
    if (autoPauseAlert && autoPauseReason && autoPauseCountdown && currentPauseDelay) {
      // Atualizar motivo e valor inicial
      autoPauseReason.textContent = `Erro: ${errorMessage}`;
      currentPauseDelay.value = delay;
      
      // Exibir alerta
      autoPauseAlert.style.display = 'block';
      autoPauseAlert.classList.add('pulse');
      
      // Iniciar contagem regressiva usando o cronômetro melhorado
      if (window.countdownTimer && window.countdownTimer.init) {
        if (!window.countdownTimer.timerElement) {
          window.countdownTimer.init('autoPauseCountdown');
        }
        
        window.countdownTimer.start(delay, () => {
          // Quando terminar, verificar se ainda está em pausa automática
          if (state.isPaused && state.isAutoPaused) {
            // Testar conexão antes de retomar
            if (uiControllers && uiControllers.testConnectionAndResume) {
              uiControllers.testConnectionAndResume();
            } else {
              // Fallback para retomada sem teste
              if (uiControllers && uiControllers.resumeProcessing) {
                uiControllers.resumeProcessing();
              }
            }
          }
        });
      } else {
        // Fallback para método antigo
        state.currentCountdown = delay;
        autoPauseCountdown.textContent = delay;
        
        // Configurar timer para retomar automaticamente
        if (state.autoPauseTimer) {
          clearTimeout(state.autoPauseTimer);
        }
        
        const updateCountdown = () => {
          if (state.currentCountdown <= 0 || !state.isPaused || !state.isAutoPaused) {
            if (state.isPaused && state.isAutoPaused) {
              // Testar conexão antes de retomar
              if (uiControllers && uiControllers.testConnectionAndResume) {
                uiControllers.testConnectionAndResume();
              } else {
                // Fallback para retomada sem teste
                if (uiControllers && uiControllers.resumeProcessing) {
                  uiControllers.resumeProcessing();
                }
              }
            }
            return;
          }
          
          // Atualizar contador
          state.currentCountdown--;
          autoPauseCountdown.textContent = state.currentCountdown;
          
          // Continuar contagem
          state.autoPauseTimer = setTimeout(updateCountdown, 1000);
        };
        
        state.autoPauseTimer = setTimeout(updateCountdown, 1000);
      }
    } else {
      console.error('Elementos de UI para pausa automática não encontrados');
      
      // Fallback para processos em background
      setTimeout(() => {
        // Verificar se ainda está pausado (usuário não retomou manualmente)
        if (state.isPaused && state.isAutoPaused) {
          // Tentar retomar
          if (uiControllers && uiControllers.resumeProcessing) {
            uiControllers.resumeProcessing();
          } else {
            state.isPaused = false;
            state.isAutoPaused = false;
          }
        }
      }, delay * 1000);
    }
  };

  // Sobrescrever a função de teste de conexão
  if (uiControllers && uiControllers.testApiConnection) {
    uiControllers.testApiConnection = async function() {
      return await window.errorHandlerSystem.testConnectivity();
    };
  }

  // Sobrescrever a função de teste de conexão antes de retomar
  if (uiControllers && uiControllers.testConnectionAndResume) {
    uiControllers.testConnectionAndResume = async function() {
      // Verificar se o teste de conexão está habilitado
      const shouldTestConnection = document.getElementById('testConnectionBeforeResume')?.checked ?? true;
      
      if (!shouldTestConnection) {
        // Se o teste estiver desabilitado, retomar diretamente
        console.log('Teste de conexão desabilitado. Retomando processamento...');
        this.resumeProcessing();
        return;
      }
      
      utils.updateStatus('Testando conexão com a API...');
      utils.showLoading();
      
      const connectionSuccess = await window.errorHandlerSystem.testConnectivity();
      
      if (connectionSuccess) {
        // Se o teste for bem-sucedido, retomar o processamento
        console.log('Teste de conexão bem-sucedido. Retomando processamento...');
        this.resumeProcessing();
      } else {
        // Se o teste falhar, configurar um novo temporizador mais curto
        console.warn('Teste de conexão falhou. APIs ainda indisponíveis.');
        
        // Mostrar mensagem de erro e reiniciar contagem
        utils.hideLoading();
        utils.updateStatus('Teste de conexão falhou. Tentando novamente em 10 segundos...');
        
        // Atualizar alerta de pausa automática
        const autoPauseAlert = document.getElementById('autoPauseAlert');
        
        // Configurar nova pausa curta
        const retryDelay = 10; // 10 segundos para tentar novamente
        
        // Usar o cronômetro melhorado
        if (window.countdownTimer && window.countdownTimer.init) {
          if (!window.countdownTimer.timerElement) {
            window.countdownTimer.init('autoPauseCountdown');
          }
          
          window.countdownTimer.start(retryDelay, () => {
            // Quando terminar, testar conexão novamente
            if (state.isPaused && state.isAutoPaused) {
              this.testConnectionAndResume();
            }
          });
          
          // Atualizar valor no input
          document.getElementById('currentPauseDelay').value = retryDelay;
        } else {
          // Fallback para método antigo
          const autoPauseCountdown = document.getElementById('autoPauseCountdown');
          const currentPauseDelay = document.getElementById('currentPauseDelay');
          
          if (autoPauseCountdown && currentPauseDelay) {
            state.currentCountdown = retryDelay;
            autoPauseCountdown.textContent = retryDelay;
            currentPauseDelay.value = retryDelay;
            
            // Reiniciar contagem regressiva
            if (state.autoPauseTimer) {
              clearTimeout(state.autoPauseTimer);
            }
            
            const updateRetryCountdown = () => {
              if (state.currentCountdown <= 0 || !state.isPaused || !state.isAutoPaused) {
                if (state.isPaused && state.isAutoPaused) {
                  this.testConnectionAndResume();
                }
                return;
              }
              
              // Atualizar contador
              state.currentCountdown--;
              autoPauseCountdown.textContent = state.currentCountdown;
              
              // Continuar contagem
              state.autoPauseTimer = setTimeout(updateRetryCountdown, 1000);
            };
            
            state.autoPauseTimer = setTimeout(updateRetryCountdown, 1000);
          } else {
            // Último recurso: esperar 10 segundos e tentar novamente
            setTimeout(() => {
              if (state.isPaused && state.isAutoPaused) {
                this.testConnectionAndResume();
              }
            }, retryDelay * 1000);
          }
        }
      }
    };
  }

  console.log('%c✅ Sistema de consulta de CNPJs aprimorado com sucesso! %c\nSistema de fallback entre APIs ativado.\nTeste com CNPJ padrão implementado.\nTratamento de erros melhorado.', 
    'background: #4ade80; color: #064e3b; padding: 4px 8px; border-radius: 4px; font-weight: bold;', 
    'color: #059669; font-size: 13px;');
}
