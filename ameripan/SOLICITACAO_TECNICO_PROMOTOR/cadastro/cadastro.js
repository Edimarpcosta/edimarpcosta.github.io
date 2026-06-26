/**
 * PORTAL DE SOLUÇÕES DE CAMPO - AMERIPAN
 * Arquivo: cadastro.js (Módulo de Cadastro e Consulta para Vendedores)
 * Versão: 2.0
 */

const API_URL = "https://script.google.com/macros/s/AKfycbyf3Sv32fARyRQpFfysNt47TIaxYGmWucZuA0nr1EHgKLbAKvEFztB-d4CEwx7vqqz63A/exec";

// Cache de clientes local (M19)
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
let ultimoCacheTimestamp = null;
let listaClientesGlobal = [];
let clienteSelecionado = null;

// Solicitação pesquisada ou cadastrada ativa para geração de PDF
let solicitacaoAtiva = null;

// Parâmetros de auto-crítica locais
let regrasComerciaisAtivas = {
  MIN_PEDIDO_PROMOTOR: 3000.00,
  MIN_PEDIDO_TECNICO: 5000.00,
  MIN_MARKUP: 6.0,
  CUSTO_FLEX_PADRAO_PROMOTOR: 100.00,
  CUSTO_FLEX_PADRAO_TECNICO: 150.00,
  CUSTO_FLEX_100_PROMOTOR: 300.00,
  CUSTO_FLEX_100_TECNICO: 450.00
};

// ==========================================
// REDE E COMUNICAÇÃO COM O BACKEND
// ==========================================

async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.append('action', action);
  
  const token = localStorage.getItem('portal_session_token');
  if (token) {
    url.searchParams.append('token', token);
  }
  
  for (const key in params) {
    url.searchParams.append(key, params[key]);
  }
  
  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) throw new Error("Erro na rede: " + res.statusText);
  const data = await res.json();
  if (data && data.sucesso === false && data.erro && (data.erro.includes("Acesso Negado") || data.erro.includes("Sessão inválida") || data.erro.includes("expirada"))) {
    realizarLogout();
    throw new Error(data.erro);
  }
  return data;
}

async function apiPost(action, payload = {}) {
  const token = localStorage.getItem('portal_session_token');
  const body = {
    action: action,
    payload: {
      token: token,
      ...payload
    }
  };
  
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Erro na rede: " + res.statusText);
  const data = await res.json();
  if (data && data.sucesso === false && data.erro && (data.erro.includes("Acesso Negado") || data.erro.includes("Sessão inválida") || data.erro.includes("expirada"))) {
    realizarLogout();
    throw new Error(data.erro);
  }
  return data;
}

function realizarLogout() {
  localStorage.removeItem('portal_session_token');
  location.reload();
}

// ==========================================
// AUTENTICAÇÃO DO PORTAL (M04 / M20)
// ==========================================

async function realizarLoginPortal(e) {
  e.preventDefault();
  const input = document.getElementById('portal-senha-input');
  const btn = document.getElementById('portal-login-btn');
  const erro = document.getElementById('portal-login-erro');
  const senha = input.value.trim();
  
  if (!senha) return;
  
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-1"></i> Verificando...`;
  erro.classList.add('hidden');
  
  try {
    const res = await apiPost('verificarSenhaPortal', { senha: senha });
    if (res.sucesso) {
      localStorage.setItem('portal_session_token', res.token); // Salva token UUID temporário (M20)
      document.getElementById('portal-lock-overlay').classList.add('hidden');
      inicializarModuloCadastro();
    } else {
      erro.innerText = "Senha incorreta! Tente novamente.";
      erro.classList.remove('hidden');
      input.value = "";
      input.focus();
    }
  } catch (err) {
    erro.innerText = "Erro na rede ao tentar logar: " + err.message;
    erro.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-lock-open"></i> Acessar Portal`;
  }
}

async function validarAcessoInicial() {
  const token = localStorage.getItem('portal_session_token');
  const overlay = document.getElementById('portal-lock-overlay');
  
  if (!token) {
    overlay.classList.remove('hidden');
    return;
  }
  
  try {
    const res = await apiGet('verificarSenhaPortal', { token: token });
    if (res.sucesso) {
      overlay.classList.add('hidden');
      inicializarModuloCadastro();
    } else {
      localStorage.removeItem('portal_session_token');
      overlay.classList.remove('hidden');
    }
  } catch (err) {
    console.error("Falha ao validar credenciais do cache:", err);
  }
}

// ==========================================
// INICIALIZAÇÃO E ABAS
// ==========================================

function switchAba(tab) {
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('translate-y-0', 'opacity-100');
    el.classList.add('translate-y-4', 'opacity-0');
  });
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-gradient-to-r', 'from-brand-500', 'to-brand-gold', 'text-white', 'shadow-md');
    btn.classList.add('text-slate-400', 'hover:text-white');
  });
  
  const activeSec = document.getElementById('section-' + tab);
  activeSec.classList.remove('hidden');
  setTimeout(() => {
    activeSec.classList.remove('translate-y-4', 'opacity-0');
    activeSec.classList.add('translate-y-0', 'opacity-100');
  }, 50);
  
  const activeBtn = document.getElementById('tab-' + tab);
  activeBtn.classList.remove('text-slate-400', 'hover:text-white');
  activeBtn.classList.add('bg-gradient-to-r', 'from-brand-500', 'to-brand-gold', 'text-white', 'shadow-md');
}

