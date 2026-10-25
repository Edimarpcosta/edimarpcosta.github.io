/**
 * Controlador do Placar Presidencial & Bento Analytics ao Vivo
 * Renderiza dados oficiais, fotos oficiais de alta resolução, barras proporcionais,
 * métricas de apuração e componentes Bento em SVG puro.
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
      const isGov = State.electionId === '6260';
      const title = isGov ? `Governador ${State.govUf} 2026 — 2º Turno Oficial` : 'Eleição Presidencial 2026 — 2º Turno Oficial';
      const sub = isGov ? `Disputa estadual de 2º turno (ID Oficial: 6260)` : 'Aguardando primeiras urnas totalizadas pelo TSE (ID Oficial: 6258)';

      let name1 = 'FLÁVIO BOLSONARO', num1 = 'PL (22)', foto1 = './public/fotos/flavio_bolsonaro.jpg', av1 = 'FB';
      let name2 = 'LULA', num2 = 'PT (13)', foto2 = './public/fotos/lula.jpg', av2 = 'L';

      if (isGov) {
        const uf = State.govUf.toLowerCase();
        foto1 = `./public/fotos/${uf}_10.jpg`;
        foto2 = `./public/fotos/${uf}_11.jpg`;
        name1 = 'CANDIDATO 1';
        num1 = '2º Turno';
        name2 = 'CANDIDATO 2';
        num2 = '2º Turno';
        av1 = 'C1';
        av2 = 'C2';
      }

      this.scoreboardEl.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem;">
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-main);">
            ${title}
          </div>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">
            ${sub}
          </div>
          <div class="scoreboard-grid" style="margin-top: 1.5rem; max-width: 900px; margin-left: auto; margin-right: auto;">
            <div class="candidate-card bolsonaro">
              <div class="candidate-avatar avatar-bolsonaro">
                <img src="${foto1}" alt="${name1}" onerror="this.remove();" />
                <span>${av1}</span>
              </div>
              <div class="candidate-info">
                <div class="candidate-name">${name1}</div>
                <div class="candidate-meta">${num1}</div>
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
              <div class="candidate-avatar avatar-lula">
                <img src="${foto2}" alt="${name2}" onerror="this.remove();" />
                <span>${av2}</span>
              </div>
              <div class="candidate-info">
                <div class="candidate-name">${name2}</div>
                <div class="candidate-meta">${num2}</div>
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

    // Determinar Fotos Oficiais
    let fotoSrc1 = null;
    let fotoSrc2 = null;

    if (isGov) {
      const ufLower = State.govUf.toLowerCase();
      fotoSrc1 = `./public/fotos/${ufLower}_${cand1.numero}.jpg`;
      fotoSrc2 = `./public/fotos/${ufLower}_${cand2.numero}.jpg`;
    } else {
      if (cand1.numero === '22') fotoSrc1 = './public/fotos/flavio_bolsonaro.jpg';
      else if (cand1.numero === '13') fotoSrc1 = './public/fotos/lula.jpg';

      if (cand2.numero === '22') fotoSrc2 = './public/fotos/flavio_bolsonaro.jpg';
      else if (cand2.numero === '13') fotoSrc2 = './public/fotos/lula.jpg';
    }

    // Demais candidatos se houver mais de 2 (ex: 1º Turno)
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
            ${fotoSrc1 ? `<img src="${fotoSrc1}" alt="${cand1.nomeUrna}" onerror="this.remove();" />` : ''}
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
            ${fotoSrc2 ? `<img src="${fotoSrc2}" alt="${cand2.nomeUrna}" onerror="this.remove();" />` : ''}
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

    const eleitorado = (stats.eleitoradoTotal || stats.totalEleitores || 0).toLocaleString('pt-BR');
    const comp = (stats.comparecimento || 0).toLocaleString('pt-BR');
    const abst = (stats.abstencao || 0).toLocaleString('pt-BR');
    const valid = (stats.votosValidos || 0).toLocaleString('pt-BR');
    const bn = ((stats.votosBrancos || 0) + (stats.votosNulos || 0)).toLocaleString('pt-BR');

    this.metricsStripEl.innerHTML = `
      <div class="metric-item">
        <div class="metric-title">Total de Eleitores</div>
        <div class="metric-value">${eleitorado}</div>
        <div class="metric-sub">Eleitorado Apto</div>
      </div>
      <div class="metric-item">
        <div class="metric-title">Comparecimento</div>
        <div class="metric-value">${stats.percentComparecimento || '0,00'}%</div>
        <div class="metric-sub">${comp} presentes</div>
      </div>
      <div class="metric-item">
        <div class="metric-title">Abstenção</div>
        <div class="metric-value">${stats.percentAbstencao || '0,00'}%</div>
        <div class="metric-sub">${abst} ausentes</div>
      </div>
      <div class="metric-item">
        <div class="metric-title">Votos Válidos</div>
        <div class="metric-value">${stats.percentValidos || '0,00'}%</div>
        <div class="metric-sub">${valid} votos</div>
      </div>
      <div class="metric-item">
        <div class="metric-title">Brancos / Nulos</div>
        <div class="metric-value">${stats.percentBrancos || '0,00'}% / ${stats.percentNulos || '0,00'}%</div>
        <div class="metric-sub">${bn} totais</div>
      </div>
    `;
  }

  renderBentoCards(candidates, stats) {
    // 1. Sparkline Progressão Temporal
    BentoAnalytics.renderSparkline('bento-sparkline-svg', State.historyPoints);

    // 2. Treemap Colégios Eleitorais
    BentoAnalytics.renderTreemap('bento-treemap-svg');

    // 3. Radar Cívico Polar
    BentoAnalytics.renderCivicRadar('bento-radar-svg', stats);

    // 4. Termômetro de Margem
    const container = document.getElementById('bento-margin-text');
    if (container) {
      if (candidates && candidates.length >= 2 && stats && stats.percentApuradoNum > 0) {
        const c1 = candidates[0];
        const c2 = candidates[1];
        const diff = Math.abs(c1.percentualNum - c2.percentualNum).toFixed(2);
        const diffVotos = Math.abs(c1.votos - c2.votos).toLocaleString('pt-BR');
        const isB = c1.numero === '22';
        const color = isB ? 'var(--c-bolsonaro-light)' : 'var(--c-lula-light)';

        container.innerHTML = `
          <div style="font-size: 1.6rem; font-weight: 900; color: ${color};">
            +${diff}%
          </div>
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-main); margin-top: 0.2rem;">
            ${c1.nomeUrna} lidera por ${diffVotos} votos
          </div>
          <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.2rem;">
            Base de cálculo: ${stats.votosValidos.toLocaleString('pt-BR')} votos válidos apurados
          </div>
        `;
      } else {
        container.innerHTML = `
          <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-dim);">
            Aguardando primeiras urnas
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
            O termômetro calculará a margem matemática a partir do início da apuração.
          </div>
        `;
      }
    }
  }

  updateTelemetry() {
    if (!this.telemetryEl) return;

    const { lastFetchTime, latencyMs, status } = State.telemetry;
    if (!lastFetchTime) {
      this.telemetryEl.innerHTML = `<span style="color: var(--text-dim);">Conectando ao TSE...</span>`;
      return;
    }

    const secondsAgo = Math.floor((Date.now() - lastFetchTime) / 1000);
    const freshnessText = secondsAgo < 5 ? 'agora mesmo' : `há ${secondsAgo}s`;

    let statusDot = '🟢';
    let statusLabel = 'Ao Vivo';
    if (secondsAgo > 30) {
      statusDot = '🟠';
      statusLabel = 'Lento';
    } else if (status === 'offline') {
      statusDot = '🔴';
      statusLabel = 'Desconectado';
    }

    this.telemetryEl.innerHTML = `
      <span>${statusDot} <strong>${statusLabel}</strong></span>
      <span>•</span>
      <span>Atualizado ${freshnessText}</span>
      <span>•</span>
      <span>Latência: <strong>${latencyMs}ms</strong></span>
    `;
  }
}
