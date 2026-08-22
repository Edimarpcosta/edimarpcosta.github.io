/**
 * PDF & DOCUMENT EXPORT SERVICE - PROJETO VIDA WEBAPP
 * Gera relatórios e recibos em PDF de alta qualidade e imagens PNG compartilháveis.
 * Suporta dimensões personalizadas (cupom térmico 80mm para recibos e A4 para relatórios/extratos).
 */

const PdfService = {
  /**
   * Verifica se as bibliotecas necessárias estão carregadas
   */
  isReady() {
    return typeof window.html2canvas !== 'undefined' && typeof window.jspdf !== 'undefined';
  },

  /**
   * Mostra aviso caso as bibliotecas ainda não tenham sido carregadas
   */
  ensureReady() {
    if (!this.isReady()) {
      App.showToast('Bibliotecas de PDF ainda carregando. Aguarde um instante...', 'warning');
      return false;
    }
    return true;
  },

  /**
   * Helper para baixar um DataURL como arquivo
   */
  downloadDataUrl(dataUrl, fileName) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /* ==========================================================================
     1. RECIBO FINANCEIRO (FORMATO CUPOM TÉRMICO 80MM / SALMÃO)
     ========================================================================== */

  /**
   * Gera e faz o download direto do Recibo em PDF com tamanho exato de 80mm (sem quebra de página)
   */
  async exportReceiptPDF(item) {
    if (!this.ensureReady()) return;
    if (!item) return;

    App.showToast('Gerando Recibo em PDF (80mm)...', 'info');

    const ticketEl = document.querySelector('#receipt-print-area .receipt-salmon-ticket');
    if (!ticketEl) {
      App.showToast('Erro: Conteúdo do recibo não encontrado.', 'error');
      return;
    }

    try {
      // Clona o elemento para renderizar com precisão e largura fixa de cupom
      const clone = ticketEl.cloneNode(true);
      clone.style.width = '380px';
      clone.style.maxWidth = '380px';
      clone.style.margin = '0';
      clone.style.boxShadow = 'none';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 3, // Ultra alta resolução (300 DPI)
        useCORS: true,
        backgroundColor: '#fdeee7',
        logging: false
      });

      document.body.removeChild(clone);

      // Dimensões do PDF: Largura fixa padrão 80mm e Altura proporcional
      const pdfWidthMm = 80;
      const pdfHeightMm = (canvas.height * pdfWidthMm) / canvas.width;

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidthMm, pdfHeightMm]
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm, undefined, 'FAST');

      const dateStr = item.data ? item.data.replace(/-/g, '') : '';
      const safeId = (item.id || 'RECIBO').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `Recibo_${safeId}_${dateStr}.pdf`;

      pdf.save(fileName);
      App.showToast(`Recibo em PDF baixado com sucesso! (${fileName})`, 'success');
    } catch (err) {
      console.error('Erro ao gerar PDF do recibo:', err);
      App.showToast('Erro ao gerar PDF do recibo: ' + err.message, 'error');
    }
  },

  /**
   * Gera e faz o download direto do Recibo em formato de Imagem (PNG)
   */
  async exportReceiptPNG(item) {
    if (!this.ensureReady()) return;
    if (!item) return;

    App.showToast('Gerando Imagem do Recibo (PNG)...', 'info');

    const ticketEl = document.querySelector('#receipt-print-area .receipt-salmon-ticket');
    if (!ticketEl) {
      App.showToast('Erro: Conteúdo do recibo não encontrado.', 'error');
      return;
    }

    try {
      const clone = ticketEl.cloneNode(true);
      clone.style.width = '420px';
      clone.style.maxWidth = '420px';
      clone.style.margin = '0';
      clone.style.boxShadow = 'none';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#fdeee7',
        logging: false
      });

      document.body.removeChild(clone);

      const dateStr = item.data ? item.data.replace(/-/g, '') : '';
      const safeId = (item.id || 'RECIBO').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `Recibo_${safeId}_${dateStr}.png`;

      this.downloadDataUrl(canvas.toDataURL('image/png'), fileName);
      App.showToast('Imagem do recibo baixada com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao gerar PNG do recibo:', err);
      App.showToast('Erro ao gerar imagem: ' + err.message, 'error');
    }
  },

  /**
   * Compartilha o Recibo via Web Share API (celular/WhatsApp) ou copia link/resumo
   */
  async shareReceipt(item) {
    if (!item) return;

    const isEntrada = Number(item.valor) >= 0;
    const formattedValor = Dashboard.formatCurrency(Math.abs(item.valor));
    const formattedDate = item.data ? item.data.split('-').reverse().join('/') : '';
    const hash = 'PV-' + Math.abs(item.id.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0)).toString(36).toUpperCase().padStart(8, '0');

    const shareText = `*PROJETO VIDA - COMPROVANTE FINANCEIRO*\n` +
      `----------------------------------------\n` +
      `📋 *Registro:* ${item.id}\n` +
      `📅 *Data:* ${formattedDate}\n` +
      `🏷️ *Tipo:* ${isEntrada ? 'ENTRADA / DOAÇÃO' : 'SAÍDA / DESPESA'}\n` +
      `💰 *Valor:* ${isEntrada ? '+' : '-'} ${formattedValor}\n` +
      `🏢 *Conta:* ${item.conta || 'BRASIL'}\n` +
      `🎯 *C. Custo:* [${item.cod_ccusto}] ${item.nome_ccusto || State.getCostCenterName(item.cod_ccusto)}\n` +
      `📝 *Descrição:* ${item.descricao || '-'}\n` +
      `👤 *${isEntrada ? 'Doador' : 'Favorecido'}:* ${item.favorecido || 'Não informado'}\n` +
      `🔑 *Autenticação:* ${hash}\n` +
      `----------------------------------------\n` +
      `_Associação Beneficente Projeto Vida - CNPJ 00.000.000/0001-00_`;

    const ticketEl = document.querySelector('#receipt-print-area .receipt-salmon-ticket');

    // Tenta compartilhar com arquivo PNG caso a Web Share API suporte arquivos
    if (navigator.canShare && ticketEl && this.isReady()) {
      try {
        const clone = ticketEl.cloneNode(true);
        clone.style.width = '420px';
        clone.style.maxWidth = '420px';
        clone.style.margin = '0';
        clone.style.boxShadow = 'none';
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, { scale: 2.5, backgroundColor: '#fdeee7' });
        document.body.removeChild(clone);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], `Recibo_${item.id}.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Recibo Projeto Vida',
            text: shareText,
            files: [file]
          });
          App.showToast('Recibo compartilhado com sucesso!', 'success');
          return;
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Fallback para compartilhamento de texto após erro:', err);
        } else {
          return; // Usuário cancelou a janela de compartilhamento
        }
      }
    }

    // Fallback: Compartilhar via WhatsApp Web / App direto
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    
    // Tenta copiar para área de transferência
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        App.showToast('Dados do recibo copiados! Abrindo WhatsApp...', 'success');
      }
    } catch (e) {
      // Ignora erro de clipboard se bloqueado
    }

    window.open(whatsappUrl, '_blank');
  },

  /* ==========================================================================
     2. EXTRATO / RELATÓRIO DE LANÇAMENTOS (FORMATO A4 PROFISSIONAL)
     ========================================================================== */

  /**
   * Exporta a listagem atual de lançamentos filtrados para um documento PDF A4 completo
   */
  async exportTransactionsPDF() {
    if (!this.ensureReady()) return;

    const list = State.getFilteredTransactions();
    if (list.length === 0) {
      App.showToast('Nenhum lançamento encontrado para exportar.', 'warning');
      return;
    }

    App.showToast(`Gerando Extrato em PDF (${list.length} lançamentos)...`, 'info');

    // Totais calculados
    let totalEntradas = 0;
    let totalSaidas = 0;
    list.forEach(t => {
      const v = Number(t.valor) || 0;
      if (v >= 0) totalEntradas += v;
      else totalSaidas += Math.abs(v);
    });
    const saldoLiquido = totalEntradas - totalSaidas;

    // Filtros aplicados
    const fYear = document.getElementById('filter-year') ? document.getElementById('filter-year').value : '2026';
    const fMonth = document.getElementById('filter-month') ? document.getElementById('filter-month').value : 'todos';
    const dStart = document.getElementById('filter-date-start') ? document.getElementById('filter-date-start').value : '';
    const dEnd = document.getElementById('filter-date-end') ? document.getElementById('filter-date-end').value : '';

    let periodoDesc = '';
    if (dStart || dEnd) {
      periodoDesc = `De ${dStart ? dStart.split('-').reverse().join('/') : 'Início'} até ${dEnd ? dEnd.split('-').reverse().join('/') : 'Hoje'}`;
    } else {
      const monthNames = {
        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
        '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
        '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
        'todos': 'Ano Completo'
      };
      periodoDesc = `${monthNames[fMonth] || fMonth} / ${fYear === 'todos' ? 'Todos os Anos' : fYear}`;
    }

    // Cria contêiner temporário estilizado para renderização A4
    const container = document.createElement('div');
    container.className = 'pdf-a4-document';
    container.style.width = '900px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.padding = '30px';
    container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";

    container.innerHTML = `
      <!-- CABEÇALHO INSTITUCIONAL -->
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: #0284c7; color: white; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">🌱</div>
            <div>
              <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">PROJETO VIDA - ASSOCIAÇÃO BENEFICENTE</h1>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">CNPJ: 00.000.000/0001-00 | Gestão Financeira & Transparência</div>
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; font-weight: 700; color: #0284c7;">EXTRATO DE LANÇAMENTOS</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Período: <strong>${periodoDesc}</strong></div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Emissão: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </div>

      <!-- CARDS DE RESUMO FINANCEIRO -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600;">Entradas (+)</div>
          <div style="font-size: 15px; font-weight: 800; color: #16a34a; font-family: monospace; margin-top: 2px;">+ ${Dashboard.formatCurrency(totalEntradas)}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600;">Saídas (-)</div>
          <div style="font-size: 15px; font-weight: 800; color: #dc2626; font-family: monospace; margin-top: 2px;">- ${Dashboard.formatCurrency(totalSaidas)}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600;">Resultado Líquido (=)</div>
          <div style="font-size: 15px; font-weight: 800; color: ${saldoLiquido >= 0 ? '#16a34a' : '#dc2626'}; font-family: monospace; margin-top: 2px;">${Dashboard.formatCurrency(saldoLiquido)}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600;">Qtd. Lançamentos</div>
          <div style="font-size: 15px; font-weight: 800; color: #0284c7; font-family: monospace; margin-top: 2px;">${list.length} itens</div>
        </div>
      </div>

      <!-- TABELA DE LANÇAMENTOS -->
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; line-height: 1.3;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #334155; text-align: left;">
            <th style="padding: 8px 6px; width: 75px;">DATA</th>
            <th style="padding: 8px 6px; width: 60px;">TIPO</th>
            <th style="padding: 8px 6px; width: 65px;">ID</th>
            <th style="padding: 8px 6px;">DESCRIÇÃO / FAVORECIDO</th>
            <th style="padding: 8px 6px; width: 140px;">CENTRO DE CUSTO</th>
            <th style="padding: 8px 6px; width: 70px;">CONTA</th>
            <th style="padding: 8px 6px; text-align: right; width: 100px;">VALOR (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((t, idx) => {
            const isEnt = Number(t.valor) >= 0;
            const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            const fDate = t.data ? t.data.split('-').reverse().join('/') : '-';
            const fVal = Dashboard.formatCurrency(Math.abs(t.valor));
            return `
              <tr style="background: ${bgRow}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px; font-family: monospace; font-weight: 600; color: #1e293b;">${fDate}</td>
                <td style="padding: 6px;">
                  <span style="display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; background: ${isEnt ? '#dcfce7' : '#fee2e2'}; color: ${isEnt ? '#15803d' : '#b91c1c'};">
                    ${isEnt ? 'ENTRADA' : 'SAÍDA'}
                  </span>
                </td>
                <td style="padding: 6px; font-family: monospace; color: #64748b;">${t.id || '-'}</td>
                <td style="padding: 6px;">
                  <div style="font-weight: 600; color: #0f172a;">${escapeHtml(t.descricao || '-')}</div>
                  ${t.favorecido ? `<div style="color: #64748b; font-size: 9.5px;">Fav: ${escapeHtml(t.favorecido)}</div>` : ''}
                </td>
                <td style="padding: 6px; color: #334155;">
                  <span style="font-family: monospace; font-weight: 700; color: #0284c7;">[${t.cod_ccusto || '-'}]</span> ${escapeHtml(t.nome_ccusto || State.getCostCenterName(t.cod_ccusto))}
                </td>
                <td style="padding: 6px; font-size: 9.5px; color: #475569;">${escapeHtml(t.conta || 'BRASIL')}</td>
                <td style="padding: 6px; text-align: right; font-family: monospace; font-weight: 700; color: ${isEnt ? '#15803d' : '#b91c1c'};">
                  ${isEnt ? '+' : '-'} ${fVal}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: bold; font-size: 11px;">
            <td colspan="4" style="padding: 10px 6px;">TOTAL GERAL DO EXTRATO (${list.length} LANÇAMENTOS)</td>
            <td style="padding: 10px 6px; color: #15803d;">+ ${Dashboard.formatCurrency(totalEntradas)}</td>
            <td style="padding: 10px 6px; color: #b91c1c;">- ${Dashboard.formatCurrency(totalSaidas)}</td>
            <td style="padding: 10px 6px; text-align: right; font-family: monospace; font-size: 12px; color: ${saldoLiquido >= 0 ? '#15803d' : '#b91c1c'};">
              ${Dashboard.formatCurrency(saldoLiquido)}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- RODAPÉ DE AUTENTICAÇÃO -->
      <div style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
        <div>Relatório gerado automaticamente pelo Sistema de Gestão Financeira Projeto Vida.</div>
        <div>Código de Autenticação: <strong>PV-REP-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}</strong></div>
      </div>
    `;

    document.body.appendChild(container);

    try {
      await this.convertHtmlToA4Pdf(container, `Extrato_Lancamentos_ProjetoVida_${new Date().toISOString().substring(0, 10)}.pdf`);
      App.showToast('Extrato em PDF gerado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao gerar PDF do extrato:', err);
      App.showToast('Erro ao exportar PDF: ' + err.message, 'error');
    } finally {
      document.body.removeChild(container);
    }
  },

  /* ==========================================================================
     3. DRE & RELATÓRIOS GERENCIAIS (A4 EXECUTIVO - ALTO CONTRASTE)
     ========================================================================== */

  /**
   * Exporta o relatório ativo (DRE, CCUSTO ou CONCILIAÇÃO) para PDF A4 com alto contraste e clareza
   */
  async exportReportPDF(reportType) {
    if (!this.ensureReady()) return;

    const year = document.getElementById('report-year') ? document.getElementById('report-year').value : '2026';
    const month = document.getElementById('report-month') ? document.getElementById('report-month').value : 'todos';
    const periodoStr = Reports.getPeriodLabel(year, month);
    const txs = Reports.getPeriodTransactions(year, month);

    App.showToast(`Gerando PDF do Relatório (${reportType.toUpperCase()})...`, 'info');

    // Cria contêiner temporário dedicado para renderização A4 sem interferência de estilos de tema escuro
    const container = document.createElement('div');
    container.className = 'pdf-a4-document';
    container.style.width = '900px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.padding = '30px';
    container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";

    if (reportType === 'dre') {
      container.innerHTML = this.buildDREPrintHtml(year, month, periodoStr, txs);
    } else if (reportType === 'ccusto') {
      container.innerHTML = this.buildCostCenterPrintHtml(year, month, periodoStr, txs);
    } else {
      container.innerHTML = this.buildConciliationPrintHtml(year, month, periodoStr, txs);
    }

    document.body.appendChild(container);

    try {
      const fileName = `Relatorio_${reportType.toUpperCase()}_ProjetoVida_${new Date().toISOString().substring(0, 10)}.pdf`;
      await this.convertHtmlToA4Pdf(container, fileName);
      App.showToast(`Relatório PDF gerado com sucesso! (${fileName})`, 'success');
    } catch (err) {
      console.error('Erro ao exportar relatório para PDF:', err);
      App.showToast('Erro ao gerar relatório em PDF: ' + err.message, 'error');
    } finally {
      document.body.removeChild(container);
    }
  },

  /**
   * Constrói o HTML de alto contraste para o DRE em PDF
   */
  buildDREPrintHtml(year, month, periodoStr, txs) {
    const ccMap = {};
    txs.forEach(t => {
      const cod = String(t.cod_ccusto || 'OUTROS');
      const val = Number(t.valor) || 0;
      ccMap[cod] = (ccMap[cod] || 0) + val;
    });

    const receitaBruta = ccMap['500'] || 0;
    const receitasEventos = ccMap['651'] || 0;
    const totalReceitas = receitaBruta + receitasEventos;

    const impostos = Math.abs(ccMap['600'] || 0);
    const receitaLiquida = totalReceitas - impostos;

    const folhaPagamento = Math.abs(ccMap['510'] || 0);
    const aluguelAguaLuz = Math.abs(ccMap['519'] || 0);
    const despOperAdm = Math.abs(ccMap['520'] || 0);
    const despDiversas = Math.abs(ccMap['561'] || 0);
    const despEventos = Math.abs(ccMap['562'] || 0);
    const despFinanceiras = Math.abs(ccMap['560'] || 0);
    const receitasFinanceiras = ccMap['610'] || 0;
    const proLaboreAjuda = Math.abs(ccMap['540'] || 0);

    const totalDespesasOperacionais = folhaPagamento + aluguelAguaLuz + despOperAdm + despDiversas + despEventos + despFinanceiras + proLaboreAjuda;
    const lucroOperacional = receitaLiquida - totalDespesasOperacionais + receitasFinanceiras;

    const obraSedeNova = Math.abs(ccMap['650'] || 0);
    const imobilizado = Math.abs(ccMap['640'] || 0);
    const titCapitalizacao = Math.abs(ccMap['630'] || 0);
    const totalInvestimentos = obraSedeNova + imobilizado + titCapitalizacao;

    const resultadoLiquidoPeriodo = lucroOperacional - totalInvestimentos;

    const format = (v) => Dashboard.formatCurrency(Math.abs(v));
    const calcPct = (v) => totalReceitas > 0 ? ((v / totalReceitas) * 100).toFixed(1) + '%' : '-';

    return `
      <!-- CABEÇALHO INSTITUCIONAL -->
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: #0284c7; color: white; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">🌱</div>
            <div>
              <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">PROJETO VIDA - ASSOCIAÇÃO BENEFICENTE</h1>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">CNPJ: 00.000.000/0001-00 | Transparência & Prestação de Contas</div>
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; font-weight: 800; color: #0284c7;">DEMONSTRAÇÃO DO RESULTADO (DRE)</div>
          <div style="font-size: 11px; color: #334155; margin-top: 2px;">Período: <strong>${periodoStr}</strong></div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Emissão: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </div>

      <!-- CARDS DE RESUMO EXECUTIVO -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 10.5px; text-transform: uppercase; color: #475569; font-weight: 700;">(+) Receita Total</div>
          <div style="font-size: 16px; font-weight: 800; color: #15803d; font-family: monospace; margin-top: 2px;">+ ${Dashboard.formatCurrency(totalReceitas)}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 10.5px; text-transform: uppercase; color: #475569; font-weight: 700;">(-) Despesas Operacionais</div>
          <div style="font-size: 16px; font-weight: 800; color: #b91c1c; font-family: monospace; margin-top: 2px;">- ${Dashboard.formatCurrency(totalDespesasOperacionais)}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 10.5px; text-transform: uppercase; color: #475569; font-weight: 700;">(=) Resultado do Período</div>
          <div style="font-size: 16px; font-weight: 800; color: ${resultadoLiquidoPeriodo >= 0 ? '#15803d' : '#b91c1c'}; font-family: monospace; margin-top: 2px;">
            ${resultadoLiquidoPeriodo >= 0 ? '+' : '-'} ${Dashboard.formatCurrency(Math.abs(resultadoLiquidoPeriodo))}
          </div>
        </div>
      </div>

      <!-- TABELA DRE DE ALTO CONTRASTE -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.35; color: #0f172a;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 2px solid #334155; color: #0f172a; text-align: left;">
            <th style="padding: 9px 8px; font-weight: 800; letter-spacing: 0.5px;">CONTA / ESTRUTURA DRE</th>
            <th style="padding: 9px 8px; text-align: right; width: 170px; font-weight: 800;">VALOR (R$)</th>
            <th style="padding: 9px 8px; text-align: right; width: 105px; font-weight: 800;">% DA RECEITA</th>
          </tr>
        </thead>
        <tbody>
          <!-- 1. RECEITAS -->
          <tr style="background: #f8fafc; border-left: 4px solid #16a34a; border-bottom: 1px solid #e2e8f0; font-weight: 800;">
            <td style="padding: 8px 8px; color: #0f172a;">(+) RECEITA BRUTA</td>
            <td style="padding: 8px 8px; text-align: right; font-family: monospace; color: #15803d;">+ ${format(totalReceitas)}</td>
            <td style="padding: 8px 8px; text-align: right; font-family: monospace; color: #334155;">100.0%</td>
          </tr>
          <tr style="background: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ [500] Doações e Subvenções</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #15803d; font-weight: 600;">+ ${format(receitaBruta)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(receitaBruta)}</td>
          </tr>
          ${receitasEventos > 0 ? `
          <tr style="background: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ [651] Patrocínios / Vendas de Eventos</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #15803d; font-weight: 600;">+ ${format(receitasEventos)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(receitasEventos)}</td>
          </tr>` : ''}
          <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ (-) [600] Impostos e Taxas Bancárias</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">- ${format(impostos)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(impostos)}</td>
          </tr>

          <!-- SUBTOTAL: RECEITA LÍQUIDA -->
          <tr style="background: #f1f5f9; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; font-weight: 800;">
            <td style="padding: 8px 8px; color: #0f172a;">(=) RECEITA LÍQUIDA</td>
            <td style="padding: 8px 8px; text-align: right; font-family: monospace; font-size: 12px; color: #15803d;">+ ${format(receitaLiquida)}</td>
            <td style="padding: 8px 8px; text-align: right; font-family: monospace; color: #334155;">${calcPct(receitaLiquida)}</td>
          </tr>

          <!-- 2. CUSTOS E DESPESAS OPERACIONAIS -->
          <tr style="background: #f8fafc; border-left: 4px solid #d97706; border-top: 8px solid #ffffff; border-bottom: 1px solid #e2e8f0; font-weight: 800;">
            <td colspan="3" style="padding: 8px 8px; color: #0f172a;">(-) CUSTOS E DESPESAS OPERACIONAIS</td>
          </tr>
          <tr style="background: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ [510] Folha de Pagamento, Encargos e Prestadores de Serviços</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">- ${format(folhaPagamento)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(folhaPagamento)}</td>
          </tr>
          <tr style="background: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ [519] Aluguel, DAE (Água), CPFL (Luz) e Telefonia</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">- ${format(aluguelAguaLuz)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(aluguelAguaLuz)}</td>
          </tr>
          <tr style="background: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ [520] Despesas Administrativas e Operacionais</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">- ${format(despOperAdm)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(despOperAdm)}</td>
          </tr>
          <tr style="background: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ [540] Ajuda de Custo e Pro-Labore</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">- ${format(proLaboreAjuda)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(proLaboreAjuda)}</td>
          </tr>
          <tr style="background: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ [560] Despesas Financeiras e Tarifas de Manutenção</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">- ${format(despFinanceiras)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(despFinanceiras)}</td>
          </tr>
          ${despDiversas > 0 ? `
          <tr style="background: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ [561] Despesas Diversas</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">- ${format(despDiversas)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(despDiversas)}</td>
          </tr>` : ''}
          <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ (+) [610] Receitas de Aplicação Financeira (Juros / CDB)</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #15803d; font-weight: 600;">+ ${format(receitasFinanceiras)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(receitasFinanceiras)}</td>
          </tr>

          <!-- SUBTOTAL: RESULTADO OPERACIONAL LÍQUIDO -->
          <tr style="background: #f1f5f9; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; font-weight: 800;">
            <td style="padding: 8px 8px; color: #0f172a;">(=) RESULTADO OPERACIONAL LÍQUIDO</td>
            <td style="padding: 8px 8px; text-align: right; font-family: monospace; font-size: 12px; color: ${lucroOperacional >= 0 ? '#15803d' : '#b91c1c'};">
              ${lucroOperacional >= 0 ? '+' : '-'} ${format(lucroOperacional)}
            </td>
            <td style="padding: 8px 8px; text-align: right; font-family: monospace; color: #334155;">${calcPct(lucroOperacional)}</td>
          </tr>

          <!-- 3. INVESTIMENTOS PATRIMONIAIS & OBRAS -->
          <tr style="background: #f8fafc; border-left: 4px solid #4338ca; border-top: 8px solid #ffffff; border-bottom: 1px solid #e2e8f0; font-weight: 800;">
            <td colspan="3" style="padding: 8px 8px; color: #0f172a;">(-) INVESTIMENTOS PATRIMONIAIS & OBRAS</td>
          </tr>
          <tr style="background: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ [650] Construção / Obras Nova Sede (Materiais, Maquinário, Empreiteiro)</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">- ${format(obraSedeNova)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(obraSedeNova)}</td>
          </tr>
          ${imobilizado > 0 ? `
          <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 8px 6px 20px; color: #1e293b;">↳ [640] Bens Imobilizados e Equipamentos</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">- ${format(imobilizado)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #475569;">${calcPct(imobilizado)}</td>
          </tr>` : ''}

          <!-- RESULTADO FINAL CONSOLIDADO -->
          <tr style="background: #f8fafc; border: 2px solid #0284c7; font-weight: 900;">
            <td style="padding: 11px 10px; font-size: 12.5px; color: #0f172a; text-transform: uppercase;">(=) RESULTADO CONSOLIDADO DO PERÍODO</td>
            <td style="padding: 11px 10px; text-align: right; font-family: monospace; font-size: 15px; font-weight: 900; color: ${resultadoLiquidoPeriodo >= 0 ? '#15803d' : '#b91c1c'};">
              ${resultadoLiquidoPeriodo >= 0 ? '+' : '-'} ${format(resultadoLiquidoPeriodo)}
            </td>
            <td style="padding: 11px 10px; text-align: right; font-family: monospace; font-size: 12px; font-weight: 800; color: #0f172a;">
              ${calcPct(resultadoLiquidoPeriodo)}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- RODAPÉ DE AUTENTICAÇÃO -->
      <div style="margin-top: 22px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
        <div>Relatório DRE extraído da base contábil oficial - Projeto Vida ONG.</div>
        <div>Autenticação do Relatório: <strong>PV-DRE-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}</strong></div>
      </div>
    `;
  },

  /**
   * Constrói o HTML de alto contraste para o Relatório por Centro de Custo em PDF
   */
  buildCostCenterPrintHtml(year, month, periodoStr, txs) {
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
      if (v >= 0) ccMap[cod].entradas += v;
      else ccMap[cod].saidas += Math.abs(v);
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

    return `
      <!-- CABEÇALHO INSTITUCIONAL -->
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: #0284c7; color: white; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">🌱</div>
            <div>
              <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">PROJETO VIDA - ASSOCIAÇÃO BENEFICENTE</h1>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">CNPJ: 00.000.000/0001-00 | Transparência & Prestação de Contas</div>
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; font-weight: 800; color: #0284c7;">LANÇAMENTOS POR CENTRO DE CUSTO</div>
          <div style="font-size: 11px; color: #334155; margin-top: 2px;">Período: <strong>${periodoStr}</strong></div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Emissão: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </div>

      <!-- CARDS DE RESUMO -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 10.5px; text-transform: uppercase; color: #475569; font-weight: 700;">Entradas Totais</div>
          <div style="font-size: 16px; font-weight: 800; color: #15803d; font-family: monospace; margin-top: 2px;">+ ${Dashboard.formatCurrency(totalEnt)}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 10.5px; text-transform: uppercase; color: #475569; font-weight: 700;">Saídas Totais</div>
          <div style="font-size: 16px; font-weight: 800; color: #b91c1c; font-family: monospace; margin-top: 2px;">- ${Dashboard.formatCurrency(totalSai)}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 10.5px; text-transform: uppercase; color: #475569; font-weight: 700;">Saldo Líquido Consolidado</div>
          <div style="font-size: 16px; font-weight: 800; color: ${totalSaldo >= 0 ? '#15803d' : '#b91c1c'}; font-family: monospace; margin-top: 2px;">
            ${Dashboard.formatCurrency(totalSaldo)}
          </div>
        </div>
      </div>

      <!-- TABELA CENTROS DE CUSTO -->
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; line-height: 1.35; color: #0f172a;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 2px solid #334155; color: #0f172a; text-align: left;">
            <th style="padding: 8px 6px; width: 55px; font-weight: 800;">CÓD</th>
            <th style="padding: 8px 6px; font-weight: 800;">CENTRO DE CUSTO</th>
            <th style="padding: 8px 6px; width: 45px; font-weight: 800;">NAT.</th>
            <th style="padding: 8px 6px; width: 140px; font-weight: 800;">CATEGORIA DRE</th>
            <th style="padding: 8px 6px; text-align: center; width: 45px; font-weight: 800;">QTD</th>
            <th style="padding: 8px 6px; text-align: right; width: 110px; font-weight: 800;">ENTRADAS (R$)</th>
            <th style="padding: 8px 6px; text-align: right; width: 110px; font-weight: 800;">SAÍDAS (R$)</th>
            <th style="padding: 8px 6px; text-align: right; width: 120px; font-weight: 800;">SALDO LÍQUIDO (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, idx) => {
            const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            return `
              <tr style="background: ${bgRow}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px; font-family: monospace; font-weight: 800; color: #0284c7;">[${r.codigo}]</td>
                <td style="padding: 6px; font-weight: 600; color: #0f172a;">${escapeHtml(r.nome)}</td>
                <td style="padding: 6px; color: #475569; font-weight: 600;">${r.natureza}</td>
                <td style="padding: 6px; color: #475569;">${escapeHtml(r.categoriaDRE)}</td>
                <td style="padding: 6px; text-align: center; font-family: monospace; color: #334155; font-weight: 600;">${r.qtd}</td>
                <td style="padding: 6px; text-align: right; font-family: monospace; color: #15803d; font-weight: 600;">${r.entradas > 0 ? Dashboard.formatCurrency(r.entradas) : '-'}</td>
                <td style="padding: 6px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">${r.saidas > 0 ? Dashboard.formatCurrency(r.saidas) : '-'}</td>
                <td style="padding: 6px; text-align: right; font-family: monospace; font-weight: 800; color: ${r.saldo >= 0 ? '#15803d' : '#b91c1c'};">
                  ${Dashboard.formatCurrency(r.saldo)}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f1f5f9; border-top: 2px solid #334155; font-weight: 900; font-size: 11px;">
            <td colspan="4" style="padding: 10px 6px;">TOTAL GERAL CONSOLIDADO</td>
            <td style="padding: 10px 6px; text-align: center; font-family: monospace;">${txs.length}</td>
            <td style="padding: 10px 6px; text-align: right; font-family: monospace; color: #15803d;">${Dashboard.formatCurrency(totalEnt)}</td>
            <td style="padding: 10px 6px; text-align: right; font-family: monospace; color: #b91c1c;">${Dashboard.formatCurrency(totalSai)}</td>
            <td style="padding: 10px 6px; text-align: right; font-family: monospace; color: ${totalSaldo >= 0 ? '#15803d' : '#b91c1c'};">
              ${Dashboard.formatCurrency(totalSaldo)}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- RODAPÉ DE AUTENTICAÇÃO -->
      <div style="margin-top: 22px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
        <div>Relatório analítico por Centro de Custo - Projeto Vida ONG.</div>
        <div>Código de Autenticação: <strong>PV-CC-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}</strong></div>
      </div>
    `;
  },

  /**
   * Constrói o HTML de alto contraste para o Relatório de Conciliação Bancária em PDF
   */
  buildConciliationPrintHtml(year, month, periodoStr, txs) {
    let ent = 0, sai = 0;
    txs.forEach(t => {
      const v = Number(t.valor) || 0;
      if (v >= 0) ent += v;
      else sai += Math.abs(v);
    });

    const saldoGeral = State.getGeneralBalance();

    return `
      <!-- CABEÇALHO INSTITUCIONAL -->
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: #0284c7; color: white; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">🌱</div>
            <div>
              <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">PROJETO VIDA - ASSOCIAÇÃO BENEFICENTE</h1>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">CNPJ: 00.000.000/0001-00 | Transparência & Prestação de Contas</div>
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; font-weight: 800; color: #0284c7;">CONCILIAÇÃO BANCÁRIA E SALDOS</div>
          <div style="font-size: 11px; color: #334155; margin-top: 2px;">Período: <strong>${periodoStr}</strong></div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Emissão: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </div>

      <!-- CARDS DE RESUMO -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 10.5px; text-transform: uppercase; color: #475569; font-weight: 700;">Total de Entradas</div>
          <div style="font-size: 16px; font-weight: 800; color: #15803d; font-family: monospace; margin-top: 2px;">+ ${Dashboard.formatCurrency(ent)}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 10.5px; text-transform: uppercase; color: #475569; font-weight: 700;">Total de Saídas</div>
          <div style="font-size: 16px; font-weight: 800; color: #b91c1c; font-family: monospace; margin-top: 2px;">- ${Dashboard.formatCurrency(sai)}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 10.5px; text-transform: uppercase; color: #475569; font-weight: 700;">Saldo Consolidado Geral</div>
          <div style="font-size: 16px; font-weight: 800; color: #0284c7; font-family: monospace; margin-top: 2px;">${Dashboard.formatCurrency(saldoGeral)}</div>
        </div>
      </div>

      <!-- TABELA DE CONTAS E SALDOS -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.35; color: #0f172a;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 2px solid #334155; color: #0f172a; text-align: left;">
            <th style="padding: 9px 8px; font-weight: 800;">CONTA / CAIXA</th>
            <th style="padding: 9px 8px; width: 140px; font-weight: 800;">TIPO</th>
            <th style="padding: 9px 8px; text-align: right; width: 160px; font-weight: 800;">SALDO INICIAL</th>
            <th style="padding: 9px 8px; text-align: right; width: 180px; font-weight: 800;">MOVIMENTAÇÕES (+ / -)</th>
            <th style="padding: 9px 8px; text-align: right; width: 180px; font-weight: 800;">SALDO ATUAL</th>
          </tr>
        </thead>
        <tbody>
          ${State.accounts.map((acc, idx) => {
            const accTxs = txs.filter(t => t.conta.toLowerCase() === acc.nome.toLowerCase());
            let delta = 0;
            accTxs.forEach(t => delta += Number(t.valor) || 0);
            const saldoFinal = Number(acc.saldoInicial || 0) + delta;
            const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

            return `
              <tr style="background: ${bgRow}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; font-weight: 700; color: #0f172a;">${escapeHtml(acc.nome)}</td>
                <td style="padding: 8px; color: #475569; font-weight: 600;">${escapeHtml(acc.tipo)}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace; color: #334155;">${Dashboard.formatCurrency(acc.saldoInicial)}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: ${delta >= 0 ? '#15803d' : '#b91c1c'};">
                  ${delta >= 0 ? '+' : ''} ${Dashboard.formatCurrency(delta)}
                </td>
                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 800; font-size: 12px; color: #0f172a;">
                  ${Dashboard.formatCurrency(saldoFinal)}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <!-- RODAPÉ DE AUTENTICAÇÃO -->
      <div style="margin-top: 22px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
        <div>Posição e Conciliação Financeira das Contas - Projeto Vida ONG.</div>
        <div>Código de Autenticação: <strong>PV-BANCO-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}</strong></div>
      </div>
    `;
  },

  /* ==========================================================================
     4. MOTOR DE PAGINAÇÃO E CONVERSÃO HTML -> PDF A4
     ========================================================================== */

  /**
   * Converte um elemento HTML em um PDF A4 paginado de alta fidelidade
   */
  async convertHtmlToA4Pdf(element, fileName) {
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const printWidth = pageWidth - (margin * 2);
    const printHeight = pageHeight - (margin * 2);

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const totalPdfHeight = (imgHeight * printWidth) / imgWidth;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    let heightLeft = totalPdfHeight;
    let position = margin;
    let page = 1;

    // Primeira página
    pdf.addImage(imgData, 'JPEG', margin, position, printWidth, totalPdfHeight, undefined, 'FAST');
    heightLeft -= printHeight;

    // Adiciona páginas subsequentes se o conteúdo exceder 1 página A4
    while (heightLeft > 0) {
      position = position - printHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, printWidth, totalPdfHeight, undefined, 'FAST');
      heightLeft -= printHeight;
      page++;
    }

    pdf.save(fileName);
  }
};

window.PdfService = PdfService;
