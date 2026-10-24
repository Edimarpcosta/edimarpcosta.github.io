/**
 * Módulo Parlamentar & Índice de Eficiência Transparente
 * Renderiza os 594 deputados federais e senadores com sliders de pesos customizáveis em tempo real.
 */

import { State, removeAccents } from '../state.js';

export class ParlamentaresUI {
  constructor(containerId, formulaCardId) {
    this.container = document.getElementById(containerId);
    this.formulaCard = document.getElementById(formulaCardId);
    this.filterCasa = 'todas';
    this.filterUf = 'todas';
    this.filterPartido = 'todos';
    this.searchQuery = '';
    this.sortBy = 'score';
  }

  init() {
    this.renderFormulaSliders();
    this.renderFiltersAndCards();
  }

  renderFormulaSliders() {
    if (!this.formulaCard) return;

    const w = State.weights;

    this.formulaCard.innerHTML = `
      <div class="formula-title">
        <span>⚖️ Índice de Eficiência Parlamentar (Transparente & Customizável)</span>
      </div>
      <div class="formula-sub">
        Fórmula aberta: <code>Índice = w1·Presença + w2·Economia da Cota + w3·Atividade + w4·Transparência</code>.
        Ajuste os controles deslizantes abaixo para calibrar os pesos conforme suas prioridades cívicas:
      </div>

      <div class="sliders-grid">
        <div class="slider-group">
          <div class="slider-header">
            <span>Presença em Plenário</span>
            <span id="weight-val-presenca">${w.presenca}%</span>
          </div>
          <input type="range" class="slider-input" id="slider-presenca" min="0" max="60" value="${w.presenca}" />
        </div>

        <div class="slider-group">
          <div class="slider-header">
            <span>Economia de Cota (CEAP)</span>
            <span id="weight-val-economia">${w.economia}%</span>
          </div>
          <input type="range" class="slider-input" id="slider-economia" min="0" max="60" value="${w.economia}" />
        </div>

        <div class="slider-group">
          <div class="slider-header">
            <span>Atividade Legislativa</span>
            <span id="weight-val-atividade">${w.atividade}%</span>
          </div>
          <input type="range" class="slider-input" id="slider-atividade" min="0" max="60" value="${w.atividade}" />
        </div>

        <div class="slider-group">
          <div class="slider-header">
            <span>Transparência Pública</span>
            <span id="weight-val-transparencia">${w.transparencia}%</span>
          </div>
          <input type="range" class="slider-input" id="slider-transparencia" min="0" max="60" value="${w.transparencia}" />
        </div>
      </div>
    `;

    ['presenca', 'economia', 'atividade', 'transparencia'].forEach(key => {
      const slider = document.getElementById(`slider-${key}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          document.getElementById(`weight-val-${key}`).innerText = `${val}%`;
          State.weights[key] = val;
          this.recalculateAndRender();
        });
      }
    });
  }

  recalculateAndRender() {
    const w = State.weights;
    const sumW = (w.presenca + w.economia + w.atividade + w.transparencia) || 1;

    for (const p of State.parlamentares) {
      const propNorm = Math.min(100, (p.proposicoes || 0) / 1.5);
      const score = (
        (w.presenca * (p.presenca || 0)) +
        (w.economia * (p.economia_cota || 0)) +
        (w.atividade * propNorm) +
        (w.transparencia * (p.transparencia || 0))
      ) / sumW;
      p.score = Math.round(score * 10) / 10;
    }

    this.renderFiltersAndCards();
  }

  renderFiltersAndCards() {
    if (!this.container) return;

    // Filtros dinâmicos
    let list = [...State.parlamentares];

    if (this.filterCasa !== 'todas') {
      list = list.filter(p => p.casa.toLowerCase() === this.filterCasa.toLowerCase());
    }

    if (this.filterUf !== 'todas') {
      list = list.filter(p => p.uf.toUpperCase() === this.filterUf.toUpperCase());
    }

    if (this.filterPartido !== 'todos') {
      list = list.filter(p => p.partido.toUpperCase() === this.filterPartido.toUpperCase());
    }

    if (this.searchQuery) {
      const q = removeAccents(this.searchQuery);
      list = list.filter(p => 
        removeAccents(p.nome).includes(q) || 
        removeAccents(p.partido).includes(q) || 
        removeAccents(p.uf).includes(q)
      );
    }

    // Ordenação
    list.sort((a, b) => {
      if (this.sortBy === 'score') return b.score - a.score;
      if (this.sortBy === 'presenca') return b.presenca - a.presenca;
      if (this.sortBy === 'economia') return b.economia_cota - a.economia_cota;
      if (this.sortBy === 'nome') return a.nome.localeCompare(b.nome);
      return 0;
    });

    // Salvar no State.cache (DIRETRIZ MANDATÓRIA: Estado-para-Visualização)
    State.cache.parlamentaresFiltrados = list;

    // Listas únicas para selects
    const partidos = [...new Set(State.parlamentares.map(p => p.partido))].filter(Boolean).sort();
    const ufs = [...new Set(State.parlamentares.map(p => p.uf))].filter(Boolean).sort();

    this.container.innerHTML = `
      <div class="parlamentar-filters">
        <input 
          type="text" 
          id="search-parlamentar" 
          class="search-input" 
          style="max-width: 280px;" 
          placeholder="🔍 Buscar por parlamentar ou partido..." 
          value="${this.searchQuery}"
        />

        <select id="select-casa" class="election-select">
          <option value="todas" ${this.filterCasa === 'todas' ? 'selected' : ''}>Todas as Casas (594)</option>
          <option value="Câmara" ${this.filterCasa === 'Câmara' ? 'selected' : ''}>Câmara dos Deputados (513)</option>
          <option value="Senado" ${this.filterCasa === 'Senado' ? 'selected' : ''}>Senado Federal (81)</option>
        </select>

        <select id="select-uf-parlamentar" class="election-select">
          <option value="todas">Todas as UFs</option>
          ${ufs.map(u => `<option value="${u}" ${u === this.filterUf ? 'selected' : ''}>${u}</option>`).join('')}
        </select>

        <select id="select-partido-parlamentar" class="election-select">
          <option value="todos">Todos os Partidos</option>
          ${partidos.map(pt => `<option value="${pt}" ${pt === this.filterPartido ? 'selected' : ''}>${pt}</option>`).join('')}
        </select>

        <select id="select-sort-parlamentar" class="election-select">
          <option value="score" ${this.sortBy === 'score' ? 'selected' : ''}>Ordenar por: Índice de Eficiência</option>
          <option value="presenca" ${this.sortBy === 'presenca' ? 'selected' : ''}>Ordenar por: Presença em Plenário</option>
          <option value="economia" ${this.sortBy === 'economia' ? 'selected' : ''}>Ordenar por: Economia de Cota</option>
          <option value="nome" ${this.sortBy === 'nome' ? 'selected' : ''}>Ordenar por: Nome</option>
        </select>

        <span style="font-size: 0.8rem; color: var(--text-dim); margin-left: auto;">
          Exibindo <strong>${list.length}</strong> parlamentares
        </span>
      </div>

      <div class="parlamentares-grid" style="margin-top: 1.25rem;">
        ${list.slice(0, 60).map(p => {
          const normId = State.normalizeId(p.id);
          const initial = p.nome ? p.nome.charAt(0) : 'P';
          const avatarHtml = p.foto 
            ? `<img src="${p.foto}" alt="${p.nome}" class="parlamentar-foto" loading="lazy" onerror="this.onerror=null; this.src=''; this.parentElement.innerHTML='<div class=\\'parlamentar-foto\\' style=\\'display:flex;align-items:center;justify-content:center;font-weight:800;color:#94a3b8;\\'>${initial}</div>';" />`
            : `<div class="parlamentar-foto" style="display:flex;align-items:center;justify-content:center;font-weight:800;color:#94a3b8;">${initial}</div>`;

          return `
            <div class="parlamentar-card" data-id="${normId}">
              ${avatarHtml}
              <div class="parlamentar-info">
                <div class="parlamentar-nome" title="${p.nome}">${p.nome}</div>
                <div class="parlamentar-sub">${p.partido} • ${p.uf} (${p.casa})</div>
                <div class="parlamentar-score-badge">
                  <span>Score:</span>
                  <strong>${p.score}</strong> / 100
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${list.length > 60 ? `
        <div style="text-align: center; margin-top: 1.5rem; color: var(--text-dim); font-size: 0.85rem;">
          Exibindo os primeiros 60 resultados de ${list.length}. Refine sua busca com os filtros acima.
        </div>
      ` : ''}
    `;

    // Event Listeners dos Filtros
    document.getElementById('search-parlamentar')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      this.renderFiltersAndCards();
    });

    document.getElementById('select-casa')?.addEventListener('change', (e) => {
      this.filterCasa = e.target.value;
      this.renderFiltersAndCards();
    });

    document.getElementById('select-uf-parlamentar')?.addEventListener('change', (e) => {
      this.filterUf = e.target.value;
      this.renderFiltersAndCards();
    });

    document.getElementById('select-partido-parlamentar')?.addEventListener('change', (e) => {
      this.filterPartido = e.target.value;
      this.renderFiltersAndCards();
    });

    document.getElementById('select-sort-parlamentar')?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.renderFiltersAndCards();
    });

    // Clique no Card -> Abre Modal
    this.container.querySelectorAll('.parlamentar-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        this.openModal(id);
      });
    });
  }

  openModal(parlamentarId) {
    const normId = State.normalizeId(parlamentarId);
    const p = State.parlamentares.find(x => State.normalizeId(x.id) === normId);
    if (!p) return;

    const modal = document.getElementById('parlamentar-modal');
    const modalBody = document.getElementById('parlamentar-modal-body');
    const modalTitle = document.getElementById('parlamentar-modal-title');

    if (!modal || !modalBody || !modalTitle) return;

    modalTitle.innerText = `${p.nome} (${p.partido}-${p.uf})`;

    modalBody.innerHTML = `
      <div style="display: flex; gap: 1.25rem; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem;">
        ${p.foto ? `<img src="${p.foto}" alt="${p.nome}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--border-highlight);" />` : ''}
        <div>
          <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${p.nome}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${p.cargo} • ${p.casa}</div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.25rem;">E-mail oficial: <strong>${p.email || 'Não informado'}</strong></div>
        </div>
      </div>

      <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card); margin-top: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted);">Índice Geral de Eficiência:</span>
          <span style="font-size: 1.5rem; font-weight: 900; color: var(--c-accent);">${p.score} / 100</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
        <div class="metric-item">
          <div class="metric-title">Presença em Plenário</div>
          <div class="metric-value">${p.presenca}%</div>
          <div class="metric-sub">Sessões deliberativas</div>
        </div>
        <div class="metric-item">
          <div class="metric-title">Economia de Cota (CEAP)</div>
          <div class="metric-value">${p.economia_cota}%</div>
          <div class="metric-sub">Verba não gasta do gabinete</div>
        </div>
        <div class="metric-item">
          <div class="metric-title">Proposições Legislativas</div>
          <div class="metric-value">${p.proposicoes}</div>
          <div class="metric-sub">Projetos e relatorias</div>
        </div>
        <div class="metric-item">
          <div class="metric-title">Transparência</div>
          <div class="metric-value">${p.transparencia}%</div>
          <div class="metric-sub">Conformidade e prestação</div>
        </div>
      </div>

      <div style="font-size: 0.75rem; color: var(--text-dim); line-height: 1.4; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
        * Dados extraídos diretamente das APIs oficiais da Câmara dos Deputados e do Senado Federal. 
        O índice é calculado no cliente de forma transparente com base nos pesos escolhidos pelo usuário.
      </div>
    `;

    // Abertura redundante (DIRETRIZ MANDATÓRIA)
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}
