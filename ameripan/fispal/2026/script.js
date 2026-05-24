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
  cartItems: [], // Carrinho local ativo do cliente
  tastedSessionItems: [] // Sabores servidos nesta sessão aguardando feedback
};

// Banco de Dados IndexedDB para Persistência do Carrinho
let db = null;
const DB_NAME = "FispalCartDB";
const DB_VERSION = 2;
const STORE_NAME = "carts";
const CLIENT_STORE_NAME = "clients";

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
  };
}

// Salva carrinho no IndexedDB
function saveCartToDB(clientCode, items) {
  if (!db) return;
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.put({ clientCode: clientCode, items: items });
}

// Carrega carrinho do IndexedDB
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

// Limpa carrinho do IndexedDB
function deleteCartFromDB(clientCode) {
  if (!db) return;
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.delete(clientCode);
}

// Salva a lista de clientes no IndexedDB
function cacheClientsToDB(clients, callback) {
  if (!db) {
    if (callback) callback();
    return;
  }
  const transaction = db.transaction([CLIENT_STORE_NAME], "readwrite");
  const store = transaction.objectStore(CLIENT_STORE_NAME);
  
  // Limpa os clientes antigos primeiro
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

// Busca clientes no banco local
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

// Baixa os clientes do vendedor do Apps Script e atualiza o IndexedDB
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

// Funções auxiliares para persistência e mesclagem local
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
  
  // Ordena por data decrescente de timestamp
  merged.sort((a, b) => {
    try {
      const parseDate = (s) => {
        // Converte DD/MM/AAAA HH:MM:SS para formato interpretável
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
  
  // 1. Adiciona aos pendentes de feedback da sessão
  appState.tastedSessionItems = [...appState.tastedSessionItems, ...itemsServed];
  localStorage.setItem("pending_tastings_" + clientKey, JSON.stringify(appState.tastedSessionItems));
  
  // 2. Adiciona ao histórico de experimentados local imediatamente
  itemsServed.forEach(item => {
    const listCods = item.cods_lançamentos.toString().split(',').map(c => c.trim());
    saveLocalExperimentou(client.codigo, item.ID_FISPAL, listCods.join(", "));
  });
  
  // 3. Limpa o carrinho ativo na tela e no banco de dados local
  appState.cartItems = [];
  deleteCartFromDB(clientKey);
}

function clearTastedSession(client) {
  const clientKey = client.codigo || client.razao_social;
  appState.tastedSessionItems = [];
  localStorage.removeItem("pending_tastings_" + clientKey);
}


// ==========================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
  // Inicializa DB local
  initDB(() => {
    // Tenta carregar login do vendedor
    if (appState.selectedVendedor) {
      document.getElementById("vendedor-screen").classList.add("hidden");
    }
    updateUserBranding();
    
    // Configura URL no input do settings modal
    document.getElementById("gas-url-input").value = CONFIG.gasUrl;
    
    // Renderiza catálogo estático de lançamentos
    renderCatalog();
    
    // Busca dados do backend
    fetchInitialData();
  });
  
  // Event listener para fechar dropdown ao clicar fora
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-input-wrapper")) {
      document.getElementById("search-results-dropdown").classList.remove("active");
    }
  });
});

// ==========================================
// CONFIGURAÇÕES (API URL DO GAS)
// ==========================================
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
  
  // Recarrega todos os dados do sheets
  fetchInitialData();
  
  // Recarrega cache de clientes do vendedor ativo
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

