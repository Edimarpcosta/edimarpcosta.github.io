/**
 * PORTAL DE SOLUÇÕES DE CAMPO - AMERIPAN
 * Arquivo: tecnico.js (Módulo do Profissional de Campo)
 * Versão: 2.0
 */

const API_URL = "https://script.google.com/macros/s/AKfycbyf3Sv32fARyRQpFfysNt47TIaxYGmWucZuA0nr1EHgKLbAKvEFztB-d4CEwx7vqqz63A/exec";

// Links do Google Drive (M09)
const DRIVE_FOTOS = 'https://drive.google.com/drive/folders/1Fueup8ZD2TSM6DxZWyrpFvEVcUGqmAIC';
const DRIVE_VIDEOS = 'https://drive.google.com/drive/folders/1r41QX15kMEtbqad8PAK7cQGbuz1CErDi';

let profissionalLogado = {
  nome: "",
  tipo: "",
  token: ""
};

let listaTrabalhosAlocados = [];
let indisponibilidadesAtivas = { ocupadas: [], bloqueadas: [] };

// ==========================================
// COMUNICAÇÃO DE REDE
// ==========================================

async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.append('action', action);
  
  const token = localStorage.getItem('tecnico_session_token');
  if (token) {
    url.searchParams.append('token', token);
  }
  
  for (const key in params) {
    url.searchParams.append(key, params[key]);
  }
  
  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) throw new Error("Erro na rede: " + res.statusText);
  const data = await res.json();
  if (data && data.sucesso === false && data.erro && (data.erro.includes("Acesso Negado") || data.erro.includes("Sessão") || data.erro.includes("expirada"))) {
    realizarLogoutTecnico();
    throw new Error(data.erro);
  }
  return data;
}

async function apiPost(action, payload = {}) {
  const token = localStorage.getItem('tecnico_session_token');
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
  if (data && data.sucesso === false && data.erro && (data.erro.includes("Acesso Negado") || data.erro.includes("Sessão") || data.erro.includes("expirada"))) {
    realizarLogoutTecnico();
    throw new Error(data.erro);
  }
  return data;
}

// ==========================================
// AUTENTICAÇÃO DO TÉCNICO
// ==========================================

async function realizarLoginTecnico(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username');
  const senhaInput = document.getElementById('login-senha');
  const btn = document.getElementById('tecnico-login-btn');
  const erro = document.getElementById('tecnico-login-erro');
  
  const username = usernameInput.value.trim();
  const senha = senhaInput.value.trim();
  
  if (!username || !senha) return;
  
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-1"></i> Acessando...`;
  erro.classList.add('hidden');
  
  try {
    const res = await apiPost('autenticarTecnico', { username, senha });
    if (res.sucesso) {
      localStorage.setItem('tecnico_session_token', res.sessionToken);
      localStorage.setItem('tecnico_session_nome', res.nome);
      localStorage.setItem('tecnico_session_tipo', res.tipo);
      
      document.getElementById('tecnico-lock-overlay').classList.add('hidden');
      inicializarModuloTecnico();
    } else {
      erro.innerText = res.erro || "Credenciais incorretas!";
      erro.classList.remove('hidden');
      senhaInput.value = "";
      senhaInput.focus();
    }
  } catch (err) {
    erro.innerText = "Erro na rede: " + err.message;
    erro.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-lock-open"></i> Desbloquear Acesso`;
  }
}

async function validarAcessoTecnico() {
  const token = localStorage.getItem('tecnico_session_token');
  const overlay = document.getElementById('tecnico-lock-overlay');
  
  if (!token) {
    overlay.classList.remove('hidden');
    return;
  }
  
  // Como o token está persistido, verifica no servidor para garantir
  try {
    const res = await apiPost('getTrabalhosTecnico', {}); // Rota segura que valida o token
    overlay.classList.add('hidden');
    inicializarModuloTecnico();
  } catch (err) {
    // Se falhar (token inválido/expirado/ex-funcionário), o interceptor de rede já terá chamado realizarLogoutTecnico()
    console.error("Falha ao validar sessão do técnico:", err);
  }
}

function realizarLogoutTecnico() {
  localStorage.removeItem('tecnico_session_token');
  localStorage.removeItem('tecnico_session_nome');
  localStorage.removeItem('tecnico_session_tipo');
  location.reload();
}

// ==========================================
// CONTROLE DE ABAS E CARREGAMENTO
// ==========================================

