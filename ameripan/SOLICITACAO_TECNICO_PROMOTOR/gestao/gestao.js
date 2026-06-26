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
  await Promise.all([
    recarregarDadosOperacionais(),
    carregarUsuariosEquipe()
  ]);
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
      <button onclick="abrirModalEdicao('${s.id}')" title="Editar Registro" class="bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white p-1.5 rounded-lg border border-blue-500/20 transition-all">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
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

// ==========================================
// EXPORTAÇÃO: EXCEL (SheetJS) + PDF RELATÓRIO
// ==========================================

function exportarRelatorioExcel() {
  if (!listaSolicitacoesGerenciais || listaSolicitacoesGerenciais.length === 0) {
    alert('Nenhum dado carregado para exportar. Aplique um filtro e aguarde carregar.');
    return;
  }

  const cabecalho = [
    'ID', 'Vendedor', 'Profissional', 'Data', 'Cód. ERP', 'Razão Social', 'Nome Fantasia',
    'Cidade', 'CEP', 'Número', 'Tipo Prof.', 'Tipo Serviço', 'Execução',
    'Detalhes', 'Valor Pedido', 'Markup', 'Nº Pedido ERP',
    'Custo Flex (R$)', 'KM Distância', 'Status',
    'Data Criação', 'Aprovado Em', 'Realizado Em', 'Endereço', 'Bairro'
  ];

  const linhas = listaSolicitacoesGerenciais.map(s => [
    s.id, s.vendedor, s.tecnico, s.dataTrabalho, s.codCliente, s.razaoSocial, s.nomeFantasia,
    s.cidade, s.cep, s.numero, s.profissional, s.tipoServico, s.formaExecucao,
    s.detalhes, parseFloat(s.valorPedido || 0), parseFloat(s.indicePedido || 0), s.numeroPedido,
    parseFloat(s.custoFlex || 0), parseFloat(s.kmDistancia || 0), s.status,
    s.dataCriacao, s.aprovadoEm, s.realizadoEm, s.endereco, s.bairro
  ]);

  const wsData = [cabecalho, ...linhas];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Larguras de coluna
  ws['!cols'] = [
    {wch: 8}, {wch: 20}, {wch: 20}, {wch: 12}, {wch: 10}, {wch: 30}, {wch: 22},
    {wch: 18}, {wch: 12}, {wch: 8}, {wch: 10}, {wch: 18}, {wch: 10},
    {wch: 40}, {wch: 14}, {wch: 10}, {wch: 14},
    {wch: 14}, {wch: 12}, {wch: 28},
    {wch: 14}, {wch: 14}, {wch: 14}, {wch: 30}, {wch: 18}
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Solicitacoes');

  const nomeArq = `AMERIPAN_RELATORIO_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, nomeArq);
}

function exportarRelatorioPDF() {
  if (!listaSolicitacoesGerenciais || listaSolicitacoesGerenciais.length === 0) {
    alert('Nenhum dado carregado para exportar. Aplique um filtro e aguarde carregar.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape para caber mais colunas
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138);
  doc.text('AMERIPAN ALIMENTOS — Relatório de Solicitações de Campo', pageWidth / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  const periodo = document.getElementById('filter-periodo')?.selectedOptions[0]?.text || '';
  doc.text(`Período: ${periodo} | Emitido em: ${new Date().toLocaleString('pt-BR')} | Total: ${listaSolicitacoesGerenciais.length} registros`, pageWidth / 2, 20, { align: 'center' });

  // Tabela
  const head = [['ID', 'Vendedor', 'Profissional', 'Data', 'Cliente', 'Cidade', 'Tipo', 'Execução', 'Vlr Pedido', 'Markup', 'Nº ERP', 'KM', 'Flex R$', 'Status']];
  const body = listaSolicitacoesGerenciais.map(s => {
    let dtTrab = s.dataTrabalho;
    const pts = dtTrab ? dtTrab.split('-') : [];
    if (pts.length === 3) dtTrab = `${pts[2]}/${pts[1]}/${pts[0]}`;
    return [
      s.id,
      s.vendedor || '-',
      s.tecnico || '-',
      dtTrab || '-',
      `${s.razaoSocial || '-'}`.slice(0, 22),
      s.cidade || '-',
      `${s.profissional || ''} / ${s.tipoServico || ''}`,
      s.formaExecucao || '-',
      `R$ ${parseFloat(s.valorPedido || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      parseFloat(s.indicePedido || 0).toFixed(1),
      s.numeroPedido || '-',
      `${parseFloat(s.kmDistancia || 0).toFixed(1)} km`,
      `R$ ${parseFloat(s.custoFlex || 0).toFixed(2)}`,
      s.status || '-'
    ];
  });

  doc.autoTable({
    startY: 24,
    head: head,
    body: body,
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 1.8, lineColor: [200, 200, 200], lineWidth: 0.1, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 16 },
      4: { cellWidth: 32 },
      5: { cellWidth: 22 },
      6: { cellWidth: 24 },
      7: { cellWidth: 14 },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 12, halign: 'right' },
      10: { cellWidth: 16 },
      11: { cellWidth: 13, halign: 'right' },
      12: { cellWidth: 16, halign: 'right' },
      13: { cellWidth: 28 }
    }
  });

  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(`Portal Ameripan — Emitido em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });

  const nomeArq = `AMERIPAN_RELATORIO_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(nomeArq);
}

