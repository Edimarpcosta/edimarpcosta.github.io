/**
 * Módulo Parlamentar & Quem é Quem no Congresso Nacional - Analítica Política 2026 (v9.1 - Seções 7.2 e 7.3)
 * Duas visões separadas com contagens dinâmicas:
 * 1. Em exercício hoje (594 parlamentares)
 * 2. Eleitos em 2026 (567 parlamentares)
 * Ordenação padrão alfabética (A-Z), indicadores brutos com notas metodológicas e índice personalizado opcional.
 */

import { State, removeAccents } from '../state.js';

export class ParlamentaresUI {
  constructor(containerId, formulaCardId) {
    this.container = document.getElementById(containerId);
    this.formulaCard = document.getElementById(formulaCardId);
    this.filterCasa = 'todas';
    this.filterUf = 'todas';
    this.filterPartido = 'todos';
    this.filterLetra = 'todas';
    this.searchQuery = '';
    this.modoUniverso = 'exercicio'; // 'exercicio' ou 'eleitos'
    this.sortBy = 'nome';            // Ordenação padrão: alfabética (A-Z)
    this.showCustomIndex = false;    // Desligado por padrão
    this.compareList = [];           // IDs selecionados para comparação (até 5)
  }

  init() {
    this.renderFormulaSliders();
    this.renderFiltersAndCards();
  }

  setModoUniverso(modo) {
    this.modoUniverso = modo;
    this.renderFiltersAndCards();
  }

  openModalById(parlId) {
    const p = (State.parlamentares || []).find(item => item.id === parlId);
    if (p) this.openDetailModal(p);
  }

