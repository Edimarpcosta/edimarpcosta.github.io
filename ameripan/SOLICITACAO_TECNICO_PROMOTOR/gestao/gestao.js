/**
 * PORTAL DE SOLUÇÕES DE CAMPO - AMERIPAN
 * Arquivo: gestao.js (Módulo Administrativo e de Supervisão)
 * Versão: 2.0
 */

const API_URL = "https://script.google.com/macros/s/AKfycbyf3Sv32fARyRQpFfysNt47TIaxYGmWucZuA0nr1EHgKLbAKvEFztB-d4CEwx7vqqz63A/exec";

// Estado operacional do painel
const statusPainelGerente = {
  logado: false,
  token: ""
};

let listaSolicitacoesGerenciais = [];
let listaUsuariosEquipe = [];

// ==========================================
// COMUNICAÇÃO DE REDE
// ==========================================

async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.append('action', action);
  
  const token = localStorage.getItem('gerente_session_token');
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
    realizarLogoutGerencia();
    throw new Error(data.erro);
  }
  return data;
}

async function apiPost(action, payload = {}) {
  const token = localStorage.getItem('gerente_session_token');
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
    realizarLogoutGerencia();
    throw new Error(data.erro);
  }
  return data;
}

// ==========================================
// AUTENTICAÇÃO DO GERENTE
// ==========================================

async function realizarLoginGerencial(e) {
  e.preventDefault();
  const user = document.getElementById('login-username').value.trim();
  const senhaInput = document.getElementById('login-senha');
  const btn = document.getElementById('gerencia-login-btn');
  const erro = document.getElementById('gerencia-login-erro');
  const senha = senhaInput.value.trim();
  
  if (!senha) return;
  
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-1"></i> Autenticando...`;
  erro.classList.add('hidden');
  
  try {
    // Primeiro valida o acesso do gestor (com a senha geral do CONFIG)
    const res = await apiPost('autenticar', { senha: senha });
    if (res.sucesso) {
      localStorage.setItem('gerente_session_token', res.token);
      document.getElementById('gerencia-lock-overlay').classList.add('hidden');
      inicializarModuloGerencial();
    } else {
      erro.innerText = "Senha administrativa incorreta! Tente novamente.";
      erro.classList.remove('hidden');
      senhaInput.value = "";
      senhaInput.focus();
    }
  } catch (err) {
    erro.innerText = "Erro ao autenticar: " + err.message;
    erro.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-lock-open"></i> Acessar Painel`;
  }
}

async function validarAcessoGerente() {
  const token = localStorage.getItem('gerente_session_token');
  const overlay = document.getElementById('gerencia-lock-overlay');
  
  if (!token) {
    overlay.classList.remove('hidden');
    return;
  }
  
  try {
    const res = await apiPost('verificarTokenGestor', {});
    if (res.sucesso) {
      overlay.classList.add('hidden');
      inicializarModuloGerencial();
    } else {
      localStorage.removeItem('gerente_session_token');
      overlay.classList.remove('hidden');
    }
  } catch (err) {
    console.error("Falha ao validar sessão gerencial:", err);
  }
}

function realizarLogoutGerencia() {
  localStorage.removeItem('gerente_session_token');
  location.reload();
}

// ==========================================
// CONTROLE DE ABAS E CARREGAMENTOS
// ==========================================

function switchAbaAdmin(aba) {
  document.querySelectorAll('.aba-admin-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.aba-admin-btn').forEach(btn => {
    btn.classList.remove('bg-slate-900', 'border', 'border-slate-800', 'text-brand-gold');
    btn.classList.add('text-slate-400', 'hover:text-white');
  });
  
  document.getElementById('section-admin-' + aba).classList.remove('hidden');
  
  const activeBtn = document.getElementById('tab-admin-' + aba);
  activeBtn.classList.remove('text-slate-400', 'hover:text-white');
  activeBtn.classList.add('bg-slate-900', 'border', 'border-slate-800', 'text-brand-gold');
  
  if (aba === "escala") {
    renderizarEscalaSemanal();
  } else if (aba === "equipe") {
    carregarUsuariosEquipe();
  } else if (aba === "config") {
    carregarParametrosConfigForm();
  }
}

async function inicializarModuloGerencial() {
  await recarregarDadosOperacionais();
}

