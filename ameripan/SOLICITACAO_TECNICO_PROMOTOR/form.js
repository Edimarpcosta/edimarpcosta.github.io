/**
 * PORTAL DE SOLUÇÕES DE CAMPO - AMERIPAN
 * Arquivo: form.js (Frontend - Formulário)
 */

// Variáveis para autocomplete e validação local
let listaClientesGlobal = [];
let clienteSelecionado = null;
let kmLogisticoCalculado = null;

// Parâmetros comerciais globais dinâmicos (carregados da aba CONFIG)
let regrasComerciaisAtivas = {
  MIN_PEDIDO_PROMOTOR: 3000.00,
  MIN_PEDIDO_TECNICO: 5000.00,
  MIN_MARKUP: 6.0,
  CUSTO_FLEX_PADRAO_PROMOTOR: 100.00,
  CUSTO_FLEX_PADRAO_TECNICO: 150.00,
  CUSTO_FLEX_100_PROMOTOR: 300.00,
  CUSTO_FLEX_100_TECNICO: 450.00
};

/**
 * Carrega os parâmetros de regras comerciais do banco de dados na planilha e atualiza as descrições/tabelas da interface.
 */
async function carregarParametrosComerciais() {
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
      
      // Atualiza o painel visual de regras abaixo do botão no Index.html
      atualizarPainelVisualRegras();
      
      // Atualiza o badge e auto-crítica com base nos novos valores
      lidarMudancaFiltrosComerciais();
    }
  } catch (err) {
    console.error("Erro ao carregar parâmetros comerciais dinâmicos:", err);
  }
}

/**
 * Renderiza dinamicamente as regras comerciais no painel abaixo do botão de gravação
 */
function atualizarPainelVisualRegras() {
  const pMin = document.getElementById('regra-promotor-min');
  const pMarkup = document.getElementById('regra-promotor-markup');
  const pFlex = document.getElementById('regra-promotor-flex');
  const pFlex100 = document.getElementById('regra-promotor-flex100');
  
  const tMin = document.getElementById('regra-tecnico-min');
  const tMarkup = document.getElementById('regra-tecnico-markup');
  const tFlex = document.getElementById('regra-tecnico-flex');
  const tFlex100 = document.getElementById('regra-tecnico-flex100');

  if (pMin) pMin.innerText = "R$ " + regrasComerciaisAtivas.MIN_PEDIDO_PROMOTOR.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (pMarkup) pMarkup.innerText = regrasComerciaisAtivas.MIN_MARKUP.toFixed(1);
  if (pFlex) pFlex.innerText = "R$ " + regrasComerciaisAtivas.CUSTO_FLEX_PADRAO_PROMOTOR.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (pFlex100) pFlex100.innerText = "R$ " + regrasComerciaisAtivas.CUSTO_FLEX_100_PROMOTOR.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  
  if (tMin) tMin.innerText = "R$ " + regrasComerciaisAtivas.MIN_PEDIDO_TECNICO.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (tMarkup) tMarkup.innerText = regrasComerciaisAtivas.MIN_MARKUP.toFixed(1);
  if (tFlex) tFlex.innerText = "R$ " + regrasComerciaisAtivas.CUSTO_FLEX_PADRAO_TECNICO.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (tFlex100) tFlex100.innerText = "R$ " + regrasComerciaisAtivas.CUSTO_FLEX_100_TECNICO.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

// Escopo regional ilimitado para a empresa

/**
 * Previne envio padrão de formulário html
 */
function prevenirEnvioPadrao(e) {
  e.preventDefault();
  gravarSolicitacaoFinal();
}

/**
 * Carrega inicialmente os clientes para autocomplete ao iniciar a página se autenticado
 */
document.addEventListener('DOMContentLoaded', function() {
  if (localStorage.getItem('portal_senha_acesso')) {
    carregarParametrosComerciais();
    obterClientesOuTermoVazio();
  }

  // Listener para buscar cliente ao pressionar Enter no código ERP
  const codInput = document.getElementById('codCliente');
  if (codInput) {
    codInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        buscarClientePorCodigoManual();
      }
    });
  }
});