  renderFormulaSliders() {
    if (!this.formulaCard) return;

    const w = State.weights;

    this.formulaCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div class="formula-title" style="display: flex; align-items: center; gap: 0.5rem;">
            <span>⚖️ Indicadores Brutos de Atuação Parlamentar</span>
          </div>
          <div class="formula-sub" style="margin-top: 0.25rem;">
            Dados consolidados de presença em plenário, proposições, cotas (CEAP) e fundos públicos. Sem rankings arbitrários.
          </div>
        </div>
        <button id="btn-toggle-custom-index" class="btn-ctrl" style="font-size: 0.8rem; font-weight: 700; padding: 0.4rem 0.8rem;">
          ${this.showCustomIndex ? 'Fechar Meu Índice' : 'Montar Meu Índice (Opcional)'}
        </button>
      </div>

      <div id="custom-index-panel" class="${this.showCustomIndex ? '' : 'hidden'}" style="${this.showCustomIndex ? 'display: block;' : 'display: none;'} margin-top: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
        <div style="background: rgba(245, 158, 11, 0.08); border-left: 4px solid var(--c-warning); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--text-main); margin-bottom: 1rem;">
          <strong>Aviso Cívico:</strong> Índice calculado por você conforme seus critérios. Não é nota oficial, recomendação de voto nem ranking do Congresso Nacional.
          <br /><code>Fórmula: (w1·Presença + w2·Economia da Cota + w3·Atividade + w4·Transparência) / Soma(Pesos)</code>
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
      </div>
    `;

    document.getElementById('btn-toggle-custom-index')?.addEventListener('click', () => {
      this.showCustomIndex = !this.showCustomIndex;
      this.renderFormulaSliders();
      this.renderFiltersAndCards();
    });

    if (this.showCustomIndex) {
      ['presenca', 'economia', 'atividade', 'transparencia'].forEach(key => {
        const slider = document.getElementById(`slider-${key}`);
        if (slider) {
          slider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            document.getElementById(`weight-val-${key}`).innerText = `${val}%`;
            State.weights[key] = val;
            this.recalculateCustomScores();
            this.renderCardsGridOnly();
          });
        }
      });
    }
  }

  recalculateCustomScores() {
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
  }

  getFilteredList() {
    let list = State.parlamentares || [];

    // 1. Filtro por universo (Em Exercício vs Eleitos 2026)
    if (this.modoUniverso === 'eleitos') {
      list = list.filter(p => p.eleito_2026);
    } else {
      list = list.filter(p => p.em_exercicio);
    }

    // 2. Filtro de Casa
    if (this.filterCasa !== 'todas') {
      const c = this.filterCasa === 'camara' ? 'Câmara' : 'Senado';
      list = list.filter(p => p.casa === c);
    }

    // 3. Filtro de UF
    if (this.filterUf !== 'todas') {
      list = list.filter(p => p.uf === this.filterUf);
    }

    // 4. Filtro de Partido
    if (this.filterPartido !== 'todos') {
      list = list.filter(p => p.partido === this.filterPartido);
    }

    // 5. Filtro por Letra Inicial A-Z
    if (this.filterLetra !== 'todas') {
      list = list.filter(p => p.nome && p.nome.trim().toUpperCase().startsWith(this.filterLetra));
    }

    // 6. Busca textual
    if (this.searchQuery) {
      const q = removeAccents(this.searchQuery);
      list = list.filter(p => {
        const n = removeAccents(p.nome);
        const pt = removeAccents(p.partido);
        const u = removeAccents(p.uf);
        return n.includes(q) || pt.includes(q) || u.includes(q);
      });
    }

    // 7. Ordenação (Alfabética por padrão)
    if (this.sortBy === 'nome') {
      list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    } else if (this.sortBy === 'presenca') {
      list.sort((a, b) => (b.presenca || 0) - (a.presenca || 0));
    } else if (this.sortBy === 'proposicoes') {
      list.sort((a, b) => (b.proposicoes || 0) - (a.proposicoes || 0));
    } else if (this.sortBy === 'score' && this.showCustomIndex) {
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    State.cache.parlamentaresFiltrados = list;
    return list;
  }

  renderFiltersAndCards() {
    if (!this.container) return;

    const totalEmExercicio = (State.parlamentares || []).filter(p => p.em_exercicio).length;
    const totalEleitos2026 = (State.parlamentares || []).filter(p => p.eleito_2026).length;

    // Gerar lista única de partidos
    const partidos = Array.from(new Set((State.parlamentares || []).map(p => p.partido))).filter(Boolean).sort();
    const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    const titleUniverso = this.modoUniverso === 'eleitos' 
      ? `Eleitos em 2026 (${totalEleitos2026})` 
      : `Deputados e senadores em exercício (${totalEmExercicio})`;

    this.container.innerHTML = `
      <!-- Seletor de Universo e Cabeçalho Geral -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">${titleUniverso}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Consulta nominal oficial com transparência de dados públicos e prestação de contas
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem;">
          <button id="btn-universo-exercicio" class="btn-ctrl ${this.modoUniverso === 'exercicio' ? 'active' : ''}">
            Em Exercício (${totalEmExercicio})
          </button>
          <button id="btn-universo-eleitos" class="btn-ctrl ${this.modoUniverso === 'eleitos' ? 'active' : ''}">
            Eleitos 2026 (${totalEleitos2026})
          </button>
        </div>
      </div>

      <!-- Barra de Filtros Alfabéticos Rápidos A-Z (Quem é Quem) -->
      <div style="display: flex; gap: 0.25rem; flex-wrap: wrap; margin-bottom: 1rem; background: var(--bg-card); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); align-items: center;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-dim); margin-right: 0.25rem;">A–Z:</span>
        <button class="btn-ctrl btn-letra-filter ${this.filterLetra === 'todas' ? 'active' : ''}" data-letra="todas" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;">Todas</button>
        ${alphabet.map(l => `
          <button class="btn-ctrl btn-letra-filter ${this.filterLetra === l ? 'active' : ''}" data-letra="${l}" style="padding: 0.15rem 0.35rem; font-size: 0.75rem; min-width: 24px;">${l}</button>
        `).join('')}
      </div>

      <!-- Barra Principal de Filtros e Busca -->
      <div class="filters-bar" style="margin-bottom: 1.25rem;">
        <input 
          type="text" 
          id="search-parlamentar" 
          class="search-input" 
          placeholder="Buscar por nome, partido ou UF..." 
          value="${this.searchQuery}"
        />

        <select id="select-parl-casa" class="filter-select" aria-label="Filtrar por Casa Legislativa">
          <option value="todas">Todas as Casas</option>
          <option value="camara" ${this.filterCasa === 'camara' ? 'selected' : ''}>Câmara dos Deputados</option>
          <option value="senado" ${this.filterCasa === 'senado' ? 'selected' : ''}>Senado Federal</option>
        </select>

        <select id="select-parl-uf" class="filter-select" aria-label="Filtrar por Estado">
          <option value="todas">Todas as UFs</option>
          ${ufs.map(uf => `<option value="${uf}" ${this.filterUf === uf ? 'selected' : ''}>${uf}</option>`).join('')}
        </select>

        <select id="select-parl-partido" class="filter-select" aria-label="Filtrar por Partido">
          <option value="todos">Todos os Partidos</option>
          ${partidos.map(pt => `<option value="${pt}" ${this.filterPartido === pt ? 'selected' : ''}>${pt}</option>`).join('')}
        </select>

        <select id="select-parl-sort" class="filter-select" aria-label="Critério de ordenação">
          <option value="nome" ${this.sortBy === 'nome' ? 'selected' : ''}>Ordem Alfabética (A–Z)</option>
          <option value="presenca" ${this.sortBy === 'presenca' ? 'selected' : ''}>Maior Presença em Plenário</option>
          <option value="proposicoes" ${this.sortBy === 'proposicoes' ? 'selected' : ''}>Mais Proposições Apresentadas</option>
          ${this.showCustomIndex ? `<option value="score" ${this.sortBy === 'score' ? 'selected' : ''}>Índice Personalizado</option>` : ''}
        </select>
      </div>

      <!-- Barra de Comparação Rápida Lado a Lado (2 a 5 parlamentares) -->
      <div id="compare-bar-container" class="hidden" style="display: none; background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; justify-content: space-between; align-items: center;">
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);" id="compare-count-text">
          0 parlamentares selecionados para comparação (mín 2, máx 5)
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="btn-open-comparator" class="btn-ctrl" style="background: var(--c-accent); color: #fff; font-weight: 700; padding: 0.35rem 0.75rem;">
            Comparar Lado a Lado
          </button>
          <button id="btn-clear-compare" class="btn-ctrl" style="font-size: 0.75rem;">Limpar</button>
        </div>
      </div>