// ==========================================
// LOGIN E VENDEDOR
// ==========================================
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
    
    // Gestor vê tudo por padrão e tem acesso ao seletor
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
    
    // Vendedor comum vê apenas seus atendimentos por padrão e não altera o filtro
    if (filterDropdown) {
      filterDropdown.value = "MEUS";
      filterDropdown.style.display = "none"; // Oculta o seletor para vendedores comuns
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

// ==========================================
// COMUNICAÇÃO COM O BACKEND (API CALLS)
// ==========================================
function fetchInitialData() {
  if (!CONFIG.gasUrl) {
    // Se não tiver URL configurada, abre modal de configuração e usa backup estático
    showLoading(false);
    openSettings();
    populateVendedorSelects([]); // carrega fallback
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
        
        // Em segundo plano, atualiza o cache dos clientes do vendedor ativo
        if (appState.selectedVendedor) {
          downloadAndCacheClients(appState.selectedVendedor);
        }
      } else {
        console.error("Erro no retorno do Apps Script:", data.error);
        alert("Erro no backend: " + data.error);
        populateVendedorSelects([]); // Fallback
        renderCardapio();
      }
    })
    .catch(error => {
      showLoading(false);
      console.error("Falha ao comunicar com o Google Apps Script:", error);
      // Fallback para lista padrão de vendedores
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
  // Lista padrão caso esteja sem rede ou planilha vazia
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
  
  // Preenche select do login
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
  
  // Preenche select do cadastro de novo cliente
  const selectNewCli = document.getElementById("new-cli-vendedor");
  selectNewCli.innerHTML = '<option value="" disabled selected>Selecione o vendedor...</option>';
  list.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectNewCli.appendChild(opt);
  });
}

// ==========================================
// RENDERIZAÇÃO DO CATÁLOGO DE LANÇAMENTOS
// ==========================================
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

// Filtro do catálogo
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

// Modal de detalhes
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
  
  // Harmonizações
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
  
  // Combinações Inovadoras
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

// ==========================================
// BUSCA E CADASTRO DE CLIENTES
// ==========================================
let searchTimeout = null;

