// =========================== SCRIPT DE TRATAMENTO DE ERROS ===========================
/**
 * Script responsável pelo tratamento de erros nas consultas de CNPJ,
 * incluindo estratégia de backoff, retry e pausa automática.
 */

// Estratégia de Backoff Exponencial Aprimorada
const errorHandlerSystem = {
  // Configurações
  config: {
    // Máximo de erros consecutivos antes de pausar
    maxConsecutiveErrors: 3,
    
    // Delay base para backoff (ms)
    baseDelay: 5000,
    
    // Delay máximo (ms)
    maxDelay: 60000,
    
    // Tempo para resetar contagem de erros (ms)
    errorResetTime: 300000, // 5 minutos
    
    // Timeout para teste de conexão (ms)
    connectionTestTimeout: 5000
  },
  
  // Estado
  state: {
    // Contagem de erros consecutivos
    consecutiveErrors: 0,
    
    // Timestamp do último erro
    lastErrorTime: 0,
    
    // Tentativa atual para backoff
    backoffAttempt: 0,
    
    // Indica se está verificando conexão
    connectionCheckInProgress: false,
    
    // Guarda referência aos timers de retentativa
    retryTimers: {}
  },
  
  /**
   * Calcula o tempo de backoff baseado em tentativas e jitter
   * @returns {number} Tempo de espera em ms
   */
  calculateBackoffDelay() {
    // Verificar se passou mais de 5 minutos desde o último erro (reset)
    const now = Date.now();
    if (now - this.state.lastErrorTime > this.config.errorResetTime) {
      this.state.backoffAttempt = 0;
    }
    
    // Atualizar timestamp do erro
    this.state.lastErrorTime = now;
    
    // Incrementar contagem de tentativas
    this.state.backoffAttempt++;
    
    // Calcular delay com base na fórmula exponencial
    const exponentialDelay = Math.min(
      this.config.maxDelay,
      this.config.baseDelay * Math.pow(2, this.state.backoffAttempt - 1)
    );
    
    // Adicionar jitter (variação aleatória) de até 25%
    const jitter = Math.random() * 0.25 * exponentialDelay;
    const finalDelay = Math.floor(exponentialDelay + jitter);
    
    console.log(`Backoff: tentativa ${this.state.backoffAttempt}, aguardando ${finalDelay/1000} segundos`);
    return finalDelay;
  },
  
  /**
   * Resetar contagem de tentativas após sucesso
   */
  resetBackoff() {
    this.state.backoffAttempt = 0;
    console.log('Contagem de backoff resetada após sucesso');
  },
  
  /**
   * Converter delay de ms para segundos
   * @returns {number} Delay em segundos
   */
  getDelayInSeconds() {
    return Math.ceil(this.calculateBackoffDelay() / 1000);
  },
  
  /**
   * Incrementa contador de erros consecutivos
   * @returns {number} Nova contagem
   */
  incrementErrorCount() {
    this.state.consecutiveErrors++;
    console.warn(`Erros consecutivos: ${this.state.consecutiveErrors}`);
    return this.state.consecutiveErrors;
  },
  
  /**
   * Reseta contador de erros consecutivos
   */
  resetErrorCount() {
    if (this.state.consecutiveErrors > 0) {
      console.log(`Resetando contador de erros (estava em ${this.state.consecutiveErrors})`);
      this.state.consecutiveErrors = 0;
    }
  },
  
  /**
   * Analisa o erro e determina sua categoria
   * @param {Error} error Objeto de erro
   * @returns {string} Tipo de erro
   */
  classifyError(error) {
    const errorMsg = error.message || '';
    
    if (errorMsg.includes('Failed to fetch') || 
        errorMsg.includes('NetworkError') || 
        errorMsg.includes('net::ERR')) {
      return 'connection';
    }
    
    if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
      return 'rate_limit';
    }
    
    if (errorMsg.includes('503') || errorMsg.includes('Service Unavailable')) {
      return 'service_unavailable';
    }
    
    if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
      return 'not_found';
    }
    
    if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
      return 'timeout';
    }
    
    return 'generic';
  },
  
  /**
   * Obtém mensagem de erro amigável baseada no tipo
   * @param {string} errorType Tipo de erro
   * @param {Error} originalError Erro original
   * @returns {string} Mensagem amigável
   */
  getFriendlyErrorMessage(errorType, originalError) {
    const originalMessage = originalError?.message || '';
    
    switch (errorType) {
      case 'connection':
        return 'Falha na conexão com a API. Verifique sua internet.';
      case 'rate_limit':
        return 'Muitas requisições em pouco tempo. Aguarde e tente novamente.';
      case 'service_unavailable':
        return 'Serviço temporariamente indisponível. Tente novamente mais tarde.';
      case 'not_found':
        return 'CNPJ não encontrado na base da Receita Federal.';
      case 'timeout':
        return 'Tempo de resposta excedido. Servidor pode estar sobrecarregado.';
      default:
        return `Erro: ${originalMessage}`;
    }
  },
  
  /**
   * Verifica se um erro requer pausa automática
   * @param {string} errorType Tipo de erro classificado
   * @returns {boolean} Se deve pausar automaticamente
   */
  shouldAutoPause(errorType) {
    // Pausar se há muitos erros consecutivos
    if (this.state.consecutiveErrors >= this.config.maxConsecutiveErrors) {
      return true;
    }
    
    // Pausar imediatamente para certos tipos de erro
    return ['connection', 'rate_limit', 'service_unavailable'].includes(errorType);
  },
  
  /**
   * Testa a conectividade com o CNPJ padrão para verificação
   * @returns {Promise<boolean>} Se a API está acessível
   */
  async testConnectivity() {
    // Evitar testes simultâneos
    if (this.state.connectionCheckInProgress) {
      console.log('Teste de conectividade já em andamento...');
      return false;
    }
    
    this.state.connectionCheckInProgress = true;
    
    try {
      // Atualizar status na UI
      this.updateConnectionTestStatus('Testando conexão com as APIs...');
      
      // Testar todas as APIs disponíveis
      const apiResults = await window.apiTestSystem.testAllApiConnections();
      
      // Verificar se pelo menos uma API está respondendo
      const hasWorkingApi = Object.values(apiResults).some(result => result === true);
      
      if (hasWorkingApi) {
        this.updateConnectionTestStatus('✅ Conectividade restaurada. Pelo menos uma API está disponível.', 'success');
        return true;
      } else {
        this.updateConnectionTestStatus('❌ Todas as APIs continuam indisponíveis', 'error');
        return false;
      }
    } catch (error) {
      console.error('Erro ao testar conectividade:', error);
      this.updateConnectionTestStatus(`❌ Erro ao testar conectividade: ${error.message}`, 'error');
      return false;
    } finally {
      this.state.connectionCheckInProgress = false;
    }
  },
  
  /**
   * Atualiza o status do teste de conexão na UI
   */
  updateConnectionTestStatus(message, type = 'info') {
    const statusElement = document.getElementById('connectionTestStatus');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    
    // Aplicar cor baseada no tipo
    switch (type) {
      case 'success':
        statusElement.style.color = '#047857'; // verde
        break;
      case 'error':
        statusElement.style.color = '#b91c1c'; // vermelho
        break;
      case 'warning':
        statusElement.style.color = '#d97706'; // laranja
        break;
      default:
        statusElement.style.color = '#4b5563'; // cinza
    }
  },
  
  /**
   * Cria um objeto de erro formatado para resposta
   */
  createErrorResponse(cnpj, errorType, errorMessage) {
    return {
      cnpj: cnpj,
      error: true,
      errorMessage: errorMessage,
      errorType: errorType,
      timestamp: new Date().toISOString()
    };
  }
};

// Expor o sistema de tratamento de erros globalmente
window.errorHandlerSystem = errorHandlerSystem;