      <!-- Grid de Cards de Parlamentares -->
      <div id="parlamentares-grid" class="parlamentares-grid"></div>
    `;

    this.renderCardsGridOnly();
    this.attachFilterEvents();
  }

  renderCardsGridOnly() {
    const grid = document.getElementById('parlamentares-grid');
    if (!grid) return;

    const list = this.getFilteredList();

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          🔍 Nenhum parlamentar encontrado para os filtros selecionados.
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(p => {
      const isCompareChecked = this.compareList.includes(p.id);
      return `
        <div class="parlamentar-card" data-id="${p.id}" tabindex="0" role="article" aria-label="${p.nome} - ${p.partido} ${p.uf}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div style="display: flex; gap: 0.75rem; align-items: center;">
              <div class="parlamentar-photo" style="width: 52px; height: 52px; border-radius: 50%; overflow: hidden; background: var(--bg-body); border: 2px solid var(--border-subtle); flex-shrink: 0;">
                <img src="${p.foto}" alt="${p.nome}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='./public/favicon.svg';" />
              </div>
              <div>
                <div class="parlamentar-name" style="font-size: 0.95rem; font-weight: 800; color: var(--text-main);">${p.nome}</div>
                <div class="parlamentar-party" style="font-size: 0.75rem; color: var(--text-dim);">${p.partido} • ${p.uf} • ${p.casa}</div>
              </div>
            </div>

            <label style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; color: var(--text-dim); cursor: pointer;" title="Selecionar para comparar">
              <input type="checkbox" class="chk-compare-parl" data-id="${p.id}" ${isCompareChecked ? 'checked' : ''} />
              <span>Comparar</span>
            </label>
          </div>

