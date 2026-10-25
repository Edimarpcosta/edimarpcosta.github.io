/**
 * Módulo de Análise Macrorregional do Brasil - Analítica Política 2026 (v9.1 - Seção 5.5)
 * Totalização agregada das 5 Macrorregiões do IBGE (Norte, Nordeste, Centro-Oeste, Sudeste, Sul)
 * com eleitorado, seções apuradas, proporções numéricas e fechamento da soma nacional com o Exterior (ZZ).
 */

import { State } from '../state.js';
import { TseClient } from '../tse_client.js';

export const REGIONS_DEF = {
  sudeste: {
    nome: 'Sudeste',
    ufs: ['SP', 'MG', 'RJ', 'ES'],
    eleitoradoEstimado: 67100000,
    maiorUf: 'SP (34,6M eleitores)',
    descricao: 'Maior colégio eleitoral do país (42,6% dos eleitores)'
  },
  nordeste: {
    nome: 'Nordeste',
    ufs: ['BA', 'PE', 'CE', 'MA', 'PB', 'RN', 'AL', 'PI', 'SE'],
    eleitoradoEstimado: 43000000,
    maiorUf: 'BA (11,2M eleitores)',
    descricao: 'Segundo maior colégio eleitoral (27,3% dos eleitores)'
  },
  sul: {
    nome: 'Sul',
    ufs: ['PR', 'RS', 'SC'],
    eleitoradoEstimado: 22500000,
    maiorUf: 'PR (8,6M eleitores)',
    descricao: 'Terceiro maior colégio eleitoral (14,3% dos eleitores)'
  },
  norte: {
    nome: 'Norte',
    ufs: ['PA', 'AM', 'RO', 'TO', 'AC', 'AP', 'RR'],
    eleitoradoEstimado: 13100000,
    maiorUf: 'PA (6,1M eleitores)',
    descricao: 'Maior extensão territorial e 7 estados (8,3% dos eleitores)'
  },
  centro_oeste: {
    nome: 'Centro-Oeste',
    ufs: ['GO', 'MT', 'MS', 'DF'],
    eleitoradoEstimado: 11900000,
    maiorUf: 'GO (4,9M eleitores)',
    descricao: 'Centro geopolítico e agronegócio (7,5% dos eleitores)'
  }
};

export class RegionAnalyticsUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render() {
    if (!this.container) return;

    const cardsHtml = Object.entries(REGIONS_DEF).map(([key, reg]) => {
      let vB = 0;
      let vL = 0;
      let secoesTot = 0;
      let secoesApuradas = 0;
      let comparecimentoTot = 0;
      let eleitoradoTot = reg.eleitoradoEstimado;

      for (const uf of reg.ufs) {
        const ufData = State.ufData.get(uf);
        if (ufData) {
          const cands = TseClient.parseCandidates(ufData);
          const stats = TseClient.parseStats(ufData);

          const cB = cands.find(c => c.numero === '22') || cands[0];
          const cL = cands.find(c => c.numero === '13') || (cands.length > 1 ? cands[1] : cands[0]);

          if (cB) vB += cB.votos;
          if (cL) vL += cL.votos;

          secoesTot += stats.totalSecoes;
          secoesApuradas += stats.secoesTotalizadas;
          comparecimentoTot += stats.comparecimento;
        }
      }

      const totalVal = vB + vL;
      const pctB = totalVal > 0 ? (vB / totalVal * 100).toFixed(1) : '50.0';
      const pctL = totalVal > 0 ? (vL / totalVal * 100).toFixed(1) : '50.0';
      const pctApurado = secoesTot > 0 ? (secoesApuradas / secoesTot * 100).toFixed(2) : '0.00';

      const diff = Math.abs(parseFloat(pctB) - parseFloat(pctL)).toFixed(1);
      const isB = parseFloat(pctB) >= parseFloat(pctL);
      const leaderName = totalVal === 0 ? 'Aguardando' : (isB ? 'Flávio Bolsonaro' : 'Lula');
      const leaderColor = isB ? 'var(--c-bolsonaro-light)' : 'var(--c-lula-light)';

      return `
        <div class="bento-card" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">Região ${reg.nome}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${reg.descricao}</div>
            </div>
            <span class="status-badge status-partial" style="font-size: 0.65rem;">
              ${pctApurado}% APURADO
            </span>
          </div>

          <!-- Barra de Proporção com Valores e % Escritos (Dois Canais Visuais) -->
          <div style="margin: 0.75rem 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 800; margin-bottom: 0.35rem;">
              <span style="color: var(--c-bolsonaro-light);">Flávio ${pctB}% (${vB > 0 ? vB.toLocaleString('pt-BR') : '--'})</span>
              <span style="color: var(--c-lula-light);">Lula ${pctL}% (${vL > 0 ? vL.toLocaleString('pt-BR') : '--'})</span>
            </div>
            <div style="height: 10px; width: 100%; border-radius: var(--radius-full); background: var(--bg-body); overflow: hidden; display: flex; border: 1px solid var(--border-subtle);">
              <div style="width: ${pctB}%; background: var(--c-bolsonaro-light); transition: width 0.3s ease;"></div>
              <div style="width: ${pctL}%; background: var(--c-lula-light); transition: width 0.3s ease;"></div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
            <div>Margem: <strong style="color: ${leaderColor};">${leaderName} +${diff} p.p.</strong></div>
            <div>Maior UF: <strong>${reg.maiorUf}</strong></div>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">Panorama Macrorregional do Brasil</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Consolidação de votos válidos e seções apuradas por região do IBGE</div>
        </div>
        <div style="font-size: 0.7rem; color: var(--text-dim); background: var(--bg-card); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          Nota: A cor da região só identifica a divisão geográfica do IBGE
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
        ${cardsHtml}
      </div>
    `;
  }
}
