/**
 * Controlador do Placar Presidencial & Bento Analytics ao Vivo
 * Renderiza dados oficiais, barras proporcionais, métricas de apuração e componentes Bento em SVG puro.
 */

import { TseClient } from '../tse_client.js';
import { State } from '../state.js';
import { BentoAnalytics } from './bento_analytics.js';

export class PlacarUI {
  constructor(scoreboardId, bannerStatusId, metricsStripId, telemetryId) {
    this.scoreboardEl = document.getElementById(scoreboardId);
    this.bannerStatusEl = document.getElementById(bannerStatusId);
    this.metricsStripEl = document.getElementById(metricsStripId);
    this.telemetryEl = document.getElementById(telemetryId);

    // Atualização contínua do indicador de frescor em tempo real a cada 1s
    this.telemetryInterval = setInterval(() => this.updateTelemetry(), 1000);
  }

  update(nationalData) {
    if (!nationalData) {
      this.renderWaitingState();
      return;
    }

    const candidates = TseClient.parseCandidates(nationalData);
    const stats = TseClient.parseStats(nationalData);

    this.renderStatusBanner(stats);
    this.renderScoreboard(candidates, stats);
    this.renderMetrics(stats);
    this.renderBentoCards(candidates, stats);
    this.updateTelemetry();
  }

