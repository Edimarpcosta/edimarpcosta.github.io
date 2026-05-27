// ==========================================================================
// FRONTEND JAVASCRIPT - FISPAL 2026
// Gerencia Estado, IndexedDB, Busca e Chamadas ao GAS
// ==========================================================================

// Estado Global
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxsJcdA4T6DHGkpVnjefu4Kn7zrytUeRZ9ksupKz27vjhcP59u4XtRAGFJNALe7xer6/exec";
let CONFIG = {
  gasUrl: localStorage.getItem("gas_web_app_url") || DEFAULT_GAS_URL
};

let appState = {
  selectedVendedor: localStorage.getItem("selected_vendedor") || "",
  selectedClient: null,
  vendedoresList: [],
  cardapioList: [],
  experimentouList: JSON.parse(localStorage.getItem("local_experimentou_list") || "[]"),
  feedbacksList: JSON.parse(localStorage.getItem("local_feedbacks_list") || "[]"),
  clientesAtendidosList: [],
  cartItems: [], 
  tastedSessionItems: [] 
};

// Banco de Dados IndexedDB para Persistência
let db = null;
const DB_NAME = "FispalCartDB";
const DB_VERSION = 3; 
const STORE_NAME = "carts";
const CLIENT_STORE_NAME = "clients";
const SYNC_STORE_NAME = "sync_queue";

// ==========================================
// FEEDBACK SONORO (WEB AUDIO API)
// ==========================================
const SoundFX = {
  ctx: null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playClick() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1500, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  },

  playSuccess() {
    this.init();
    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    gain.connect(this.ctx.destination);

    // Acorde ascendente (880Hz -> 1320Hz)
    const osc1 = this.ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(880, t);
    osc1.connect(gain);
    osc1.start(t);
    osc1.stop(t + 0.2);

    const osc2 = this.ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1320, t + 0.08);
    osc2.connect(gain);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.3);
  },

  playSwoosh() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
};

// Inicializa IndexedDB
function initDB(callback) {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  
  request.onerror = function(event) {
    console.error("Erro ao abrir IndexedDB:", event);
    if (callback) callback();
  };
  
  request.onsuccess = function(event) {
    db = event.target.result;
    console.log("IndexedDB inicializado com sucesso.");
    if (callback) callback();
  };
  
  request.onupgradeneeded = function(event) {
    const dbInstance = event.target.result;
    if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
      dbInstance.createObjectStore(STORE_NAME, { keyPath: "clientCode" });
    }
    if (!dbInstance.objectStoreNames.contains(CLIENT_STORE_NAME)) {
      dbInstance.createObjectStore(CLIENT_STORE_NAME, { keyPath: "codigo" });
    }
    if (!dbInstance.objectStoreNames.contains(SYNC_STORE_NAME)) {
      dbInstance.createObjectStore(SYNC_STORE_NAME, { keyPath: "id", autoIncrement: true });
    }
  };
}

// ==========================================
// FUNÇÕES DE FILA OFFline & TEMA CLARO/ESCURO
// ==========================================

function toggleTheme() {
  SoundFX.playSwoosh();
  const body = document.body;
  const isLight = body.classList.toggle("light-theme");
  localStorage.setItem("theme_preference", isLight ? "light" : "dark");
  updateThemeIcon(isLight);
}

function updateThemeIcon(isLight) {
  const icon = document.getElementById("theme-icon");
  if (!icon) return;
  if (isLight) {
    icon.innerHTML = `
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    `;
  } else {
    icon.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;
  }
}

function toggleOfflineMode() {
  SoundFX.playClick();
  appState.offlineMode = !appState.offlineMode;
  localStorage.setItem("offline_mode", appState.offlineMode);
  updateOfflineUI();
  updateAlertBar();
  if (!appState.offlineMode) {
    checkSyncQueueCount();
  }
}

function updateOfflineUI() {
  const btn = document.getElementById("offline-toggle-btn");
  if (!btn) return;
  
  if (appState.offlineMode) {
    btn.classList.add("is-offline");
    btn.title = "Modo Conexão (Forçado Offline)";
  } else {
    btn.classList.remove("is-offline");
    btn.title = "Modo Conexão (Online)";
  }
}

function updateAlertBar() {
  const bar = document.getElementById("offline-alert-bar");
  if (!bar) return;
  if (appState.offlineMode) {
    bar.classList.remove("hidden");
    document.body.classList.add("has-offline-bar");
  } else {
    bar.classList.add("hidden");
    document.body.classList.remove("has-offline-bar");
  }
}

window.addEventListener("online", () => {
  console.log("Internet conectada.");
  if (!appState.offlineMode) {
    checkSyncQueueCount();
  }
});

function addToSyncQueue(action, payload, callback) {
  if (!db) {
    if (callback) callback();
    return;
  }
  const transaction = db.transaction([SYNC_STORE_NAME], "readwrite");
  const store = transaction.objectStore(SYNC_STORE_NAME);
  
  const item = {
    action: action,
    payload: payload,
    timestamp: new Date().toISOString()
  };
  
  const req = store.add(item);
  req.onsuccess = function() {
    console.log("Enfileirado para sync offline:", action);
    checkSyncQueueCount();
    if (callback) callback();
  };
  req.onerror = function(e) {
    console.error("Erro ao enfileirar:", e);
    if (callback) callback();
  };
}

function checkSyncQueueCount(callback) {
  if (!db) {
    if (callback) callback(0);
    return;
  }
  try {
    const transaction = db.transaction([SYNC_STORE_NAME], "readonly");
    const store = transaction.objectStore(SYNC_STORE_NAME);
    const req = store.count();
    
    req.onsuccess = function(event) {
      const count = event.target.result;
      updateSyncBadge(count);
      renderSyncQueueDiagnostics();
      if (callback) callback(count);
    };
    req.onerror = function() {
      if (callback) callback(0);
    };
  } catch(e) {
    if (callback) callback(0);
  }
}

function updateSyncBadge(count) {
  const btn = document.getElementById("sync-queue-btn");
  const badge = document.getElementById("sync-badge");
  if (!btn || !badge) return;
  
  if (count > 0) {
    btn.classList.remove("hidden");
    badge.textContent = count;
  } else {
    btn.classList.add("hidden");
  }
}