function switchAbaTecnico(aba) {
  document.querySelectorAll('.aba-tecnico-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.aba-tecnico-btn').forEach(btn => {
    btn.classList.remove('bg-slate-900', 'border', 'border-slate-800', 'text-brand-gold');
    btn.classList.add('text-slate-400', 'hover:text-white');
  });
  
  document.getElementById('section-tecnico-' + aba).classList.remove('hidden');
  
  const activeBtn = document.getElementById('tab-tecnico-' + aba);
  activeBtn.classList.remove('text-slate-400', 'hover:text-white');
  activeBtn.classList.add('bg-slate-900', 'border', 'border-slate-800', 'text-brand-gold');
  
  if (aba === "bloqueio") {
    carregarCalendarioDisponibilidades();
  } else {
    carregarTrabalhosAlocados();
  }
}

function inicializarModuloTecnico() {
  profissionalLogado.nome = localStorage.getItem('tecnico_session_nome');
  profissionalLogado.tipo = localStorage.getItem('tecnico_session_tipo');
  profissionalLogado.token = localStorage.getItem('tecnico_session_token');
  
  document.getElementById('header-tecnico-nome').innerText = `Olá, ${profissionalLogado.nome} (${profissionalLogado.tipo})`;
  
  carregarTrabalhosAlocados();
}

// ==========================================
// AGENDA OPERACIONAL DE CARDS
// ==========================================

async function carregarTrabalhosAlocados() {
  const loader = document.getElementById('agenda-loader');
  const container = document.getElementById('agenda-cards-container');
  const vazia = document.getElementById('agenda-vazia');
  
  container.innerHTML = "";
  vazia.classList.add('hidden');
  loader.classList.remove('hidden');
  
  try {
    const res = await apiPost('getTrabalhosTecnico');
    loader.classList.add('hidden');
    
    listaTrabalhosAlocados = res || [];
    
    if (listaTrabalhosAlocados.length === 0) {
      vazia.classList.remove('hidden');
      return;
    }
    
    renderizarCardsAgenda();
  } catch (err) {
    loader.classList.add('hidden');
    alert("Falha ao sincronizar trabalhos: " + err.message);
  }
}

function renderizarCardsAgenda() {
  const container = document.getElementById('agenda-cards-container');
  container.innerHTML = "";
  
  listaTrabalhosAlocados.forEach(s => {
    const card = document.createElement('div');
    card.className = "bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-glass backdrop-blur-md space-y-4";
    
    let dtTrab = s.dataTrabalho;
    const pts = dtTrab.split('-');
    if (pts.length === 3) dtTrab = `${pts[2]}/${pts[1]}/${pts[0]}`;
    
    let statusStyle = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
    let concluidoHtml = "";
    
    if (s.status === "Aprovado") {
      statusStyle = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      concluidoHtml = `
        <button onclick="abrirModalConclusao('${s.id}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all mt-2">
          <i class="fa-solid fa-clipboard-check"></i> Finalizar & Relatar Visita
        </button>
      `;
    } else if (s.status === "Realizado") {
      statusStyle = "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      
      let midiasAnexas = "";
      if (s.fotosUrls) midiasAnexas += `<div><span class="text-slate-500 block uppercase text-[8px] tracking-wide">Fotos:</span><p class="font-mono text-[9px] text-brand-gold break-all whitespace-pre-wrap">${s.fotosUrls}</p></div>`;
      if (s.videosUrls) midiasAnexas += `<div><span class="text-slate-500 block uppercase text-[8px] tracking-wide">Vídeos:</span><p class="font-mono text-[9px] text-brand-gold break-all whitespace-pre-wrap">${s.videosUrls}</p></div>`;
      
      concluidoHtml = `
        <div class="bg-slate-950 p-4 border border-slate-850 rounded-2xl space-y-2 mt-2 text-[11px] text-slate-350">
          <strong class="text-slate-400 block uppercase text-[8px] tracking-wider mb-1"><i class="fa-solid fa-circle-check text-blue-400 mr-1"></i> Resumo Enviado</strong>
          <div>
            <span class="text-slate-500 block uppercase text-[8px] tracking-wide">Relatório Técnico:</span>
            <p class="leading-relaxed whitespace-pre-wrap font-mono">${s.feedbackTecnico}</p>
          </div>
          ${s.oportunidades ? `
          <div>
            <span class="text-slate-500 block uppercase text-[8px] tracking-wide">Oportunidades Comerciais:</span>
            <p class="leading-relaxed whitespace-pre-wrap font-mono">${s.oportunidades}</p>
          </div>
          ` : ""}
          ${midiasAnexas}
        </div>
      `;
    } else if (s.status.indexOf("Pendente") !== -1) {
      statusStyle = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      concluidoHtml = `<p class="text-[10px] text-amber-500/80 font-medium italic mt-1 text-center"><i class="fa-solid fa-clock"></i> Aguardando aprovação da supervisão gerencial para execução.</p>`;
    }
    
    card.innerHTML = `
      <div class="flex justify-between items-center border-b border-slate-800 pb-3">
        <div>
          <span class="text-lg font-bold text-brand-gold font-outfit">${s.id}</span>
          <span class="text-[10px] text-slate-500 block">Data de Execução: ${dtTrab}</span>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${statusStyle}">${s.status}</span>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300 text-xs">
        <div>
          <span class="text-slate-500 block uppercase text-[8px] tracking-wide">Vendedor Requisitante</span>
          <p class="font-medium text-white">${s.vendedor}</p>
        </div>
        <div>
          <span class="text-slate-500 block uppercase text-[8px] tracking-wide">Atuação</span>
          <p class="font-medium text-white">${s.tipoServico} — ${s.profissional} (${s.linhaAtuacao})</p>
        </div>
        <div class="sm:col-span-2">
          <span class="text-slate-500 block uppercase text-[8px] tracking-wide">Cliente</span>
          <p class="font-medium text-white">[${s.codCliente}] ${s.razaoSocial}</p>
          <p class="text-[10px] text-slate-500 mt-0.5">Endereço: CEP ${s.cep}, Nº ${s.numero} — ${s.cidade}</p>
        </div>
        <div class="sm:col-span-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
          <span class="text-slate-500 block uppercase text-[8px] tracking-wide mb-1">Argumentações / Formulações Requeridas:</span>
          <p class="text-slate-300 leading-relaxed italic whitespace-pre-wrap">${s.detalhes || "Sem detalhes informados."}</p>
        </div>
      </div>
      
      ${concluidoHtml}
    `;
    
    container.appendChild(card);
  });
}

