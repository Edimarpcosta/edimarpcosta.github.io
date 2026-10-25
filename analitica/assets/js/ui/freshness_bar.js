/**
 * Barra de Frescor e Camada de Confiança - Analítica Política 2026 (v9.1)
 * Renderiza faixa permanente de frescor dos dados em todas as abas e controla selos de confiabilidade.
 */

import { DataStateEnum } from '../data/live_state.js';

export class FreshnessBarUI {
  constructor(containerId, liveStateMachine) {
    this.container = document.getElementById(containerId);
    this.machine = liveStateMachine;
    this.timer = null;
  }

  init() {
    if (this.machine) {
      this.machine.subscribe((state, info) => {
        this.render(info);
      });
    }

    // Timer de checagem a cada 5s para atualizar contador de frescor
    this.timer = setInterval(() => {
      if (this.machine) {
        this.machine.checkAge();
        this.render(this.machine.getInfo());
      }
    }, 5000);

    const initialInfo = this.machine ? this.machine.getInfo() : null;
    this.render(initialInfo);
  }

  render(info) {
    if (!this.container || !info) return;

    // Gerenciar marca d'água de simulação e tags meta/title
    this.updateSimulationMeta(info.state === DataStateEnum.SIMULACAO);

    let stateClass = 'freshness-live';
    if (info.state === DataStateEnum.STALE) stateClass = 'freshness-stale';
    if (info.state === DataStateEnum.OFFLINE) stateClass = 'freshness-offline';
    if (info.state === DataStateEnum.PRE) stateClass = 'freshness-pre';
    if (info.state === DataStateEnum.FINAL) stateClass = 'freshness-final';
    if (info.state === DataStateEnum.SIMULACAO) stateClass = 'freshness-sim';

    const linkSobre = `<button id="btn-open-sobre-bar" class="link-como-atualizamos" style="background:none; border:none; color:inherit; text-decoration:underline; cursor:pointer; font-size:inherit; font-weight:700; padding:0; margin-left:0.5rem;">Como atualizamos</button>`;

    let contentHtml = '';
    if (info.state === DataStateEnum.SIMULACAO) {
      contentHtml = `
        <div class="freshness-inner">
          <span class="status-badge status-simulacao">SIMULAÇÃO</span>
          <span>Ambiente demonstrativo com dados simulados · Sem valor oficial do TSE</span>
          ${linkSobre}
        </div>
      `;
    } else if (info.state === DataStateEnum.PRE) {
      contentHtml = `
        <div class="freshness-inner">
          <span class="status-badge status-waiting">AGUARDANDO</span>
          <span>${info.message}</span>
          ${linkSobre}
        </div>
      `;
    } else if (info.state === DataStateEnum.STALE) {
      contentHtml = `
        <div class="freshness-inner">
          <span class="status-badge status-stale">DESATUALIZADO</span>
          <span>${info.message}</span>
          ${linkSobre}
        </div>
      `;
    } else if (info.state === DataStateEnum.OFFLINE) {
      contentHtml = `
        <div class="freshness-inner">
          <span class="status-badge status-offline">CONTINGÊNCIA</span>
          <span>${info.message}</span>
          ${linkSobre}
        </div>
      `;
    } else if (info.state === DataStateEnum.FINAL) {
      contentHtml = `
        <div class="freshness-inner">
          <span class="status-badge status-concluded">FINAL</span>
          <span>${info.message}</span>
          ${linkSobre}
        </div>
      `;
    } else {
      // LIVE
      contentHtml = `
        <div class="freshness-inner">
          <span class="status-badge status-live">AO VIVO</span>
          <span>Fonte: TSE · dado de ${info.horaDado} · ${info.pctApurado}% das seções apuradas</span>
          ${linkSobre}
        </div>
      `;
    }

    this.container.className = `freshness-bar ${stateClass}`;
    this.container.innerHTML = contentHtml;

    document.getElementById('btn-open-sobre-bar')?.addEventListener('click', () => {
      this.openSobreModal();
    });
  }

  updateSimulationMeta(isSim) {
    // 1. Atualizar Title
    const baseTitle = 'Analítica Política 2026 — Inteligência Eleitoral & Parlamentar em Tempo Real';
    if (isSim) {
      if (!document.title.startsWith('[SIMULAÇÃO]')) {
        document.title = `[SIMULAÇÃO] ${baseTitle}`;
      }
    } else {
      if (document.title.startsWith('[SIMULAÇÃO]')) {
        document.title = baseTitle;
      }
    }

    // 2. Meta robots noindex
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (isSim) {
      if (!metaRobots) {
        metaRobots = document.createElement('meta');
        metaRobots.setAttribute('name', 'robots');
        document.head.appendChild(metaRobots);
      }
      metaRobots.setAttribute('content', 'noindex, nofollow');
    } else {
      if (metaRobots) {
        metaRobots.remove();
      }
    }

    // 3. Marca d'água no mapa
    const watermark = document.getElementById('simulacao-watermark');
    if (watermark) {
      if (isSim) {
        watermark.classList.remove('hidden');
        watermark.style.display = 'flex';
      } else {
        watermark.classList.add('hidden');
        watermark.style.display = 'none';
      }
    }
  }

  openSobreModal() {
    const modal = document.getElementById('sobre-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  }
}
