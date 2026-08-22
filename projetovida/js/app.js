/**
 * MAIN APPLICATION CONTROLLER - PROJETO VIDA WEBAPP
 * Coordena o ciclo de vida da SPA, autenticação, roteamento de abas,
 * notificações Toast, responsividade e atalhos de teclado.
 */

const App = {
  activeTab: 'dashboard',

  async init() {
    console.log('🚀 Inicializando WebApp Financeiro ONG - Projeto Vida...');

    // 1. Inicializar Auth
    Auth.init();

    // 2. Vincular Eventos Globais
    this.bindGlobalEvents();

    // 3. Checar Autenticação
    if (Auth.isAuthenticated()) {
      this.showMainApp();
    } else {
      this.showLoginScreen();
    }
  },

  bindGlobalEvents() {
    // Escuta eventos de login e logout
    window.addEventListener('auth:login', () => this.showMainApp());
    window.addEventListener('auth:logout', () => this.showLoginScreen());

    // Formulário de Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
    }

    // Botão de Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('Deseja realmente sair do sistema?')) {
          Auth.logout();
        }
      });
    }

    // Navegação por Abas (Sidebar e Navbar)
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Fechar modais ao clicar no overlay ou no botão de fechar (x)
    document.querySelectorAll('.modal-overlay, .btn-close-modal').forEach(el => {
      el.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-container');
        if (modal) modal.classList.remove('active');
      });
    });

    // Toggle Menu Sanduíche (Sidebar retrátil)
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', () => this.toggleSidebar());
    }

    // Atalhos de Teclado
    window.addEventListener('keydown', (e) => {
      // ESC fecha modais abertos
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-container.active').forEach(m => m.classList.remove('active'));
      }
      // Alt + M: Toggle Menu Sanduíche
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        this.toggleSidebar();
      }
      // Alt + E: Nova Entrada
      if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        Transactions.openNewEntryModal();
      }
      // Alt + S: Nova Saída
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        Transactions.openNewExitModal();
      }
    });

    // Toggle da Sidebar Mobile
    const btnMenu = document.getElementById('btn-mobile-menu');
    const sidebar = document.getElementById('app-sidebar');
    if (btnMenu && sidebar) {
      btnMenu.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Formulário de Centro de Custo em Configurações
    const formCC = document.getElementById('form-ccusto');
    if (formCC) {
      formCC.addEventListener('submit', (e) => Settings.handleSaveCostCenter(e));
    }
  },

  /**
   * Alterna o estado recolhido/expandido do Menu Lateral
   */
  toggleSidebar() {
    const container = document.getElementById('screen-app');
    if (!container) return;
    const isCollapsed = container.classList.toggle('sidebar-collapsed');
    localStorage.setItem('ong_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  },

  /**
   * Restaura a preferência salva da sidebar
   */
  restoreSidebarState() {
    const saved = localStorage.getItem('ong_sidebar_collapsed');
    const container = document.getElementById('screen-app');
    if (container && saved === 'true') {
      container.classList.add('sidebar-collapsed');
    }
  },

  async handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login-submit');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Autenticando...';
    }

    try {
      await Auth.login(email, pass, true);
      this.showToast('Login realizado com sucesso!', 'success');
    } catch (err) {
      this.showToast(err.message || 'Falha no login.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>Acessar Painel Financeiro</span> <i class="fas fa-arrow-right ml-2"></i>';
      }
    }
  },

  /**
   * Transiciona para a Tela Principal com loading animado
   */
  async showMainApp() {
    document.getElementById('screen-login').classList.add('d-none');
    document.getElementById('screen-app').classList.remove('d-none');

    // Inicia loading overlay
    this.showLoadingOverlay();
    this.setLoadingProgress(10, 'Verificando autenticação...', 'Passo 1 de 3');

    // Restaura estado da sidebar (aberta ou recolhida)
    this.restoreSidebarState();

    // Atualiza nome, setor e badge do usuário logado
    const user = Auth.getUser();
    const elName = document.getElementById('user-profile-name');
    const elRole = document.getElementById('user-profile-role');
    const elAvatar = document.getElementById('user-profile-avatar');

    if (elName && user) elName.textContent = user.nome;
    if (elRole && user) {
      elRole.textContent = `${user.nivel}${user.setor ? ` • ${user.setor}` : ''}`;
      if (Auth.isSuperAdmin()) elRole.className = 'badge badge-primary text-xs';
      else if (Auth.isDiretoria()) elRole.className = 'badge badge-info text-xs';
      else if (Auth.isOperadorEntradas()) elRole.className = 'badge badge-success text-xs';
      else if (Auth.isOperadorSaidas()) elRole.className = 'badge badge-danger text-xs';
      else if (Auth.isAuditor()) elRole.className = 'badge badge-warning text-xs';
    }
    if (elAvatar && user) elAvatar.textContent = user.nome.charAt(0).toUpperCase();

    // Aplica permissões (esconde tabs e botões que o usuário não pode acessar)
    this.applyPermissions();

    // Inicializar submódulos
    this.setLoadingProgress(30, 'Carregando módulos...', 'Passo 2 de 3');
    Dashboard.init();
    Transactions.init();
    Reports.init();
    Settings.init();

    // Carregar dados da nuvem
    this.setLoadingProgress(55, 'Baixando dados do Google Sheets...', 'Passo 3 de 3');
    await State.loadInitialData();
    this.setLoadingProgress(90, 'Preparando painel...', 'Quase lá!');

    // Pequénia pausa para a barra chegar a 100% antes de fechar
    await new Promise(r => setTimeout(r, 400));
    this.setLoadingProgress(100, 'Pronto!', '');
    await new Promise(r => setTimeout(r, 300));
    this.hideLoadingOverlay();

    // Ativa aba padrão conforme nível do usuário
    const defaultTab = this.getDefaultTab();
    this.switchTab(defaultTab);
  },

  /**
   * Retorna a aba inicial para o nível do usuário
   */
  getDefaultTab() {
    if (Auth.isOperadorEntradas() || Auth.isOperadorSaidas()) return 'transactions';
    return 'dashboard';
  },

  /**
   * Aplica permissões: esconde abas e botões conforme nível do usuário
   */
  applyPermissions() {
    const nivel = Auth.getUser() ? Auth.getUser().nivel : '';

    // Esconde/mostra tabs da sidebar conforme permissão
    document.querySelectorAll('[data-tab][data-permission]').forEach(btn => {
      const perms = btn.getAttribute('data-permission').split(',');
      // Permissão: se o nível do usuário está na lista de permissões da aba
      const allowed = perms.includes(nivel) || perms.includes('Admin');
      btn.style.display = allowed ? '' : 'none';
    });

    // Botões de ação rápida no cabeçalho
    const btnNewEntry = document.getElementById('btn-header-new-entry');
    const btnNewExit  = document.getElementById('btn-header-new-exit');
    if (btnNewEntry) btnNewEntry.style.display = Auth.canCreateEntry() ? 'inline-flex' : 'none';
    if (btnNewExit)  btnNewExit.style.display  = Auth.canCreateExit()  ? 'inline-flex' : 'none';

    // Para operadores de Entradas: bloqueia o filtro de tipo em "Entrada"
    if (Auth.isOperadorEntradas() && !Auth.isSuperAdmin()) {
      State.setFilter('type', 'Entrada');
      const sel = document.getElementById('filter-type');
      if (sel) { sel.value = 'Entrada'; sel.disabled = true; }
    }

    // Para operadores de Saídas: bloqueia o filtro de tipo em "Saida"
    if (Auth.isOperadorSaidas() && !Auth.isSuperAdmin()) {
      State.setFilter('type', 'Saida');
      const sel = document.getElementById('filter-type');
      if (sel) { sel.value = 'Saida'; sel.disabled = true; }
    }
  },

  /**
   * Exibe o overlay de carregamento
   */
  showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      this.setLoadingProgress(0, '', '');
    }
  },

  /**
   * Atualiza a barra e mensagem de progresso
   */
  setLoadingProgress(percent, message, step) {
    const bar = document.getElementById('loading-bar');
    const msg = document.getElementById('loading-message');
    const stp = document.getElementById('loading-step');
    if (bar) bar.style.width = `${percent}%`;
    if (msg && message) msg.textContent = message;
    if (stp && step !== undefined) stp.textContent = step;
  },

  /**
   * Esconde o overlay de carregamento com fade
   */
  hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  /**
   * Transiciona para a Tela de Login
   */
  showLoginScreen() {
    document.getElementById('screen-login').classList.remove('d-none');
    document.getElementById('screen-app').classList.add('d-none');
  },

  /**
   * Troca de aba SPA
   */
  switchTab(tabName) {
    // Verifica se o usuário tem permissão para esta aba
    const nivel = Auth.getUser() ? Auth.getUser().nivel : '';
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabBtn && tabBtn.style.display === 'none') {
      // Redireciona para a aba padrão se não tiver acesso
      tabName = this.getDefaultTab();
    }

    this.activeTab = tabName;
    State.activeTab = tabName;

    // Atualiza botões da sidebar
    document.querySelectorAll('[data-tab]').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Alterna seções de conteúdo
    document.querySelectorAll('.tab-section').forEach(sec => {
      if (sec.id === `tab-section-${tabName}`) {
        sec.classList.remove('d-none');
      } else {
        sec.classList.add('d-none');
      }
    });

    // Fecha sidebar mobile se aberta
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Força re-renderização do módulo específico
    if (tabName === 'dashboard') Dashboard.render();
    if (tabName === 'transactions') Transactions.render();
    if (tabName === 'reports') Reports.render();
    if (tabName === 'settings') Settings.render();
  },

  /**
   * Sistema de Notificações Toast
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-in`;

    const iconMap = {
      success: 'fa-check-circle text-emerald-400',
      error: 'fa-exclamation-circle text-rose-400',
      warning: 'fa-exclamation-triangle text-amber-400',
      info: 'fa-info-circle text-sky-400'
    };

    toast.innerHTML = `
      <i class="fas ${iconMap[type] || 'fa-bell'} toast-icon"></i>
      <div class="toast-message">${escapeHtml(message)}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
};

window.App = App;

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
