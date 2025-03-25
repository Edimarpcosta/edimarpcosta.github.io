/**
 * Casa dos Dados - Extrator de Dados
 * Script para extrair e processar dados de empresas
 */

// Elementos globais
let loadingElement;

// Inicializar elementos quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    loadingElement = document.getElementById('loading');
});

/**
 * Cria o JSON para a pesquisa e inicia o processo de busca
 */
function createJson() {
    // Mostrar indicador de carregamento
    loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block';
    
    // Desabilitar botão de pesquisa
    const searchButton = document.getElementById('searchButton');
    searchButton.disabled = true;
    searchButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Buscando...';
    
    // Obter o nome do município para o arquivo CSV
    const municipioset = document.getElementById('municipio').value || 'resultado';
    
    // Coletar todos os valores do formulário
    const formData = {
        termo: getArrayFromInput('termo'),
        atividade_principal: getArrayFromInput('atividade_principal'),
        incluir_atividade_secundaria: document.getElementById('incluir_atividade_secundaria').checked,
        natureza_juridica: getArrayFromInput('natureza_juridica'),
        situacaoCadastral: getCheckedRadioValue('situacao_cadastral'),
        cep: getArrayFromInput('cep'),
        uf: getArrayFromInput('uf'),
        municipio: getArrayFromInput('municipio'),
        bairro: getArrayFromInput('bairro'),
        ddd: getArrayFromInput('ddd'),
        data_abertura_lte: document.getElementById('data_abertura_lte').value,
        data_abertura_gte: document.getElementById('data_abertura_gte').value,
        capital_abertura_lte: document.getElementById('capital_abertura_lte').value,
        capital_abertura_gte: document.getElementById('capital_abertura_gte').value,
        somente_mei: document.getElementById('somente_mei').checked,
        excluir_mei: document.getElementById('excluir_mei').checked,
        com_contato_telefonico: document.getElementById('com_contato_telefonico').checked,
        somente_celular: document.getElementById('somente_celular').checked,
        somente_fixo: document.getElementById('somente_fixo').checked,
        somente_matriz: document.getElementById('somente_matriz').checked,
        somente_filial: document.getElementById('somente_filial').checked,
        com_email: document.getElementById('com_email').checked,
        pagina: parseInt(document.getElementById('pagina').value) || 1
    };

    // Iniciar a busca recursiva
    fetchPage(formData.pagina, [], formData, municipioset)
        .finally(() => {
            // Restaurar botão de pesquisa
            searchButton.disabled = false;
            searchButton.innerHTML = '<i class="fas fa-search"></i> Pesquisar';
            loadingElement.style.display = 'none';
        });
}

/**
 * Obtém um array de valores a partir de um input de texto com valores separados por vírgula
 * @param {string} elementId - ID do elemento input
 * @returns {Array} - Array de strings sem espaços em branco extras
 */
function getArrayFromInput(elementId) {
    const value = document.getElementById(elementId).value;
    if (!value) return [];
    return value.split(',').map(item => item.trim()).filter(item => item !== '');
}

/**
 * Obtém o valor de um botão radio selecionado
 * @param {string} name - Nome do grupo de radio buttons
 * @returns {string} - Valor do radio button selecionado
 */
function getCheckedRadioValue(name) {
    const elements = document.getElementsByName(name);
    for (let i = 0; i < elements.length; i++) {
        if (elements[i].checked) {
            return elements[i].value;
        }
    }
    return null;
}

/**
 * Atualiza a mensagem de carregamento
 * @param {string} message - Mensagem a ser exibida
 */
function updateLoadingMessage(message) {
    const loadingTextElement = loadingElement.querySelector('p');
    if (loadingTextElement) {
        loadingTextElement.textContent = message;
    }
}

/**
 * Busca dados da API de forma recursiva, página por página
 * @param {number} page - Número da página atual
 * @param {Array} allData - Array acumulador com os dados de todas as páginas
 * @param {Object} formData - Dados do formulário
 * @param {string} outputFilename - Nome do arquivo para exportação
 * @returns {Promise}
 */
