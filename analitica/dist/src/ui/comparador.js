/**
 * Módulo Comparador Analítico das 27 UFs & Exportação (CSV e Imagem)
 * Implementa persistência de estado para visualização (cache.filtrados) e normalização estrita.
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
    this.renderSideBySide();
    this.renderAnalyticalTable();
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
      <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 1.2rem; font-weight: 800;">Comparador Lado a Lado de Estados</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Compare o comportamento eleitoral direto entre duas Unidades da Federação</div>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <select id="select-uf-a" class="election-select">
              ${ufs.map(u => `<option value="${u}" ${u === ufA ? 'selected' : ''}>${BRAZIL_UF_PATHS[u].nome} (${u})</option>`).join('')}
            </select>
            <span style="display: flex; align-items: center; font-weight: 800; color: var(--text-dim);">VS</span>
            <select id="select-uf-b" class="election-select">
              ${ufs.map(u => `<option value="${u}" ${u === ufB ? 'selected' : ''}>${BRAZIL_UF_PATHS[u].nome} (${u})</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <!-- Card UF A -->
          <div style="background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);">
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${BRAZIL_UF_PATHS[ufA]?.nome || ufA}</div>
            <div style="font-size: 0.8rem; color: var(--c-accent); font-weight: 700; margin-top: 0.2rem;">
              Apurado: ${statsA ? statsA.percentApurado + '%' : 'Aguardando'}
            </div>
            <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; border-left: 4px solid var(--c-bolsonaro); padding-left: 0.5rem;">
                <span>${nameA1}</span>
                <strong style="color: var(--c-bolsonaro-light);">${pctA1}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-left: 4px solid var(--c-lula); padding-left: 0.5rem;">
                <span>${nameA2}</span>
                <strong style="color: var(--c-lula-light);">${pctA2}</strong>
              </div>
            </div>
            <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
              Comparecimento: <strong>${statsA ? statsA.percentComparecimento + '%' : '--'}</strong> | Abstenção: <strong>${statsA ? statsA.percentAbstencao + '%' : '--'}</strong>
            </div>
          </div>

          <!-- Card UF B -->
          <div style="background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);">
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${BRAZIL_UF_PATHS[ufB]?.nome || ufB}</div>
            <div style="font-size: 0.8rem; color: var(--c-accent); font-weight: 700; margin-top: 0.2rem;">
              Apurado: ${statsB ? statsB.percentApurado + '%' : 'Aguardando'}
            </div>
            <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; border-left: 4px solid var(--c-bolsonaro); padding-left: 0.5rem;">
                <span>${nameB1}</span>
                <strong style="color: var(--c-bolsonaro-light);">${pctB1}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-left: 4px solid var(--c-lula); padding-left: 0.5rem;">
                <span>${nameB2}</span>
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
      <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; margin-top: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="font-size: 1.2rem; font-weight: 800;">Tabela Completa de Totalização por UF</div>
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
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="sigla">UF</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="nome">Estado</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="apurado">Apurado %</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="pB">${col1Header}</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="pL">${col2Header}</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="margin">Margem</th>
                <th style="padding: 0.75rem 0.5rem; cursor: pointer;" data-col="leader">Líder</th>
                <th style="padding: 0.75rem 0.5rem;">Comparecimento</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr style="border-bottom: 1px solid var(--border-subtle); cursor: pointer;" class="table-row-uf" data-uf="${r.sigla}">
                  <td style="padding: 0.6rem 0.5rem; font-weight: 800;">${r.sigla}</td>
                  <td style="padding: 0.6rem 0.5rem; color: var(--text-muted);">${r.nome}</td>
                  <td style="padding: 0.6rem 0.5rem; font-weight: 700; color: var(--c-accent);">${r.apuradoStr}</td>
                  <td style="padding: 0.6rem 0.5rem; font-weight: 800; color: var(--c-bolsonaro-light);">${r.pBStr}</td>
                  <td style="padding: 0.6rem 0.5rem; font-weight: 800; color: var(--c-lula-light);">${r.pLStr}</td>
                  <td style="padding: 0.6rem 0.5rem; font-weight: 700;">${r.margin}%</td>
                  <td style="padding: 0.6rem 0.5rem;">
                    <span style="padding: 0.15rem 0.5rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; background: rgba(37,99,235,0.15); color: var(--text-main);">
                      ${r.leader}
                    </span>
                  </td>
                  <td style="padding: 0.6rem 0.5rem; color: var(--text-dim);">${r.comparecimento}</td>
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
    // Acessa dados a partir do cache (DIRETRIZ MANDATÓRIA)
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
