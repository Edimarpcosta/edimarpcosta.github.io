// =========================== SCRIPT DE TESTE DE CONECTIVIDADE ===========================
/**
 * Script responsável por testar a disponibilidade das APIs e implementar
 * o sistema de retry/fallback entre diferentes provedores.
 */

// Configuração das APIs disponíveis
const apiConfig = {
  // Ordem padrão das APIs
  defaultOrder: ['BrasilAPI', 'minhaReceita', 'ReceitaWS'],
  
  // CNPJ para testes de conectividade (Banco do Brasil - sempre existirá)
  testCnpj: '00000000000191',
  
  // Configuração de cada API
  apis: {
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
        // Se a API retornar erro mesmo com status 200, tratar como erro
        if (data.status === 'ERROR') {
          throw new Error(`Erro na ReceitaWS: ${data.message}`);
        }

        return {
          // Mapeamento de propriedades da API ReceitaWS para o formato BrasilAPI
          cnpj: data.cnpj,
          razao_social: data.nome,
          nome_fantasia: data.fantasia,
          data_inicio_atividade: data.abertura,
          descricao_situacao_cadastral: data.situacao,
          natureza_juridica: data.natureza_juridica,
          capital_social: parseFloat(data.capital_social?.replace(/\./g, '').replace(',', '.')) || 0,
          porte: data.porte,

          // Atividade Principal
          cnae_fiscal: data.atividade_principal && data.atividade_principal.length > 0 
              ? data.atividade_principal[0].code.replace(/[^\d]/g, '') 
              : '',
          cnae_fiscal_descricao: data.atividade_principal && data.atividade_principal.length > 0 
              ? data.atividade_principal[0].text 
              : '',

          // CNAEs Secundários
          cnaes_secundarios: data.atividades_secundarias 
              ? data.atividades_secundarias.map(ativ => ({
                  codigo: ativ.code.replace(/[^\d]/g, ''),
                  descricao: ativ.text
                })) 
              : [],

          // Endereço
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          cep: data.cep,
          bairro: data.bairro,
          municipio: data.municipio,
          uf: data.uf,

          // Contato
          ddd_telefone_1: data.telefone,
          email: data.email,

          // Quadro Societário
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

/**
 * Verifica a disponibilidade de todas as APIs configuradas
 * @returns {Promise<{[key: string]: boolean}>} Objeto com status de cada API
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
 * @param {string} apiName Nome da API a ser testada
 * @returns {Promise<boolean>} Se a API está disponível
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

/**
 * Consulta um CNPJ tentando múltiplas APIs
 * @param {string} cnpj CNPJ a ser consultado
 * @returns {Promise<Object>} Dados do CNPJ
 */
async function consultarCnpjComFallback(cnpj) {
  // Obter ordem das APIs (do DOM se disponível, ou usar padrão)
  const apiOrder = getApiOrder();
  
  // Objeto para armazenar erros
  const errors = {};
  
  // Tentar cada API na ordem definida
  for (const apiName of apiOrder) {
    try {
      console.log(`Tentando consultar CNPJ ${cnpj} via ${apiName}...`);
      
      // Obter dados da API
      const api = apiConfig.apis[apiName];
      const formattedCnpj = api.formatter(cnpj);
      const url = api.url.replace('{cnpj}', formattedCnpj);
      
      // Fazer a requisição
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Tentar extrair mensagem de erro
        let errorMsg = `Status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg += `: ${errorData.message || errorData.erro || response.statusText}`;
        } catch {
          errorMsg += `: ${response.statusText}`;
        }
        
        // Caso específico para 404 (CNPJ não encontrado)
        if (response.status === 404) {
          const isNotFoundError = await checkIfNotFoundError(response, apiName);
          if (isNotFoundError) {
            return {
              cnpj: cnpj,
              error: true,
              errorMessage: "CNPJ não encontrado na base da Receita Federal",
              notFound: true,
              skipErrorCount: true,
              api_origem: apiName
            };
          }
        }
        
        throw new Error(errorMsg);
      }
      
      // Processar resposta
      const data = await response.json();
      const processedData = api.responseProcessor(data);
      
      // Adicionar metadados
      processedData.api_origem = apiName;
      
      return processedData;
    } catch (error) {
      // Registrar erro desta API
      console.warn(`Falha ao consultar via ${apiName}:`, error.message);
      errors[apiName] = error.message;
    }
  }
  
  // Se chegou aqui, todas as APIs falharam
  const errorMsg = Object.entries(errors)
    .map(([api, msg]) => `${api}: ${msg}`)
    .join(' | ');
    
  throw new Error(`Todas as APIs falharam: ${errorMsg}`);
}

/**
 * Verifica se o erro 404 é relacionado a CNPJ não encontrado
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

/**
 * Obtém a ordem de APIs definida na interface ou usa a padrão
 */
function getApiOrder() {
  try {
    const api1 = document.getElementById('api1')?.value;
    const api2 = document.getElementById('api2')?.value;
    const api3 = document.getElementById('api3')?.value;
    
    if (api1 && api2 && api3) {
      return [api1, api2, api3];
    }
  } catch (e) {
    console.warn('Não foi possível obter ordem de APIs da interface:', e);
  }
  
  return apiConfig.defaultOrder;
}

/**
 * Formatar CNPJ com pontuação (XX.XXX.XXX/XXXX-XX)
 */
function formatarCnpjComPontuacao(cnpj) {
  if (cnpj.length !== 14) {
    // Completar com zeros à esquerda se necessário
    cnpj = cnpj.padStart(14, '0');
  }
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Expor funções globalmente
window.apiTestSystem = {
  testAllApiConnections,
  testApiConnection,
  consultarCnpjComFallback,
  formatarCnpjComPontuacao,
  getApiOrder
};