let searchDebounceTimer;

/**
 * Busca inicial dos clientes ou termo vazio para testar e conectar à base de dados.
 */
async function obterClientesOuTermoVazio() {
  const status = document.getElementById('clientes-status');
  try {
    const clientes = await apiGet('buscarClientes', { q: "" });
    listaClientesGlobal = clientes;
    if (status) {
      status.innerText = "(Base de dados conectada)";
      status.className = "text-[9px] font-normal normal-case text-emerald-400 ml-2";
    }
  } catch (err) {
    console.error("Erro ao carregar clientes inicialmente: ", err);
    if (status) {
      status.innerText = "(Erro ao conectar base)";
      status.className = "text-[9px] font-normal normal-case text-rose-500 ml-2";
    }
  }
}

/**
 * Busca clientes ativamente no backend (varrendo todas as 5000+ linhas) com debounce de 300ms.
 */
async function lidarBuscaCliente() {
  const input = document.getElementById('cliente-search');
  const termo = input.value.trim();
  const dropdown = document.getElementById('autocomplete-lista');
  const status = document.getElementById('clientes-status');

  if (termo.length < 2) {
    dropdown.classList.add('hidden');
    return;
  }

  // Atualiza indicador para Busca Ativa
  if (status) {
    status.innerText = "(Buscando...)";
    status.className = "text-[9px] font-normal normal-case text-amber-500 ml-2 animate-pulse";
  }

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(async () => {
    try {
      const filtrados = await apiGet('buscarClientes', { q: termo });
      exibirDropdownClientes(filtrados);
      
      if (status) {
        if (filtrados.length === 0) {
          status.innerText = "(Nenhum cliente localizado)";
          status.className = "text-[9px] font-normal normal-case text-rose-400 ml-2";
        } else {
          status.innerText = "(Busca concluída)";
          status.className = "text-[9px] font-normal normal-case text-emerald-400 ml-2";
        }
      }
    } catch (err) {
      console.error("Erro ao buscar clientes dinamicamente: ", err);
      if (status) {
        status.innerText = "(Erro de busca)";
        status.className = "text-[9px] font-normal normal-case text-rose-500 ml-2";
      }
    }
  }, 300); // 300ms de debounce para evitar chamadas excessivas
}

/**
 * Renderiza a lista de autocomplete
 */
function exibirDropdownClientes(clientes) {
  const dropdown = document.getElementById('autocomplete-lista');
  dropdown.innerHTML = "";

  if (clientes.length === 0) {
    dropdown.innerHTML = `<li class="px-4 py-3 text-slate-500 text-center">Nenhum cliente homologado localizado</li>`;
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
    li.onclick = function() {
      selecionarCliente(c);
    };
    dropdown.appendChild(li);
  });

  dropdown.classList.remove('hidden');
}

/**
 * Executado quando o vendedor escolhe um cliente na lista
 */
function selecionarCliente(c) {
  clienteSelecionado = c;
  
  document.getElementById('cliente-search').value = c.codigo;
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
  
  // Região ilimitada - nenhuma restrição por cidade
  const cidadeAviso = document.getElementById('cidade-aviso');
  const submitBtn = document.getElementById('submit-btn');
  cidadeAviso.classList.add('hidden');
  submitBtn.disabled = false;
  submitBtn.classList.remove('cursor-not-allowed', 'opacity-50');

  // Mostra feedback do endereço cadastrado da planilha, se houver
  const info = document.getElementById('cep-info');
  if (c.endereco && info) {
    let logradouroStr = c.endereco;
    if (c.bairro) logradouroStr += `, ${c.bairro}`;
    logradouroStr += ` - ${c.cidade}`;
    info.innerText = logradouroStr;
    info.className = "text-[11px] text-emerald-400 mt-1 font-medium block";
    info.classList.remove('hidden');
  } else if (info) {
    info.classList.add('hidden');
    info.innerText = "";
  }

  // Consulta endereço do CEP caso o cliente já possua um predefinido
  lidarMudancaCep();

  limparKmCalculado();
}

