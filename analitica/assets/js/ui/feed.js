/**
 * Feed Cronológico de Atualizações e Marcos Oficiais - Analítica Política 2026 (v9.1 - Seção 9)
 * Regras estritas de redação ("lidera" e "resultado parcial", "eleito" só se emitido pelo TSE).
 * Limitação de 1 evento por UF a cada 2 min (≥ 5% seções) e marcos a cada 5 p.p. nacionais.
 */

import { State } from '../state.js';

export class FeedUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.events = [];
    this.lastNationalPctMilestone = 0;
    this.lastNationalLeader = null;
    this.ufLastEventTime = new Map(); // uf -> timestamp (ms)
    this.ufLastLeader = new Map();    // uf -> leaderNumber
  }

  init() {
    this.render();
  }

  /**
   * Avalia novo snapshot e dispara eventos conformes aos gatilhos da Seção 9
   */
  processSnapshot(nationalData, horaDado = null) {
    if (!nationalData || !nationalData.s) return;

    const stats = nationalData.s;
    const pstNum = parseFloat(String(stats.pst || '0').replace(',', '.'));
    const isSim = State.isSimulation;
    const prefix = isSim ? '[Simulação] ' : '';
    const timeStr = horaDado || nationalData.hg || new Date().toLocaleTimeString('pt-BR');

    // Candidatos líderes
    const cargs = nationalData.carg?.[0];
    const candList = [];
    if (cargs?.agr) {
      for (const agr of cargs.agr) {
        for (const par of agr.par || []) {
          for (const c of par.cand || []) {
            candList.push({
              numero: c.n,
              nome: c.nmu || c.nm,
              votos: parseInt(c.vap || '0', 10),
              pct: c.pvap || '0,00',
              pctNum: parseFloat(String(c.pvap || '0').replace(',', '.')),
              status: c.st || ''
            });
          }
        }
      }
    }
    candList.sort((a, b) => b.votos - a.votos);
    const leader = candList[0];
    const second = candList[1];

    // 1. Marco de apuração nacional a cada 5 p.p.
    const currentMilestone = Math.floor(pstNum / 5) * 5;
    if (currentMilestone > this.lastNationalPctMilestone && currentMilestone > 0) {
      this.lastNationalPctMilestone = currentMilestone;
      let desc = leader 
        ? `Resultado parcial: ${leader.nome} lidera com ${leader.pct}% contra ${second ? second.pct + '% de ' + second.nome : ''}.`
        : `Totalização em andamento no país.`;
      
      this.addEvent({
        hora: timeStr,
        badge: 'BRASIL',
        titulo: `${prefix}Marco Nacional: ${currentMilestone}% das seções apuradas`,
        desc
      });
    }

    // 2. Mudança de liderança nacional
    if (leader && this.lastNationalLeader && leader.numero !== this.lastNationalLeader) {
      this.addEvent({
        hora: timeStr,
        badge: 'VIRADA',
        titulo: `${prefix}Alternância na Liderança Nacional`,
        desc: `Parcial (${stats.pst}% apurado): ${leader.nome} assume a liderança com ${leader.pct}% dos votos válidos.`
      });
    }
    if (leader) this.lastNationalLeader = leader.numero;

    // 3. Totalização nacional concluída
    if (pstNum >= 99.99 || nationalData.tf === 's') {
      const isEleito = leader?.status?.toLowerCase().includes('eleito');
      const textVitoria = isEleito ? `Eleito oficialmente: ${leader.nome}` : `${leader.nome} encerra na liderança`;
      this.addEvent({
        hora: timeStr,
        badge: 'FINAL',
        titulo: `${prefix}Totalização Nacional Concluída`,
        desc: `${textVitoria} com ${leader.pct}% dos votos válidos.`
      });
    }
  }

  /**
   * Avalia atualização de uma UF
   */
  processUfUpdate(ufSigla, ufData, horaDado = null) {
    if (!ufData || !ufData.s) return;

    const key = String(ufSigla).toUpperCase();
    const stats = ufData.s;
    const pstNum = parseFloat(String(stats.pst || '0').replace(',', '.'));
    const isSim = State.isSimulation;
    const prefix = isSim ? '[Simulação] ' : '';
    const now = Date.now();
    const timeStr = horaDado || ufData.hg || new Date().toLocaleTimeString('pt-BR');

    // Regra: Somente com ≥ 5% das seções apuradas na UF, máximo 1 evento por UF a cada 2 min
    const lastTime = this.ufLastEventTime.get(key) || 0;
    if (pstNum < 5.0 && pstNum < 100.0) return;

    const cargs = ufData.carg?.[0];
    const candList = [];
    if (cargs?.agr) {
      for (const agr of cargs.agr) {
        for (const par of agr.par || []) {
          for (const c of par.cand || []) {
            candList.push({
              numero: c.n,
              nome: c.nmu || c.nm,
              votos: parseInt(c.vap || '0', 10),
              pct: c.pvap || '0,00',
              status: c.st || ''
            });
          }
        }
      }
    }
    candList.sort((a, b) => b.votos - a.votos);
    const leader = candList[0];
    const prevLeader = this.ufLastLeader.get(key);

    // Mudança de liderança na UF
    if (leader && prevLeader && leader.numero !== prevLeader) {
      if (now - lastTime >= 120000) {
        this.ufLastEventTime.set(key, now);
        this.addEvent({
          hora: timeStr,
          badge: key,
          titulo: `${prefix}Mudança de Liderança em ${key}`,
          desc: `Parcial (${stats.pst}% das seções): ${leader.nome} assume a liderança estadual com ${leader.pct}%.`
        });
      }
    }
    if (leader) this.ufLastLeader.set(key, leader.numero);

    // UF 100% totalizada
    if (pstNum >= 99.99 || ufData.tf === 's') {
      if (!this.ufLastEventTime.has(`${key}_100`)) {
        this.ufLastEventTime.set(`${key}_100`, now);
        this.addEvent({
          hora: timeStr,
          badge: key,
          titulo: `${prefix}Apuração Concluída em ${key}`,
          desc: `Totalização de 100% das seções. Líder no estado: ${leader ? leader.nome + ' (' + leader.pct + '%)' : '--'}.`
        });
      }
    }
  }

  addEvent(event) {
    this.events.unshift(event);
    if (this.events.length > 50) this.events.pop(); // Limite de 50 itens
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
          <span style="font-size: 0.75rem; color: var(--text-dim);">
            Atualizações em tempo real
          </span>
        </div>

        <div id="feed-events-list" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 380px; overflow-y: auto;" aria-live="polite">
          <!-- Itens dinâmicos -->
        </div>
      </div>
    `;

    // Se estiver vazio, adiciona evento inicial oficial
    if (this.events.length === 0) {
      this.events.push({
        hora: '17:00:00',
        badge: 'OFICIAL',
        titulo: 'Início da Apuração dos Votos',
        desc: 'Recepção de boletins de urna dos 5.570 municípios do Brasil e exterior.'
      });
    }

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
