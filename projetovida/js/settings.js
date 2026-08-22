/**
 * SETTINGS VIEW CONTROLLER - PROJETO VIDA WEBAPP
 * Gerencia a configuração da API Apps Script, Centros de Custo, Contas e Usuários.
 */

const Settings = {
  init() {
    State.subscribe('data:loaded', () => this.render());
    this.bindEvents();
  },

  bindEvents() {
    // Salvar URL da API
    const formApi = document.getElementById('form-settings-api');
    if (formApi) {
      formApi.addEventListener('submit', (e) => this.handleSaveApiUrl(e));
    }

    // Botão Testar Conexão
    const btnTest = document.getElementById('btn-test-connection');
    if (btnTest) {
      btnTest.addEventListener('click', () => this.handleTestConnection());
    }

    // Alternador de Modo Demo
    const switchDemo = document.getElementById('switch-demo-mode');
    if (switchDemo) {
      switchDemo.addEventListener('change', (e) => {
        API.setLocalMode(e.target.checked);
        App.showToast(e.target.checked ? 'Modo Demonstração ativado.' : 'Modo Conexão ao Vivo ativado.', 'info');
        State.loadInitialData();
      });
    }
  },

  render() {
    this.renderApiSettings();
    this.renderCostCentersTable();
    this.renderAccountsTable();
    this.renderUsersTable();
  },

  renderApiSettings() {
    const inputUrl = document.getElementById('settings-api-url');
    if (inputUrl) {
      inputUrl.value = API.getApiUrl();
    }

    const switchDemo = document.getElementById('switch-demo-mode');
    if (switchDemo) {
      switchDemo.checked = API.isLocalMode();
    }

    const statusBadge = document.getElementById('settings-api-status');
    if (statusBadge) {
      if (API.isLocalMode()) {
        statusBadge.className = 'badge badge-warning';
        statusBadge.textContent = 'Modo Demonstração (Local)';
      } else {
        statusBadge.className = 'badge badge-success';
        statusBadge.textContent = 'Conectado ao Google Apps Script';
      }
    }
  },

  async handleSaveApiUrl(e) {
    e.preventDefault();
    const url = document.getElementById('settings-api-url').value.trim();
    API.setApiUrl(url);
    App.showToast('Configurações de API salvas com sucesso!', 'success');
    this.renderApiSettings();
    await State.loadInitialData();
  },

  async handleTestConnection() {
    const url = document.getElementById('settings-api-url').value.trim();
    const btn = document.getElementById('btn-test-connection');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Testando...';
    }

    try {
      const res = await API.testConnection(url);
      if (res.success) {
        App.showToast(res.message, 'success');
      } else {
        App.showToast(res.message, 'error');
      }
    } catch (err) {
      App.showToast('Erro no teste: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plug mr-1"></i> Testar Conexão';
      }
    }
  },

  renderCostCentersTable() {
    const tbody = document.getElementById('settings-ccusto-tbody');
    if (!tbody) return;

    tbody.innerHTML = State.costCenters.map(cc => `
      <tr>
        <td class="font-mono font-bold">${cc.codigo}</td>
        <td><strong>${escapeHtml(cc.nome)}</strong></td>
        <td><span class="badge badge-neutral text-xs">${cc.natureza || 'DR'}</span></td>
        <td class="text-muted small">${escapeHtml(cc.categoriaDRE || '-')}</td>
        <td><span class="badge ${cc.ativo === 'SIM' ? 'badge-success' : 'badge-danger'} text-xs">${cc.ativo || 'SIM'}</span></td>
        <td class="text-right">
          <button class="btn btn-icon btn-ghost btn-sm" onclick="Settings.openEditCostCenterModal('${cc.codigo}')">
            <i class="far fa-edit"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  renderAccountsTable() {
    const tbody = document.getElementById('settings-accounts-tbody');
    if (!tbody) return;

    tbody.innerHTML = State.accounts.map(acc => `
      <tr>
        <td><strong>${escapeHtml(acc.nome)}</strong></td>
        <td><span class="badge badge-neutral text-xs">${escapeHtml(acc.tipo)}</span></td>
        <td class="text-right font-mono">${Dashboard.formatCurrency(acc.saldoInicial)}</td>
        <td class="text-right font-mono font-bold text-light">${Dashboard.formatCurrency(acc.saldoAtual)}</td>
        <td><span class="badge ${acc.ativo === 'SIM' ? 'badge-success' : 'badge-danger'} text-xs">${acc.ativo}</span></td>
      </tr>
    `).join('');
  },

  renderUsersTable() {
    const tbody = document.getElementById('settings-users-tbody');
    if (!tbody) return;

    const db = API.getLocalDb();
    const users = db.usuarios || [];

    const badgeCount = document.getElementById('badge-settings-users-count');
    if (badgeCount) badgeCount.textContent = `${users.length} usuários`;

    const badgeMap = {
      'Admin': 'badge-primary',
      'Super Admin': 'badge-primary',
      'Diretoria': 'badge-info',
      'Entradas': 'badge-success',
      'Saídas': 'badge-danger',
      'Auditor': 'badge-warning'
    };

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-muted">
            <i class="fas fa-users-slash fa-2x mb-2 opacity-50"></i>
            <div>Nenhum usuário cadastrado. Clique em <strong>Novo Usuário</strong>.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const initial = u.nome ? u.nome.charAt(0).toUpperCase() : 'U';
      const isSuperAdmin = (u.email && u.email.toLowerCase() === 'admin@ong.org') || u.id === 'USR-001';

      return `
        <tr class="align-middle">
          <td>
            <div class="avatar-circle" style="width: 32px; height: 32px; font-size: 0.85rem;">${initial}</div>
          </td>
          <td>
            <strong class="text-light">${escapeHtml(u.nome)}</strong>
            <div class="text-xs text-muted font-mono">${u.id}</div>
          </td>
          <td class="font-mono text-muted small">${escapeHtml(u.email)}</td>
          <td>
            <span class="badge badge-neutral text-xs">
              <i class="fas fa-building text-muted mr-1"></i> ${escapeHtml(u.setor || 'Geral')}
            </span>
          </td>
          <td>
            <span class="badge ${badgeMap[u.nivel] || 'badge-neutral'} text-xs font-semibold">${u.nivel}</span>
          </td>
          <td class="text-xs text-muted" style="max-width: 260px; line-height: 1.3;">
            ${escapeHtml(u.permissoes || 'Acesso padrão')}
          </td>
          <td>
            <button type="button" class="btn btn-ghost btn-sm p-1" onclick="Settings.toggleUserStatus('${u.id}')" title="Alternar Status">
              <span class="badge ${u.ativo === 'SIM' ? 'badge-success' : 'badge-danger'} text-xs">
                ${u.ativo === 'SIM' ? '<i class="fas fa-check-circle mr-1"></i> Ativo' : '<i class="fas fa-ban mr-1"></i> Inativo'}
              </span>
            </button>
          </td>
          <td class="text-right">
            <div class="btn-group-sm">
              <button type="button" class="btn btn-icon btn-ghost" title="Alterar Senha" onclick="Settings.openResetPasswordModal('${u.id}')">
                <i class="fas fa-key text-warning"></i>
              </button>
              <button type="button" class="btn btn-icon btn-ghost" title="Editar Dados" onclick="Settings.openEditUserModal('${u.id}')">
                <i class="far fa-edit text-primary"></i>
              </button>
              ${!isSuperAdmin ? `
                <button type="button" class="btn btn-icon btn-ghost text-danger" title="Excluir Usuário" onclick="Settings.confirmDeleteUser('${u.id}', '${u.email}')">
                  <i class="far fa-trash-alt"></i>
                </button>
              ` : `
                <button type="button" class="btn btn-icon btn-ghost text-muted" title="Super Admin protegido" disabled>
                  <i class="fas fa-shield-alt opacity-40"></i>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  onRoleChangeInModal() {
    const role = document.getElementById('usr-modal-nivel').value;
    const inputSetor = document.getElementById('usr-modal-setor');
    const inputPerm = document.getElementById('usr-modal-permissoes');

    const defaults = {
      'Admin': { setor: 'Administração Geral', perm: 'Total (Super Admin - Acesso e controle irrestrito a todos os módulos)' },
      'Diretoria': { setor: 'Diretoria Executiva', perm: 'Visualização (Dashboards, Indicadores, Gráficos e DRE Analítico)' },
      'Entradas': { setor: 'Captação & Doações', perm: 'Lançamento de Entradas, Doações, Subvenções e Emissão de Recibos' },
      'Saídas': { setor: 'Contas a Pagar & Obras', perm: 'Lançamento de Saídas, Despesas, Obras e Comprovantes' },
      'Auditor': { setor: 'Contabilidade & Prestação de Contas', perm: 'Conferência de DRE, Conciliação Bancária e Exportações (Excel/CSV)' }
    };

    if (defaults[role]) {
      if (inputSetor) inputSetor.value = defaults[role].setor;
      if (inputPerm) inputPerm.value = defaults[role].perm;
    }
  },

  openNewUserModal() {
    const form = document.getElementById('form-settings-user');
    if (form) form.reset();
    document.getElementById('usr-modal-id').value = '';
    document.getElementById('modal-settings-user-title').textContent = 'Cadastrar Novo Usuário';
    document.getElementById('usr-modal-senha').required = true;
    document.getElementById('hint-usr-modal-senha').classList.add('d-none');
    document.getElementById('usr-modal-ativo').value = 'SIM';
    document.getElementById('usr-modal-nivel').value = 'Admin';
    this.onRoleChangeInModal();

    Transactions.toggleModal('modal-settings-user', true);
  },

  openEditUserModal(id) {
    const db = API.getLocalDb();
    const user = (db.usuarios || []).find(u => u.id === id);
    if (!user) return;

    document.getElementById('usr-modal-id').value = user.id;
    document.getElementById('usr-modal-nome').value = user.nome || '';
    document.getElementById('usr-modal-email').value = user.email || '';
    document.getElementById('usr-modal-nivel').value = user.nivel || 'Admin';
    document.getElementById('usr-modal-setor').value = user.setor || '';
    document.getElementById('usr-modal-permissoes').value = user.permissoes || '';
    document.getElementById('usr-modal-ativo').value = user.ativo || 'SIM';

    document.getElementById('usr-modal-senha').value = '';
    document.getElementById('usr-modal-senha').required = false;
    document.getElementById('hint-usr-modal-senha').classList.remove('d-none');

    document.getElementById('modal-settings-user-title').textContent = `Editar Usuário: ${user.nome}`;
    Transactions.toggleModal('modal-settings-user', true);
  },

  async handleSaveUser(e) {
    e.preventDefault();
    const id = document.getElementById('usr-modal-id').value.trim();
    const nome = document.getElementById('usr-modal-nome').value.trim();
    const email = document.getElementById('usr-modal-email').value.trim();
    const nivel = document.getElementById('usr-modal-nivel').value;
    const setor = document.getElementById('usr-modal-setor').value.trim();
    const permissoes = document.getElementById('usr-modal-permissoes').value.trim();
    const ativo = document.getElementById('usr-modal-ativo').value;
    const senha = document.getElementById('usr-modal-senha').value;

    const payload = { id, nome, email, nivel, setor, permissoes, ativo };

    if (senha) {
      payload.senhaHash = await Auth.hashPassword(senha);
    }

    const btn = document.getElementById('btn-save-usr-modal');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';
    }

    try {
      const res = await API.request('SAVE_USER', payload);
      if (res.status === 'success') {
        App.showToast(res.message || 'Usuário salvo com sucesso!', 'success');
        Transactions.toggleModal('modal-settings-user', false);
        this.renderUsersTable();
      } else {
        throw new Error(res.message || 'Erro ao salvar usuário.');
      }
    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check mr-1"></i> Salvar Usuário';
      }
    }
  },

  async toggleUserStatus(id) {
    const db = API.getLocalDb();
    const user = (db.usuarios || []).find(u => u.id === id);
    if (!user) return;

    if (user.email.toLowerCase() === 'admin@ong.org') {
      App.showToast('O Super Administrador principal não pode ser inativado.', 'warning');
      return;
    }

    const novoStatus = user.ativo === 'SIM' ? 'NAO' : 'SIM';
    user.ativo = novoStatus;

    try {
      await API.request('SAVE_USER', user);
      App.showToast(`Usuário ${novoStatus === 'SIM' ? 'ativado' : 'desativado'} com sucesso!`, 'info');
      this.renderUsersTable();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async confirmDeleteUser(id, email) {
    if (confirm(`Tem certeza que deseja excluir o usuário ${email}? Esta ação não pode ser desfeita.`)) {
      try {
        const res = await API.request('DELETE_USER', { id, email });
        if (res.status === 'success') {
          App.showToast('Usuário excluído com sucesso!', 'success');
          this.renderUsersTable();
        } else {
          throw new Error(res.message);
        }
      } catch (err) {
        App.showToast(err.message, 'error');
      }
    }
  },

  openResetPasswordModal(id) {
    const db = API.getLocalDb();
    const user = (db.usuarios || []).find(u => u.id === id);
    if (!user) return;

    document.getElementById('reset-modal-usr-id').value = user.id;
    document.getElementById('reset-modal-usr-email').value = user.email;
    document.getElementById('reset-modal-usr-name-text').textContent = user.nome;
    document.getElementById('reset-modal-usr-email-text').textContent = user.email;
    document.getElementById('reset-modal-new-pwd').value = '';
    document.getElementById('reset-modal-confirm-pwd').value = '';

    Transactions.toggleModal('modal-settings-reset-pwd', true);
  },

  async handleResetPasswordSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('reset-modal-usr-id').value;
    const email = document.getElementById('reset-modal-usr-email').value;
    const p1 = document.getElementById('reset-modal-new-pwd').value;
    const p2 = document.getElementById('reset-modal-confirm-pwd').value;

    if (p1 !== p2) {
      App.showToast('As senhas digitadas não coincidem.', 'warning');
      return;
    }

    const newPasswordHash = await Auth.hashPassword(p1);

    try {
      const res = await API.request('RESET_PASSWORD', { id, email, newPasswordHash });
      if (res.status === 'success') {
        App.showToast('Senha alterada com sucesso!', 'success');
        Transactions.toggleModal('modal-settings-reset-pwd', false);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  exportUsersBackup() {
    const db = API.getLocalDb();
    const users = db.usuarios || [];
    const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Usuarios_ProjetoVida_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('Lista de usuários exportada com sucesso!', 'success');
  },

  openNewCostCenterModal() {
    document.getElementById('form-ccusto').reset();
    Transactions.toggleModal('modal-settings-ccusto', true);
  },

  openEditCostCenterModal(codigo) {
    const cc = State.costCenters.find(c => c.codigo === String(codigo));
    if (!cc) return;

    document.getElementById('cc-codigo').value = cc.codigo;
    document.getElementById('cc-nome').value = cc.nome;
    document.getElementById('cc-natureza').value = cc.natureza || 'DR';
    document.getElementById('cc-categoria').value = cc.categoriaDRE || '';
    document.getElementById('cc-ativo').value = cc.ativo || 'SIM';

    Transactions.toggleModal('modal-settings-ccusto', true);
  },

  async handleSaveCostCenter(e) {
    e.preventDefault();
    const payload = {
      codigo: document.getElementById('cc-codigo').value.trim(),
      nome: document.getElementById('cc-nome').value.trim(),
      natureza: document.getElementById('cc-natureza').value,
      categoriaDRE: document.getElementById('cc-categoria').value.trim(),
      ativo: document.getElementById('cc-ativo').value
    };

    try {
      const res = await API.request('SAVE_COST_CENTER', payload);
      if (res.status === 'success') {
        App.showToast('Centro de Custo salvo com sucesso!', 'success');
        Transactions.toggleModal('modal-settings-ccusto', false);
        await State.loadInitialData();
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  /**
   * Baixa backup completo de todos os dados do sistema em JSON
   */
  exportFullBackup() {
    const fullData = {
      ong: 'PROJETO VIDA',
      exportDate: new Date().toISOString(),
      centrosCusto: State.costCenters,
      contas: State.accounts,
      lancamentos: State.transactions
    };

    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Financeiro_ProjetoVida_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('Backup exportado com sucesso!', 'success');
  }
};

window.Settings = Settings;