// INSPEÇÃO DETALHADA E OPERACIONAL DA FILA OFFLINE
function renderSyncQueueDiagnostics() {
  const container = document.getElementById("sync-queue-diagnostics");
  const countBadge = document.getElementById("diag-queue-count");
  if (!container || !db) return;

  try {
    const transaction = db.transaction([SYNC_STORE_NAME], "readonly");
    const store = transaction.objectStore(SYNC_STORE_NAME);
    const req = store.getAll();

    req.onsuccess = function(event) {
      const list = event.target.result || [];
      
      if (countBadge) {
        countBadge.textContent = `${list.length} pendentes`;
        if (list.length > 0) countBadge.classList.add("has-items");
        else countBadge.classList.remove("has-items");
      }

      if (list.length === 0) {
        container.innerHTML = `<p class="diag-empty">✅ Nenhum dado pendente de envio.</p>`;
        return;
      }

      container.innerHTML = "";
      list.forEach(item => {
        const div = document.createElement("div");
        div.className = "diag-item";
        
        let label = "Ação Desconhecida";
        let detail = "";
        let typeClass = "diag-type-atendimento";

        if (item.action === "registrar_atendimento") {
          label = "Atendimento";
          detail = item.payload.razao_social || `Cód: ${item.payload.codigo}`;
          typeClass = "diag-type-atendimento";
        } else if (item.action === "registrar_experimentou") {
          label = "Degustação";
          detail = `Cód Cliente: ${item.payload.cod_cliente}`;
          typeClass = "diag-type-experimentou";
        } else if (item.action === "salvar_feedback") {
          label = "Feedback";
          detail = item.payload.razao_social || `Cliente: ${item.payload.cod_cliente}`;
          typeClass = "diag-type-feedback";
        }

        const date = new Date(item.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

        div.innerHTML = `
          <span class="diag-item-type ${typeClass}">${label}</span>
          <div class="diag-item-info">
            <strong>${detail}</strong>
            <small>Capturado às ${date}</small>
          </div>
        `;
        container.appendChild(div);
      });
    };
  } catch(e) {
    console.error("Erro ao renderizar diagnóstico da fila:", e);
  }
}

let isSyncing = false;
function syncOfflineQueue() {
  if (isSyncing) return;
  if (appState.offlineMode) {
    alert("Desative o Modo Offline (clicando no ícone do sinal de Wi-Fi) para poder sincronizar os dados.");
    return;
  }
  if (!navigator.onLine) {
    alert("Você não possui conexão com a internet no momento. Verifique sua rede e tente novamente.");
    return;
  }
  
  isSyncing = true;
  const btn = document.getElementById("sync-queue-btn");
  if (btn) btn.classList.add("pulsing");
  
  showLoading(true);
  
  const transaction = db.transaction([SYNC_STORE_NAME], "readonly");
  const store = transaction.objectStore(SYNC_STORE_NAME);
  const req = store.getAll();
  
  req.onsuccess = function(event) {
    const queue = event.target.result || [];
    if (queue.length === 0) {
      isSyncing = false;
      if (btn) btn.classList.remove("pulsing");
      showLoading(false);
      return;
    }
    
    let index = 0;
    function syncNext() {
      if (index >= queue.length) {
        isSyncing = false;
        if (btn) btn.classList.remove("pulsing");
        showLoading(false);
        checkSyncQueueCount(() => {
          SoundFX.playSuccess();
          alert("Sincronização concluída com sucesso! Todos os dados pendentes foram gravados na planilha.");
          fetchInitialData();
        });
        return;
      }
      
      const item = queue[index];
      sendRequestToServer(item.action, item.payload, (success) => {
        if (success) {
          const delTx = db.transaction([SYNC_STORE_NAME], "readwrite");
          const delStore = delTx.objectStore(SYNC_STORE_NAME);
          delStore.delete(item.id);
          delTx.oncomplete = function() {
            index++;
            syncNext();
          };
        } else {
          isSyncing = false;
          if (btn) btn.classList.remove("pulsing");
          showLoading(false);
          checkSyncQueueCount();
          alert("Houve uma falha ao sincronizar o item " + (index + 1) + ". Sincronização interrompida.");
        }
      });
    }
    
    syncNext();
  };
  
  req.onerror = function() {
    isSyncing = false;
    if (btn) btn.classList.remove("pulsing");
    showLoading(false);
    alert("Erro ao ler fila do banco local.");
  };
}

function sendRequestToServer(action, payload, callback) {
  if (!CONFIG.gasUrl) {
    if (callback) callback(false);
    return;
  }
  
  fetch(CONFIG.gasUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(() => {
    if (callback) callback(true);
  })
  .catch(err => {
    console.error("Erro no envio offline:", err);
    if (callback) callback(false);
  });
}

function saveCartToDB(clientCode, items) {
  if (!db) return;
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.put({ clientCode: clientCode, items: items });
}

function loadCartFromDB(clientCode, callback) {
  if (!db) {
    if (callback) callback([]);
    return;
  }
  const transaction = db.transaction([STORE_NAME], "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.get(clientCode);
  
  request.onerror = function() {
    if (callback) callback([]);
  };
  
  request.onsuccess = function(event) {
    if (event.target.result) {
      callback(event.target.result.items);
    } else {
      callback([]);
    }
  };
}

function deleteCartFromDB(clientCode) {
  if (!db) return;
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.delete(clientCode);
}

function cacheClientsToDB(clients, callback) {
  if (!db) {
    if (callback) callback();
    return;
  }
  const transaction = db.transaction([CLIENT_STORE_NAME], "readwrite");
  const store = transaction.objectStore(CLIENT_STORE_NAME);
  
  const clearRequest = store.clear();
  clearRequest.onsuccess = function() {
    if (clients.length === 0) {
      if (callback) callback();
      return;
    }
    
    let count = 0;
    clients.forEach(c => {
      if (!c.codigo) {
        c.codigo = "FISPAL-TEMP-" + Math.floor(10000 + Math.random() * 90000);
      }
      const req = store.put(c);
      req.onsuccess = function() {
        count++;
        if (count === clients.length) {
          if (callback) callback();
        }
      };
      req.onerror = function() {
        count++;
        if (count === clients.length) {
          if (callback) callback();
        }
      };
    });
  };
  clearRequest.onerror = function() {
    if (callback) callback();
  };
}

function searchClientsInDB(query, callback) {
  if (!db) {
    if (callback) callback([]);
    return;
  }
  const transaction = db.transaction([CLIENT_STORE_NAME], "readonly");
  const store = transaction.objectStore(CLIENT_STORE_NAME);
  const request = store.getAll();
  
  request.onsuccess = function(event) {
    const allClients = event.target.result || [];
    const queryClean = query.toLowerCase().trim();
    const results = allClients.filter(c => 
      c.codigo.toLowerCase().includes(queryClean) ||
      c.razao_social.toLowerCase().includes(queryClean) ||
      c.fantasia.toLowerCase().includes(queryClean)
    );
    callback(results);
  };
  request.onerror = function() {
    callback([]);
  };
}

function downloadAndCacheClients(vendedor, callback) {
  if (!CONFIG.gasUrl || !vendedor) {
    if (callback) callback();
    return;
  }
  
  const url = `${CONFIG.gasUrl}?action=get_seller_clients&vendedor=${encodeURIComponent(vendedor)}`;
  fetch(url)
    .then(res => res.json())
    .then(clients => {
      cacheClientsToDB(clients, () => {
        console.log(`Cached ${clients.length} clients for seller ${vendedor}`);
        if (callback) callback();
      });
    })
    .catch(err => {
      console.error("Error fetching seller clients:", err);
      if (callback) callback();
    });
}

function saveLocalExperimentou(codCliente, idFispal, codsLancamentos) {
  let localList = JSON.parse(localStorage.getItem("local_experimentou_list") || "[]");
  const exists = localList.some(item => 
    item.cod_cliente.toString() === codCliente.toString() &&
    item.ID_FISPAL.toString() === idFispal.toString()
  );
  if (!exists) {
    localList.push({
      cod_cliente: codCliente,
      ID_FISPAL: idFispal,
      cod_produto_lancamento: codsLancamentos
    });
    localStorage.setItem("local_experimentou_list", JSON.stringify(localList));
  }
}

function loadAndMergeExperimentou(serverList) {
  let localList = JSON.parse(localStorage.getItem("local_experimentou_list") || "[]");
  const merged = [...localList];
  serverList.forEach(srvItem => {
    const exists = merged.some(locItem => 
      locItem.cod_cliente.toString() === srvItem.cod_cliente.toString() &&
      locItem.ID_FISPAL.toString() === srvItem.ID_FISPAL.toString()
    );
    if (!exists) {
      merged.push({
        cod_cliente: srvItem.cod_cliente,
        ID_FISPAL: srvItem.ID_FISPAL,
        cod_produto_lancamento: srvItem.cod_produto_lancamento
      });
    }
  });
  localStorage.setItem("local_experimentou_list", JSON.stringify(merged));
  return merged;
}

function loadAndMergeFeedbacks(serverList) {
  let localList = JSON.parse(localStorage.getItem("local_feedbacks_list") || "[]");
  const merged = [...localList];
  serverList.forEach(srvItem => {
    const exists = merged.some(locItem => 
      locItem["Código Cliente"]?.toString() === srvItem["Código Cliente"]?.toString() &&
      locItem["ID FISPAL"]?.toString() === srvItem["ID FISPAL"]?.toString() &&
      locItem["Timestamp"] === srvItem["Timestamp"]
    );
    if (!exists) {
      merged.push(srvItem);
    }
  });
  
  merged.sort((a, b) => {
    try {
      const parseDate = (s) => {
        const parts = s.split(', ');
        if (parts.length === 2) {
          const d = parts[0].split('/');
          const t = parts[1].split(':');
          return new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2]);
        }
        return new Date(s);
      };
      return parseDate(b.Timestamp) - parseDate(a.Timestamp);
    } catch(e) {
      return 0;
    }
  });
  
  localStorage.setItem("local_feedbacks_list", JSON.stringify(merged));
  return merged;
}

function moveCartToTastedSession(client, itemsServed) {
  const clientKey = client.codigo || client.razao_social;
  
  appState.tastedSessionItems = [...appState.tastedSessionItems, ...itemsServed];
  localStorage.setItem("pending_tastings_" + clientKey, JSON.stringify(appState.tastedSessionItems));
  
  itemsServed.forEach(item => {
    const listCods = item.cods_lançamentos.toString().split(',').map(c => c.trim());
    saveLocalExperimentou(client.codigo, item.ID_FISPAL, listCods.join(", "));
  });
  
  appState.cartItems = [];
  deleteCartFromDB(clientKey);
}

function clearTastedSession(client) {
  const clientKey = client.codigo || client.razao_social;
  appState.tastedSessionItems = [];
  localStorage.removeItem("pending_tastings_" + clientKey);
}

window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme_preference");
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    updateThemeIcon(true);
  } else {
    updateThemeIcon(false);
  }

  initDB(() => {
    appState.offlineMode = localStorage.getItem("offline_mode") === "true";
    updateOfflineUI();
    updateAlertBar();
    
    checkSyncQueueCount();

    if (appState.selectedVendedor) {
      document.getElementById("vendedor-screen").classList.add("hidden");
    }
    updateUserBranding();
    
    document.getElementById("gas-url-input").value = CONFIG.gasUrl;
    
    renderCatalog();
    fetchInitialData();
  });
  
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-input-wrapper")) {
      document.getElementById("search-results-dropdown").classList.remove("active");
    }
  });
});