function fetchPage(page, allData, formData, outputFilename) {
    // Montar o objeto JSON para enviar à API
    const requestData = {
        "query": {
            "termo": formData.termo,
            "atividade_principal": formData.atividade_principal,
            "natureza_juridica": formData.natureza_juridica,
            "uf": formData.uf,
            "municipio": formData.municipio,
            "bairro": formData.bairro,
            "situacao_cadastral": formData.situacaoCadastral,
            "cep": formData.cep,
            "ddd": formData.ddd
        },
        "range_query": {
            "data_abertura": {
                "lte": formData.data_abertura_lte || null,
                "gte": formData.data_abertura_gte || null
            },
            "capital_social": {
                "lte": formData.capital_abertura_lte || null,
                "gte": formData.capital_abertura_gte || null
            }
        },
        "extras": {
            "somente_mei": formData.somente_mei,
            "excluir_mei": formData.excluir_mei,
            "com_email": formData.com_email,
            "incluir_atividade_secundaria": formData.incluir_atividade_secundaria,
            "com_contato_telefonico": formData.com_contato_telefonico,
            "somente_celular": formData.somente_celular,
            "somente_fixo": formData.somente_fixo,
            "somente_matriz": formData.somente_matriz,
            "somente_filial": formData.somente_filial
        },
        "page": page
    };

    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
    };

    updateLoadingMessage(`Buscando página ${page}...`);

    return fetch('https://api.casadosdados.com.br/v2/public/cnpj/search', requestOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.data.count === 0) {
                if (page === formData.pagina) {
                    // Se é a primeira página e não há resultados
                    showToast("Nenhum resultado encontrado para sua pesquisa.", "warning");
                    return allData;
                }
                // Se chegamos ao fim dos resultados
                return allData;
            }

            updateLoadingMessage(`Processando ${data.data.cnpj.length} registros da página ${page}...`);

            // Formatar atividade principal
            const processedData = data.data.cnpj.map(empresa => {
                return {
                    ...empresa,
                    atividade_principal: formatarAtividadePrincipal(empresa)
                };
            });

            // Adicionar dados da página atual aos dados acumulados
            const combinedData = allData.concat(processedData);
            
            // Verificar se há mais páginas (considerando 20 itens por página)
            const hasMorePages = data.data.count > page * 20;
            
            // Atualizar o progresso
            updateLoadingMessage(`Encontrados ${combinedData.length} registros até agora...`);

            if (hasMorePages) {
                // Chamar a função recursivamente para a próxima página
                return fetchPage(page + 1, combinedData, formData, outputFilename);
            } else {
                // Exportar todos os dados para CSV
                updateLoadingMessage(`Exportando ${combinedData.length} registros para CSV...`);
                exportToCSV(combinedData, `${outputFilename}.csv`);
                showToast(`Download concluído com ${combinedData.length} registros.`, "success");
                return combinedData;
            }
        })
        .catch(error => {
            console.error(`Erro na busca (página ${page}):`, error);
            showToast(`Erro durante a busca: ${error.message}`, "error");
            return allData; // Retorna os dados já coletados até o erro
        });
}

/**
 * Exporta dados para um arquivo CSV
 * @param {Array} data - Array de objetos a serem exportados
 * @param {string} fileName - Nome do arquivo de saída
 */
