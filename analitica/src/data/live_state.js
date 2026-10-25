/**
 * Máquina de Estados dos Dados e Frescor - Analítica Política 2026 (v9.1)
 * Gerencia os 6 estados formais: PRE, LIVE, STALE, OFFLINE, FINAL e SIMULACAO.
 */

export const DataStateEnum = {
  PRE: 'PRE',
  LIVE: 'LIVE',
  STALE: 'STALE',
  OFFLINE: 'OFFLINE',
  FINAL: 'FINAL',
  SIMULACAO: 'SIMULACAO'
};

export class LiveStateMachine {
  constructor(options = {}) {
    this.state = DataStateEnum.PRE;
    this.lastValidSnapshot = null;
    this.lastValidTime = null;
    this.consecutiveFailures = 0;
    this.lastErrorType = null;
    this.isSimulation = Boolean(options.isSimulation);
    this.openingHourBrasilia = 17; // 17h00 de Brasília
    this.listeners = [];
    this.staleThresholdMs = 90 * 1000;    // 90s
    this.offlineThresholdMs = 600 * 1000; // 10 min
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const fn of this.listeners) {
      try {
        fn(this.state, this.getInfo());
      } catch (e) {
        console.error('[LiveStateMachine] Erro no listener:', e);
      }
    }
  }

  setSimulation(isSim) {
    this.isSimulation = Boolean(isSim);
    this.evaluateState();
  }

  registerFailure(now = Date.now(), errorType = 'network') {
    this.consecutiveFailures++;
    this.lastErrorType = errorType;
    this.evaluateState(now);
  }

  registerInconsistent(now = Date.now()) {
    this.consecutiveFailures++;
    this.lastErrorType = 'inconsistent';
    this.evaluateState(now);
  }

  registerSuccess(snapshot, now = Date.now()) {
    this.consecutiveFailures = 0;
    this.lastErrorType = null;
    this.lastValidSnapshot = snapshot;
    this.lastValidTime = now;
    this.evaluateState(now);
  }

  checkAge(now = Date.now()) {
    this.evaluateState(now);
  }

  evaluateState(now = Date.now()) {
    const prevState = this.state;

    if (this.isSimulation) {
      this.state = DataStateEnum.SIMULACAO;
      if (this.state !== prevState) this.notify();
      return;
    }

    if (!this.lastValidSnapshot) {
      if (this.consecutiveFailures >= 3) {
        this.state = DataStateEnum.OFFLINE;
      } else {
        this.state = DataStateEnum.PRE;
      }
      if (this.state !== prevState) this.notify();
      return;
    }

    // Checar se totalização está concluída (100%)
    const stats = this.lastValidSnapshot.s || {};
    const pst = String(stats.pst || '').replace(',', '.');
    const isTotalConcluded = stats.tf === 's' || parseFloat(pst) >= 99.99;

    if (isTotalConcluded) {
      this.state = DataStateEnum.FINAL;
      if (this.state !== prevState) this.notify();
      return;
    }

    // Checar falhas ou tempo decorrido
    const ageMs = now - (this.lastValidTime || now);

    if (this.consecutiveFailures >= 3 || ageMs > this.offlineThresholdMs) {
      this.state = DataStateEnum.OFFLINE;
    } else if (ageMs > this.staleThresholdMs) {
      this.state = DataStateEnum.STALE;
    } else {
      this.state = DataStateEnum.LIVE;
    }

    if (this.state !== prevState) {
      this.notify();
    }
  }

  getInfo(now = Date.now()) {
    const ageSec = this.lastValidTime ? Math.max(0, Math.floor((now - this.lastValidTime) / 1000)) : 0;
    const snap = this.lastValidSnapshot;
    const horaDado = snap?.hg || snap?.gerado_em?.split(' ')?.[1] || (this.lastValidTime ? new Date(this.lastValidTime).toLocaleTimeString('pt-BR') : '--:--:--');
    const pctApurado = snap?.s?.pst || (snap?.secoes_apuradas_pct ? snap.secoes_apuradas_pct.toFixed(2).replace('.', ',') : '0,00');

    let badgeText = 'OFICIAL TSE';
    let badgeClass = 'status-waiting';
    let message = '';

    switch (this.state) {
      case DataStateEnum.PRE:
        badgeText = 'AGUARDANDO';
        badgeClass = 'status-waiting';
        message = 'Aguardando apuração. Os números do TSE começam às 17h (Brasília).';
        break;

      case DataStateEnum.LIVE:
        badgeText = 'AO VIVO';
        badgeClass = 'status-live';
        message = `Fonte: TSE · dado de ${horaDado} · ${pctApurado}% das seções apuradas`;
        break;

      case DataStateEnum.STALE:
        badgeText = 'DESATUALIZADO';
        badgeClass = 'status-stale';
        const mm = String(Math.floor(ageSec / 60)).padStart(2, '0');
        const ss = String(ageSec % 60).padStart(2, '0');
        message = `Sem atualização há ${mm}:${ss}. Mostrando dados de ${horaDado}.`;
        break;

      case DataStateEnum.OFFLINE:
        badgeText = 'OFFLINE';
        badgeClass = 'status-offline';
        if (this.lastErrorType === 'inconsistent' || (this.consecutiveFailures >= 3 && this.lastValidSnapshot)) {
          message = `Recebemos dados inconsistentes; mantendo a última leitura válida de ${horaDado}.`;
        } else {
          message = `Sem conexão com CDN do TSE. Exibindo última leitura válida de ${horaDado}.`;
        }
        break;

      case DataStateEnum.FINAL:
        badgeText = 'CONCLUÍDO';
        badgeClass = 'status-concluded';
        message = `Totalização concluída às ${horaDado} · 100,00% das seções apuradas.`;
        break;

      case DataStateEnum.SIMULACAO:
        badgeText = 'SIMULAÇÃO';
        badgeClass = 'status-simulacao';
        message = `Ambiente de simulação demonstrativa · Dados não oficiais`;
        break;
    }

    return {
      state: this.state,
      badgeText,
      badgeClass,
      message,
      horaDado,
      pctApurado,
      ageSec,
      isSimulation: this.isSimulation
    };
  }
}
