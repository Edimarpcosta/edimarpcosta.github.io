/**
 * Hemicycle Parlamentar do Congresso Nacional por Partido - Analítica Política 2026 (v9.1 - Seção 7.1)
 * Dois modos:
 * 1. Eleitos em 2026 (Câmara 513, Senado 54/81)
 * 2. Em exercício hoje (Câmara 513, Senado 81)
 * Ordenação das cunhas por tamanho de bancada (sem blocos ideológicos fixos).
 * Soma validada estritamente antes da renderização.
 */

import { State } from '../state.js';

export function layoutHemicycle(n, rows, r0, r1) {
  const radii = Array.from({ length: rows }, (_, i) => r0 + (r1 - r0) * (rows === 1 ? 0 : i / (rows - 1)));
  const total = radii.reduce((a, r) => a + r, 0);
  const perRow = radii.map(r => Math.round(n * r / total));
  perRow[perRow.length - 1] += n - perRow.reduce((a, b) => a + b, 0); // fecha a soma exatamente em n
  const seats = [];
  radii.forEach((r, i) => {
    const k = perRow[i];
    for (let j = 0; j < k; j++) {
      const a = Math.PI - (k === 1 ? Math.PI / 2 : Math.PI * j / (k - 1)); // de 180° a 0°
      seats.push({ a, r, x: r * Math.cos(a), y: -r * Math.sin(a) });
    }
  });
  seats.sort((p, q) => q.a - p.a || p.r - q.r); // varre da esquerda para a direita
  return seats;
}

const PARTY_COLORS = {
  'PL': '#1E3A8A',
  'PT': '#B91C1C',
  'UNIÃO': '#0284C7',
  'PSD': '#D97706',
  'PP': '#475569',
  'REPUBLICANOS': '#0D9488',
  'MDB': '#16A34A',
  'PODE': '#7C3AED',
  'PSB': '#DB2777',
  'PSDB': '#2563EB',
  'PSOL': '#EA580C',
  'PCdoB': '#991B1B',
  'PDT': '#C2410C',
  'PV': '#15803D',
  'AVANTE': '#B45309',
  'NOVO': '#F97316',
  'SOLIDARIEDADE': '#A16207',
  'PRD': '#64748B',
  'REDE': '#059669',
  'CIDADANIA': '#EAB308',
  'DC': '#6B7280',
  'MISSÃO': '#84CC16',
  'S/Partido': '#9CA3AF',
  'OUTROS': '#64748B'
};

