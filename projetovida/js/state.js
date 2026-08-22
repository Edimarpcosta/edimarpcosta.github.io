/**
 * STATE MANAGEMENT SERVICE - PROJETO VIDA WEBAPP
 * Mantém o estado reativo da aplicação, filtros, listas e notificações.
 */

const State = {
  // Dados brutos
  transactions: [],
  costCenters: [],
  accounts: [],
  users: [],

  // Filtros ativos
  filters: {
    search: '',
    year: '2026',
    month: 'todos', // 'todos' ou '01'..'12'
    type: 'todos',  // 'todos', 'Entrada', 'Saida'
    costCenter: 'todos',
    account: 'todos',
    dateStart: '',
    dateEnd: ''
  },

  // Paginação
  pagination: {
    page: 1,
    pageSize: 15
  },

  // Aba ativa
  activeTab: 'dashboard',

  // Sistema de Observadores / Eventos
  listeners: {},

  subscribe(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },

  notify(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  },

  /**
   * Carrega os dados iniciais do backend ou storage
   */
  /**
   * Normaliza uma transação recebida do backend para garantir compatibilidade com filtros
   */
  normalizeTransaction(t) {
    let rawDate = t.data || '';
    let normDate = '';
    
    if (rawDate) {
      const str = String(rawDate).trim();
      // Formato YYYY-MM-DD ou YYYY-MM-DDT...
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        normDate = str.substring(0, 10);
      } 
      // Formato DD/MM/YYYY
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        const parts = str.split('/');
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].substring(0, 4);
        normDate = `${year}-${month}-${day}`;
      } 
      // Objeto Data ou ISO String
      else {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          normDate = parsed.toISOString().substring(0, 10);
        } else {
          normDate = str;
        }
      }
    }

    const val = Number(t.valor) || 0;
    let tipo = t.tipo || (val >= 0 ? 'Entrada' : 'Saida');
    const tipoLower = String(tipo).toLowerCase();
    if (tipoLower.includes('entrad')) {
      tipo = 'Entrada';
    } else if (tipoLower.includes('said')) {
      tipo = 'Saida';
    }

    return {
      id: String(t.id || ''),
      data: normDate,
      tipo: tipo,
      conta: String(t.conta || 'BRASIL'),
      cod_ccusto: String(t.cod_ccusto || ''),
      nome_ccusto: String(t.nome_ccusto || ''),
      descricao: String(t.descricao || ''),
      favorecido: String(t.favorecido || ''),
      valor: val,
      comprovanteUrl: String(t.comprovanteUrl || ''),
      criadoPor: String(t.criadoPor || '')
    };
  },

  /**
   * Carrega os dados iniciais do backend ou storage
   */
  async loadInitialData() {
    this.notify('loading:start');
    try {
      const res = await API.request('GET_INITIAL_DATA');
      if (res && res.status === 'success') {
        this.costCenters = res.centrosCusto || [];
        this.accounts = res.contas || [];
        this.users = res.usuarios || [];
        
        const rawTxs = res.lancamentos || [];
        this.transactions = rawTxs.map(t => this.normalizeTransaction(t));
        
        // Se as transações vierem vazias e tivermos seed data com dados locais, inicializa
        if (this.transactions.length === 0 && window.SEED_DATA && (window.SEED_DATA.lancamentos || []).length > 0) {
          this.transactions = (window.SEED_DATA.lancamentos || []).map(t => this.normalizeTransaction(t));
          this.costCenters = window.SEED_DATA.centrosCusto || this.costCenters;
          this.accounts = window.SEED_DATA.contas || this.accounts;
        }

        console.log(`✅ Dados carregados da nuvem com sucesso: ${this.transactions.length} lançamentos, ${this.costCenters.length} CCs, ${this.accounts.length} contas.`);
        this.notify('data:loaded');
      } else {
        throw new Error(res ? res.message : 'Erro na resposta do servidor');
      }
    } catch (err) {
      console.warn('Usando dados locais de fallback devido a:', err.message);
      const db = API.getLocalDb();
      this.costCenters = db.centrosCusto || [];
      this.accounts = db.contas || [];
      this.users = db.usuarios || [];
      this.transactions = (db.lancamentos || []).map(t => this.normalizeTransaction(t));
      this.notify('data:loaded');
    } finally {
      this.notify('loading:end');
    }
  },

  /**
   * Aplica os filtros atuais à lista de transações
   */
  getFilteredTransactions() {
    return this.transactions.filter(t => {
      // Filtro de Texto (busca na descrição, favorecido, nome de centro de custo)
      if (this.filters.search) {
        const q = this.filters.search.toLowerCase();
        const match = (t.descricao && t.descricao.toLowerCase().includes(q)) ||
                      (t.favorecido && t.favorecido.toLowerCase().includes(q)) ||
                      (t.nome_ccusto && t.nome_ccusto.toLowerCase().includes(q)) ||
                      (t.cod_ccusto && t.cod_ccusto.includes(q)) ||
                      (t.conta && t.conta.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Filtro de Intervalo de Datas Específico
      if (this.filters.dateStart) {
        if (!t.data || t.data < this.filters.dateStart) return false;
      }
      if (this.filters.dateEnd) {
        if (!t.data || t.data > this.filters.dateEnd) return false;
      }

      // Filtro de Ano (só aplica se não houver intervalo específico)
      if (!this.filters.dateStart && !this.filters.dateEnd) {
        if (this.filters.year && this.filters.year !== 'todos') {
          if (!t.data || !t.data.startsWith(this.filters.year)) return false;
        }

        // Filtro de Mês
        if (this.filters.month && this.filters.month !== 'todos') {
          const m = t.data ? t.data.substring(5, 7) : '';
          if (m !== this.filters.month) return false;
        }
      }

      // Filtro de Tipo
      if (this.filters.type && this.filters.type !== 'todos') {
        const filterTypeLower = this.filters.type.toLowerCase();
        const itemTypeLower = (t.tipo || '').toLowerCase();
        if (filterTypeLower.includes('entrad') && !itemTypeLower.includes('entrad')) return false;
        if (filterTypeLower.includes('said') && !itemTypeLower.includes('said')) return false;
      }

      // Filtro de Centro de Custo
      if (this.filters.costCenter && this.filters.costCenter !== 'todos') {
        if (String(t.cod_ccusto) !== String(this.filters.costCenter)) return false;
      }

      // Filtro de Conta
      if (this.filters.account && this.filters.account !== 'todos') {
        if (t.conta.toLowerCase() !== this.filters.account.toLowerCase()) return false;
      }

      return true;
    });
  },

  /**
   * Retorna transações paginadas
   */
  getPaginatedTransactions() {
    const filtered = this.getFilteredTransactions();
    const start = (this.pagination.page - 1) * this.pagination.pageSize;
    const end = start + this.pagination.pageSize;
    return {
      items: filtered.slice(start, end),
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / this.pagination.pageSize) || 1,
      currentPage: this.pagination.page
    };
  },

  /**
   * Totais consolidados das transações filtradas
   */
  getTotals() {
    const list = this.getFilteredTransactions();
    let totalEntradas = 0;
    let totalSaidas = 0;

    list.forEach(t => {
      const v = Number(t.valor) || 0;
      if (v >= 0) {
        totalEntradas += v;
      } else {
        totalSaidas += Math.abs(v);
      }
    });

    return {
      entradas: totalEntradas,
      saidas: totalSaidas,
      resultado: totalEntradas - totalSaidas,
      quantidade: list.length
    };
  },

  /**
   * Saldo Total Geral Atual de todas as contas
   */
  getGeneralBalance() {
    let balance = 0;
    // Soma o saldo inicial da conta principal + todas as transações históricas
    const initialAcc = this.accounts.find(a => a.nome === 'BRASIL');
    const saldoInicial = initialAcc ? Number(initialAcc.saldoInicial || 0) : 330358.97;

    let delta = 0;
    this.transactions.forEach(t => {
      delta += Number(t.valor) || 0;
    });

    return saldoInicial + delta;
  },

  /**
   * Retorna o nome amigável do Centro de Custo pelo código
   */
  getCostCenterName(code) {
    const cc = this.costCenters.find(c => String(c.codigo) === String(code));
    return cc ? cc.nome : '';
  },

  /**
   * Atualiza filtros
   */
  setFilter(key, value) {
    this.filters[key] = value;
    this.pagination.page = 1; // Reseta para primeira página
    this.notify('filter:changed', this.filters);
  },

  setPage(page) {
    this.pagination.page = Math.max(1, page);
    this.notify('pagination:changed', this.pagination);
  }
};

window.State = State;
