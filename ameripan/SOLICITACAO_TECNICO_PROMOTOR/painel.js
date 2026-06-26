/**
 * PORTAL DE SOLUÇÕES DE CAMPO - AMERIPAN
 * Arquivo: painel.js (Frontend - Painel Gerencial)
 */

// Controle de estado de autenticação gerencial
const statusPainelGerente = {
  logado: false,
  senhaAtiva: ""
};

// Base completa de registros baixada do servidor
let listaSolicitacoesGerenciais = [];

/**
 * Tenta fazer login na área gerencial
 */
async function tentarLoginGerencia() {
  const senhaInput = document.getElementById('gerencia-senha');
  const senha = senhaInput.value.trim();

  if (!senha) {
    alert("Por favor, informe a senha.");
    return;
  }

  try {
    const autenticado = await apiPost('autenticar', { senha: senha });
    if (autenticado) {
      statusPainelGerente.logado = true;
      statusPainelGerente.senhaAtiva = senha;

      // Transição de tela
      document.getElementById('gerencia-login-box').classList.add('hidden');
      document.getElementById('gerencia-painel-box').classList.remove('hidden');

      carregarDadosGerencia();
    } else {
      alert("Senha incorreta! Tente novamente.");
      senhaInput.value = "";
    }
  } catch (err) {
    alert("Erro na autenticação: " + err.message);
  }
}

/**
 * Realiza o bloqueio/logout do painel
 */
function logoutGerencia() {
  statusPainelGerente.logado = false;
  statusPainelGerente.senhaAtiva = "";
  listaSolicitacoesGerenciais = [];
  document.getElementById('gerencia-senha').value = "";

  document.getElementById('gerencia-painel-box').classList.add('hidden');
  document.getElementById('gerencia-login-box').classList.remove('hidden');
}

/**
 * Carrega os dados consolidados do servidor
 */
async function carregarDadosGerencia() {
  document.getElementById('gerencia-loader').classList.remove('hidden');
  document.getElementById('gerencia-tabela-corpo').innerHTML = "";
  document.getElementById('gerencia-tabela-vazia').classList.add('hidden');

  try {
    const response = await apiPost('getDadosPainel', { senha: statusPainelGerente.senhaAtiva });
    document.getElementById('gerencia-loader').classList.add('hidden');
    
    listaSolicitacoesGerenciais = response.solicitacoes;
    
    // Atualiza as métricas nos cards (RF08)
    document.getElementById('metric-total').innerText = response.metrics.total;
    document.getElementById('metric-pendentes').innerText = response.metrics.pendentes;
    document.getElementById('metric-custo-flex').innerText = "R$ " + response.metrics.custoFlex.toFixed(2);
    document.getElementById('metric-km').innerText = response.metrics.km.toFixed(1) + " KM";

    filtrarDadosTabela();
  } catch (err) {
    document.getElementById('gerencia-loader').classList.add('hidden');
    alert("Erro ao ler dados operacionais: " + err.message);
  }
}

/**
 * Executa filtros dinâmicos locais na tabela de exibição
 */