function openSettings() {
  document.getElementById("settings-modal").classList.add("active");
}

function closeSettings() {
  document.getElementById("settings-modal").classList.remove("active");
}

function saveSettings() {
  const url = document.getElementById("gas-url-input").value.trim();
  if (url === "") {
    alert("Por favor, insira uma URL válida.");
    return;
  }
  localStorage.setItem("gas_web_app_url", url);
  CONFIG.gasUrl = url;
  closeSettings();
  alert("Configurações salvas! Recarregando dados...");
  fetchInitialData();
}

function atualizarDados(btn) {
  if (btn) {
    btn.classList.add("spinning");
  }
  
  fetchInitialData();
  
  if (appState.selectedVendedor) {
    downloadAndCacheClients(appState.selectedVendedor, () => {
      if (btn) {
        btn.classList.remove("spinning");
      }
    });
  } else {
    if (btn) {
      btn.classList.remove("spinning");
    }
  }
}

function loginVendedor() {
  const select = document.getElementById("vendedor-select");
  const value = select.value;
  if (!value) {
    alert("Por favor, selecione seu nome.");
    return;
  }
  
  localStorage.setItem("selected_vendedor", value);
  appState.selectedVendedor = value;
  
  updateUserBranding();
  document.getElementById("vendedor-screen").classList.add("hidden");
  
  showLoading(true);
  downloadAndCacheClients(value, () => {
    showLoading(false);
    updateDashboard();
  });
}

function logoutVendedor() {
  if (confirm("Deseja alterar o vendedor atual?")) {
    localStorage.removeItem("selected_vendedor");
    appState.selectedVendedor = "";
    document.getElementById("vendedor-select").value = "";
    document.getElementById("vendedor-screen").classList.remove("hidden");
    updateUserBranding();
  }
}

function updateUserBranding() {
  const vendedorTag = document.getElementById("vendedor-tag");
  const filterDropdown = document.getElementById("dashboard-seller-filter");
  const adminSection = document.getElementById("dashboard-admin-panel");
  const settingsHeaderBtn = document.getElementById("settings-trigger-header");
  const settingsLoginBtn = document.getElementById("settings-trigger-login");
  
  if (appState.selectedVendedor === "EDIMAR PINHEIRO COSTA") {
    vendedorTag.innerHTML = `👑 EDIMAR (Gestor)`;
    vendedorTag.className = "vendedor-badge admin-badge";
    
    if (filterDropdown) {
      filterDropdown.style.display = "block";
      if (!filterDropdown.getAttribute("data-initialized")) {
        filterDropdown.value = "TODOS";
        filterDropdown.setAttribute("data-initialized", "true");
      }
    }
    if (adminSection) {
      adminSection.classList.remove("hidden");
    }
    if (settingsHeaderBtn) {
      settingsHeaderBtn.style.display = "block";
    }
    if (settingsLoginBtn) {
      settingsLoginBtn.style.display = "flex";
    }
  } else {
    vendedorTag.textContent = "Vendedor: " + appState.selectedVendedor;
    vendedorTag.className = "vendedor-badge";
    
    if (filterDropdown) {
      filterDropdown.value = "MEUS";
      filterDropdown.style.display = "none";
    }
    if (adminSection) {
      adminSection.classList.add("hidden");
    }
    if (settingsHeaderBtn) {
      settingsHeaderBtn.style.display = "none";
    }
    if (settingsLoginBtn) {
      settingsLoginBtn.style.display = "none";
    }
  }
}

function fetchInitialData() {
  if (!CONFIG.gasUrl) {
    showLoading(false);
    openSettings();
    populateVendedorSelects([]); 
    renderCardapio();
    return;
  }
  
  showLoading(true);
  const url = `${CONFIG.gasUrl}?action=get_initial_data`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      showLoading(false);
      if (data.success) {
        appState.vendedoresList = data.vendedores || [];
        appState.cardapioList = data.cardapio || [];
        appState.experimentouList = loadAndMergeExperimentou(data.experimentou || []);
        appState.feedbacksList = loadAndMergeFeedbacks(data.feedbacks || []);
        appState.clientesAtendidosList = data.clientes_atendidos || [];
        
        populateVendedorSelects(appState.vendedoresList);
        renderCardapio();
        updateDashboard();
        
        if (appState.selectedVendedor) {
          downloadAndCacheClients(appState.selectedVendedor);
        }
      } else {
        console.error("Erro no retorno do Apps Script:", data.error);
        alert("Erro no backend: " + data.error);
        populateVendedorSelects([]); 
        renderCardapio();
      }
    })
    .catch(error => {
      showLoading(false);
      console.error("Falha ao comunicar com o Google Apps Script:", error);
      populateVendedorSelects([]);
      renderCardapio();
    });
}

