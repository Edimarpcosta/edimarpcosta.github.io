// =========================== SCRIPT DE TESTE DE CONECTIVIDADE ===========================
/**
 * Script responsável por testar a disponibilidade das APIs e implementar
 * o sistema de retry/fallback entre diferentes provedores.
 */

// =======================================================================================
// INÍCIO DAS MODIFICAÇÕES: O objeto de configuração foi expandido.
// =======================================================================================

const apiConfig = {
  // Ordem padrão das APIs
  defaultOrder: ['BrasilAPI', 'Invertexto', 'PublicaCnpjWs', 'ReceitaWS', 'minhaReceita'],
  
  // CNPJ para testes de conectividade (Banco do Brasil - sempre existirá)
  testCnpj: '00000000000191',
  
  // Configuração de cada API
  apis: {
    // ================================= NOVA API ADICIONADA: Invertexto =================================
    Invertexto: {
        url: 'https://api.invertexto.com/v1/cnpj/{cnpj}?token=661|xqfbRfFda6qReBvlbBRhuX3hFw6DdQ1f',
        formatter: (cnpj) => cnpj.replace(/\D/g, ''),
        responseProcessor: (data) => {
            if (!data.cnpj) {
                throw new Error('Resposta inválida da API Invertexto');
            }

            return {
                cnpj: data.cnpj,
                razao_social: data.razao_social,
                nome_fantasia: data.nome_fantasia || '',
                data_inicio_atividade: data.data_inicio,
                descricao_situacao_cadastral: data.situacao?.nome || '',
                situacao_cadastral: data.situacao?.nome === 'Ativa' ? '02' : '00', // Aproximação
                natureza_juridica: data.natureza_juridica,
                capital_social: parseFloat(data.capital_social) || 0,
                porte: data.porte,
                cnae_fiscal: data.atividade_principal?.codigo,
                cnae_fiscal_descricao: data.atividade_principal?.descricao,
                cnaes_secundarios: data.atividades_secundarias?.map(a => ({
                    codigo: a.codigo,
                    descricao: a.descricao
                })) || [],
                logradouro: `${data.endereco?.tipo_logradouro || ''} ${data.endereco?.logradouro || ''}`.trim(),
                numero: data.endereco?.numero,
                complemento: data.endereco?.complemento || '',
                cep: data.endereco?.cep,
                bairro: data.endereco?.bairro,
                municipio: data.endereco?.municipio,
                uf: data.endereco?.uf,
                ddd_telefone_1: data.telefone1,
                email: data.email || '',
                qsa: data.socios?.map(s => ({
                    nome_socio: s.nome,
                    qualificacao_socio: s.qualificacao,
                    data_entrada_sociedade: s.data_entrada
                })) || [],
                api_origem: 'Invertexto'
            };
        }
    },
    // ================================= API MANTIDA: Publica CNPJ WS =================================
    PublicaCnpjWs: {
        url: 'https://publica.cnpj.ws/cnpj/{cnpj}',
        formatter: (cnpj) => cnpj.replace(/\D/g, ''),
        responseProcessor: (data) => {
            if (!data.estabelecimento) throw new Error('Resposta inválida da API PublicaCnpjWs');
            
            const est = data.estabelecimento;
            return {
                cnpj: est.cnpj,
                razao_social: data.razao_social,
                nome_fantasia: est.nome_fantasia || '',
                data_inicio_atividade: est.data_inicio_atividade,
                descricao_situacao_cadastral: est.situacao_cadastral,
                natureza_juridica: data.natureza_juridica?.descricao || '',
                capital_social: parseFloat(data.capital_social) || 0,
                porte: data.porte?.descricao || '',
                cnae_fiscal: est.atividade_principal?.id,
                cnae_fiscal_descricao: est.atividade_principal?.descricao,
                cnaes_secundarios: est.atividades_secundarias?.map(a => ({ codigo: a.id, descricao: a.descricao })) || [],
                logradouro: `${est.tipo_logradouro} ${est.logradouro}`,
                numero: est.numero,
                complemento: est.complemento || '',
                cep: est.cep,
                bairro: est.bairro,
                municipio: est.cidade.nome,
                uf: est.estado.sigla,
                ddd_telefone_1: est.ddd1 && est.telefone1 ? `${est.ddd1}${est.telefone1}` : '',
                email: est.email || '',
                qsa: data.socios?.map(s => ({ nome_socio: s.nome, qualificacao_socio: s.qualificacao })) || [],
                api_origem: 'PublicaCnpjWs'
            };
        }
    },
    // Mantendo as APIs originais do seu script
    BrasilAPI: {
      url: 'https://brasilapi.com.br/api/cnpj/v1/{cnpj}',
      formatter: (cnpj) => cnpj.replace(/\D/g, ''),
      responseProcessor: (data) => data // BrasilAPI já retorna no formato desejado
    },
    minhaReceita: {
      url: 'https://minhareceita.org/{cnpj}',
      formatter: (cnpj) => formatarCnpjComPontuacao(cnpj.replace(/\D/g, '')),
      responseProcessor: (data) => ({
        // Mapeamento de propriedades da API minhaReceita para o formato BrasilAPI
        cnpj: data.cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        data_inicio_atividade: data.data_inicio_atividade,
        descricao_situacao_cadastral: data.descricao_situacao_cadastral,
        situacao_cadastral: data.situacao_cadastral,
        natureza_juridica: data.natureza_juridica,
        capital_social: data.capital_social,
        porte: data.porte,
        cnae_fiscal: data.cnae_fiscal,
        cnae_fiscal_descricao: data.cnae_fiscal_descricao,
        cnaes_secundarios: data.cnaes_secundarios,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        cep: data.cep,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        ddd_telefone_1: data.ddd_telefone_1,
        email: data.email,
        qsa: data.qsa,
        api_origem: 'minhaReceita'
      })
    },
    ReceitaWS: {
      url: 'https://receitaws.com.br/v1/cnpj/{cnpj}',
      formatter: (cnpj) => cnpj.replace(/\D/g, ''),
      responseProcessor: (data) => {
        if (data.status === 'ERROR') {
          throw new Error(`Erro na ReceitaWS: ${data.message}`);
        }

        return {
          cnpj: data.cnpj,
          razao_social: data.nome,
          nome_fantasia: data.fantasia,
          data_inicio_atividade: data.abertura,
          descricao_situacao_cadastral: data.situacao,
          natureza_juridica: data.natureza_juridica,
          capital_social: parseFloat(data.capital_social?.replace(/\./g, '').replace(',', '.')) || 0,
          porte: data.porte,
          cnae_fiscal: data.atividade_principal && data.atividade_principal.length > 0 
              ? data.atividade_principal[0].code.replace(/[^\d]/g, '') 
              : '',
          cnae_fiscal_descricao: data.atividade_principal && data.atividade_principal.length > 0 
              ? data.atividade_principal[0].text 
              : '',
          cnaes_secundarios: data.atividades_secundarias 
              ? data.atividades_secundarias.map(ativ => ({
                  codigo: ativ.code.replace(/[^\d]/g, ''),
                  descricao: ativ.text
                })) 
              : [],
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          cep: data.cep,
          bairro: data.bairro,
          municipio: data.municipio,
          uf: data.uf,
          ddd_telefone_1: data.telefone,
          email: data.email,
          qsa: data.qsa 
              ? data.qsa.map(socio => ({
                  nome_socio: socio.nome,
                  qualificacao_socio: socio.qual,
                  data_entrada_sociedade: '' // ReceitaWS não fornece
                })) 
              : [],
          api_origem: 'ReceitaWS'
        };
      }
    }
  }
};