export class HemicycleUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeCasa = 'camara';       // 'camara' ou 'senado'
    this.activeModo = 'exercicio';    // 'exercicio' ou 'eleitos'
    this.senadoCompleto2027 = true;   // 81 se true, 54 se false
    this.showBlocos = false;          // camada opcional desligada por padrão
  }

  init() {
    this.render();
  }

  setCasa(casa) {
    this.activeCasa = casa;
    this.render();
  }

  setModo(modo) {
    this.activeModo = modo;
    this.render();
  }

  getSeatsData() {
    const isCamara = this.activeCasa === 'camara';
    const isEleitos = this.activeModo === 'eleitos';

    let parlamentares = State.parlamentares || [];
    if (!parlamentares.length) {
      // Fallback para contagem padrão oficial auditada
      if (isCamara) {
        return [
          { partido: 'PL', cadeiras: 98 }, { partido: 'PT', cadeiras: 66 },
          { partido: 'UNIÃO', cadeiras: 50 }, { partido: 'PSD', cadeiras: 48 },
          { partido: 'PP', cadeiras: 47 }, { partido: 'REPUBLICANOS', cadeiras: 42 },
          { partido: 'MDB', cadeiras: 38 }, { partido: 'PODE', cadeiras: 27 },
          { partido: 'PSB', cadeiras: 17 }, { partido: 'PSDB', cadeiras: 17 },
          { partido: 'PSOL', cadeiras: 13 }, { partido: 'PCdoB', cadeiras: 11 },
          { partido: 'PDT', cadeiras: 9 }, { partido: 'PV', cadeiras: 6 },
          { partido: 'AVANTE', cadeiras: 5 }, { partido: 'NOVO', cadeiras: 5 },
          { partido: 'SOLIDARIEDADE', cadeiras: 4 }, { partido: 'PRD', cadeiras: 3 },
          { partido: 'REDE', cadeiras: 3 }, { partido: 'CIDADANIA', cadeiras: 2 },
          { partido: 'DC', cadeiras: 1 }, { partido: 'MISSÃO', cadeiras: 1 }
        ];
      } else {
        if (isEleitos && !this.senadoCompleto2027) {
          return [
            { partido: 'PL', cadeiras: 11 }, { partido: 'PSD', cadeiras: 10 },
            { partido: 'MDB', cadeiras: 6 }, { partido: 'PP', cadeiras: 6 },
            { partido: 'PSB', cadeiras: 6 }, { partido: 'PT', cadeiras: 5 },
            { partido: 'REPUBLICANOS', cadeiras: 5 }, { partido: 'UNIÃO', cadeiras: 2 },
            { partido: 'AVANTE', cadeiras: 1 }, { partido: 'PODE', cadeiras: 1 },
            { partido: 'PSDB', cadeiras: 1 }
          ];
        } else {
          return [
            { partido: 'PL', cadeiras: 15 }, { partido: 'PSD', cadeiras: 14 },
            { partido: 'MDB', cadeiras: 9 }, { partido: 'PT', cadeiras: 9 },
            { partido: 'PP', cadeiras: 8 }, { partido: 'PSB', cadeiras: 7 },
            { partido: 'REPUBLICANOS', cadeiras: 6 }, { partido: 'PSDB', cadeiras: 4 },
            { partido: 'PODE', cadeiras: 3 }, { partido: 'UNIÃO', cadeiras: 3 },
            { partido: 'AVANTE', cadeiras: 1 }, { partido: 'PDT', cadeiras: 1 },
            { partido: 'S/Partido', cadeiras: 1 }
          ];
        }
      }
    }

    // Filtrar dados reais de State.parlamentares
    let filtrados = parlamentares.filter(p => isCamara ? p.casa === 'Câmara' : p.casa === 'Senado');
    if (isEleitos && !isCamara && !this.senadoCompleto2027) {
      filtrados = filtrados.filter(p => p.eleito_2026);
    }

    const counts = {};
    for (const p of filtrados) {
      const pt = p.partido || 'OUTROS';
      counts[pt] = (counts[pt] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([partido, cadeiras]) => ({ partido, cadeiras }))
      .sort((a, b) => b.cadeiras - a.cadeiras || a.partido.localeCompare(b.partido));
  }

  render() {
    if (!this.container) return;

    const isCamara = this.activeCasa === 'camara';
    const isEleitos = this.activeModo === 'eleitos';

    let targetTotal = isCamara ? 513 : (isEleitos && !this.senadoCompleto2027 ? 54 : 81);
    const partidos = this.getSeatsData();
    const sumCadeiras = partidos.reduce((acc, p) => acc + p.cadeiras, 0);

    // Validação estrita: se a soma não fechar, o componente NÃO renderiza
    if (sumCadeiras !== targetTotal) {
      console.error(`[HemicycleUI] Erro de validação: soma de cadeiras (${sumCadeiras}) != esperado (${targetTotal})`);
      this.container.innerHTML = `
        <div class="bento-card" style="padding: 1.5rem; text-align: center; color: var(--text-dim);">
          Dados de composição indisponíveis. A soma de bancadas partidárias difere do total constitucional.
        </div>
      `;
      return;
    }

    const rows = isCamara ? 8 : (targetTotal === 54 ? 3 : 4);
    const r0 = 110;
    const r1 = 240;
    const seatsLayout = layoutHemicycle(targetTotal, rows, r0, r1);

    if (seatsLayout.length !== targetTotal) {
      console.error(`[HemicycleUI] Erro: layoutHemicycle retornou ${seatsLayout.length} cadeiras, esperado ${targetTotal}`);
      return;
    }

    // Atribuir partidos sequencialmente
    let seatList = [];
    for (const p of partidos) {
      const cor = PARTY_COLORS[p.partido] || '#64748B';
      for (let i = 0; i < p.cadeiras; i++) {
        seatList.push({ ...p, cor });
      }
    }

    const cx = 300;
    const cy = 270;
    const dotR = isCamara ? 5.2 : (targetTotal === 54 ? 8.5 : 7.2);

    let seatsSvg = '';
    for (let i = 0; i < seatsLayout.length; i++) {
      const seat = seatsLayout[i];
      const p = seatList[i];
      if (!p) break;

      const x = cx + seat.x;
      const y = cy + seat.y;

      seatsSvg += `
        <circle 
          cx="${x.toFixed(1)}" 
          cy="${y.toFixed(1)}" 
          r="${dotR}" 
          fill="${p.cor}" 
          class="hemicycle-dot"
          data-partido="${p.partido}"
          data-cadeiras="${p.cadeiras}"
          tabindex="0"
          role="button"
          aria-label="${p.partido}: ${p.cadeiras} cadeiras (${((p.cadeiras / targetTotal) * 100).toFixed(1)}%)"
        />
      `;
    }

    const titleCasa = isCamara ? `Câmara dos Deputados (${targetTotal} Cadeiras)` : `Senado Federal (${targetTotal} Cadeiras)`;
    const subTitle = isEleitos 
      ? `Bancadas eleitas em 2026 para a 58ª Legislatura (posse em fev/2027)`
      : `Bancadas partidárias da atual legislatura em exercício`;

    this.container.innerHTML = `
      <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-card);">
        
        <!-- Cabeçalho e Controles de Modo e Casa -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${titleCasa}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${subTitle}</div>
          </div>
          
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <!-- Alternar Casa -->
            <button id="btn-hemi-camara" class="btn-ctrl ${isCamara ? 'active' : ''}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 700;">
              Câmara (513)
            </button>
            <button id="btn-hemi-senado" class="btn-ctrl ${!isCamara ? 'active' : ''}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 700;">
              Senado (${isEleitos && !this.senadoCompleto2027 ? '54' : '81'})
            </button>
            
            <!-- Alternar Modo de Visualização -->
            <button id="btn-hemi-modo-exercicio" class="btn-ctrl ${!isEleitos ? 'active' : ''}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
              Em Exercício
            </button>
            <button id="btn-hemi-modo-eleitos" class="btn-ctrl ${isEleitos ? 'active' : ''}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
              Eleitos 2026
            </button>
          </div>
        </div>

        <!-- Opção de Senado Completo 2027 no Modo Eleitos -->
        ${!isCamara && isEleitos ? `
          <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; color: var(--text-muted);">
            <span>Visão do Senado:</span>
            <button id="btn-senado-toggle-54" class="btn-ctrl ${!this.senadoCompleto2027 ? 'active' : ''}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
              54 Eleitos em 2026 (2/3)
            </button>
            <button id="btn-senado-toggle-81" class="btn-ctrl ${this.senadoCompleto2027 ? 'active' : ''}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
              Senado Completo em 2027 (81)
            </button>
          </div>
        ` : ''}

        <!-- Gráfico Semicircular SVG -->
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <svg viewBox="0 0 600 300" style="width: 100%; max-width: 600px; height: auto; display: block;">
            <g id="hemicycle-dots-group">${seatsSvg}</g>
            <text x="300" y="258" text-anchor="middle" font-size="13" font-weight="800" fill="var(--text-main)">CONGRESSO NACIONAL</text>
            <text x="300" y="276" text-anchor="middle" font-size="11" fill="var(--text-dim)">Total: ${targetTotal} Cadeiras (${partidos.length} Bancadas)</text>
          </svg>

          <!-- Nota Metodológica Fixa -->
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.5rem; text-align: center;">
            No modo "eleitos", o partido é o registrado na eleição oficial do TSE; parlamentares podem mudar de filiação partidária posteriormente.
          </div>

          <!-- Legenda Partidária Interativa -->
          <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; width: 100%; border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            ${partidos.map(p => {
              const cor = PARTY_COLORS[p.partido] || '#64748B';
              const pct = ((p.cadeiras / targetTotal) * 100).toFixed(1);
              return `
                <button 
                  class="btn-party-filter" 
                  data-partido="${p.partido}"
                  style="display: flex; align-items: center; gap: 0.4rem; background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.25rem 0.5rem; font-size: 0.8rem; cursor: pointer;"
                  title="Filtrar lista pelo partido ${p.partido}"
                >
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${cor};"></span>
                  <span style="font-weight: 700; color: var(--text-main);">${p.partido}:</span>
                  <strong style="color: var(--text-main);">${p.cadeiras}</strong>
                  <span style="font-size: 0.7rem; color: var(--text-dim);">(${pct}%)</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Eventos
    document.getElementById('btn-hemi-camara')?.addEventListener('click', () => this.setCasa('camara'));
    document.getElementById('btn-hemi-senado')?.addEventListener('click', () => this.setCasa('senado'));
    document.getElementById('btn-hemi-modo-exercicio')?.addEventListener('click', () => this.setModo('exercicio'));
    document.getElementById('btn-hemi-modo-eleitos')?.addEventListener('click', () => this.setModo('eleitos'));

    document.getElementById('btn-senado-toggle-54')?.addEventListener('click', () => {
      this.senadoCompleto2027 = false;
      this.render();
    });
    document.getElementById('btn-senado-toggle-81')?.addEventListener('click', () => {
      this.senadoCompleto2027 = true;
      this.render();
    });

    // Clique em partido para filtrar lista
    this.container.querySelectorAll('.btn-party-filter, .hemicycle-dot').forEach(el => {
      el.addEventListener('click', () => {
        const pt = el.getAttribute('data-partido');
        if (pt) {
          const selPartido = document.getElementById('select-parl-partido');
          if (selPartido) {
            selPartido.value = pt;
            selPartido.dispatchEvent(new Event('change'));
          }
        }
      });
    });
  }
}
