/**
 * Controlador do Mapa Vetorial do Brasil (SVG) e Painel de Detalhes
 * Suporta renderização das 27 UFs com camadas dinâmicas, elevação 3D, tooltips e busca municipal.
 */

import { BRAZIL_UF_PATHS } from './brazil_paths.js';
import { State, removeAccents } from '../state.js';
import { TseClient } from '../tse_client.js';

export class BrazilMap {
  constructor(containerId, detailContainerId, tooltipId, tseClient) {
    this.container = document.getElementById(containerId);
    this.detailContainer = document.getElementById(detailContainerId);
    this.tooltip = document.getElementById(tooltipId);
    this.tseClient = tseClient;
    this.isRendered = false;
  }

  init() {
    this.renderSvgMap();
    this.attachEvents();
    this.renderDetailPanel();
    this.initSearch();
  }

  renderSvgMap() {
    if (!this.container) return;

    let pathsHtml = '';
    let labelsHtml = '';

    for (const [sigla, uf] of Object.entries(BRAZIL_UF_PATHS)) {
      pathsHtml += `
        <path 
          id="uf-${sigla}" 
          class="uf-path" 
          d="${uf.d}" 
          data-sigla="${sigla}" 
          data-nome="${uf.nome}" 
          fill="#334155" 
          tabindex="0"
          role="button"
          aria-label="${uf.nome}"
        />
      `;

      labelsHtml += `
        <text 
          x="${uf.cx}" 
          y="${uf.cy + 4}" 
          class="uf-label"
          data-sigla="${sigla}"
        >${sigla}</text>
      `;
    }

    this.container.innerHTML = `
      <svg class="svg-brazil-map" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
        <g class="paths-group">${pathsHtml}</g>
        <g class="labels-group">${labelsHtml}</g>
      </svg>
    `;

    this.isRendered = true;
    this.updateColors();
  }