/**
 * Busca manual do cliente por código ERP (quando pressionado Enter)
 */
async function buscarClientePorCodigoManual() {
  const codInput = document.getElementById('codCliente');
  const codigo = codInput.value.trim();
  
  if (!codigo) return;

  codInput.classList.add('animate-pulse');

  try {
    const cleanQuery = codigo.replace(/[\s.-]/g, "").toUpperCase();

    // 1. Procura primeiro localmente no cache global
    if (listaClientesGlobal && listaClientesGlobal.length > 0) {
      const found = listaClientesGlobal.find(c => {
        const cleanCode = c.codigo.toString().replace(/[\s.-]/g, "").toUpperCase();
        return cleanCode === cleanQuery;
      });
      if (found) {
        selecionarCliente(found);
        codInput.classList.remove('animate-pulse');
        return;
      }
    }

    // 2. Busca na API caso não esteja no cache local
    const resultados = await apiGet('buscarClientes', { q: codigo });
    const exactMatch = resultados.find(c => {
      const cleanCode = c.codigo.toString().replace(/[\s.-]/g, "").toUpperCase();
      return cleanCode === cleanQuery;
    });
    
    if (exactMatch) {
      selecionarCliente(exactMatch);
    } else {
      // Se não achar no cadastro, não bloqueia e avisa
      alert(`Cliente com código ERP "${codigo}" não foi localizado no cadastro de clientes. Você pode prosseguir e preencher os dados manualmente.`);
    }
  } catch (err) {
    console.error("Erro ao buscar cliente por código: ", err);
  } finally {
    codInput.classList.remove('animate-pulse');
  }
}

/**
 * Busca automática de dados de endereço pelo CEP usando ViaCEP API
 */
async function lidarMudancaCep() {
  const cepInput = document.getElementById('cep');
  let cep = cepInput.value.replace(/\D/g, '');
  const info = document.getElementById('cep-info');
  const cidadeInput = document.getElementById('cidade');

  if (cep.length === 8) {
    info.innerText = "Buscando CEP...";
    info.className = "text-[11px] text-slate-400 mt-1 font-medium block animate-pulse";
    info.classList.remove('hidden');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      
      if (data.erro) {
        info.innerText = "CEP não localizado.";
        info.className = "text-[11px] text-rose-500 mt-1 font-medium block";
        return;
      }
      
      // Auto-preenche a cidade
      cidadeInput.value = data.localidade.toUpperCase();
      
      // Exibe detalhes do endereço encontrado
      let logradouroStr = data.logradouro;
      if (data.bairro) logradouroStr += `, ${data.bairro}`;
      logradouroStr += ` - ${data.localidade}/${data.uf}`;
      
      info.innerText = logradouroStr;
      info.className = "text-[11px] text-emerald-400 mt-1 font-medium block";
      
      // Limpa distância calculada anterior caso o CEP tenha mudado
      limparKmCalculado();
    } catch (err) {
      info.innerText = "Erro ao buscar CEP online.";
      info.className = "text-[11px] text-rose-500 mt-1 font-medium block";
    }
  } else {
    info.classList.add('hidden');
    info.innerText = "";
  }
}

/**
 * Limpa km calculado se dados do cliente mudarem
 */
function limparKmCalculado() {
  kmLogisticoCalculado = null;
  document.getElementById('km-resultado-box').classList.add('hidden');
  document.getElementById('km-distancia-val').innerText = "0.0";
}

/**
 * Alternância de Interface Condicional para Linha de Atuação (RF02)
 */