async function inicializarModuloCadastro() {
  await carregarRegrasCONFIG();
  await carregarListaClientesComCache();
  await carregarMiniCalendario();
  
  // Detecta navigator.share e exibe botões correspondentes
  const btnShareCad = document.getElementById('btn-share-cadastro');
  const btnShareCon = document.getElementById('btn-share-consulta');
  if (navigator.share && navigator.canShare) {
    if (btnShareCad) btnShareCad.classList.remove('hidden');
    if (btnShareCon) btnShareCon.classList.remove('hidden');
  }
  
  // Configura Enter no código de busca ERP
  const codSearchInput = document.getElementById('cliente-search-cod');
  if (codSearchInput) {
    codSearchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        buscarCodigoERPManual();
      }
    });
  }
}

async function carregarRegrasCONFIG() {
  try {
    const res = await apiGet('obterParametrosPublicos');
    if (res && res.sucesso && res.parametros) {
      regrasComerciaisAtivas = {
        MIN_PEDIDO_PROMOTOR: parseFloat(res.parametros.MIN_PEDIDO_PROMOTOR) || 3000.00,
        MIN_PEDIDO_TECNICO: parseFloat(res.parametros.MIN_PEDIDO_TECNICO) || 5000.00,
        MIN_MARKUP: parseFloat(res.parametros.MIN_MARKUP) || 6.0,
        CUSTO_FLEX_PADRAO_PROMOTOR: parseFloat(res.parametros.CUSTO_FLEX_PADRAO_PROMOTOR) || 100.00,
        CUSTO_FLEX_PADRAO_TECNICO: parseFloat(res.parametros.CUSTO_FLEX_PADRAO_TECNICO) || 150.00,
        CUSTO_FLEX_100_PROMOTOR: parseFloat(res.parametros.CUSTO_FLEX_100_PROMOTOR) || 300.00,
        CUSTO_FLEX_100_TECNICO: parseFloat(res.parametros.CUSTO_FLEX_100_TECNICO) || 450.00
      };
      calcularRegraAutoCritica();
    }
  } catch (err) {
    console.error("Falha ao carregar CONFIG:", err);
  }
}

// ==========================================
// CLIENTES AUTOCOMPLETE & CACHE (M19 / M01)
// ==========================================

async function carregarListaClientesComCache() {
  const agora = Date.now();
  const status = document.getElementById('clientes-status');
  
  if (listaClientesGlobal.length > 0 && ultimoCacheTimestamp && (agora - ultimoCacheTimestamp) < CACHE_TTL_MS) {
    if (status) {
      status.innerText = "(Clientes em Cache)";
      status.className = "text-[9px] font-normal normal-case text-emerald-400 ml-2";
    }
    return;
  }
  
  try {
    const res = await apiGet('buscarClientes', { q: "" });
    listaClientesGlobal = res;
    ultimoCacheTimestamp = agora;
    if (status) {
      status.innerText = "(Base conectada)";
      status.className = "text-[9px] font-normal normal-case text-emerald-400 ml-2";
    }
  } catch (err) {
    console.error("Erro ao sincronizar clientes:", err);
    if (status) {
      status.innerText = "(Erro de conexão)";
      status.className = "text-[9px] font-normal normal-case text-rose-500 ml-2";
    }
  }
}

let debounceTimer = null;
function filtrarAutocompleteDebounce() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    processarFiltroAutocomplete();
  }, 300);
}

async function processarFiltroAutocomplete() {
  const input = document.getElementById('cliente-search-nome');
  const termo = input.value.trim();
  const dropdown = document.getElementById('autocomplete-lista');
  const status = document.getElementById('clientes-status');
  
  if (termo.length < 2) {
    dropdown.classList.add('hidden');
    return;
  }
  
  if (status) {
    status.innerText = "(Pesquisando...)";
    status.className = "text-[9px] font-normal normal-case text-amber-500 ml-2 animate-pulse";
  }
  
  try {
    const filtrados = await apiGet('buscarClientes', { q: termo });
    renderizarDropdownAutocomplete(filtrados);
    if (status) {
      status.innerText = filtrados.length === 0 ? "(Nenhum localizado)" : "(Filtrado)";
      status.className = filtrados.length === 0 ? "text-[9px] font-normal normal-case text-rose-400 ml-2" : "text-[9px] font-normal normal-case text-emerald-400 ml-2";
    }
  } catch (err) {
    console.error(err);
  }
}