          <!-- Indicadores Brutos Auditados -->
          <div class="parlamentar-metrics" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
            <div>
              <div style="font-size: 0.7rem; color: var(--text-dim);">Presença Plenário</div>
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-main);">${p.presenca || 0}%</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-dim);">Proposições</div>
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-main);">${p.proposicoes || 0} matérias</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-dim);">Cota Utilizada</div>
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-main);">R$ ${(p.despesas_cota_reais || 0).toLocaleString('pt-BR')}</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-dim);">Fundo Eleitoral</div>
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-main);">R$ ${(p.fundo_eleitoral_reais || 0).toLocaleString('pt-BR')}</div>
            </div>
          </div>

          ${this.showCustomIndex ? `
            <div style="margin-top: 0.75rem; padding: 0.4rem 0.6rem; background: var(--bg-body); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: var(--text-dim);">Seu Índice:</span>
              <span style="font-size: 0.95rem; font-weight: 800; color: var(--c-accent);">${p.score || 0}</span>
            </div>
          ` : ''}

          <div style="margin-top: 0.75rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: var(--text-dim);">
            <span>Fonte: ${p.casa === 'Senado' ? 'Senado Federal' : 'Câmara dos Deputados'}</span>
            <button class="btn-ctrl btn-ver-ficha" data-id="${p.id}" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;">Ficha Completa</button>
          </div>
        </div>
      `;
    }).join('');

    this.attachCardEvents();
  }

  attachFilterEvents() {
    // Universo: Em Exercício vs Eleitos 2026
    document.getElementById('btn-universo-exercicio')?.addEventListener('click', () => {
      this.setModoUniverso('exercicio');
    });
    document.getElementById('btn-universo-eleitos')?.addEventListener('click', () => {
      this.setModoUniverso('eleitos');
    });

    // Letra A-Z
    this.container.querySelectorAll('.btn-letra-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterLetra = btn.getAttribute('data-letra');
        this.container.querySelectorAll('.btn-letra-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderCardsGridOnly();
      });
    });

    // Busca
    const searchInput = document.getElementById('search-parlamentar');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderCardsGridOnly();
      });
    }

    // Selects
    document.getElementById('select-parl-casa')?.addEventListener('change', (e) => {
      this.filterCasa = e.target.value;
      this.renderCardsGridOnly();
    });
    document.getElementById('select-parl-uf')?.addEventListener('change', (e) => {
      this.filterUf = e.target.value;
      this.renderCardsGridOnly();
    });
    document.getElementById('select-parl-partido')?.addEventListener('change', (e) => {
      this.filterPartido = e.target.value;
      this.renderCardsGridOnly();
    });
    document.getElementById('select-parl-sort')?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.renderCardsGridOnly();
    });

    // Barra de Comparação
    document.getElementById('btn-clear-compare')?.addEventListener('click', () => {
      this.compareList = [];
      this.updateCompareBar();
      this.renderCardsGridOnly();
    });
    document.getElementById('btn-open-comparator')?.addEventListener('click', () => {
      this.openComparatorModal();
    });
  }

  attachCardEvents() {
    // Checkbox de comparação
    this.container.querySelectorAll('.chk-compare-parl').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = chk.getAttribute('data-id');
        if (chk.checked) {
          if (this.compareList.length >= 5) {
            alert('Você pode comparar no máximo 5 parlamentares simultaneamente.');
            chk.checked = false;
            return;
          }
          if (!this.compareList.includes(id)) this.compareList.push(id);
        } else {
          this.compareList = this.compareList.filter(x => x !== id);
        }
        this.updateCompareBar();
      });
    });

    // Clique no botão ou no card para abrir modal de ficha completa
    this.container.querySelectorAll('.btn-ver-ficha').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const p = (State.parlamentares || []).find(item => item.id === id);
        if (p) this.openDetailModal(p);
      });
    });

    this.container.querySelectorAll('.parlamentar-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('input') || e.target.closest('button')) return;
        const id = card.getAttribute('data-id');
        const p = (State.parlamentares || []).find(item => item.id === id);
        if (p) this.openDetailModal(p);
      });
    });
  }

  updateCompareBar() {
    const bar = document.getElementById('compare-bar-container');
    const txt = document.getElementById('compare-count-text');
    if (!bar) return;

    const count = this.compareList.length;
    if (count > 0) {
      bar.classList.remove('hidden');
      bar.style.display = 'flex';
      if (txt) txt.innerText = `${count} parlamentar(es) selecionado(s) para comparação lado a lado (máx 5)`;
    } else {
      bar.classList.add('hidden');
      bar.style.display = 'none';
    }
  }

  openComparatorModal() {
    if (this.compareList.length < 2) {
      alert('Selecione pelo menos 2 parlamentares para comparar.');
      return;
    }

    const items = (State.parlamentares || []).filter(p => this.compareList.includes(p.id));
    const modal = document.getElementById('parlamentar-modal');
    const title = document.getElementById('parlamentar-modal-title');
    const body = document.getElementById('parlamentar-modal-body');
    if (!modal) return;

    if (title) title.innerText = `Comparador Direto de Parlamentares (${items.length})`;
    if (body) {
      body.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
          Exibição lado a lado de indicadores brutos auditados. Não utiliza notas arbitrárias.
        </div>
        <div style="display: grid; grid-template-columns: repeat(${items.length}, minmax(180px, 1fr)); gap: 1rem; overflow-x: auto;">
          ${items.map(p => `
            <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
              <img src="${p.foto}" alt="${p.nome}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin: 0 auto 0.5rem;" onerror="this.src='./public/favicon.svg';" />
              <div style="font-weight: 800; font-size: 0.9rem;">${p.nome}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 0.75rem;">${p.partido} • ${p.uf} (${p.casa})</div>
              
              <div style="display: flex; flex-direction: column; gap: 0.5rem; text-align: left; font-size: 0.8rem; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
                <div>
                  <span style="color: var(--text-dim); font-size: 0.7rem;">Presença em Plenário:</span>
                  <div style="font-weight: 700;">${p.presenca}% (${p.presenca_sessoes || 0} sessões)</div>
                </div>
                <div>
                  <span style="color: var(--text-dim); font-size: 0.7rem;">Proposições Apresentadas:</span>
                  <div style="font-weight: 700;">${p.proposicoes || 0} matérias</div>
                </div>
                <div>
                  <span style="color: var(--text-dim); font-size: 0.7rem;">Cota Utilizada (CEAP):</span>
                  <div style="font-weight: 700;">R$ ${(p.despesas_cota_reais || 0).toLocaleString('pt-BR')}</div>
                </div>
                <div>
                  <span style="color: var(--text-dim); font-size: 0.7rem;">Fundo Eleitoral:</span>
                  <div style="font-weight: 700;">R$ ${(p.fundo_eleitoral_reais || 0).toLocaleString('pt-BR')}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  openDetailModal(p) {
    const modal = document.getElementById('parlamentar-modal');
    const title = document.getElementById('parlamentar-modal-title');
    const body = document.getElementById('parlamentar-modal-body');
    if (!modal) return;

    if (title) title.innerText = `${p.nome} — Ficha Oficial de Atuação`;
    if (body) {
      body.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
          <img src="${p.foto}" alt="${p.nome}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-subtle);" onerror="this.src='./public/favicon.svg';" />
          <div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-main);">${p.nome}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${p.cargo} • ${p.partido} • ${p.uf}</div>
            <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.2rem;">Mandato: <strong>${p.mandato_status || 'Legislatura 2023-2026'}</strong></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: var(--bg-body); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 1rem;">
          <div>
            <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-dim);">Presença em Votações Nominais</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">${p.presenca}%</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${p.presenca_sessoes || 0} sessões comparecidas</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-dim);">Proposições Legislativas</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">${p.proposicoes || 0}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Projetos e requerimentos</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-dim);">Despesas Cota Parlamentar (CEAP)</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">R$ ${(p.despesas_cota_reais || 0).toLocaleString('pt-BR')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Economia da cota: ${p.economia_cota || 0}%</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-dim);">Recursos do Fundo Eleitoral</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">R$ ${(p.fundo_eleitoral_reais || 0).toLocaleString('pt-BR')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Prestação de contas TSE</div>
          </div>
        </div>

        <!-- Notas Metodológicas: O que mede e o que não mede -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.75rem; font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
          <strong style="color: var(--text-main);">O que estes indicadores medem:</strong>
          Frequência nominal registrada em plenário, proposições autuadas, despesas declaradas da cota para o exercício da atividade parlamentar e doações oficiais registradas no TSE.
          <br /><strong style="color: var(--text-main); margin-top: 0.35rem; display: block;">O que NÃO medem:</strong>
          Qualidade do voto, trabalho de relatoria e debates em comissões temáticas, nem alinhamento ideológico com o eleitor.
        </div>

        <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-dim);">
          <span>Fonte: ${p.casa === 'Senado' ? 'Senado Federal' : 'Câmara dos Deputados'} · Atualizado em ${p.data_atualizacao || '25/10/2026'}</span>
          <a href="https://www.camara.leg.br" target="_blank" rel="noopener noreferrer" style="color: var(--c-accent); text-decoration: underline;">Portal Oficial</a>
        </div>
      `;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}