// ==========================================
// ENCERRAMENTO E FEEDBACKS (M10/M09)
// ==========================================

function abrirModalConclusao(id) {
  document.getElementById('conclusao-id-hidden').value = id;
  document.getElementById('conclusao-modal-titulo').innerText = `Concluir Visita: ${id}`;
  
  // Limpa campos
  document.getElementById('fdb-relatorio').value = "";
  document.getElementById('fdb-oportunidades').value = "";
  document.getElementById('fdb-fotos').value = "";
  document.getElementById('fdb-videos').value = "";
  
  document.getElementById('modal-concluir-trabalho').classList.remove('hidden');
}

function fecharModalConclusao() {
  document.getElementById('modal-concluir-trabalho').classList.add('hidden');
}

function abrirPastaFotosDrive() {
  window.open(DRIVE_FOTOS, '_blank');
}

function abrirPastaVideosDrive() {
  window.open(DRIVE_VIDEOS, '_blank');
}

async function enviarConclusaoVisita(e) {
  e.preventDefault();
  const id = document.getElementById('conclusao-id-hidden').value;
  const texto = document.getElementById('fdb-relatorio').value.trim();
  const oportunidades = document.getElementById('fdb-oportunidades').value.trim();
  const fotos = document.getElementById('fdb-fotos').value.trim();
  const videos = document.getElementById('fdb-videos').value.trim();
  
  const payload = {
    id: id,
    feedback: {
      texto,
      oportunidades,
      fotos,
      videos
    }
  };
  
  try {
    const res = await apiPost('marcarRealizado', payload);
    if (res.sucesso) {
      alert("Atendimento registrado como concluído com sucesso!");
      fecharModalConclusao();
      carvarEAgendaSinc();
    } else {
      alert("Erro ao salvar: " + res.erro);
    }
  } catch (err) {
    alert("Falha de comunicação: " + err.message);
  }
}

function carvarEAgendaSinc() {
  carregarTrabalhosAlocados();
}

// ==========================================
// BLOQUEIO DE AGENDA (M08)
// ==========================================

async function carregarCalendarioDisponibilidades() {
  cancelarSelecaoBloqueio();
  const calContainer = document.getElementById('tecnico-calendarios-container');
  calContainer.innerHTML = `<div class="text-center text-slate-500 text-xs py-4 col-span-2"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Buscando agenda...</div>`;
  
  try {
    const res = await apiGet('getDatasIndisponiveis', { tecnico: profissionalLogado.nome });
    if (!res || res.sucesso === false) {
      throw new Error(res ? res.erro : "Resposta inválida do servidor");
    }
    indisponibilidadesAtivas = res; // { ocupadas, bloqueadas }
    renderizarCalendariosTecnico();
  } catch (err) {
    calContainer.innerHTML = `<div class="text-center text-rose-500 text-xs py-4 col-span-2">Erro ao carregar escala: ${err.message}</div>`;
  }
}