async function recarregarDadosOperacionais() {
  const loader = document.getElementById('painel-loader');
  const corpo = document.getElementById('tabela-operacoes-corpo');
  const vazia = document.getElementById('tabela-operacoes-vazia');
  const filtroPer = document.getElementById('filter-periodo').value;
  
  corpo.innerHTML = "";
  vazia.classList.add('hidden');
  loader.classList.remove('hidden');
  
  try {
    const res = await apiPost('getDadosPainel', { filtroData: filtroPer });
    loader.classList.add('hidden');
    
    listaSolicitacoesGerenciais = res.solicitacoes || [];
    
    // Atualiza KPIs
    document.getElementById('metric-total').innerText = res.metrics.total;
    document.getElementById('metric-pendentes').innerText = res.metrics.pendentes;
    document.getElementById('metric-custo-flex').innerText = "R$ " + res.metrics.custoFlex.toFixed(2);
    document.getElementById('metric-km').innerText = res.metrics.km.toFixed(1) + " KM";
    
    aplicarFiltrosOperacoes();
  } catch (err) {
    loader.classList.add('hidden');
    alert("Erro ao buscar dados operacionais: " + err.message);
  }
}

// ==========================================
// FILTROS E EXPORTAÇÃO
// ==========================================

function aplicarFiltrosOperacoes() {
  const prof = document.getElementById('filter-tecnico').value;
  const status = document.getElementById('filter-status').value;
  const corpo = document.getElementById('tabela-operacoes-corpo');
  const vazia = document.getElementById('tabela-operacoes-vazia');
  
  corpo.innerHTML = "";
  
  const filtrados = listaSolicitacoesGerenciais.filter(s => {
    const matchProf = (prof === "TODOS" || s.tecnico.toUpperCase() === prof.toUpperCase());
    const matchStatus = (status === "TODOS" || s.status === status);
    return matchProf && matchStatus;
  });
  
  if (filtrados.length === 0) {
    vazia.classList.remove('hidden');
    return;
  }
  
  vazia.classList.add('hidden');
  
  filtrados.forEach(s => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-900/40 transition-colors duration-200 border-b border-slate-900";
    
    let dtTrab = s.dataTrabalho;
    const pts = dtTrab.split('-');
    if (pts.length === 3) dtTrab = `${pts[2]}/${pts[1]}/${pts[0]}`;
    
    let badgeStyle = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
    if (s.status === "Aprovado") {
      badgeStyle = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
    } else if (s.status === "Realizado") {
      badgeStyle = "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    } else if (s.status === "Pendente Pedido e Aprovacao") {
      badgeStyle = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    }
    
    let acoesHtml = `
      <button onclick="baixarPdfFicha('${s.id}')" title="Baixar PDF" class="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-lg border border-slate-750 transition-colors">
        <i class="fa-solid fa-file-pdf"></i>
      </button>
      <button onclick="deletarAgendamento('${s.id}')" title="Excluir" class="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white p-1.5 rounded-lg border border-rose-500/20 transition-all">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;
    
    if (s.status.indexOf("Pendente") !== -1) {
      acoesHtml = `
        <button onclick="aprovarAgendamento('${s.id}')" title="Aprovar Atendimento" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 rounded-lg transition-colors text-[9px] font-bold">
          APROVAR
        </button>
        ${acoesHtml}
      `;
    }
    
    if (s.status === "Realizado") {
      acoesHtml = `
        <button onclick="visualizarFeedbackTecnico('${s.id}')" title="Feedback do Técnico" class="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition-colors">
          <i class="fa-solid fa-clipboard-question"></i>
        </button>
        ${acoesHtml}
      `;
    }
    
    tr.innerHTML = `
      <td class="px-5 py-4 font-bold text-brand-gold font-outfit">${s.id}</td>
      <td class="px-5 py-4 text-white font-medium">${s.vendedor}</td>
      <td class="px-5 py-4">${s.tecnico} <span class="text-[10px] text-slate-500 block">${s.tipoServico} - ${s.profissional}</span></td>
      <td class="px-5 py-4 font-medium">${dtTrab}</td>
      <td class="px-5 py-4 truncate max-w-[180px]">${s.razaoSocial} <span class="text-[9px] text-slate-500 block">${s.cidade}</span></td>
      <td class="px-5 py-4">R$ ${parseFloat(s.valorPedido || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})} <span class="text-[9px] text-slate-500 block">M.U. ${parseFloat(s.indicePedido || 0).toFixed(1)}</span></td>
      <td class="px-5 py-4 font-mono font-medium text-white">${s.numeroPedido || '<span class="text-slate-650">Nenhum</span>'}</td>
      <td class="px-5 py-4">${s.kmDistancia || 0} km <span class="text-[9px] text-slate-500 block">Flex: R$ ${parseFloat(s.custoFlex || 0).toFixed(2)}</span></td>
      <td class="px-5 py-4"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${badgeStyle}">${s.status}</span></td>
      <td class="px-5 py-4"><div class="flex items-center justify-center gap-1.5">${acoesHtml}</div></td>
    `;
    
    corpo.appendChild(tr);
  });
}

async function aprovarAgendamento(id) {
  if (!confirm(`Confirmar liberação e aprovação da solicitação ${id}?`)) return;
  try {
    const res = await apiPost('aprovar', { id: id });
    if (res.sucesso) {
      alert("Atendimento liberado com sucesso.");
      recarregarDadosOperacionais();
    } else {
      alert("Falha: " + res.erro);
    }
  } catch (err) {
    alert(err.message);
  }
}

async function deletarAgendamento(id) {
  if (!confirm(`Deseja realmente excluir permanentemente a solicitação ${id}?\nEsta ação fará uma exclusão lógica no histórico.`)) return;
  try {
    const res = await apiPost('deletar', { id: id });
    if (res.sucesso) {
      alert("Solicitação excluída.");
      recarregarDadosOperacionais();
    } else {
      alert("Erro: " + res.erro);
    }
  } catch (err) {
    alert(err.message);
  }
}

async function exportarRelatorioCSV() {
  try {
    const res = await apiPost('exportarCSV');
    if (res.sucesso) {
      const blob = new Blob(["\uFEFF" + res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `AMERIPAN_SOLICITACOES_CAMPO_${new Date().getFullYear()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    alert(err.message);
  }
}

