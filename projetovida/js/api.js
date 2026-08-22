/**
 * API SERVICE - PROJETO VIDA WEBAPP
 * Gerencia a comunicação assíncrona entre o frontend no GitHub Pages
 * e a API REST do Google Apps Script (com fallback automático em LocalStorage).
 */

const API = {
  // URL Oficial de Produção do Google Apps Script
  DEFAULT_API_URL: 'https://script.google.com/macros/s/AKfycbxtLhEgyY8K0_6-4zqUCr_uy5Xs9hD5nsWjzqlDMqJgVSUy2eR55P1KZJjGbRmxxyVg/exec',

  // Chave de armazenamento no LocalStorage para a URL da API
  STORAGE_KEYS: {
    API_URL: 'ong_finance_api_url',
    LOCAL_DB: 'ong_finance_local_db',
    USE_LOCAL_MODE: 'ong_finance_use_local'
  },

  /**
   * Retorna a URL configurada do Google Apps Script
   */
  getApiUrl() {
    const saved = localStorage.getItem(this.STORAGE_KEYS.API_URL);
    if (saved && saved.trim()) return saved.trim();
    return this.DEFAULT_API_URL;
  },

  /**
   * Define e salva a URL do Google Apps Script
   */
  setApiUrl(url) {
    if (url && url.trim()) {
      localStorage.setItem(this.STORAGE_KEYS.API_URL, url.trim());
      localStorage.setItem(this.STORAGE_KEYS.USE_LOCAL_MODE, 'false');
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.API_URL);
      localStorage.setItem(this.STORAGE_KEYS.USE_LOCAL_MODE, 'true');
    }
  },

  /**
   * Verifica se está usando modo de dados locais (Demo/Offline)
   */
  isLocalMode() {
    const forced = localStorage.getItem(this.STORAGE_KEYS.USE_LOCAL_MODE);
    if (forced === 'true') return true;
    if (forced === 'false') return false;
    // Padrão: usa a URL configurada
    return false;
  },

  setLocalMode(enable) {
    localStorage.setItem(this.STORAGE_KEYS.USE_LOCAL_MODE, enable ? 'true' : 'false');
  },

  /**
   * Obtém a base de dados do LocalStorage (inicializada com SEED_DATA se vazia)
   */
  getLocalDb() {
    const saved = localStorage.getItem(this.STORAGE_KEYS.LOCAL_DB);
    let db = null;
    if (saved) {
      try {
        db = JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler DB local, reinicializando com seed data', e);
      }
    }
    if (!db) {
      db = window.SEED_DATA || { centrosCusto: [], contas: [], usuarios: [], lancamentos: [] };
    } else {
      // Garante que a lista de usuários contenha os perfis completos atualizados
      if (!db.usuarios || db.usuarios.length < (window.SEED_DATA ? window.SEED_DATA.usuarios.length : 1)) {
        if (window.SEED_DATA && window.SEED_DATA.usuarios) {
          db.usuarios = window.SEED_DATA.usuarios;
        }
      }
    }
    this.saveLocalDb(db);
    return db;
  },

  saveLocalDb(data) {
    localStorage.setItem(this.STORAGE_KEYS.LOCAL_DB, JSON.stringify(data));
  },

  /**
   * Executa requisição POST para o Google Apps Script
   */
  async request(action, payload = {}) {
    // Se estiver em modo local / demo
    if (this.isLocalMode()) {
      return this.handleLocalRequest(action, payload);
    }

    const apiUrl = this.getApiUrl();
    const currentUser = Auth.getUser();

    const requestBody = {
      action: action,
      payload: payload,
      user: currentUser ? { email: currentUser.email, nome: currentUser.nome } : null,
      timestamp: new Date().toISOString()
    };

    try {
      // Usamos text/plain para evitar bloqueios de CORS pré-flight desnecessários no Apps Script
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Erro na resposta do servidor (${response.status})`);
      }

      const json = await response.json();
      return json;
    } catch (err) {
      console.warn(`Falha na conexão com Apps Script (${err.message}). Tentando fallback local...`);
      // Se falhar a conexão, notifica e oferece fallback
      throw err;
    }
  },

  /**
   * Testa a conectividade com a URL do Google Apps Script
   */
  async testConnection(url) {
    const targetUrl = url || this.getApiUrl();
    if (!targetUrl) return { success: false, message: 'URL da API não informada.' };

    try {
      const response = await fetch(targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'ping=1', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();
      if (data && data.status === 'success') {
        return { success: true, message: data.message || 'Conexão estabelecida com sucesso!' };
      }
      return { success: true, message: 'Resposta recebida da API com sucesso!' };
    } catch (err) {
      return { success: false, message: 'Não foi possível conectar: ' + err.message };
    }
  },

  /**
   * -------------------------------------------------------------
   * PROCESSAMENTO LOCAL / OFFLINE (FALLBACK E MODO DEMONSTRAÇÃO)
   * Permite que o WebApp funcione 100% no GitHub Pages mesmo antes
   * do usuário configurar o Apps Script!
   * -------------------------------------------------------------
   */
  async handleLocalRequest(action, payload) {
    // Simula pequena latência de rede realista
    await new Promise(r => setTimeout(r, 120));

    const db = this.getLocalDb();

    switch (action) {
      case 'LOGIN': {
        const { email, passwordHash } = payload;
        const user = (db.usuarios || []).find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) return { status: 'error', message: 'Usuário não encontrado.' };
        if (user.ativo !== 'SIM') return { status: 'error', message: 'Usuário inativo. Contate o administrador.' };
        if (user.senhaHash !== passwordHash) return { status: 'error', message: 'Senha incorreta.' };
        
        return {
          status: 'success',
          token: 'token_' + Date.now(),
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            nivel: user.nivel,
            setor: user.setor || 'Geral',
            permissoes: user.permissoes || 'Padrão'
          }
        };
      }

      case 'GET_INITIAL_DATA': {
        return {
          status: 'success',
          centrosCusto: db.centrosCusto || [],
          contas: db.contas || [],
          lancamentos: db.lancamentos || [],
          usuarios: db.usuarios || []
        };
      }

      case 'GET_TRANSACTIONS': {
        let list = [...(db.lancamentos || [])];
        if (payload.ano) list = list.filter(t => t.data.startsWith(String(payload.ano)));
        if (payload.mes) list = list.filter(t => t.data.substring(5, 7) === String(payload.mes).padStart(2, '0'));
        if (payload.conta) list = list.filter(t => t.conta.toLowerCase() === payload.conta.toLowerCase());
        if (payload.cod_ccusto) list = list.filter(t => t.cod_ccusto === String(payload.cod_ccusto));
        if (payload.tipo) list = list.filter(t => t.tipo.toLowerCase() === payload.tipo.toLowerCase());
        
        let ent = 0, sai = 0;
        list.forEach(t => {
          if (t.valor >= 0) ent += t.valor;
          else sai += Math.abs(t.valor);
        });

        list.sort((a, b) => new Date(b.data) - new Date(a.data));

        return {
          status: 'success',
          lancamentos: list,
          totais: { entradas: ent, saidas: sai, saldo: ent - sai }
        };
      }

      case 'ADD_TRANSACTION': {
        const newId = 'TX-' + String(db.lancamentos.length + 1).padStart(4, '0');
        let valor = Number(payload.valor) || 0;
        const tipo = payload.tipo || (valor >= 0 ? 'Entrada' : 'Saida');
        if (tipo === 'Saida' && valor > 0) valor = -valor;
        if (tipo === 'Entrada' && valor < 0) valor = Math.abs(valor);

        const cc = db.centrosCusto.find(c => c.codigo === String(payload.cod_ccusto));
        const item = {
          id: newId,
          data: payload.data || new Date().toISOString().substring(0, 10),
          tipo: tipo,
          conta: payload.conta || 'BRASIL',
          cod_ccusto: String(payload.cod_ccusto || ''),
          nome_ccusto: payload.nome_ccusto || (cc ? cc.nome : ''),
          descricao: payload.descricao || '',
          favorecido: payload.favorecido || '',
          valor: valor,
          comprovanteUrl: payload.comprovanteUrl || '',
          dataCriacao: new Date().toISOString()
        };

        db.lancamentos.unshift(item);
        this.saveLocalDb(db);

        return { status: 'success', message: 'Lançamento registrado com sucesso!', id: newId };
      }

      case 'UPDATE_TRANSACTION': {
        const idx = db.lancamentos.findIndex(t => t.id === payload.id);
        if (idx === -1) return { status: 'error', message: 'Lançamento não encontrado.' };

        let valor = Number(payload.valor) || 0;
        const tipo = payload.tipo || (valor >= 0 ? 'Entrada' : 'Saida');
        if (tipo === 'Saida' && valor > 0) valor = -valor;
        if (tipo === 'Entrada' && valor < 0) valor = Math.abs(valor);

        const cc = db.centrosCusto.find(c => c.codigo === String(payload.cod_ccusto));
        db.lancamentos[idx] = {
          ...db.lancamentos[idx],
          data: payload.data,
          tipo: tipo,
          conta: payload.conta,
          cod_ccusto: String(payload.cod_ccusto),
          nome_ccusto: payload.nome_ccusto || (cc ? cc.nome : ''),
          descricao: payload.descricao,
          favorecido: payload.favorecido,
          valor: valor,
          comprovanteUrl: payload.comprovanteUrl || ''
        };

        this.saveLocalDb(db);
        return { status: 'success', message: 'Lançamento atualizado com sucesso!' };
      }

      case 'DELETE_TRANSACTION': {
        const idx = db.lancamentos.findIndex(t => t.id === payload.id);
        if (idx === -1) return { status: 'error', message: 'Lançamento não encontrado.' };
        db.lancamentos.splice(idx, 1);
        this.saveLocalDb(db);
        return { status: 'success', message: 'Lançamento removido com sucesso!' };
      }

      case 'SAVE_COST_CENTER': {
        const codigo = String(payload.codigo);
        const idx = db.centrosCusto.findIndex(c => c.codigo === codigo);
        const ccItem = {
          codigo: codigo,
          nome: payload.nome,
          natureza: payload.natureza || 'DR',
          categoriaDRE: payload.categoriaDRE || 'Despesa Operacional',
          ativo: payload.ativo || 'SIM'
        };
        if (idx >= 0) db.centrosCusto[idx] = ccItem;
        else db.centrosCusto.push(ccItem);
        this.saveLocalDb(db);
        return { status: 'success', message: 'Centro de Custo salvo!' };
      }

      case 'SAVE_ACCOUNT': {
        const id = payload.id || 'CTA-' + (db.contas.length + 1);
        const idx = db.contas.findIndex(c => c.id === id || c.nome.toLowerCase() === payload.nome.toLowerCase());
        const accItem = {
          id: id,
          nome: payload.nome,
          tipo: payload.tipo || 'Bancária',
          saldoInicial: Number(payload.saldoInicial) || 0,
          saldoAtual: Number(payload.saldoInicial) || 0,
          ativo: payload.ativo || 'SIM'
        };
        if (idx >= 0) db.contas[idx] = accItem;
        else db.contas.push(accItem);
        this.saveLocalDb(db);
        return { status: 'success', message: 'Conta salva com sucesso!' };
      }

      case 'GET_USERS': {
        const users = (db.usuarios || []).map(u => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          nivel: u.nivel,
          setor: u.setor || 'Geral',
          permissoes: u.permissoes || '',
          ativo: u.ativo || 'SIM'
        }));
        return { status: 'success', usuarios: users };
      }

      case 'SAVE_USER': {
        const id = payload.id || 'USR-' + String((db.usuarios || []).length + 1).padStart(3, '0');
        const idx = db.usuarios.findIndex(u => u.id === id || u.email.toLowerCase() === payload.email.toLowerCase());
        
        const existing = idx >= 0 ? db.usuarios[idx] : null;
        const userItem = {
          id: id,
          nome: payload.nome,
          email: payload.email,
          senhaHash: payload.senhaHash || (existing ? existing.senhaHash : '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'),
          nivel: payload.nivel || 'Operador',
          setor: payload.setor || 'Geral',
          permissoes: payload.permissoes || '',
          ativo: payload.ativo || 'SIM'
        };

        if (idx >= 0) {
          db.usuarios[idx] = { ...existing, ...userItem };
        } else {
          db.usuarios.push(userItem);
        }
        this.saveLocalDb(db);
        return { status: 'success', message: 'Usuário salvo com sucesso!', user: userItem };
      }

      case 'DELETE_USER': {
        const targetId = payload.id;
        const targetEmail = (payload.email || '').toLowerCase();
        
        // Bloqueia exclusão do Super Admin principal
        if (targetEmail === 'admin@ong.org' || targetId === 'USR-001') {
          return { status: 'error', message: 'O Super Administrador principal (admin@ong.org) não pode ser excluído.' };
        }

        const idx = db.usuarios.findIndex(u => u.id === targetId || u.email.toLowerCase() === targetEmail);
        if (idx === -1) return { status: 'error', message: 'Usuário não encontrado.' };

        db.usuarios.splice(idx, 1);
        this.saveLocalDb(db);
        return { status: 'success', message: 'Usuário excluído com sucesso!' };
      }

      case 'RESET_PASSWORD': {
        const targetEmail = (payload.email || '').toLowerCase();
        const user = db.usuarios.find(u => u.email.toLowerCase() === targetEmail || u.id === payload.id);
        if (!user) return { status: 'error', message: 'Usuário não encontrado.' };

        user.senhaHash = payload.newPasswordHash;
        this.saveLocalDb(db);
        return { status: 'success', message: 'Senha atualizada com sucesso!' };
      }

      default:
        return { status: 'error', message: 'Ação não suportada: ' + action };
    }
  }
};

window.API = API;

