/**
 * AUTHENTICATION SERVICE - PROJETO VIDA WEBAPP
 * Gerencia login, hash seguro SHA-256 no client-side, sessões e permissões.
 */

const Auth = {
  STORAGE_KEYS: {
    USER: 'ong_auth_user',
    TOKEN: 'ong_auth_token',
    REMEMBER: 'ong_auth_remember'
  },

  currentUser: null,
  token: null,

  /**
   * Inicializa o estado de autenticação a partir do storage
   */
  init() {
    const savedUser = sessionStorage.getItem(this.STORAGE_KEYS.USER) || localStorage.getItem(this.STORAGE_KEYS.USER);
    const savedToken = sessionStorage.getItem(this.STORAGE_KEYS.TOKEN) || localStorage.getItem(this.STORAGE_KEYS.TOKEN);

    if (savedUser && savedToken) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.token = savedToken;
        return true;
      } catch (e) {
        this.logout();
      }
    }
    return false;
  },

  /**
   * Gera hash SHA-256 seguro no navegador
   */
  async hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },

  /**
   * Realiza login
   */
  async login(email, password, remember = true) {
    if (!email || !password) {
      throw new Error('Preencha email e senha.');
    }

    const passwordHash = await this.hashPassword(password);

    const response = await API.request('LOGIN', {
      email: email.trim(),
      passwordHash: passwordHash
    });

    if (response.status === 'success' && response.user) {
      this.currentUser = response.user;
      this.token = response.token || 'token_' + Date.now();

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
      storage.setItem(this.STORAGE_KEYS.TOKEN, this.token);
      localStorage.setItem(this.STORAGE_KEYS.REMEMBER, remember ? 'true' : 'false');

      window.dispatchEvent(new CustomEvent('auth:login', { detail: this.currentUser }));
      return this.currentUser;
    } else {
      throw new Error(response.message || 'Falha na autenticação.');
    }
  },

  /**
   * Encerra a sessão
   */
  logout() {
    this.currentUser = null;
    this.token = null;
    sessionStorage.removeItem(this.STORAGE_KEYS.USER);
    sessionStorage.removeItem(this.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.USER);
    localStorage.removeItem(this.STORAGE_KEYS.TOKEN);

    window.dispatchEvent(new CustomEvent('auth:logout'));
  },

  isAuthenticated() {
    return !!this.currentUser && !!this.token;
  },

  getUser() {
    return this.currentUser;
  },

  isAdmin() {
    return this.currentUser && (this.currentUser.nivel === 'Admin' || this.currentUser.nivel === 'Super Admin');
  },

  isSuperAdmin() {
    return this.isAdmin();
  },

  isDiretoria() {
    return this.currentUser && (this.currentUser.nivel === 'Diretoria' || this.currentUser.nivel === 'Consulta');
  },

  isOperadorEntradas() {
    return this.currentUser && (
      this.currentUser.nivel === 'Entradas' ||
      this.currentUser.setor === 'Captacao e Doacoes' ||
      this.currentUser.setor === 'Captação & Doações'
    );
  },

  isOperadorSaidas() {
    return this.currentUser && (
      this.currentUser.nivel === 'Saidas' ||
      this.currentUser.setor === 'Contas a Pagar e Obras' ||
      this.currentUser.setor === 'Contas a Pagar & Obras'
    );
  },

  isAuditor() {
    return this.currentUser && (this.currentUser.nivel === 'Auditor' || this.currentUser.nivel === 'Contador');
  },

  /**
   * Permissão para cadastrar / lançar Entradas
   */
  canCreateEntry() {
    if (!this.currentUser) return false;
    return this.isAdmin() || this.isOperadorEntradas() || this.currentUser.nivel === 'Operador';
  },

  /**
   * Permissão para cadastrar / lançar Saídas
   */
  canCreateExit() {
    if (!this.currentUser) return false;
    return this.isAdmin() || this.isOperadorSaidas() || this.currentUser.nivel === 'Operador';
  },

  /**
   * Permissão para editar lançamento
   */
  canEditTransaction(tx) {
    if (!this.currentUser) return false;
    if (this.isAdmin()) return true;
    if (tx && tx.tipo === 'Entrada') return this.canCreateEntry();
    if (tx && tx.tipo === 'Saida') return this.canCreateExit();
    return false;
  },

  /**
   * Permissão para excluir lançamento (exclusivo Super Admin)
   */
  canDeleteTransaction() {
    return this.isAdmin();
  },

  /**
   * Permissão para gerenciar usuários e acessos
   */
  canManageUsers() {
    return this.isAdmin();
  },

  /**
   * Permissão para configurações gerais de sistema
   */
  canManageSettings() {
    return this.isAdmin();
  }
};

window.Auth = Auth;