function renderizarDropdownAutocomplete(clientes) {
  const dropdown = document.getElementById('autocomplete-lista');
  dropdown.innerHTML = "";
  
  if (clientes.length === 0) {
    dropdown.innerHTML = `<li class="px-4 py-3 text-slate-500 text-center">Nenhum cliente localizado</li>`;
    dropdown.classList.remove('hidden');
    return;
  }
  
  clientes.forEach(c => {
    const li = document.createElement('li');
    li.className = "px-4 py-2.5 hover:bg-slate-900 cursor-pointer transition-colors flex flex-col gap-0.5";
    li.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-bold text-white">${c.codigo}</span>
        <span class="text-[10px] text-slate-500 uppercase">${c.cidade}</span>
      </div>
      <span class="text-slate-300 font-medium truncate">${c.razaoSocial}</span>
    `;
    li.onclick = () => {
      selecionarClienteForm(c);
    };
    dropdown.appendChild(li);
  });
  
  dropdown.classList.remove('hidden');
}

function selecionarClienteForm(c) {
  clienteSelecionado = c;
  const searchCod = document.getElementById('cliente-search-cod');
  const searchNome = document.getElementById('cliente-search-nome');
  if (searchCod) searchCod.value = c.codigo;
  if (searchNome) searchNome.value = c.razaoSocial;
  document.getElementById('codCliente').value = c.codigo;
  document.getElementById('razaoSocial').value = c.razaoSocial;
  document.getElementById('nomeFantasia').value = c.nomeFantasia;
  document.getElementById('cidade').value = c.cidade;
  document.getElementById('cep').value = c.cep || '';
  document.getElementById('numero').value = c.numero || '';
  if (c.vendedor) {
    document.getElementById('vendedor').value = c.vendedor;
  }
  
  document.getElementById('autocomplete-lista').classList.add('hidden');
  zerarDistanciaCalculada();
  
  const cepInfo = document.getElementById('cep-info');
  if (c.endereco && cepInfo) {
    let adr = c.endereco + (c.bairro ? `, ${c.bairro}` : "");
    cepInfo.innerText = adr + ` — ${c.cidade}`;
    cepInfo.className = "text-[10px] text-emerald-400 mt-1 font-medium block";
    cepInfo.classList.remove('hidden');
  }
  buscarCepViaCep();
}

async function buscarCodigoERPManual() {
  const codField = document.getElementById('cliente-search-cod') || document.getElementById('codCliente');
  const codigo = codField.value.trim();
  if (!codigo) return;
  
  codField.classList.add('animate-pulse');
  
  try {
    const cleanQ = codigo.replace(/[\s.-]/g, "").toUpperCase();
    
    // Procura localmente
    if (listaClientesGlobal.length > 0) {
      const cacheFound = listaClientesGlobal.find(c => c.codigo.toString().replace(/[\s.-]/g, "").toUpperCase() === cleanQ);
      if (cacheFound) {
        selecionarClienteForm(cacheFound);
        codField.classList.remove('animate-pulse');
        return;
      }
    }
    
    // Procura via API
    const res = await apiGet('buscarClientes', { q: codigo });
    const exact = res.find(c => c.codigo.toString().replace(/[\s.-]/g, "").toUpperCase() === cleanQ);
    if (exact) {
      selecionarClienteForm(exact);
    } else {
      alert(`O código ERP "${codigo}" não consta na base de clientes cadastrados. Por favor, certifique-se do número ou insira os dados cadastrais manualmente.`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    codField.classList.remove('animate-pulse');
  }
}

// ==========================================
// VIACEP E MAPS (M02)
// ==========================================

async function buscarCepViaCep() {
  const cepField = document.getElementById('cep');
  const cep = cepField.value.replace(/\D/g, "");
  const info = document.getElementById('cep-info');
  const cidadeField = document.getElementById('cidade');
  
  if (cep.length === 8) {
    if (info) {
      info.innerText = "Buscando ViaCEP...";
      info.className = "text-[10px] text-slate-400 mt-1 font-medium block animate-pulse";
      info.classList.remove('hidden');
    }
    
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      
      if (data.erro) {
        if (info) {
          info.innerText = "CEP inválido ou não localizado.";
          info.className = "text-[10px] text-rose-500 mt-1 font-medium block";
        }
        return;
      }
      
      cidadeField.value = data.localidade.toUpperCase();
      
      if (info) {
        let adr = data.logradouro + (data.bairro ? `, ${data.bairro}` : "");
        info.innerText = adr + ` — ${data.localidade}/${data.uf}`;
        info.className = "text-[10px] text-emerald-400 mt-1 font-medium block";
      }
      zerarDistanciaCalculada();
    } catch (err) {
      if (info) {
        info.innerText = "Serviço ViaCEP indisponível.";
        info.className = "text-[10px] text-rose-500 mt-1 font-medium block";
      }
    }
  }
}

function visualizarMaps() {
  const cep = document.getElementById('cep').value.replace(/\D/g, '');
  const numero = document.getElementById('numero').value.trim();
  const cidade = document.getElementById('cidade').value.trim();
  const endereco = clienteSelecionado?.endereco || '';
  
  if (!cep && !cidade) {
    alert("Informe ao menos o CEP ou Cidade para abrir no mapa.");
    return;
  }
  
  let q = endereco
    ? `${endereco}, ${numero}, ${cidade}, SP, Brasil`
    : `CEP ${cep}, ${numero}, ${cidade}, SP, Brasil`;
    
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  window.open(url, '_blank');
}

// ==========================================
// MINI-CALENDÁRIO DE DISPONIBILIDADE (M07)
// ==========================================

async function carregarMiniCalendario() {
  const tecnico = document.getElementById('tecnico').value;
  const calContainer = document.getElementById('calendarios-container');
  calContainer.innerHTML = `<div class="text-center text-slate-500 text-xs py-4 col-span-2"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Sincronizando agenda do profissional...</div>`;
  
  try {
    const res = await apiGet('getDatasIndisponiveis', { tecnico: tecnico });
    // res = { ocupadas: [...], bloqueadas: [{data, comentario}] }
    renderizarCalendarios(res.ocupadas || [], res.bloqueadas || []);
  } catch (err) {
    calContainer.innerHTML = `<div class="text-center text-rose-500 text-xs py-4 col-span-2">Falha ao obter agenda: ${err.message}</div>`;
  }
}

function selecionarTecnico() {
  zerarDistanciaCalculada();
  carregarMiniCalendario();
  verificarAgendaLocal();
}

function renderizarCalendarios(ocupadas, bloqueadas) {
  const calContainer = document.getElementById('calendarios-container');
  calContainer.innerHTML = "";
  
  const hoje = new Date();
  const meses = [
    { ano: hoje.getFullYear(), mes: hoje.getMonth() },
    { ano: hoje.getMonth() === 11 ? hoje.getFullYear() + 1 : hoje.getFullYear(), mes: (hoje.getMonth() + 1) % 12 }
  ];
  
  meses.forEach(m => {
    calContainer.appendChild(gerarTabelaMes(m.ano, m.mes, ocupadas, bloqueadas));
  });
}

function gerarTabelaMes(ano, mes, ocupadas, bloqueadas) {
  const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];
  
  const box = document.createElement('div');
  box.className = "bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-xs";
  
  const titulo = document.createElement('h4');
  titulo.className = "font-bold text-slate-400 mb-2 font-outfit text-center border-b border-slate-800/80 pb-1";
  titulo.innerText = `${nomesMeses[mes]} / ${ano}`;
  box.appendChild(titulo);
  
  const grid = document.createElement('div');
  grid.className = "grid grid-cols-7 gap-1 text-center font-medium";
  
  diasSemana.forEach(d => {
    const headerCell = document.createElement('div');
    headerCell.className = "text-slate-600 font-bold text-[9px] py-1";
    headerCell.innerText = d;
    grid.appendChild(headerCell);
  });
  
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
  
  // Preenche vazios
  for (let i = 0; i < primeiroDiaSemana; i++) {
    grid.appendChild(document.createElement('div'));
  }
  
  const hojeComparar = new Date();
  hojeComparar.setHours(0, 0, 0, 0);
  
  for (let dia = 1; dia <= totalDiasNoMes; dia++) {
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const diaDate = new Date(ano, mes, dia);
    const isPassado = diaDate < hojeComparar;
    
    const cellBtn = document.createElement('button');
    cellBtn.type = "button";
    cellBtn.innerText = dia;
    cellBtn.className = "py-1.5 rounded-lg text-[10px] transition-all font-semibold ";
    
    const isOcupado = ocupadas.includes(dataStr);
    const bloqueio = bloqueadas.find(b => b.data === dataStr);
    
    if (isPassado) {
      cellBtn.className += "text-slate-800 cursor-not-allowed";
      cellBtn.disabled = true;
    } else if (isOcupado) {
      cellBtn.className += "bg-rose-950/40 text-rose-500 border border-rose-900/20 cursor-not-allowed";
      cellBtn.disabled = true;
      cellBtn.title = "Ocupado: Trabalho Agendado";
    } else if (bloqueio) {
      cellBtn.className += "bg-slate-850 text-slate-500 border border-slate-800 tooltip cursor-not-allowed";
      cellBtn.disabled = true;
      
      const tooltip = document.createElement('span');
      tooltip.className = "tooltiptext";
      tooltip.innerText = bloqueio.comentario || "Indisponível";
      cellBtn.appendChild(tooltip);
    } else {
      cellBtn.className += "bg-emerald-950/40 text-emerald-400 border border-emerald-900/20 hover:bg-emerald-600 hover:text-white";
      cellBtn.onclick = () => {
        document.getElementById('dataTrabalho').value = dataStr;
        verificarAgendaLocal();
      };
    }
    
    grid.appendChild(cellBtn);
  }
  
  box.appendChild(grid);
  return box;
}

// ==========================================
// MOTOR COMERCIAL E ROTEAMENTO
// ==========================================

function alternarCamposDetalhamento(opcao) {
  const pBox = document.getElementById('detalhes-producao-box');
  const aBox = document.getElementById('detalhes-apresentacao-box');
  if (opcao === 'Produção') {
    pBox.classList.remove('hidden');
    aBox.classList.add('hidden');
    document.getElementById('detalhes-apresentacao').value = "";
  } else {
    aBox.classList.remove('hidden');
    pBox.classList.add('hidden');
    document.getElementById('detalhes-producao').value = "";
  }
}

function calcularRegraAutoCritica() {
  const prof = document.getElementById('profissional').value;
  const exec = document.getElementById('formaExecucao').value;
  const valor = parseFloat(document.getElementById('valorPedido').value) || 0;
  const markup = parseFloat(document.getElementById('indicePedido').value) || 0;
  const badge = document.getElementById('custo-flex-badge');
  const alerta = document.getElementById('autocritica-alerta');
  
  let custoFlex = 0;
  let violou = false;
  
  if (prof === "PROMOTOR") {
    if (exec === "FLEX") {
      custoFlex = regrasComerciaisAtivas.CUSTO_FLEX_100_PROMOTOR;
    } else {
      custoFlex = regrasComerciaisAtivas.CUSTO_FLEX_PADRAO_PROMOTOR;
      if (valor < regrasComerciaisAtivas.MIN_PEDIDO_PROMOTOR || markup < regrasComerciaisAtivas.MIN_MARKUP) {
        violou = true;
      }
    }
  } else if (prof === "TECNICO") {
    if (exec === "FLEX") {
      custoFlex = regrasComerciaisAtivas.CUSTO_FLEX_100_TECNICO;
    } else {
      custoFlex = regrasComerciaisAtivas.CUSTO_FLEX_PADRAO_TECNICO;
      if (valor < regrasComerciaisAtivas.MIN_PEDIDO_TECNICO || markup < regrasComerciaisAtivas.MIN_MARKUP) {
        violou = true;
      }
    }
  }
  
  badge.innerText = "R$ " + custoFlex.toFixed(2);
  
  if (violou) {
    alerta.classList.remove('hidden');
  } else {
    alerta.classList.add('hidden');
  }
  
  // Requisitos de faturamento condicional
  const valorInput = document.getElementById('valorPedido');
  const markupInput = document.getElementById('indicePedido');
  if (exec === "FLEX") {
    valorInput.required = false;
    markupInput.required = false;
  } else {
    valorInput.required = true;
    markupInput.required = true;
  }
}

function zerarDistanciaCalculada() {
  kmLogisticoCalculado = null;
  document.getElementById('km-resultado-box').classList.add('hidden');
  document.getElementById('km-distancia-val').innerText = "0.0";
}

async function calcularDistanciaRoteamento() {
  const tecnico = document.getElementById('tecnico').value;
  const cep = document.getElementById('cep').value;
  const numero = document.getElementById('numero').value.trim();
  const cidade = document.getElementById('cidade').value;
  
  if (!numero) {
    alert("Informe o número do estabelecimento para obter o trajeto logístico.");
    return;
  }
  
  const resBox = document.getElementById('km-resultado-box');
  const valSpan = document.getElementById('km-distancia-val');
  
  valSpan.innerText = "Calculando rota...";
  resBox.classList.remove('hidden');
  
  try {
    const km = await apiPost('calcularDistancia', {
      tecnico: tecnico,
      cep: cep,
      numero: numero,
      cidade: cidade,
      endereco: clienteSelecionado ? (clienteSelecionado.endereco || "") : "",
      bairro: clienteSelecionado ? (clienteSelecionado.bairro || "") : ""
    });
    kmLogisticoCalculado = km;
    valSpan.innerText = parseFloat(km).toFixed(1);
  } catch (err) {
    alert("Erro na roteirização: " + err.message);
    resBox.classList.add('hidden');
  }
}

async function verificarAgendaLocal() {
  const tecnico = document.getElementById('tecnico').value;
  const data = document.getElementById('dataTrabalho').value;
  const aviso = document.getElementById('agenda-aviso');
  const submit = document.getElementById('submit-btn');
  
  if (!data) return;
  
  try {
    const ocupado = await apiGet('verificarAgenda', { tecnico, data });
    if (ocupado) {
      aviso.innerText = `O técnico ${tecnico} já está alocado para outra rota no dia selecionado.`;
      aviso.classList.remove('hidden');
      submit.disabled = true;
      submit.classList.add('cursor-not-allowed', 'opacity-50');
    } else {
      aviso.classList.add('hidden');
      submit.disabled = false;
      submit.classList.remove('cursor-not-allowed', 'opacity-50');
    }
  } catch (err) {
    console.error("Erro na verificação de data:", err);
  }
}

// ==========================================
// SALVAMENTO E PDF (M21)
// ==========================================

async function enviarFormularioCadastro(e) {
  e.preventDefault();
  
  const vendedor = document.getElementById('vendedor').value.trim();
  const tecnico = document.getElementById('tecnico').value;
  const dataTrabalho = document.getElementById('dataTrabalho').value;
  const profissional = document.getElementById('profissional').value;
  const tipoServico = document.getElementById('tipoServico').value;
  const formaExecucao = document.getElementById('formaExecucao').value;
  const numero = document.getElementById('numero').value.trim();
  
  const linhaAtuacao = document.querySelector('input[name="linhaAtuacao"]:checked').value;
  let detalhes = "";
  if (linhaAtuacao === 'Produção') {
    detalhes = document.getElementById('detalhes-producao').value.trim();
    if (!detalhes) {
      alert("Descreva os detalhes da produção (formulações e matérias-primas).");
      return;
    }
  } else {
    detalhes = document.getElementById('detalhes-apresentacao').value.trim();
    if (!detalhes) {
      alert("Descreva os argumentos e produtos a serem apresentados.");
      return;
    }
  }
  
  const valorPedido = document.getElementById('valorPedido').value;
  const indicePedido = document.getElementById('indicePedido').value;
  const numeroPedido = document.getElementById('numeroPedido').value.trim();
  
  if (!clienteSelecionado) {
    clienteSelecionado = {
      codigo: document.getElementById('codCliente').value.trim() || 'MANUAL',
      razaoSocial: document.getElementById('razaoSocial').value.trim() || 'MANUAL',
      nomeFantasia: document.getElementById('nomeFantasia').value.trim() || 'MANUAL',
      cidade: document.getElementById('cidade').value.trim() || '',
      cep: document.getElementById('cep').value.trim() || '',
      numero: numero,
      vendedor: vendedor,
      endereco: '',
      bairro: ''
    };
  }
  
  const payload = {
    vendedor,
    tecnico,
    dataTrabalho,
    codCliente: clienteSelecionado.codigo,
    razaoSocial: clienteSelecionado.razaoSocial,
    nomeFantasia: clienteSelecionado.nomeFantasia,
    cidade: clienteSelecionado.cidade,
    cep: clienteSelecionado.cep,
    numero: numero,
    profissional,
    tipoServico,
    formaExecucao,
    detalhes,
    valorPedido,
    indicePedido,
    numeroPedido,
    linhaAtuacao
  };
  
  document.getElementById('form-solicitacao').classList.add('hidden');
  document.getElementById('form-loader').classList.remove('hidden');
  
  try {
    const res = await apiPost('salvarSolicitacao', payload);
    document.getElementById('form-loader').classList.add('hidden');
    
    if (res.sucesso) {
      document.getElementById('sucesso-id-solicitacao').innerText = res.id;
      document.getElementById('sucesso-status').innerText = res.status;
      
      const badge = document.getElementById('sucesso-status');
      if (res.status.indexOf("Pendente") !== -1) {
        badge.className = "text-base font-bold text-amber-500 font-outfit";
      } else {
        badge.className = "text-base font-bold text-emerald-400 font-outfit";
      }
      
      solicitacaoAtiva = {
        id: res.id,
        vendedor: payload.vendedor,
        tecnico: payload.tecnico,
        dataTrabalho: payload.dataTrabalho,
        codCliente: payload.codCliente,
        razaoSocial: payload.razaoSocial,
        nomeFantasia: payload.nomeFantasia,
        cidade: payload.cidade,
        cep: payload.cep,
        numero: payload.numero,
        profissional: payload.profissional,
        tipoServico: payload.tipoServico,
        formaExecucao: payload.formaExecucao,
        detalhes: payload.detalhes,
        valorPedido: payload.valorPedido || 0,
        indicePedido: payload.indicePedido || 0,
        numeroPedido: payload.numeroPedido || "",
        custoFlex: res.custoFlex,
        kmDistancia: res.kmDistancia,
        status: res.status,
        linhaAtuacao: payload.linhaAtuacao,
        dataCriacao: new Date()
      };
      
      document.getElementById('form-resultado-sucesso').classList.remove('hidden');
    } else {
      alert("Falha ao agendar: " + res.erro);
      document.getElementById('form-solicitacao').classList.remove('hidden');
    }
  } catch (err) {
    document.getElementById('form-loader').classList.add('hidden');
    alert("Falha crítica ao gravar: " + err.message);
    document.getElementById('form-solicitacao').classList.remove('hidden');
  }
}

function copiarIdCriado() {
  const text = document.getElementById('sucesso-id-solicitacao').innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert("ID " + text + " copiado para transferência.");
  });
}

// Lógica de Geração do PDF Nativo via jsPDF + AutoTable (M21)
function criarDocumentoPdf(sol) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  
  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138); // Azul profundo
  doc.text('AMERIPAN ALIMENTOS', pageWidth / 2, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Ficha de Controle de Atendimento Técnico e Promotoria', pageWidth / 2, y, { align: 'center' });
  
  y += 8;
  doc.setDrawColor(200);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('AGENDAMENTO: ' + sol.id, margin, y);
  doc.text('STATUS: ' + sol.status.toUpperCase(), pageWidth / 2, y);
  
  y += 6;
  
  // Formata data do trabalho
  let dtVal = sol.dataTrabalho;
  const pts = dtVal.split('-');
  if (pts.length === 3) dtVal = `${pts[2]}/${pts[1]}/${pts[0]}`;
  
  // Tabela de Informações Gerais
  doc.autoTable({
    startY: y,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [210, 210, 210], lineWidth: 0.15 },
    headStyles: { fillColor: [194, 120, 60], textColor: 255, fontStyle: 'bold' }, // Cobre Ameripan
    head: [['Informação', 'Valor']],
    body: [
      ['Vendedor Requisitante', sol.vendedor || '-'],
      ['Profissional Alocado', sol.tecnico || '-'],
      ['Data Programada', dtVal || '-'],
      ['Cidade de Destino', sol.cidade || '-'],
      ['Cliente ERP', `[${sol.codCliente}] ${sol.razaoSocial} (${sol.nomeFantasia})`],
      ['CEP / Número', `CEP ${sol.cep || '-'}, Nº ${sol.numero || '-'}`],
      ['Tipo de Execução', `${sol.profissional} — ${sol.tipoServico}`],
      ['Forma de Cobrança', sol.formaExecucao === 'FLEX' ? '100% Flex (Isento de Faturamento)' : 'Regra Padrão (Pedido ERP)'],
      ['Valor do Pedido / Markup', `R$ ${parseFloat(sol.valorPedido || 0).toFixed(2)} / Markup ${parseFloat(sol.indicePedido || 0).toFixed(1)}`],
      ['Número do Pedido ERP', sol.numeroPedido || 'Aguardando vínculo'],
      ['Distância Logística', `${sol.kmDistancia || 0} km (ida terrestre)`],
      ['Custo Flex Estimado', `R$ ${parseFloat(sol.custoFlex || 0).toFixed(2)}`],
    ],
    margin: { left: margin, right: margin }
  });
  
  y = doc.lastAutoTable.finalY + 8;
  
  // Detalhes da Execução
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('Descrição / Detalhamento da Execução:', margin, y);
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50);
  
  const desc = sol.detalhes || "Nenhum detalhe informado.";
  const splitText = doc.splitTextToSize(desc, contentWidth);
  doc.text(splitText, margin, y);
  
  y += splitText.length * 4.5 + 15;
  
  // Linhas de Assinatura
  const lWidth = 65;
  const posX1 = margin + (contentWidth / 4) - (lWidth / 2);
  const posX2 = margin + (contentWidth * 3 / 4) - (lWidth / 2);
  
  doc.setDrawColor(100);
  doc.setLineWidth(0.3);
  doc.line(posX1, y, posX1 + lWidth, y);
  doc.line(posX2, y, posX2 + lWidth, y);
  
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(50);
  doc.text(sol.vendedor || 'Vendedor', posX1 + lWidth/2, y, { align: 'center' });
  doc.text('Supervisão / Gerência de Campo', posX2 + lWidth/2, y, { align: 'center' });
  
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120);
  doc.text('Assinatura do Requisitante', posX1 + lWidth/2, y, { align: 'center' });
  doc.text('Assinatura do Aprovador', posX2 + lWidth/2, y, { align: 'center' });
  
  // Rodapé
  doc.setTextColor(150);
  doc.setFontSize(6.5);
  doc.text(`Portal Ameripan — Emitido em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  
  const nomeArq = `AMERIPAN_ATENDIMENTO_${sol.id}_${(sol.razaoSocial || "Cliente").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 15)}.pdf`;
  
  return { doc, nomeArq };
}

function gerarPdfFichaCadastro() {
  if (!solicitacaoAtiva) return;
  const { doc, nomeArq } = criarDocumentoPdf(solicitacaoAtiva);
  doc.save(nomeArq);
}

async function compartilharPdfFichaCadastro() {
  if (!solicitacaoAtiva) return;
  const { doc, nomeArq } = criarDocumentoPdf(solicitacaoAtiva);
  const blob = doc.output('blob');
  const file = new File([blob], nomeArq, { type: 'application/pdf' });
  
  try {
    await navigator.share({
      title: `Ficha Técnica ${solicitacaoAtiva.id}`,
      text: `Segue a ficha do atendimento Ameripan de ${solicitacaoAtiva.tecnico} no cliente ${solicitacaoAtiva.razaoSocial}.`,
      files: [file]
    });
  } catch (err) {
    if (err.name !== "AbortError") {
      doc.save(nomeArq); // Fallback
    }
  }
}

function resetarFormularioCadastro() {
  document.getElementById('form-solicitacao').reset();
  clienteSelecionado = null;
  solicitacaoAtiva = null;
  zerarDistanciaCalculada();
  
  const info = document.getElementById('cep-info');
  if (info) {
    info.classList.add('hidden');
    info.innerText = "";
  }
  
  document.getElementById('form-resultado-sucesso').classList.add('hidden');
  document.getElementById('form-solicitacao').classList.remove('hidden');
  
  alternarCamposDetalhamento('Produção');
  calcularRegraAutoCritica();
  carregarMiniCalendario();
}

// ==========================================
// SISTEMA DE CONSULTA POR ID (Rastreio)
// ==========================================

async function buscarSolicitacaoPorId() {
  const idInput = document.getElementById('search-id-input').value.trim();
  const card = document.getElementById('search-result-card');
  const loader = document.getElementById('search-loader');
  const msgFeedback = document.getElementById('feedback-mensagem-consulta');
  
  if (!idInput) {
    alert("Digite o código do agendamento.");
    return;
  }
  
  card.classList.add('hidden');
  loader.classList.remove('hidden');
  if (msgFeedback) msgFeedback.classList.add('hidden');
  
  try {
    const res = await apiGet('obterSolicitacao', { id: idInput });
    loader.classList.add('hidden');
    
    if (!res) {
      exibirFeedbackConsulta("Identificador não localizado na base operacional.", "erro");
      return;
    }
    
    solicitacaoAtiva = res;
    preencherCardConsulta(res);
    card.classList.remove('hidden');
    exibirFeedbackConsulta("Agendamento localizado!", "sucesso");
  } catch (err) {
    loader.classList.add('hidden');
    exibirFeedbackConsulta("Erro ao ler dados: " + err.message, "erro");
  }
}

function exibirFeedbackConsulta(msg, tipo) {
  const box = document.getElementById('feedback-mensagem-consulta');
  if (!box) return;
  
  box.innerText = msg;
  box.className = "p-3 rounded-xl text-xs font-semibold text-center border ";
  if (tipo === "sucesso") {
    box.className += "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else {
    box.className += "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-bounce";
  }
  box.classList.remove('hidden');
}

function preencherCardConsulta(sol) {
  document.getElementById('res-id').innerText = sol.id;
  
  let dtCri = "--/--/----";
  if (sol.dataCriacao) {
    const d = new Date(sol.dataCriacao);
    if (!isNaN(d.getTime())) {
      dtCri = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  }
  document.getElementById('res-data-criacao').innerText = "Criado em: " + dtCri;
  
  const badge = document.getElementById('res-status-badge');
  badge.innerText = sol.status;
  badge.className = "px-3 py-1 rounded-full text-xs font-semibold border";
  
  if (sol.status === "Aprovado" || sol.status === "Realizado") {
    badge.className += " bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  } else if (sol.status.indexOf("Pendente") !== -1) {
    badge.className += " bg-amber-500/10 text-amber-500 border-amber-500/20";
  } else {
    badge.className += " bg-rose-500/10 text-rose-500 border-rose-500/20";
  }
  
  document.getElementById('res-vendedor').innerText = sol.vendedor;
  document.getElementById('res-tecnico').innerText = sol.tecnico;
  
  let dtTrab = sol.dataTrabalho;
  const pts = dtTrab.split('-');
  if (pts.length === 3) dtTrab = `${pts[2]}/${pts[1]}/${pts[0]}`;
  document.getElementById('res-data-trab').innerText = dtTrab;
  
  document.getElementById('res-cidade').innerText = sol.cidade;
  document.getElementById('res-cliente').innerText = `[${sol.codCliente}] ${sol.razaoSocial} (${sol.nomeFantasia})`;
  document.getElementById('res-servico').innerText = `${sol.tipoServico} - ${sol.profissional} (${sol.linhaAtuacao})`;
  document.getElementById('res-execucao').innerText = sol.formaExecucao === 'FLEX' ? '100% Flex (Exceção)' : 'Regra Geral';
  document.getElementById('res-distancia').innerText = (sol.kmDistancia || 0) + " km";
  document.getElementById('res-custo').innerText = "R$ " + parseFloat(sol.custoFlex || 0).toFixed(2);
  
  document.getElementById('pedido-vinculo-input').value = sol.numeroPedido || "";
}

async function salvarNumeroPedidoFaturamento() {
  const num = document.getElementById('pedido-vinculo-input').value.trim();
  if (!num) {
    alert("Digite o número do pedido ERP.");
    return;
  }
  
  if (!solicitacaoAtiva) return;
  
  try {
    const res = await apiPost('atualizarPedido', { id: solicitacaoAtiva.id, numeroPedido: num });
    if (res.sucesso) {
      alert("Pedido ERP faturado e vinculado ao agendamento!");
      buscarSolicitacaoPorId();
    } else {
      alert("Erro ao associar: " + res.erro);
    }
  } catch (err) {
    alert("Falha de rede: " + err.message);
  }
}

function baixarPdfFichaConsulta() {
  if (!solicitacaoAtiva) return;
  const { doc, nomeArq } = criarDocumentoPdf(solicitacaoAtiva);
  doc.save(nomeArq);
}

async function compartilharPdfFichaConsulta() {
  if (!solicitacaoAtiva) return;
  const { doc, nomeArq } = criarDocumentoPdf(solicitacaoAtiva);
  const blob = doc.output('blob');
  const file = new File([blob], nomeArq, { type: 'application/pdf' });
  
  try {
    await navigator.share({
      title: `Ficha Técnica ${solicitacaoAtiva.id}`,
      text: `Segue a ficha do atendimento Ameripan de ${solicitacaoAtiva.tecnico} no cliente ${solicitacaoAtiva.razaoSocial}.`,
      files: [file]
    });
  } catch (err) {
    if (err.name !== "AbortError") {
      doc.save(nomeArq);
    }
  }
}

// Fecha autocomplete ao clicar fora dele
document.addEventListener('click', function(e) {
  if (e.target.id !== 'cliente-search-nome') {
    const list = document.getElementById('autocomplete-lista');
    if (list) list.classList.add('hidden');
  }
});

// Inicialização ao carregar
document.addEventListener('DOMContentLoaded', validarAcessoInicial);