function exportToCSV(data, fileName) {
    if (!data || data.length === 0) {
        showToast("Não há dados para exportar", "warning");
        return;
    }

    try {
        // Obter todas as chaves possíveis (incluindo as que podem estar apenas em alguns registros)
        const allKeys = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });
        
        // Converter o Set para Array e ordenar as colunas mais importantes primeiro
        const priorityKeys = ['cnpj', 'razao_social', 'nome_fantasia', 'atividade_principal', 
                             'telefone1', 'telefone2', 'email', 'municipio', 'uf'];
        
        const keys = [...allKeys].sort((a, b) => {
            const indexA = priorityKeys.indexOf(a);
            const indexB = priorityKeys.indexOf(b);
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        // Criar cabeçalho
        const header = keys.join('\t') + '\n';

        // Criar linhas
        const rows = data.map(obj => {
            return keys.map(key => {
                if (!obj.hasOwnProperty(key)) return '';
                
                const value = obj[key];
                
                if (value === null || value === undefined) return '';
                
                // Tratar arrays
                if (Array.isArray(value)) {
                    return value.map(item => {
                        if (typeof item === 'object' && item !== null) {
                            return item.text || JSON.stringify(item);
                        }
                        return item;
                    }).join(', ');
                }
                
                // Tratar objetos
                if (typeof value === 'object') {
                    return JSON.stringify(value).replace(/"/g, '""');
                }
                
                // Escapar aspas e tabs em strings
                if (typeof value === 'string') {
                    return value.replace(/"/g, '""').replace(/\t/g, ' ');
                }
                
                return value;
            }).join('\t');
        }).join('\n');

        // Combinar cabeçalho e linhas (com BOM para suporte a caracteres especiais)
        const csvContent = '\ufeff' + header + rows;

        // Criar blob e download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Criar URL para o blob
        const url = window.URL.createObjectURL(blob);
        
        // Criar link de download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        link.style.display = 'none';
        
        // Adicionar ao DOM, disparar o clique e remover
        document.body.appendChild(link);
        link.click();
        
        // Aguardar um pouco antes de limpar para garantir o download
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    } catch(error) {
        console.error('Erro ao exportar dados:', error);
        showToast('Erro ao gerar arquivo CSV. Verifique o console para mais detalhes.', 'error');
    }
}

/**
 * Formata a atividade principal de uma empresa em um formato legível
 * @param {Object} empresa - Objeto com dados da empresa
 * @returns {string} - String formatada da atividade principal
 */
function formatarAtividadePrincipal(empresa) {
    if (!empresa || !empresa.atividade_principal || !empresa.atividade_principal.codigo || !empresa.atividade_principal.descricao) {
        return "";  // Retorna uma string vazia se não houver dados válidos
    }
    let descricao = substituirCaracteres(empresa.atividade_principal.descricao);
    return `${empresa.atividade_principal.codigo} - ${descricao}`;
}

/**
 * Substitui caracteres acentuados por suas versões sem acento
 * @param {string} str - String de entrada com possíveis acentos
 * @returns {string} - String sem acentos
 */
function substituirCaracteres(str) {
    if (!str) return '';
    
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove acentos
              .replace(/ç/gi, 'c');            // Substitui ç por c
}

/**
 * Exibe uma notificação toast para o usuário
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de mensagem (success, error, warning, info)
 */
function showToast(message, type = 'info') {
    const toastElement = document.getElementById('toast');
    const toastBodyElement = document.getElementById('toast-body');

    // Definir o conteúdo do toast
    toastBodyElement.innerText = message;

    // Limpar classes de cor anteriores
    toastElement.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');

    // Definir nova classe de cor baseada no tipo
    switch (type) {
        case 'success':
            toastElement.classList.add('bg-success');
            break;
        case 'error':
            toastElement.classList.add('bg-danger');
            break;
        case 'warning':
            toastElement.classList.add('bg-warning', 'text-dark');
            break;
        default:
            toastElement.classList.add('bg-info');
            break;
    }

    // Criar um novo toast usando o Bootstrap
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000
    });

    // Exibir o toast
    toast.show();
}

/**
 * Função de busca de CEP via API ViaCEP
 * @param {string} cep - CEP a ser consultado
 */
function buscaCep(cep) {
    if (cep.length === 8) {
        document.getElementById('loading').style.display = 'block';
        
        fetch(`https://viacep.com.br/ws/${cep}/json/`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('CEP não encontrado');
                }
                return response.json();
            })
            .then(data => {
                if (data.erro) {
                    throw new Error('CEP não encontrado');
                }
                
                document.getElementById('uf').value = data.uf;
                document.getElementById('municipio').value = data.localidade;
                document.getElementById('bairro').value = data.bairro;
                document.getElementById('loading').style.display = 'none';
            })
            .catch(error => {
                console.error('Erro ao buscar endereço:', error);
                showToast("CEP não encontrado ou inválido", "error");
                document.getElementById('loading').style.display = 'none';
            });
    }
}
