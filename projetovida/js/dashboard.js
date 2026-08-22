/**
 * DASHBOARD VIEW CONTROLLER - PROJETO VIDA WEBAPP
 * Gerencia os cartões de KPIs, gráficos interativos Chart.js e resumos visuais.
 */

const Dashboard = {
  charts: {
    evolution: null,
    costCenter: null,
    donors: null
  },

  init() {
    State.subscribe('data:loaded', () => this.render());
    State.subscribe('filter:changed', () => this.render());
  },

  /**
   * Renderiza todos os elementos do Dashboard
   */
  render() {
    this.renderKPIs();
    this.renderCharts();
    this.renderRecentTransactions();
  },

  /**
   * Formata valores em Moeda Brasileira (R$)
   */
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  },

  /**
   * Atualiza os Cards de KPIs
   */
  renderKPIs() {
    const totals = State.getTotals();
    const generalBalance = State.getGeneralBalance();

    const elSaldo = document.getElementById('kpi-saldo-geral');
    const elEntradas = document.getElementById('kpi-total-entradas');
    const elSaidas = document.getElementById('kpi-total-saidas');
    const elResultado = document.getElementById('kpi-resultado-mes');
    const elBadgeResultado = document.getElementById('kpi-badge-resultado');

    if (elSaldo) elSaldo.textContent = this.formatCurrency(generalBalance);
    if (elEntradas) elEntradas.textContent = this.formatCurrency(totals.entradas);
    if (elSaidas) elSaidas.textContent = this.formatCurrency(totals.saidas);
    if (elResultado) {
      elResultado.textContent = this.formatCurrency(totals.resultado);
      elResultado.className = totals.resultado >= 0 ? 'kpi-value text-success' : 'kpi-value text-danger';
    }

    if (elBadgeResultado) {
      if (totals.resultado >= 0) {
        elBadgeResultado.className = 'badge badge-success';
        elBadgeResultado.innerHTML = '<i class="fas fa-arrow-up"></i> Superávit';
      } else {
        elBadgeResultado.className = 'badge badge-danger';
        elBadgeResultado.innerHTML = '<i class="fas fa-arrow-down"></i> Déficit';
      }
    }
  },

  /**
   * Renderiza ou atualiza os gráficos Chart.js
   */
  renderCharts() {
    if (typeof Chart === 'undefined') return;

    this.renderEvolutionChart();
    this.renderCostCenterChart();
    this.renderDonorsChart();
  },

  /**
   * Gráfico 1: Evolução Mensal de Entradas vs Saídas
   */
  renderEvolutionChart() {
    const canvas = document.getElementById('chart-evolucao-mensal');
    if (!canvas) return;

    const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const year = State.filters.year !== 'todos' ? State.filters.year : '2026';

    const dadosEntradas = new Array(12).fill(0);
    const dadosSaidas = new Array(12).fill(0);

    State.transactions.forEach(t => {
      if (!t.data || !t.data.startsWith(year)) return;
      const mIdx = parseInt(t.data.substring(5, 7), 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        const val = Number(t.valor) || 0;
        if (val >= 0) {
          dadosEntradas[mIdx] += val;
        } else {
          dadosSaidas[mIdx] += Math.abs(val);
        }
      }
    });

    if (this.charts.evolution) {
      this.charts.evolution.destroy();
    }

    const ctx = canvas.getContext('2d');
    this.charts.evolution = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: mesesLabels,
        datasets: [
          {
            label: 'Entradas (Doações/Receitas)',
            data: dadosEntradas,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10b981',
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: 'Saídas (Despesas/Obras)',
            data: dadosSaidas,
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderColor: '#ef4444',
            borderWidth: 1.5,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${this.formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94a3b8' }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              color: '#94a3b8',
              callback: (val) => 'R$ ' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            }
          }
        }
      }
    });
  },

  /**
   * Gráfico 2: Distribuição de Despesas por Centro de Custo
   */
  renderCostCenterChart() {
    const canvas = document.getElementById('chart-ccusto-doughnut');
    if (!canvas) return;

    const filtered = State.getFilteredTransactions().filter(t => (Number(t.valor) || 0) < 0);
    const ccMap = {};

    filtered.forEach(t => {
      const cod = t.cod_ccusto || 'OUTROS';
      const nome = t.nome_ccusto || State.getCostCenterName(cod) || 'Outros';
      const label = `[${cod}] ${nome}`;
      ccMap[label] = (ccMap[label] || 0) + Math.abs(Number(t.valor) || 0);
    });

    // Ordena os maiores
    const sorted = Object.entries(ccMap).sort((a, b) => b[1] - a[1]);
    const topLabels = sorted.slice(0, 6).map(s => s[0]);
    const topValues = sorted.slice(0, 6).map(s => s[1]);

    const outrosTotal = sorted.slice(6).reduce((acc, s) => acc + s[1], 0);
    if (outrosTotal > 0) {
      topLabels.push('Outros Centros');
      topValues.push(outrosTotal);
    }

    if (this.charts.costCenter) {
      this.charts.costCenter.destroy();
    }

    const colors = [
      '#6366f1', '#ec4899', '#f59e0b', '#3b82f6',
      '#8b5cf6', '#14b8a6', '#64748b'
    ];

    const ctx = canvas.getContext('2d');
    this.charts.costCenter = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: topLabels.length ? topLabels : ['Nenhuma despesa'],
        datasets: [{
          data: topValues.length ? topValues : [1],
          backgroundColor: topLabels.length ? colors.slice(0, topLabels.length) : ['#334155'],
          borderColor: '#1e293b',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, boxWidth: 14 }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${this.formatCurrency(context.raw)}`
            }
          }
        },
        cutout: '68%'
      }
    });
  },

  /**
   * Gráfico 3: Maiores Doadores / Origens de Receita
   */
  renderDonorsChart() {
    const canvas = document.getElementById('chart-maiores-doadores');
    if (!canvas) return;

    const filtered = State.getFilteredTransactions().filter(t => (Number(t.valor) || 0) > 0);
    const donorMap = {};

    filtered.forEach(t => {
      let donor = t.favorecido || t.descricao || 'Doador Anônimo';
      donor = donor.trim().toUpperCase();
      if (donor === 'DOAÇÃO' || donor === 'DOACAO') donor = 'DOAÇÃO DIRETA';
      donorMap[donor] = (donorMap[donor] || 0) + Number(t.valor);
    });

    const sorted = Object.entries(donorMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sorted.map(s => s[0]);
    const values = sorted.map(s => s[1]);

    if (this.charts.donors) {
      this.charts.donors.destroy();
    }

    const ctx = canvas.getContext('2d');
    this.charts.donors = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Sem doações no período'],
        datasets: [{
          label: 'Total Doado',
          data: values.length ? values : [0],
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          borderColor: '#3b82f6',
          borderWidth: 1.5,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Total: ${this.formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              color: '#94a3b8',
              callback: (val) => 'R$ ' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          }
        }
      }
    });
  },

  /**
   * Tabela de lançamentos recentes no Dashboard
   */
  renderRecentTransactions() {
    const tbody = document.getElementById('dashboard-recent-table-body');
    if (!tbody) return;

    const recent = State.getFilteredTransactions().slice(0, 6);

    if (recent.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            <i class="fas fa-inbox fa-2x mb-2 d-block"></i>
            Nenhum lançamento encontrado para os filtros selecionados.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = recent.map(t => {
      const isEntrada = Number(t.valor) >= 0;
      const badgeClass = isEntrada ? 'badge-success' : 'badge-danger';
      const icon = isEntrada ? 'fa-arrow-down-left' : 'fa-arrow-up-right';
      const valorClass = isEntrada ? 'text-success' : 'text-danger';
      const formattedDate = t.data ? t.data.split('-').reverse().join('/') : '-';

      return `
        <tr>
          <td><span class="text-muted small">${formattedDate}</span></td>
          <td>
            <div class="font-medium">${escapeHtml(t.descricao || '-')}</div>
            <div class="text-muted small">${escapeHtml(t.favorecido || '')}</div>
          </td>
          <td>
            <span class="badge ${badgeClass} small">
              [${t.cod_ccusto || '-'}] ${escapeHtml(t.nome_ccusto || State.getCostCenterName(t.cod_ccusto) || '')}
            </span>
          </td>
          <td><span class="badge badge-neutral small">${escapeHtml(t.conta || 'BRASIL')}</span></td>
          <td class="text-right font-semibold ${valorClass}">
            ${isEntrada ? '+' : ''} ${this.formatCurrency(t.valor)}
          </td>
        </tr>
      `;
    }).join('');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.escapeHtml = escapeHtml;
window.Dashboard = Dashboard;

