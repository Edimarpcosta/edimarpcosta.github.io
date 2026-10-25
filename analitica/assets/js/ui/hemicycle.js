/**
 * Hemicycle Parlamentar do Congresso Nacional (SVG Puro) - Analítica Política 2026
 * Renderiza a distribuição de cadeiras na Câmara dos Deputados (513) e Senado Federal (54/81)
 * em hemiciclo semicircular clássico, dividido pelos blocos ideológicos:
 * Esquerda (Vermelho), Centro/Centrão (Âmbar) e Direita (Azul).
 */

export class HemicycleUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeCasa = 'camara'; // 'camara' ou 'senado'
  }

  init() {
    this.render();
  }

  setCasa(casa) {
    this.activeCasa = casa;
    this.render();
  }

  render() {
    if (!this.container) return;

    const isCamara = this.activeCasa === 'camara';
    const totalSeats = isCamara ? 513 : 81;
    const title = isCamara ? 'Câmara dos Deputados (513 Cadeiras)' : 'Senado Federal (81 Cadeiras)';
    const sub = isCamara 
      ? 'Distribuição ideológica das 513 bancadas federais eleitas'
      : 'Distribuição ideológica das 81 bancadas do Senado (incluindo 54 eleitas em 2026)';

    // Dados de blocos
    const blocos = isCamara ? [
      { id: 'esquerda', nome: 'Esquerda', cadeiras: 124, cor: '#EF4444', partidos: 'PT, PSOL, PSB, PDT, PCdoB, PV, REDE' },
      { id: 'centrao', nome: 'Centrão / Independentes', cadeiras: 207, cor: '#F59E0B', partidos: 'MDB, PSD, UNIÃO, REPUBLICANOS, PP, PODE' },
      { id: 'direita', nome: 'Direita / Conservadores', cadeiras: 182, cor: '#3B82F6', partidos: 'PL, NOVO, PRTB, PRD' }
    ] : [
      { id: 'esquerda', nome: 'Esquerda', cadeiras: 15, cor: '#EF4444', partidos: 'PT, PSB, PDT, REDE' },
      { id: 'centrao', nome: 'Centrão', cadeiras: 31, cor: '#F59E0B', partidos: 'PSD, MDB, UNIÃO, REPUBLICANOS' },
      { id: 'direita', nome: 'Direita', cadeiras: 35, cor: '#3B82F6', partidos: 'PL, PP, NOVO, PODE' }
    ];

    // Gerar assentos em semicírculo concêntrico
    const rows = isCamara ? 8 : 4;
    const innerRadius = 110;
    const outerRadius = 240;
    const cx = 300;
    const cy = 270;

    // Distribuir cadeiras por fileira proporcionalmente ao raio
    const rowCounts = [];
    let sumR = 0;
    for (let r = 0; r < rows; r++) {
      const radius = innerRadius + (outerRadius - innerRadius) * (r / (rows - 1));
      sumR += radius;
    }
    let allocated = 0;
    for (let r = 0; r < rows; r++) {
      const radius = innerRadius + (outerRadius - innerRadius) * (r / (rows - 1));
      const count = Math.round((radius / sumR) * totalSeats);
      rowCounts.push(count);
      allocated += count;
    }
    // Ajuste fino para total exato
    rowCounts[rows - 1] += (totalSeats - allocated);

    // Mapear cada cadeira sequencialmente da esquerda para a direita
    let seatList = [];
    for (const b of blocos) {
      for (let i = 0; i < b.cadeiras; i++) {
        seatList.push(b);
      }
    }

    let seatsSvg = '';
    let seatIdx = 0;

    for (let r = 0; r < rows; r++) {
      const count = rowCounts[r];
      const radius = innerRadius + (outerRadius - innerRadius) * (r / (rows - 1));
      const dotR = isCamara ? 5.2 : 7.5;

      for (let c = 0; c < count; c++) {
        if (seatIdx >= seatList.length) break;
        const bloco = seatList[seatIdx];
        seatIdx++;

        // Ângulo de PI (esquerda) a 0 (direita)
        const angle = Math.PI - (c / (count - 1 || 1)) * Math.PI;
        const x = cx + radius * Math.cos(angle);
        const y = cy - radius * Math.sin(angle);

        seatsSvg += `
          <circle 
            cx="${x.toFixed(1)}" 
            cy="${y.toFixed(1)}" 
            r="${dotR}" 
            fill="${bloco.cor}" 
            class="hemicycle-dot"
            data-bloco="${bloco.nome}"
            data-partidos="${bloco.partidos}"
            title="${bloco.nome}: ${bloco.partidos}"
            tabindex="0"
          />
        `;
      }
    }

    this.container.innerHTML = `
      <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-card);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${title}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${sub}</div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button id="btn-hemi-camara" class="btn-ctrl ${isCamara ? 'active' : ''}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 700;">
              Câmara (513)
            </button>
            <button id="btn-hemi-senado" class="btn-ctrl ${!isCamara ? 'active' : ''}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 700;">
              Senado (81)
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <svg viewBox="0 0 600 300" style="width: 100%; max-width: 600px; height: auto; display: block;">
            <g>${seatsSvg}</g>
            <text x="300" y="260" text-anchor="middle" font-size="14" font-weight="800" fill="var(--text-main)">CONGRESSO NACIONAL</text>
            <text x="300" y="278" text-anchor="middle" font-size="11" fill="var(--text-dim)">Total: ${totalSeats} Parlamentares</text>
          </svg>

          <!-- Legenda de Bancadas -->
          <div style="display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; margin-top: 1rem; width: 100%; border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            ${blocos.map(b => `
              <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;">
                <span style="display: inline-block; width: 14px; height: 14px; border-radius: 50%; background: ${b.cor};"></span>
                <span style="font-weight: 700; color: var(--text-main);">${b.nome}:</span>
                <strong style="color: ${b.cor};">${b.cadeiras} cadeiras</strong>
                <span style="font-size: 0.75rem; color: var(--text-dim);">(${((b.cadeiras / totalSeats) * 100).toFixed(1)}%)</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-hemi-camara')?.addEventListener('click', () => this.setCasa('camara'));
    document.getElementById('btn-hemi-senado')?.addEventListener('click', () => this.setCasa('senado'));
  }
}