function lidarMudancaLinhaAtuacao(opcao) {
  const boxProducao = document.getElementById('detalhes-producao-box');
  const boxApresentacao = document.getElementById('detalhes-apresentacao-box');

  if (opcao === 'Produção') {
    boxProducao.classList.remove('hidden');
    boxApresentacao.classList.add('hidden');
    document.getElementById('detalhes-apresentacao').value = "";
  } else {
    boxApresentacao.classList.remove('hidden');
    boxProducao.classList.add('hidden');
    document.getElementById('detalhes-producao').value = "";
  }
}

/**
 * Executa a lógica de Auto-Crítica Comercial (RF03)
 */
function processarAutoCritica() {
  const profissional = document.getElementById('profissional').value;
  const formaExecucao = document.getElementById('formaExecucao').value;
  const valor = parseFloat(document.getElementById('valorPedido').value) || 0;
  const markup = parseFloat(document.getElementById('indicePedido').value) || 0;
  const alerta = document.getElementById('autocritica-alerta');

  // Se for 100% Flex, as regras de pedido mínimo e markup são isentas
  if (formaExecucao === 'FLEX') {
    alerta.classList.add('hidden');
    return;
  }

  let violouRegra = false;

  if (profissional === 'PROMOTOR') {
    if (valor < regrasComerciaisAtivas.MIN_PEDIDO_PROMOTOR || markup < regrasComerciaisAtivas.MIN_MARKUP) {
      violouRegra = true;
    }
  } else if (profissional === 'TECNICO') {
    if (valor < regrasComerciaisAtivas.MIN_PEDIDO_TECNICO || markup < regrasComerciaisAtivas.MIN_MARKUP) {
      violouRegra = true;
    }
  }

  if (violouRegra) {
    alerta.classList.remove('hidden');
  } else {
    alerta.classList.add('hidden');
  }
}

/**
 * Atualiza custo flex estimado e campos ao alternar Profissional ou Cobrança
 */
function lidarMudancaFiltrosComerciais() {
  const profissional = document.getElementById('profissional').value;
  const formaExecucao = document.getElementById('formaExecucao').value;
  const badge = document.getElementById('custo-flex-badge');
  const fieldsGrid = document.getElementById('comercial-fields-grid');

  let custoFlex = 0;

  if (profissional === 'PROMOTOR') {
    custoFlex = (formaExecucao === 'FLEX') ? regrasComerciaisAtivas.CUSTO_FLEX_100_PROMOTOR : regrasComerciaisAtivas.CUSTO_FLEX_PADRAO_PROMOTOR;
  } else if (profissional === 'TECNICO') {
    custoFlex = (formaExecucao === 'FLEX') ? regrasComerciaisAtivas.CUSTO_FLEX_100_TECNICO : regrasComerciaisAtivas.CUSTO_FLEX_PADRAO_TECNICO;
  }

  badge.innerText = "R$ " + custoFlex.toFixed(2);

  // Se for FLEX, mantemos os campos editáveis (sem pointer-events-none e sem opacidade reduzida), apenas removemos obrigatoriedade
  if (formaExecucao === 'FLEX') {
    document.getElementById('valorPedido').required = false;
    document.getElementById('indicePedido').required = false;
  } else {
    document.getElementById('valorPedido').required = true;
    document.getElementById('indicePedido').required = true;
  }

  processarAutoCritica();
}

/**
 * Executa cálculo logístico terrestre em tempo real (RF04)
 */
