// ========================= ERROR-HANDLER-SCRIPT.JS =========================
// §2 — Resiliência: Backoff exponencial, cronômetro de pausa, funções globais

// Estratégia de Backoff Exponencial com Jitter
const backoffStrategy = {
    state: { attempt: 0, baseDelay: 5000, maxDelay: 60000, lastErrorTime: 0 },
    calculateDelay() {
        const now = Date.now();
        if (now - this.state.lastErrorTime > 300000) this.state.attempt = 0; // Reset após 5min sem erro
        this.state.lastErrorTime = now;
        this.state.attempt++;
        const exp = Math.min(this.state.maxDelay, this.state.baseDelay * Math.pow(2, this.state.attempt - 1));
        const jitter = Math.random() * 0.25 * exp;
        const finalDelay = Math.floor(exp + jitter);
        console.log(`Backoff: tentativa ${this.state.attempt}, delay ${(finalDelay / 1000).toFixed(1)}s`);
        return finalDelay;
    },
    reset() { this.state.attempt = 0; },
    getDelayInSeconds() { return Math.ceil(this.calculateDelay() / 1000); }
};

// Cronômetro Regressivo para UI de Pausa Automática
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
        return true;
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

// Funções globais acessíveis via onclick no HTML
function pauseProcessing(errorMessage, delay) {
    console.log(`[AutoPause] ${errorMessage} — delay ${delay}s`);
    if (typeof uiControllers !== 'undefined' && uiControllers.triggerAutoPause) {
        let errorType = 'generic';
        if (errorMessage.includes('429') || errorMessage.includes('Rate Limit')) errorType = 'rate_limit';
        else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('conexão')) errorType = 'connection';
        else if (errorMessage.includes('503')) errorType = 'service_unavailable';
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
    updateCurrentPauseDelay(v);
}

function updateCurrentPauseDelay(value) {
    const v = Math.max(5, Math.min(300, parseInt(value) || 30));
    state.autoPauseDelay = v;
    const el = document.getElementById('currentPauseDelay');
    if (el) el.value = v;
}