function handleClientSearch(val) {
  clearTimeout(searchTimeout);
  const dropdown = document.getElementById("search-results-dropdown");
  
  if (val.length < 2) {
    dropdown.classList.remove("active");
    dropdown.innerHTML = "";
    return;
  }
  
  // Primeiro tenta buscar no banco local (IndexedDB)
  searchClientsInDB(val, (localResults) => {
    if (localResults.length > 0) {
      renderSearchDropdown(localResults);
    } else {
      // Se não encontrar nada localmente, busca via API (fallback) com delay
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
  appState.cartItems = []; // CLEAR active cart immediately to avoid showing previous client's selections
  renderCardapio();        // Update cardapio immediately to clear checkboxes
  updateCartUI();          // Hide/reset the cart bar immediately
  
  // Atualiza Cabeçalho
  document.getElementById("no-client-selected").classList.add("hidden");
  const display = document.getElementById("client-selected-display");
  display.classList.remove("hidden");
  
  document.getElementById("selected-client-name").textContent = client.razao_social;
  document.getElementById("selected-client-code").textContent = `Cód: ${client.codigo || 'Visitante'}`;
  document.getElementById("selected-client-city").textContent = `Cidade: ${client.cidade}`;
  document.getElementById("selected-client-vendedor").textContent = `Carteira: ${client.vendedor || 'Sem Vendedor'}`;
  
  // Remove alerta do cardápio
  document.getElementById("cardapio-alert-no-client").classList.add("hidden");
  document.getElementById("cardapio-container-wrapper").classList.remove("hidden");
  
  // Carrega carrinho do IndexedDB correspondente ao cliente
  const clientKey = client.codigo || client.razao_social;
  
  // Carrega degustações pendentes de feedback da sessão
  appState.tastedSessionItems = JSON.parse(localStorage.getItem("pending_tastings_" + clientKey) || "[]");
  
  loadCartFromDB(clientKey, (items) => {
    appState.cartItems = items;
    renderCardapio();
    updateCartUI();
  });
  
  // Registra o atendimento no banco de dados (Sheets) de forma assíncrona
  registrarAtendimentoNoGAS(client);
}

function registrarAtendimentoNoGAS(client) {
  if (!CONFIG.gasUrl) return;
  
  const payload = {
    action: "registrar_atendimento",
    codigo: client.codigo,
    cidade: client.cidade,
    razao_social: client.razao_social,
    fantasia: client.fantasia,
    vendedor: client.vendedor,
    vendedor_atendeu: appState.selectedVendedor
  };
  
  fetch(CONFIG.gasUrl, {
    method: "POST",
    mode: "no-cors", // Apps Script Web App exige POST via redirect/no-cors
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(err => console.error("Erro ao gravar registro de atendimento:", err));
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
  
  // Mostra alerta do cardápio
  document.getElementById("cardapio-alert-no-client").classList.remove("hidden");
  document.getElementById("cardapio-container-wrapper").classList.add("hidden");
  
  updateCartUI();
  renderCardapio();
}

// Modal Cadastro Novo
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
  
  // Se não informar código, gera um código temporário de feira
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

// ==========================================
// CARDÁPIO E CARRINHO
// ==========================================
function renderCardapio() {
  const container = document.getElementById("cardapio-grid");
  container.innerHTML = "";
  
  // Troca a classe do container para o estilo de lista de checkbox
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
    const cods = item.cods_lançamentos; // "3349, 1298"
    
    // Verifica histórico na planilha: se já experimentou no passado
    const jaTastouNoPassado = appState.experimentouList.some(exp => 
      exp.cod_cliente.toString() === clientCode.toString() && 
      exp.ID_FISPAL.toString() === id.toString()
    );
    
    // Verifica se já experimentou NESTA sessão (aguardando feedback)
    const degustouNestaSessao = appState.tastedSessionItems.some(t => t.ID_FISPAL.toString() === id.toString());
    
    // Verifica se já está no carrinho ativo
    const noCarrinho = appState.cartItems.some(cart => cart.ID_FISPAL.toString() === id.toString());
    
    // Pega o código da estrela do lançamento (primeiro código na lista de códigos do cardápio)
    const listCods = cods.toString().split(',').map(c => c.trim());
    const mainCod = listCods[0];
    const prodRef = PRODUCTS_DATA.find(p => p.cod === mainCod);
    
    // Nome do produto estrela associado
    const prodStarName = prodRef ? prodRef.nome : `Lançamento ${mainCod}`;
    
    // Cria o item da lista
    const row = document.createElement("div");
    
    // Define as classes conforme o estado
    let itemClasses = "cardapio-checkbox-item";
    if (jaTastouNoPassado) itemClasses += " ja-experimentou";
    else if (degustouNestaSessao) itemClasses += " feedback-pendente";
    else if (noCarrinho) itemClasses += " checked";
    
    row.className = itemClasses;
    
    // Configura o evento de clique
    if (jaTastouNoPassado) {
      row.onclick = null;
    } else if (degustouNestaSessao) {
      row.onclick = () => goToFeedbackTab();
    } else {
      row.onclick = () => {
        toggleCardapioItem(id, noCarrinho);
      };
    }
    
    // Selo de status
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
  
  // Evita duplicados
  if (appState.cartItems.some(item => item.ID_FISPAL.toString() === recipeId.toString())) return;
  
  appState.cartItems.push(recipe);
  
  // Persiste no IndexedDB
  const clientKey = appState.selectedClient.codigo || appState.selectedClient.razao_social;
  saveCartToDB(clientKey, appState.cartItems);
  
  renderCardapio();
  updateCartUI();
}

function removeFromCart(recipeId) {
  if (!appState.selectedClient) return;
  
  appState.cartItems = appState.cartItems.filter(item => item.ID_FISPAL.toString() !== recipeId.toString());
  
  // Atualiza no IndexedDB
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

// ==========================================
// TELA DO GARÇOM (MESA DE PREPARO / CHECKOUT)
// ==========================================
function openWaiterModal() {
  if (!appState.selectedClient) return;
  
  const clientName = appState.selectedClient.razao_social;
  document.getElementById("garcom-client-name").textContent = clientName;
  
  const container = document.getElementById("waiter-list-items");
  container.innerHTML = "";
  
  // 1. Exibe itens que já foram entregues nesta sessão (marcados de verde e travados)
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
  
  // 2. Exibe itens do carrinho ativo (pendentes, clicáveis)
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
    
    // Evento de clique para o garçom marcar que preparou
    card.addEventListener("click", () => {
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
  
  // Habilita o botão de finalizar se pelo menos um item novo foi marcado
  if (pendingCheckedCards.length > 0) {
    btn.removeAttribute("disabled");
  } else {
    btn.setAttribute("disabled", "true");
  }
}

function finalizarPedidoGarcom() {
  if (!appState.selectedClient) return;
  
  const clientKey = appState.selectedClient.codigo || appState.selectedClient.razao_social;
  
  // Pega apenas as receitas que foram marcadas de fato pelo garçom nesta ação
  const checkedCards = document.querySelectorAll(".waiter-item-card.pending-delivery.checked");
  if (checkedCards.length === 0) return;
  
  const idsServed = Array.from(checkedCards).map(card => card.getAttribute("data-id").toString());
  
  // Separa o que foi servido do que permaneceu pendente no carrinho
  const itemsServed = appState.cartItems.filter(item => idsServed.includes(item.ID_FISPAL.toString()));
  const itemsRemaining = appState.cartItems.filter(item => !idsServed.includes(item.ID_FISPAL.toString()));
  
  showLoading(true);
  
  // Constrói payload para o backend registrar no Sheets (aba experimentou)
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
  
  const handleSuccess = () => {
    showLoading(false);
    
    // Atualiza estado local de experimentados da sessão (tastedSessionItems)
    appState.tastedSessionItems = [...appState.tastedSessionItems, ...itemsServed];
    localStorage.setItem("pending_tastings_" + clientKey, JSON.stringify(appState.tastedSessionItems));
    
    // Insere no histórico de experimentados cacheado local
    itemsServed.forEach(item => {
      const listCods = item.cods_lançamentos.toString().split(',').map(c => c.trim());
      saveLocalExperimentou(appState.selectedClient.codigo, item.ID_FISPAL, listCods.join(", "));
    });
    
    // Atualiza o carrinho com o que sobrou
    appState.cartItems = itemsRemaining;
    if (itemsRemaining.length > 0) {
      saveCartToDB(clientKey, itemsRemaining);
    } else {
      deleteCartFromDB(clientKey);
    }
    
    updateCartUI();
    closeWaiterModal();
    renderCardapio();
    
    // Vai para a aba de feedbacks avaliar apenas o que foi servido
    goToFeedbackTab();
  };
  
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
    showLoading(false);
    console.error("Erro ao registrar degustação no Sheets:", err);
    alert("Erro de rede. A degustação foi salva no celular, mas pode não ter subido para a planilha.");
  });
}

function goToFeedbackTab() {
  const feedbackTabBtn = document.querySelectorAll(".bottom-nav .nav-item")[2];
  switchTab("tab-feedback", feedbackTabBtn);
}

// ==========================================
// TELA E FORMULÁRIO DE FEEDBACK (CLIENTE)
// ==========================================
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
  
  // Se não houver itens experimentados na sessão, avisa
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
    
    // Busca informações de harmonização do lançamento estrela para sugerir
    const prodRef = PRODUCTS_DATA.find(p => p.cod === mainCod);
    const sugeridos = prodRef ? [...prodRef.harmonizacoes, ...prodRef.combinacoes_inovadoras] : [];
    const chipsSugeridos = sugeridos.map(s => s.replace(';', '').trim()).filter((v, i, self) => self.indexOf(v) === i && v !== "");
    
    const imgUrl = prodRef ? prodRef.foto_url : "PICTURES/codigos.jpg";
    
    const formItem = document.createElement("div");
    formItem.className = "feedback-item-form";
    formItem.setAttribute("data-id", id);
    formItem.setAttribute("data-name", nome);
    
    // Monta HTML do formulário por item
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
      
      <!-- Escala de Nota de 1 a 10 Clicável -->
      <div class="rating-section">
        <h4>Nota de avaliação (1 a 10)</h4>
        <div class="rating-scale">
          ${Array.from({length: 10}, (_, i) => i + 1).map(num => `
            <button type="button" class="rating-btn" onclick="selectRating(this, ${num})">${num}</button>
          `).join("")}
        </div>
      </div>
      
      <!-- Reações Emojis (Odiei, Gostou, Amei) -->
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
      
      <!-- Combinações -->
      ${chipsHtml}
      
      <!-- Comentários Adicionais -->
      <div class="comments-section">
        <h4>Comentários adicionais</h4>
        <textarea placeholder="Opcional: Deixe aqui considerações, opiniões ou ideias sobre o produto..."></textarea>
      </div>
    `;
    
    container.appendChild(formItem);
  });
}

function selectRating(btn, rating) {
  const container = btn.closest(".rating-scale");
  container.querySelectorAll(".rating-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  container.setAttribute("data-selected-rating", rating);
}

function selectReaction(btn) {
  const container = btn.closest(".reaction-options");
  container.querySelectorAll(".reaction-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  container.setAttribute("data-selected-reaction", btn.getAttribute("data-reaction"));
}

function toggleCombinationChip(chip) {
  chip.classList.toggle("selected");
}

function submitFeedbacks() {
  if (!appState.selectedClient) return;
  
  const forms = document.querySelectorAll("#feedback-items-container .feedback-item-form");
  const feedbacksPayload = [];
  let valid = true;
  
  forms.forEach(form => {
    const id = form.getAttribute("data-id");
    const nome = form.getAttribute("data-name");
    
    // Obtém Nota
    const scale = form.querySelector(".rating-scale");
    const nota = scale.getAttribute("data-selected-rating");
    
    // Obtém Reação
    const reactOpt = form.querySelector(".reaction-options");
    const reacao = reactOpt.getAttribute("data-selected-reaction");
    
    if (!nota) {
      alert(`Por favor, selecione uma nota de 1 a 10 para o sabor: ${nome}`);
      valid = false;
      return;
    }
    
    if (!reacao) {
      alert(`Por favor, indique sua reação (Odiei, Gostou ou Amou) para o sabor: ${nome}`);
      valid = false;
      return;
    }
    
    // Obtém combinações selecionadas (chips + input customizado)
    const selectedChips = [];
    form.querySelectorAll(".combination-chip.selected").forEach(chip => {
      selectedChips.push(chip.textContent);
    });
    
    const customInput = form.querySelector(".custom-combination-input");
    if (customInput && customInput.value.trim() !== "") {
      selectedChips.push(customInput.value.trim());
    }
    
    const combinaCom = selectedChips.join(", ");
    
    // Comentário
    const comentarios = form.querySelector(".comments-section textarea").value.trim();
    
    feedbacksPayload.push({
      ID_FISPAL: id,
      nome_receita: nome,
      nota: parseInt(nota),
      reacao: reacao,
      combina_com: combinaCom,
      comentarios: comentarios
    });
  });
  
  if (!valid) return;
  
  showLoading(true);
  
  const payload = {
    action: "salvar_feedback",
    cod_cliente: appState.selectedClient.codigo,
    razao_social: appState.selectedClient.razao_social,
    vendedor_cliente: appState.selectedClient.vendedor,
    vendedor_atendeu: appState.selectedVendedor,
    feedbacks: feedbacksPayload
  };
  
  if (!CONFIG.gasUrl) {
    // Sincronização offline mock
    showLoading(false);
    alert("Feedback salvo com sucesso localmente!");
    
    // Insere no dashboard local mock
    const dateStr = new Date().toLocaleString('pt-BR');
    feedbacksPayload.forEach(fb => {
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
    });
    
    localStorage.setItem("local_feedbacks_list", JSON.stringify(appState.feedbacksList));
    clearTastedSession(appState.selectedClient);
    renderFeedbackForm();
    updateDashboard();
    
    // Vai para Dashboard tab
    const dashTabBtn = document.querySelectorAll(".bottom-nav .nav-item")[3];
    switchTab("tab-relatorio", dashTabBtn);
    return;
  }
  
  fetch(CONFIG.gasUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(() => {
    showLoading(false);
    alert("Feedbacks gravados com sucesso na planilha!");
    
    // Limpa estado local de experimentados na sessão
    clearTastedSession(appState.selectedClient);
    
    // Recarrega todos os dados para sincronizar os feedbacks gravados
    fetchInitialData();
    
    // Redireciona para aba do relatório
    const dashTabBtn = document.querySelectorAll(".bottom-nav .nav-item")[3];
    switchTab("tab-relatorio", dashTabBtn);
  })
  .catch(err => {
    showLoading(false);
    console.error("Erro ao salvar feedbacks:", err);
    alert("Erro de rede. Verifique sua conexão.");
  });
}

// ==========================================
// DASHBOARD / RELATÓRIOS DO VENDEDOR
// ==========================================
function updateDashboard() {
  const totalClientsEl = document.getElementById("stat-total-clients");
  const avgRatingEl = document.getElementById("stat-avg-rating");
  const totalFeedbacksEl = document.getElementById("stat-total-feedbacks");
  
  // Decide qual lista de feedbacks usar para os cards
  let feedbacksForStats = appState.feedbacksList;
  
  // Se for vendedor comum, calcula stats apenas dos seus atendimentos
  if (appState.selectedVendedor !== "EDIMAR PINHEIRO COSTA") {
    feedbacksForStats = appState.feedbacksList.filter(f => 
      f["Vendedor Atendeu"] === appState.selectedVendedor
    );
  } else {
    // Se for o Edimar (Gestor), as estatísticas são globais!
    feedbacksForStats = appState.feedbacksList;
  }
  
  // Clientes únicos atendidos
  const uniqueClients = [...new Set(feedbacksForStats.map(f => f["Código Cliente"]))];
  
  // Calcula média de notas
  let sum = 0;
  feedbacksForStats.forEach(f => {
    sum += parseFloat(f["Nota"] || 0);
  });
  const avg = feedbacksForStats.length > 0 ? (sum / feedbacksForStats.length).toFixed(1) : "0.0";
  
  // Atualiza cards de estatísticas
  totalClientsEl.textContent = uniqueClients.length;
  avgRatingEl.textContent = avg;
  totalFeedbacksEl.textContent = feedbacksForStats.length;
  
  // Se for o Edimar, renderiza o quadro de desempenho dos vendedores
  renderAdminPerformancePanel();
  
  // Renderiza tabela filtrada
  filterDashboard();
}

function renderAdminPerformancePanel() {
  if (appState.selectedVendedor !== "EDIMAR PINHEIRO COSTA") return;
  
  const container = document.getElementById("admin-performance-table");
  if (!container) return;
  container.innerHTML = "";
  
  // Agrupa dados por vendedor
  const performance = {};
  
  // Inicializa com a lista oficial de vendedores
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
  
  // Agrupa feedbacks
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
  
  // Renderiza cartões
  Object.keys(performance).forEach(v => {
    const stats = performance[v];
    const avg = stats.feedbacks > 0 ? (stats.sumNotes / stats.feedbacks).toFixed(1) : "0.0";
    
    // Pega primeiro nome para ficar mais curto no card
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
  
  // Filtra por vendedor ("MEUS" vs "TODOS")
  let list = appState.feedbacksList;
  if (filterType === "MEUS") {
    list = list.filter(f => f["Vendedor Atendeu"] === appState.selectedVendedor);
  }
  
  // Filtra por busca textual
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
    
    // formata reação em badge/emoji grande
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
  
  // Decide qual lista exportar
  const filterDropdown = document.getElementById("dashboard-seller-filter");
  const filterType = filterDropdown ? filterDropdown.value : "MEUS";
  
  let list = appState.feedbacksList;
  if (filterType === "MEUS" && appState.selectedVendedor !== "EDIMAR PINHEIRO COSTA") {
    list = list.filter(f => f["Vendedor Atendeu"] === appState.selectedVendedor);
  }
  
  // Cabeçalhos do CSV
  const headers = ["Timestamp", "Código Cliente", "Razão Social", "Vendedor Cliente", "Vendedor Atendeu", "ID FISPAL", "Nome Receita", "Nota", "Reação", "Combina Com", "Comentários"];
  
  // Cria linhas
  let csvContent = "\ufeff"; // BOM para abrir corretamente no Excel em português
  csvContent += headers.map(h => `"${h}"`).join(";") + "\n";
  
  list.forEach(f => {
    const row = headers.map(header => {
      let val = f[header] || "";
      // Escapa aspas duplas
      val = val.toString().replace(/"/g, '""');
      return `"${val}"`;
    });
    csvContent += row.join(";") + "\n";
  });
  
  // Força download do arquivo
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const vendedorNomeFormat = appState.selectedVendedor.replace(/\\s+/g, "_").toLowerCase();
  link.setAttribute("href", url);
  link.setAttribute("download", `feedbacks_fispal_2026_${vendedorNomeFormat}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// TABS E NAVEGAÇÃO
// ==========================================
function switchTab(tabId, el) {
  // Oculta todas as seções
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.remove("active");
  });
  
  // Mostra a seção ativa
  document.getElementById(tabId).classList.add("active");
  
  // Atualiza classe ativa no menu
  document.querySelectorAll(".bottom-nav .nav-item").forEach(item => {
    item.classList.remove("active");
  });
  el.classList.add("active");
  
  // Ações específicas ao abrir a aba
  if (tabId === "tab-feedback") {
    renderFeedbackForm();
  } else if (tabId === "tab-relatorio") {
    updateDashboard();
  }
}