// Mantida para compatibilidade caso haja chamada legada
async function exportarRelatorioCSV() {
  exportarRelatorioExcel();
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
      
      const editTecnicoSelect = document.getElementById('edit-tecnico');
      if (editTecnicoSelect) {
        const oldVal = editTecnicoSelect.value;
        editTecnicoSelect.innerHTML = "";
        res.usuarios.forEach(u => {
          if (u.ativo === "SIM" && (u.tipo === "TECNICO" || u.tipo === "PROMOTOR")) {
            const opt = document.createElement('option');
            opt.value = u.nome;
            opt.innerText = `${u.nome} (${u.tipo})`;
            editTecnicoSelect.appendChild(opt);
          }
        });
        if (oldVal && editTecnicoSelect.querySelector(`option[value="${oldVal}"]`)) {
          editTecnicoSelect.value = oldVal;
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
// PARÂMETROS COMERCIAIS + ACESSO/NOTIFICAÇÕES (M11 + F2)
// ==========================================

let _configsCache = [];

async function carregarParametrosConfigForm() {
  const loaderComercial = document.getElementById('config-loader');
  const loaderAcesso = document.getElementById('acesso-loader');
  const formComercial = document.getElementById('form-config-parametros');
  const formAcesso = document.getElementById('form-config-acesso');

  loaderComercial.classList.remove('hidden');
  loaderAcesso.classList.remove('hidden');
  formComercial.innerHTML = '';
  formAcesso.innerHTML = '';

  const labelsComercial = {
    MIN_PEDIDO_PROMOTOR: 'Pedido Mínimo Promotor (R$)',
    MIN_PEDIDO_TECNICO: 'Pedido Mínimo Técnico (R$)',
    MIN_MARKUP: 'Markup Mínimo (M.U.)',
    CUSTO_FLEX_PADRAO_PROMOTOR: 'Flex Padrão Promotor (R$)',
    CUSTO_FLEX_PADRAO_TECNICO: 'Flex Padrão Técnico (R$)',
    CUSTO_FLEX_100_PROMOTOR: 'Flex 100% Promotor (R$)',
    CUSTO_FLEX_100_TECNICO: 'Flex 100% Técnico (R$)'
  };
  const labelsAcesso = {
    SENHA_PORTAL: 'Senha do Portal (Vendedores)',
    SENHA_GESTOR: 'Senha do Gestor (Painel Gerencial)',
    EMAIL_GERENTE: 'E-mail do Gerente (Notificações)'
  };

  try {
    const res = await apiPost('obterTodasConfiguracoes');
    loaderComercial.classList.add('hidden');
    loaderAcesso.classList.add('hidden');

    if (!res || !res.sucesso) {
      formComercial.innerHTML = `<div class="text-rose-500 text-xs text-center py-4 md:col-span-2">Erro ao carregar configurações: ${res ? res.erro : 'Resposta inválida'}</div>`;
      return;
    }

    _configsCache = res.configs;

    res.configs.forEach(cfg => {
      const chave = cfg.chave;
      const valor = cfg.valor;
      const ehSenha = cfg.ehSenha;

      if (labelsComercial[chave]) {
        const div = document.createElement('div');
        const fmt = chave === 'MIN_MARKUP' ? 'decimal' : 'moeda';
        const valorFmt = fmt === 'decimal' ? formatarDecimalBR(valor, 1) : formatarMoedaBR(valor);
        div.innerHTML = `
          <label class="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">${labelsComercial[chave]}</label>
          <input type="text" inputmode="decimal" data-format="${fmt}" data-chave="${chave}" data-secao="comercial" value="${valorFmt}"
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm">
        `;
        formComercial.appendChild(div);
      } else if (labelsAcesso[chave]) {
        const div = document.createElement('div');
        const inputType = chave === 'EMAIL_GERENTE' ? 'email' : 'password';
        const placeholder = ehSenha ? 'Deixe vazio para não alterar' : '';
        const toggleBtn = ehSenha ? `<button type="button" onclick="toggleSenhaVisivel(this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"><i class="fa-solid fa-eye"></i></button>` : '';
        div.innerHTML = `
          <label class="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">${labelsAcesso[chave]}</label>
          <div class="relative">
            <input type="${inputType}" data-chave="${chave}" data-secao="acesso" data-eh-senha="${ehSenha}" value="${valor}" placeholder="${placeholder}"
              class="block w-full px-3 py-2 ${ehSenha ? 'pr-10' : ''} bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-rose-500 text-sm">
            ${toggleBtn}
          </div>
        `;
        formAcesso.appendChild(div);
      }
    });

    // Instala os eventos de formatação nos inputs recém-gerados da seção comercial
    instalarFormatacaoInputs('form-config-parametros');

  } catch (err) {
    loaderComercial.classList.add('hidden');
    loaderAcesso.classList.add('hidden');
    formComercial.innerHTML = `<div class="text-rose-500 text-xs text-center py-4 md:col-span-2">Erro: ${err.message}</div>`;
  }
}

function toggleSenhaVisivel(btn) {
  const input = btn.parentElement.querySelector('input');
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
}

async function salvarConfigComercial() {
  const form = document.getElementById('form-config-parametros');
  const inputs = form.querySelectorAll('input[data-secao="comercial"]');
  let erros = 0;
  for (let input of inputs) {
    const chave = input.getAttribute('data-chave');
    const valor = String(parseBR(input.value));
    try {
      const res = await apiPost('atualizarConfigParam', { chave, valor });
      if (!res.sucesso) { erros++; console.error('Falha ao salvar ' + chave + ': ' + res.erro); }
    } catch (err) { erros++; }
  }
  if (erros === 0) {
    alert('Parâmetros comerciais gravados com sucesso!');
    carregarParametrosConfigForm();
  } else {
    alert('Alguns parâmetros não puderam ser gravados. Verifique o console.');
  }
}

async function salvarConfigAcesso() {
  const form = document.getElementById('form-config-acesso');
  const inputs = form.querySelectorAll('input[data-secao="acesso"]');
  let erros = 0;
  let salvou = 0;
  for (let input of inputs) {
    const chave = input.getAttribute('data-chave');
    const ehSenha = input.getAttribute('data-eh-senha') === 'true';
    const valor = input.value.trim();
    // Se é senha e o campo está vazio, não altera
    if (ehSenha && !valor) continue;
    try {
      const res = await apiPost('atualizarConfigParam', { chave, valor });
      if (!res.sucesso) { erros++; console.error('Falha ao salvar ' + chave + ': ' + res.erro); }
      else { salvou++; }
    } catch (err) { erros++; }
  }
  if (erros === 0) {
    alert(salvou === 0 ? 'Nenhuma alteração detectada (senhas em branco).' : 'Configurações de acesso gravadas com sucesso!');
    carregarParametrosConfigForm();
  } else {
    alert('Alguns dados não puderam ser gravados. Verifique o console.');
  }
}

// Função legada mantida para compatibilidade
async function salvarConfigParametros(e) {
  if (e) e.preventDefault();
  await salvarConfigComercial();
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

// ==========================================
// MODAL DE EDIÇÃO DE SOLICITAÇÃO (F1)
// ==========================================

let _idEmEdicao = null;

// ---- Utilitários de formatação BR ----

/**
 * Formata número como moeda BR: 4999.99 → "R$ 4.999,99"
 */
function formatarMoedaBR(valor) {
  const num = parseFloat(String(valor).replace(',', '.')) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata número como decimal BR: 7.2 → "7,2"
 */
function formatarDecimalBR(valor, casas = 1) {
  const num = parseFloat(String(valor).replace(',', '.')) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: 2 });
}

/**
 * Converte string BR para número: "R$ 4.999,99" → 4999.99 | "7,2" → 7.2
 */
function parseBR(str) {
  if (!str) return 0;
  // Remove símbolo de moeda, espaços e pontos de milhar; substitui vírgula decimal
  const limpo = String(str).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
}

/**
 * Instala eventos de formatação automática nos inputs com data-format dentro de um container
 */
function instalarFormatacaoInputs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const inputs = container.querySelectorAll('input[data-format]');

  inputs.forEach(input => {
    // Ao focar: mostra o valor numérico cru para edição (vírgula como decimal)
    input.addEventListener('focus', function () {
      const raw = parseBR(this.value);
      if (raw !== 0) {
        this.value = String(raw).replace('.', ',');
      } else {
        this.value = '';
      }
      this.select();
    });

    // Ao sair: aplica formatação de exibição
    input.addEventListener('blur', function () {
      if (!this.value.trim()) return;
      const raw = parseBR(this.value);
      const fmt = this.getAttribute('data-format');
      if (fmt === 'moeda') {
        this.value = formatarMoedaBR(raw);
      } else if (fmt === 'decimal') {
        this.value = formatarDecimalBR(raw);
      }
    });

    // Permite apenas dígitos, vírgula e ponto durante digitação
    input.addEventListener('keypress', function (e) {
      if (!/[\d,.]/.test(e.key)) e.preventDefault();
    });
  });
}

// Instala os listeners quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  instalarFormatacaoInputs('modal-edicao-solicitacao');
});

