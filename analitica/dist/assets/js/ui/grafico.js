/**
 * Gráfico Canvas de Evolução Temporal da Totalização
 * Renderiza a curva acumulada de votos (%) sem dependências externas pesadas (60fps nativo).
 */

import { State } from '../state.js';

export class TimelineChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.setupResize();
  }

  setupResize() {
    if (!this.canvas) return;
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const width = (parent ? parent.clientWidth : 0) || 800;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = 240 * dpr;
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    const rawPoints = State.historyPoints;
    if (!rawPoints || rawPoints.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Aguardando acúmulo de pontos de apuração para traçar a curva de evolução...', w / 2, h / 2);
      return;
    }

    // Se houver apenas 1 ponto (ex: eleição já consolidada a 100%), sintetiza 2 pontos para desenhar linha horizontal
    const points = rawPoints.length === 1 ? [rawPoints[0], rawPoints[0]] : rawPoints;

    const padLeft = 45;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;

    const plotW = Math.max(10, w - padLeft - padRight);
    const plotH = Math.max(10, h - padTop - padBottom);

    // Calcular limites dinâmicos para a escala Y
    let minPct = 100, maxPct = 0;
    for (const p of points) {
      if (p.bolsonaro) {
        minPct = Math.min(minPct, p.bolsonaro);
        maxPct = Math.max(maxPct, p.bolsonaro);
      }
      if (p.lula) {
        minPct = Math.min(minPct, p.lula);
        maxPct = Math.max(maxPct, p.lula);
      }
    }
    if (minPct > maxPct) {
      minPct = 30;
      maxPct = 70;
    } else {
      minPct = Math.max(0, Math.floor((minPct - 5) / 10) * 10);
      maxPct = Math.min(100, Math.ceil((maxPct + 5) / 10) * 10);
      if (maxPct - minPct < 20) {
        minPct = Math.max(0, minPct - 10);
        maxPct = Math.min(100, maxPct + 10);
      }
    }
    const rangeY = maxPct - minPct || 40;

    // Linhas de Grade e Eixos
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';

    const step = rangeY <= 20 ? 5 : 10;
    for (let pct = minPct; pct <= maxPct; pct += step) {
      const y = padTop + plotH - ((pct - minPct) / rangeY) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillText(`${pct}%`, padLeft - 6, y + 3);
    }

    // Linha de 50% (Destaque se estiver na faixa)
    if (50 >= minPct && 50 <= maxPct) {
      const y50 = padTop + plotH - ((50 - minPct) / rangeY) * plotH;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, y50);
      ctx.lineTo(w - padRight, y50);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Desenha Curva Bolsonaro (Azul)
    this.drawLine(ctx, points, 'bolsonaro', '#3b82f6', padLeft, padTop, plotW, plotH, minPct, rangeY);

    // Desenha Curva Lula (Vermelho)
    this.drawLine(ctx, points, 'lula', '#ef4444', padLeft, padTop, plotW, plotH, minPct, rangeY);

    // Eixo X: Timestamps
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    const firstTime = points[0].time;
    const lastTime = points[points.length - 1].time;
    ctx.fillText(firstTime, padLeft, h - 8);
    ctx.fillText(lastTime, w - padRight, h - 8);
  }

  drawLine(ctx, points, key, color, padLeft, padTop, plotW, plotH, minPct, rangeY) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const n = points.length;
    for (let i = 0; i < n; i++) {
      const pt = points[i];
      const val = pt[key] || 0;
      const x = n > 1 ? padLeft + (i / (n - 1)) * plotW : padLeft + plotW / 2;
      const clampedVal = Math.min(minPct + rangeY, Math.max(minPct, val));
      const y = padTop + plotH - ((clampedVal - minPct) / rangeY) * plotH;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Marcador no último ponto
    const lastPt = points[n - 1];
    const lastVal = lastPt[key] || 0;
    const lastX = padLeft + plotW;
    const clampedLast = Math.min(minPct + rangeY, Math.max(minPct, lastVal));
    const lastY = padTop + plotH - ((clampedLast - minPct) / rangeY) * plotH;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