function renderizarCalendariosTecnico() {
  const calContainer = document.getElementById('tecnico-calendarios-container');
  calContainer.innerHTML = "";
  
  const hoje = new Date();
  const meses = [
    { ano: hoje.getFullYear(), mes: hoje.getMonth() },
    { ano: hoje.getMonth() === 11 ? hoje.getFullYear() + 1 : hoje.getFullYear(), mes: (hoje.getMonth() + 1) % 12 }
  ];
  
  meses.forEach(m => {
    calContainer.appendChild(gerarCalendarioTecnicoMes(m.ano, m.mes));
  });
}

function gerarCalendarioTecnicoMes(ano, mes) {
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
    headerCell.className = "text-slate-650 font-bold text-[9px] py-1";
    headerCell.innerText = d;
    grid.appendChild(headerCell);
  });
  
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
  
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
    
    const isOcupado = indisponibilidadesAtivas.ocupadas.includes(dataStr);
    const bloqueio = indisponibilidadesAtivas.bloqueadas.find(b => b.data === dataStr);
    
    if (isPassado) {
      cellBtn.className += "text-slate-800 cursor-not-allowed";
      cellBtn.disabled = true;
    } else if (isOcupado) {
      cellBtn.className += "bg-rose-950/40 text-rose-500 border border-rose-900/20 cursor-not-allowed";
      cellBtn.disabled = true;
      cellBtn.title = "Alocado: Visita confirmada";
    } else if (bloqueio) {
      cellBtn.className += "bg-slate-800 text-slate-350 border border-slate-700 tooltip";
      
      const tooltip = document.createElement('span');
      tooltip.className = "tooltiptext";
      tooltip.innerText = bloqueio.comentario || "Indisponível (Sem motivo)";
      cellBtn.appendChild(tooltip);
      
      cellBtn.onclick = () => {
        carregarAbaDesbloqueio(dataStr, bloqueio.comentario || "");
      };
    } else {
      cellBtn.className += "bg-emerald-950/40 text-emerald-400 border border-emerald-900/20 hover:bg-emerald-600 hover:text-white";
      cellBtn.onclick = () => {
        carregarAbaBloqueio(dataStr);
      };
    }
    
    grid.appendChild(cellBtn);
  }
  
  box.appendChild(grid);
  return box;
}

function carregarAbaBloqueio(data) {
  cancelarSelecaoBloqueio();
  
  const parts = data.split("-");
  const dataBr = `${parts[2]}/${parts[1]}/${parts[0]}`;
  
  document.getElementById('lbl-data-bloqueio').innerText = `Bloquear data: ${dataBr}`;
  document.getElementById('bloqueio-data-hidden').value = data;
  document.getElementById('bloqueio-motivo').value = "";
  
  document.getElementById('form-bloqueio-inline').classList.remove('hidden');
}

function carregarAbaDesbloqueio(data, comentario) {
  cancelarSelecaoBloqueio();
  
  const parts = data.split("-");
  const dataBr = `${parts[2]}/${parts[1]}/${parts[0]}`;
  
  document.getElementById('lbl-data-desbloqueio').innerText = `Liberar data: ${dataBr}`;
  document.getElementById('desbloqueio-data-hidden').value = data;
  document.getElementById('lbl-desbloqueio-motivo-atual').innerText = `Motivo do bloqueio: ${comentario || "Sem observações."}`;
  
  document.getElementById('form-desbloqueio-inline').classList.remove('hidden');
}

function cancelarSelecaoBloqueio() {
  document.getElementById('form-bloqueio-inline').classList.add('hidden');
  document.getElementById('form-desbloqueio-inline').classList.add('hidden');
  document.getElementById('bloqueio-data-hidden').value = "";
  document.getElementById('desbloqueio-data-hidden').value = "";
}

async function confirmarBloqueioData() {
  const data = document.getElementById('bloqueio-data-hidden').value;
  const obs = document.getElementById('bloqueio-motivo').value.trim();
  
  try {
    const res = await apiPost('marcarIndisponibilidade', { data: data, comentario: obs });
    if (res.sucesso) {
      alert("Data indisponibilizada na escala de vendas.");
      carregarCalendarioDisponibilidades();
    } else {
      alert("Erro ao bloquear: " + res.erro);
    }
  } catch (err) {
    alert(err.message);
  }
}

async function confirmarDesbloqueioData() {
  const data = document.getElementById('desbloqueio-data-hidden').value;
  
  try {
    const res = await apiPost('marcarIndisponibilidade', { data: data });
    if (res.sucesso) {
      alert("Data liberada e disponível para agendamento.");
      carregarCalendarioDisponibilidades();
    } else {
      alert("Erro ao liberar: " + res.erro);
    }
  } catch (err) {
    alert(err.message);
  }
}

// Inicializa a escuta
document.addEventListener('DOMContentLoaded', validarAcessoTecnico);