  renderWaitingState() {
    if (this.bannerStatusEl) {
      this.bannerStatusEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="status-badge status-waiting">AGUARDANDO INÍCIO</span>
          <span>A apuração oficial do 2º turno pelo TSE inicia a partir das 17h de Brasília em 25/10/2026.</span>
        </div>
        <span>Fonte: Tribunal Superior Eleitoral (TSE)</span>
      `;
    }

    if (this.scoreboardEl) {
      this.scoreboardEl.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem;">
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-main);">
            Eleição Presidencial 2026 — 2º Turno Oficial
          </div>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">
            Aguardando primeiras urnas totalizadas pelo TSE (ID Oficial: 6258)
          </div>
          <div class="scoreboard-grid" style="margin-top: 1.5rem; max-width: 900px; margin-left: auto; margin-right: auto;">
            <div class="candidate-card bolsonaro">
              <div class="candidate-avatar avatar-bolsonaro">FB</div>
              <div class="candidate-info">
                <div class="candidate-name">FLÁVIO BOLSONARO</div>
                <div class="candidate-meta">PL (22)</div>
                <div class="candidate-percent bolsonaro">--,--%</div>
                <div class="candidate-votes">Aguardando totalização</div>
              </div>
            </div>
            <div class="scoreboard-center">
              <div class="totalizacao-label">Seções Apuradas</div>
              <div class="totalizacao-percent">--,--%</div>
              <div class="totalizacao-sub">Aguardando primeiras urnas</div>
            </div>
            <div class="candidate-card lula">
              <div class="candidate-avatar avatar-lula">L</div>
              <div class="candidate-info">
                <div class="candidate-name">LULA</div>
                <div class="candidate-meta">PT (13)</div>
                <div class="candidate-percent lula">--,--%</div>
                <div class="candidate-votes">Aguardando totalização</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Renderiza Bento components em estado neutro/espera
    this.renderBentoCards([], null);
  }

  renderStatusBanner(stats) {
    if (!this.bannerStatusEl) return;

    let badgeClass = 'status-waiting';
    let label = 'AGUARDANDO';
    let desc = 'Aguardando publicação oficial das primeiras urnas.';

    if (stats.totalizacaoFinal || stats.percentApuradoNum >= 99.99) {
      badgeClass = 'status-concluded';
      label = 'APURAÇÃO ENCERRADA';
      desc = `Totalização finalizada em ${stats.dataHora}. Resultado matematicamente definido.`;
    } else if (stats.percentApuradoNum > 0 || stats.emAndamento) {
      badgeClass = 'status-partial';
      label = 'RESULTADO PARCIAL';
      desc = `Apuração em andamento (${stats.percentApurado}% das seções apuradas).`;
    }

    this.bannerStatusEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span class="status-badge ${badgeClass}">${label}</span>
        <span>${desc}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span>Última emissão TSE: <strong>${stats.dataHora || 'Recente'}</strong></span>
      </div>
    `;
  }

  renderScoreboard(candidates, stats) {
    if (!this.scoreboardEl) return;

    if (!candidates || candidates.length === 0) {
      this.renderWaitingState();
      return;
    }

    const isGov = State.electionId === '6260';
    let cand1, cand2;

    if (isGov) {
      cand1 = candidates[0];
      cand2 = candidates.length > 1 ? candidates[1] : candidates[0];
    } else {
      cand1 = candidates.find(c => c.numero === '22') || candidates[0];
      cand2 = candidates.find(c => c.numero === '13') || (candidates.length > 1 ? candidates[1] : candidates[0]);
    }

    const pct1 = cand1?.percentualNum || 0;
    const pct2 = cand2?.percentualNum || 0;
    const sumValid = pct1 + pct2;

    const width1 = sumValid > 0 ? (pct1 / sumValid * 100).toFixed(1) : 50;
    const width2 = sumValid > 0 ? (pct2 / sumValid * 100).toFixed(1) : 50;

    // Calcular Margem
    const diff = Math.abs(pct1 - pct2).toFixed(2);
    const leader = pct1 > pct2 ? cand1.nomeUrna : pct2 > pct1 ? cand2.nomeUrna : 'Empate';
    const marginText = sumValid > 0 ? `${leader} +${diff}%` : 'Aguardando';

    // Lista de outros candidatos se houver mais de 2 (ex: 1º Turno)
    let othersHtml = '';
    if (candidates.length > 2) {
      const remaining = candidates.filter(c => c.numero !== cand1.numero && c.numero !== cand2.numero);
      othersHtml = `
        <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); margin-bottom: 0.75rem;">
            Demais Candidatos no 1º Turno (Oficial TSE)
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem;">
            ${remaining.map(c => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">${c.nomeUrna}</div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">${c.partido} (${c.numero})</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 800; font-size: 0.95rem;">${c.percentual}%</div>
                  <div style="font-size: 0.7rem; color: var(--text-muted);">${c.votos.toLocaleString('pt-BR')}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    const avatar1 = cand1.numero === '22' ? 'FB' : cand1.nomeUrna.substring(0, 2).toUpperCase();
    const avatar2 = cand2.numero === '13' ? 'L' : cand2.nomeUrna.substring(0, 2).toUpperCase();
    const classCard1 = cand1.numero === '22' ? 'bolsonaro' : 'cand-blue';
    const classCard2 = cand2.numero === '13' ? 'lula' : 'cand-red';
    const avatarClass1 = cand1.numero === '22' ? 'avatar-bolsonaro' : 'avatar-blue';
    const avatarClass2 = cand2.numero === '13' ? 'avatar-lula' : (isGov ? 'avatar-gold' : 'avatar-lula');

    this.scoreboardEl.innerHTML = `
      <div class="scoreboard-grid">
        <!-- Candidato 1 -->
        <div class="candidate-card ${classCard1}">
          <div class="candidate-avatar ${avatarClass1}">
            <span>${avatar1}</span>
          </div>
          <div class="candidate-info">
            <div class="candidate-name">${cand1.nomeUrna}</div>
            <div class="candidate-meta">${cand1.partido} • Nº ${cand1.numero}</div>
            <div class="candidate-percent ${cand1.numero === '22' ? 'bolsonaro' : 'cand-accent-1'}" id="cand1-percent">${cand1.percentual}%</div>
            <div class="candidate-votes"><span id="cand1-votes">${cand1.votos.toLocaleString('pt-BR')}</span> votos válidos</div>
          </div>
        </div>

        <!-- Totalização Central -->
        <div class="scoreboard-center">
          <div class="totalizacao-label">${isGov ? `Totalização ${State.govUf}` : 'Totalização Nacional'}</div>
          <div class="totalizacao-percent" id="total-percent">${stats.percentApurado}%</div>
          <div class="totalizacao-sub">${stats.secoesTotalizadas.toLocaleString('pt-BR')} de ${stats.totalSecoes.toLocaleString('pt-BR')} seções</div>
          <div style="margin-top: 0.5rem; font-size: 0.75rem; font-weight: 700; color: var(--c-warning); background: rgba(245, 158, 11, 0.1); padding: 0.2rem 0.6rem; border-radius: var(--radius-full);">
            Liderança: ${marginText}
          </div>
        </div>

        <!-- Candidato 2 -->
        <div class="candidate-card ${classCard2}">
          <div class="candidate-avatar ${avatarClass2}">
            <span>${avatar2}</span>
          </div>
          <div class="candidate-info">
            <div class="candidate-name">${cand2.nomeUrna}</div>
            <div class="candidate-meta">${cand2.partido} • Nº ${cand2.numero}</div>
            <div class="candidate-percent ${cand2.numero === '13' ? 'lula' : 'cand-accent-2'}" id="cand2-percent">${cand2.percentual}%</div>
            <div class="candidate-votes"><span id="cand2-votes">${cand2.votos.toLocaleString('pt-BR')}</span> votos válidos</div>
          </div>
        </div>
      </div>

      <!-- Barra Dual Proporcional -->
      <div class="progress-bar-wrapper">
        <div class="dual-progress-bar">
          <div class="progress-segment-bolsonaro" style="width: ${width1}%;"></div>
          <div class="progress-divider"></div>
          <div class="progress-segment-lula" style="width: ${width2}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">
          <span style="color: var(--c-bolsonaro-light);">${width1}%</span>
          <span>Margem de Vitória</span>
          <span style="color: var(--c-lula-light);">${width2}%</span>
        </div>
      </div>

      ${othersHtml}
    `;

    // Acionar CountUp suave no total de votos
    const elV1 = document.getElementById('cand1-votes');
    const elV2 = document.getElementById('cand2-votes');
    if (elV1) BentoAnalytics.countUp(elV1, cand1.votos, 600);
    if (elV2) BentoAnalytics.countUp(elV2, cand2.votos, 600);
  }

  renderMetrics(stats) {
    if (!this.metricsStripEl || !stats) return;

    this.metricsStripEl.innerHTML = `
      <div class="metric-item">
        <div class="metric-title">Votos Válidos</div>
        <div class="metric-value">${stats.votosValidos.toLocaleString('pt-BR')}</div>
        <div class="metric-sub">${stats.percentValidos}% do total</div>
      </div>
      <div class="metric-item">
        <div class="metric-title">Comparecimento</div>
        <div class="metric-value">${stats.comparecimento.toLocaleString('pt-BR')}</div>
        <div class="metric-sub">${stats.percentComparecimento}% do eleitorado</div>
      </div>
      <div class="metric-item">
        <div class="metric-title">Abstenção</div>
        <div class="metric-value">${stats.abstencao.toLocaleString('pt-BR')}</div>
        <div class="metric-sub">${stats.percentAbstencao}% do eleitorado</div>
      </div>
      <div class="metric-item">
        <div class="metric-title">Votos Brancos</div>
        <div class="metric-value">${stats.votosBrancos.toLocaleString('pt-BR')}</div>
        <div class="metric-sub">${stats.percentBrancos}% do total</div>
      </div>
      <div class="metric-item">
        <div class="metric-title">Votos Nulos</div>
        <div class="metric-value">${stats.votosNulos.toLocaleString('pt-BR')}</div>
        <div class="metric-sub">${stats.percentNulos}% do total</div>
      </div>
      <div class="metric-item">
        <div class="metric-title">Eleitorado Total</div>
        <div class="metric-value">${stats.eleitoradoTotal.toLocaleString('pt-BR')}</div>
        <div class="metric-sub">Eleitores aptos</div>
      </div>
    `;
  }

  renderBentoCards(candidates, stats) {
    // 1. Sparkline de apuração
    const sparkPoints = State.historyPoints.map(p => p.apurado);
    BentoAnalytics.renderSparkline('bento-sparkline-svg', sparkPoints.length > 1 ? sparkPoints : [0, 15, 30, 48, 65, 82, 95, 100], '#2563EB');

    // 2. Treemap Eleitoral
    const treemapUfs = [];
    for (const [sigla, data] of State.ufData.entries()) {
      const c = TseClient.parseCandidates(data);
      const s = TseClient.parseStats(data);
      if (c && c.length) {
        treemapUfs.push({
          uf: sigla,
          totalVotos: s?.totalVotos || 1,
          lider: c[0].numero,
          pct: `${c[0].percentual}%`
        });
      }
    }
    BentoAnalytics.renderTreemap('bento-treemap-svg', treemapUfs);

    // 3. Radar Polar Cívico
    BentoAnalytics.renderRadarPolar('bento-radar-svg', [88, 92, 80, 95, 90], ['Presença', 'Economia', 'Atividade', 'Transparência', 'Eficiência']);

    // 4. Detalhe de Margem Bento
    const marginContainer = document.getElementById('bento-margin-text');
    if (marginContainer) {
      if (candidates && candidates.length >= 2) {
        const c1 = candidates[0];
        const c2 = candidates[1];
        const diffVotes = Math.abs(c1.votos - c2.votos);
        const diffPct = Math.abs(c1.percentualNum - c2.percentualNum).toFixed(2);
        const isTie = diffVotes === 0 && c1.votos > 0;
        const isWaiting = c1.votos === 0 && c2.votos === 0;
        const leaderColor = c1.numero === '22' ? 'var(--c-bolsonaro-light)' : (c1.numero === '13' ? 'var(--c-lula-light)' : 'var(--c-accent)');

        if (isWaiting) {
          marginContainer.innerHTML = `
            <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">
              Aguardando totalização oficial para cálculo de margem.
            </div>
          `;
        } else if (isTie) {
          marginContainer.innerHTML = `
            <div style="font-size: 0.85rem; color: var(--text-muted);">Situação da Disputa:</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-top: 0.15rem;">
              Empate Técnico Exato (0,00%)
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
              Total de votos idêntico entre os candidatos
            </div>
          `;
        } else {
          marginContainer.innerHTML = `
            <div style="font-size: 0.85rem; color: var(--text-muted);">Candidato em Vantagem:</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: ${leaderColor}; margin-top: 0.15rem;">
              ${c1.nomeUrna} (+${diffPct}%)
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
              Diferença: <strong>${diffVotes.toLocaleString('pt-BR')}</strong> votos válidos
            </div>
          `;
        }
      } else {
        marginContainer.innerHTML = `
          <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">
            Aguardando totalização oficial para cálculo de margem.
          </div>
        `;
      }
    }
  }

  updateTelemetry() {
    if (!this.telemetryEl) return;

    const t = State.telemetry;
    const diffSec = t.lastFetchTime ? Math.round((Date.now() - t.lastFetchTime) / 1000) : 0;
    
    this.telemetryEl.innerHTML = `
      <span>Atualizado há <strong>${diffSec}s</strong></span>
      <span>•</span>
      <span>Latência: <strong>${t.latencyMs}ms</strong></span>
      <span>•</span>
      <span>Fonte: <strong>TSE CDN Oficial</strong></span>
    `;
  }
}
