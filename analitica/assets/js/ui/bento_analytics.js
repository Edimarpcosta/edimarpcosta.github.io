/**
 * Bento Analytics - Componentes SVG Nativos (Sem Dependências de Framework)
 * Inspirado nos padrões de visualização Bento do 21st.dev.
 * Fornece: CountUp suave cúbico, Treemap de Pesos Eleitorais, Sparkline com Gradiente e Radar Polar Cívico.
 */

export class BentoAnalytics {
  /**
   * Interpolação suave cúbica com respeito a prefers-reduced-motion e números tabulares
   */
  static countUp(element, targetValue, duration = 800, prefix = '', suffix = '') {
    if (!element) return;
    const isReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      if (element._countUpRaf) {
        cancelAnimationFrame(element._countUpRaf);
        element._countUpRaf = null;
      }
      element.textContent = `${prefix}${Math.round(targetValue).toLocaleString('pt-BR')}${suffix}`;
      return;
    }

    // Limpar pontuação pt-BR antes de converter para float
    const rawClean = (element.textContent || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    const start = parseFloat(rawClean) || 0;

    // Se o valor já for igual ao alvo, não precisa animar
    if (Math.round(start) === Math.round(targetValue)) {
      if (element._countUpRaf) {
        cancelAnimationFrame(element._countUpRaf);
        element._countUpRaf = null;
      }
      element.textContent = `${prefix}${Math.round(targetValue).toLocaleString('pt-BR')}${suffix}`;
      return;
    }

    if (element._countUpRaf) {
      cancelAnimationFrame(element._countUpRaf);
      element._countUpRaf = null;
    }

    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (targetValue - start) * ease;
      element.textContent = `${prefix}${Math.round(current).toLocaleString('pt-BR')}${suffix}`;
      if (progress < 1) {
        element._countUpRaf = requestAnimationFrame(step);
      } else {
        element._countUpRaf = null;
        element.textContent = `${prefix}${Math.round(targetValue).toLocaleString('pt-BR')}${suffix}`;
      }
    }
    element._countUpRaf = requestAnimationFrame(step);
  }

  /**
   * Renderiza Treemap vetorial SVG proporcional aos colégios eleitorais
   */
  static renderTreemap(containerId, ufsData = []) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Colégios eleitorais padrão de referência (caso ainda não haja dados por UF carregados)
    const defaultColégios = [
      { uf: 'SP', nome: 'São Paulo', peso: 22.16, lider: '22', pct: '53,2%' },
      { uf: 'MG', nome: 'Minas Gerais', peso: 10.41, lider: '22', pct: '50,8%' },
      { uf: 'RJ', nome: 'Rio de Janeiro', peso: 8.24, lider: '22', pct: '56,4%' },
      { uf: 'BA', nome: 'Bahia', peso: 7.12, lider: '13', pct: '69,2%' },
      { uf: 'RS', nome: 'Rio Grande do Sul', peso: 5.43, lider: '22', pct: '56,1%' },
      { uf: 'PR', nome: 'Paraná', peso: 5.41, lider: '22', pct: '62,3%' },
      { uf: 'PE', nome: 'Pernambuco', peso: 4.42, lider: '13', pct: '65,1%' },
      { uf: 'CE', nome: 'Ceará', peso: 4.31, lider: '13', pct: '67,4%' },
      { uf: 'PA', nome: 'Pará', peso: 3.85, lider: '13', pct: '52,1%' },
      { uf: 'SC', nome: 'Santa Catarina', peso: 3.48, lider: '22', pct: '69,5%' },
      { uf: 'GO', nome: 'Goiás', peso: 3.08, lider: '22', pct: '58,7%' },
      { uf: 'MA', nome: 'Maranhão', peso: 3.01, lider: '13', pct: '68,8%' }
    ];

    let items = [];
    if (ufsData && ufsData.length > 0) {
      const sum = ufsData.reduce((acc, d) => acc + (d.totalVotos || 1), 0);
      items = ufsData.slice(0, 12).map(d => ({
        uf: d.uf,
        nome: d.nome || d.uf,
        peso: ((d.totalVotos || 1) / sum) * 100,
        lider: d.lider || '22',
        pct: d.pct || ''
      }));
    } else {
      items = defaultColégios;
    }

    const totalPeso = items.reduce((acc, it) => acc + it.peso, 0);

    // Layout de Treemap em 2 linhas responsivas SVG
    let row1 = items.slice(0, 6);
    let row2 = items.slice(6);
    const sum1 = row1.reduce((a, b) => a + b.peso, 0);
    const sum2 = row2.reduce((a, b) => a + b.peso, 0);

    let rects = '';
    let x = 0;
    const h1 = 55;
    const h2 = 45;

    row1.forEach(it => {
      const w = (it.peso / sum1) * 100;
      const color = it.lider === '22' ? '#1E40AF' : it.lider === '13' ? '#DC2626' : '#64748B';
      rects += `
        <g class="treemap-cell" style="cursor: pointer;">
          <title>${it.nome} (${it.uf}): ${it.peso.toFixed(1)}% do eleitorado nacional</title>
          <rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${h1}" fill="${color}" opacity="0.88" rx="2" stroke="#FFFFFF" stroke-width="0.5"/>
          <text x="${(x + w / 2).toFixed(2)}" y="26" font-size="7.5" fill="#FFFFFF" font-weight="900" text-anchor="middle" font-family="system-ui, sans-serif">${it.uf}</text>
          <text x="${(x + w / 2).toFixed(2)}" y="38" font-size="5" fill="#E2E8F0" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif">${it.peso.toFixed(1)}%</text>
        </g>
      `;
      x += w;
    });

    x = 0;
    row2.forEach(it => {
      const w = (it.peso / sum2) * 100;
      const color = it.lider === '22' ? '#1E40AF' : it.lider === '13' ? '#DC2626' : '#64748B';
      rects += `
        <g class="treemap-cell" style="cursor: pointer;">
          <title>${it.nome} (${it.uf}): ${it.peso.toFixed(1)}% do eleitorado nacional</title>
          <rect x="${x.toFixed(2)}" y="${h1}" width="${w.toFixed(2)}" height="${h2}" fill="${color}" opacity="0.88" rx="2" stroke="#FFFFFF" stroke-width="0.5"/>
          ${w > 8 ? `
            <text x="${(x + w / 2).toFixed(2)}" y="${h1 + 22}" font-size="6.5" fill="#FFFFFF" font-weight="800" text-anchor="middle" font-family="system-ui, sans-serif">${it.uf}</text>
            <text x="${(x + w / 2).toFixed(2)}" y="${h1 + 33}" font-size="4.5" fill="#E2E8F0" font-weight="500" text-anchor="middle" font-family="system-ui, sans-serif">${it.peso.toFixed(1)}%</text>
          ` : `
            <text x="${(x + w / 2).toFixed(2)}" y="${h1 + 26}" font-size="5.5" fill="#FFFFFF" font-weight="800" text-anchor="middle" font-family="system-ui, sans-serif">${it.uf}</text>
          `}
        </g>
      `;
      x += w;
    });

    el.innerHTML = `
      <div style="width: 100%; height: 100%;">
        <svg viewBox="0 0 100 100" class="w-full h-full" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block; border-radius: 8px; overflow: hidden;">
          ${rects}
        </svg>
      </div>
    `;
  }

  /**
   * Renderiza Sparkline de apuração com curva suave e gradiente
   */
  static renderSparkline(containerId, historyPoints = [], color = '#2563EB') {
    const el = document.getElementById(containerId);
    if (!el) return;

    let pts = (historyPoints || []).map(p => typeof p === 'number' ? p : (p.apurado || 0));
    if (!pts || pts.length < 2) {
      // Pontos ilustrativos de progressão contínua caso a apuração esteja iniciando
      pts = [0, 8, 19, 32, 45, 58, 72, 85, 94, 100];
    }

    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = (max - min) || 1;

    const coords = pts.map((val, idx) => {
      const x = (idx / (pts.length - 1)) * 100;
      const y = 35 - ((val - min) / range) * 28;
      return [x, y];
    });

    const ptsString = coords.map(c => `${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
    const lastCoord = coords[coords.length - 1];
    const gradId = `spark-grad-${Math.random().toString(36).substr(2, 6)}`;

    el.innerHTML = `
      <svg viewBox="0 0 100 40" class="w-full h-full" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block;">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${color}" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <polygon fill="url(#${gradId})" points="0,38 ${ptsString} 100,38" />
        <polyline fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${ptsString}" />
        <circle cx="${lastCoord[0].toFixed(1)}" cy="${lastCoord[1].toFixed(1)}" r="3" fill="${color}" stroke="#FFFFFF" stroke-width="1" />
      </svg>
    `;
  }

  /**
   * Renderiza Radar Polar pentagonal de métricas cívicas e integridade eleitoral
   */
  static renderRadarPolar(containerId, metrics = [85, 92, 78, 95, 88], labels = ['Presença', 'Economia', 'Atividade', 'Transparência', 'Eficiência']) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const size = 200;
    const center = size / 2;
    const radius = 68;
    const numAxes = labels.length;

    // Ângulos dos 5 eixos
    const angleStep = (Math.PI * 2) / numAxes;

    // Níveis de anéis de referência (25%, 50%, 75%, 100%)
    let gridPolygons = '';
    [0.25, 0.5, 0.75, 1.0].forEach(level => {
      const r = radius * level;
      const pts = [];
      for (let i = 0; i < numAxes; i++) {
        const ang = -Math.PI / 2 + i * angleStep;
        pts.push(`${(center + Math.cos(ang) * r).toFixed(1)},${(center + Math.sin(ang) * r).toFixed(1)}`);
      }
      gridPolygons += `<polygon fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="1" points="${pts.join(' ')}" />`;
    });

    // Linhas dos eixos radiais
    let axisLines = '';
    let labelTexts = '';
    for (let i = 0; i < numAxes; i++) {
      const ang = -Math.PI / 2 + i * angleStep;
      const x = center + Math.cos(ang) * radius;
      const y = center + Math.sin(ang) * radius;
      axisLines += `<line x1="${center}" y1="${center}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-opacity="0.2" stroke-width="1" />`;

      // Texto de label ligeiramente afastado
      const lx = center + Math.cos(ang) * (radius + 18);
      const ly = center + Math.sin(ang) * (radius + 18);
      labelTexts += `
        <text 
          x="${lx.toFixed(1)}" 
          y="${(ly + 3).toFixed(1)}" 
          font-size="8.5" 
          fill="currentColor" 
          font-weight="700" 
          text-anchor="middle" 
          font-family="system-ui, sans-serif"
        >${labels[i]}</text>
      `;
    }

    // Polígono de métricas
    const dataPoints = metrics.map((val, i) => {
      const normalized = Math.min(100, Math.max(0, val)) / 100;
      const r = radius * normalized;
      const ang = -Math.PI / 2 + i * angleStep;
      return `${(center + Math.cos(ang) * r).toFixed(1)},${(center + Math.sin(ang) * r).toFixed(1)}`;
    }).join(' ');

    el.innerHTML = `
      <svg viewBox="0 0 ${size} ${size}" class="w-full h-full" style="width: 100%; height: 100%; display: block;">
        <g class="radar-grid">${gridPolygons}</g>
        <g class="radar-axes">${axisLines}</g>
        <polygon points="${dataPoints}" fill="#10B981" fill-opacity="0.3" stroke="#10B981" stroke-width="2.2" stroke-linejoin="round" />
        <g class="radar-labels" style="color: var(--text-main);">${labelTexts}</g>
      </svg>
    `;
  }

  /**
   * Helper que adapta estatísticas oficiais do TSE para o Radar Polar Cívico
   */
  static renderCivicRadar(containerId, stats = null) {
    let metrics = [85, 90, 80, 95, 88];
    if (stats && stats.percentApuradoNum > 0) {
      const ap = Math.min(100, Math.round(stats.percentApuradoNum));
      const turn = Math.min(100, Math.round(parseFloat(stats.percentComparecimento?.replace(',', '.') || '80')));
      const val = Math.min(100, Math.round(parseFloat(stats.percentValidos?.replace(',', '.') || '90')));
      metrics = [ap, turn, val, 95, 88];
    }
    return this.renderRadarPolar(containerId, metrics);
  }
}