async function calcularRotaTerrestre() {
  const tecnico = document.getElementById('tecnico').value;
  const cep = document.getElementById('cep').value;
  const numero = document.getElementById('numero').value.trim();
  const cidade = document.getElementById('cidade').value;

  if (!clienteSelecionado) {
    clienteSelecionado = {
      codigo: document.getElementById('codCliente').value.trim() || 'MANUAL',
      razaoSocial: document.getElementById('razaoSocial').value.trim() || 'MANUAL',
      nomeFantasia: document.getElementById('nomeFantasia').value.trim() || 'MANUAL',
      cidade: cidade,
      cep: cep,
      numero: numero,
      vendedor: document.getElementById('vendedor').value.trim() || '',
      endereco: '',
      bairro: ''
    };
  }

  if (!numero) {
    alert("Por favor, informe o número do estabelecimento para cálculo preciso da rota.");
    return;
  }

  document.getElementById('km-distancia-val').innerText = "Processando...";
  document.getElementById('km-resultado-box').classList.remove('hidden');

  try {
    const km = await apiPost('calcularDistancia', {
      tecnico: tecnico,
      cep: cep,
      numero: numero,
      cidade: cidade,
      endereco: clienteSelecionado ? (clienteSelecionado.endereco || '') : '',
      bairro: clienteSelecionado ? (clienteSelecionado.bairro || '') : ''
    });
    kmLogisticoCalculado = km;
    document.getElementById('km-distancia-val').innerText = parseFloat(km).toFixed(1);
  } catch (err) {
    alert("Erro ao calcular distância: " + err.message);
    document.getElementById('km-resultado-box').classList.add('hidden');
  }
}

/**
 * Verifica se o profissional já tem atendimento agendado na data escolhida (RF05)
 */
async function verificarDisponibilidadeAgenda() {
  const tecnico = document.getElementById('tecnico').value;
  const dataTrab = document.getElementById('dataTrabalho').value;
  const aviso = document.getElementById('agenda-aviso');
  const submitBtn = document.getElementById('submit-btn');

  if (!dataTrab) return;

  try {
    const ocupado = await apiGet('verificarAgenda', { tecnico, data: dataTrab });
    if (ocupado) {
      aviso.innerText = "O profissional " + tecnico + " já possui compromisso firmado nesta data.";
      aviso.classList.remove('hidden');
      submitBtn.disabled = true;
      submitBtn.classList.add('cursor-not-allowed', 'opacity-50');
    } else {
      aviso.classList.add('hidden');
      submitBtn.disabled = false;
      submitBtn.classList.remove('cursor-not-allowed', 'opacity-50');
    }
  } catch (err) {
    console.error("Erro ao verificar agenda: ", err);
  }
}

/**
 * Envia o formulário completo para gravação no banco de dados
 */
