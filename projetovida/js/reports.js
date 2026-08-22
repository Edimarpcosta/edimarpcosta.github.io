/**
 * REPORTS VIEW CONTROLLER - PROJETO VIDA WEBAPP
 * Gera Demonstrativos de Resultado (DRE - réplica de 'FINAL MES'),
 * Relatórios por Centro de Custo (réplica de 'CCUSTO') e Conciliação Bancária.
 */

const Reports = {
  currentReportType: 'dre',
  customDateStart: '',
  customDateEnd: '',

  init() {
    State.subscribe('data:loaded', () => this.render());
    State.subscribe('filter:changed', () => this.render());

    const selMonth = document.getElementById('report-month');
    const selYear = document.getElementById('report-year');
    const selType = document.getElementById('report-type');
    const dStart = document.getElementById('report-date-start');
    const dEnd = document.getElementById('report-date-end');

    if (selMonth) selMonth.addEventListener('change', () => {
      this.clearDateRangeInputs();
      this.render();
    });
    if (selYear) selYear.addEventListener('change', () => {
      this.clearDateRangeInputs();
      this.render();
    });
    if (dStart) dStart.addEventListener('change', (e) => {
      this.customDateStart = e.target.value;
      this.render();
    });
    if (dEnd) dEnd.addEventListener('change', (e) => {
      this.customDateEnd = e.target.value;
      this.render();
    });
    if (selType) {
      selType.addEventListener('change', (e) => {
        this.currentReportType = e.target.value;
        this.render();
      });
    }
  },

  clearDateRangeInputs() {
    this.customDateStart = '';
    this.customDateEnd = '';
    const dStart = document.getElementById('report-date-start');
    const dEnd = document.getElementById('report-date-end');
    if (dStart) dStart.value = '';
    if (dEnd) dEnd.value = '';
  },

  clearDateRange() {
    this.clearDateRangeInputs();
    this.render();
    App.showToast('Intervalo de datas do relatório restaurado.', 'info');
  },

  /**
   * Renderiza a visualização do relatório selecionado
   */
  render() {
    const year = document.getElementById('report-year') ? document.getElementById('report-year').value : '2026';
    const month = document.getElementById('report-month') ? document.getElementById('report-month').value : 'todos';

    const container = document.getElementById('report-content-container');
    if (!container) return;

    if (this.currentReportType === 'dre') {
      container.innerHTML = this.buildDREHTML(year, month);
    } else if (this.currentReportType === 'ccusto') {
      container.innerHTML = this.buildCostCenterReportHTML(year, month);
    } else if (this.currentReportType === 'conciliacao') {
      container.innerHTML = this.buildConciliationReportHTML(year, month);
    }
  },

  /**
   * Filtra lançamentos pelo período do relatório
   */
  getPeriodTransactions(year, month) {
    return State.transactions.filter(t => {
      if (!t.data) return false;
      // Se houver intervalo customizado
      if (this.customDateStart && t.data < this.customDateStart) return false;
      if (this.customDateEnd && t.data > this.customDateEnd) return false;
      
      // Se não houver intervalo customizado, aplica mês e ano
      if (!this.customDateStart && !this.customDateEnd) {
        if (year !== 'todos' && !t.data.startsWith(year)) return false;
        if (month !== 'todos' && t.data.substring(5, 7) !== month) return false;
      }
      return true;
    });
  },

  /**
   * Dispara Exportação Direta para PDF A4 (Sem cortes ou scrollbars)
   */
  exportToPDF() {
    if (typeof PdfService !== 'undefined') {
      PdfService.exportReportPDF(this.currentReportType);
    } else {
      window.print();
    }
  },

  /**
   * Impressão tradicional pelo navegador (fallback)
   */
  printReport() {
    window.print();
  },

  /**
   * Exporta o relatório ativo para Excel (.xlsx) nativo
   */
  exportToExcel() {
    if (typeof XLSX === 'undefined') {
      App.showToast('Biblioteca SheetJS indisponível.', 'error');
      return;
    }

    const year = document.getElementById('report-year') ? document.getElementById('report-year').value : '2026';
    const month = document.getElementById('report-month') ? document.getElementById('report-month').value : 'todos';
    const txs = this.getPeriodTransactions(year, month);

    const wb = XLSX.utils.book_new();

    if (this.currentReportType === 'dre') {
      // Monta dados DRE
      const ccMap = {};
      txs.forEach(t => {
        const cod = String(t.cod_ccusto || 'OUTROS');
        ccMap[cod] = (ccMap[cod] || 0) + (Number(t.valor) || 0);
      });

      const recBruta = ccMap['500'] || 0;
      const impostos = Math.abs(ccMap['600'] || 0);
      const recLiq = recBruta - impostos;
      const folha = Math.abs(ccMap['510'] || 0);
      const aluguel = Math.abs(ccMap['519'] || 0);
      const adm = Math.abs(ccMap['520'] || 0);
      const proLabore = Math.abs(ccMap['540'] || 0);
      const financ = Math.abs(ccMap['560'] || 0);
      const recFinanc = ccMap['610'] || 0;
      const obra = Math.abs(ccMap['650'] || 0);
      const despOper = folha + aluguel + adm + proLabore + financ;
      const lucroOper = recLiq - despOper + recFinanc;
      const resFinal = lucroOper - obra;

      const dreRows = [
        ['PROJETO VIDA - DEMONSTRAÇÃO DO RESULTADO (DRE)', ''],
        [`Período: ${this.getPeriodLabel(year, month)}`, ''],
        ['', ''],
        ['ESTRUTURA DRE', 'VALOR (R$)'],
        ['(+) RECEITA BRUTA (Doações CC 500)', recBruta],
        ['(-) Deduções / Impostos e Taxas (CC 600)', -impostos],
        ['(=) RECEITA LÍQUIDA', recLiq],
        ['(-) Folha de Pagamento e Encargos (CC 510)', -folha],
        ['(-) Aluguel, DAE e CPFL (CC 519)', -aluguel],
        ['(-) Despesas Administrativas (CC 520)', -adm],
        ['(-) Ajuda de Custo / Pro-Labore (CC 540)', -proLabore],
        ['(-) Despesas Financeiras (CC 560)', -financ],
        ['(+) Receitas de Aplicação Financeira (CC 610)', recFinanc],
        ['(=) LUCRO OPERACIONAL LÍQUIDO', lucroOper],
        ['(-) Obras e Investimentos Nova Sede (CC 650)', -obra],
        ['(=) RESULTADO CONSOLIDADO DO PERÍODO', resFinal]
      ];

      const ws = XLSX.utils.aoa_to_sheet(dreRows);
      XLSX.utils.book_append_sheet(wb, ws, 'DRE_ProjetoVida');

    } else if (this.currentReportType === 'ccusto') {
      const ccMap = {};
      State.costCenters.forEach(cc => {
        ccMap[cc.codigo] = {
          'Código': cc.codigo,
          'Centro de Custo': cc.nome,
          'Natureza': cc.natureza,
          'Categoria DRE': cc.categoriaDRE,
          'Entradas (R$)': 0,
          'Saídas (R$)': 0,
          'Saldo Líquido (R$)': 0,
          'Qtd Lançamentos': 0
        };
      });

      txs.forEach(t => {
        const cod = String(t.cod_ccusto || 'OUTROS');
        if (ccMap[cod]) {
          const v = Number(t.valor) || 0;
          ccMap[cod]['Qtd Lançamentos'] += 1;
          if (v >= 0) ccMap[cod]['Entradas (R$)'] += v;
          else ccMap[cod]['Saídas (R$)'] += Math.abs(v);
          ccMap[cod]['Saldo Líquido (R$)'] += v;
        }
      });

      const ws = XLSX.utils.json_to_sheet(Object.values(ccMap));
      XLSX.utils.book_append_sheet(wb, ws, 'Centros_Custo');

    } else {
      const accRows = State.accounts.map(acc => {
        const accTxs = txs.filter(t => t.conta.toLowerCase() === acc.nome.toLowerCase());
        let delta = 0;
        accTxs.forEach(t => delta += Number(t.valor) || 0);
        return {
          'Conta': acc.nome,
          'Tipo': acc.tipo,
          'Saldo Inicial (R$)': acc.saldoInicial,
          'Movimentações (R$)': delta,
          'Saldo Final (R$)': Number(acc.saldoInicial) + delta
        };
      });
      const ws = XLSX.utils.json_to_sheet(accRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Conciliacao');
    }

    const fileName = `Relatorio_${this.currentReportType.toUpperCase()}_ProjetoVida_${new Date().toISOString().substring(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    App.showToast('Planilha do Relatório (.xlsx) gerada com sucesso!', 'success');
  },

  getPeriodLabel(year, month) {
    if (this.customDateStart || this.customDateEnd) {
      return `${this.customDateStart || 'Início'} até ${this.customDateEnd || 'Hoje'}`;
    }
    const monthNames = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
      'todos': 'Ano Completo'
    };
    return `${monthNames[month] || month} / ${year}`;
  },

  /**
   * 1. GERAÇÃO DO DRE (DEMONSTRAÇÃO DE RESULTADO - MODELO FINAL MES)
   */
  buildDREHTML(year, month) {
    const txs = this.getPeriodTransactions(year, month);
    const ccMap = {};

    txs.forEach(t => {
      const cod = String(t.cod_ccusto || 'OUTROS');
      const val = Number(t.valor) || 0;
      ccMap[cod] = (ccMap[cod] || 0) + val;
    });

    // Cálculos DRE
    const receitaBruta = ccMap['500'] || 0; // Doações
    const receitasEventos = ccMap['651'] || 0; // Patrocínios / Vendas
    const totalReceitas = receitaBruta + receitasEventos;

    const impostos = Math.abs(ccMap['600'] || 0); // Impostos e taxas bancárias
    const receitaLiquida = totalReceitas - impostos;

    const folhaPagamento = Math.abs(ccMap['510'] || 0); // Folha / Prestadores
    const aluguelAguaLuz = Math.abs(ccMap['519'] || 0); // Aluguel / DAE / CPFL
    const despOperAdm = Math.abs(ccMap['520'] || 0); // Despesas Administrativas
    const despDiversas = Math.abs(ccMap['561'] || 0); // Despesas Diversas
    const despEventos = Math.abs(ccMap['562'] || 0); // Despesas Eventos
    const despFinanceiras = Math.abs(ccMap['560'] || 0); // Despesas Financeiras
    const receitasFinanceiras = ccMap['610'] || 0; // Rendimentos de Aplicação
    const proLaboreAjuda = Math.abs(ccMap['540'] || 0); // Ajuda de Custo

    const totalDespesasOperacionais = folhaPagamento + aluguelAguaLuz + despOperAdm + despDiversas + despEventos + despFinanceiras + proLaboreAjuda;
    const lucroOperacional = receitaLiquida - totalDespesasOperacionais + receitasFinanceiras;

    // Investimentos e Patrimônio
    const obraSedeNova = Math.abs(ccMap['650'] || 0);
    const imobilizado = Math.abs(ccMap['640'] || 0);
    const titCapitalizacao = Math.abs(ccMap['630'] || 0);
    const totalInvestimentos = obraSedeNova + imobilizado + titCapitalizacao;

    const resultadoLiquidoPeriodo = lucroOperacional - totalInvestimentos;

    const format = (v) => Dashboard.formatCurrency(v);
    const calcPct = (v) => totalReceitas > 0 ? ((v / totalReceitas) * 100).toFixed(1) + '%' : '-';

    const monthNames = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
      'todos': 'Ano Completo'
    };

    const periodoStr = this.getPeriodLabel(year, month);

    return `
      <div class="card p-4 print-card">
        <div class="d-flex justify-content-between align-items-center mb-4 border-b pb-3 no-print">
          <div>
            <h3 class="font-bold text-xl mb-1 text-light">PROJETO VIDA - DEMONSTRAÇÃO DO RESULTADO (DRE)</h3>
            <p class="text-muted small mb-0">Período de Referência: <strong>${periodoStr}</strong> | Base Consolidada</p>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-primary btn-sm" onclick="Reports.exportToPDF()" title="Baixar PDF A4 diretamente">
              <i class="fas fa-file-pdf mr-1"></i> Baixar PDF
            </button>
            <button class="btn btn-success btn-sm" onclick="Reports.exportToExcel()" title="Exportar para Excel (.xlsx)">
              <i class="fas fa-file-excel mr-1"></i> Excel (.xlsx)
            </button>
            <button class="btn btn-ghost btn-sm" onclick="Reports.printReport()" title="Imprimir pelo navegador">
              <i class="fas fa-print"></i>
            </button>
          </div>
        </div>

        <!-- Cabeçalho visível na impressão / PDF -->
        <div class="d-none d-print-block text-center mb-4">
          <h2 style="font-size: 16pt; font-weight: bold; margin-bottom: 2px;">PROJETO VIDA - ONG</h2>
          <h3 style="font-size: 13pt; font-weight: 600; margin-bottom: 4px;">DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)</h3>
          <p style="font-size: 10pt; color: #475569;">Período: ${periodoStr} | Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
          <hr style="border-top: 1px solid #cbd5e1; margin: 10px 0;">
        </div>

        <div class="table-responsive">
          <table class="table dre-table">
            <thead>
              <tr class="table-header-dark">
                <th>CONTA / ESTRUTURA DRE</th>
                <th class="text-right" style="width: 180px;">VALOR (R$)</th>
                <th class="text-right" style="width: 100px;">% DA RECEITA</th>
              </tr>
            </thead>
            <tbody>
              <!-- RECEITAS -->
              <tr class="font-bold bg-slate-800 text-emerald-400">
                <td><i class="fas fa-plus-circle mr-2"></i> RECEITA BRUTA</td>
                <td class="text-right">${format(totalReceitas)}</td>
                <td class="text-right">100.0%</td>
              </tr>
              <tr class="sub-row">
                <td class="pl-4">↳ [500] Doações e Subvenções</td>
                <td class="text-right font-mono">${format(receitaBruta)}</td>
                <td class="text-right font-mono text-muted">${calcPct(receitaBruta)}</td>
              </tr>
              ${receitasEventos > 0 ? `
              <tr class="sub-row">
                <td class="pl-4">↳ [651] Patrocínios / Vendas de Eventos</td>
                <td class="text-right font-mono">${format(receitasEventos)}</td>
                <td class="text-right font-mono text-muted">${calcPct(receitasEventos)}</td>
              </tr>` : ''}

              <!-- DEDUÇÕES / IMPOSTOS -->
              <tr class="sub-row text-danger">
                <td class="pl-4">↳ (-) [600] Impostos e Taxas Bancárias</td>
                <td class="text-right font-mono">- ${format(impostos)}</td>
                <td class="text-right font-mono text-muted">${calcPct(impostos)}</td>
              </tr>

              <!-- RECEITA LÍQUIDA -->
              <tr class="font-bold bg-slate-900 border-t border-b">
                <td>(=) RECEITA LÍQUIDA</td>
                <td class="text-right font-mono font-bold text-emerald-400">${format(receitaLiquida)}</td>
                <td class="text-right font-mono">${calcPct(receitaLiquida)}</td>
              </tr>

              <!-- CUSTOS E DESPESAS OPERACIONAIS -->
              <tr class="font-bold text-amber-400 pt-3">
                <td colspan="3"><i class="fas fa-minus-circle mr-2"></i> CUSTOS E DESPESAS OPERACIONAIS</td>
              </tr>
              <tr class="sub-row">
                <td class="pl-4">↳ [510] Folha de Pagamento, Encargos e Prestadores de Serviços</td>
                <td class="text-right font-mono text-danger">- ${format(folhaPagamento)}</td>
                <td class="text-right font-mono text-muted">${calcPct(folhaPagamento)}</td>
              </tr>
              <tr class="sub-row">
                <td class="pl-4">↳ [519] Aluguel, DAE (Água), CPFL (Luz) e Telefonia</td>
                <td class="text-right font-mono text-danger">- ${format(aluguelAguaLuz)}</td>
                <td class="text-right font-mono text-muted">${calcPct(aluguelAguaLuz)}</td>
              </tr>
              <tr class="sub-row">
                <td class="pl-4">↳ [520] Despesas Administrativas e Operacionais</td>
                <td class="text-right font-mono text-danger">- ${format(despOperAdm)}</td>
                <td class="text-right font-mono text-muted">${calcPct(despOperAdm)}</td>
              </tr>
              <tr class="sub-row">
                <td class="pl-4">↳ [540] Ajuda de Custo e Pro-Labore</td>
                <td class="text-right font-mono text-danger">- ${format(proLaboreAjuda)}</td>
                <td class="text-right font-mono text-muted">${calcPct(proLaboreAjuda)}</td>
              </tr>
              <tr class="sub-row">
                <td class="pl-4">↳ [560] Despesas Financeiras e Tarifas de Manutenção</td>
                <td class="text-right font-mono text-danger">- ${format(despFinanceiras)}</td>
                <td class="text-right font-mono text-muted">${calcPct(despFinanceiras)}</td>
              </tr>
              ${despDiversas > 0 ? `
              <tr class="sub-row">
                <td class="pl-4">↳ [561] Despesas Diversas</td>
                <td class="text-right font-mono text-danger">- ${format(despDiversas)}</td>
                <td class="text-right font-mono text-muted">${calcPct(despDiversas)}</td>
              </tr>` : ''}

              <!-- RECEITAS FINANCEIRAS -->
              <tr class="sub-row text-emerald-400">
                <td class="pl-4">↳ (+) [610] Receitas de Aplicação Financeira (Juros / CDB)</td>
                <td class="text-right font-mono">+ ${format(receitasFinanceiras)}</td>
                <td class="text-right font-mono text-muted">${calcPct(receitasFinanceiras)}</td>
              </tr>

              <!-- LUCRO OPERACIONAL -->
              <tr class="font-bold bg-slate-900 border-t border-b text-lg">
                <td>(=) RESULTADO OPERACIONAL LÍQUIDO</td>
                <td class="text-right font-mono ${lucroOperacional >= 0 ? 'text-success' : 'text-danger'}">
                  ${format(lucroOperacional)}
                </td>
                <td class="text-right font-mono">${calcPct(lucroOperacional)}</td>
              </tr>

              <!-- INVESTIMENTOS / OBRAS -->
              <tr class="font-bold text-sky-400 pt-3">
                <td colspan="3"><i class="fas fa-building mr-2"></i> INVESTIMENTOS PATRIMONIAIS & OBRAS</td>
              </tr>
              <tr class="sub-row">
                <td class="pl-4">↳ [650] Construção / Obras Nova Sede (Materiais, Maquinário, Empreiteiro)</td>
                <td class="text-right font-mono text-danger">- ${format(obraSedeNova)}</td>
                <td class="text-right font-mono text-muted">${calcPct(obraSedeNova)}</td>
              </tr>
              ${imobilizado > 0 ? `
              <tr class="sub-row">
                <td class="pl-4">↳ [640] Bens Imobilizados e Equipamentos</td>
                <td class="text-right font-mono text-danger">- ${format(imobilizado)}</td>
                <td class="text-right font-mono text-muted">${calcPct(imobilizado)}</td>
              </tr>` : ''}

              <!-- RESULTADO FINAL -->
              <tr class="font-bold bg-slate-950 text-xl border-t-2 border-indigo-500">
                <td class="py-3">(=) RESULTADO CONSOLIDADO DO PERÍODO</td>
                <td class="text-right font-mono py-3 ${resultadoLiquidoPeriodo >= 0 ? 'text-success' : 'text-danger'}">
                  ${format(resultadoLiquidoPeriodo)}
                </td>
                <td class="text-right font-mono py-3">${calcPct(resultadoLiquidoPeriodo)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /**
   * 2. RELATÓRIO DETALHADO POR CENTRO DE CUSTO (RÉPLICA DE 'CCUSTO')
   */
  buildCostCenterReportHTML(year, month) {
    const txs = this.getPeriodTransactions(year, month);
    const ccMap = {};

    State.costCenters.forEach(cc => {
      ccMap[cc.codigo] = {
        codigo: cc.codigo,
        nome: cc.nome,
        natureza: cc.natureza,
        categoriaDRE: cc.categoriaDRE,
        entradas: 0,
        saidas: 0,
        saldo: 0,
        qtd: 0
      };
    });

    txs.forEach(t => {
      const cod = String(t.cod_ccusto || 'OUTROS');
      if (!ccMap[cod]) {
        ccMap[cod] = {
          codigo: cod,
          nome: t.nome_ccusto || 'Outros',
          natureza: 'DR',
          categoriaDRE: 'Outros',
          entradas: 0,
          saidas: 0,
          saldo: 0,
          qtd: 0
        };
      }
      const v = Number(t.valor) || 0;
      ccMap[cod].qtd += 1;
      if (v >= 0) {
        ccMap[cod].entradas += v;
      } else {
        ccMap[cod].saidas += Math.abs(v);
      }
      ccMap[cod].saldo += v;
    });

    const rows = Object.values(ccMap).filter(c => c.qtd > 0 || ['500', '510', '519', '520', '650'].includes(c.codigo));
    rows.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));

    let totalEnt = 0, totalSai = 0, totalSaldo = 0;
    rows.forEach(r => {
      totalEnt += r.entradas;
      totalSai += r.saidas;
      totalSaldo += r.saldo;
    });

    const periodoStr = this.getPeriodLabel(year, month);

    return `
      <div class="card p-4 print-card">
        <div class="d-flex justify-content-between align-items-center mb-4 border-b pb-3 no-print">
          <div>
            <h3 class="font-bold text-xl mb-1 text-light">PROJETO VIDA - LANÇAMENTOS POR CENTRO DE CUSTO</h3>
            <p class="text-muted small mb-0">Período: <strong>${periodoStr}</strong> | Consolidação por código gerencial</p>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-primary btn-sm" onclick="Reports.exportToPDF()" title="Baixar PDF A4 diretamente">
              <i class="fas fa-file-pdf mr-1"></i> Baixar PDF
            </button>
            <button class="btn btn-success btn-sm" onclick="Reports.exportToExcel()" title="Exportar para Excel (.xlsx)">
              <i class="fas fa-file-excel mr-1"></i> Excel (.xlsx)
            </button>
            <button class="btn btn-ghost btn-sm" onclick="Reports.printReport()" title="Imprimir pelo navegador">
              <i class="fas fa-print"></i>
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr class="table-header-dark">
                <th>CÓD</th>
                <th>CENTRO DE CUSTO</th>
                <th>NAT.</th>
                <th>CATEGORIA DRE</th>
                <th class="text-center">QTD</th>
                <th class="text-right">ENTRADAS (R$)</th>
                <th class="text-right">SAÍDAS (R$)</th>
                <th class="text-right">SALDO LÍQUIDO (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td class="font-mono font-bold">${r.codigo}</td>
                  <td><strong>${escapeHtml(r.nome)}</strong></td>
                  <td><span class="badge badge-neutral text-xs">${r.natureza}</span></td>
                  <td class="text-muted small">${escapeHtml(r.categoriaDRE)}</td>
                  <td class="text-center font-mono">${r.qtd}</td>
                  <td class="text-right font-mono text-success">${r.entradas > 0 ? Dashboard.formatCurrency(r.entradas) : '-'}</td>
                  <td class="text-right font-mono text-danger">${r.saidas > 0 ? Dashboard.formatCurrency(r.saidas) : '-'}</td>
                  <td class="text-right font-mono font-bold ${r.saldo >= 0 ? 'text-success' : 'text-danger'}">
                    ${Dashboard.formatCurrency(r.saldo)}
                  </td>
                </tr>
              `).join('')}
              <tr class="font-bold bg-slate-900 border-t-2 text-lg">
                <td colspan="4">TOTAL GERAL CONSOLIDADO</td>
                <td class="text-center font-mono">${txs.length}</td>
                <td class="text-right font-mono text-success">${Dashboard.formatCurrency(totalEnt)}</td>
                <td class="text-right font-mono text-danger">${Dashboard.formatCurrency(totalSai)}</td>
                <td class="text-right font-mono font-bold ${totalSaldo >= 0 ? 'text-success' : 'text-danger'}">
                  ${Dashboard.formatCurrency(totalSaldo)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /**
   * 3. CONCILIAÇÃO BANCÁRIA & SALDO MENSAL
   */
  buildConciliationReportHTML(year, month) {
    const txs = this.getPeriodTransactions(year, month);
    let ent = 0, sai = 0;
    txs.forEach(t => {
      const v = Number(t.valor) || 0;
      if (v >= 0) ent += v;
      else sai += Math.abs(v);
    });

    const saldoGeral = State.getGeneralBalance();
    const periodoStr = this.getPeriodLabel(year, month);

    return `
      <div class="card p-4 print-card">
        <div class="d-flex justify-content-between align-items-center mb-4 border-b pb-3 no-print">
          <div>
            <h3 class="font-bold text-xl mb-1 text-light">PROJETO VIDA - CONCILIAÇÃO BANCÁRIA E POSIÇÃO FINANCEIRA</h3>
            <p class="text-muted small mb-0">Período: <strong>${periodoStr}</strong> | Verificação de saldos das contas e caixas</p>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-primary btn-sm" onclick="Reports.exportToPDF()" title="Baixar PDF A4 diretamente">
              <i class="fas fa-file-pdf mr-1"></i> Baixar PDF
            </button>
            <button class="btn btn-success btn-sm" onclick="Reports.exportToExcel()" title="Exportar para Excel (.xlsx)">
              <i class="fas fa-file-excel mr-1"></i> Excel (.xlsx)
            </button>
            <button class="btn btn-ghost btn-sm" onclick="Reports.printReport()" title="Imprimir pelo navegador">
              <i class="fas fa-print"></i>
            </button>
          </div>
        </div>

        <div class="row mb-4">
          <div class="col-4">
            <div class="card bg-slate-800 p-3 text-center">
              <div class="text-muted small">Total de Entradas</div>
              <div class="text-success font-bold text-xl font-mono">+ ${Dashboard.formatCurrency(ent)}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="card bg-slate-800 p-3 text-center">
              <div class="text-muted small">Total de Saídas</div>
              <div class="text-danger font-bold text-xl font-mono">- ${Dashboard.formatCurrency(sai)}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="card bg-slate-800 p-3 text-center">
              <div class="text-muted small">Saldo Consolidado Atual</div>
              <div class="text-indigo-400 font-bold text-xl font-mono">${Dashboard.formatCurrency(saldoGeral)}</div>
            </div>
          </div>
        </div>

        <h4 class="font-bold mb-3">Saldos por Conta / Origem</h4>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr class="table-header-dark">
                <th>CONTA</th>
                <th>TIPO</th>
                <th class="text-right">SALDO INICIAL</th>
                <th class="text-right">MOVIMENTAÇÕES (+ / -)</th>
                <th class="text-right">SALDO ATUAL</th>
              </tr>
            </thead>
            <tbody>
              ${State.accounts.map(acc => {
                const accTxs = txs.filter(t => t.conta.toLowerCase() === acc.nome.toLowerCase());
                let delta = 0;
                accTxs.forEach(t => delta += Number(t.valor) || 0);
                const saldoFinal = Number(acc.saldoInicial || 0) + delta;

                return `
                  <tr>
                    <td><strong>${escapeHtml(acc.nome)}</strong></td>
                    <td><span class="badge badge-neutral text-xs">${escapeHtml(acc.tipo)}</span></td>
                    <td class="text-right font-mono">${Dashboard.formatCurrency(acc.saldoInicial)}</td>
                    <td class="text-right font-mono ${delta >= 0 ? 'text-success' : 'text-danger'}">
                      ${delta >= 0 ? '+' : ''} ${Dashboard.formatCurrency(delta)}
                    </td>
                    <td class="text-right font-mono font-bold text-light">${Dashboard.formatCurrency(saldoFinal)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};

window.Reports = Reports;