function showLoading(show) {
  const loader = document.getElementById("loading-screen");
  if (show) {
    loader.classList.add("active");
  } else {
    loader.classList.remove("active");
  }
}

function populateVendedorSelects(vendedores) {
  const defaultList = [
    "EDIMAR PINHEIRO COSTA",
    "EMANUEL RUFINO DA SILVA",
    "JORDANO SALOMAO VELICO",
    "MARCELO SANTANA NOVAES",
    "MAURICIO EXEL FERREIRA",
    "SERGIO CARRERA LUCCHESI",
    "MARIA CLARA MARTELOSSI FERREIRA"
  ];
  
  const list = vendedores.length > 0 ? vendedores : defaultList;
  
  const selectLogin = document.getElementById("vendedor-select");
  const curValLogin = selectLogin.value;
  selectLogin.innerHTML = '<option value="" disabled selected>Escolha um vendedor...</option>';
  list.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectLogin.appendChild(opt);
  });
  if (curValLogin) selectLogin.value = curValLogin;
  
  const selectNewCli = document.getElementById("new-cli-vendedor");
  selectNewCli.innerHTML = '<option value="" disabled selected>Selecione o vendedor...</option>';
  list.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectNewCli.appendChild(opt);
  });
}

function renderCatalog() {
  const container = document.getElementById("catalog-container");
  container.innerHTML = "";
  
  PRODUCTS_DATA.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-img-container">
        <img src="${p.foto_url}" alt="${p.nome}" onerror="this.src='PICTURES/codigos.jpg'">
        <span class="line-badge">${p.linha}</span>
      </div>
      <div class="product-card-body">
        <span class="product-code">Cód: ${p.cod}</span>
        <h3>${p.nome}</h3>
        <p class="product-short-desc">${p.descricao.substring(0, 100)}...</p>
        <div class="product-card-footer">
          <button class="btn btn-outline btn-block" onclick="openProductDetailModal('${p.cod}')">Visualizar Ficha Técnica</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterCatalog(query) {
  const cleanQuery = query.toLowerCase().trim();
  const cards = document.querySelectorAll("#catalog-container .product-card");
  
  PRODUCTS_DATA.forEach((p, idx) => {
    const card = cards[idx];
    if (!card) return;
    
    if (p.nome.toLowerCase().includes(cleanQuery) || p.cod.includes(cleanQuery) || p.linha.toLowerCase().includes(cleanQuery)) {
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  });
}

function openProductDetailModal(cod) {
  const p = PRODUCTS_DATA.find(item => item.cod === cod);
  if (!p) return;
  
  document.getElementById("detail-product-name").textContent = p.nome;
  document.getElementById("detail-product-img").src = p.foto_url;
  document.getElementById("detail-product-img").onerror = function() { this.src = 'PICTURES/codigos.jpg'; };
  document.getElementById("detail-product-linha").textContent = p.linha;
  document.getElementById("detail-product-description").textContent = p.descricao;
  document.getElementById("detail-product-cod").textContent = p.cod;
  document.getElementById("detail-product-embalagem").textContent = p.embalagem;
  document.getElementById("detail-product-dosagem").textContent = p.dosagem || "Não informada";
  document.getElementById("detail-product-base").textContent = p.degustacao_base || "Puro";
  
  const harmList = document.getElementById("detail-product-harmonizacoes");
  harmList.innerHTML = "";
  if (p.harmonizacoes.length > 0) {
    p.harmonizacoes.forEach(h => {
      const li = document.createElement("li");
      li.textContent = h.replace(';', '').trim();
      harmList.appendChild(li);
    });
  } else {
    harmList.innerHTML = "<li>Nenhuma recomendação</li>";
  }
  
  const combList = document.getElementById("detail-product-combinacoes");
  combList.innerHTML = "";
  if (p.combinacoes_inovadoras.length > 0) {
    p.combinacoes_inovadoras.forEach(c => {
      const li = document.createElement("li");
      li.textContent = c.replace(';', '').trim();
      combList.appendChild(li);
    });
  } else {
    combList.innerHTML = "<li>Nenhuma recomendação</li>";
  }
  
  document.getElementById("product-detail-modal").classList.add("active");
}

function closeProductDetailModal() {
  document.getElementById("product-detail-modal").classList.remove("active");
}

let searchTimeout = null;

function handleClientSearch(val) {
  clearTimeout(searchTimeout);
  const dropdown = document.getElementById("search-results-dropdown");
  
  if (val.length < 2) {
    dropdown.classList.remove("active");
    dropdown.innerHTML = "";
    return;
  }
  
  searchClientsInDB(val, (localResults) => {
    if (localResults.length > 0) {
      renderSearchDropdown(localResults);
    } else {
      searchTimeout = setTimeout(() => {
        if (!CONFIG.gasUrl) {
          const results = [
            { codigo: "1001", cidade: "Americana", razao_social: "Sorvetes Americana Ltda", fantasia: "Sorvetes Americana", vendedor: "EDIMAR PINHEIRO COSTA" },
            { codigo: "1002", cidade: "Campinas", razao_social: "Gelateria Bella Italia", fantasia: "Gelateria Bella Italia", vendedor: "EMANUEL RUFINO DA SILVA" }
          ].filter(c => c.razao_social.toLowerCase().includes(val.toLowerCase()) || c.codigo.includes(val));
          
          renderSearchDropdown(results);
          return;
        }
        
        const url = `${CONFIG.gasUrl}?action=buscar_cliente&query=${encodeURIComponent(val)}`;
        fetch(url)
          .then(res => res.json())
          .then(results => {
            renderSearchDropdown(results);
          })
          .catch(err => {
            console.error("Erro ao buscar cliente:", err);
          });
      }, 350);
    }
  });
}

function renderSearchDropdown(results) {
  const dropdown = document.getElementById("search-results-dropdown");
  dropdown.innerHTML = "";
  
  if (results.length === 0) {
    dropdown.innerHTML = '<div class="search-item" style="cursor: default; color: var(--text-muted);">Nenhum cliente encontrado.</div>';
    dropdown.classList.add("active");
    return;
  }
  
  results.forEach(c => {
    const item = document.createElement("div");
    item.className = "search-item";
    item.innerHTML = `
      <h5>${c.razao_social}</h5>
      <p>Cód: ${c.codigo} | Cidade: ${c.cidade} | Vendedor: ${c.vendedor}</p>
    `;
    item.addEventListener("click", () => {
      selectClient(c);
      dropdown.classList.remove("active");
    });
    dropdown.appendChild(item);
  });
  dropdown.classList.add("active");
}

function selectClient(client) {
  appState.selectedClient = client;
  appState.cartItems = []; 
  renderCardapio();        
  updateCartUI();          
  
  document.getElementById("no-client-selected").classList.add("hidden");
  const display = document.getElementById("client-selected-display");
  display.classList.remove("hidden");
  
  document.getElementById("selected-client-name").textContent = client.razao_social;
  document.getElementById("selected-client-code").textContent = `Cód: ${client.codigo || 'Visitante'}`;
  document.getElementById("selected-client-city").textContent = `Cidade: ${client.cidade}`;
  document.getElementById("selected-client-vendedor").textContent = `Carteira: ${client.vendedor || 'Sem Vendedor'}`;
  
  document.getElementById("cardapio-alert-no-client").classList.add("hidden");
  document.getElementById("cardapio-container-wrapper").classList.remove("hidden");
  
  const clientKey = client.codigo || client.razao_social;
  appState.tastedSessionItems = JSON.parse(localStorage.getItem("pending_tastings_" + clientKey) || "[]");
  
  loadCartFromDB(clientKey, (items) => {
    appState.cartItems = items;
    renderCardapio();
    updateCartUI();
  });
  
  registrarAtendimentoNoGAS(client);
}

function registrarAtendimentoNoGAS(client) {
  const payload = {
    action: "registrar_atendimento",
    codigo: client.codigo,
    cidade: client.cidade,
    razao_social: client.razao_social,
    fantasia: client.fantasia,
    vendedor: client.vendedor,
    vendedor_atendeu: appState.selectedVendedor
  };
  
  if (appState.offlineMode) {
    addToSyncQueue("registrar_atendimento", payload);
    return;
  }
  
  if (!CONFIG.gasUrl) return;
  
  fetch(CONFIG.gasUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(err => {
    console.error("Erro ao gravar registro de atendimento, enfileirando offline:", err);
    addToSyncQueue("registrar_atendimento", payload);
  });
}

function clearSelectedClient() {
  if (appState.cartItems.length > 0) {
    if (!confirm("Deseja mudar de cliente? O carrinho atual ficará salvo no histórico deste cliente.")) {
      return;
    }
  }
  
  appState.selectedClient = null;
  appState.cartItems = [];
  appState.tastedSessionItems = [];
  
  document.getElementById("client-selected-display").classList.add("hidden");
  document.getElementById("no-client-selected").classList.remove("hidden");
  document.getElementById("client-search-input").value = "";
  
  document.getElementById("cardapio-alert-no-client").classList.remove("hidden");
  document.getElementById("cardapio-container-wrapper").classList.add("hidden");
  
  updateCartUI();
  renderCardapio();
}

function openNewClientModal() {
  document.getElementById("new-client-modal").classList.add("active");
}

function closeNewClientModal() {
  document.getElementById("new-client-modal").classList.remove("active");
  document.getElementById("new-client-form").reset();
}

function handleCreateClient(e) {
  e.preventDefault();
  
  let cod = document.getElementById("new-cli-codigo").value.trim();
  const cidade = document.getElementById("new-cli-cidade").value.trim();
  const razao = document.getElementById("new-cli-razao").value.trim();
  const fantasia = document.getElementById("new-cli-fantasia").value.trim();
  const vendedor = document.getElementById("new-cli-vendedor").value;
  
  if (cod === "") {
    cod = "FISPAL-" + Math.floor(1000 + Math.random() * 9000);
  }
  
  const newClient = {
    codigo: cod,
    cidade: cidade,
    razao_social: razao,
    fantasia: fantasia,
    vendedor: vendedor
  };
  
  selectClient(newClient);
  closeNewClientModal();
}

function renderCardapio() {
  const container = document.getElementById("cardapio-grid");
  container.innerHTML = "";
  container.className = "cardapio-checkbox-container";
  
  if (appState.cardapioList.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <p>Nenhuma receita cadastrada na planilha para hoje.</p>
        <p class="font-sm" style="margin-top:8px;">Verifique a aba <strong>cardapio</strong> no Google Sheets.</p>
      </div>
    `;
    return;
  }
  
  const clientCode = appState.selectedClient ? appState.selectedClient.codigo : "";
  
  appState.cardapioList.forEach(item => {
    const id = item.ID_FISPAL;
    const nome = item.nome;
    const desc = item.descrição;
    const cods = item.cods_lançamentos; 
    
    const jaTastouNoPassado = appState.experimentouList.some(exp => 
      exp.cod_cliente.toString() === clientCode.toString() && 
      exp.ID_FISPAL.toString() === id.toString()
    );
    
    const degustouNestaSessao = appState.tastedSessionItems.some(t => t.ID_FISPAL.toString() === id.toString());
    const noCarrinho = appState.cartItems.some(cart => cart.ID_FISPAL.toString() === id.toString());
    
    const listCods = cods.toString().split(',').map(c => c.trim());
    const mainCod = listCods[0];
    const prodRef = PRODUCTS_DATA.find(p => p.cod === mainCod);
    const prodStarName = prodRef ? prodRef.nome : `Lançamento ${mainCod}`;
    
    const row = document.createElement("div");
    
    let itemClasses = "cardapio-checkbox-item";
    if (jaTastouNoPassado) itemClasses += " ja-experimentou";
    else if (degustouNestaSessao) itemClasses += " feedback-pendente";
    else if (noCarrinho) itemClasses += " checked";
    
    row.className = itemClasses;
    
    if (jaTastouNoPassado) {
      row.onclick = null;
    } else if (degustouNestaSessao) {
      row.onclick = () => goToFeedbackTab();
    } else {
      row.onclick = () => {
        toggleCardapioItem(id, noCarrinho);
      };
    }
    
    let statusBadge = "";
    if (jaTastouNoPassado) {
      statusBadge = `<span class="cardapio-status-badge badge-tasted">Degustado</span>`;
    } else if (degustouNestaSessao) {
      statusBadge = `<span class="cardapio-status-badge badge-pending">Avaliar</span>`;
    }
    
    row.innerHTML = `
      <div class="custom-checkbox-wrapper">
        <div class="custom-checkbox">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      </div>
      <div class="cardapio-item-info">
        <div class="cardapio-item-title-row">
          <h3 class="cardapio-item-title"><span class="cardapio-item-id">${id}</span>${nome}</h3>
          ${statusBadge}
        </div>
        <p class="cardapio-item-desc">${desc}</p>
        <div class="cardapio-item-meta">
          Estrela: <strong>${prodStarName}</strong> (Cód: ${mainCod})
        </div>
      </div>
    `;
    
    container.appendChild(row);
  });
}

function toggleCardapioItem(id, isCurrentlyChecked) {
  SoundFX.playClick();
  if (isCurrentlyChecked) {
    removeFromCart(id);
  } else {
    addToCart(id);
  }
}

function addToCart(recipeId) {
  if (!appState.selectedClient) {
    alert("Selecione um cliente no topo antes de adicionar itens.");
    return;
  }
  
  const recipe = appState.cardapioList.find(r => r.ID_FISPAL.toString() === recipeId.toString());
  if (!recipe) return;
  if (appState.cartItems.some(item => item.ID_FISPAL.toString() === recipeId.toString())) return;
  
  appState.cartItems.push(recipe);
  
  const clientKey = appState.selectedClient.codigo || appState.selectedClient.razao_social;
  saveCartToDB(clientKey, appState.cartItems);
  
  renderCardapio();
  updateCartUI();
}

function removeFromCart(recipeId) {
  if (!appState.selectedClient) return;
  
  appState.cartItems = appState.cartItems.filter(item => item.ID_FISPAL.toString() !== recipeId.toString());
  
  const clientKey = appState.selectedClient.codigo || appState.selectedClient.razao_social;
  saveCartToDB(clientKey, appState.cartItems);
  
  renderCardapio();
  updateCartUI();
}

function updateCartUI() {
  const floatCart = document.getElementById("float-cart-bar");
  const count = appState.cartItems.length;
  
  if (count === 0 || !appState.selectedClient) {
    floatCart.classList.add("hidden");
    return;
  }
  
  floatCart.classList.remove("hidden");
  document.getElementById("cart-badge").textContent = count;
  
  if (count === 1) {
    document.getElementById("cart-summary").textContent = `1 sabor selecionado para degustação`;
  } else {
    document.getElementById("cart-summary").textContent = `${count} sabores selecionados para degustação`;
  }
}

function openWaiterModal() {
  if (!appState.selectedClient) return;
  
  const clientName = appState.selectedClient.razao_social;
  document.getElementById("garcom-client-name").textContent = clientName;
  
  const container = document.getElementById("waiter-list-items");
  container.innerHTML = "";
  
  appState.tastedSessionItems.forEach(item => {
    const listCods = item.cods_lançamentos.toString().split(',').map(c => c.trim());
    const mainCod = listCods[0];
    
    const card = document.createElement("div");
    card.className = "waiter-item-card checked already-delivered";
    card.innerHTML = `
      <div class="waiter-item-info">
        <h4><span class="cardapio-item-id" style="color:var(--error); font-weight:800; margin-right:8px;">${item.ID_FISPAL}</span>${item.nome}</h4>
        <p>Lançamento base: Cód ${mainCod} (Já Entregue)</p>
      </div>
      <div class="waiter-check-indicator">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    `;
    container.appendChild(card);
  });
  
  appState.cartItems.forEach(item => {
    const listCods = item.cods_lançamentos.toString().split(',').map(c => c.trim());
    const mainCod = listCods[0];
    
    const card = document.createElement("div");
    card.className = "waiter-item-card pending-delivery";
    card.setAttribute("data-id", item.ID_FISPAL);
    card.innerHTML = `
      <div class="waiter-item-info">
        <h4><span class="cardapio-item-id" style="color:var(--error); font-weight:800; margin-right:8px;">${item.ID_FISPAL}</span>${item.nome}</h4>
        <p>Lançamento base: Cód ${mainCod}</p>
      </div>
      <div class="waiter-check-indicator">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    `;
    
    card.addEventListener("click", () => {
      SoundFX.playClick();
      card.classList.toggle("checked");
      checkWaiterFormCompletion();
    });
    
    container.appendChild(card);
  });
  
  checkWaiterFormCompletion();
  document.getElementById("waiter-modal").classList.add("active");
}

function closeWaiterModal() {
  document.getElementById("waiter-modal").classList.remove("active");
}

function checkWaiterFormCompletion() {
  const pendingCheckedCards = document.querySelectorAll(".waiter-item-card.pending-delivery.checked");
  const btn = document.getElementById("btn-finalizar-garcom");
  
  if (pendingCheckedCards.length > 0) {
    btn.removeAttribute("disabled");
  } else {
    btn.setAttribute("disabled", "true");
  }
}

function finalizarPedidoGarcom() {
  if (!appState.selectedClient) return;
  
  const clientKey = appState.selectedClient.codigo || appState.selectedClient.razao_social;
  
  const checkedCards = document.querySelectorAll(".waiter-item-card.pending-delivery.checked");
  if (checkedCards.length === 0) return;
  
  const idsServed = Array.from(checkedCards).map(card => card.getAttribute("data-id").toString());
  
  const itemsServed = appState.cartItems.filter(item => idsServed.includes(item.ID_FISPAL.toString()));
  const itemsRemaining = appState.cartItems.filter(item => !idsServed.includes(item.ID_FISPAL.toString()));
  
  showLoading(true);
  
  const itensPayload = itemsServed.map(item => {
    const listCods = item.cods_lançamentos.toString().split(',').map(c => c.trim());
    return {
      ID_FISPAL: item.ID_FISPAL,
      cod_produto_lancamento: listCods.join(", ")
    };
  });
  
  const payload = {
    action: "registrar_experimentou",
    cod_cliente: appState.selectedClient.codigo,
    itens: itensPayload
  };
  
  const handleSuccess = (isOffline = false) => {
    showLoading(false);
    SoundFX.playSuccess();
    
    appState.tastedSessionItems = [...appState.tastedSessionItems, ...itemsServed];
    localStorage.setItem("pending_tastings_" + clientKey, JSON.stringify(appState.tastedSessionItems));
    
    itemsServed.forEach(item => {
      const listCods = item.cods_lançamentos.toString().split(',').map(c => c.trim());
      saveLocalExperimentou(appState.selectedClient.codigo, item.ID_FISPAL, listCods.join(", "));
    });
    
    appState.cartItems = itemsRemaining;
    if (itemsRemaining.length > 0) {
      saveCartToDB(clientKey, itemsRemaining);
    } else {
      deleteCartFromDB(clientKey);
    }
    
    updateCartUI();
    closeWaiterModal();
    renderCardapio();
    
    goToFeedbackTab();

    if (isOffline) {
      alert("Degustação salva localmente (Modo Offline). Os dados serão enviados à planilha quando a conexão for restabelecida.");
    }
  };
  
  if (appState.offlineMode) {
    addToSyncQueue("registrar_experimentou", payload, () => {
      handleSuccess(true);
    });
    return;
  }

  if (!CONFIG.gasUrl) {
    handleSuccess();
    return;
  }
  
  fetch(CONFIG.gasUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(() => {
    handleSuccess();
  })
  .catch(err => {
    console.error("Erro ao registrar degustação no Sheets, enfileirando offline:", err);
    addToSyncQueue("registrar_experimentou", payload, () => {
      handleSuccess(true);
    });
  });
}

function goToFeedbackTab() {
  const feedbackTabBtn = document.querySelectorAll(".bottom-nav .nav-item")[2];
  switchTab("tab-feedback", feedbackTabBtn);
}

function renderFeedbackForm() {
  const alertNoClient = document.getElementById("feedback-alert-no-client");
  const formContainer = document.getElementById("feedback-form-container");
  
  if (!appState.selectedClient) {
    alertNoClient.classList.remove("hidden");
    formContainer.classList.add("hidden");
    return;
  }
  
  alertNoClient.classList.add("hidden");
  formContainer.classList.remove("hidden");
  
  document.getElementById("feedback-client-label").textContent = `${appState.selectedClient.razao_social} (${appState.selectedClient.codigo || 'Visitante'})`;
  
  const container = document.getElementById("feedback-items-container");
  container.innerHTML = "";
  
  if (appState.tastedSessionItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); background-color: var(--bg-secondary); border-radius: 16px; border: 1px dashed var(--border-color);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; color: var(--primary);"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
        <h4>Nenhum sabor servido pendente de feedback</h4>
        <p class="font-sm" style="margin-top:6px; max-width:320px; margin-left:auto; margin-right:auto;">
          Vá até a aba <strong>Cardápio</strong>, adicione itens ao pedido e conclua a entrega com o garçom para avaliar os sabores aqui.
        </p>
      </div>
    `;
    document.querySelector(".action-buttons-container").classList.add("hidden");
    return;
  }
  
  document.querySelector(".action-buttons-container").classList.remove("hidden");
  
  appState.tastedSessionItems.forEach((item, index) => {
    const id = item.ID_FISPAL;
    const nome = item.nome;
    const listCods = item.cods_lançamentos.toString().split(',').map(c => c.trim());
    const mainCod = listCods[0];
    
    const prodRef = PRODUCTS_DATA.find(p => p.cod === mainCod);
    const sugeridos = prodRef ? [...prodRef.harmonizacoes, ...prodRef.combinacoes_inovadoras] : [];
    const chipsSugeridos = sugeridos.map(s => s.replace(';', '').trim()).filter((v, i, self) => self.indexOf(v) === i && v !== "");
    
    const imgUrl = prodRef ? prodRef.foto_url : "PICTURES/codigos.jpg";
    
    const formItem = document.createElement("div");
    formItem.className = "feedback-item-form";
    formItem.setAttribute("data-id", id);
    formItem.setAttribute("data-name", nome);
    
    let chipsHtml = "";
    if (chipsSugeridos.length > 0) {
      chipsHtml = `
        <div class="combinations-section">
          <h4>O que combina mais com esse sabor? (Sugeridos)</h4>
          <div class="combinations-list">
            ${chipsSugeridos.map(chip => `<span class="combination-chip" onclick="toggleCombinationChip(this)">${chip}</span>`).join("")}
          </div>
          <input type="text" class="custom-combination-input" placeholder="Outra combinação personalizada...">
        </div>
      `;
    } else {
      chipsHtml = `
        <div class="combinations-section">
          <h4>O que você acha que combina com esse sabor?</h4>
          <input type="text" class="custom-combination-input" placeholder="Digite o que combinaria...">
        </div>
      `;
    }
    
    formItem.innerHTML = `
      <div class="feedback-item-header">
        <img class="feedback-item-img" src="${imgUrl}" alt="${nome}" onerror="this.src='PICTURES/codigos.jpg'">
        <div class="feedback-item-title">
          <h3>${nome}</h3>
          <p>Lançamento: ${prodRef ? prodRef.nome : `Cód ${mainCod}`}</p>
        </div>
      </div>
      
      <div class="rating-section">
        <h4>Nota de avaliação (1 a 10)</h4>
        <div class="rating-scale">
          ${Array.from({length: 10}, (_, i) => i + 1).map(num => `
            <button type="button" class="rating-btn" onclick="selectRating(this, ${num})">${num}</button>
          `).join("")}
        </div>
      </div>
      
      <div class="reaction-section">
        <h4>O que achou do sabor?</h4>
        <div class="reaction-options">
          <div class="reaction-btn" data-reaction="Odiei" onclick="selectReaction(this)">
            <span class="reaction-emoji">👎</span>
            <span class="reaction-label">Odiei</span>
          </div>
          <div class="reaction-btn" data-reaction="Gostou" onclick="selectReaction(this)">
            <span class="reaction-emoji">👍</span>
            <span class="reaction-label">Gostou</span>
          </div>
          <div class="reaction-btn" data-reaction="Amou" onclick="selectReaction(this)">
            <span class="reaction-emoji">❤️</span>
            <span class="reaction-label">Amou</span>
          </div>
        </div>
      </div>
      
      ${chipsHtml}
      
      <div class="comments-section">
        <h4>Comentários adicionais</h4>
        <textarea placeholder="Opcional: Deixe aqui considerações, opiniões ou ideias sobre o produto..."></textarea>
      </div>
    `;
    
    container.appendChild(formItem);
  });
}

function selectRating(btn, rating) {
  SoundFX.playClick();
  const container = btn.closest(".rating-scale");
  container.querySelectorAll(".rating-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  container.setAttribute("data-selected-rating", rating);
}

function selectReaction(btn) {
  SoundFX.playClick();
  const container = btn.closest(".reaction-options");
  container.querySelectorAll(".reaction-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  container.setAttribute("data-selected-reaction", btn.getAttribute("data-reaction"));
}

function toggleCombinationChip(chip) {
  SoundFX.playClick();
  chip.classList.toggle("selected");
}

function submitFeedbacks() {
  if (!appState.selectedClient) return;
  
  const forms = document.querySelectorAll("#feedback-items-container .feedback-item-form");
  const feedbacksPayload = [];
  let missingAssessments = false;
  
  forms.forEach(form => {
    const id = form.getAttribute("data-id");
    const nome = form.getAttribute("data-name");
    
    const scale = form.querySelector(".rating-scale");
    const nota = scale.getAttribute("data-selected-rating");
    
    const reactOpt = form.querySelector(".reaction-options");
    const reacao = reactOpt.getAttribute("data-selected-reaction");
    
    if (!nota || !reacao) {
      missingAssessments = true;
    }
    
    const selectedChips = [];
    form.querySelectorAll(".combination-chip.selected").forEach(chip => {
      selectedChips.push(chip.textContent);
    });
    
    const customInput = form.querySelector(".custom-combination-input");
    if (customInput && customInput.value.trim() !== "") {
      selectedChips.push(customInput.value.trim());
    }
    
    const combinaCom = selectedChips.join(", ");
    const comentarios = form.querySelector(".comments-section textarea").value.trim();
    
    feedbacksPayload.push({
      ID_FISPAL: id,
      nome_receita: nome,
      nota: nota ? parseInt(nota) : "",
      reacao: reacao || "",
      combina_com: combinaCom,
      comentarios: comentarios
    });
  });
  
  if (missingAssessments) {
    const proceed = confirm("Existem sabores que não foram avaliados com Nota ou Reação. Deseja gravar as informações assim mesmo?");
    if (!proceed) return;
  }
  
  showLoading(true);
  
  const payload = {
    action: "salvar_feedback",
    cod_cliente: appState.selectedClient.codigo,
    razao_social: appState.selectedClient.razao_social,
    vendedor_cliente: appState.selectedClient.vendedor,
    vendedor_atendeu: appState.selectedVendedor,
    feedbacks: feedbacksPayload
  };
  
  const handleSuccess = (isOffline = false) => {
    showLoading(false);
    SoundFX.playSuccess();
    
    const dateStr = new Date().toLocaleString('pt-BR');
    feedbacksPayload.forEach(fb => {
      const exists = appState.feedbacksList.some(item => 
        item["Código Cliente"]?.toString() === appState.selectedClient.codigo.toString() &&
        item["ID FISPAL"]?.toString() === fb.ID_FISPAL.toString() &&
        item["Nome Receita"] === fb.nome_receita
      );
      if (!exists) {
        appState.feedbacksList.unshift({
          "Timestamp": dateStr,
          "Código Cliente": appState.selectedClient.codigo,
          "Razão Social": appState.selectedClient.razao_social,
          "Vendedor Cliente": appState.selectedClient.vendedor,
          "Vendedor Atendeu": appState.selectedVendedor,
          "ID FISPAL": fb.ID_FISPAL,
          "Nome Receita": fb.nome_receita,
          "Nota": fb.nota,
          "Reação": fb.reacao,
          "Combina Com": fb.combina_com,
          "Comentários": fb.comentarios
        });
      }
    });
    
    localStorage.setItem("local_feedbacks_list", JSON.stringify(appState.feedbacksList));
    clearTastedSession(appState.selectedClient);
    renderFeedbackForm();
    updateDashboard();
    
    const dashTabBtn = document.querySelectorAll(".bottom-nav .nav-item")[3];
    switchTab("tab-relatorio", dashTabBtn);

    if (isOffline) {
      alert("Feedback gravado localmente (Modo Offline). Os dados serão enviados à planilha quando a conexão for restabelecida.");
    } else {
      alert("Feedbacks gravados com sucesso na planilha!");
    }
  };
  
  if (appState.offlineMode) {
    addToSyncQueue("salvar_feedback", payload, () => {
      handleSuccess(true);
    });
    return;
  }

  if (!CONFIG.gasUrl) {
    handleSuccess(true);
    return;
  }
  
  fetch(CONFIG.gasUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(() => {
    fetchInitialData();
    handleSuccess(false);
  })
  .catch(err => {
    console.error("Erro ao salvar feedbacks, enfileirando offline:", err);
    addToSyncQueue("salvar_feedback", payload, () => {
      handleSuccess(true);
    });
  });
}

function updateDashboard() {
  const totalClientsEl = document.getElementById("stat-total-clients");
  const avgRatingEl = document.getElementById("stat-avg-rating");
  const totalFeedbacksEl = document.getElementById("stat-total-feedbacks");
  
  let feedbacksForStats = appState.feedbacksList;
  
  if (appState.selectedVendedor !== "EDIMAR PINHEIRO COSTA") {
    feedbacksForStats = appState.feedbacksList.filter(f => 
      f["Vendedor Atendeu"] === appState.selectedVendedor
    );
  } else {
    feedbacksForStats = appState.feedbacksList;
  }
  
  const uniqueClients = [...new Set(feedbacksForStats.map(f => f["Código Cliente"]))];
  
  let sum = 0;
  feedbacksForStats.forEach(f => {
    sum += parseFloat(f["Nota"] || 0);
  });
  const avg = feedbacksForStats.length > 0 ? (sum / feedbacksForStats.length).toFixed(1) : "0.0";
  
  totalClientsEl.textContent = uniqueClients.length;
  avgRatingEl.textContent = avg;
  totalFeedbacksEl.textContent = feedbacksForStats.length;
  
  renderAdminPerformancePanel();
  filterDashboard();
}

function renderAdminPerformancePanel() {
  if (appState.selectedVendedor !== "EDIMAR PINHEIRO COSTA") return;
  
  const container = document.getElementById("admin-performance-table");
  if (!container) return;
  container.innerHTML = "";
  
  const performance = {};
  
  const defaultList = appState.vendedoresList.length > 0 ? appState.vendedoresList : [
    "EDIMAR PINHEIRO COSTA",
    "EMANUEL RUFINO DA SILVA",
    "JORDANO SALOMAO VELICO",
    "MARCELO SANTANA NOVAES",
    "MAURICIO EXEL FERREIRA",
    "SERGIO CARRERA LUCCHESI",
    "MARIA CLARA MARTELOSSI FERREIRA"
  ];
  
  defaultList.forEach(v => {
    performance[v] = { feedbacks: 0, sumNotes: 0, clients: new Set() };
  });
  
  appState.feedbacksList.forEach(f => {
    const v = f["Vendedor Atendeu"];
    if (v) {
      if (!performance[v]) {
        performance[v] = { feedbacks: 0, sumNotes: 0, clients: new Set() };
      }
      performance[v].feedbacks += 1;
      performance[v].sumNotes += parseFloat(f["Nota"] || 0);
      performance[v].clients.add(f["Código Cliente"]);
    }
  });
  
  Object.keys(performance).forEach(v => {
    const stats = performance[v];
    const avg = stats.feedbacks > 0 ? (stats.sumNotes / stats.feedbacks).toFixed(1) : "0.0";
    const shortName = v.split(" ")[0] + " " + (v.split(" ")[1] || "");
    
    const card = document.createElement("div");
    card.className = "perf-card";
    card.innerHTML = `
      <h4>${shortName}</h4>
      <div class="perf-stat-row">
        <span>Clientes:</span>
        <strong>${stats.clients.size}</strong>
      </div>
      <div class="perf-stat-row">
        <span>Feedbacks:</span>
        <strong>${stats.feedbacks}</strong>
      </div>
      <div class="perf-stat-row">
        <span>Nota Média:</span>
        <strong style="color:var(--accent-gold);">${avg}</strong>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterDashboard() {
  const searchVal = document.getElementById("dashboard-search").value.toLowerCase().trim();
  const filterDropdown = document.getElementById("dashboard-seller-filter");
  const filterType = filterDropdown ? filterDropdown.value : "MEUS";
  const tbody = document.getElementById("dashboard-table-body");
  tbody.innerHTML = "";
  
  let list = appState.feedbacksList;
  if (filterType === "MEUS") {
    list = list.filter(f => f["Vendedor Atendeu"] === appState.selectedVendedor);
  }
  
  if (searchVal !== "") {
    list = list.filter(f => {
      const client = (f["Razão Social"] || "").toString().toLowerCase();
      const clientCode = (f["Código Cliente"] || "").toString().toLowerCase();
      const recipe = (f["Nome Receita"] || "").toString().toLowerCase();
      const comments = (f["Comentários"] || "").toString().toLowerCase();
      const combination = (f["Combina Com"] || "").toString().toLowerCase();
      const seller = (f["Vendedor Atendeu"] || "").toString().toLowerCase();
      
      return client.includes(searchVal) || 
             clientCode.includes(searchVal) || 
             recipe.includes(searchVal) || 
             comments.includes(searchVal) ||
             combination.includes(searchVal) ||
             seller.includes(searchVal);
    });
  }
  
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
          Nenhum feedback encontrado.
        </td>
      </tr>
    `;
    return;
  }
  
  list.forEach(f => {
    const row = document.createElement("tr");
    
    let reactEmoji = "😐";
    if (f["Reação"] === "Amou") reactEmoji = "❤️";
    else if (f["Reação"] === "Gostou") reactEmoji = "👍";
    else if (f["Reação"] === "Odiei") reactEmoji = "👎";
    
    const clientCell = `<strong>${f["Razão Social"] || "Visitante"}</strong><br><span class="font-sm" style="color:var(--text-muted);">Cód: ${f["Código Cliente"] || "-"}</span>`;
    
    row.innerHTML = `
      <td>${clientCell}</td>
      <td><strong>${f["Nome Receita"] || "-"}</strong><br><span class="font-sm" style="color:var(--text-muted);">ID: ${f["ID FISPAL"] || "-"}</span></td>
      <td><span class="table-rating-badge">${f["Nota"] || "0"}/10</span></td>
      <td><span class="table-reaction" title="${f["Reação"] || "Neutro"}">${reactEmoji}</span></td>
      <td>${f["Combina Com"] || "-"}</td>
      <td style="max-width: 200px; overflow-wrap: break-word;">${f["Comentários"] || '<em style="color:var(--text-muted);">Sem comentários</em>'}</td>
      <td>${f["Vendedor Atendeu"] || "-"}</td>
      <td>${f["Timestamp"] ? f["Timestamp"].split(" ")[0] : "-"}</td>
    `;
    tbody.appendChild(row);
  });
}

function exportFeedbacksToCSV() {
  if (appState.feedbacksList.length === 0) {
    alert("Nenhum feedback para exportar.");
    return;
  }
  
  const filterDropdown = document.getElementById("dashboard-seller-filter");
  const filterType = filterDropdown ? filterDropdown.value : "MEUS";
  
  let list = appState.feedbacksList;
  if (filterType === "MEUS" && appState.selectedVendedor !== "EDIMAR PINHEIRO COSTA") {
    list = list.filter(f => f["Vendedor Atendeu"] === appState.selectedVendedor);
  }
  
  const headers = ["Timestamp", "Código Cliente", "Razão Social", "Vendedor Cliente", "Vendedor Atendeu", "ID FISPAL", "Nome Receita", "Nota", "Reação", "Combina Com", "Comentários"];
  
  let csvContent = "\ufeff"; 
  csvContent += headers.map(h => `"${h}"`).join(";") + "\n";
  
  list.forEach(f => {
    const row = headers.map(header => {
      let val = f[header] || "";
      val = val.toString().replace(/"/g, '""');
      return `"${val}"`;
    });
    csvContent += row.join(";") + "\n";
  });
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const vendedorNomeFormat = appState.selectedVendedor.replace(/\s+/g, "_").toLowerCase();
  link.setAttribute("href", url);
  link.setAttribute("download", `feedbacks_fispal_2026_${vendedorNomeFormat}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function switchTab(tabId, el) {
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.remove("active");
  });
  
  document.getElementById(tabId).classList.add("active");
  
  document.querySelectorAll(".bottom-nav .nav-item").forEach(item => {
    item.classList.remove("active");
  });
  el.classList.add("active");
  
  if (tabId === "tab-feedback") {
    renderFeedbackForm();
  } else if (tabId === "tab-relatorio") {
    updateDashboard();
  }
}