// =======================================================================================
// FIM DAS MODIFICAÇÕES NO OBJETO DE CONFIGURAÇÃO
// =======================================================================================


/**
 * Verifica a disponibilidade de todas as APIs configuradas
 */
async function testAllApiConnections() {
  const results = {};
  const apiNames = Object.keys(apiConfig.apis);
  
  for (const apiName of apiNames) {
    results[apiName] = await testApiConnection(apiName);
  }
  
  return results;
}

/**
 * Testa a conexão com uma API específica
 */
async function testApiConnection(apiName) {
  if (!apiConfig.apis[apiName]) {
    console.error(`API "${apiName}" não configurada`);
    return false;
  }
  
  const api = apiConfig.apis[apiName];
  const testCnpj = apiConfig.testCnpj;
  
  try {
    console.log(`Testando conexão com ${apiName} usando CNPJ ${testCnpj}...`);
    
    // Formatação específica do CNPJ para a API
    const formattedCnpj = api.formatter(testCnpj);
    
    // Compor URL com o CNPJ de teste
    const url = api.url.replace('{cnpj}', formattedCnpj);
    
    // Adicionar timestamp para evitar cache
    const noCache = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;
    
    // Fazer requisição de teste
    const response = await fetch(noCache, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store'
      },
      // Timeout de 5 segundos para teste
      signal: AbortSignal.timeout(5000)
    });
    
    // Verificar resposta
    if (response.ok) {
      console.log(`✅ API ${apiName} está operacional`);
      return true;
    } else {
      console.warn(`⚠️ API ${apiName} retornou status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro ao testar conexão com API ${apiName}:`, error.message);
    return false;
  }
}

// =======================================================================================
// INÍCIO DA MODIFICAÇÃO: A função consultarCnpjComFallback foi substituída por uma versão
// mais robusta que garante a passagem por todas as APIs.
// =======================================================================================
/**
 * Consulta um CNPJ tentando múltiplas APIs
 * @param {string} cnpj CNPJ a ser consultado
 * @returns {Promise<Object>} Dados do CNPJ
 */
