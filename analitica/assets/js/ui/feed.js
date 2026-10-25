/**
 * Feed Cronológico de Atualizações ao Vivo - Analítica Política 2026
 * Ticker de eventos em tempo real com contador de audiência, novos marcos de apuração
 * e notificações dinâmicas de estados e municípios.
 */

import { State } from '../state.js';

export class FeedUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.events = [
      {
        hora: '17:00:00',
        tipo: 'inicio',
        titulo: 'Início Oficial da Totalização TSE',
        desc: 'Urnas de todos os 5.570 municípios do Brasil e exterior começam a ser transmitidas.',
        badge: 'OFICIAL'
      }
    ];
    this.viewerCount = 312;
    this.interval = null;
  }

  init() {
    this.render();
    this.startViewerSimulation();
  }

  startViewerSimulation() {
    // Variação orgânica suave de espectadores online (250 a 450)
    setInterval(() => {
      const delta = Math.floor(Math.random() * 9) - 4;
      this.viewerCount = Math.max(180, this.viewerCount + delta);
      const el = document.getElementById('feed-viewers-count');
      if (el) el.innerText = `${this.viewerCount} pessoas agora`;
    }, 4000);
  }

  addEvent(event) {
    this.events.unshift(event);
    if (this.events.length > 25) this.events.pop();
    this.renderEventsOnly();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; box-shadow: var(--shadow-card);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="live-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></span>
            <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">ÚLTIMAS ATUALIZAÇÕES</span>
          </div>
          <span id="feed-viewers-count" style="font-size: 0.75rem; font-weight: 700; color: var(--c-accent); background: rgba(37,99,235,0.08); padding: 0.2rem 0.6rem; border-radius: var(--radius-full);">
            ${this.viewerCount} pessoas agora
          </span>
        </div>

        <div id="feed-events-list" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 380px; overflow-y: auto;">
          <!-- Eventos renderizados por renderEventsOnly -->
        </div>
      </div>
    `;

    this.renderEventsOnly();
  }

  renderEventsOnly() {
    const listEl = document.getElementById('feed-events-list');
    if (!listEl) return;

    listEl.innerHTML = this.events.map(ev => `
      <div class="feed-item" style="display: flex; flex-direction: column; gap: 0.2rem; padding: 0.6rem 0.75rem; background: var(--bg-body); border-radius: var(--radius-sm); border-left: 3px solid var(--c-accent);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.7rem; font-weight: 800; color: var(--text-dim); font-family: monospace;">${ev.hora}</span>
          <span style="font-size: 0.65rem; font-weight: 800; color: var(--c-accent); text-transform: uppercase;">${ev.badge || 'ATUALIZAÇÃO'}</span>
        </div>
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${ev.titulo}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">${ev.desc}</div>
      </div>
    `).join('');
  }
}