function abrirModalEdicao(id) {
  const sol = listaSolicitacoesGerenciais.find(s => s.id === id);
  if (!sol) { alert('Solicitação não encontrada na lista atual.'); return; }

  _idEmEdicao = id;
  document.getElementById('modal-edicao-titulo').innerText = `Editando: ${id} — ${sol.razaoSocial || ''}`;

  // Planejamento
  document.getElementById('edit-vendedor').value = sol.vendedor || '';
  document.getElementById('edit-tecnico').value = sol.tecnico || '';
  document.getElementById('edit-dataTrabalho').value = sol.dataTrabalho || '';

  // Cliente
  document.getElementById('edit-codCliente').value = sol.codCliente || '';
  document.getElementById('edit-razaoSocial').value = sol.razaoSocial || '';
  document.getElementById('edit-nomeFantasia').value = sol.nomeFantasia || '';
  document.getElementById('edit-cidade').value = sol.cidade || '';
  document.getElementById('edit-endereco').value = sol.endereco || '';
  document.getElementById('edit-bairro').value = sol.bairro || '';
  document.getElementById('edit-numero').value = sol.numero || '';
  document.getElementById('edit-cep').value = sol.cep || '';

  // Escopo
  document.getElementById('edit-profissional').value = sol.profissional || 'TECNICO';
  document.getElementById('edit-tipoServico').value = sol.tipoServico || 'Panificação';
  document.getElementById('edit-formaExecucao').value = sol.formaExecucao || 'PADRAO';
  document.getElementById('edit-detalhes').value = sol.detalhes || '';

  // Valores — formatados em BR ao abrir
  document.getElementById('edit-valorPedido').value  = formatarMoedaBR(sol.valorPedido || 0);
  document.getElementById('edit-indicePedido').value = formatarDecimalBR(sol.indicePedido || 0, 1);
  document.getElementById('edit-numeroPedido').value = sol.numeroPedido || '';
  document.getElementById('edit-kmDistancia').value  = formatarDecimalBR(sol.kmDistancia || 0, 1);
  document.getElementById('edit-custoFlex').value    = formatarMoedaBR(sol.custoFlex || 0);

  // Status
  document.getElementById('edit-status').value = sol.status || 'Pendente Aprovacao Gerencial';

  document.getElementById('modal-edicao-solicitacao').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function fecharModalEdicao() {
  document.getElementById('modal-edicao-solicitacao').classList.add('hidden');
  document.body.style.overflow = '';
  _idEmEdicao = null;
}

async function salvarEdicaoSolicitacao() {
  if (!_idEmEdicao) return;

  const btn = document.getElementById('btn-salvar-edicao');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Salvando...`;

  // Parse dos campos com formatação BR de volta para números
  const campos = {
    vendedor:      document.getElementById('edit-vendedor').value.trim(),
    tecnico:       document.getElementById('edit-tecnico').value.trim(),
    dataTrabalho:  document.getElementById('edit-dataTrabalho').value,
    codCliente:    document.getElementById('edit-codCliente').value.trim(),
    razaoSocial:   document.getElementById('edit-razaoSocial').value.trim(),
    nomeFantasia:  document.getElementById('edit-nomeFantasia').value.trim(),
    cidade:        document.getElementById('edit-cidade').value.trim(),
    endereco:      document.getElementById('edit-endereco').value.trim(),
    bairro:        document.getElementById('edit-bairro').value.trim(),
    numero:        document.getElementById('edit-numero').value.trim(),
    cep:           document.getElementById('edit-cep').value.trim(),
    profissional:  document.getElementById('edit-profissional').value,
    tipoServico:   document.getElementById('edit-tipoServico').value,
    formaExecucao: document.getElementById('edit-formaExecucao').value,
    detalhes:      document.getElementById('edit-detalhes').value.trim(),
    // Numéricos: parseia o formato BR de volta ao número
    valorPedido:   parseBR(document.getElementById('edit-valorPedido').value),
    indicePedido:  parseBR(document.getElementById('edit-indicePedido').value),
    numeroPedido:  document.getElementById('edit-numeroPedido').value.trim(),
    kmDistancia:   parseBR(document.getElementById('edit-kmDistancia').value),
    custoFlex:     parseBR(document.getElementById('edit-custoFlex').value),
    status:        document.getElementById('edit-status').value
  };

  try {
    const res = await apiPost('editarSolicitacao', { id: _idEmEdicao, campos });
    if (res.sucesso) {
      fecharModalEdicao();
      await recarregarDadosOperacionais();
    } else {
      alert('Erro ao salvar: ' + res.erro);
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações`;
    }
  } catch (err) {
    alert('Falha de rede: ' + err.message);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações`;
  }
}

/**
 * Calcula a distância logístico-terrestre diretamente na tela de gestão
 */
async function calcularKmMensuracaoEdicao() {
  const tecnico = document.getElementById('edit-tecnico').value;
  const cep = document.getElementById('edit-cep').value;
  const numero = document.getElementById('edit-numero').value.trim();
  const cidade = document.getElementById('edit-cidade').value.trim();
  const endereco = document.getElementById('edit-endereco').value.trim();
  const bairro = document.getElementById('edit-bairro').value.trim();
  const kmInput = document.getElementById('edit-kmDistancia');

  if (!tecnico) {
    alert("Selecione um profissional para o cálculo.");
    return;
  }
  if (!cidade && !cep && !endereco) {
    alert("Informe ao menos o Endereço, CEP ou Cidade do cliente para calcular.");
    return;
  }

  const valorOriginal = kmInput.value;
  kmInput.value = "Calc...";

  try {
    const km = await apiPost('calcularDistancia', {
      tecnico: tecnico,
      cep: cep,
      numero: numero,
      cidade: cidade,
      endereco: endereco,
      bairro: bairro
    });
    
    if (km !== null && km !== undefined) {
      kmInput.value = formatarDecimalBR(parseFloat(km) || 0, 1);
    } else {
      throw new Error("Retorno de quilometragem inválido.");
    }
  } catch (err) {
    alert("Erro ao calcular distância: " + err.message);
    kmInput.value = valorOriginal;
  }
}