async function consultarCnpjComFallback(cnpj) {
  const apiOrder = getApiOrder();
  const errors = {};
  
  for (const apiName of apiOrder) {
    if (!apiConfig.apis[apiName]) continue; 

    try {
      console.log(`Tentando consultar CNPJ ${cnpj} via ${apiName}...`);
      
      const api = apiConfig.apis[apiName];
      const formattedCnpj = api.formatter(cnpj);
      const url = api.url.replace('{cnpj}', formattedCnpj);
      
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      
      if (!response.ok) {
        let errorMsg = `Status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorData.detalhes || JSON.stringify(errorData);
        } catch {}
        
        // Se for 404 (não encontrado), registra o erro e continua para a próxima API
        if (response.status === 404) {
          console.log(`CNPJ ${cnpj} não encontrado na API ${apiName}. Tentando próxima...`);
          errors[apiName] = 'CNPJ não encontrado';
          continue; // Pula para a próxima API
        }
        
        // Para outros erros (ex: 429, 500), joga o erro e para a consulta nesta API
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      // O 'await' aqui é importante caso o responseProcessor seja assíncrono no futuro
      const processedData = await api.responseProcessor(data);
      
      // Adiciona a origem no objeto principal, caso o processador não tenha feito
      if (!processedData.api_origem) {
        processedData.api_origem = apiName;
      }

      console.log(`Sucesso! CNPJ ${cnpj} encontrado via ${apiName}.`);
      return processedData; // Retorna o sucesso e interrompe o loop

    } catch (error) {
      // Captura o erro da tentativa atual e continua o loop
      console.warn(`Falha ao consultar via ${apiName}:`, error.message);
      errors[apiName] = error.message;
    }
  }
  
  // Se o loop terminou, todas as APIs tentadas falharam.
  // Verifica se a razão principal da falha foi "não encontrado"
  const notFoundCount = Object.values(errors).filter(msg => msg.toLowerCase().includes('não encontrado')).length;
  const attemptedApisCount = apiOrder.length;

  if (notFoundCount === attemptedApisCount) {
     // Se TODAS as APIs retornaram "não encontrado"
     return {
        cnpj: cnpj,
        error: true,
        errorMessage: "CNPJ não encontrado em nenhuma das APIs consultadas",
        notFound: true,
        skipErrorCount: true,
        api_origem: 'Todas'
      };
  }

  // Se houve outros tipos de erro
  const errorMsg = Object.entries(errors)
    .map(([api, msg]) => `${api}: ${msg}`)
    .join(' | ');
    
  throw new Error(`Todas as APIs falharam: ${errorMsg}`);
}
// =======================================================================================
// FIM DA MODIFICAÇÃO da função consultarCnpjComFallback
// =======================================================================================


/**
 * Verifica se o erro 404 é relacionado a CNPJ não encontrado
 * ESTA FUNÇÃO É MANTIDA DO SEU SCRIPT ORIGINAL
 */
async function checkIfNotFoundError(response, apiName) {
  try {
    const errorData = await response.clone().json();
    
    // Verificação específica por API
    if (apiName === 'BrasilAPI') {
      return errorData.name === "CnpjPromiseError" && 
             errorData.errors && 
             errorData.errors.length > 0 && 
             errorData.errors[0].message && 
             errorData.errors[0].message.includes("não encontrado");
    } else if (apiName === 'minhaReceita') {
      return errorData.message && errorData.message.includes("não encontrado");
    } else if (apiName === 'ReceitaWS') {
      return errorData.status === "ERROR" && 
             errorData.message && 
             errorData.message.includes("não encontrad");
    }
    
    return false;
  } catch {
    return false;
  }
}

// =======================================================================================
// INÍCIO DA MODIFICAÇÃO: A função getApiOrder foi atualizada para ler 5 seletores
// =======================================================================================
/**
 * Obtém a ordem de APIs definida na interface ou usa a padrão
 */
function getApiOrder() {
  try {
    const ids = ['api1', 'api2', 'api3', 'api4', 'api5'];
    const order = ids.map(id => document.getElementById(id)?.value).filter(Boolean);
    
    // Remove duplicados mantendo a primeira ocorrência
    const uniqueOrder = [...new Set(order)];

    if (uniqueOrder.length > 0) {
      // Completa com as APIs restantes que não foram selecionadas, respeitando a ordem padrão
      const allApis = apiConfig.defaultOrder;
      const remainingApis = allApis.filter(api => !uniqueOrder.includes(api));
      return [...uniqueOrder, ...remainingApis];
    }
  } catch (e) {
    console.warn('Não foi possível obter ordem de APIs da interface:', e);
  }
  
  return apiConfig.defaultOrder;
}
// =======================================================================================
// FIM DA MODIFICAÇÃO da função getApiOrder
// =======================================================================================


/**
 * Formatar CNPJ com pontuação (XX.XXX.XXX/XXXX-XX)
 * ESTA FUNÇÃO É MANTIDA DO SEU SCRIPT ORIGINAL
 */
function formatarCnpjComPontuacao(cnpj) {
  if (cnpj.length !== 14) {
    // Completar com zeros à esquerda se necessário
    cnpj = cnpj.padStart(14, '0');
  }
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Expor funções globalmente
// A função checkIfNotFoundError não é mais usada pela nova lógica de fallback, mas é mantida aqui para não remover código.
window.apiTestSystem = {
  testAllApiConnections,
  testApiConnection,
  consultarCnpjComFallback,
  formatarCnpjComPontuacao, // Mantido do original
  getApiOrder
};