// ==========================================
// ESCALA SEMANAL (M17)
// ==========================================

function renderizarEscalaSemanal() {
  const container = document.getElementById('escala-semanal-container');
  container.innerHTML = "";
  
  const diasDaSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  
  for (let i = 0; i < 7; i++) {
    const diaObj = new Date(hoje.getTime() + i * 24 * 60 * 60 * 1000);
    const dataStr = diaObj.toISOString().slice(0, 10);
    
    const card = document.createElement('div');
    card.className = "bg-slate-950/60 border rounded-2xl p-4 flex flex-col gap-3 justify-between min-h-[160px] ";
    
    const trabalhosDia = listaSolicitacoesGerenciais.filter(s => s.dataTrabalho === dataStr);
    
    const header = document.createElement('div');
    header.innerHTML = `
      <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">${diasDaSemana[diaObj.getDay()]}</span>
      <h4 class="text-xs font-bold text-white">${diaObj.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</h4>
    `;
    card.appendChild(header);
    
    const body = document.createElement('div');
    body.className = "space-y-2 flex-grow";
    
    if (trabalhosDia.length === 0) {
      card.className += " border-amber-500/20 bg-amber-950/5";
      body.innerHTML = `
        <div class="text-[10px] text-amber-500 font-semibold uppercase flex items-center gap-1 mt-2">
          <i class="fa-solid fa-triangle-exclamation"></i> Sem Cobertura
        </div>
        <p class="text-[9px] text-slate-500">Nenhum atendimento agendado para este dia.</p>
      `;
    } else {
      card.className += " border-slate-800";
      trabalhosDia.forEach(t => {
        const item = document.createElement('div');
        item.className = "bg-slate-900/60 p-2 rounded-xl border border-slate-800/80 text-[10px] space-y-1";
        
        let badgeColor = "bg-yellow-500/10 text-yellow-500";
        if (t.status === "Aprovado") badgeColor = "bg-emerald-500/10 text-emerald-500";
        else if (t.status === "Realizado") badgeColor = "bg-blue-500/10 text-blue-500";
        
        item.innerHTML = `
          <div class="flex justify-between items-center">
            <strong class="text-brand-gold font-outfit">${t.tecnico}</strong>
            <span class="px-1 py-0.5 rounded text-[8px] font-bold ${badgeColor}">${t.status}</span>
          </div>
          <p class="text-slate-300 font-medium truncate" title="${t.razaoSocial}">${t.razaoSocial}</p>
          <div class="flex justify-between text-[8px] text-slate-500">
            <span>${t.kmDistancia} KM</span>
            <span>Flex: R$ ${t.custoFlex.toFixed(2)}</span>
          </div>
        `;
        body.appendChild(item);
      });
    }
    
    card.appendChild(body);
    container.appendChild(card);
  }
}

