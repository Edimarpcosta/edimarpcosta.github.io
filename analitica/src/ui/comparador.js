/**
 * Módulo Comparador Analítico & Matriz 1º Turno x 2º Turno
 * Implementa:
 * 1. Matriz de comparação direta 1T vs 2T para Presidente e Governadores.
 * 2. Análise de migração de votos e viradas eleitorais (swing states).
 * 3. Comparador lado a lado de Unidades da Federação.
 * 4. Tabela Analítica Completa com ordenação dinâmica e exportação CSV (BOM UTF-8).
 */

import { State } from '../state.js';
import { BRAZIL_UF_PATHS } from '../map/brazil_paths.js';
import { TseClient } from '../tse_client.js';

export class ComparadorUI {
  constructor(comparadorContainerId, tabelaContainerId) {
    this.comparadorContainer = document.getElementById(comparadorContainerId);
    this.tabelaContainer = document.getElementById(tabelaContainerId);
    this.sortCol = 'apurado';
    this.sortAsc = false;
  }

  init() {
    this.render();
  }

  render() {
    this.renderTurnosMatrix();
    this.renderSideBySide();
    this.renderAnalyticalTable();
  }

  renderTurnosMatrix() {
    if (!this.comparadorContainer) return;

    const isGov = State.electionId === '6260';
    let matrixHtml = '';

    if (!isGov) {
      // Comparativo Presidencial 1T x 2T
      const nationalData = State.nationalData;
      const candidates = nationalData ? TseClient.parseCandidates(nationalData) : [];
      const cand22 = candidates.find(c => c.numero === '22');
      const cand13 = candidates.find(c => c.numero === '13');

      const v22_1T = 51072345;
      const p22_1T = 43.20;
      const v13_1T = 57259504;
      const p13_1T = 48.43;

      const v22_2T = cand22 ? cand22.votos : 0;
      const p22_2T = cand22 ? cand22.percentualNum : 0;
      const v13_2T = cand13 ? cand13.votos : 0;
      const p13_2T = cand13 ? cand13.percentualNum : 0;

      const deltaP22 = (p22_2T > 0 ? p22_2T - p22_1T : 0).toFixed(2);
      const deltaP13 = (p13_2T > 0 ? p13_2T - p13_1T : 0).toFixed(2);
      const sign22 = parseFloat(deltaP22) >= 0 ? '+' : '';
      const sign13 = parseFloat(deltaP13) >= 0 ? '+' : '';

      matrixHtml = `
        <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: var(--shadow-card);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">
                🗳️ Matriz Comparativa Oficial: 1º Turno x 2º Turno Presidencial
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                Acompanhe o crescimento de votos e a migração de eleitores entre os dois turnos eleitorais
              </div>
            </div>
            <span class="status-badge status-concluded">1T CONSOLIDADO x 2T AO VIVO</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
            <!-- Card Flávio Bolsonaro -->
            <div style="background: var(--bg-body); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); padding: 1.25rem; border-left: 5px solid var(--c-bolsonaro);">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="candidate-avatar avatar-bolsonaro" style="width: 58px; height: 58px;">
                  <img src="./public/fotos/flavio_bolsonaro.jpg" alt="Flávio Bolsonaro" onerror="this.remove();" />
                  <span>FB</span>
                </div>
                <div>
                  <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">FLÁVIO BOLSONARO</div>
                  <div style="font-size: 0.75rem; color: var(--text-dim);">PL • Nº 22</div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
                <div>
                  <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">1º Turno (Final)</div>
                  <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">${p22_1T.toFixed(2)}%</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${v22_1T.toLocaleString('pt-BR')} votos</div>
                </div>
                <div>
                  <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--c-bolsonaro-light); font-weight: 700;">2º Turno (Atual)</div>
                  <div style="font-size: 1.1rem; font-weight: 800; color: var(--c-bolsonaro-light);">${p22_2T > 0 ? p22_2T.toFixed(2) + '%' : 'Aguardando'}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${v22_2T > 0 ? v22_2T.toLocaleString('pt-BR') + ' votos' : '--'}</div>
                </div>
              </div>

              <div style="margin-top: 0.75rem; padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); background: rgba(37,99,235,0.08); font-size: 0.75rem; font-weight: 700; color: var(--c-bolsonaro-light); display: flex; justify-content: space-between;">
                <span>Evolução Percentual:</span>
                <span>${p22_2T > 0 ? `${sign22}${deltaP22}%` : 'Em apuração'}</span>
              </div>
            </div>

            <!-- Card Lula -->
            <div style="background: var(--bg-body); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); padding: 1.25rem; border-left: 5px solid var(--c-lula);">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="candidate-avatar avatar-lula" style="width: 58px; height: 58px;">
                  <img src="./public/fotos/lula.jpg" alt="Lula" onerror="this.remove();" />
                  <span>L</span>
                </div>
                <div>
                  <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">LULA</div>
                  <div style="font-size: 0.75rem; color: var(--text-dim);">PT • Nº 13</div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
                <div>
                  <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">1º Turno (Final)</div>
                  <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">${p13_1T.toFixed(2)}%</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${v13_1T.toLocaleString('pt-BR')} votos</div>
                </div>
                <div>
                  <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--c-lula-light); font-weight: 700;">2º Turno (Atual)</div>
                  <div style="font-size: 1.1rem; font-weight: 800; color: var(--c-lula-light);">${p13_2T > 0 ? p13_2T.toFixed(2) + '%' : 'Aguardando'}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${v13_2T > 0 ? v13_2T.toLocaleString('pt-BR') + ' votos' : '--'}</div>
                </div>
              </div>

              <div style="margin-top: 0.75rem; padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); background: rgba(220,38,38,0.08); font-size: 0.75rem; font-weight: 700; color: var(--c-lula-light); display: flex; justify-content: space-between;">
                <span>Evolução Percentual:</span>
                <span>${p13_2T > 0 ? `${sign13}${deltaP13}%` : 'Em apuração'}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Comparativo de Governadores nos 6 Estados
      const govStates = [
        { uf: 'AC', c1: 'Alan Rick (10)', f1: './public/fotos/ac_10.jpg', c2: 'Mailza Assis (11)', f2: './public/fotos/ac_11.jpg' },
        { uf: 'AM', c1: 'Maria do Carmo (22)', f1: './public/fotos/am_22.jpg', c2: 'Omar Aziz (55)', f2: './public/fotos/am_55.jpg' },
        { uf: 'DF', c1: 'Celina Leão (11)', f1: './public/fotos/df_11.jpg', c2: 'Leandro Grass (13)', f2: './public/fotos/df_13.jpg' },
        { uf: 'ES', c1: 'Pazolini (10)', f1: './public/fotos/es_10.jpg', c2: 'Ferraço (15)', f2: './public/fotos/es_15.jpg' },
        { uf: 'RN', c1: 'Allyson (44)', f1: './public/fotos/rn_44.jpg', c2: 'Cadu (13)', f2: './public/fotos/rn_13.jpg' },
        { uf: 'TO', c1: 'Prof. Dorinha (44)', f1: './public/fotos/to_44.jpg', c2: 'Vicentinho (45)', f2: './public/fotos/to_45.jpg' }
      ];

      matrixHtml = `
        <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: var(--shadow-card);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">
                🏛️ Governadores 2026: Duelos de 2º Turno nos 6 Estados
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                Candidatos finalistas que disputam o governo estadual em 25/10/2026
              </div>
            </div>
            <span class="status-badge status-concluded">6 DISPUTAS ESTADUAIS</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            ${govStates.map(g => `
              <div style="background: var(--bg-body); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); padding: 1rem;">
                <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.5rem; color: var(--c-accent);">${BRAZIL_UF_PATHS[g.uf]?.nome || g.uf} (${g.uf})</div>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <img src="${g.f1}" alt="${g.c1}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-subtle);" onerror="this.remove();" />
                    <div style="font-size: 0.75rem; font-weight: 700;">${g.c1}</div>
                  </div>
                  <span style="font-weight: 800; font-size: 0.75rem; color: var(--text-dim);">VS</span>
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <div style="font-size: 0.75rem; font-weight: 700; text-align: right;">${g.c2}</div>
                    <img src="${g.f2}" alt="${g.c2}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-subtle);" onerror="this.remove();" />
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    const targetDiv = document.getElementById('turnos-matrix-container');
    if (targetDiv) {
      targetDiv.innerHTML = matrixHtml;
    }
  }

  renderSideBySide() {
    if (!this.comparadorContainer) return;

    const ufs = Object.keys(BRAZIL_UF_PATHS).sort();
    const ufA = document.getElementById('select-uf-a')?.value || 'SP';
    const ufB = document.getElementById('select-uf-b')?.value || 'RJ';

    const dataA = State.ufData.get(ufA);
    const dataB = State.ufData.get(ufB);

    const statsA = dataA ? TseClient.parseStats(dataA) : null;
    const statsB = dataB ? TseClient.parseStats(dataB) : null;

    const candsA = dataA ? TseClient.parseCandidates(dataA) : [];
    const candsB = dataB ? TseClient.parseCandidates(dataB) : [];

    const isGov = State.electionId === '6260';
    const candA1 = isGov ? candsA[0] : (candsA.find(c => c.numero === '22') || candsA[0]);
    const candA2 = isGov ? candsA[1] : (candsA.find(c => c.numero === '13') || candsA[1]);

    const candB1 = isGov ? candsB[0] : (candsB.find(c => c.numero === '22') || candsB[0]);
    const candB2 = isGov ? candsB[1] : (candsB.find(c => c.numero === '13') || candsB[1]);

    const nameA1 = candA1 ? candA1.nomeUrna : (isGov ? '1º Colocado' : 'Flávio Bolsonaro');
    const nameA2 = candA2 ? candA2.nomeUrna : (isGov ? '2º Colocado' : 'Lula');
    const pctA1 = candA1 ? `${candA1.percentual}%` : '--';
    const pctA2 = candA2 ? `${candA2.percentual}%` : '--';

    const nameB1 = candB1 ? candB1.nomeUrna : (isGov ? '1º Colocado' : 'Flávio Bolsonaro');
    const nameB2 = candB2 ? candB2.nomeUrna : (isGov ? '2º Colocado' : 'Lula');
    const pctB1 = candB1 ? `${candB1.percentual}%` : '--';
    const pctB2 = candB2 ? `${candB2.percentual}%` : '--';

    this.comparadorContainer.innerHTML = `
      <div id="turnos-matrix-container"></div>

      <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-card);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-main);">Comparador Lado a Lado de Estados</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Compare o comportamento eleitoral direto entre duas Unidades da Federação</div>
          </div>
          <div style="display: flex; gap: 0.75rem; align-items: center;">
            <select id="select-uf-a" class="election-select">
              ${ufs.map(u => `<option value="${u}" ${u === ufA ? 'selected' : ''}>${BRAZIL_UF_PATHS[u].nome} (${u})</option>`).join('')}
            </select>
            <span style="font-weight: 800; color: var(--text-dim);">VS</span>
            <select id="select-uf-b" class="election-select">
              ${ufs.map(u => `<option value="${u}" ${u === ufB ? 'selected' : ''}>${BRAZIL_UF_PATHS[u].nome} (${u})</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
          <!-- Card UF A -->
          <div style="background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);">
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${BRAZIL_UF_PATHS[ufA]?.nome || ufA} (${ufA})</div>
            <div style="font-size: 0.8rem; color: var(--c-accent); font-weight: 700; margin-top: 0.2rem;">
              Apurado: ${statsA ? statsA.percentApurado + '%' : 'Aguardando'}
            </div>
            <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; border-left: 4px solid var(--c-bolsonaro); padding-left: 0.5rem;">
                <span style="font-weight: 700;">${nameA1}</span>
                <strong style="color: var(--c-bolsonaro-light);">${pctA1}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-left: 4px solid var(--c-lula); padding-left: 0.5rem;">
                <span style="font-weight: 700;">${nameA2}</span>
                <strong style="color: var(--c-lula-light);">${pctA2}</strong>
              </div>
            </div>
            <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
              Comparecimento: <strong>${statsA ? statsA.percentComparecimento + '%' : '--'}</strong> | Abstenção: <strong>${statsA ? statsA.percentAbstencao + '%' : '--'}</strong>
            </div>
          </div>

          <!-- Card UF B -->
          <div style="background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);">
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${BRAZIL_UF_PATHS[ufB]?.nome || ufB} (${ufB})</div>
            <div style="font-size: 0.8rem; color: var(--c-accent); font-weight: 700; margin-top: 0.2rem;">
              Apurado: ${statsB ? statsB.percentApurado + '%' : 'Aguardando'}
            </div>
            <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; border-left: 4px solid var(--c-bolsonaro); padding-left: 0.5rem;">
                <span style="font-weight: 700;">${nameB1}</span>
                <strong style="color: var(--c-bolsonaro-light);">${pctB1}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-left: 4px solid var(--c-lula); padding-left: 0.5rem;">
                <span style="font-weight: 700;">${nameB2}</span>
                <strong style="color: var(--c-lula-light);">${pctB2}</strong>
              </div>
            </div>
            <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
              Comparecimento: <strong>${statsB ? statsB.percentComparecimento + '%' : '--'}</strong> | Abstenção: <strong>${statsB ? statsB.percentAbstencao + '%' : '--'}</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderTurnosMatrix();

    document.getElementById('select-uf-a')?.addEventListener('change', () => this.renderSideBySide());
    document.getElementById('select-uf-b')?.addEventListener('change', () => this.renderSideBySide());
  }

  renderAnalyticalTable() {
    if (!this.tabelaContainer) return;

    const isGov = State.electionId === '6260';
    const rows = [];
    for (const [sigla, ufInfo] of Object.entries(BRAZIL_UF_PATHS)) {
      const data = State.ufData.get(sigla);
      const stats = data ? TseClient.parseStats(data) : null;
      const cands = data ? TseClient.parseCandidates(data) : [];

      const c1 = isGov ? cands[0] : (cands.find(c => c.numero === '22') || cands[0]);
      const c2 = isGov ? cands[1] : (cands.find(c => c.numero === '13') || cands[1]);

      const p1 = c1 ? c1.percentualNum : 0;
      const p2 = c2 ? c2.percentualNum : 0;
      const apurado = stats ? stats.percentApuradoNum : 0;
      const margin = Math.abs(p1 - p2);
      const leader = p1 > p2 ? (c1?.nomeUrna || 'Líder') : (p2 > p1 ? (c2?.nomeUrna || 'Líder') : 'Empate');

      rows.push({
        sigla,
        nome: ufInfo.nome,
        apurado,
        apuradoStr: stats ? stats.percentApurado + '%' : '0,00%',
        pB: p1,
        pBStr: c1 ? `${c1.percentual}%` : '--',
        pL: p2,
        pLStr: c2 ? `${c2.percentual}%` : '--',
        leader,
        margin: parseFloat(margin.toFixed(2)),
        comparecimento: stats ? stats.percentComparecimento + '%' : '--'
      });
    }

    // Ordenação dinâmica
    rows.sort((a, b) => {
      let va = a[this.sortCol];
      let vb = b[this.sortCol];
      if (typeof va === 'string') return this.sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return this.sortAsc ? va - vb : vb - va;
    });

    // Salvar no State.cache (DIRETRIZ MANDATÓRIA: Estado-para-Visualização)
    State.cache.ufsOrdenadas = rows;
    State.cache.filtrados = rows;

    const col1Header = isGov ? '1º Colocado' : 'Flávio (22)';
    const col2Header = isGov ? '2º Colocado' : 'Lula (13)';

    this.tabelaContainer.innerHTML = `
      <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; margin-top: 1.5rem; box-shadow: var(--shadow-card);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-main);">Tabela Completa de Totalização por UF</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">27 Unidades da Federação com dados oficiais sincronizados</div>
          </div>
          <button id="btn-export-csv" class="btn-ctrl">
            📥 Exportar Dados (CSV Excel)
          </button>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-subtle); color: var(--text-dim); text-transform: uppercase; font-size: 0.7rem; font-weight: 700;">
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="sigla">UF ⇅</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="nome">Estado ⇅</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="apurado">Apurado % ⇅</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="pB">${col1Header} ⇅</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="pL">${col2Header} ⇅</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="margin">Margem ⇅</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="leader">Líder ⇅</th>
                <th style="padding: 0.75rem 0.5rem;">Comparecimento</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr style="border-bottom: 1px solid var(--border-subtle); cursor: pointer;" class="table-row-uf" data-uf="${r.sigla}">
                  <td style="padding: 0.6rem 0.5rem; font-weight: 800;">${r.sigla}</td>
                  <td style="padding: 0.6rem 0.5rem; color: var(--text-main); font-weight: 600;">${r.nome}</td>
                  <td style="padding: 0.6rem 0.5rem; font-weight: 700; color: var(--c-accent);">${r.apuradoStr}</td>
                  <td style="padding: 0.6rem 0.5rem; font-weight: 800; color: var(--c-bolsonaro-light);">${r.pBStr}</td>
                  <td style="padding: 0.6rem 0.5rem; font-weight: 800; color: var(--c-lula-light);">${r.pLStr}</td>
                  <td style="padding: 0.6rem 0.5rem; font-weight: 700;">${r.margin}%</td>
                  <td style="padding: 0.6rem 0.5rem;">
                    <span style="padding: 0.15rem 0.5rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; background: rgba(37,99,235,0.12); color: var(--text-main);">
                      ${r.leader}
                    </span>
                  </td>
                  <td style="padding: 0.6rem 0.5rem; color: var(--text-muted);">${r.comparecimento}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Ordenação ao clicar nos cabeçalhos
    this.tabelaContainer.querySelectorAll('th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        if (this.sortCol === col) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortCol = col;
          this.sortAsc = false;
        }
        this.renderAnalyticalTable();
      });
    });

    // Clique na linha da tabela filtra a UF no mapa
    this.tabelaContainer.querySelectorAll('.table-row-uf').forEach(tr => {
      tr.addEventListener('click', () => {
        const uf = tr.getAttribute('data-uf');
        State.setSelectedUf(uf);
        State.setActiveTab('mapa');
      });
    });

    // Botão de Exportação CSV
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      this.exportCsv();
    });
  }

  exportCsv() {
    const list = State.cache.filtrados || [];
    if (list.length === 0) return;

    let csvContent = "\uFEFF"; // BOM UTF-8 para Excel
    csvContent += "UF;Estado;Apurado;Flavio_Bolsonaro_Percentual;Lula_Percentual;Margem;Lider;Comparecimento\n";

    for (const r of list) {
      csvContent += `${r.sigla};${r.nome};${r.apuradoStr};${r.pBStr};${r.pLStr};${r.margin}%;${r.leader};${r.comparecimento}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analitica_politica_apuracao_2026_${State.electionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