  attachEvents() {
    if (!this.container) return;

    const paths = this.container.querySelectorAll('.uf-path');
    paths.forEach(path => {
      const sigla = path.getAttribute('data-sigla');
      const nome = path.getAttribute('data-nome');

      path.addEventListener('mouseenter', (e) => this.showTooltip(e, sigla, nome));
      path.addEventListener('mousemove', (e) => this.moveTooltip(e));
      path.addEventListener('mouseleave', () => this.hideTooltip());

      path.addEventListener('click', () => {
        this.selectUf(sigla);
      });

      path.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectUf(sigla);
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && State.selectedUf) {
        this.deselectUf();
      }
    });
  }

  deselectUf() {
    State.setSelectedUf(null);
    if (!this.container) return;
    const paths = this.container.querySelectorAll('.uf-path');
    paths.forEach(p => p.classList.remove('selected'));
    const svg = this.container.querySelector('.svg-brazil-map');
    if (svg) svg.classList.remove('has-selection');
    this.renderDetailPanel();
    this.updateColors();
  }

  async selectUf(sigla) {
    if (State.selectedUf === sigla) {
      // Toggle off se já selecionado
      this.deselectUf();
      return;
    }
    
    State.setSelectedUf(sigla);

    // Atualiza classes visuais
    const paths = this.container.querySelectorAll('.uf-path');
    paths.forEach(p => {
      const pSigla = p.getAttribute('data-sigla');
      if (pSigla === State.selectedUf) {
        p.classList.add('selected');
        p.parentElement.appendChild(p); // Traz para o topo do SVG (elevação 3D)
      } else {
        p.classList.remove('selected');
      }
    });

    const svg = this.container.querySelector('.svg-brazil-map');
    if (svg) svg.classList.add('has-selection');

    this.renderDetailPanel();

    // Se UF selecionada e ainda sem dados completos no State, buscar do TSE
    if (State.selectedUf) {
      try {
        const res = await this.tseClient.fetchUf(State.selectedUf, State.electionId, State.isSimulation);
        if (res && res.data) {
          State.setUfData(State.selectedUf, res.data);
          this.renderDetailPanel();
          this.updateColors();
        }
      } catch (err) {
        console.warn(`[Map] Falha ao carregar UF ${State.selectedUf}:`, err);
      }
    }
  }

  showTooltip(e, sigla, nome) {
    if (!this.tooltip) return;

    const ufData = State.ufData.get(sigla);
    let content = `<strong>${nome} (${sigla})</strong>`;

    if (State.electionId === '6260' && !['AC', 'AM', 'DF', 'ES', 'RN', 'TO'].includes(sigla)) {
      content += `<div style="margin-top: 4px; color: var(--text-muted); font-size: 0.75rem;">Sem 2º Turno para Governador nesta UF</div>`;
    } else if (ufData) {
      const candidates = TseClient.parseCandidates(ufData);
      const stats = TseClient.parseStats(ufData);

      if (candidates.length >= 2) {
        const c1 = candidates[0];
        const c2 = candidates[1];
        const cor1 = c1.numero === '22' ? 'var(--c-bolsonaro-light)' : (c1.numero === '13' ? 'var(--c-lula-light)' : 'var(--c-accent)');
        const cor2 = c2.numero === '22' ? 'var(--c-bolsonaro-light)' : (c2.numero === '13' ? 'var(--c-lula-light)' : 'var(--c-warning)');

        content += `
          <div style="margin-top: 4px; font-size: 0.75rem;">
            <div>Apurado: <strong>${stats.percentApurado}%</strong></div>
            <div style="color: ${cor1};">${c1.nomeUrna}: <strong>${c1.percentual}%</strong> (${c1.votos.toLocaleString('pt-BR')} votos)</div>
            <div style="color: ${cor2};">${c2.nomeUrna}: <strong>${c2.percentual}%</strong> (${c2.votos.toLocaleString('pt-BR')} votos)</div>
          </div>
        `;
      } else {
        content += `<div style="margin-top: 4px; color: var(--text-dim); font-size: 0.75rem;">Aguardando apuração nesta UF</div>`;
      }
    } else {
      content += `<div style="margin-top: 4px; color: var(--text-dim); font-size: 0.75rem;">Clique para carregar dados desta UF</div>`;
    }

    this.tooltip.innerHTML = content;
    this.tooltip.classList.remove('hidden');
    this.tooltip.style.display = 'flex';
    this.moveTooltip(e);
  }

  moveTooltip(e) {
    if (!this.tooltip) return;
    const pad = 15;
    const x = e.clientX + pad;
    const y = e.clientY + pad;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  hideTooltip() {
    if (!this.tooltip) return;
    this.tooltip.classList.add('hidden');
    this.tooltip.style.display = 'none';
  }

  updateColors() {
    if (!this.isRendered || !this.container) return;

    const layer = State.activeLayer;

    for (const [sigla, uf] of Object.entries(BRAZIL_UF_PATHS)) {
      const path = document.getElementById(`uf-${sigla}`);
      if (!path) continue;

      const ufData = State.ufData.get(sigla);
      const color = this.calculateUfColor(ufData, layer);
      path.setAttribute('fill', color);
    }
  }

  calculateUfColor(ufData, layer) {
    if (!ufData) return '#26334d'; // Neutro sem carga inicial

    const candidates = TseClient.parseCandidates(ufData);
    const stats = TseClient.parseStats(ufData);

    if (!candidates || candidates.length < 2 || stats.percentApuradoNum === 0) {
      return '#334155'; // Sem dados / Aguardando
    }

    const c1 = candidates[0];
    const c2 = candidates[1];
    const margin = Math.abs(c1.percentualNum - c2.percentualNum);

    switch (layer) {
      case 'winner_margin': {
        // Escala cromática opaca de 5 níveis por margem (Plano v8 Seção 4.2)
        const isBlue = c1.numero === '22' || (State.electionId === '6260' && ['10', '11', '22', '44'].includes(c1.numero));
        const isRed = c1.numero === '13' || (State.electionId === '6260' && ['15', '43', '55'].includes(c1.numero));

        if (isBlue) {
          if (margin > 30) return '#1E3A8A';
          if (margin > 20) return '#1D4ED8';
          if (margin > 10) return '#2563EB';
          if (margin > 5) return '#3B82F6';
          return '#93C5FD';
        }
        if (isRed) {
          if (margin > 30) return '#7F1D1D';
          if (margin > 20) return '#B91C1C';
          if (margin > 10) return '#DC2626';
          if (margin > 5) return '#EF4444';
          return '#FCA5A5';
        }
        if (margin > 10) return '#2563EB';
        if (margin > 5) return '#3B82F6';
        return '#93C5FD';
      }

      case 'leader_pct': {
        const pct = c1.percentualNum;
        if (c1.numero === '22') {
          return pct > 60 ? '#1e40af' : pct > 50 ? '#3b82f6' : '#93c5fd';
        } else {
          return pct > 60 ? '#991b1b' : pct > 50 ? '#ef4444' : '#fca5a5';
        }
      }

      case 'sections_pct': {
        const ap = stats.percentApuradoNum;
        if (ap >= 99.9) return '#10b981';
        if (ap >= 75) return '#34d399';
        if (ap >= 50) return '#f59e0b';
        if (ap >= 25) return '#f97316';
        return '#64748b';
      }

      case 'turnout': {
        const turn = parseFloat(stats.percentComparecimento.replace(',', '.'));
        return turn > 82 ? '#047857' : turn > 75 ? '#10b981' : '#64748b';
      }

      case 'blank_null': {
        const bn = parseFloat(stats.percentBrancos.replace(',', '.')) + parseFloat(stats.percentNulos.replace(',', '.'));
        return bn > 7 ? '#7c3aed' : bn > 4 ? '#8b5cf6' : '#a78bfa';
      }

      default:
        return '#3b82f6';
    }
  }

  renderDetailPanel() {
    if (!this.detailContainer) return;

    if (!State.selectedUf) {
      // Visão Geral do Brasil
      this.detailContainer.innerHTML = `
        <div class="detail-header">
          <div>
            <div class="detail-title">Brasil (Nacional)</div>
            <div class="detail-sub">Clique em qualquer estado no mapa para ver estatísticas detalhadas</div>
          </div>
          <span class="live-indicator"><span class="live-dot"></span>27 UFs</span>
        </div>
        <div class="search-box-wrapper" style="margin-top: 0.5rem;">
          <input 
            type="text" 
            id="mun-search-input" 
            class="search-input" 
            placeholder="🔍 Digite o nome de qualquer município..." 
            autocomplete="off"
          />
          <div id="autocomplete-list" class="autocomplete-dropdown hidden" style="display: none;"></div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin-top: 0.5rem;">
          Selecione uma Unidade da Federação ou use o campo de busca acima para pesquisar qualquer uma das <strong>5.570 cidades</strong> do Brasil.
        </div>
      `;
      this.initSearch();
      return;
    }

    const uf = State.selectedUf;
    const ufInfo = BRAZIL_UF_PATHS[uf] || { nome: uf, sigla: uf };
    const ufData = State.ufData.get(uf);

    let statsHtml = '';
    let candidatesHtml = '';
    const isGov = State.electionId === '6260';
    const isGovNo2T = isGov && !['AC', 'AM', 'DF', 'ES', 'RN', 'TO'].includes(uf);

    if (isGovNo2T) {
      candidatesHtml = `
        <div style="padding: 1.25rem; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-top: 0.5rem; box-shadow: var(--shadow-card);">
          <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🗳️</div>
          <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">Eleição Definida em 1º Turno</div>
          <div style="font-size: 0.8rem; margin-top: 0.25rem; line-height: 1.4;">
            Não há disputa de 2º turno para Governador em ${ufInfo.nome} (${uf}). O 2º turno estadual ocorre em AC, AM, DF, ES, RN e TO.
          </div>
        </div>
      `;
    } else if (ufData && !ufData.noSecondRound) {
      const candidates = TseClient.parseCandidates(ufData);
      const stats = TseClient.parseStats(ufData);

      candidatesHtml = candidates.slice(0, 4).map((c, idx) => {
        const isB = c.numero === '22' || (isGov && idx === 0);
        const isL = c.numero === '13' || (isGov && idx === 1);
        const cl = isB ? 'bolsonaro' : isL ? 'lula' : '';
        return `
          <div class="detail-cand-row ${cl}">
            <div>
              <div style="font-weight: 800; font-size: 0.9rem;">${c.nomeUrna}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${c.partido} (${c.numero})</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.15rem; font-weight: 900;">${c.percentual}%</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${c.votos.toLocaleString('pt-BR')} votos</div>
            </div>
          </div>
        `;
      }).join('');

      statsHtml = `
        <div class="metrics-strip" style="grid-template-columns: 1fr 1fr; margin-top: 0.5rem;">
          <div class="metric-item">
            <div class="metric-title">Seções Apuradas</div>
            <div class="metric-value">${stats.percentApurado}%</div>
            <div class="metric-sub">${stats.secoesTotalizadas.toLocaleString('pt-BR')} de ${stats.totalSecoes.toLocaleString('pt-BR')}</div>
          </div>
          <div class="metric-item">
            <div class="metric-title">Comparecimento</div>
            <div class="metric-value">${stats.percentComparecimento}%</div>
            <div class="metric-sub">Abstenção: ${stats.percentAbstencao}%</div>
          </div>
        </div>
      `;
    } else {
      candidatesHtml = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">
          <div class="spinner" style="margin: 0 auto 0.75rem; width: 32px; height: 32px;"></div>
          Carregando dados oficiais de ${ufInfo.nome}...
        </div>
      `;
    }

    const sectionTitle = isGov ? 'Resultado para Governador na UF' : 'Resultado Presidencial na UF';

    this.detailContainer.innerHTML = `
      <div class="detail-header">
        <div>
          <div class="detail-title">${ufInfo.nome} (${uf})</div>
          <div class="detail-sub">Unidade Federativa Oficial</div>
        </div>
        <button id="btn-reset-uf" class="btn-ctrl" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">
          ✕ Voltar ao Brasil
        </button>
      </div>

      <div class="search-box-wrapper">
        <input 
          type="text" 
          id="mun-search-input" 
          class="search-input" 
          placeholder="🔍 Buscar município em ${ufInfo.nome}..." 
          autocomplete="off"
        />
        <div id="autocomplete-list" class="autocomplete-dropdown hidden" style="display: none;"></div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.5rem;">
        <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim);">
          ${sectionTitle}
        </div>
        ${candidatesHtml}
      </div>

      ${statsHtml}
    `;

    const btnReset = document.getElementById('btn-reset-uf');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.deselectUf();
      });
    }

    this.initSearch();
  }

  initSearch() {
    const input = document.getElementById('mun-search-input');
    const dropdown = document.getElementById('autocomplete-list');
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
      const query = removeAccents(input.value);
      if (query.length < 2) {
        dropdown.classList.add('hidden');
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
      }

      let matches = State.municipiosLookup.filter(m => {
        const normName = removeAccents(m.nm);
        const matchesQuery = normName.includes(query);
        if (State.selectedUf) {
          return matchesQuery && m.uf.toUpperCase() === State.selectedUf;
        }
        return matchesQuery;
      }).slice(0, 8);

      if (matches.length === 0) {
        dropdown.innerHTML = `<div style="padding: 0.75rem; font-size: 0.8rem; color: var(--text-dim);">Nenhum município encontrado</div>`;
      } else {
        dropdown.innerHTML = matches.map(m => `
          <div class="autocomplete-item" data-cd="${m.cd}" data-uf="${m.uf}" data-nm="${m.nm}">
            <span><strong>${m.nm}</strong> (${m.uf})</span>
            <span style="color: var(--text-dim); font-size: 0.75rem;">TSE: ${m.cd}</span>
          </div>
        `).join('');

        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
          item.addEventListener('click', () => {
            const cd = item.getAttribute('data-cd');
            const uf = item.getAttribute('data-uf');
            const nm = item.getAttribute('data-nm');
            this.handleSelectMun({ cd, uf, nm });
            dropdown.classList.add('hidden');
            dropdown.style.display = 'none';
            input.value = `${nm} (${uf})`;
          });
        });
      }

      dropdown.classList.remove('hidden');
      dropdown.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
        dropdown.style.display = 'none';
      }
    });
  }

  async handleSelectMun(mun) {
    State.setSelectedMun(mun);
    
    // Abre modal de detalhes do município
    const modal = document.getElementById('municipio-modal');
    const modalBody = document.getElementById('municipio-modal-body');
    const modalTitle = document.getElementById('municipio-modal-title');
    
    if (modal && modalBody && modalTitle) {
      modalTitle.innerText = `${mun.nm} - ${mun.uf}`;
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <div class="spinner" style="margin: 0 auto 1rem;"></div>
          Consultando dados da seção eleitoral no TSE...
        </div>
      `;
      modal.classList.remove('hidden');
      modal.style.display = 'flex';

      try {
        const res = await this.tseClient.fetchMunicipio(mun.uf, mun.cd, State.electionId, State.isSimulation);
        if (res && res.data) {
          const candidates = TseClient.parseCandidates(res.data);
          const stats = TseClient.parseStats(res.data);

          let candRows = candidates.slice(0, 6).map(c => {
            const isB = c.numero === '22';
            const isL = c.numero === '13';
            const cl = isB ? 'bolsonaro' : isL ? 'lula' : '';
            return `
              <div class="detail-cand-row ${cl}">
                <div>
                  <div style="font-weight: 800;">${c.nomeUrna}</div>
                  <div style="font-size: 0.75rem; color: var(--text-dim);">${c.partido} (${c.numero})</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 1.15rem; font-weight: 900;">${c.percentual}%</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${c.votos.toLocaleString('pt-BR')} votos</div>
                </div>
              </div>
            `;
          }).join('');

          modalBody.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
              <span>Código TSE: <strong>${mun.cd}</strong></span>
              <span>Apurado: <strong style="color: var(--c-accent);">${stats.percentApurado}%</strong></span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-top: 1rem;">
              ${candRows}
            </div>
            <div class="metrics-strip" style="margin-top: 1rem;">
              <div class="metric-item">
                <div class="metric-title">Total de Votos</div>
                <div class="metric-value">${stats.totalVotos.toLocaleString('pt-BR')}</div>
              </div>
              <div class="metric-item">
                <div class="metric-title">Comparecimento</div>
                <div class="metric-value">${stats.percentComparecimento}%</div>
              </div>
              <div class="metric-item">
                <div class="metric-title">Brancos / Nulos</div>
                <div class="metric-value">${stats.percentBrancos}% / ${stats.percentNulos}%</div>
              </div>
            </div>
          `;
        } else {
          modalBody.innerHTML = `<div style="padding: 1.5rem; color: var(--text-dim); text-align: center;">Dados municipais ainda não totalizados pelo TSE para esta cidade.</div>`;
        }
      } catch (err) {
        modalBody.innerHTML = `<div style="padding: 1.5rem; color: var(--c-warning); text-align: center;">Não foi possível carregar os dados desta cidade no momento. Verifique a conexão com a CDN oficial.</div>`;
      }
    }
  }
}
