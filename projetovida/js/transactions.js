/**
 * TRANSACTIONS VIEW CONTROLLER - PROJETO VIDA WEBAPP
 * Gerencia a listagem completa, modais de inclusão/edição/exclusão,
 * máscaras de entrada monetária, autocompletes, recibos e exportações.
 */

const Transactions = {
  currentEditingId: null,

  init() {
    State.subscribe('data:loaded', () => this.render());
    State.subscribe('filter:changed', () => this.render());
    State.subscribe('pagination:changed', () => this.render());

    this.bindEvents();
  },

  bindEvents() {
    // Busca em tempo real com debounce
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          State.setFilter('search', e.target.value);
        }, 250);
      });
    }

    // Selects e inputs de filtros
    const bindFilter = (elementId, filterKey) => {
      const el = document.getElementById(elementId);
      if (el) {
        el.addEventListener('change', (e) => State.setFilter(filterKey, e.target.value));
      }
    };

    bindFilter('filter-year', 'year');
    bindFilter('filter-month', 'month');
    bindFilter('filter-type', 'type');
    bindFilter('filter-ccusto', 'costCenter');
    bindFilter('filter-account', 'account');
    bindFilter('filter-date-start', 'dateStart');
    bindFilter('filter-date-end', 'dateEnd');

    // Formulário de Transação
    const form = document.getElementById('transaction-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Máscara de Moeda no campo de valor do formulário
    const valorInput = document.getElementById('tx-valor');
    if (valorInput) {
      valorInput.addEventListener('input', (e) => this.maskCurrencyInput(e.target));
    }

    // Atualização automática da descrição ao mudar Centro de Custo no formulário
    const ccSelect = document.getElementById('tx-ccusto');
    if (ccSelect) {
      ccSelect.addEventListener('change', (e) => {
        const cod = e.target.value;
        const ccName = State.getCostCenterName(cod);
        const nameInput = document.getElementById('tx-nome-ccusto');
        if (nameInput) nameInput.value = ccName;
      });
    }
  },

  /**
   * Limpa todos os filtros ativos
   */
  clearFilters() {
    State.filters = {
      search: '',
      year: 'todos',
      month: 'todos',
      type: 'todos',
      costCenter: 'todos',
      account: 'todos',
      dateStart: '',
      dateEnd: ''
    };

    if (document.getElementById('filter-search')) document.getElementById('filter-search').value = '';
    if (document.getElementById('filter-year')) document.getElementById('filter-year').value = 'todos';
    if (document.getElementById('filter-month')) document.getElementById('filter-month').value = 'todos';
    if (document.getElementById('filter-type')) document.getElementById('filter-type').value = 'todos';
    if (document.getElementById('filter-ccusto')) document.getElementById('filter-ccusto').value = 'todos';
    if (document.getElementById('filter-date-start')) document.getElementById('filter-date-start').value = '';
    if (document.getElementById('filter-date-end')) document.getElementById('filter-date-end').value = '';

    State.notify('filter:changed', State.filters);
    App.showToast('Filtros restaurados.', 'info');
  },

  /**
   * Renderiza a visualização da tela de lançamentos
   */
  render() {
    this.populateFilterDropdowns();
    this.renderTable();
    this.renderPagination();
    this.renderHeaderTotals();
  },

  /**
   * Preenche os selects de Centro de Custo e Contas nos filtros e no formulário
   */
  populateFilterDropdowns() {
    // Filtro de Centro de Custo
    const filterCC = document.getElementById('filter-ccusto');
    if (filterCC && filterCC.options.length <= 1) {
      filterCC.innerHTML = '<option value="todos">Todos os Centros de Custo</option>';
      State.costCenters.forEach(cc => {
        filterCC.innerHTML += `<option value="${cc.codigo}">[${cc.codigo}] ${escapeHtml(cc.nome)}</option>`;
      });
      filterCC.value = State.filters.costCenter;
    }

    // Filtro de Contas
    const filterAcc = document.getElementById('filter-account');
    if (filterAcc && filterAcc.options.length <= 1) {
      filterAcc.innerHTML = '<option value="todos">Todas as Contas</option>';
      State.accounts.forEach(acc => {
        filterAcc.innerHTML += `<option value="${acc.nome}">${escapeHtml(acc.nome)} (${escapeHtml(acc.tipo)})</option>`;
      });
      filterAcc.value = State.filters.account;
    }

    // Selects dentro do Modal de Cadastro
    const modalCC = document.getElementById('tx-ccusto');
    if (modalCC) {
      modalCC.innerHTML = '<option value="">Selecione um Centro de Custo...</option>';
      State.costCenters.forEach(cc => {
        modalCC.innerHTML += `<option value="${cc.codigo}">[${cc.codigo}] ${escapeHtml(cc.nome)}</option>`;
      });
    }

    const modalAcc = document.getElementById('tx-conta');
    if (modalAcc) {
      modalAcc.innerHTML = '';
      State.accounts.forEach(acc => {
        modalAcc.innerHTML += `<option value="${acc.nome}">${escapeHtml(acc.nome)}</option>`;
      });
    }

    // Popula Datalists para Autocomplete inteligente de Histórico
    this.populateAutocompleteDatalists();
  },

  /**
   * Gera datalists para autocomplete rápido de descrições e doadores já utilizados
   */
  populateAutocompleteDatalists() {
    let dlDesc = document.getElementById('dl-descricoes');
    if (!dlDesc) {
      dlDesc = document.createElement('datalist');
      dlDesc.id = 'dl-descricoes';
      document.body.appendChild(dlDesc);
    }
    const descInput = document.getElementById('tx-descricao');
    if (descInput) descInput.setAttribute('list', 'dl-descricoes');

    let dlFav = document.getElementById('dl-favorecidos');
    if (!dlFav) {
      dlFav = document.createElement('datalist');
      dlFav.id = 'dl-favorecidos';
      document.body.appendChild(dlFav);
    }
    const favInput = document.getElementById('tx-favorecido');
    if (favInput) favInput.setAttribute('list', 'dl-favorecidos');

    const descSet = new Set();
    const favSet = new Set();

    State.transactions.forEach(t => {
      if (t.descricao) descSet.add(t.descricao.trim());
      if (t.favorecido) favSet.add(t.favorecido.trim());
    });

    dlDesc.innerHTML = Array.from(descSet).map(d => `<option value="${escapeHtml(d)}">`).join('');
    dlFav.innerHTML = Array.from(favSet).map(f => `<option value="${escapeHtml(f)}">`).join('');
  },

  /**
   * Renderiza a Tabela de Lançamentos
   */
  renderTable() {
    const tbody = document.getElementById('transactions-table-body');
    if (!tbody) return;

    const { items, totalItems } = State.getPaginatedTransactions();

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5 text-muted">
            <i class="fas fa-search fa-2x mb-3 d-block opacity-40"></i>
            <strong>Nenhum lançamento encontrado</strong>
            <p class="small text-muted mb-0">Tente ajustar os filtros ou adicione uma nova entrada/saída.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map(t => {
      const isEntrada = Number(t.valor) >= 0;
      const badgeClass = isEntrada ? 'badge-success' : 'badge-danger';
      const valorClass = isEntrada ? 'text-success' : 'text-danger';
      const formattedDate = t.data ? t.data.split('-').reverse().join('/') : '-';
      const formattedValor = Dashboard.formatCurrency(Math.abs(t.valor));

      return `
        <tr class="align-middle">
          <td>
            <span class="font-mono text-sm font-semibold text-light">${formattedDate}</span>
          </td>
          <td>
            <span class="badge ${badgeClass}">
              <i class="fas ${isEntrada ? 'fa-arrow-down' : 'fa-arrow-up'} mr-1"></i>
              ${isEntrada ? 'Entrada' : 'Saída'}
            </span>
          </td>
          <td>
            <div class="font-medium text-light">${escapeHtml(t.descricao || '-')}</div>
            ${t.favorecido ? `<div class="text-muted small"><i class="far fa-user mr-1"></i> ${escapeHtml(t.favorecido)}</div>` : ''}
          </td>
          <td>
            <span class="badge badge-neutral text-xs">
              <strong class="text-indigo-400 mr-1">[${t.cod_ccusto || '-'}]</strong> ${escapeHtml(t.nome_ccusto || State.getCostCenterName(t.cod_ccusto) || '')}
            </span>
          </td>
          <td>
            <span class="badge badge-outline text-xs">${escapeHtml(t.conta || 'BRASIL')}</span>
          </td>
          <td class="text-right font-mono font-bold ${valorClass}">
            ${isEntrada ? '+' : '-'} ${formattedValor}
          </td>
          <td class="text-right">
            <div class="btn-group-sm">
              <button class="btn btn-icon btn-ghost" title="Imprimir Recibo" onclick="Transactions.openReceiptModal('${t.id}')">
                <i class="fas fa-receipt text-indigo-400"></i>
              </button>
              ${Auth.canEditTransaction(t) ? `
                <button class="btn btn-icon btn-ghost" title="Duplicar" onclick="Transactions.duplicateTransaction('${t.id}')">
                  <i class="far fa-copy"></i>
                </button>
                <button class="btn btn-icon btn-ghost" title="Editar" onclick="Transactions.openEditModal('${t.id}')">
                  <i class="far fa-edit"></i>
                </button>
              ` : ''}
              ${Auth.canDeleteTransaction() ? `
                <button class="btn btn-icon btn-ghost text-danger" title="Excluir (Super Admin)" onclick="Transactions.confirmDelete('${t.id}')">
                  <i class="far fa-trash-alt"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Renderiza a barra de paginação
   */
  renderPagination() {
    const el = document.getElementById('transactions-pagination');
    if (!el) return;

    const { totalPages, currentPage, totalItems } = State.getPaginatedTransactions();

    if (totalItems === 0) {
      el.innerHTML = '';
      return;
    }

    const startItem = (currentPage - 1) * State.pagination.pageSize + 1;
    const endItem = Math.min(currentPage * State.pagination.pageSize, totalItems);

    let html = `
      <div class="pagination-info text-muted small">
        Exibindo <strong>${startItem}</strong> a <strong>${endItem}</strong> de <strong>${totalItems}</strong> lançamentos
      </div>
      <div class="pagination-buttons">
        <button class="btn btn-sm btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="State.setPage(${currentPage - 1})">
          <i class="fas fa-chevron-left"></i> Anterior
        </button>
    `;

    // Renderiza até 5 páginas numéricas
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      html += `
        <button class="btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-ghost'}" onclick="State.setPage(${p})">
          ${p}
        </button>
      `;
    }

    html += `
        <button class="btn btn-sm btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="State.setPage(${currentPage + 1})">
          Próximo <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;

    el.innerHTML = html;
  },

  /**
   * Totais da visualização filtrada
   */
  renderHeaderTotals() {
    const totals = State.getTotals();
    const elEnt = document.getElementById('tx-header-entradas');
    const elSai = document.getElementById('tx-header-saidas');
    const elRes = document.getElementById('tx-header-resultado');

    if (elEnt) elEnt.textContent = Dashboard.formatCurrency(totals.entradas);
    if (elSai) elSai.textContent = Dashboard.formatCurrency(totals.saidas);
    if (elRes) {
      elRes.textContent = Dashboard.formatCurrency(totals.resultado);
      elRes.className = totals.resultado >= 0 ? 'text-success' : 'text-danger';
    }
  },

  /**
   * Abre Modal para Nova Entrada
   */
  openNewEntryModal() {
    this.currentEditingId = null;
    document.getElementById('modal-tx-title').innerHTML = '<i class="fas fa-plus-circle text-success mr-2"></i> Nova Entrada (Receita / Doação)';
    document.getElementById('transaction-form').reset();
    document.getElementById('tx-id').value = '';
    document.getElementById('tx-tipo').value = 'Entrada';
    document.getElementById('tx-data').value = new Date().toISOString().substring(0, 10);
    document.getElementById('tx-conta').value = 'BRASIL';
    document.getElementById('tx-ccusto').value = '500'; // Default Doações
    document.getElementById('tx-nome-ccusto').value = State.getCostCenterName('500');

    this.toggleModal('modal-transaction', true);
  },

  /**
   * Abre Modal para Nova Saída
   */
  openNewExitModal() {
    this.currentEditingId = null;
    document.getElementById('modal-tx-title').innerHTML = '<i class="fas fa-minus-circle text-danger mr-2"></i> Nova Saída (Despesa / Pagamento)';
    document.getElementById('transaction-form').reset();
    document.getElementById('tx-id').value = '';
    document.getElementById('tx-tipo').value = 'Saida';
    document.getElementById('tx-data').value = new Date().toISOString().substring(0, 10);
    document.getElementById('tx-conta').value = 'BRASIL';
    document.getElementById('tx-ccusto').value = '520'; // Default Desp. Oper. Adm
    document.getElementById('tx-nome-ccusto').value = State.getCostCenterName('520');

    this.toggleModal('modal-transaction', true);
  },

  /**
   * Abre Modal para Edição
   */
  openEditModal(id) {
    const item = State.transactions.find(t => t.id === id);
    if (!item) return;

    this.currentEditingId = id;
    document.getElementById('modal-tx-title').innerHTML = `<i class="far fa-edit text-primary mr-2"></i> Editar Lançamento (${id})`;
    document.getElementById('tx-id').value = item.id;
    document.getElementById('tx-tipo').value = item.tipo;
    document.getElementById('tx-data').value = item.data;
    document.getElementById('tx-conta').value = item.conta || 'BRASIL';
    document.getElementById('tx-ccusto').value = item.cod_ccusto || '';
    document.getElementById('tx-nome-ccusto').value = item.nome_ccusto || State.getCostCenterName(item.cod_ccusto);
    document.getElementById('tx-descricao').value = item.descricao || '';
    document.getElementById('tx-favorecido').value = item.favorecido || '';
    document.getElementById('tx-valor').value = this.formatNumberToCurrency(Math.abs(item.valor));
    document.getElementById('tx-comprovante').value = item.comprovanteUrl || '';

    this.toggleModal('modal-transaction', true);
  },

  /**
   * Duplica um lançamento existente para agilizar digitação
   */
  duplicateTransaction(id) {
    const item = State.transactions.find(t => t.id === id);
    if (!item) return;

    this.currentEditingId = null;
    document.getElementById('modal-tx-title').innerHTML = '<i class="far fa-copy text-info mr-2"></i> Duplicar Lançamento';
    document.getElementById('tx-id').value = '';
    document.getElementById('tx-tipo').value = item.tipo;
    document.getElementById('tx-data').value = new Date().toISOString().substring(0, 10);
    document.getElementById('tx-conta').value = item.conta || 'BRASIL';
    document.getElementById('tx-ccusto').value = item.cod_ccusto || '';
    document.getElementById('tx-nome-ccusto').value = item.nome_ccusto || State.getCostCenterName(item.cod_ccusto);
    document.getElementById('tx-descricao').value = item.descricao || '';
    document.getElementById('tx-favorecido').value = item.favorecido || '';
    document.getElementById('tx-valor').value = this.formatNumberToCurrency(Math.abs(item.valor));
    document.getElementById('tx-comprovante').value = '';

    this.toggleModal('modal-transaction', true);
  },

  /**
   * Salva o formulário (Criação ou Edição)
   */
  async handleFormSubmit(e) {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-save-transaction');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';
    }

    try {
      const id = document.getElementById('tx-id').value;
      const rawValor = document.getElementById('tx-valor').value;
      const numValor = this.parseCurrencyToNumber(rawValor);

      if (numValor <= 0) {
        throw new Error('Informe um valor válido maior que zero.');
      }

      const payload = {
        id: id || undefined,
        data: document.getElementById('tx-data').value,
        tipo: document.getElementById('tx-tipo').value,
        conta: document.getElementById('tx-conta').value,
        cod_ccusto: document.getElementById('tx-ccusto').value,
        nome_ccusto: document.getElementById('tx-nome-ccusto').value || State.getCostCenterName(document.getElementById('tx-ccusto').value),
        descricao: document.getElementById('tx-descricao').value.trim(),
        favorecido: document.getElementById('tx-favorecido').value.trim(),
        valor: numValor,
        comprovanteUrl: document.getElementById('tx-comprovante').value.trim()
      };

      const action = id ? 'UPDATE_TRANSACTION' : 'ADD_TRANSACTION';
      const res = await API.request(action, payload);

      if (res.status === 'success') {
        App.showToast(res.message || 'Lançamento salvo com sucesso!', 'success');
        this.toggleModal('modal-transaction', false);
        await State.loadInitialData();
      } else {
        throw new Error(res.message || 'Erro ao salvar lançamento.');
      }
    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fas fa-check mr-1"></i> Salvar Lançamento';
      }
    }
  },

  /**
   * Confirmação de Exclusão
   */
  confirmDelete(id) {
    const item = State.transactions.find(t => t.id === id);
    if (!item) return;

    if (confirm(`Tem certeza que deseja excluir o lançamento "${item.descricao}" no valor de ${Dashboard.formatCurrency(Math.abs(item.valor))}?`)) {
      this.deleteTransaction(id);
    }
  },

  async deleteTransaction(id) {
    try {
      App.showToast('Excluindo lançamento...', 'info');
      const res = await API.request('DELETE_TRANSACTION', { id });
      if (res.status === 'success') {
        App.showToast('Lançamento excluído com sucesso!', 'success');
        await State.loadInitialData();
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      App.showToast('Erro ao excluir: ' + err.message, 'error');
    }
  },

  currentReceiptItem: null,

  /**
   * Modal de Recibo Financeiro (Estilo Cupom Fiscal / Salmão Térmico)
   */
  openReceiptModal(id) {
    const item = State.transactions.find(t => t.id === id);
    if (!item) return;

    this.currentReceiptItem = item;

    const isEntrada = Number(item.valor) >= 0;
    const formattedValor = Dashboard.formatCurrency(Math.abs(item.valor));
    const formattedDate = item.data ? item.data.split('-').reverse().join('/') : '';
    const hash = 'PV-' + Math.abs(id.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0)).toString(36).toUpperCase().padStart(8, '0');

    const elContent = document.getElementById('receipt-print-area');
    if (elContent) {
      elContent.innerHTML = `
        <div class="receipt-salmon-ticket p-4">
          <!-- CABEÇALHO DO TICKET -->
          <div class="ticket-header">
            <div class="ticket-title">PROJETO VIDA - ONG</div>
            <div class="text-xs" style="color: #6c463b !important;">ASSOCIACAO BENEFICENTE E SOCIAL</div>
            <div class="text-xs font-mono" style="color: #6c463b !important;">CNPJ: 00.000.000/0001-00</div>
            <div class="mt-2 text-xs font-bold uppercase tracking-wider">
              *** COMPROVANTE DE MOVIMENTACAO FINANCEIRA ***
            </div>
          </div>

          <!-- DETALHES -->
          <div class="ticket-row">
            <span>REGISTRO</span>
            <span class="ticket-dots"></span>
            <span class="font-bold font-mono">${item.id}</span>
          </div>

          <div class="ticket-row">
            <span>DATA/HORA</span>
            <span class="ticket-dots"></span>
            <span>${formattedDate} 12:00</span>
          </div>

          <div class="ticket-row">
            <span>TIPO</span>
            <span class="ticket-dots"></span>
            <span class="font-bold">${isEntrada ? 'ENTRADA / DOACAO' : 'SAIDA / DESPESA'}</span>
          </div>

          <div class="ticket-row">
            <span>CONTA</span>
            <span class="ticket-dots"></span>
            <span>${escapeHtml(item.conta || 'BRASIL')}</span>
          </div>

          <div class="ticket-row">
            <span>C. CUSTO</span>
            <span class="ticket-dots"></span>
            <span>[${item.cod_ccusto}] ${escapeHtml(item.nome_ccusto || State.getCostCenterName(item.cod_ccusto))}</span>
          </div>

          <div class="ticket-row">
            <span>DESCRICAO</span>
            <span class="ticket-dots"></span>
            <span class="font-bold">${escapeHtml(item.descricao)}</span>
          </div>

          <div class="ticket-row">
            <span>${isEntrada ? 'DOADOR/ORIGEM' : 'FAVORECIDO'}</span>
            <span class="ticket-dots"></span>
            <span>${escapeHtml(item.favorecido || 'NAO INFORMADO')}</span>
          </div>

          <!-- VALOR DESTACADO -->
          <div class="ticket-value-box">
            <div class="text-xs uppercase" style="color: #6c463b !important;">TOTAL DA OPERACAO</div>
            <div class="ticket-value">${isEntrada ? '+ ' : '- '} ${formattedValor}</div>
          </div>

          <!-- CÓDIGO DE BARRAS / AUTENTICAÇÃO -->
          <div class="text-center my-3">
            <div class="text-xs font-mono" style="color: #6c463b !important;">AUTENTICACAO ELETRONICA</div>
            <div class="font-mono font-bold text-sm tracking-widest my-1">${hash}</div>
            <div class="ticket-barcode">|| | ||| | |||| | || | ||| ||</div>
          </div>

          <!-- ASSINATURAS -->
          <div class="ticket-signatures">
            <div class="ticket-sign-line">
              Responsavel ONG
            </div>
            <div class="ticket-sign-line">
              ${isEntrada ? 'Doador / Depositante' : 'Favorecido / Fornecedor'}
            </div>
          </div>
        </div>
      `;
    }

    this.toggleModal('modal-receipt', true);
  },

  /**
   * Baixa o Recibo em PDF no formato térmico de 80mm
   */
  exportReceiptPDF() {
    if (this.currentReceiptItem && typeof PdfService !== 'undefined') {
      PdfService.exportReceiptPDF(this.currentReceiptItem);
    } else {
      App.showToast('Selecione um recibo para exportar.', 'warning');
    }
  },

  /**
   * Baixa o Recibo como imagem PNG de alta resolução
   */
  exportReceiptPNG() {
    if (this.currentReceiptItem && typeof PdfService !== 'undefined') {
      PdfService.exportReceiptPNG(this.currentReceiptItem);
    } else {
      App.showToast('Selecione um recibo para exportar.', 'warning');
    }
  },

  /**
   * Compartilha o Recibo no WhatsApp / WebShare
   */
  shareReceipt() {
    if (this.currentReceiptItem && typeof PdfService !== 'undefined') {
      PdfService.shareReceipt(this.currentReceiptItem);
    } else {
      App.showToast('Selecione um recibo para compartilhar.', 'warning');
    }
  },

  /**
   * Imprime o comprovante salmão
   */
  printReceipt() {
    document.body.classList.add('printing-receipt-mode');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt-mode');
    }, 500);
  },

  /**
   * Exporta a lista filtrada de lançamentos para PDF (Extrato A4)
   */
  exportToPDF() {
    if (typeof PdfService !== 'undefined') {
      PdfService.exportTransactionsPDF();
    } else {
      App.showToast('Serviço de PDF indisponível.', 'error');
    }
  },

  /**
   * Exporta a lista atual para arquivo Excel (.xlsx) nativo com SheetJS
   */
  exportToExcel() {
    if (typeof XLSX === 'undefined') {
      this.exportToCSV();
      return;
    }

    const list = State.getFilteredTransactions();
    if (list.length === 0) {
      App.showToast('Nenhum dado para exportar.', 'warning');
      return;
    }

    const excelData = list.map(t => ({
      'ID Registro': t.id,
      'Data': t.data,
      'Tipo': t.tipo,
      'Conta': t.conta,
      'Cód. CCusto': t.cod_ccusto,
      'Centro de Custo': t.nome_ccusto || State.getCostCenterName(t.cod_ccusto),
      'Descrição': t.descricao,
      'Favorecido / Doador': t.favorecido,
      'Valor (R$)': Number(t.valor)
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lancamentos');

    const fileName = `Lancamentos_ProjetoVida_${new Date().toISOString().substring(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    App.showToast('Planilha Excel (.xlsx) gerada com sucesso!', 'success');
  },

  /**
   * Exporta a lista atual para arquivo CSV
   */
  exportToCSV() {
    const list = State.getFilteredTransactions();
    if (list.length === 0) {
      App.showToast('Nenhum dado para exportar.', 'warning');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'ID;Data;Tipo;Conta;Cod_CCusto;Centro_Custo;Descricao;Favorecido_Doador;Valor_BRL\n';

    list.forEach(t => {
      const v = Number(t.valor).toFixed(2).replace('.', ',');
      csv += `"${t.id}";"${t.data}";"${t.tipo}";"${t.conta}";"${t.cod_ccusto}";"${t.nome_ccusto || ''}";"${(t.descricao || '').replace(/"/g, '""')}";"${(t.favorecido || '').replace(/"/g, '""')}";"${v}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lancamentos_ProjetoVida_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('Arquivo CSV baixado com sucesso!', 'success');
  },

  /**
   * Utilitários de Formatação Monetária
   */
  maskCurrencyInput(input) {
    let value = input.value.replace(/\D/g, '');
    if (!value) {
      input.value = '';
      return;
    }
    const num = Number(value) / 100;
    input.value = this.formatNumberToCurrency(num);
  },

  formatNumberToCurrency(num) {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  parseCurrencyToNumber(str) {
    if (!str) return 0;
    const clean = str.replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  },

  toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) {
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }
};

window.Transactions = Transactions;