async function gravarSolicitacaoFinal() {
  if (!clienteSelecionado) {
    clienteSelecionado = {
      codigo: document.getElementById('codCliente').value.trim() || 'MANUAL',
      razaoSocial: document.getElementById('razaoSocial').value.trim() || 'MANUAL',
      nomeFantasia: document.getElementById('nomeFantasia').value.trim() || 'MANUAL',
      cidade: document.getElementById('cidade').value.trim() || '',
      cep: document.getElementById('cep').value.trim() || '',
      numero: document.getElementById('numero').value.trim() || '',
      vendedor: vendedor,
      endereco: '',
      bairro: ''
    };
  }

  const vendedor = document.getElementById('vendedor').value.trim();
  const tecnico = document.getElementById('tecnico').value;
  const dataTrabalho = document.getElementById('dataTrabalho').value;
  const profissional = document.getElementById('profissional').value;
  const tipoServico = document.getElementById('tipoServico').value;
  const formaExecucao = document.getElementById('formaExecucao').value;
  
  // Pega os detalhes corretos de acordo com a linha de atuação ativa
  const linhaAtuacao = document.querySelector('input[name="linhaAtuacao"]:checked').value;
  let detalhes = "";
  if (linhaAtuacao === 'Produção') {
    detalhes = document.getElementById('detalhes-producao').value.trim();
    if (!detalhes) {
      alert("Por favor, preencha as formulações e matérias-primas utilizadas.");
      return;
    }
  } else {
    detalhes = document.getElementById('detalhes-apresentacao').value.trim();
    if (!detalhes) {
      alert("Por favor, preencha os argumentos comerciais e produtos destacados.");
      return;
    }
  }

  const valorPedido = document.getElementById('valorPedido').value;
  const indicePedido = document.getElementById('indicePedido').value;
  const numeroPedido = document.getElementById('numeroPedido').value.trim();
  const numero = document.getElementById('numero').value.trim();

  // Organiza payload para o backend
  const payload = {
    vendedor: vendedor,
    tecnico: tecnico,
    dataTrabalho: dataTrabalho,
    codCliente: clienteSelecionado.codigo,
    razaoSocial: clienteSelecionado.razaoSocial,
    nomeFantasia: clienteSelecionado.nomeFantasia,
    cidade: clienteSelecionado.cidade,
    cep: clienteSelecionado.cep,
    numero: numero,
    profissional: profissional,
    tipoServico: tipoServico,
    formaExecucao: formaExecucao,
    detalhes: detalhes,
    valorPedido: valorPedido,
    indicePedido: indicePedido,
    numeroPedido: numeroPedido
  };

  // Esconde formulário, mostra loader
  document.getElementById('form-solicitacao').classList.add('hidden');
  document.getElementById('form-loader').classList.remove('hidden');

  try {
    const res = await apiPost('salvarSolicitacao', payload);
    document.getElementById('form-loader').classList.add('hidden');
    
    if (res.sucesso) {
      // Preenche card de sucesso
      document.getElementById('sucesso-id-solicitacao').innerText = res.id;
      document.getElementById('sucesso-status').innerText = res.status;
      
      const statusBadge = document.getElementById('sucesso-status');
      if (res.status === 'Aprovado') {
        statusBadge.className = "text-base font-bold text-emerald-400 font-outfit";
      } else {
        statusBadge.className = "text-base font-bold text-amber-500 font-outfit";
      }

      // Salva dados na variável global para caso queira imprimir ficha
      solicitacaoPesquisadaAtiva = {
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
        dataCriacao: new Date()
      };

      document.getElementById('form-resultado-sucesso').classList.remove('hidden');
    } else {
      alert("Não foi possível salvar o agendamento: " + res.erro);
      document.getElementById('form-solicitacao').classList.remove('hidden');
    }
  } catch (err) {
    document.getElementById('form-loader').classList.add('hidden');
    alert("Erro de rede no servidor: " + err.message);
    document.getElementById('form-solicitacao').classList.remove('hidden');
  }
}

/**
 * Copia o ID da solicitação para a área de transferência
 */
function copiarIdSolicitacao() {
  const idText = document.getElementById('sucesso-id-solicitacao').innerText;
  navigator.clipboard.writeText(idText).then(function() {
    alert("Identificador " + idText + " copiado com sucesso!");
  }, function() {
    alert("Não foi possível copiar automaticamente.");
  });
}

/**
 * Aciona a ficha de controle técnica para impressão a partir do sucesso
 */
function gerarPdfFichaSucesso() {
  imprimirFichaAtendimento();
}

/**
 * Reseta o formulário para uma nova inserção
 */
function resetarFormulario() {
  document.getElementById('form-solicitacao').reset();
  clienteSelecionado = null;
  kmLogisticoCalculado = null;
  
  document.getElementById('codCliente').value = "";
  document.getElementById('razaoSocial').value = "";
  document.getElementById('nomeFantasia').value = "";
  document.getElementById('cidade').value = "";
  document.getElementById('cep').value = "";
  document.getElementById('numeroPedido').value = "";

  document.getElementById('cidade-aviso').classList.add('hidden');
  document.getElementById('agenda-aviso').classList.add('hidden');
  document.getElementById('autocritica-alerta').classList.add('hidden');
  document.getElementById('km-resultado-box').classList.add('hidden');
  const cepInfo = document.getElementById('cep-info');
  if (cepInfo) {
    cepInfo.classList.add('hidden');
    cepInfo.innerText = "";
  }

  document.getElementById('form-resultado-sucesso').classList.add('hidden');
  document.getElementById('form-solicitacao').classList.remove('hidden');
  
  lidarMudancaLinhaAtuacao('Produção');
  lidarMudancaFiltrosComerciais();
}

// Fecha autocomplete ao clicar fora dele
document.addEventListener('click', function(e) {
  if (e.target.id !== 'cliente-search') {
    document.getElementById('autocomplete-lista').classList.add('hidden');
  }
});