// ==========================================
// CRUD DE EQUIPE DE CAMPO (M12)
// ==========================================

async function carregarUsuariosEquipe() {
  const corpo = document.getElementById('tabela-usuarios-corpo');
  corpo.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-500">Carregando usuários...</td></tr>`;
  
  try {
    const res = await apiPost('gerenciarUsuario', { operacao: "listar" });
    corpo.innerHTML = "";
    if (res.sucesso && res.usuarios) {
      listaUsuariosEquipe = res.usuarios;
      
      const filterSelect = document.getElementById('filter-tecnico');
      if (filterSelect) {
        const oldVal = filterSelect.value;
        filterSelect.innerHTML = `<option value="TODOS">TODOS OS PROFISSIONAIS</option>`;
        res.usuarios.forEach(u => {
          if (u.ativo === "SIM" && (u.tipo === "TECNICO" || u.tipo === "PROMOTOR")) {
            const opt = document.createElement('option');
            opt.value = u.nome;
            opt.innerText = `${u.nome} (${u.tipo})`;
            filterSelect.appendChild(opt);
          }
        });
        if (oldVal && filterSelect.querySelector(`option[value="${oldVal}"]`)) {
          filterSelect.value = oldVal;
        }
      }
      
      res.usuarios.forEach(u => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-900/40 border-b border-slate-900";
        
        const activeText = u.ativo === "SIM" ? "ATIVO" : "INATIVO";
        const activeColor = u.ativo === "SIM" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500";
        
        tr.innerHTML = `
          <td class="px-4 py-3 font-mono text-white">${u.username}</td>
          <td class="px-4 py-3 font-medium">${u.nome}</td>
          <td class="px-4 py-3">${u.tipo}</td>
          <td class="px-4 py-3"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${activeColor}">${activeText}</span></td>
          <td class="px-4 py-3">
            <div class="flex items-center justify-center gap-2">
              <button onclick="redefinirSenhaUsuario('${u.username}')" class="bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded text-[10px] border border-slate-750 transition-colors">
                Alterar Senha
              </button>
              <button onclick="alternarStatusUsuario('${u.username}', '${u.ativo}')" class="bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded text-[10px] border border-slate-750 transition-colors">
                ${u.ativo === "SIM" ? "Desativar" : "Ativar"}
              </button>
            </div>
          </td>
        `;
        corpo.appendChild(tr);
      });
    }
  } catch (err) {
    corpo.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-rose-500">Erro: ${err.message}</td></tr>`;
  }
}

async function salvarUsuarioEquipe(e) {
  e.preventDefault();
  const username = document.getElementById('eq-username').value.trim();
  const nome = document.getElementById('eq-nome').value.trim();
  const tipo = document.getElementById('eq-tipo').value;
  const senha = document.getElementById('eq-senha').value.trim();
  
  try {
    const res = await apiPost('gerenciarUsuario', {
      operacao: "criar",
      dados: { username, nome, tipo, senha }
    });
    if (res.sucesso) {
      alert(`Usuário "${username}" cadastrado com sucesso.`);
      document.getElementById('form-cadastrar-usuario').reset();
      carregarUsuariosEquipe();
    } else {
      alert("Erro ao cadastrar: " + res.erro);
    }
  } catch (err) {
    alert(err.message);
  }
}

async function redefinirSenhaUsuario(username) {
  const nova = prompt(`Digite a nova senha para o usuário "${username}":`);
  if (!nova || !nova.trim()) return;
  
  try {
    const res = await apiPost('gerenciarUsuario', {
      operacao: "alterarSenha",
      dados: { username: username, novaSenha: nova.trim() }
    });
    if (res.sucesso) {
      alert("Senha alterada.");
    } else {
      alert("Erro: " + res.erro);
    }
  } catch (err) {
    alert(err.message);
  }
}

async function alternarStatusUsuario(username, ativoAtual) {
  const novo = ativoAtual === "SIM" ? "NAO" : "SIM";
  if (!confirm(`Confirmar alteração de status de "${username}" para ${novo === "SIM" ? "Ativo" : "Inativo"}?`)) return;
  
  try {
    const res = await apiPost('gerenciarUsuario', {
      operacao: "alterarStatus",
      dados: { username: username, ativo: novo }
    });
    if (res.sucesso) {
      carregarUsuariosEquipe();
    } else {
      alert("Erro: " + res.erro);
    }
  } catch (err) {
    alert(err.message);
  }
}

