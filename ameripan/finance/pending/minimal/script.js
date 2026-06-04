// SISTEMA DE COBRANÇA - LÓGICA PRINCIPAL

document.addEventListener("DOMContentLoaded", () => {
  // Inicialização de Ícones
  lucide.createIcons();
  
  // Elementos do DOM
  const lockScreen = document.getElementById("lock-screen");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const appContainer = document.getElementById("app-container");
  const logoutBtn = document.getElementById("logout-btn");
  
  const uploadZone = document.getElementById("upload-zone");
  const excelFileInput = document.getElementById("excel-file-input");
  const fileInfo = document.getElementById("file-info");
  
  const searchInput = document.getElementById("search-input");
  const statusFilter = document.getElementById("status-filter");
  const clientsTableBody = document.getElementById("clients-table-body");
  
  const statsTotal = document.getElementById("stats-total");
  const statsPendentes = document.getElementById("stats-pendentes");
  const statsContatados = document.getElementById("stats-contatados");
  const statsPago = document.getElementById("stats-pago");
  
  const inspectorEmpty = document.getElementById("inspector-empty");
  const inspectorContent = document.getElementById("inspector-content");
  
  const configScriptUrl = document.getElementById("config-script-url");
  const configSaveBtn = document.getElementById("config-save-btn");
  const connectionStatus = document.getElementById("connection-status");
  
  const toastContainer = document.getElementById("toast-container");

  const syncStartDateInput = document.getElementById("sync-start-date");
  const syncEndDateInput = document.getElementById("sync-end-date");
  const cloudPullBtn = document.getElementById("cloud-pull-btn");
  const cloudPushBtn = document.getElementById("cloud-push-btn");
  const reportStatusFilter = document.getElementById("report-status-filter");
  const exportXlsxBtn = document.getElementById("export-xlsx-btn");
  const exportPdfBtn = document.getElementById("export-pdf-btn");

  let localFileLoaded = false;

  // --- CONTROLE DE TEMA (LIGHT MODE) ---
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeToggleIcon = document.getElementById("theme-toggle-icon");

  function setTema(isLight) {
    if (isLight) {
      document.body.classList.add("light-mode");
      if (themeToggleIcon) {
        themeToggleIcon.setAttribute("data-lucide", "moon");
      }
      localStorage.setItem("cobranca_theme", "light");
    } else {
      document.body.classList.remove("light-mode");
      if (themeToggleIcon) {
        themeToggleIcon.setAttribute("data-lucide", "sun");
      }
      localStorage.setItem("cobranca_theme", "dark");
    }
    lucide.createIcons();
  }

  // Carregar tema salvo
  const temaSalvo = localStorage.getItem("cobranca_theme") || "dark";
  setTema(temaSalvo === "light");

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const isLightNow = document.body.classList.contains("light-mode");
      setTema(!isLightNow);
    });
  }

  // --- CONTROLE DE MODO ZEN (DISPARO RÁPIDO) ---
  const zenToggleBtn = document.getElementById("zen-toggle-btn");
  const zenToggleIcon = document.getElementById("zen-toggle-icon");

  // --- Modal de Ajuda ---
  const helpBtn         = document.getElementById("help-btn");
  const helpModal       = document.getElementById("help-modal");
  const helpModalClose  = document.getElementById("help-modal-close");
  const helpModalOk     = document.getElementById("help-modal-ok");
  const helpModalBack   = document.getElementById("help-modal-backdrop");

  function openHelpModal() {
    if (!helpModal) return;
    helpModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    lucide.createIcons();
  }
  function closeHelpModal() {
    if (!helpModal) return;
    helpModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  if (helpBtn)       helpBtn.addEventListener("click", openHelpModal);
  if (helpModalClose) helpModalClose.addEventListener("click", closeHelpModal);
  if (helpModalOk)   helpModalOk.addEventListener("click", closeHelpModal);
  if (helpModalBack)  helpModalBack.addEventListener("click", closeHelpModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeHelpModal(); });

  function setZenMode(isZen) {
    const sendWhatsappBtn = document.getElementById("send-whatsapp-btn");
    if (isZen) {
      document.body.classList.add("zen-mode-active");
      if (zenToggleIcon) {
        zenToggleIcon.setAttribute("data-lucide", "zap-off");
      }
      localStorage.setItem("cobranca_zen_mode", "active");
    } else {
      document.body.classList.remove("zen-mode-active");
      if (zenToggleIcon) {
        zenToggleIcon.setAttribute("data-lucide", "zap");
      }
      localStorage.setItem("cobranca_zen_mode", "inactive");
      
      // Limpar estilos fixos do botão de whatsapp se voltar ao modo normal
      if (sendWhatsappBtn) {
        sendWhatsappBtn.classList.remove("ready-to-send");
        sendWhatsappBtn.removeAttribute("style");
      }
    }
    lucide.createIcons();
    atualizarBotoesZenWhatsApp();
  }

  function atualizarBotoesZenWhatsApp() {
    const sendWhatsappBtn = document.getElementById("send-whatsapp-btn");
    if (!sendWhatsappBtn) return;
    
    const isZen = document.body.classList.contains("zen-mode-active");
    if (!isZen) {
      sendWhatsappBtn.classList.remove("ready-to-send");
      sendWhatsappBtn.disabled = false; // Normal mode controls it dynamically
      return;
    }
    
    if (selectedClientIndex !== null) {
      sendWhatsappBtn.classList.add("ready-to-send");
      sendWhatsappBtn.disabled = false;
    } else {
      sendWhatsappBtn.classList.remove("ready-to-send");
      sendWhatsappBtn.disabled = true;
    }
  }

  // Carregar estado Zen salvo
  const zenSalvo = localStorage.getItem("cobranca_zen_mode") || "active";
  setZenMode(zenSalvo === "active");

  if (zenToggleBtn) {
    zenToggleBtn.addEventListener("click", () => {
      const isZenNow = document.body.classList.contains("zen-mode-active");
      setZenMode(!isZenNow);
    });
  }

  // Elementos do Relatório
  const reportMonthSelect = document.getElementById("report-month-select");
  const repTotalCobrado = document.getElementById("rep-total-cobrado");
  const repTotalRecuperado = document.getElementById("rep-total-recuperado");
  const repTotalNegociando = document.getElementById("rep-total-negociando");
  const repTotalPerdas = document.getElementById("rep-total-perdas");
  const repRecoveryRateLabel = document.getElementById("rep-recovery-rate-label");
  const repRecoveryRateBar = document.getElementById("rep-recovery-rate-bar");
  const repStatusChart = document.getElementById("rep-status-chart");
  const repTableBody = document.getElementById("rep-table-body");

  // Estado da Aplicação
  let clientsData = []; // Dados lidos do XLS + Planilha Google
  let sheetStatusMap = {}; // Mapeamento de ChaveUnica (Lanço) -> Dados da Planilha
  let contatosCorrigidosMap = {}; // Mapeamento de CNPJ -> { Telefone1Correto, Telefone2Correto }
  let clientesPerfilMap = {}; // Mapeamento de CNPJ -> Perfil
  let selectedClientIndex = null;
  let selectedPhoneType = "fone1"; 
  let selectedTemplateType = "lembrete"; 
  let selectedIncluirPassoPasso = false;

  // --- 1. CONTROLE DE AUTENTICAÇÃO ---
  
  if (CONFIG.PASSWORD) {
    lockScreen.classList.add("hidden");
    appContainer.classList.remove("hidden");
    inicializarApp();
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("login-password").value.trim();
    loginError.classList.add("hidden");
    
    if (!CONFIG.APPS_SCRIPT_URL) {
      if (password === CONFIG.LOCAL_BACKUP_PASSWORD) {
        CONFIG.PASSWORD = password;
        lockScreen.classList.add("hidden");
        appContainer.classList.remove("hidden");
        showToast("Acesso local (Modo Standalone)", "info");
        inicializarApp();
      } else {
        loginError.querySelector("span").textContent = "Senha de contingência incorreta.";
        loginError.classList.remove("hidden");
      }
      return;
    }
    
    updateConnectionState(null, "Validando credenciais com o Google Sheets...");
    
    try {
      const url = `${CONFIG.APPS_SCRIPT_URL}?token=${encodeURIComponent(password)}&t=${Date.now()}`;
      const response = await fetch(url);
      const res = await response.json();
      
      if (res.error === "Não autorizado") {
        loginError.querySelector("span").textContent = "Senha incorreta ou não autorizada no Google Sheets.";
        loginError.classList.remove("hidden");
        updateConnectionState(false, "Senha incorreta.");
        return;
      }
      
      if (res.status === "success") {
        CONFIG.PASSWORD = password; 
        lockScreen.classList.add("hidden");
        appContainer.classList.remove("hidden");
        showToast("Acesso autorizado! Senha salva.", "success");
        inicializarApp();
      } else {
        throw new Error(res.error || "Resposta desconhecida da API");
      }
      
    } catch (err) {
      console.error(err);
      if (password === CONFIG.LOCAL_BACKUP_PASSWORD) {
        CONFIG.PASSWORD = password;
        lockScreen.classList.add("hidden");
        appContainer.classList.remove("hidden");
        showToast("Acesso local (Erro de rede / Standalone)", "warning");
        inicializarApp();
      } else {
        loginError.querySelector("span").textContent = "Erro de conexão com o Google Sheets. Use a senha de contingência para acesso offline.";
        loginError.classList.remove("hidden");
        updateConnectionState(false, "Erro de conexão na autenticação.");
      }
    }
  });

  logoutBtn.addEventListener("click", () => {
    CONFIG.PASSWORD = null;
    window.location.reload();
  });

  // --- 2. GESTÃO DE ABAS (TABS) ---
  
  const navTabs = document.querySelectorAll(".nav-tab");
  const tabContents = document.querySelectorAll(".tab-content");

  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetTab = tab.getAttribute("data-tab");
      
      navTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      tabContents.forEach(content => {
        content.classList.remove("active");
        if (content.id === `tab-content-${targetTab}`) {
          content.classList.add("active");
        }
      });

      if (targetTab === "relatorios") {
        gerarRelatoriosMensais();
      }
    });
  });

  // --- 3. INICIALIZAÇÃO ---
  
  function inicializarApp() {
    configScriptUrl.value = CONFIG.APPS_SCRIPT_URL;

    if (syncStartDateInput && syncEndDateInput) {
      const today = new Date();
      const fifteenDaysAgo = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
      
      const formatDateForInput = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      syncStartDateInput.value = formatDateForInput(fifteenDaysAgo);
      syncEndDateInput.value = formatDateForInput(today);
    }

    buscarHistoricoSheets();
  }

  // --- 4. INTEGRAÇÃO GOOGLE SHEETS ---
  
  function updateConnectionState(success, message) {
    if (!connectionStatus) return;
    
    let dotColor = "bg-amber-500 animate-pulse";
    let textColor = "text-slate-400";
    
    if (success === true) {
      dotColor = "bg-emerald-500";
      textColor = "text-emerald-400";
    } else if (success === false) {
      dotColor = "bg-rose-500";
      textColor = "text-rose-400";
    }
    
    connectionStatus.innerHTML = `
      <span class="w-2.5 h-2.5 rounded-full ${dotColor}"></span>
      <span class="${textColor} font-medium">${message}</span>
    `;
  }

  async function buscarHistoricoSheets() {
    if (!CONFIG.APPS_SCRIPT_URL) {
      updateConnectionState(false, "Modo Standalone (Offline. Saldo local).");
      carregarHistoricoLocal();
      return;
    }
    
    updateConnectionState(null, "Sincronizando com a Planilha Google...");
    
    try {
      let url = `${CONFIG.APPS_SCRIPT_URL}?token=${encodeURIComponent(CONFIG.PASSWORD)}&t=${Date.now()}`;
      
      const startDateVal = syncStartDateInput ? syncStartDateInput.value : "";
      const endDateVal = syncEndDateInput ? syncEndDateInput.value : "";
      
      if (startDateVal) url += `&startDate=${encodeURIComponent(startDateVal)}`;
      if (endDateVal) url += `&endDate=${encodeURIComponent(endDateVal)}`;
      
      const response = await fetch(url);
      const res = await response.json();
      
      if (res.error === "Não autorizado") {
        updateConnectionState(false, "Acesso não autorizado.");
        showToast("Sessão expirada. Senha incorreta ou alterada.", "danger");
        CONFIG.PASSWORD = null;
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      
      if (res.status === "success") {
        if (!localFileLoaded) {
          clientsData = []; // clear to rebuild from cloud faturas
        }
        processarDadosSheets(res);
      } else {
        throw new Error(res.error || "Resposta inválida");
      }
    } catch (err) {
      console.error(err);
      updateConnectionState(false, "Falha de sincronização. Usando dados locais.");
      carregarHistoricoLocal();
    }
  }

  function processarDadosSheets(res) {
    sheetStatusMap = {};
    contatosCorrigidosMap = {};
    clientesPerfilMap = {};

    if (res.cobrancas) {
      res.cobrancas.forEach(row => {
        const lancoKey = String(row.Lancamento || row.ChaveUnica || "").trim();
        if (lancoKey) {
          sheetStatusMap[lancoKey] = {
            status: row.Status,
            telefoneCobrado: row.TelefoneCobrado,
            observacao: row.Observacao,
            dataAlteracao: row.DataAlteracao
          };
        }
      });
    }

    if (res.contatosCorretos) {
      res.contatosCorretos.forEach(row => {
        const key = String(row.Codigo || row.CNPJ || "").trim();
        if (key) {
          contatosCorrigidosMap[key] = {
            Telefone1Correto: row.Telefone1Correto || "",
            Telefone2Correto: row.Telefone2Correto || "",
            Codigo: row.Codigo || "",
            NomeContato: row.NomeContato || "",
            Fone1Confirmado: row.Fone1Confirmado || "NÃO",
            Fone2Confirmado: row.Fone2Confirmado || "NÃO",
            Cliente: row.Cliente || "",
            CNPJ: row.CNPJ || ""
          };
        }
      });
    }

    if (res.perfis) {
      res.perfis.forEach(row => {
        const key = String(row.Codigo || row.CNPJ || "").trim();
        if (key) {
          clientesPerfilMap[key] = {
            Codigo: row.Codigo || "",
            CNPJ: row.CNPJ || "",
            Cliente: row.Cliente,
            EsqueceBoleto: row.EsqueceBoleto || "NÃO",
            DificuldadeAutoatendimento: row.DificuldadeAutoatendimento || "NÃO",
            TotalFaturas: parseInt(row.TotalFaturas) || 0,
            TotalAtrasos: parseInt(row.TotalAtrasos) || 0,
            UltimaOcorrencia: row.UltimaOcorrencia || "",
            TelefonePlanilha1: row.TelefonePlanilha1 || "",
            TelefonePlanilha2: row.TelefonePlanilha2 || ""
          };
        }
      });
    }

    // Reconstituir matriz operacional a partir da nuvem caso nenhuma planilha local tenha sido fornecida
    if (clientsData.length === 0 && res.cobrancas && res.cobrancas.length > 0) {
      clientsData = res.cobrancas.map(row => {
        const lancoKey = String(row.Lancamento || row.ChaveUnica || "").trim();
        const clientCode = String(row.CodCliente || row.Codigo || "").trim();

        // Tentar obter fones originais salvos no perfil do cliente
        let planilhaFone1 = { valido: false, formatado: "" };
        let planilhaFone2 = { valido: false, formatado: "" };
        const perfil = clientCode ? clientesPerfilMap[clientCode] : null;
        if (perfil) {
          if (perfil.TelefonePlanilha1) planilhaFone1 = formatarTelefone(perfil.TelefonePlanilha1);
          if (perfil.TelefonePlanilha2) planilhaFone2 = formatarTelefone(perfil.TelefonePlanilha2);
        }

        let contato = null;
        if (clientCode) {
          contato = contatosCorrigidosMap[clientCode];
        }
        if (!contato) {
          for (const key in contatosCorrigidosMap) {
            if (contatosCorrigidosMap[key].Cliente === row.Cliente) {
              contato = contatosCorrigidosMap[key];
              break;
            }
          }
        }
        if (!contato) {
          contato = { Telefone1Correto: "", Telefone2Correto: "", Codigo: clientCode, NomeContato: "", Fone1Confirmado: "NÃO", Fone2Confirmado: "NÃO", CNPJ: "" };
        }

        let fone1 = contato.Telefone1Correto ? formatarTelefone(contato.Telefone1Correto) : planilhaFone1;
        let fone2 = contato.Telefone2Correto ? formatarTelefone(contato.Telefone2Correto) : planilhaFone2;

        return {
          ChaveUnica: lancoKey,
          Lanco: lancoKey,
          Codigo: clientCode || contato.Codigo || "",
          Cliente: row.Cliente,
          ClienteOriginal: row.Cliente,
          CNPJ: contato.CNPJ || "",
          Emissao: formatarDataExcel(row.Emissao),
          Vencimento: formatarDataExcel(row.Vencimento),
          Valor: parseFloat(row.Valor) || 0,
          Parcela: String(row.Parcela || "1"),
          PlanilhaFone1: planilhaFone1,
          PlanilhaFone2: planilhaFone2,
          Fone1: fone1,
          Fone2: fone2,
          Fone1Confirmado: contato.Fone1Confirmado || "NÃO",
          Fone2Confirmado: contato.Fone2Confirmado || "NÃO",
          NomeContato: contato.NomeContato || "",
          NF: "",
          Vendedor: "",
          Status: row.Status || "Pendente",
          TelefoneCobrado: row.TelefoneCobrado || "",
          Observacao: row.Observacao || "",
          Historico: []
        };
      });
    }

    if (res.logs && res.logs.length > 0) {
      const lastLog = res.logs[res.logs.length - 1];
      const opSpan = document.getElementById("operator-display-name");
      const perSpan = document.getElementById("operator-display-period");
      if (opSpan) opSpan.textContent = lastLog.Operador || "ISABELA GIOVANNA DE OLIVEIRA";
      if (perSpan) perSpan.textContent = lastLog.Periodo || "Não identificado";
    }

    updateConnectionState(true, "Planilha sincronizada!");
    
    // Filtrar dados locais pelo intervalo de datas definido na UI
    if (clientsData.length > 0) {
      const startVal = syncStartDateInput ? syncStartDateInput.value : "";
      const endVal   = syncEndDateInput   ? syncEndDateInput.value   : "";
      if (startVal || endVal) {
        const parseYMD = (s) => { if (!s) return null; const [y,m,d] = s.split("-"); return new Date(y, m-1, d); };
        const parseDBR = (s) => { if (!s) return null; const [d,m,y] = s.split("/"); return new Date(y, m-1, d); };
        const startDate = parseYMD(startVal);
        const endDate   = parseYMD(endVal);
        if (startDate || endDate) {
          clientsData = clientsData.filter(c => {
            const venc = parseDBR(c.Vencimento);
            if (!venc) return true; // sem data, mantém
            if (startDate && venc < startDate) return false;
            if (endDate   && venc > endDate)   return false;
            return true;
          });
        }
      }
      mesclarStatusComExcel();
      renderClientsTable();
      updateStats();
      carregarOpcoesMesesRelatorio();
      if (selectedClientIndex !== null) {
        inspecionarCliente(selectedClientIndex);
      }
    }
  }

  async function salvarStatusSheetsMultiplos(clients, baseClientForContactAndPerfil) {
    const clientKey = String(baseClientForContactAndPerfil.Codigo || baseClientForContactAndPerfil.CNPJ || "").trim();
    const perfil = (clientKey && clientesPerfilMap[clientKey]) || { EsqueceBoleto: "NÃO", DificuldadeAutoatendimento: "NÃO" };
    const faturasCliente = clientsData.filter(c => {
      if (baseClientForContactAndPerfil.Codigo && c.Codigo === baseClientForContactAndPerfil.Codigo) return true;
      if (baseClientForContactAndPerfil.CNPJ && c.CNPJ === baseClientForContactAndPerfil.CNPJ) return true;
      return false;
    });
    const totalFaturas = faturasCliente.length || 1;
    const totalAtrasos = faturasCliente.filter(c => c.Status === "Pendente" || c.Status === "Não Pago" || c.Status === "Sem Resposta").length;

    const tPlan1 = (baseClientForContactAndPerfil.PlanilhaFone1 && baseClientForContactAndPerfil.PlanilhaFone1.valido) ? baseClientForContactAndPerfil.PlanilhaFone1.exibicao : (perfil.TelefonePlanilha1 || "");
    const tPlan2 = (baseClientForContactAndPerfil.PlanilhaFone2 && baseClientForContactAndPerfil.PlanilhaFone2.valido) ? baseClientForContactAndPerfil.PlanilhaFone2.exibicao : (perfil.TelefonePlanilha2 || "");

    const payload = {
      token: CONFIG.PASSWORD,
      action: "salvar_ocorrencia",
      cobrancas: clients.map(client => ({
        CodCliente: client.Codigo || "",
        Lancamento: client.ChaveUnica,
        Cliente: client.Cliente,
        Emissao: client.Emissao,
        Vencimento: client.Vencimento,
        Valor: client.Valor,
        Parcela: client.Parcela,
        TelefoneCobrado: client.TelefoneCobrado || "",
        Status: client.Status,
        Observacao: client.Observacao || "" 
      })),
      contato: {
        Codigo: baseClientForContactAndPerfil.Codigo || "",
        CNPJ: baseClientForContactAndPerfil.CNPJ || "",
        Cliente: baseClientForContactAndPerfil.Cliente,
        Telefone1Correto: (baseClientForContactAndPerfil.Fone1 && baseClientForContactAndPerfil.Fone1.valido) ? baseClientForContactAndPerfil.Fone1.exibicao : "",
        Telefone2Correto: (baseClientForContactAndPerfil.Fone2 && baseClientForContactAndPerfil.Fone2.valido) ? baseClientForContactAndPerfil.Fone2.exibicao : "",
        NomeContato: baseClientForContactAndPerfil.NomeContato || "",
        Fone1Confirmado: baseClientForContactAndPerfil.Fone1Confirmado || "NÃO",
        Fone2Confirmado: baseClientForContactAndPerfil.Fone2Confirmado || "NÃO"
      },
      perfil: {
        Codigo: baseClientForContactAndPerfil.Codigo || "",
        CNPJ: baseClientForContactAndPerfil.CNPJ || "",
        Cliente: baseClientForContactAndPerfil.Cliente,
        EsqueceBoleto: perfil.EsqueceBoleto || "NÃO",
        DificuldadeAutoatendimento: perfil.DificuldadeAutoatendimento || "NÃO",
        TotalFaturas: totalFaturas,
        TotalAtrasos: totalAtrasos,
        UltimaOcorrencia: baseClientForContactAndPerfil.Status,
        TelefonePlanilha1: tPlan1,
        TelefonePlanilha2: tPlan2
      }
    };

    clients.forEach(client => {
      sheetStatusMap[client.ChaveUnica] = {
        status: client.Status,
        telefoneCobrado: client.TelefoneCobrado,
        observacao: client.Observacao,
        dataAlteracao: new Date().toISOString().split("T")[0]
      };
    });

    if (clientKey) {
      contatosCorrigidosMap[clientKey] = {
        Telefone1Correto: (baseClientForContactAndPerfil.Fone1 && baseClientForContactAndPerfil.Fone1.valido) ? baseClientForContactAndPerfil.Fone1.exibicao : "",
        Telefone2Correto: (baseClientForContactAndPerfil.Fone2 && baseClientForContactAndPerfil.Fone2.valido) ? baseClientForContactAndPerfil.Fone2.exibicao : "",
        Codigo: baseClientForContactAndPerfil.Codigo || "",
        NomeContato: baseClientForContactAndPerfil.NomeContato || "",
        Fone1Confirmado: baseClientForContactAndPerfil.Fone1Confirmado || "NÃO",
        Fone2Confirmado: baseClientForContactAndPerfil.Fone2Confirmado || "NÃO",
        Cliente: baseClientForContactAndPerfil.Cliente || "",
        CNPJ: baseClientForContactAndPerfil.CNPJ || ""
      };
      
      clientesPerfilMap[clientKey] = {
        Codigo: baseClientForContactAndPerfil.Codigo || "",
        CNPJ: baseClientForContactAndPerfil.CNPJ || "",
        Cliente: baseClientForContactAndPerfil.Cliente,
        EsqueceBoleto: perfil.EsqueceBoleto || "NÃO",
        DificuldadeAutoatendimento: perfil.DificuldadeAutoatendimento || "NÃO",
        TotalFaturas: totalFaturas,
        TotalAtrasos: totalAtrasos,
        UltimaOcorrencia: baseClientForContactAndPerfil.Status,
        TelefonePlanilha1: tPlan1,
        TelefonePlanilha2: tPlan2
      };
    }

    salvarHistoricoLocal();

    if (!CONFIG.APPS_SCRIPT_URL) {
      showToast("Salvo localmente (Modo Standalone)", "info");
      return;
    }

    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      showToast("Sincronizado com o Google Sheets!", "success");
    } catch (err) {
      console.error(err);
      showToast("Salvo localmente (erro de conexão)", "warning");
    }
  }

  async function salvarStatusSheets(client) {
    return salvarStatusSheetsMultiplos([client], client);
  }

  async function salvarLogImportacao(filename, count, totalValue, operator, period) {
    if (!CONFIG.APPS_SCRIPT_URL) return;

    const payload = {
      token: CONFIG.PASSWORD,
      action: "log_import",
      filename: filename,
      count: count,
      totalValue: totalValue,
      operator: operator || "ISABELA GIOVANNA DE OLIVEIRA",
      period: period || ""
    };

    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      showToast("Carga registrada no Sheets!", "success");
    } catch (err) {
      console.error("Erro ao registrar log de importacao:", err);
    }
  }

  function carregarHistoricoLocal() {
    const local = localStorage.getItem("cobranca_local_history");
    if (local) {
      sheetStatusMap = JSON.parse(local);
    }
    const contatosLocal = localStorage.getItem("cobranca_local_contatos");
    if (contatosLocal) {
      contatosCorrigidosMap = JSON.parse(contatosLocal);
    }
    const perfisLocal = localStorage.getItem("cobranca_local_perfis");
    if (perfisLocal) {
      clientesPerfilMap = JSON.parse(perfisLocal);
    }
  }

  function salvarHistoricoLocal() {
    localStorage.setItem("cobranca_local_history", JSON.stringify(sheetStatusMap));
    localStorage.setItem("cobranca_local_contatos", JSON.stringify(contatosCorrigidosMap));
    localStorage.setItem("cobranca_local_perfis", JSON.stringify(clientesPerfilMap));
  }

  configSaveBtn.addEventListener("click", () => {
    const url = configScriptUrl.value.trim();
    CONFIG.APPS_SCRIPT_URL = url;
    showToast("Endpoint salvo!", "success");
    buscarHistoricoSheets();
  });

  // --- 5. MOTOR DE PARSING HIERÁRQUICO (fin_receber_clientes01.xls) ---
  
  uploadZone.addEventListener("click", () => excelFileInput.click());
  excelFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) processarArquivoExcel(file);
  });

  function processarArquivoExcel(file) {
    fileInfo.textContent = `Processando: ${file.name}...`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawRows.length < 2) {
          showToast("A planilha está vazia.", "danger");
          return;
        }

        localFileLoaded = true;
        if (cloudPushBtn) {
          cloudPushBtn.classList.remove("hidden");
        }

        // Extrair operador e período robustamente
        let operator = "";
        let period = "";

        for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
          const row = rawRows[i];
          if (!row) continue;
          
          if (i === 0) {
            if (row[12]) {
              operator = String(row[12]).trim();
            }
            if (!operator) {
              for (let j = 0; j < row.length; j++) {
                const val = String(row[j] || "").trim();
                if (val.includes("ISABELA") || val.includes("GIOVANNA") || val.includes("OLIVEIRA")) {
                  operator = val;
                  break;
                }
              }
            }
          }
          
          for (let j = 0; j < row.length; j++) {
            const val = String(row[j] || "").trim();
            if (/per[íi\ufffd]odo/i.test(val)) {
              period = val;
            }
          }
        }
        
        if (!operator) {
          operator = "ISABELA GIOVANNA DE OLIVEIRA";
        }
        if (!period) {
          period = "PERÍODO: Não identificado";
        }

        // Exibir na tela
        const opSpan = document.getElementById("operator-display-name");
        const perSpan = document.getElementById("operator-display-period");
        if (opSpan) opSpan.textContent = operator;
        if (perSpan) perSpan.textContent = period;

        // Pré-analisar duplicidades e períodos
        let totalFaturasPlanilha = 0;
        let faturasJaNoBancoCount = 0;
        let currentCustomerForCheck = null;
        let minDateStr = null;
        let maxDateStr = null;

        for (let r = 0; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;
          const cell0 = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : "";
          
          if (cell0.includes("CNPJ / CPF:") && cell0.includes("Fone:")) {
            const parts = cell0.split("|").map(p => p.trim());
            let originalName = parts[0] || "";
            let code = "";
            const dashIndex = originalName.indexOf("-");
            if (dashIndex !== -1) {
              code = originalName.split("-")[0].trim().replace(/\s+/g, "");
            }
            currentCustomerForCheck = { code };
            continue;
          }

          const lanco = parseFloat(cell0);
          if (currentCustomerForCheck && !isNaN(lanco) && lanco > 1000) {
            const vencimentoRaw = row[2];
            if (vencimentoRaw) {
              let vencimento = formatarDataExcel(vencimentoRaw);
              if (vencimento) {
                const parts = vencimento.split("/");
                const date = new Date(parts[2], parts[1] - 1, parts[0]);
                if (!isNaN(date.getTime())) {
                  if (!minDateStr || date < minDateStr) minDateStr = date;
                  if (!maxDateStr || date > maxDateStr) maxDateStr = date;
                }
              }
            }
            
            let chaveUnica = String(Math.round(lanco));
            totalFaturasPlanilha++;
            if (sheetStatusMap[chaveUnica]) {
              faturasJaNoBancoCount++;
            }
          }
        }

        let periodStart = minDateStr;
        let periodEnd = maxDateStr;

        if (period && period.includes("PERÍODO:")) {
          const matchDates = period.match(/(\d{2})\/(\d{2})\/(\d{4})/g);
          if (matchDates && matchDates.length >= 2) {
            const p1 = matchDates[0].split("/");
            const p2 = matchDates[1].split("/");
            const d1 = new Date(p1[2], p1[1] - 1, p1[0]);
            const d2 = new Date(p2[2], p2[1] - 1, p2[0]);
            if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
              periodStart = d1;
              periodEnd = d2;
            }
          }
        }

        const aplicarCargaLocal = () => {
          mapearEParsarLinhas(rawRows);
          fileInfo.textContent = `${file.name} (${clientsData.length} faturas)`;
          showToast("Dados processados com sucesso!", "success");
          const totalValor = clientsData.reduce((acc, c) => acc + c.Valor, 0);
          salvarLogImportacao(file.name, clientsData.length, totalValor, operator, period);
        };

        if (faturasJaNoBancoCount > 0) {
          const importAlertModal = document.getElementById("import-alert-modal");
          const modalDupCount = document.getElementById("modal-dup-count");
          const modalTotalCount = document.getElementById("modal-total-count");
          const modalPeriod = document.getElementById("modal-period");
          const modalBtnCloud = document.getElementById("modal-btn-cloud");
          const modalBtnLocal = document.getElementById("modal-btn-local");
          const modalBtnCancel = document.getElementById("modal-btn-cancel");

          if (importAlertModal) {
            modalDupCount.textContent = faturasJaNoBancoCount;
            modalTotalCount.textContent = totalFaturasPlanilha;
            modalPeriod.textContent = period || (periodStart && periodEnd ? `${periodStart.toLocaleDateString("pt-BR")} A ${periodEnd.toLocaleDateString("pt-BR")}` : "Não identificado");
            
            importAlertModal.classList.remove("hidden");

            // Substituir botões por clones para limpar ouvintes de eventos antigos
            const newCloudBtn = modalBtnCloud.cloneNode(true);
            const newLocalBtn = modalBtnLocal.cloneNode(true);
            const newCancelBtn = modalBtnCancel.cloneNode(true);

            modalBtnCloud.parentNode.replaceChild(newCloudBtn, modalBtnCloud);
            modalBtnLocal.parentNode.replaceChild(newLocalBtn, modalBtnLocal);
            modalBtnCancel.parentNode.replaceChild(newCancelBtn, modalBtnCancel);

            newCloudBtn.addEventListener("click", () => {
              importAlertModal.classList.add("hidden");
              if (periodStart && periodEnd) {
                const formatDate = (d) => {
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${y}-${m}-${day}`;
                };
                syncStartDateInput.value = formatDate(periodStart);
                syncEndDateInput.value = formatDate(periodEnd);
              }
              buscarHistoricoSheets();
            });

            newLocalBtn.addEventListener("click", () => {
              importAlertModal.classList.add("hidden");
              aplicarCargaLocal();
            });

            newCancelBtn.addEventListener("click", () => {
              importAlertModal.classList.add("hidden");
              fileInfo.textContent = "Importação cancelada";
              localFileLoaded = false;
              if (cloudPushBtn) cloudPushBtn.classList.add("hidden");
            });
          } else {
            aplicarCargaLocal();
          }
        } else {
          aplicarCargaLocal();
        }

      } catch (err) {
        console.error(err);
        showToast("Erro ao ler arquivo Excel.", "danger");
        fileInfo.textContent = "Nenhum arquivo carregado";
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function limparRazaoSocial(razao) {
    if (!razao) return "";
    return String(razao)
      .replace(/\s+\d+\s*$/g, "") 
      .replace(/\b\d{4,}\b/g, "") 
      .replace(/\s+/g, " ")      
      .trim();
  }

  function formatarTelefone(telefoneRaw) {
    if (!telefoneRaw) return { valido: false, formatado: "" };
    
    let clean = String(telefoneRaw).toLowerCase();
    if (clean.includes("invalido") || clean.includes("inválido") || clean.includes("inval")) {
      return { valido: false, formatado: "Inválido" };
    }
    
    let numeros = clean.replace(/\D/g, "");
    
    if (numeros.length < 10 || numeros.length > 11) {
      return { valido: false, formatado: `Inválido (${numeros})` };
    }
    
    let exibicao = "";
    if (numeros.length === 10) {
      exibicao = `(${numeros.substring(0,2)}) ${numeros.substring(2,6)}-${numeros.substring(6)}`;
    } else {
      exibicao = `(${numeros.substring(0,2)}) ${numeros.substring(2,7)}-${numeros.substring(7)}`;
    }
    
    return {
      valido: true,
      formatado: `55${numeros}`,
      exibicao: exibicao
    };
  }

  function formatarDataExcel(val) {
    if (!val) return "";
    if (typeof val === "number") {
      let date = new Date(Math.round((val - 25569) * 86400 * 1000));
      let day = String(date.getUTCDate()).padStart(2, '0');
      let month = String(date.getUTCMonth() + 1).padStart(2, '0');
      let year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
    
    let str = String(val).trim();
    if (str.includes("/")) return str; 
    
    let parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      let d = new Date(parsed);
      let day = String(d.getUTCDate()).padStart(2, '0');
      let month = String(d.getUTCMonth() + 1).padStart(2, '0');
      let year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
    return str;
  }

  function mapearEParsarLinhas(matrix) {
    clientsData = [];
    let currentCustomer = null;

    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      const cell0 = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : "";

      if (cell0.includes("CNPJ / CPF:") && cell0.includes("Fone:")) {
        const parts = cell0.split("|").map(p => p.trim());
        
        let originalName = parts[0] || "";
        let nameWithoutCode = originalName;
        let code = "";
        
        const dashIndex = originalName.indexOf("-");
        if (dashIndex !== -1) {
          const possibleCode = originalName.split("-")[0].trim().replace(/\s+/g, "");
          code = possibleCode;
          nameWithoutCode = originalName.substring(dashIndex + 1).trim();
        }
        
        let cleanedName = limparRazaoSocial(nameWithoutCode);

        let cnpj = "";
        if (parts[1]) {
          cnpj = parts[1].replace("CNPJ / CPF:", "").trim();
        }

        let fone1 = { valido: false, formatado: "" };
        let fone2 = { valido: false, formatado: "" };
        
        if (parts[2]) {
          const phoneString = parts[2].replace("Fone:", "").trim();
          const phoneParts = phoneString.split(/[\/|,]/).map(p => p.trim());
          if (phoneParts[0]) fone1 = formatarTelefone(phoneParts[0]);
          if (phoneParts[1]) fone2 = formatarTelefone(phoneParts[1]);
        }

        currentCustomer = {
          name: cleanedName,
          originalName: originalName,
          cnpj: cnpj,
          code: code,
          fone1: fone1,
          fone2: fone2
        };
        continue;
      }

      const lanco = parseFloat(cell0);
      if (currentCustomer && !isNaN(lanco) && lanco > 1000) {
        const emissaoRaw = row[1];
        const vencimentoRaw = row[2];
        
        if (emissaoRaw && vencimentoRaw) {
          let emissao = formatarDataExcel(emissaoRaw);
          let vencimento = formatarDataExcel(vencimentoRaw);
          
          let valorLiq = row[3] ? parseFloat(String(row[3]).replace(/[^\d,.-]/g, "").replace(",", ".")) : 0;
          let juros = row[5] ? parseFloat(String(row[5]).replace(/[^\d,.-]/g, "").replace(",", ".")) : 0;
          let valorTotal = row[6] ? parseFloat(String(row[6]).replace(/[^\d,.-]/g, "").replace(",", ".")) : 0;
          
          let valor = valorTotal > 0 ? valorTotal : valorLiq;
          let parcela = row[7] ? String(row[7]).trim() : "1";
          let nf = row[14] ? String(row[14]).trim() : "";
          let vendedor = row[16] ? String(row[16]).trim() : "";

          let chaveUnica = String(Math.round(lanco));

          clientsData.push({
            ChaveUnica: chaveUnica,
            Lanco: chaveUnica,
            Codigo: currentCustomer.code, // ERP Client Code
            Cliente: currentCustomer.name,
            ClienteOriginal: currentCustomer.originalName,
            CNPJ: currentCustomer.cnpj,
            Emissao: emissao,
            Vencimento: vencimento,
            Valor: valor,
            Parcela: parcela,
            PlanilhaFone1: currentCustomer.fone1,
            PlanilhaFone2: currentCustomer.fone2,
            Fone1: currentCustomer.fone1,
            Fone2: currentCustomer.fone2,
            NF: nf,
            Vendedor: vendedor,
            Status: "Pendente", 
            TelefoneCobrado: "",
            Observacao: "", 
            Historico: []   
          });
        }
      }
    }

    mesclarStatusComExcel();
    renderClientsTable();
    updateStats();
    carregarOpcoesMesesRelatorio();
  }

  function mesclarStatusComExcel() {
    clientsData.forEach(client => {
      // 1. Obter telefones originais da planilha se não estiverem preenchidos no objeto (ex: quando carregado da nuvem)
      const clientKey = String(client.Codigo || client.CNPJ || "").trim();
      const perfil = clientKey ? clientesPerfilMap[clientKey] : null;
      if (perfil) {
        if (perfil.TelefonePlanilha1 && (!client.PlanilhaFone1 || !client.PlanilhaFone1.valido)) {
          client.PlanilhaFone1 = formatarTelefone(perfil.TelefonePlanilha1);
        }
        if (perfil.TelefonePlanilha2 && (!client.PlanilhaFone2 || !client.PlanilhaFone2.valido)) {
          client.PlanilhaFone2 = formatarTelefone(perfil.TelefonePlanilha2);
        }
      }

      // Inicializa Fone1 e Fone2 com os da planilha por padrão
      client.Fone1 = client.PlanilhaFone1 || { valido: false, formatado: "" };
      client.Fone2 = client.PlanilhaFone2 || { valido: false, formatado: "" };

      // Cruzar telefones corrigidos se houver
      const contatoCorrigido = (client.Codigo && contatosCorrigidosMap[client.Codigo]) || contatosCorrigidosMap[client.CNPJ];
      if (contatoCorrigido) {
        if (contatoCorrigido.Telefone1Correto) client.Fone1 = formatarTelefone(contatoCorrigido.Telefone1Correto);
        if (contatoCorrigido.Telefone2Correto) client.Fone2 = formatarTelefone(contatoCorrigido.Telefone2Correto);
        if (contatoCorrigido.Codigo) client.Codigo = contatoCorrigido.Codigo;
        if (contatoCorrigido.NomeContato) client.NomeContato = contatoCorrigido.NomeContato;
        client.Fone1Confirmado = contatoCorrigido.Fone1Confirmado || "NÃO";
        client.Fone2Confirmado = contatoCorrigido.Fone2Confirmado || "NÃO";
      } else {
        client.Fone1Confirmado = "NÃO";
        client.Fone2Confirmado = "NÃO";
      }

      const match = sheetStatusMap[client.ChaveUnica];
      if (match) {
        client.Status = match.status || "Pendente";
        client.TelefoneCobrado = match.telefoneCobrado || "";
        client.Observacao = match.observacao || "";
        
        client.Historico = [];
        const obsValue = client.Observacao.trim();
        if (obsValue.startsWith("[") && obsValue.endsWith("]")) {
          try {
            client.Historico = JSON.parse(obsValue);
          } catch (e) {
            client.Historico = [{
              data: match.dataAlteracao || "",
              status: match.status || "Pendente",
              fone: match.telefoneCobrado || "",
              obs: obsValue
            }];
          }
        } else if (obsValue) {
          client.Historico = [{
            data: match.dataAlteracao || "",
            status: match.status || "Pendente",
            fone: match.telefoneCobrado || "",
            obs: obsValue
          }];
        }
      }
    });
  }

  // --- 6. TABELA, FILTROS E CONTADORES ---

  function agruparFaturasPorCliente(faturasRaw) {
    const statusPriority = {
      "Pendente": 1,
      "Não Pago": 2,
      "Mensagem Enviada": 3,
      "Sem Resposta": 4,
      "Negociando": 5,
      "Promessa": 6,
      "Incorreto": 7,
      "Pago": 8
    };
    
    const agrupado = faturasRaw.reduce((acc, fatura) => {
      const key = String(fatura.Codigo || fatura.CNPJ || fatura.Cliente).trim();
      if (!acc[key]) {
        acc[key] = {
          Codigo: fatura.Codigo,
          Cliente: fatura.Cliente,
          ClienteOriginal: fatura.ClienteOriginal,
          CNPJ: fatura.CNPJ,
          NomeContato: fatura.NomeContato || "",
          Fone1: fatura.Fone1,
          Fone2: fatura.Fone2,
          PlanilhaFone1: fatura.PlanilhaFone1,
          PlanilhaFone2: fatura.PlanilhaFone2,
          Fone1Confirmado: fatura.Fone1Confirmado || "NÃO",
          Fone2Confirmado: fatura.Fone2Confirmado || "NÃO",
          ValorTotalAcumulado: 0,
          Status: fatura.Status,
          Titulos: []
        };
      }
      acc[key].ValorTotalAcumulado += fatura.Valor;
      acc[key].Titulos.push(fatura);
      
      const currentPrio = statusPriority[acc[key].Status] || 99;
      const newPrio = statusPriority[fatura.Status] || 99;
      if (newPrio < currentPrio) {
        acc[key].Status = fatura.Status;
      }
      return acc;
    }, {});
    
    return Object.values(agrupado);
  }

  function calcularDiasAtraso(vencimentoStr) {
    if (!vencimentoStr) return 0;
    const parts = vencimentoStr.split("/");
    if (parts.length !== 3) return 0;
    const dateVenc = new Date(parts[2], parts[1] - 1, parts[0]);
    dateVenc.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - dateVenc.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  function obterMelhorTelefone(client) {
    const clientKey = String(client.Codigo || client.CNPJ || "").trim();
    const contatoCorrigido = contatosCorrigidosMap[clientKey];

    // Priority 1: Corrected Phone 1 (Confirmed)
    if (contatoCorrigido && contatoCorrigido.Fone1Confirmado === "SIM" && contatoCorrigido.Telefone1Correto) {
      const formatted = formatarTelefone(contatoCorrigido.Telefone1Correto);
      if (formatted.valido) return { type: "corrigido1", phone: formatted, confirmed: true };
    }

    // Priority 2: Corrected Phone 2 (Confirmed)
    if (contatoCorrigido && contatoCorrigido.Fone2Confirmado === "SIM" && contatoCorrigido.Telefone2Correto) {
      const formatted = formatarTelefone(contatoCorrigido.Telefone2Correto);
      if (formatted.valido) return { type: "corrigido2", phone: formatted, confirmed: true };
    }

    // Priority 3: Corrected Phone 1 (even if not confirmed)
    if (contatoCorrigido && contatoCorrigido.Telefone1Correto) {
      const formatted = formatarTelefone(contatoCorrigido.Telefone1Correto);
      if (formatted.valido) return { type: "corrigido1", phone: formatted, confirmed: false };
    }

    // Priority 4: Corrected Phone 2 (even if not confirmed)
    if (contatoCorrigido && contatoCorrigido.Telefone2Correto) {
      const formatted = formatarTelefone(contatoCorrigido.Telefone2Correto);
      if (formatted.valido) return { type: "corrigido2", phone: formatted, confirmed: false };
    }

    // Priority 5: Original Phone 1 from spreadsheet (if valid)
    if (client.PlanilhaFone1 && client.PlanilhaFone1.valido) {
      return { type: "planilha1", phone: client.PlanilhaFone1, confirmed: false };
    }

    // Priority 6: Original Phone 2 from spreadsheet (if valid)
    if (client.PlanilhaFone2 && client.PlanilhaFone2.valido) {
      return { type: "planilha2", phone: client.PlanilhaFone2, confirmed: false };
    }

    // Fallback: Check Fone1/Fone2 properties on client directly
    if (client.Fone1 && client.Fone1.valido) {
      return { type: "fone1", phone: client.Fone1, confirmed: client.Fone1Confirmado === "SIM" };
    }
    if (client.Fone2 && client.Fone2.valido) {
      return { type: "fone2", phone: client.Fone2, confirmed: client.Fone2Confirmado === "SIM" };
    }

    return null;
  }

  function obterFaturaMaisAntiga(client) {
    const pendentes = client.Titulos.filter(t =>
      t.Status !== "Pago" && t.Status !== "Negociando" && t.Status !== "Promessa"
    );
    const targetList = pendentes.length > 0 ? pendentes : client.Titulos;
    
    if (targetList.length === 0) return null;
    
    const parseDate = (dStr) => {
      if (!dStr) return 0;
      const parts = dStr.split("/");
      return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    };

    return [...targetList].sort((a, b) => parseDate(a.Vencimento) - parseDate(b.Vencimento))[0];
  }

  function ordenarFaturasPorStatus(faturas) {
    const statusGroup = (status) => {
      const s = String(status || "").toLowerCase();
      if (s === "pago") return 3;
      if (s === "negociando" || s === "promessa") return 2;
      return 1; // Pendentes
    };
    
    const parseDate = (dStr) => {
      if (!dStr) return 0;
      const parts = dStr.split("/");
      return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    };

    return [...faturas].sort((a, b) => {
      const groupA = statusGroup(a.Status);
      const groupB = statusGroup(b.Status);
      if (groupA !== groupB) return groupA - groupB;
      return parseDate(a.Vencimento) - parseDate(b.Vencimento);
    });
  }

  
  function renderClientsTable() {
    clientsTableBody.innerHTML = "";
    
    const query = searchInput.value.toLowerCase().trim();
    const filter = statusFilter.value;

    const filtered = clientsData.filter(c => {
      const lanco  = String(c.Lanco  || c.ChaveUnica || "");
      const nf     = String(c.NF     || "");
      const codigo = String(c.Codigo || "");
      const matchesQuery = !query ||
                           c.Cliente.toLowerCase().includes(query) ||
                           c.Parcela.toLowerCase().includes(query) ||
                           lanco.includes(query) ||
                           nf.toLowerCase().includes(query) ||
                           (codigo && codigo.toLowerCase().includes(query)) ||
                           (c.Fone1 && c.Fone1.formatado && c.Fone1.formatado.includes(query)) ||
                           (c.Fone1 && c.Fone1.exibicao && c.Fone1.exibicao.includes(query)) ||
                           (c.Fone2 && c.Fone2.formatado && c.Fone2.formatado.includes(query)) ||
                           (c.Fone2 && c.Fone2.exibicao && c.Fone2.exibicao.includes(query)) ||
                           (c.PlanilhaFone1 && c.PlanilhaFone1.formatado && c.PlanilhaFone1.formatado.includes(query)) ||
                           (c.PlanilhaFone2 && c.PlanilhaFone2.formatado && c.PlanilhaFone2.formatado.includes(query)) ||
                           (c.PlanilhaFone1 && c.PlanilhaFone1.exibicao && c.PlanilhaFone1.exibicao.includes(query)) ||
                           (c.PlanilhaFone2 && c.PlanilhaFone2.exibicao && c.PlanilhaFone2.exibicao.includes(query));
      const matchesStatus = filter === "todos" || c.Status.toLowerCase() === filter;
      return matchesQuery && matchesStatus;
    });

    if (filtered.length === 0) {
      clientsTableBody.innerHTML = `
        <div class="text-center py-8 text-slate-550">
          Nenhum devedor encontrado.
        </div>
      `;
      return;
    }

    const grouped = agruparFaturasPorCliente(filtered);

    const parseDate = (dStr) => {
      if (!dStr) return 0;
      const parts = dStr.split("/");
      return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    };

    grouped.sort((a, b) => {
      const fatA = obterFaturaMaisAntiga(a);
      const fatB = obterFaturaMaisAntiga(b);
      if (!fatA && !fatB) return 0;
      if (!fatA) return 1;
      if (!fatB) return -1;
      return parseDate(fatA.Vencimento) - parseDate(fatB.Vencimento);
    });


    grouped.forEach((c) => {
      const realIndex = clientsData.findIndex(orig => orig.ChaveUnica === c.Titulos[0].ChaveUnica);
      const isSelected = selectedClientIndex !== null && c.Titulos.some(t => t.ChaveUnica === clientsData[selectedClientIndex].ChaveUnica);
      const card = document.createElement("div");
      card.className = `client-card ${isSelected ? 'selected' : ''}`;
      
      const statusClass = c.Status.toLowerCase().replace(/\s+/g, "-");
      const cadastradosNoBanco = c.Titulos.filter(t => sheetStatusMap[t.ChaveUnica]);
      const temCadastroNoBanco = cadastradosNoBanco.length > 0;
      const oldestFat = obterFaturaMaisAntiga(c);
      let oldestFatHtml = "";
      
      if (oldestFat) {
        const diffDays = calcularDiasAtraso(oldestFat.Vencimento);
        let delayText = "";
        if (diffDays > 0) {
          delayText = `Vencido há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
        } else if (diffDays < 0) {
          delayText = `A vencer em ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'dia' : 'dias'}`;
        } else {
          delayText = `Vence hoje`;
        }
        oldestFatHtml = `
          <div class="text-[10.5px] text-slate-400 mt-1 leading-normal flex items-center flex-wrap gap-1">
            <span>Mais antigo:</span>
            <span class="font-bold text-cyan-400">${oldestFat.Vencimento}</span> 
            <span class="text-amber-500 font-semibold">(${delayText})</span> 
            <span>-</span>
            <span class="font-bold text-slate-200">${formatarMoeda(oldestFat.Valor)}</span>
            <span class="text-[9.5px] bg-slate-900 px-1 py-0.5 rounded text-cyan-300 font-mono" title="Código do Lançamento">Lç: ${oldestFat.Lanco}</span>
          </div>
        `;
      }
      
      card.innerHTML = `
        <div class="client-card-header">
          <div class="flex items-center gap-3 flex-1 min-w-0" style="position: relative;">
            <div class="relative w-5 h-5 flex items-center justify-center shrink-0">
              <input type="radio" name="selected-client" class="client-radio-input absolute inset-0 opacity-0 z-10 cursor-pointer" style="width: 20px; height: 20px;" value="${realIndex}" ${isSelected ? 'checked' : ''}>
              <span class="client-radio-circle">
                <span class="client-radio-inner"></span>
              </span>
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-cyan-400 font-mono font-bold text-xs shrink-0">[${c.Codigo || '--'}]</span>
                <span class="font-bold text-white text-sm leading-tight truncate max-w-[150px] md:max-w-xs">${c.Cliente}</span>
                <button class="direct-whatsapp-btn p-1 rounded-lg shrink-0 ml-1" data-client-idx="${realIndex}" title="Enviar WhatsApp diretamente (Melhor número)">
                  <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                </button>
                ${temCadastroNoBanco ? `
                  <span class="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-bold shrink-0 flex items-center gap-0.5" title="${cadastradosNoBanco.length} de ${c.Titulos.length} faturas registradas no banco de dados">
                    <i data-lucide="database" class="w-3 h-3 text-indigo-400"></i> No Banco
                  </span>
                ` : ''}
                <span class="badge-status ${statusClass} scale-75 origin-left shrink-0">
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  ${c.Status}
                </span>
              </div>
              ${oldestFatHtml}
              <div class="text-[11px] text-slate-400 font-mono mt-1">
                Total: <span class="font-bold text-rose-500">${formatarMoeda(c.ValorTotalAcumulado)}</span> (${c.Titulos.length} ${c.Titulos.length === 1 ? 'Título' : 'Títulos'})
              </div>
            </div>
          </div>
          
          <button class="accordion-toggle p-2 text-slate-500 hover:text-cyan-400 transition" data-toggle-id="${c.Codigo || c.CNPJ || c.Cliente}">
            <i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-200"></i>
          </button>
        </div>
 
        <div class="client-card-details hidden p-2.5 border-t border-slate-900/50 mt-2 bg-slate-950/20 rounded-lg">
          <div class="space-y-2">
            ${ordenarFaturasPorStatus(c.Titulos).map(t => {
 
              const diffDays = calcularDiasAtraso(t.Vencimento);
              let delayText = "";
              if (diffDays > 0) {
                delayText = `Há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
              } else if (diffDays < 0) {
                delayText = `Em ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'dia' : 'dias'}`;
              } else {
                delayText = `Vence hoje`;
              }
              const tStatusClass = t.Status.toLowerCase().replace(/\s+/g, "-");
              const noBancoTag = sheetStatusMap[t.ChaveUnica] ? `
                <span class="text-[8.5px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-1 rounded font-bold ml-1 flex items-center gap-0.5 inline-flex" title="Sincronizado na Nuvem">
                  <i data-lucide="cloud" class="w-2.5 h-2.5"></i> Nuvem
                </span>
              ` : '';
              
              const isChecked = t.Status !== "Pago";
              
              return `
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs py-2 border-b border-slate-900/40 last:border-b-0 gap-2 sm:gap-4">
                  <div class="flex items-center flex-wrap gap-1.5 min-w-0">
                    <input type="checkbox" class="accordion-fatura-check w-3.5 h-3.5 accent-cyan-500 rounded border-slate-700 bg-slate-900 cursor-pointer mr-1 shrink-0" data-chave="${t.ChaveUnica}" ${isChecked ? 'checked' : ''}>
                    <span class="font-semibold text-slate-200">Parc ${t.Parcela}</span>
                    ${t.NF ? `<span class="text-slate-500 font-mono text-[11px]">| NF ${t.NF}</span>` : ''}
                    <span class="text-slate-400 font-mono text-[11px]">(${t.Vencimento})</span>
                    <span class="text-[9.5px] bg-slate-900/80 px-1.5 py-0.5 rounded text-cyan-300 font-mono" title="Código do Lançamento">Lç ${t.Lanco}</span>
                    <span class="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-amber-500 font-semibold shrink-0">${delayText}</span>
                    ${noBancoTag}
                  </div>
                  <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-7 sm:pl-0">
                    <span class="font-mono font-bold text-white">${formatarMoeda(t.Valor)}</span>
                    <span class="badge-status ${tStatusClass} scale-90">${t.Status}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
          
          <!-- Formulário de Mudança de Status Rápido no Accordion -->
          <div class="mt-3 pt-3 border-t border-slate-900/60 flex flex-col sm:flex-row items-end gap-2 text-slate-200">
            <div class="flex-1 w-full min-w-0 grid grid-cols-2 gap-2">
              <div>
                <label class="text-[9px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Status em Lote</label>
                <select class="accordion-status-select premium-input text-[11px] p-1.5">
                  <option value="Pendente">Pendente</option>
                  <option value="Mensagem Enviada">📤 Mensagem Enviada</option>
                  <option value="Sem Resposta">Sem Resposta</option>
                  <option value="Negociando">Negociando</option>
                  <option value="Promessa">Promessa Pagto</option>
                  <option value="Não Pago">Não Pago</option>
                  <option value="Incorreto">Número Incorreto</option>
                  <option value="Pago">Pago / Resolvido</option>
                </select>
              </div>
              <div>
                <label class="text-[9px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Anotações do Lote</label>
                <input type="text" class="accordion-obs-input premium-input text-[11px] p-1.5" placeholder="Motivo/Acordo...">
              </div>
            </div>
            <button type="button" class="accordion-save-btn premium-button-secondary py-1.5 px-3 text-[11px] shrink-0 font-bold flex items-center gap-1 w-full sm:w-auto justify-center">
              Atualizar <i data-lucide="check" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
 
      const header = card.querySelector(".client-card-header");
      header.addEventListener("click", (e) => {
        if (e.target.closest(".accordion-toggle") || e.target.closest(".direct-whatsapp-btn")) return;
        
        const oldSelected = clientsTableBody.querySelector(".client-card.selected");
        if (oldSelected) oldSelected.classList.remove("selected");
        
        card.classList.add("selected");
        selectedClientIndex = realIndex;
        
        const radio = card.querySelector(".client-radio-input");
        if (radio) radio.checked = true;
        
        inspecionarCliente(realIndex);
        atualizarBotoesZenWhatsApp();
      });
 
      const directWpBtn = card.querySelector(".direct-whatsapp-btn");
      if (directWpBtn) {
        directWpBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          
          const clientObj = clientsData[realIndex];
          const melhorTel = obterMelhorTelefone(clientObj);
          if (!melhorTel || !melhorTel.phone.valido) {
            showToast("Nenhum telefone válido encontrado para este cliente.", "danger");
            return;
          }
          
          const faturasSelecionadas = clientsData.filter(f => {
            if (clientObj.CNPJ && f.CNPJ === clientObj.CNPJ) return f.Status !== "Pago";
            if (clientObj.Codigo && f.Codigo === clientObj.Codigo) return f.Status !== "Pago";
            return f.Cliente === clientObj.Cliente && f.Status !== "Pago";
          });
          
          if (faturasSelecionadas.length === 0) {
            faturasSelecionadas.push(clientObj);
          }
          
          const text = gerarMensagemWhatsApp(clientObj, faturasSelecionadas, "lembrete", clientObj.NomeContato || "", false);
          const url = `https://api.whatsapp.com/send?phone=${melhorTel.phone.formatado}&text=${encodeURIComponent(text)}`;
          window.open(url, "_blank");
          
          const dataHora = new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'});
          const msgEvent = {
            data: dataHora,
            status: "Sem Resposta",
            fone: melhorTel.phone.exibicao,
            obs: "Mensagem WhatsApp enviada diretamente do atalho do card"
          };
          
          faturasSelecionadas.forEach(fat => {
            if (fat.Status !== "Pago") {
              fat.Status = "Sem Resposta";
              fat.TelefoneCobrado = melhorTel.phone.exibicao;
              if (!fat.Historico) fat.Historico = [];
              fat.Historico.push(msgEvent);
              fat.Observacao = JSON.stringify(fat.Historico);
            }
          });
          
          salvarStatusSheetsMultiplos(faturasSelecionadas, clientObj);
          renderClientsTable();
          updateStats();
        });
      }

      // Configuração do botão salvar do accordion
      const accordionSaveBtn = card.querySelector(".accordion-save-btn");
      if (accordionSaveBtn) {
        accordionSaveBtn.addEventListener("click", () => {
          const statusSelect = card.querySelector(".accordion-status-select");
          const obsInput = card.querySelector(".accordion-obs-input");
          const statusFinal = statusSelect.value;
          const anotacaoFinal = obsInput.value.trim();
          
          const checks = card.querySelectorAll(".accordion-fatura-check");
          const faturasSelecionadas = [];
          checks.forEach(check => {
            if (check.checked) {
              const chave = check.getAttribute("data-chave");
              const fat = c.Titulos.find(f => f.ChaveUnica === chave);
              if (fat) {
                faturasSelecionadas.push(fat);
              }
            }
          });
          
          if (faturasSelecionadas.length === 0) {
            showToast("Nenhuma fatura selecionada no card.", "warning");
            return;
          }
          
          const dataHora = new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'});
          const clientObj = clientsData[realIndex];
          const melhorTel = obterMelhorTelefone(clientObj);
          const foneObj = melhorTel ? melhorTel.phone : { valido: false, formatado: "" };
          
          faturasSelecionadas.forEach(fat => {
            const novoEvento = {
              data: dataHora,
              status: statusFinal,
              fone: foneObj.valido ? foneObj.exibicao : "",
              obs: anotacaoFinal
            };
            
            fat.Status = statusFinal;
            if (foneObj.valido) {
              fat.TelefoneCobrado = foneObj.exibicao;
            }
            if (!fat.Historico) fat.Historico = [];
            fat.Historico.push(novoEvento);
            fat.Observacao = JSON.stringify(fat.Historico);
          });
          
          salvarStatusSheetsMultiplos(faturasSelecionadas, clientObj);
          renderClientsTable();
          updateStats();
          if (selectedClientIndex !== null) {
            inspecionarCliente(selectedClientIndex);
          }
          showToast(`Atualizado ${faturasSelecionadas.length} títulos com sucesso!`, "success");
        });
      }
 
      const toggleBtn = card.querySelector(".accordion-toggle");
      const detailsDiv = card.querySelector(".client-card-details");
      const chevron = toggleBtn.querySelector("i");
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = detailsDiv.classList.toggle("hidden");
        if (isHidden) {
          chevron.style.transform = "rotate(0deg)";
        } else {
          chevron.style.transform = "rotate(180deg)";
        }
      });

      clientsTableBody.appendChild(card);
    });

    lucide.createIcons();
  }

  function updateStats() {
    statsTotal.textContent = clientsData.length;
    statsPendentes.textContent = clientsData.filter(c => c.Status === "Pendente").length;
    statsPago.textContent = clientsData.filter(c => c.Status === "Pago").length;
    statsContatados.textContent = clientsData.filter(c => c.Status !== "Pendente" && c.Status !== "Pago").length;
  }

  function formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(valor).replace(/\u00a0/g, " ");
  }

  searchInput.addEventListener("input", renderClientsTable);
  statusFilter.addEventListener("change", renderClientsTable);

  // --- 7. INSPEÇÃO E AÇÕES DETALHADAS ---
  
  function inspecionarCliente(index) {
    const client = clientsData[index];
    if (!client) return;

    const clientKey = String(client.Codigo || client.CNPJ || "").trim();
    const perfil = (clientKey && clientesPerfilMap[clientKey]) || { EsqueceBoleto: "NÃO", DificuldadeAutoatendimento: "NÃO" };

    inspectorEmpty.classList.add("hidden");
    inspectorContent.classList.remove("hidden");

    // Encontrar todas as faturas do cliente (incluindo pagas)
    const faturasExibidas = clientsData.filter(c => {
      if (client.CNPJ && c.CNPJ === client.CNPJ) return true;
      if (client.Codigo && c.Codigo === client.Codigo) return true;
      return c.Cliente === client.Cliente;
    });

    // Reunir e unificar histórico de contatos das faturas exibidas
    let historicoUnificado = [];
    faturasExibidas.forEach(f => {
      if (f.Historico && f.Historico.length > 0) {
        f.Historico.forEach(h => {
          if (!historicoUnificado.some(existing => existing.data === h.data && existing.obs === h.obs && existing.status === h.status)) {
            historicoUnificado.push({
              data: h.data,
              status: h.status,
              fone: h.fone,
              obs: h.obs,
              parcela: f.Parcela,
              nf: f.NF
            });
          }
        });
      }
    });

    const parseTimelineDate = (dateStr) => {
      if (!dateStr) return 0;
      const parts = dateStr.split(" ");
      if (parts[0]) {
        const dParts = parts[0].split("/");
        const tParts = parts[1] ? parts[1].split(":") : ["00", "00"];
        return new Date(dParts[2], dParts[1]-1, dParts[0], tParts[0], tParts[1]).getTime();
      }
      return 0;
    };

    historicoUnificado.sort((a, b) => parseTimelineDate(b.data) - parseTimelineDate(a.data));

    let timelineHtml = `<p class="text-[10px] text-slate-555 italic">Nenhum contato registrado.</p>`;
    
    if (historicoUnificado.length > 0) {
      timelineHtml = `
        <div class="timeline">
          ${historicoUnificado.map(h => {
            const dotClass = (h.status || "Pendente").toLowerCase().replace(/\s+/g, "-");
            const parcText = h.parcela ? `(Parc. ${h.parcela})` : '';
            return `
              <div class="timeline-item">
                <span class="timeline-dot ${dotClass}"></span>
                <div class="timeline-time">${h.data} ${parcText}</div>
                <div class="timeline-content">
                  <strong>${h.status}</strong> ${h.fone ? `via ${h.fone}` : ""}
                </div>
                ${h.obs ? `<div class="timeline-obs">"${h.obs}"</div>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    let obsText = "";
    const lastCommentEvent = historicoUnificado.find(h => h.obs && !h.obs.includes("Mensagem WhatsApp"));
    if (lastCommentEvent) {
      obsText = lastCommentEvent.obs;
    }

    // Identificar fones disponíveis (originais e corrigidos)
    const fonesDisponiveis = [];
    const contatoCorrigido = (client.Codigo && contatosCorrigidosMap[client.Codigo]) || contatosCorrigidosMap[client.CNPJ];
    const f1Confirm = (contatoCorrigido && contatoCorrigido.Fone1Confirmado === "SIM") || client.Fone1Confirmado === "SIM";
    const f2Confirm = (contatoCorrigido && contatoCorrigido.Fone2Confirmado === "SIM") || client.Fone2Confirmado === "SIM";

    if (contatoCorrigido) {
      if (contatoCorrigido.Telefone1Correto) {
        const formatted = formatarTelefone(contatoCorrigido.Telefone1Correto);
        if (formatted.valido) {
          fonesDisponiveis.push({
            id: "corrigido1",
            numero: formatted,
            label: "Fone 1 (Corrigido)",
            confirmado: f1Confirm,
            isCorrigido: true
          });
        }
      }
      if (contatoCorrigido.Telefone2Correto) {
        const formatted = formatarTelefone(contatoCorrigido.Telefone2Correto);
        if (formatted.valido) {
          fonesDisponiveis.push({
            id: "corrigido2",
            numero: formatted,
            label: "Fone 2 (Corrigido)",
            confirmado: f2Confirm,
            isCorrigido: true
          });
        }
      }
    }

    if (client.PlanilhaFone1 && client.PlanilhaFone1.valido) {
      const jaExiste = fonesDisponiveis.some(f => f.numero.formatado === client.PlanilhaFone1.formatado);
      if (!jaExiste) {
        fonesDisponiveis.push({
          id: "planilha1",
          numero: client.PlanilhaFone1,
          label: "Fone 1 (Planilha)",
          confirmado: false,
          isCorrigido: false
        });
      }
    }

    if (client.PlanilhaFone2 && client.PlanilhaFone2.valido) {
      const jaExiste = fonesDisponiveis.some(f => f.numero.formatado === client.PlanilhaFone2.formatado);
      if (!jaExiste) {
        fonesDisponiveis.push({
          id: "planilha2",
          numero: client.PlanilhaFone2,
          label: "Fone 2 (Planilha)",
          confirmado: false,
          isCorrigido: false
        });
      }
    }

    // Seletor inteligente de fone prioritário inicial (Contatos_Corrigidos whitelist primeiro)
    const melhorTel = obterMelhorTelefone(client);
    if (melhorTel) {
      const matching = fonesDisponiveis.find(f => f.numero.formatado === melhorTel.phone.formatado);
      selectedPhoneType = matching ? matching.id : (fonesDisponiveis[0] ? fonesDisponiveis[0].id : "");
    } else {
      selectedPhoneType = fonesDisponiveis[0] ? fonesDisponiveis[0].id : "";
    }

    const f1CorrigidoVal = (contatoCorrigido && contatoCorrigido.Telefone1Correto) ? contatoCorrigido.Telefone1Correto : ((client.Fone1 && client.Fone1.valido) ? client.Fone1.exibicao : "");
    const f2CorrigidoVal = (contatoCorrigido && contatoCorrigido.Telefone2Correto) ? contatoCorrigido.Telefone2Correto : ((client.Fone2 && client.Fone2.valido) ? client.Fone2.exibicao : "");

    inspectorContent.innerHTML = `
      <div class="space-y-4 flex flex-col justify-between h-full text-slate-200">
        <div class="space-y-3">
          <div>
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest">Painel de Negociação</h3>
            <h2 class="text-md font-bold text-white mt-1 leading-snug">
              <span class="text-cyan-400 font-mono font-bold mr-1.5">[${client.Codigo || '--'}]</span>${client.Cliente}
            </h2>
            <p class="text-[10px] text-slate-500 font-mono mt-0.5">${client.ClienteOriginal}</p>
            <p class="text-[9px] text-slate-400 font-mono mt-0.5">CNPJ: ${client.CNPJ || 'N/A'}</p>
          </div>

          <!-- LISTA DE DUPLICATAS DO CLIENTE -->
          <div class="inspector-faturas-box space-y-1.5 p-2.5 rounded-xl">
            <span class="text-[8.5px] text-slate-500 uppercase font-bold block">Duplicatas do Cliente</span>
            <div class="space-y-1.5 max-h-[140px] overflow-y-auto pr-1" id="inspector-faturas-list">
              <!-- Renderizado via script.js -->
            </div>
            
            <!-- Campo de Busca/Seleção Rápida de Duplicata Específica -->
            <div class="pt-1.5 border-t border-slate-900/60 mt-1 flex gap-1.5 items-center">
              <input type="text" id="add-lanco-input" class="premium-input text-[10.5px] p-1 h-7" placeholder="Marcar nº título (Lanço)..." style="font-family: monospace;">
              <button type="button" id="add-lanco-btn" class="premium-button-secondary px-2.5 h-7 text-[10.5px] shrink-0 flex items-center justify-center font-bold">Marcar</button>
            </div>

            <div class="flex justify-between items-center pt-1.5 border-t border-slate-900 mt-1 text-xs">
              <span class="font-bold text-slate-450">Total Selecionado:</span>
              <span class="font-bold text-white font-mono" id="inspector-selected-total">R$ 0,00</span>
            </div>
          </div>

          <!-- Seletor de Telefone (Verde se Confirmado/Responde) -->
          <div>
            <label class="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Destinatário WhatsApp</label>
            <div class="grid grid-cols-2 gap-2" id="phone-buttons-container">
              <!-- Renderizado dinamicamente -->
            </div>
          </div>

          <!-- Correção de Telefones -->
          <div class="grid grid-cols-2 gap-2 zen-hide">
            <div>
              <label class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Corrigir Fone 1</label>
              <input type="text" id="correct-fone-1" class="premium-input text-xs p-1.5" value="${f1CorrigidoVal}" placeholder="Ex: (19) 99999-9999">
            </div>
            <div>
              <label class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Corrigir Fone 2</label>
              <input type="text" id="correct-fone-2" class="premium-input text-xs p-1.5" value="${f2CorrigidoVal}" placeholder="Ex: (19) 99999-9999">
            </div>
          </div>

          <!-- Sinalizadores de Telefones que Respondem -->
          <div class="grid grid-cols-2 gap-2 mt-1 zen-hide">
            <label class="flex items-center gap-1.5 text-[9.5px] cursor-pointer text-slate-350 hover:text-white transition">
              <input type="checkbox" id="check-fone1-ok" class="w-3 h-3 accent-emerald-500 cursor-pointer" ${f1Confirm ? "checked" : ""}>
              <span>Fone 1 Responde (OK)</span>
            </label>
            <label class="flex items-center gap-1.5 text-[9.5px] cursor-pointer text-slate-350 hover:text-white transition">
              <input type="checkbox" id="check-fone2-ok" class="w-3 h-3 accent-emerald-500 cursor-pointer" ${f2Confirm ? "checked" : ""}>
              <span>Fone 2 Responde (OK)</span>
            </label>
          </div>

          <!-- Nome de Contato customizado -->
          <div class="zen-hide">
            <label class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome do Contato (Falar com)</label>
            <input type="text" id="correct-nome-contato" class="premium-input text-xs p-1.5" value="${client.NomeContato || ''}" placeholder="Ex: José, Maria...">
          </div>

          <!-- Seletor de Template de Mensagem -->
          <div>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" id="tmpl-btn-lembrete" class="phone-select-btn ${selectedTemplateType === "lembrete" ? "active" : ""}">
                <span class="text-[8.5px] font-bold uppercase text-slate-500">Cordial</span>
                <span class="text-xs font-semibold">Lembrete</span>
              </button>
              <button type="button" id="tmpl-btn-atraso" class="phone-select-btn ${selectedTemplateType === "atraso" ? "active" : ""}">
                <span class="text-[8.5px] font-bold uppercase text-slate-500">Cobrança</span>
                <span class="text-xs font-semibold">Overdue</span>
              </button>
            </div>
          </div>

          <!-- Checkbox Passo a Passo Autoatendimento -->
          <div class="mt-1 zen-hide">
            <label class="flex items-center gap-2 text-xs cursor-pointer text-slate-350 hover:text-white transition">
              <input type="checkbox" id="check-incluir-passo-passo" class="w-3.5 h-3.5 accent-cyan-500 rounded border-slate-700 bg-slate-900 cursor-pointer" ${selectedIncluirPassoPasso ? "checked" : ""}>
              <span>Incluir passo a passo do autoatendimento</span>
            </label>
          </div>

          <!-- Botão de WhatsApp -->
          <button id="send-whatsapp-btn" class="w-full premium-button-primary py-2.5 gap-2 text-xs">
            <i data-lucide="message-square" class="w-4 h-4"></i> Enviar Mensagem por WhatsApp
          </button>

          <!-- PRÉVIA DA MENSAGEM NO WHATSAPP (EDITÁVEL) -->
          <div>
            <label class="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Prévia da Mensagem (WhatsApp)</label>
            <textarea id="whatsapp-preview" class="whatsapp-preview-textarea" placeholder="A prévia da mensagem aparecerá aqui..."></textarea>
          </div>

          <!-- Timeline do Histórico -->
          <div class="space-y-1 pt-1.5 border-t border-slate-900 zen-hide">
            <span class="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Linha do Tempo Unificada</span>
            <div class="timeline-container">
              ${timelineHtml}
            </div>
          </div>
        </div>

        <!-- Formulário de Atualização de Status -->
        <div class="inspector-status-box space-y-3 pt-3 border-t border-slate-900 p-2.5 rounded-xl">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status Final</label>
              <select id="inspector-status-select" class="premium-input text-xs p-2">
                <option value="Pendente" ${client.Status === "Pendente" ? "selected" : ""}>Pendente</option>
                <option value="Mensagem Enviada" ${client.Status === "Mensagem Enviada" ? "selected" : ""}>📤 Mensagem Enviada</option>
                <option value="Sem Resposta" ${client.Status === "Sem Resposta" ? "selected" : ""}>Sem Resposta</option>
                <option value="Negociando" ${client.Status === "Negociando" ? "selected" : ""}>Negociando</option>
                <option value="Promessa" ${client.Status === "Promessa" ? "selected" : ""}>Promessa Pagto</option>
                <option value="Não Pago" ${client.Status === "Não Pago" ? "selected" : ""}>Não Pago</option>
                <option value="Incorreto" ${client.Status === "Incorreto" ? "selected" : ""}>Número Incorreto</option>
                <option value="Pago" ${client.Status === "Pago" ? "selected" : ""}>Pago / Resolvido</option>
              </select>
            </div>
            
            <div id="promessa-date-container" class="hidden">
              <label class="text-[9px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">Pagar em:</label>
              <input type="date" id="promessa-date-input" class="premium-input text-xs p-1.5">
            </div>
          </div>

          <!-- Perfil Comportamental (Ameripan Insights) -->
          <div class="inspector-profile-box space-y-1.5 p-2 rounded-lg mt-1 zen-hide">
            <span class="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Perfil de Comportamento</span>
            <div class="flex flex-col gap-1.5">
              <label class="flex items-center gap-2 text-xs cursor-pointer text-slate-350 hover:text-white transition">
                <input type="checkbox" id="check-esquece-boleto" class="w-3.5 h-3.5 accent-cyan-500 rounded border-slate-700 bg-slate-900 cursor-pointer" ${perfil.EsqueceBoleto === "SIM" ? "checked" : ""}>
                <span>Costuma esquecer vencimento</span>
              </label>
              <label class="flex items-center gap-2 text-xs cursor-pointer text-slate-350 hover:text-white transition">
                <input type="checkbox" id="check-dificuldade-auto" class="w-3.5 h-3.5 accent-cyan-500 rounded border-slate-700 bg-slate-900 cursor-pointer" ${perfil.DificuldadeAutoatendimento === "SIM" ? "checked" : ""}>
                <span>Dificuldade com autoatendimento</span>
              </label>
            </div>
          </div>

          <div>
            <label class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Anotações / Notas de Contato</label>
            <textarea id="inspector-obs-input" placeholder="O que o cliente disse? Motivos de não pagar, acordos..." class="premium-input text-xs h-12 resize-none leading-normal">${obsText}</textarea>
          </div>

          <button id="save-inspector-btn" class="w-full premium-button-secondary py-2 text-xs">
            Gravar Ocorrência <i data-lucide="check" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;

    lucide.createIcons();

    // Renderizar os botões de fones disponíveis dinamicamente
    const phoneButtonsContainer = document.getElementById("phone-buttons-container");
    if (phoneButtonsContainer) {
      phoneButtonsContainer.innerHTML = fonesDisponiveis.map(f => {
        const isActive = selectedPhoneType === f.id;
        const activeClass = isActive ? "active" : "";
        const confirmedClass = f.confirmado ? "confirmed" : "";
        const star = f.confirmado ? "⭐ " : "";
        return `
          <button type="button" class="phone-select-btn ${activeClass} ${confirmedClass}" data-fone-id="${f.id}">
            <span class="text-[8.5px] font-bold uppercase text-slate-500">${f.label}</span>
            <span class="text-xs font-semibold truncate w-full">${star}${f.numero.exibicao}</span>
          </button>
        `;
      }).join("") || `<span class="text-xs text-rose-400 font-bold col-span-2">Nenhum telefone válido encontrado</span>`;

      // Ouvintes de clique para os botões de fones dinâmicos
      phoneButtonsContainer.querySelectorAll(".phone-select-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          phoneButtonsContainer.querySelectorAll(".phone-select-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          selectedPhoneType = btn.getAttribute("data-fone-id");
          atualizarPreviaMensagem();
        });
      });
    }

    // Renderizar a lista de faturas com checkbox no painel lateral
    const faturasListContainer = document.getElementById("inspector-faturas-list");
    if (faturasListContainer) {
      const faturasOrdenadas = ordenarFaturasPorStatus(faturasExibidas);
      faturasListContainer.innerHTML = faturasOrdenadas.map(f => {
        const query = searchInput.value.toLowerCase().trim();
        let isChecked = f.Status !== "Pago";
        if (query && (f.Lanco.includes(query) || f.NF.includes(query))) {
          isChecked = f.Lanco.toLowerCase() === query || f.NF.toLowerCase() === query || f.Lanco.includes(query) || f.NF.includes(query);
        }
        return `
          <div class="fatura-item flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 rounded-lg transition gap-1.5 sm:gap-3">
            <label class="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
              <input type="checkbox" class="fatura-check w-3.5 h-3.5 accent-cyan-500 rounded border-slate-700 bg-slate-900 cursor-pointer shrink-0" data-chave="${f.ChaveUnica}" ${isChecked ? 'checked' : ''}>
              <div class="text-left min-w-0">
                <div class="text-[11px] font-semibold text-white truncate">Parc. ${f.Parcela} ${f.NF ? `(NF ${f.NF})` : ''}</div>
                <div class="text-[9px] text-slate-400 font-mono mt-0.5 flex flex-wrap gap-1 items-center">
                  <span>Venc: ${f.Vencimento}</span>
                  <span class="bg-slate-900/60 px-1 py-0.2 rounded text-cyan-300 font-bold">Lç: ${f.Lanco}</span>
                </div>
              </div>
            </label>
            <div class="text-right flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-8 sm:pl-0">
              <div class="text-[11px] font-bold font-mono text-white">${formatarMoeda(f.Valor)}</div>
              <div class="text-[8.5px] font-bold uppercase text-slate-400 bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-800">${f.Status}</div>
            </div>
          </div>
        `;
      }).join("");

      // Ouvinte de eventos para recalcular a prévia quando os checkboxes de faturas mudarem
      faturasListContainer.querySelectorAll(".fatura-check").forEach(check => {
        check.addEventListener("change", atualizarPreviaMensagem);
      });
    }

    // Ouvintes para busca rápida e seleção de título/lanço digitado
    const addLancoBtn = document.getElementById("add-lanco-btn");
    const addLancoInput = document.getElementById("add-lanco-input");
    
    const marcarLanco = () => {
      const lancoVal = addLancoInput.value.trim();
      if (!lancoVal) return;
      
      const matchingTitle = faturasExibidas.find(t => t.Lanco === lancoVal || t.ChaveUnica === lancoVal);
      if (matchingTitle) {
        const checkbox = inspectorContent.querySelector(`.fatura-check[data-chave="${matchingTitle.ChaveUnica}"]`);
        if (checkbox) {
          checkbox.checked = true;
          atualizarPreviaMensagem();
          showToast(`Título ${lancoVal} selecionado!`, "success");
          addLancoInput.value = "";
        }
      } else {
        const otherClientTitle = clientsData.find(t => t.Lanco === lancoVal || t.ChaveUnica === lancoVal);
        if (otherClientTitle) {
          showToast(`Erro: O título ${lancoVal} pertence a outro cliente (${otherClientTitle.Cliente})!`, "danger");
        } else {
          showToast(`Erro: O título ${lancoVal} não está cadastrado no sistema!`, "danger");
        }
      }
    };

    if (addLancoBtn) addLancoBtn.addEventListener("click", marcarLanco);
    if (addLancoInput) {
      addLancoInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          marcarLanco();
        }
      });
    }

    // Função interna para atualizar a prévia e total das duplicatas selecionadas
    function atualizarPreviaMensagem() {
      const checks = inspectorContent.querySelectorAll(".fatura-check");
      const faturasSelecionadas = [];
      let total = 0;

      checks.forEach(check => {
        if (check.checked) {
          const chave = check.getAttribute("data-chave");
          const fat = faturasExibidas.find(f => f.ChaveUnica === chave);
          if (fat) {
            faturasSelecionadas.push(fat);
            total += fat.Valor;
          }
        }
      });

      const totalLabel = document.getElementById("inspector-selected-total");
      if (totalLabel) {
        totalLabel.textContent = formatarMoeda(total);
      }

      const inputNome = document.getElementById("correct-nome-contato");
      const nomeContato = inputNome ? inputNome.value.trim() : (client.NomeContato || "");

      const checkPassoPasso = document.getElementById("check-incluir-passo-passo");
      const incluirPassoPasso = checkPassoPasso ? checkPassoPasso.checked : false;

      const text = gerarMensagemWhatsApp(client, faturasSelecionadas, selectedTemplateType, nomeContato, incluirPassoPasso);
      const previewTextarea = document.getElementById("whatsapp-preview");
      if (previewTextarea) {
        previewTextarea.value = text;
        previewTextarea.style.height = 'auto';
        previewTextarea.style.height = (previewTextarea.scrollHeight) + 'px';
      }
    }

    // Ouvintes para correção de telefones em tempo real
    const correctFone1 = document.getElementById("correct-fone-1");
    const correctFone2 = document.getElementById("correct-fone-2");
    
    const updateFonesMemory = () => {
      if (correctFone1) {
        const f1Val = correctFone1.value.trim();
        if (f1Val) {
          const formatted = formatarTelefone(f1Val);
          if (formatted.valido) {
            client.Fone1 = formatted;
            const activeBtn = phoneButtonsContainer ? phoneButtonsContainer.querySelector('[data-fone-id="corrigido1"] span.text-xs') : null;
            if (activeBtn) activeBtn.textContent = formatted.exibicao;
          }
        }
      }
      if (correctFone2) {
        const f2Val = correctFone2.value.trim();
        if (f2Val) {
          const formatted = formatarTelefone(f2Val);
          if (formatted.valido) {
            client.Fone2 = formatted;
            const activeBtn = phoneButtonsContainer ? phoneButtonsContainer.querySelector('[data-fone-id="corrigido2"] span.text-xs') : null;
            if (activeBtn) activeBtn.textContent = formatted.exibicao;
          }
        }
      }
    };
    
    if (correctFone1) correctFone1.addEventListener("input", updateFonesMemory);
    if (correctFone2) correctFone2.addEventListener("input", updateFonesMemory);

    // Escuta para alteração de Nome de Contato em tempo real
    const correctNomeContato = document.getElementById("correct-nome-contato");
    if (correctNomeContato) {
      correctNomeContato.addEventListener("input", () => {
        client.NomeContato = correctNomeContato.value.trim();
        atualizarPreviaMensagem();
      });
    }

    // Escutas dos Templates de Mensagem
    const tmplBtnLembrete = document.getElementById("tmpl-btn-lembrete");
    const tmplBtnAtraso = document.getElementById("tmpl-btn-atraso");

    tmplBtnLembrete.addEventListener("click", () => {
      selectedTemplateType = "lembrete";
      tmplBtnLembrete.classList.add("active");
      tmplBtnAtraso.classList.remove("active");
      atualizarPreviaMensagem();
    });

    tmplBtnAtraso.addEventListener("click", () => {
      selectedTemplateType = "atraso";
      tmplBtnAtraso.classList.add("active");
      tmplBtnLembrete.classList.remove("active");
      atualizarPreviaMensagem();
    });

    const checkPassoPassoEvent = document.getElementById("check-incluir-passo-passo");
    if (checkPassoPassoEvent) {
      checkPassoPassoEvent.addEventListener("change", () => {
        selectedIncluirPassoPasso = checkPassoPassoEvent.checked;
        atualizarPreviaMensagem();
      });
    }

    // Status select e data de promessa
    const inspectorStatusSelect = document.getElementById("inspector-status-select");
    const promessaDateContainer = document.getElementById("promessa-date-container");
    
    function togglePromessaDate() {
      if (inspectorStatusSelect.value === "Promessa") {
        promessaDateContainer.classList.remove("hidden");
      } else {
        promessaDateContainer.classList.add("hidden");
      }
    }
    
    inspectorStatusSelect.addEventListener("change", togglePromessaDate);
    togglePromessaDate();

    // Inicializar primeira prévia de mensagem
    atualizarPreviaMensagem();

    // Enviar WhatsApp (usando prévia editável)
    const sendWhatsappBtn = document.getElementById("send-whatsapp-btn");
    sendWhatsappBtn.addEventListener("click", () => {
      const foneAtivo = fonesDisponiveis.find(f => f.id === selectedPhoneType) || fonesDisponiveis[0];
      if (!foneAtivo || !foneAtivo.numero.valido) {
        showToast("Selecione um telefone válido.", "danger");
        return;
      }
      const foneObj = foneAtivo.numero;

      const previewTextarea = document.getElementById("whatsapp-preview");
      const text = previewTextarea ? previewTextarea.value : obterMensagemPreenchida(client);
      
      const url = `https://api.whatsapp.com/send?phone=${foneObj.formatado}&text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");

      const dataHora = new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'});
      const msgEvent = {
        data: dataHora,
        status: "Mensagem Enviada",
        fone: foneObj.exibicao,
        obs: `Mensagem WhatsApp enviada (${selectedTemplateType === "lembrete" ? "Cordial" : "Cobrança"})`
      };
      
      const checks = inspectorContent.querySelectorAll(".fatura-check");
      const faturasSelecionadas = [];
      checks.forEach(check => {
        if (check.checked) {
          const chave = check.getAttribute("data-chave");
          const fat = faturasExibidas.find(f => f.ChaveUnica === chave);
          if (fat && fat.Status !== "Pago") {
            faturasSelecionadas.push(fat);
          }
        }
      });

      if (faturasSelecionadas.length === 0) {
        showToast("Nenhuma fatura pendente selecionada.", "warning");
        return;
      }

      faturasSelecionadas.forEach(fat => {
        fat.Status = "Mensagem Enviada";
        fat.TelefoneCobrado = foneObj.exibicao;
        if (!fat.Historico) fat.Historico = [];
        fat.Historico.push(msgEvent);
        fat.Observacao = JSON.stringify(fat.Historico);
      });

      salvarStatusSheetsMultiplos(faturasSelecionadas, client);
      renderClientsTable();
      updateStats();
      inspecionarCliente(index);
    });

    const saveInspectorBtn = document.getElementById("save-inspector-btn");
    const inspectorObsInput = document.getElementById("inspector-obs-input");
    const promessaDateInput = document.getElementById("promessa-date-input");

    saveInspectorBtn.addEventListener("click", () => {
      const statusFinal = inspectorStatusSelect.value;
      let baseAnotacao = inspectorObsInput.value.trim();
      
      const correctFone1Val = document.getElementById("correct-fone-1").value.trim();
      const correctFone2Val = document.getElementById("correct-fone-2").value.trim();
      
      if (correctFone1Val) {
        const formatted = formatarTelefone(correctFone1Val);
        if (formatted.valido) client.Fone1 = formatted;
      }
      if (correctFone2Val) {
        const formatted = formatarTelefone(correctFone2Val);
        if (formatted.valido) client.Fone2 = formatted;
      }

      const checkFone1Ok = document.getElementById("check-fone1-ok").checked;
      const checkFone2Ok = document.getElementById("check-fone2-ok").checked;
      client.Fone1Confirmado = checkFone1Ok ? "SIM" : "NÃO";
      client.Fone2Confirmado = checkFone2Ok ? "SIM" : "NÃO";

      const correctNomeContatoVal = document.getElementById("correct-nome-contato").value.trim();
      client.NomeContato = correctNomeContatoVal;

      if (clientKey) {
        contatosCorrigidosMap[clientKey] = {
          Telefone1Correto: (client.Fone1 && client.Fone1.valido) ? client.Fone1.exibicao : "",
          Telefone2Correto: (client.Fone2 && client.Fone2.valido) ? client.Fone2.exibicao : "",
          Codigo: client.Codigo || "",
          NomeContato: client.NomeContato || "",
          Fone1Confirmado: client.Fone1Confirmado || "NÃO",
          Fone2Confirmado: client.Fone2Confirmado || "NÃO",
          Cliente: client.Cliente || "",
          CNPJ: client.CNPJ || ""
        };
      }

      const checkEsquece = document.getElementById("check-esquece-boleto").checked;
      const checkDificuldade = document.getElementById("check-dificuldade-auto").checked;

      if (clientKey) {
        const faturasCliente = clientsData.filter(c => {
          if (client.Codigo && c.Codigo === client.Codigo) return true;
          if (client.CNPJ && c.CNPJ === client.CNPJ) return true;
          return false;
        });
        const totalFaturas = faturasCliente.length || 1;
        const totalAtrasos = faturasCliente.filter(c => c.Status === "Pendente" || c.Status === "Não Pago" || c.Status === "Sem Resposta").length;

        clientesPerfilMap[clientKey] = {
          Codigo: client.Codigo || "",
          CNPJ: client.CNPJ || "",
          Cliente: client.Cliente,
          EsqueceBoleto: checkEsquece ? "SIM" : "NÃO",
          DificuldadeAutoatendimento: checkDificuldade ? "SIM" : "NÃO",
          TotalFaturas: totalFaturas,
          TotalAtrasos: totalAtrasos,
          UltimaOcorrencia: statusFinal,
          TelefonePlanilha1: (client.PlanilhaFone1 && client.PlanilhaFone1.valido) ? client.PlanilhaFone1.exibicao : "",
          TelefonePlanilha2: (client.PlanilhaFone2 && client.PlanilhaFone2.valido) ? client.PlanilhaFone2.exibicao : ""
        };
      }

      const foneAtivo = fonesDisponiveis.find(f => f.id === selectedPhoneType) || fonesDisponiveis[0];
      const foneObj = foneAtivo ? foneAtivo.numero : { valido: false, formatado: "" };
      
      let anotacaoFinal = baseAnotacao;
      if (statusFinal === "Promessa" && promessaDateInput.value) {
        const dataPromessa = promessaDateInput.value.split("-").reverse().join("/");
        anotacaoFinal = `[Promessa para ${dataPromessa}] ` + baseAnotacao;
      }

      const checks = inspectorContent.querySelectorAll(".fatura-check");
      const faturasSelecionadas = [];
      checks.forEach(check => {
        if (check.checked) {
          const chave = check.getAttribute("data-chave");
          const fat = faturasExibidas.find(f => f.ChaveUnica === chave);
          if (fat) {
            faturasSelecionadas.push(fat);
          }
        }
      });

      if (faturasSelecionadas.length === 0) {
        showToast("Nenhuma fatura selecionada para gravação.", "warning");
        return;
      }

      const dataHora = new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'});
      
      faturasSelecionadas.forEach(fat => {
        const novoEvento = {
          data: dataHora,
          status: statusFinal,
          fone: foneObj.valido ? foneObj.exibicao : "",
          obs: anotacaoFinal
        };

        fat.Status = statusFinal;
        if (foneObj.valido) {
          fat.TelefoneCobrado = foneObj.exibicao;
        }
        if (!fat.Historico) fat.Historico = [];
        fat.Historico.push(novoEvento);
        fat.Observacao = JSON.stringify(fat.Historico);
      });

      salvarStatusSheetsMultiplos(faturasSelecionadas, client);
      renderClientsTable();
      updateStats();
      inspecionarCliente(index);
    });

    atualizarBotoesZenWhatsApp();
  }

  function gerarMensagemWhatsApp(client, faturasSelecionadas, templateType, nomeContato, incluirPassoPasso) {
    if (faturasSelecionadas.length === 0) {
      return "Nenhuma duplicata selecionada para cobrança.";
    }

    // 1. ORDENAÇÃO CRONOLÓGICA (ANTIGO PARA NOVO)
    const sortedFaturas = [...faturasSelecionadas].sort((a, b) => {
      const partsA = a.Vencimento.split("/");
      const partsB = b.Vencimento.split("/");
      const dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
      const dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
      return dateA.getTime() - dateB.getTime();
    });

    const saudacao = nomeContato ? `Olá, ${nomeContato} (representante de ${client.Cliente}).` : `Olá, ${client.Cliente}.`;
    const assinatura = `Aqui é do Financeiro da Ameripan Distribuidora.`;
    
    // Introdução da listagem (Mensagem de desconsiderar logo abaixo da introdução)
    let intro = "";
    if (templateType === "lembrete") {
      intro = `${saudacao} Tudo bem? ${assinatura} 😊
 
Identificamos em nosso sistema os seguintes títulos pendentes de regularização, listados em ordem cronológica de vencimento:
(Caso já tenha pago, desconsidere esta mensagem. Obrigado!)`;
    } else {
      intro = `${saudacao} Como vai? ${assinatura}
 
Identificamos em nosso sistema os seguintes títulos pendentes de regularização, listados em ordem cronológica de vencimento:
(Caso já tenha pago, desconsidere esta mensagem. Obrigado!)`;
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    let exibirAlertaRestricao = false;
    let faturasTexto = "";

    sortedFaturas.forEach(f => {
      const parts = f.Vencimento.split("/");
      const dateVenc = new Date(parts[2], parts[1] - 1, parts[0]);
      dateVenc.setHours(0, 0, 0, 0);
      const diffTime = currentDate.getTime() - dateVenc.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let emoji = "";
      if (diffDays >= 7) {
        emoji = " 🔴🔴";
      } else if (diffDays >= 5) {
        emoji = " 🔴";
      } else if (diffDays >= 3) {
        emoji = " 🟡";
      }

      if (diffDays >= 5) {
        exibirAlertaRestricao = true;
      }

      const nfTexto = f.NF ? `da NF ${f.NF}` : '';
      
      let vencimentoDias = "";
      if (diffDays > 0) {
        vencimentoDias = `Vencido a ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
      } else if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        vencimentoDias = `A vencer em ${absDays} ${absDays === 1 ? 'dia' : 'dias'}`;
      } else {
        vencimentoDias = `Vence hoje`;
      }

      faturasTexto += `• Parcela ${f.Parcela} ${nfTexto} - Vcto: ${f.Vencimento} (${vencimentoDias}) - Valor: ${formatarMoeda(f.Valor)}${emoji}\n`;
    });

    const total = sortedFaturas.reduce((acc, f) => acc + f.Valor, 0);
    const totalFormatado = formatarMoeda(total);

    const listBlock = `${faturasTexto.trim()}\n\nValor Total Acumulado: ${totalFormatado}`;

    // 4. DIRETRIZES FINANCEIRAS E COMERCIAIS RESUMIDAS
    const notaEncargos = `Valores válidos para hoje. No dia seguinte, os juros são calculados automaticamente pelo banco no ato da leitura do código de barras.`;

    let alertaRestricaoText = "";
    if (exibirAlertaRestricao) {
      alertaRestricaoText = `⚠️ Alerta: Boletos com 5 dias ou mais de atraso estão sujeitos à inclusão automática no Serasa/SPC e suspensão de novas vendas na rota.`;
    }

    const rodape = `Não tem o boleto em mãos? Solicite a segunda via no nosso autoatendimento clicando aqui: wa.me/551934064070 ou adicione aos contatos (19) 3406-4070`;

    // 5. FORMATAÇÃO WHATSAPP (SEPARADOS POR LINHA EM BRANCO DUPLA "\n\n\n")
    const paragraphs = [intro, listBlock, notaEncargos];
    if (exibirAlertaRestricao) {
      paragraphs.push(alertaRestricaoText);
    }
    paragraphs.push(rodape);

    if (incluirPassoPasso) {
      const passoPassoText = `*Siga os passos:*
1. Envie *"oi"*
2. Clique em *MENU* e selecione a empresa
3. Selecione *2° Via Boleto e Nf*
4. No Menu, escolha *2° Via Boleto*
5. Digite o número da opção do boleto desejado.
O PDF será baixado automaticamente!`;
      paragraphs.push(passoPassoText);
    }

    return paragraphs.join("\n\n");
  }

  function obterMensagemPreenchida(client) {
    const checkPassoPasso = document.getElementById("check-incluir-passo-passo");
    const incluirPassoPasso = checkPassoPasso ? checkPassoPasso.checked : false;
    return gerarMensagemWhatsApp(client, [client], selectedTemplateType, client.NomeContato || "", incluirPassoPasso);
  }

  // --- 8. LÓGICA DE RELATÓRIOS MENSAIS E DE PERFORMANCE ---
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  function carregarOpcoesMesesRelatorio() {
    reportMonthSelect.innerHTML = "";
    
    if (clientsData.length === 0) {
      reportMonthSelect.innerHTML = `<option value="">Nenhum dado lido</option>`;
      return;
    }

    // Identifica todos os meses/anos únicos a partir do Vencimento
    const mesesUnicos = new Set();
    clientsData.forEach(c => {
      if (c.Vencimento && c.Vencimento.includes("/")) {
        const parts = c.Vencimento.split("/");
        if (parts[1] && parts[2]) {
          mesesUnicos.add(`${parts[1]}/${parts[2]}`);
        }
      }
    });

    const arrMeses = Array.from(mesesUnicos).sort((a, b) => {
      const partsA = a.split("/");
      const partsB = b.split("/");
      // Ordena por ano e depois por mês
      return new Date(partsA[1], partsA[0]-1) - new Date(partsB[1], partsB[0]-1);
    });

    if (arrMeses.length === 0) {
      reportMonthSelect.innerHTML = `<option value="">Nenhum mês válido</option>`;
      return;
    }

    arrMeses.forEach(m => {
      const parts = m.split("/");
      const idxMes = parseInt(parts[0]) - 1;
      const nomeMes = `${monthNames[idxMes]}/${parts[1]}`;
      
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = nomeMes;
      reportMonthSelect.appendChild(opt);
    });

    // Auto-seleciona o último mês disponível
    reportMonthSelect.value = arrMeses[arrMeses.length - 1];
    
    // Se a aba de relatórios estiver visível, atualiza
    if (document.getElementById("tab-content-relatorios").classList.contains("active")) {
      gerarRelatoriosMensais();
    }
  }

  reportMonthSelect.addEventListener("change", gerarRelatoriosMensais);

  function parseTimelineDate(dateStr) {
    if (!dateStr) return 0;
    if (dateStr instanceof Date) return dateStr.getTime();
    const parts = String(dateStr).split(" ");
    if (parts[0]) {
      const dParts = parts[0].split("/");
      if (dParts.length === 3) {
        const tParts = parts[1] ? parts[1].split(":") : ["00", "00"];
        return new Date(dParts[2], dParts[1]-1, dParts[0], tParts[0], tParts[1]).getTime();
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function gerarRelatoriosMensais() {
    const selectedMonth = reportMonthSelect.value;
    const statusFilterVal = reportStatusFilter ? reportStatusFilter.value : "todos";
    repTableBody.innerHTML = "";
    
    if (!selectedMonth) {
      repTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">Selecione um mês para carregar a listagem.</td></tr>`;
      resetarKPIsRelatorio();
      return;
    }

    // Filtra faturas do mês selecionado e status
    const faturasMes = clientsData.filter(c => {
      if (c.Vencimento && c.Vencimento.includes("/")) {
        const parts = c.Vencimento.split("/");
        const matchMonth = `${parts[1]}/${parts[2]}` === selectedMonth;
        if (!matchMonth) return false;
        
        if (statusFilterVal === "todos") return true;
        if (statusFilterVal === "não pago") return c.Status === "Não Pago" || c.Status === "Sem Interesse";
        if (statusFilterVal === "negociando") return c.Status === "Negociando" || c.Status === "Promessa";
        return c.Status.toLowerCase() === statusFilterVal;
      }
      return false;
    });

    if (faturasMes.length === 0) {
      repTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">Nenhuma fatura encontrada com estes critérios.</td></tr>`;
      resetarKPIsRelatorio();
      return;
    }

    // 1. Cálculos Financeiros
    let cobradoVal = 0;
    let recuperadoVal = 0;
    let negociandoVal = 0;
    let perdasVal = 0;

    // Contadores para o gráfico
    const statusCounts = {
      "Pendente": { count: 0, valor: 0, class: "pendente" },
      "Pago": { count: 0, valor: 0, class: "pago" },
      "Sem Resposta": { count: 0, valor: 0, class: "sem-resposta" },
      "Incorreto": { count: 0, valor: 0, class: "incorreto" },
      "Negociando": { count: 0, valor: 0, class: "negociando" },
      "Promessa": { count: 0, valor: 0, class: "promessa" },
      "Não Pago": { count: 0, valor: 0, class: "nao-pago" }
    };

    faturasMes.forEach(c => {
      const valor = c.Valor;
      cobradoVal += valor;
      
      const status = c.Status;
      if (statusCounts[status]) {
        statusCounts[status].count++;
        statusCounts[status].valor += valor;
      }

      if (status === "Pago") {
        recuperadoVal += valor;
      } else if (status === "Negociando" || status === "Promessa") {
        negociandoVal += valor;
      } else if (status === "Não Pago" || status === "Incorreto") {
        perdasVal += valor;
      }
    });

    // Atualiza os cartões financeiros
    repTotalCobrado.textContent = formatarMoeda(cobradoVal);
    repTotalRecuperado.textContent = formatarMoeda(recuperadoVal);
    repTotalNegociando.textContent = formatarMoeda(negociandoVal);
    repTotalPerdas.textContent = formatarMoeda(perdasVal);

    // 2. Taxa de Recuperação (KPI)
    const taxaRecuperacao = cobradoVal > 0 ? (recuperadoVal / cobradoVal) * 100 : 0;
    repRecoveryRateLabel.textContent = `${taxaRecuperacao.toFixed(1)}%`;
    repRecoveryRateBar.style.width = `${taxaRecuperacao}%`;

    // 3. Renderizar Gráfico de Barras CSS
    repStatusChart.innerHTML = "";
    const totalFaturas = faturasMes.length;

    Object.keys(statusCounts).forEach(statusName => {
      const stat = statusCounts[statusName];
      const percent = totalFaturas > 0 ? (stat.count / totalFaturas) * 100 : 0;

      if (stat.count > 0 || stat.valor > 0) {
        const row = document.createElement("div");
        row.className = "chart-row";
        row.innerHTML = `
          <div class="chart-label">${statusName}</div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill ${stat.class}" style="width: ${percent}%"></div>
          </div>
          <div class="chart-value text-slate-350">
            <span>${stat.count} faturas</span>
            <span class="font-semibold text-white">${formatarMoeda(stat.valor)}</span>
          </div>
        `;
        repStatusChart.appendChild(row);
      }
    });

    // 4. Preencher a tabela detalhada do período
    faturasMes.forEach(c => {
      const tr = document.createElement("tr");
      const statusClass = c.Status.toLowerCase().replace(/\s+/g, "-");
      
      // Resgata o último log do histórico para exibir como observação do relatório
      let ultimaOcorrencia = "--";
      if (c.Historico && c.Historico.length > 0) {
        const ultimo = c.Historico[c.Historico.length - 1];
        ultimaOcorrencia = `${ultimo.data.split(" ")[0]} - ${ultimo.obs || ultimo.status}`;
      } else if (c.Observacao && !c.Observacao.startsWith("[")) {
        ultimaOcorrencia = c.Observacao;
      }

      tr.innerHTML = `
        <td class="font-semibold text-white">
          <div><span class="text-cyan-400 font-mono text-[9px] mr-1.5">[${c.Codigo || '--'}]</span>${c.Cliente}</div>
          <div class="text-[9px] text-slate-500 font-mono">Lanço: ${c.Lanco} | NF: ${c.NF || '--'}</div>
        </td>
        <td class="font-mono text-xs text-slate-400">${c.Vencimento}</td>
        <td class="font-mono font-semibold">${formatarMoeda(c.Valor)}</td>
        <td class="text-xs text-slate-400">${c.Parcela}</td>
        <td>
          <span class="badge-status ${statusClass}">
            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
            ${c.Status}
          </span>
        </td>
        <td class="text-xs text-slate-400 max-w-[200px] truncate" title="${ultimaOcorrencia}">${ultimaOcorrencia}</td>
      `;
      repTableBody.appendChild(tr);
    });

    renderPerfisRankings();
  }

  function renderPerfisRankings() {
    const pioresTableBody = document.getElementById("rep-piores-table-body");
    const melhoresTableBody = document.getElementById("rep-melhores-table-body");
    const dificuldadesTableBody = document.getElementById("rep-dificuldades-table-body");

    if (!pioresTableBody || !melhoresTableBody || !dificuldadesTableBody) return;

    pioresTableBody.innerHTML = "";
    melhoresTableBody.innerHTML = "";
    dificuldadesTableBody.innerHTML = "";

    // 1. CALCULAR PIORES PAGADORES
    const pioresMap = {};
    clientsData.forEach(c => {
      if (c.Status === "Pago") return; // apenas pendentes/atrasados
      const key = c.CNPJ || c.Cliente;
      if (!pioresMap[key]) {
        pioresMap[key] = {
          cliente: c.Cliente,
          codigo: c.Codigo,
          totalDevido: 0,
          faturasAtrasadas: 0
        };
      }
      pioresMap[key].totalDevido += c.Valor;
      pioresMap[key].faturasAtrasadas += 1;
    });

    const pioresList = Object.values(pioresMap).map(p => {
      const score = p.totalDevido + (p.faturasAtrasadas * 1000);
      return { ...p, score };
    });

    pioresList.sort((a, b) => b.score - a.score);

    if (pioresList.length === 0) {
      pioresTableBody.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-slate-500">Nenhum devedor registrado.</td></tr>`;
    } else {
      pioresList.slice(0, 10).forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="font-semibold text-slate-200 py-2">
            <div><span class="text-cyan-400 font-mono text-[10px] mr-1">[${p.codigo || '--'}]</span>${p.cliente}</div>
            <div class="text-[9px] text-slate-500 font-mono mt-0.5">Qtd: ${p.faturasAtrasadas} | Devido: ${formatarMoeda(p.totalDevido)}</div>
          </td>
          <td class="text-right text-rose-500 font-mono font-bold py-2">${Math.round(p.score)}</td>
        `;
        pioresTableBody.appendChild(tr);
      });
    }

    // 2. CALCULAR MELHORES PAGADORES
    const melhoresMap = {};
    clientsData.forEach(c => {
      if (c.Status !== "Pago") return;
      const key = c.CNPJ || c.Cliente;
      if (!melhoresMap[key]) {
        melhoresMap[key] = {
          cliente: c.Cliente,
          codigo: c.Codigo,
          tempos: [],
          totalPago: 0
        };
      }
      
      let tempoBaixa = 0;
      if (c.Historico && c.Historico.length > 0) {
        const sortedHist = [...c.Historico].sort((a, b) => parseTimelineDate(a.data) - parseTimelineDate(b.data));
        const firstContact = sortedHist[0];
        const payEvent = sortedHist.find(h => h.status === "Pago") || sortedHist[sortedHist.length - 1];
        
        const t1 = parseTimelineDate(firstContact.data);
        const t2 = parseTimelineDate(payEvent.data);
        if (t2 > t1) {
          tempoBaixa = (t2 - t1) / (1000 * 60 * 60 * 24);
        }
      }
      melhoresMap[key].tempos.push(tempoBaixa);
      melhoresMap[key].totalPago += c.Valor;
    });

    const melhoresList = Object.values(melhoresMap).map(m => {
      const avgTime = m.tempos.reduce((acc, t) => acc + t, 0) / m.tempos.length;
      return { ...m, avgTime };
    });

    melhoresList.sort((a, b) => a.avgTime - b.avgTime);

    if (melhoresList.length === 0) {
      melhoresTableBody.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-slate-500">Nenhum pagamento registrado.</td></tr>`;
    } else {
      melhoresList.slice(0, 10).forEach(m => {
        const tr = document.createElement("tr");
        const tempoFormatado = m.avgTime === 0 ? "Imediato" : `${m.avgTime.toFixed(1)}d`;
        tr.innerHTML = `
          <td class="font-semibold text-slate-200 py-2">
            <div><span class="text-cyan-400 font-mono text-[10px] mr-1">[${m.codigo || '--'}]</span>${m.cliente}</div>
            <div class="text-[9px] text-slate-500 font-mono mt-0.5">Total Pago: ${formatarMoeda(m.totalPago)}</div>
          </td>
          <td class="text-right text-emerald-400 font-mono font-bold py-2">${tempoFormatado}</td>
        `;
        melhoresTableBody.appendChild(tr);
      });
    }

    // 3. CALCULAR DIFICULDADE & ESQUECIMENTOS
    const perfisList = Object.values(clientesPerfilMap);
    const dificuldades = perfisList.filter(p => p.EsqueceBoleto === "SIM" || p.DificuldadeAutoatendimento === "SIM");

    if (dificuldades.length === 0) {
      dificuldadesTableBody.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-slate-500">Nenhum cliente sinalizado.</td></tr>`;
    } else {
      dificuldades.sort((a, b) => b.TotalAtrasos - a.TotalAtrasos);
      dificuldades.forEach(p => {
        const tr = document.createElement("tr");
        
        let tagsHtml = "";
        if (p.EsqueceBoleto === "SIM") {
          tagsHtml += `<span class="bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold mr-1">Esquece 🧠</span>`;
        }
        if (p.DificuldadeAutoatendimento === "SIM") {
          tagsHtml += `<span class="bg-amber-950/40 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold">Dificuldade ⚠️</span>`;
        }

        let codigo = p.Codigo || "";
        if (!codigo) {
          const contato = (p.Codigo && contatosCorrigidosMap[p.Codigo]) || contatosCorrigidosMap[p.CNPJ];
          if (contato) codigo = contato.Codigo || "";
        }

        tr.innerHTML = `
          <td class="font-semibold text-slate-200 py-2">
            <div><span class="text-cyan-400 font-mono text-[10px] mr-1">[${codigo || '--'}]</span>${p.Cliente}</div>
          </td>
          <td class="text-center py-2 flex items-center justify-center h-full">${tagsHtml}</td>
        `;
        dificuldadesTableBody.appendChild(tr);
      });
    }
  }

  function exportarExcel() {
    const selectedMonth = reportMonthSelect.value;
    if (!selectedMonth) {
      showToast("Nenhum dado para exportar.", "warning");
      return;
    }

    const statusFilterVal = reportStatusFilter ? reportStatusFilter.value : "todos";
    
    const faturasMes = clientsData.filter(c => {
      if (c.Vencimento && c.Vencimento.includes("/")) {
        const parts = c.Vencimento.split("/");
        const matchMonth = `${parts[1]}/${parts[2]}` === selectedMonth;
        if (!matchMonth) return false;
        
        if (statusFilterVal === "todos") return true;
        if (statusFilterVal === "não pago") return c.Status === "Não Pago" || c.Status === "Sem Interesse";
        if (statusFilterVal === "negociando") return c.Status === "Negociando" || c.Status === "Promessa";
        return c.Status.toLowerCase() === statusFilterVal;
      }
      return false;
    });

    if (faturasMes.length === 0) {
      showToast("Nenhum dado filtrado para exportar.", "warning");
      return;
    }

    const exportData = faturasMes.map(f => {
      let ultimaOcorrencia = "";
      if (f.Historico && f.Historico.length > 0) {
        const ultimo = f.Historico[f.Historico.length - 1];
        ultimaOcorrencia = `${ultimo.data} - ${ultimo.obs || ultimo.status}`;
      } else if (f.Observacao && !f.Observacao.startsWith("[")) {
        ultimaOcorrencia = f.Observacao;
      }
      return {
        "Código ERP": f.Codigo || "",
        "Cliente": f.Cliente,
        "CNPJ": f.CNPJ,
        "Vencimento": f.Vencimento,
        "Emissão": f.Emissao,
        "Valor": f.Valor,
        "Parcela": f.Parcela,
        "NF": f.NF || "",
        "Vendedor": f.Vendedor || "",
        "Status": f.Status,
        "Telefone Cobrado": f.TelefoneCobrado || "",
        "Última Ocorrência": ultimaOcorrencia
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    const maxProps = [];
    exportData.forEach(row => {
      Object.keys(row).forEach((key, colIdx) => {
        const valStr = String(row[key] || "");
        const length = Math.max(valStr.length, key.length);
        maxProps[colIdx] = Math.max(maxProps[colIdx] || 10, length);
      });
    });
    worksheet["!cols"] = maxProps.map(w => ({ wch: w + 2 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
    
    const monthName = reportMonthSelect.options[reportMonthSelect.selectedIndex]?.text.replace("/", "-") || selectedMonth;
    const fileName = `cobrancas_ameripan_${monthName}_${statusFilterVal}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    showToast("Excel exportado com sucesso!", "success");
  }

  function exportarPDF() {
    const selectedMonth = reportMonthSelect.value;
    if (!selectedMonth) {
      showToast("Nenhum dado para exportar.", "warning");
      return;
    }

    const statusFilterVal = reportStatusFilter ? reportStatusFilter.value : "todos";
    
    const faturasMes = clientsData.filter(c => {
      if (c.Vencimento && c.Vencimento.includes("/")) {
        const parts = c.Vencimento.split("/");
        const matchMonth = `${parts[1]}/${parts[2]}` === selectedMonth;
        if (!matchMonth) return false;
        
        if (statusFilterVal === "todos") return true;
        if (statusFilterVal === "não pago") return c.Status === "Não Pago" || c.Status === "Sem Interesse";
        if (statusFilterVal === "negociando") return c.Status === "Negociando" || c.Status === "Promessa";
        return c.Status.toLowerCase() === statusFilterVal;
      }
      return false;
    });

    if (faturasMes.length === 0) {
      showToast("Nenhum dado para imprimir.", "warning");
      return;
    }

    const monthText = reportMonthSelect.options[reportMonthSelect.selectedIndex]?.text || selectedMonth;
    const statusText = reportStatusFilter.options[reportStatusFilter.selectedIndex]?.text || "Todos";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Por favor, ative os popups para imprimir.", "danger");
      return;
    }

    const rowsHtml = faturasMes.map(c => {
      let ultimaOcorrencia = "--";
      if (c.Historico && c.Historico.length > 0) {
        const ultimo = c.Historico[c.Historico.length - 1];
        ultimaOcorrencia = `${ultimo.data.split(" ")[0]} - ${ultimo.obs || ultimo.status}`;
      } else if (c.Observacao && !c.Observacao.startsWith("[")) {
        ultimaOcorrencia = c.Observacao;
      }
      
      return `
        <tr>
          <td>
            <strong>[${c.Codigo || '--'}] ${c.Cliente}</strong><br>
            <span style="font-size: 9px; color: #555;">CNPJ: ${c.CNPJ || 'N/A'} | Lanço: ${c.Lanco} | NF: ${c.NF || '--'}</span>
          </td>
          <td>${c.Vencimento}</td>
          <td>${formatarMoeda(c.Valor)}</td>
          <td>${c.Parcela}</td>
          <td><span class="status-text ${c.Status.toLowerCase().replace(/\s+/g, '-')}">${c.Status}</span></td>
          <td style="font-size: 10px; max-width: 250px; word-break: break-all;">${ultimaOcorrencia}</td>
        </tr>
      `;
    }).join("");

    const totalCobrado = faturasMes.reduce((acc, c) => acc + c.Valor, 0);
    const totalRecuperado = faturasMes.filter(c => c.Status === "Pago").reduce((acc, c) => acc + c.Valor, 0);
    const totalNegociando = faturasMes.filter(c => c.Status === "Negociando" || c.Status === "Promessa").reduce((acc, c) => acc + c.Valor, 0);
    const totalAberto = totalCobrado - totalRecuperado - totalNegociando;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Gerencial de Cobrança - Ameripan</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #000;
            background: #fff;
            padding: 30px;
            font-size: 11px;
            line-height: 1.4;
          }
          .header {
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 18px;
            margin: 0;
            font-weight: 700;
          }
          .header p {
            margin: 4px 0 0 0;
            font-size: 11px;
            color: #444;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .summary-card {
            border: 1px solid #ccc;
            padding: 10px;
            border-radius: 4px;
            background: #fafafa;
          }
          .summary-card span {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 600;
            color: #666;
            display: block;
          }
          .summary-card h3 {
            font-size: 14px;
            margin: 4px 0 0 0;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 7px 10px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
          }
          tr:nth-child(even) {
            background-color: #fafafa;
          }
          .status-text {
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
          }
          .status-text.pago { color: #166534; }
          .status-text.pendente { color: #5f6b7c; }
          .status-text.sem-resposta { color: #374151; }
          .status-text.negociando, .status-text.promessa { color: #1e40af; }
          .status-text.não-pago, .status-text.incorreto { color: #991b1b; }
          
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Ameripan Distribuidora - Relatório de Cobrança</h1>
          <p>
            <strong>Mês de Vencimento:</strong> ${monthText} | 
            <strong>Filtro de Status:</strong> ${statusText} | 
            <strong>Data de Emissão:</strong> ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
          </p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <span>Total Cobrado</span>
            <h3>${formatarMoeda(totalCobrado)}</h3>
          </div>
          <div class="summary-card">
            <span>Total Recuperado</span>
            <h3>${formatarMoeda(totalRecuperado)}</h3>
          </div>
          <div class="summary-card">
            <span>Total Negociando</span>
            <h3>${formatarMoeda(totalNegociando)}</h3>
          </div>
          <div class="summary-card">
            <span>Em Aberto</span>
            <h3>${formatarMoeda(totalAberto)}</h3>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Cliente / Lanço / NF</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Parcela</th>
              <th>Status</th>
              <th>Última Nota / Ocorrência</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function exportarLoteParaNuvem() {
    if (clientsData.length === 0) {
      showToast("Nenhum dado para exportar.", "warning");
      return;
    }
    
    if (!CONFIG.APPS_SCRIPT_URL) {
      showToast("URL do Apps Script não configurada.", "danger");
      return;
    }
    
    updateConnectionState(null, "Exportando lote de faturas...");
    showToast("Iniciando exportação de lote...", "info");

    // Compilar perfis e contatos únicos de todos os clientes no lote
    const clientesUnicos = {};
    clientsData.forEach(c => {
      const key = String(c.Codigo || c.CNPJ || "").trim();
      if (!key) return;
      if (!clientesUnicos[key]) {
        clientesUnicos[key] = {
          Codigo: c.Codigo || "",
          CNPJ: c.CNPJ || "",
          Cliente: c.Cliente,
          PlanilhaFone1: c.PlanilhaFone1,
          PlanilhaFone2: c.PlanilhaFone2,
          Fone1: c.Fone1,
          Fone2: c.Fone2,
          Fone1Confirmado: c.Fone1Confirmado || "NÃO",
          Fone2Confirmado: c.Fone2Confirmado || "NÃO",
          NomeContato: c.NomeContato || "",
          Status: c.Status
        };
      } else {
        if (c.Status !== "Pago" && clientesUnicos[key].Status === "Pago") {
          clientesUnicos[key].Status = c.Status;
        }
      }
    });

    const perfisList = [];
    const contatosList = [];

    Object.keys(clientesUnicos).forEach(key => {
      const cu = clientesUnicos[key];
      const perfilCached = clientesPerfilMap[key] || { EsqueceBoleto: "NÃO", DificuldadeAutoatendimento: "NÃO" };
      const faturasCliente = clientsData.filter(c => {
        if (cu.Codigo && c.Codigo === cu.Codigo) return true;
        if (cu.CNPJ && c.CNPJ === cu.CNPJ) return true;
        return false;
      });
      const totalFaturas = faturasCliente.length || 1;
      const totalAtrasos = faturasCliente.filter(c => c.Status === "Pendente" || c.Status === "Não Pago" || c.Status === "Sem Resposta").length;

      const tPlan1 = (cu.PlanilhaFone1 && cu.PlanilhaFone1.valido) ? cu.PlanilhaFone1.exibicao : (perfilCached.TelefonePlanilha1 || "");
      const tPlan2 = (cu.PlanilhaFone2 && cu.PlanilhaFone2.valido) ? cu.PlanilhaFone2.exibicao : (perfilCached.TelefonePlanilha2 || "");

      perfisList.push({
        Codigo: cu.Codigo,
        CNPJ: cu.CNPJ,
        Cliente: cu.Cliente,
        EsqueceBoleto: perfilCached.EsqueceBoleto || "NÃO",
        DificuldadeAutoatendimento: perfilCached.DificuldadeAutoatendimento || "NÃO",
        TotalFaturas: totalFaturas,
        TotalAtrasos: totalAtrasos,
        UltimaOcorrencia: cu.Status,
        TelefonePlanilha1: tPlan1,
        TelefonePlanilha2: tPlan2
      });

      // Também salvar o perfil localmente
      clientesPerfilMap[key] = {
        Codigo: cu.Codigo,
        CNPJ: cu.CNPJ,
        Cliente: cu.Cliente,
        EsqueceBoleto: perfilCached.EsqueceBoleto || "NÃO",
        DificuldadeAutoatendimento: perfilCached.DificuldadeAutoatendimento || "NÃO",
        TotalFaturas: totalFaturas,
        TotalAtrasos: totalAtrasos,
        UltimaOcorrencia: cu.Status,
        TelefonePlanilha1: tPlan1,
        TelefonePlanilha2: tPlan2
      };
    });

    // Enviar todas as correções de contato do cache
    Object.keys(contatosCorrigidosMap).forEach(key => {
      contatosList.push(contatosCorrigidosMap[key]);
    });

    const payload = {
      token: CONFIG.PASSWORD,
      action: "salvar_ocorrencia",
      cobrancas: clientsData.map(client => ({
        CodCliente: client.Codigo || "",
        Lancamento: client.ChaveUnica,
        Cliente: client.Cliente,
        Emissao: client.Emissao,
        Vencimento: client.Vencimento,
        Valor: client.Valor,
        Parcela: client.Parcela,
        TelefoneCobrado: client.TelefoneCobrado || "",
        Status: client.Status,
        Observacao: client.Observacao || "" 
      })),
      perfis: perfisList,
      contatos: contatosList
    };
    
    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      showToast("Lote exportado com sucesso para a nuvem!", "success");
      updateConnectionState(true, "Lote exportado!");
      
      buscarHistoricoSheets();
    } catch (err) {
      console.error(err);
      showToast("Falha ao exportar lote.", "danger");
      updateConnectionState(false, "Erro na exportação de lote.");
    }
  }

  if (cloudPullBtn) {
    cloudPullBtn.addEventListener("click", () => {
      buscarHistoricoSheets();
    });
  }

  if (cloudPushBtn) {
    cloudPushBtn.addEventListener("click", exportarLoteParaNuvem);
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener("click", exportarExcel);
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", exportarPDF);
  }

  if (reportStatusFilter) {
    reportStatusFilter.addEventListener("change", gerarRelatoriosMensais);
  }

  function resetarKPIsRelatorio() {
    repTotalCobrado.textContent = "R$ 0,00";
    repTotalRecuperado.textContent = "R$ 0,00";
    repTotalNegociando.textContent = "R$ 0,00";
    repTotalPerdas.textContent = "R$ 0,00";
    repRecoveryRateLabel.textContent = "0.0%";
    repRecoveryRateBar.style.width = "0%";
    repStatusChart.innerHTML = `<p class="text-xs text-slate-500">Nenhum gráfico disponível.</p>`;
  }

  // --- 9. NOTIFICAÇÕES TOAST ---
  
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast-message`;
    
    let iconName = "info";
    let iconColor = "text-cyan-400";
    
    if (type === "success") {
      iconName = "check-circle";
      iconColor = "text-emerald-400";
    } else if (type === "warning") {
      iconName = "alert-triangle";
      iconColor = "text-amber-400";
    } else if (type === "danger") {
      iconName = "x-circle";
      iconColor = "text-rose-400";
    }
    
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 ${iconColor} shrink-0"></i>
      <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => toast.classList.add("show"), 50);
    
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
});
