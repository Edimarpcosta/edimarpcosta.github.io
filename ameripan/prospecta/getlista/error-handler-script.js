// ========================= ERROR-HANDLER-SCRIPT.JS =========================
// §2 — Resiliência Avançada: Backoff exponencial por tipo de erro, cronômetro adaptativo em tempo real e intercepção global de exceções

// Estratégia de Backoff Exponencial com Jitter Adaptativo
const backoffStrategy = {
    state: { attempt: 0, baseDelay: 5000, maxDelay: 60000, lastErrorTime: 0 },
    calculateDelay(errorType = 'generic') {
        const now = Date.now();
        if (now - this.state.lastErrorTime > 300000) this.state.attempt = 0; // Reset após 5min sem erro
        this.state.lastErrorTime = now;
        this.state.attempt++;

        let base = this.state.baseDelay;
        let max = this.state.maxDelay;

        // Ajusta base/max por tipo específico de falha
        if (errorType === 'rate_limit') {
            base = 15000; // 15s para 429 Rate Limit
            max = 120000;  // 2min máx
        } else if (errorType === 'server_error') {
            base = 10000;  // 10s para 500/503
            max = 90000;
        }

        const exp = Math.min(max, base * Math.pow(1.8, this.state.attempt - 1));
        const jitter = Math.random() * 0.20 * exp; // Jitter de 20%
        const finalDelay = Math.floor(exp + jitter);
        console.log(`[Backoff (${errorType})] Tentativa ${this.state.attempt}, aguardando ${(finalDelay / 1000).toFixed(1)}s`);
        return finalDelay;
    },
    reset() { this.state.attempt = 0; },
    getDelayInSeconds(errorType = 'generic') { return Math.ceil(this.calculateDelay(errorType) / 1000); }
};

// Cronômetro Regressivo Adaptativo para UI de Pausa Automática
const countdownTimer = {
    timerElement: null,
    countdownInterval: null,
    remainingSeconds: 0,
    onComplete: null,
    init(elementId) {
        this.timerElement = document.getElementById(elementId);
        if (!this.timerElement) console.warn(`Countdown: #${elementId} não encontrado`);
        return !!this.timerElement;
    },
    start(seconds, onCompleteCallback) {
        if (!this.timerElement) return false;
        this.stop();
        this.remainingSeconds = Math.max(1, seconds);
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
        return true;
    },
    addSeconds(sec) {
        this.remainingSeconds = Math.max(1, Math.min(600, this.remainingSeconds + sec));
        this.updateDisplay();
    },
    setSeconds(sec) {
        this.remainingSeconds = Math.max(1, Math.min(600, sec));
        this.updateDisplay();
    },
    stop() {
        if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
    },
    updateDisplay() {
        if (!this.timerElement) return;
        const m = Math.floor(this.remainingSeconds / 60);
        const s = this.remainingSeconds % 60;
        this.timerElement.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
};

// Rastreador de Saúde e Diagnósticos das APIs
const apiHealthTracker = {
    records: {},
    track(apiName, status, errorType = 'none') {
        if (!this.records[apiName]) {
            this.records[apiName] = { successes: 0, failures: 0, rateLimits: 0, corsErrors: 0, lastError: null };
        }
        const rec = this.records[apiName];
        if (status === 'ok') {
            rec.successes++;
        } else {
            rec.failures++;
            rec.lastError = errorType;
            if (errorType === 'rate_limit') rec.rateLimits++;
            if (errorType === 'cors') rec.corsErrors++;
        }
    },
    getReport() {
        return this.records;
    }
};

// Funções globais acessíveis via onclick no HTML
function pauseProcessing(errorMessage, delay) {
    console.log(`[AutoPause] ${errorMessage} — delay ${delay}s`);
    if (typeof uiControllers !== 'undefined' && uiControllers.triggerAutoPause) {
        let errorType = 'generic';
        if (errorMessage.includes('429') || errorMessage.includes('Rate Limit')) errorType = 'rate_limit';
        else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('conexão')) errorType = 'connection';
        else if (errorMessage.includes('503') || errorMessage.includes('500')) errorType = 'server_error';
        uiControllers.triggerAutoPause(errorMessage, errorType);
    } else {
        // Fallback se uiControllers ainda não carregou
        state.isPaused = true;
        setTimeout(() => {
            if (state.isPaused) {
                state.isPaused = false;
                if (typeof uiControllers !== 'undefined') uiControllers.resumeProcessing();
            }
        }, delay * 1000);
    }
}

function adjustPauseDelay(change) {
    const el = document.getElementById('currentPauseDelay');
    if (!el) return;
    let v = parseInt(el.value) + change;
    v = Math.max(5, Math.min(300, v));
    el.value = v;
    
    // Atualiza o relógio em execução em tempo real na tela!
    if (countdownTimer.countdownInterval) {
        countdownTimer.addSeconds(change);
    }
    updateCurrentPauseDelay(v);
}

function updateCurrentPauseDelay(value) {
    const v = Math.max(5, Math.min(300, parseInt(value) || 30));
    state.autoPauseDelay = v;
    const el = document.getElementById('currentPauseDelay');
    if (el) el.value = v;
}

// Interceptador Global de Erros Não Tratados (Evita travamentos de tela)
window.addEventListener('unhandledrejection', function (event) {
    console.warn('[Global Interceptor] Promessa não tratada:', event.reason);
    if (typeof state !== 'undefined' && state.isProcessing && !state.isPaused) {
        if (typeof utils !== 'undefined' && utils.updateStatus) {
            utils.updateStatus(`⚠️ Atenção: Requisição assíncrona falhou (${event.reason?.message || 'Erro de rede'}). Continuando...`);
        }
    }
});

window.addEventListener('error', function (event) {
    console.error('[Global Interceptor] Erro de execução:', event.message, event.filename, event.lineno);
});