// ==========================================
// PARÂMETROS COMERCIAIS (M11)
// ==========================================

async function carregarParametrosConfigForm() {
  const loader = document.getElementById('config-loader');
  const form = document.getElementById('form-config-parametros');
  loader.classList.remove('hidden');
  form.innerHTML = "";
  
  try {
    const res = await apiGet('obterParametrosPublicos');
    loader.classList.add('hidden');
    
    if (res && res.sucesso && res.parametros) {
      const keys = Object.keys(res.parametros);
      const labels = {
        MIN_PEDIDO_PROMOTOR: "Pedido Mínimo Promotor (R$)",
        MIN_PEDIDO_TECNICO: "Pedido Mínimo Técnico (R$)",
        MIN_MARKUP: "Markup Mínimo (M.U.)",
        CUSTO_FLEX_PADRAO_PROMOTOR: "Flex Padrão Promotor (R$)",
        CUSTO_FLEX_PADRAO_TECNICO: "Flex Padrão Técnico (R$)",
        CUSTO_FLEX_100_PROMOTOR: "Flex 100% Promotor (R$)",
        CUSTO_FLEX_100_TECNICO: "Flex 100% Técnico (R$)"
      };
      
      keys.forEach(k => {
        const div = document.createElement('div');
        div.innerHTML = `
          <label class="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">${labels[k] || k}</label>
          <input type="number" step="0.01" data-chave="${k}" value="${res.parametros[k]}" required
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm">
        `;
        form.appendChild(div);
      });
      
      const btnDiv = document.createElement('div');
      btnDiv.className = "md:col-span-2 pt-4 flex justify-end";
      btnDiv.innerHTML = `
        <button type="submit" class="bg-gradient-to-r from-brand-500 to-brand-gold text-white font-semibold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-all">
          <i class="fa-solid fa-save"></i> Gravar Parâmetros
        </button>
      `;
      form.appendChild(btnDiv);
    }
  } catch (err) {
    loader.classList.add('hidden');
    form.innerHTML = `<div class="text-rose-500 text-xs text-center py-4 md:col-span-2">Erro ao carregar configurações: ${err.message}</div>`;
  }
}

async function salvarConfigParametros(e) {
  e.preventDefault();
  const form = document.getElementById('form-config-parametros');
  const inputs = form.querySelectorAll('input[data-chave]');
  
  let erros = 0;
  for (let input of inputs) {
    const chave = input.getAttribute('data-chave');
    const valor = input.value.trim();
    
    try {
      const res = await apiPost('atualizarConfigParam', { chave, valor });
      if (!res.sucesso) {
        erros++;
        console.error("Falha ao salvar " + chave);
      }
    } catch (err) {
      erros++;
    }
  }
  
  if (erros === 0) {
    alert("Parâmetros comerciais atualizados no banco de dados com sucesso!");
    carregarParametrosConfigForm();
  } else {
    alert("Alguns parâmetros não puderam ser gravados. Verifique o console.");
  }
}

// ==========================================
// VISUALIZAÇÃO DE FEEDBACK DE ATENDIMENTOS (M10)
// ==========================================