function filtrarDadosTabela() {
  const profFiltro = document.getElementById('filter-tecnico').value;
  const statusFiltro = document.getElementById('filter-status').value;
  const corpo = document.getElementById('gerencia-tabela-corpo');
  
  corpo.innerHTML = "";
  
  const filtradas = listaSolicitacoesGerenciais.filter(s => {
    const matchProf = (profFiltro === "TODOS" || s.tecnico.toUpperCase() === profFiltro.toUpperCase());
    const matchStatus = (statusFiltro === "TODOS" || s.status === statusFiltro);
    return matchProf && matchStatus;
  });

  if (filtradas.length === 0) {
    document.getElementById('gerencia-tabela-vazia').classList.remove('hidden');
    return;
  }
  
  document.getElementById('gerencia-tabela-vazia').classList.add('hidden');

  filtradas.forEach(s => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-900/40 transition-colors duration-200 border-b border-slate-900";
    
    // Formata data de exibição
    let dataTrabFormatted = s.dataTrabalho;
    if (s.dataTrabalho) {
      const parts = s.dataTrabalho.split('-');
      if (parts.length === 3) {
        dataTrabFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    // Estilo de badge de status
    let badgeStyle = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
    if (s.status === "Aprovado") {
      badgeStyle = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
    }

    // Constrói linha com botões de ação gerenciais
    let botoesAcao = `
      <button onclick="carregarVisualizacaoFicha('${s.id}')" title="Visualizar/Imprimir" class="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-lg border border-slate-700 transition-colors">
        <i class="fa-solid fa-print"></i>
      </button>
      <button onclick="deletarAgendamentoGerencia('${s.id}')" title="Deletar" class="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white p-1.5 rounded-lg border border-rose-500/20 transition-all">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    if (s.status === "Pendente Pedido") {
      botoesAcao = `
        <button onclick="forcarAprovacaoGerencia('${s.id}')" title="Aprovar Manualmente" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 rounded-lg transition-colors text-[10px] font-semibold tracking-wider">
          APROVAR
        </button>
        ${botoesAcao}
      `;
    }

    tr.innerHTML = `
      <td class="px-6 py-4 font-bold text-brand-gold font-outfit">${s.id}</td>
      <td class="px-6 py-4 text-white font-medium">${s.vendedor}</td>
      <td class="px-6 py-4">${s.tecnico} <span class="text-[10px] text-slate-500 block">${s.tipoServico} - ${s.profissional}</span></td>
      <td class="px-6 py-4 font-medium">${dataTrabFormatted}</td>
      <td class="px-6 py-4 truncate max-w-[200px]">${s.razaoSocial} <span class="text-[10px] text-slate-500 block">${s.cidade}</span></td>
      <td class="px-6 py-4">R$ ${parseFloat(s.valorPedido).toLocaleString('pt-BR', {minimumFractionDigits: 2})} <span class="text-[10px] text-slate-500 block">Markup: ${parseFloat(s.indicePedido).toFixed(1)}</span></td>
      <td class="px-6 py-4 font-mono font-medium text-white">${s.numeroPedido || '<span class="text-slate-600">Aguardando</span>'}</td>
      <td class="px-6 py-4">${s.kmDistancia} km <span class="text-[10px] text-slate-500 block">Flex: R$ ${s.custoFlex.toFixed(2)}</span></td>
      <td class="px-6 py-4">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeStyle}">
          ${s.status}
        </span>
      </td>
      <td class="px-6 py-4">
        <div class="flex items-center justify-center gap-2">
          ${botoesAcao}
        </div>
      </td>
    `;

    corpo.appendChild(tr);
  });
}

/**
 * Força a aprovação do agendamento (supervisor bypass)
 */
async function forcarAprovacaoGerencia(id) {
  if (!confirm("Confirmar aprovação forçada desta solicitação? O status passará a Aprovado independente do pedido faturado.")) {
    return;
  }

  try {
    const res = await apiPost('aprovar', { senha: statusPainelGerente.senhaAtiva, id: id });
    if (res.sucesso) {
      alert("Solicitação aprovada com sucesso pela gerência.");
      carregarDadosGerencia();
    } else {
      alert("Erro: " + res.erro);
    }
  } catch (err) {
    alert("Erro ao processar aprovação: " + err.message);
  }
}

/**
 * Exclui logicamente a solicitação
 */
async function deletarAgendamentoGerencia(id) {
  if (!confirm("ATENÇÃO: Deseja realmente excluir este agendamento do sistema? Esta operação é irreversível.")) {
    return;
  }

  try {
    const res = await apiPost('deletar', { senha: statusPainelGerente.senhaAtiva, id: id });
    if (res.sucesso) {
      alert("Registro deletado com sucesso.");
      carregarDadosGerencia();
    } else {
      alert("Erro: " + res.erro);
    }
  } catch (err) {
    alert("Erro ao deletar: " + err.message);
  }
}

/**
 * Exporta a base ativa para arquivo CSV (RF08)
 */
async function exportarBaseDadosCsv() {
  try {
    const res = await apiPost('exportarCSV', { senha: statusPainelGerente.senhaAtiva });
    if (res.sucesso) {
      const csvContent = res.csv;
      // Cria link invisível de download do navegador
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `AMERIPAN_SOLICITACOES_CAMPO_${new Date().getFullYear()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Erro na exportação: " + res.erro);
    }
  } catch (err) {
    alert("Erro na exportação: " + err.message);
  }
}

/**
 * Redireciona a visualização da ficha para a aba de Consulta rápida e ativa o card
 */
function carregarVisualizacaoFicha(id) {
  document.getElementById('search-id-input').value = id;
  switchTab('rastrear');
  buscarSolicitacaoPorId();
}
