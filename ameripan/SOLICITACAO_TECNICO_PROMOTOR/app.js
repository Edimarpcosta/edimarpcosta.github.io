/**
 * PORTAL DE SOLUÇÕES DE CAMPO - AMERIPAN
 * Arquivo: app.js (Frontend - Hub Central & Rastreio)
 */

const API_URL = "https://script.google.com/macros/s/AKfycbyf3Sv32fARyRQpFfysNt47TIaxYGmWucZuA0nr1EHgKLbAKvEFztB-d4CEwx7vqqz63A/exec";

// Armazena temporariamente a solicitação ativa pesquisada
let solicitacaoPesquisadaAtiva = null;

/**
 * Realiza requisições HTTP GET para a API do Google Apps Script.
 */
async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.append('action', action);
  
  // Adiciona a senha do portal se estiver salva no localStorage
  const portalSenha = localStorage.getItem('portal_senha_acesso');
  if (portalSenha) {
    url.searchParams.append('portalSenha', portalSenha);
  }
  
  for (const key in params) {
    url.searchParams.append(key, params[key]);
  }

  const response = await fetch(url.toString(), {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Erro na requisição GET: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Realiza requisições HTTP POST para a API do Google Apps Script.
 * Usa Content-Type text/plain para evitar preflight OPTIONS de CORS.
 */
async function apiPost(action, payload = {}) {
  const portalSenha = localStorage.getItem('portal_senha_acesso');
  const body = {
    action: action,
    payload: {
      portalSenha: portalSenha,
      ...payload
    }
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Erro na requisição POST: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Alternância entre as abas do Web App
 */
function switchTab(tabId) {
  // Esconde todos os containers
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.add('hidden');
    section.classList.remove('translate-y-0', 'opacity-100');
    section.classList.add('translate-y-4', 'opacity-0');
  });

  // Remove estilos ativos de todos os botões da navbar
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-gradient-to-r', 'from-brand-500', 'to-brand-gold', 'text-white', 'shadow-md');
    btn.classList.add('text-slate-400', 'hover:text-white');
  });

  // Mostra a aba selecionada
  const activeSection = document.getElementById('section-' + tabId);
  activeSection.classList.remove('hidden');
  
  // Delay pequeno para animação de slide-up suave
  setTimeout(() => {
    activeSection.classList.remove('translate-y-4', 'opacity-0');
    activeSection.classList.add('translate-y-0', 'opacity-100');
  }, 50);

  // Ativa o botão da aba selecionada
  const activeBtn = document.getElementById('tab-' + tabId);
  activeBtn.classList.remove('text-slate-400', 'hover:text-white');
  activeBtn.classList.add('bg-gradient-to-r', 'from-brand-500', 'to-brand-gold', 'text-white', 'shadow-md');

  // Se for a aba da gerência e já estiver logado, atualiza dados
  if (tabId === 'gerencia' && typeof statusPainelGerente !== 'undefined' && statusPainelGerente.logado) {
    carregarDadosGerencia();
  }
}

/**
 * Busca um agendamento no banco de dados via ID
 */
async function buscarSolicitacaoPorId() {
  const idInput = document.getElementById('search-id-input').value.trim();
  const card = document.getElementById('search-result-card');
  const loader = document.getElementById('search-loader');
  
  if (!idInput) {
    alert("Por favor, digite o ID da solicitação.");
    return;
  }

  card.classList.add('hidden');
  loader.classList.remove('hidden');

  try {
    const resultado = await apiGet('obterSolicitacao', { id: idInput });
    loader.classList.add('hidden');
    
    if (!resultado) {
      alert("Nenhuma solicitação encontrada com o ID informado.");
      return;
    }

    solicitacaoPesquisadaAtiva = resultado;
    preencherDadosBuscaCard(resultado);
    card.classList.remove('hidden');
  } catch (err) {
    loader.classList.add('hidden');
    alert("Erro na consulta: " + err.message);
  }
}

/**
 * Preenche os elementos do card de resultado da pesquisa
 */