function visualizarFeedbackTecnico(id) {
  const sol = listaSolicitacoesGerenciais.find(s => s.id === id);
  if (!sol) return;
  
  document.getElementById('modal-feedback-titulo').innerText = `Feedback do Profissional: ${sol.id}`;
  
  let urlsFotos = "";
  if (sol.fotosUrls) {
    const list = sol.fotosUrls.split("\n");
    list.forEach((url, i) => {
      if (url.trim()) {
        urlsFotos += `<a href="${url.trim()}" target="_blank" class="text-brand-gold hover:underline block"><i class="fa-solid fa-image mr-1"></i> Foto Anexada ${i+1}</a>`;
      }
    });
  } else {
    urlsFotos = "<span class='text-slate-500'>Nenhuma foto anexada.</span>";
  }

  let urlsVideos = "";
  if (sol.videosUrls) {
    const list = sol.videosUrls.split("\n");
    list.forEach((url, i) => {
      if (url.trim()) {
        urlsVideos += `<a href="${url.trim()}" target="_blank" class="text-brand-gold hover:underline block"><i class="fa-solid fa-video mr-1"></i> Vídeo Anexado ${i+1}</a>`;
      }
    });
  } else {
    urlsVideos = "<span class='text-slate-500'>Nenhum vídeo anexado.</span>";
  }
  
  const content = document.getElementById('modal-feedback-conteudo');
  content.innerHTML = `
    <div class="space-y-1">
      <strong class="text-slate-400 block uppercase text-[9px] tracking-wide">Profissional alocado:</strong>
      <p class="text-white font-medium">${sol.tecnico} (${sol.profissional})</p>
    </div>
    <div class="space-y-1 border-t border-slate-800/60 pt-2">
      <strong class="text-slate-400 block uppercase text-[9px] tracking-wide">Data de Conclusão:</strong>
      <p class="text-white font-medium">${sol.realizadoEm ? new Date(sol.realizadoEm).toLocaleDateString('pt-BR') : '-'}</p>
    </div>
    <div class="space-y-1 border-t border-slate-800/60 pt-2">
      <strong class="text-slate-400 block uppercase text-[9px] tracking-wide">Relatório de Atendimento:</strong>
      <p class="text-slate-300 leading-relaxed font-mono p-2 bg-slate-950 border border-slate-850 rounded-lg whitespace-pre-wrap">${sol.feedbackTecnico || 'Sem observações.'}</p>
    </div>
    <div class="space-y-1 border-t border-slate-800/60 pt-2">
      <strong class="text-slate-400 block uppercase text-[9px] tracking-wide">Oportunidades Comerciais Identificadas:</strong>
      <p class="text-slate-300 leading-relaxed font-mono p-2 bg-slate-950 border border-slate-850 rounded-lg whitespace-pre-wrap">${sol.oportunidades || 'Nenhuma oportunidade relatada.'}</p>
    </div>
    <div class="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-2 text-[10px]">
      <div>
        <strong class="text-slate-400 block uppercase text-[9px] tracking-wide mb-1">Fotos:</strong>
        <div class="space-y-1">${urlsFotos}</div>
      </div>
      <div>
        <strong class="text-slate-400 block uppercase text-[9px] tracking-wide mb-1">Vídeos:</strong>
        <div class="space-y-1">${urlsVideos}</div>
      </div>
    </div>
  `;
  
  document.getElementById('modal-feedback-tecnico').classList.remove('hidden');
}

function fecharModalFeedback() {
  document.getElementById('modal-feedback-tecnico').classList.add('hidden');
}

// ==========================================
// GERAÇÃO DE PDF FORMATADO COM JSpdf (M21)
// ==========================================

function criarFichaPdf(sol) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  
  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138); // Azul
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
  
  doc.autoTable({
    startY: y,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [210, 210, 210], lineWidth: 0.15 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
    head: [['Informação', 'Valor']],
    body: [
      ['Vendedor Requisitante', sol.vendedor || '-'],
      ['Profissional Alocado', sol.tecnico || '-'],
      ['Data Programada', dtVal || '-'],
      ['Cidade de Destino', sol.cidade || '-'],
      ['Cliente ERP', `[${sol.codCliente}] ${sol.razaoSocial} (${sol.nomeFantasia})`],
      ['Endereço Completo', `${sol.endereco || '-'}, Nº ${sol.numero || '-'} - ${sol.bairro || '-'}, ${sol.cidade || '-'} (CEP: ${sol.cep || '-'})`],
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
  
  // Feedback do Técnico se concluído
  if (sol.status === "Realizado") {
    y += splitText.length * 4.5 + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text('Relatório & Feedback de Conclusão Técnica:', margin, y);
    
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50);
    const fdb = sol.feedbackTecnico || "Sem observações específicas registradas.";
    const splitFdb = doc.splitTextToSize(fdb, contentWidth);
    doc.text(splitFdb, margin, y);
    
    y += splitFdb.length * 4.5;
  }
  
  y += 15;
  
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
  
  doc.setTextColor(150);
  doc.setFontSize(6.5);
  doc.text(`Portal Ameripan — Emitido em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  
  const nomeArq = `AMERIPAN_FICHA_${sol.id}_${(sol.razaoSocial || "Cliente").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 15)}.pdf`;
  
  return { doc, nomeArq };
}

function baixarPdfFicha(id) {
  const sol = listaSolicitacoesGerenciais.find(s => s.id === id);
  if (!sol) return;
  const { doc, nomeArq } = criarFichaPdf(sol);
  doc.save(nomeArq);
}

// Inicializa a escuta
document.addEventListener('DOMContentLoaded', validarAcessoGerente);