function preencherDadosBuscaCard(sol) {
  document.getElementById('res-id').innerText = sol.id;
  
  // Formata a data de criação
  let dataCriacaoFormatted = "--/--/----";
  if (sol.dataCriacao) {
    const d = new Date(sol.dataCriacao);
    if (!isNaN(d.getTime())) {
      dataCriacaoFormatted = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  }
  document.getElementById('res-data-criacao').innerText = "Criado em: " + dataCriacaoFormatted;
  
  // Define badge de status
  const badge = document.getElementById('res-status-badge');
  badge.innerText = sol.status;
  badge.className = "px-3 py-1 rounded-full text-xs font-semibold border";
  
  if (sol.status === "Aprovado") {
    badge.classList.add('bg-emerald-500/10', 'text-emerald-500', 'border-emerald-500/20');
  } else if (sol.status === "Pendente Pedido") {
    badge.classList.add('bg-amber-500/10', 'text-amber-500', 'border-amber-500/20');
  } else {
    badge.classList.add('bg-rose-500/10', 'text-rose-500', 'border-rose-500/20');
  }

  // Preenche os dados
  document.getElementById('res-vendedor').innerText = sol.vendedor;
  document.getElementById('res-tecnico').innerText = sol.tecnico;
  
  // Formata a data do trabalho
  let dataTrabFormatted = sol.dataTrabalho;
  if (sol.dataTrabalho) {
    const parts = sol.dataTrabalho.split('-');
    if (parts.length === 3) {
      dataTrabFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  document.getElementById('res-data-trab').innerText = dataTrabFormatted;
  document.getElementById('res-cidade').innerText = sol.cidade;
  document.getElementById('res-cliente').innerText = `[${sol.codCliente}] ${sol.razaoSocial} (${sol.nomeFantasia})`;
  document.getElementById('res-servico').innerText = `${sol.tipoServico} - ${sol.profissional}`;
  document.getElementById('res-execucao').innerText = sol.formaExecucao === 'FLEX' ? '100% Flex (Exceção)' : 'Presencial Geral';
  document.getElementById('res-distancia').innerText = sol.kmDistancia + " km";
  document.getElementById('res-custo').innerText = "R$ " + parseFloat(sol.custoFlex).toFixed(2);

  // Caixa de preenchimento do pedido
  const inputPedido = document.getElementById('pedido-vinculo-input');
  inputPedido.value = sol.numeroPedido || '';
}

/**
 * Salva o número do pedido de faturamento
 */
async function salvarVinculoPedido() {
  const numPedido = document.getElementById('pedido-vinculo-input').value.trim();
  
  if (!numPedido) {
    alert("Por favor, digite o número do pedido faturado.");
    return;
  }

  if (!solicitacaoPesquisadaAtiva) {
    alert("Nenhum registro selecionado.");
    return;
  }

  try {
    const res = await apiPost('atualizarPedido', { id: solicitacaoPesquisadaAtiva.id, numeroPedido: numPedido });
    if (res.sucesso) {
      alert("Faturamento associado com sucesso! Status do agendamento atualizado.");
      // Atualiza o card de busca
      buscarSolicitacaoPorId();
    } else {
      alert("Erro: " + res.erro);
    }
  } catch (err) {
    alert("Falha de rede ao salvar pedido: " + err.message);
  }
}

/**
 * Imprime a Ficha de Controle Técnica otimizada para PDF (RF07)
 */
function imprimirFichaAtendimento() {
  if (!solicitacaoPesquisadaAtiva) {
    alert("Consulte um agendamento válido antes de imprimir.");
    return;
  }

  const sol = solicitacaoPesquisadaAtiva;
  let dataTrabFormatted = sol.dataTrabalho;
  if (sol.dataTrabalho) {
    const parts = sol.dataTrabalho.split('-');
    if (parts.length === 3) {
      dataTrabFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  // Preenche a área de impressão com layout de ficha formal
  const printArea = document.getElementById('print-area');
  printArea.innerHTML = `
    <div style="border-bottom: 3px double #1e3a8a; padding-bottom: 12px; margin-bottom: 20px;" class="flex justify-between items-center">
      <div>
        <h1 style="font-size: 22px; font-weight: bold; margin: 0; color: #1e3a8a;">AMERIPAN ALIMENTOS</h1>
        <p style="font-size: 11px; color: #555; margin: 2px 0 0 0;">Relatório de Execução Técnica & Promotoria de Campo</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 18px; font-weight: bold; color: #b45309;">ID: ${sol.id}</span>
        <p style="font-size: 10px; color: #777; margin: 2px 0 0 0;">Status: <strong>${sol.status}</strong></p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold; width: 25%;">Vendedor Requisitante:</td>
        <td style="padding: 6px; border: 1px solid #ddd; width: 25%;">${sol.vendedor}</td>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold; width: 25%;">Profissional Alocado:</td>
        <td style="padding: 6px; border: 1px solid #ddd; width: 25%;">${sol.tecnico}</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Data do Atendimento:</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${dataTrabFormatted}</td>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Cidade:</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${sol.cidade}</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Cliente:</td>
        <td colspan="3" style="padding: 6px; border: 1px solid #ddd;">[${sol.codCliente}] ${sol.razaoSocial}</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Nome Fantasia:</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${sol.nomeFantasia}</td>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">CEP / Logradouro:</td>
        <td style="padding: 6px; border: 1px solid #ddd;">CEP ${sol.cep}, Nº ${sol.numero}</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Profissional / Tipo:</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${sol.profissional} (${sol.tipoServico})</td>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Forma Execução:</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${sol.formaExecucao}</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Faturamento Pedido ERP:</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${sol.numeroPedido || 'NÃO VINCULADO'}</td>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Valor / Markup Venda:</td>
        <td style="padding: 6px; border: 1px solid #ddd;">R$ ${parseFloat(sol.valorPedido).toLocaleString('pt-BR', {minimumFractionDigits: 2})} / M.U. ${parseFloat(sol.indicePedido).toFixed(1)}</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Distância da Rota:</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${sol.kmDistancia} KM (Cálculo Terrestre Real)</td>
        <td style="padding: 6px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Custo Flex Alocado:</td>
        <td style="padding: 6px; border: 1px solid #ddd;">R$ ${parseFloat(sol.custoFlex).toFixed(2)}</td>
      </tr>
    </table>

    <div style="margin-bottom: 20px; font-size: 13px;">
      <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 6px; color: #1e3a8a;">Detalhes da Execução Técnica</h3>
      <p style="white-space: pre-wrap; background-color: #fafafa; padding: 10px; border: 1px solid #eee; border-radius: 4px; font-family: monospace;">${sol.detalhes || 'Sem detalhes específicos cadastrados.'}</p>
    </div>

    <div style="margin-top: 60px; font-size: 13px;" class="flex justify-between gap-12">
      <div style="flex: 1; text-align: center;">
        <div style="border-top: 1px solid #333; margin-bottom: 4px;"></div>
        <p style="margin: 0; font-weight: bold;">${sol.vendedor}</p>
        <p style="margin: 0; font-size: 10px; color: #666;">Assinatura do Vendedor</p>
      </div>
      <div style="flex: 1; text-align: center;">
        <div style="border-top: 1px solid #333; margin-bottom: 4px;"></div>
        <p style="margin: 0; font-weight: bold;">Supervisão de Campo</p>
        <p style="margin: 0; font-size: 10px; color: #666;">Assinatura do Gerente Aprovador</p>
      </div>
    </div>

    <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #888;">
      Emitido automaticamente pelo Portal de Soluções de Campo Ameripan.
    </div>
  `;

  // Executa a impressão
  window.print();
}

// Função global para prevenir envio padrão do formulário de login do portal
function prevenirEnvioPortalLogin(e) {
  e.preventDefault();
  tentarLoginPortal();
}

/**
 * Verifica se a senha salva no localStorage é válida.
 */
async function verificarAutenticacaoPortal() {
  const senhaSalva = localStorage.getItem('portal_senha_acesso');
  if (!senhaSalva) {
    return false;
  }
  try {
    const res = await apiPost('verificarSenhaPortal', { senha: senhaSalva });
    return res.sucesso === true;
  } catch (err) {
    console.error("Erro ao verificar autenticação do portal:", err);
    return false;
  }
}

/**
 * Tenta realizar o login no portal com a senha inserida
 */
async function tentarLoginPortal() {
  const input = document.getElementById('portal-senha-input');
  const btn = document.getElementById('portal-login-btn');
  const erro = document.getElementById('portal-login-erro');
  const senha = input.value.trim();
  
  if (!senha) return;
  
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Verificando...`;
  erro.classList.add('hidden');
  
  try {
    const response = await apiPost('verificarSenhaPortal', { senha: senha });
    if (response.sucesso) {
      localStorage.setItem('portal_senha_acesso', senha);
      document.getElementById('portal-lock-overlay').classList.add('hidden');
      
      // Ao autenticar com sucesso, inicializa os parâmetros comerciais dinâmicos
      if (typeof carregarParametrosComerciais === 'function') {
        carregarParametrosComerciais();
      }
      // E reinicia carregamento de clientes
      if (typeof obterClientesOuTermoVazio === 'function') {
        obterClientesOuTermoVazio();
      }
    } else {
      erro.innerText = "Senha incorreta! Tente novamente.";
      erro.classList.remove('hidden');
      input.value = "";
      input.focus();
    }
  } catch (err) {
    erro.innerText = "Erro ao conectar com o servidor: " + err.message;
    erro.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-lock-open"></i> Desbloquear Portal`;
  }
}

/**
 * Inicializa o portal verificando credenciais
 */
async function iniciarPortalSeguranca() {
  const overlay = document.getElementById('portal-lock-overlay');
  
  // Verifica se já está autenticado
  const autenticado = await verificarAutenticacaoPortal();
  if (autenticado) {
    overlay.classList.add('hidden');
    // Carrega parâmetros
    if (typeof carregarParametrosComerciais === 'function') {
      carregarParametrosComerciais();
    }
  } else {
    overlay.classList.remove('hidden');
    localStorage.removeItem('portal_senha_acesso');
  }
}

// Executa o fluxo de autenticação ao carregar o DOM
document.addEventListener('DOMContentLoaded', iniciarPortalSeguranca);
