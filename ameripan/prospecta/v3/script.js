/**
 * Casa dos Dados - Extrator de Dados
 * Script aprimorado para extrair e processar dados de empresas
 * Versão 2.0 - Com suporte a Excel e recursos de visualização
 */

// Elementos globais
let loadingElement;
let progressElement;
let progressTextElement;
let currentSearchResults = [];
let charts = {};

// Inicializar elementos quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    loadingElement = document.getElementById('loading');
    progressElement = document.getElementById('searchProgress');
    progressTextElement = document.getElementById('progressText');
    
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Adicionar event listeners para botões
    document.getElementById('btnExportPreview').addEventListener('click', exportCurrentResults);
    document.getElementById('btnClosePreview').addEventListener('click', closePreview);
    document.getElementById('btnSearchCnae').addEventListener('click', searchCnae);
    
    // Inicializar os selects
    document.getElementById('uf').value = 'SP';
    
    // Adicionar event listeners para campos relacionados
    const somenteMei = document.getElementById('somente_mei');
    const excluirMei = document.getElementById('excluir_mei');
    const somenteCelular = document.getElementById('somente_celular');
    const somenteFixo = document.getElementById('somente_fixo');
    const somenteMatriz = document.getElementById('somente_matriz');
    const somenteFilial = document.getElementById('somente_filial');
    
    // Lógica para campos mutuamente exclusivos
    somenteMei.addEventListener('change', function() {
        if(this.checked) excluirMei.checked = false;
    });
    
    excluirMei.addEventListener('change', function() {
        if(this.checked) somenteMei.checked = false;
    });
    
    somenteCelular.addEventListener('change', function() {
        if(this.checked) somenteFixo.checked = false;
    });
    
    somenteFixo.addEventListener('change', function() {
        if(this.checked) somenteCelular.checked = false;
    });
    
    somenteMatriz.addEventListener('change', function() {
        if(this.checked) somenteFilial.checked = false;
    });
    
    somenteFilial.addEventListener('change', function() {
        if(this.checked) somenteMatriz.checked = false;
    });
});

/**
 * Cria o JSON para a pesquisa e inicia o processo de busca
 */
function createJson() {
    // Validar campos obrigatórios
    if (!validateForm()) {
        return;
    }
    
    // Reset dos resultados anteriores
    currentSearchResults = [];
    
    // Esconder preview se estiver aberto
    document.getElementById('resultsPreview').style.display = 'none';
    document.getElementById('statistics').style.display = 'none';
    document.getElementById('prospectingTools').style.display = 'none';
    
    // Mostrar indicador de carregamento
    loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block';
    document.getElementById('progressContainer').style.display = 'block';
    
    // Resetar progresso
    progressElement.style.width = '0%';
    progressElement.setAttribute('aria-valuenow', 0);
    progressTextElement.textContent = 'Iniciando busca...';
    
    // Desabilitar botão de pesquisa
    const searchButton = document.getElementById('searchButton');
    searchButton.disabled = true;
    searchButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Buscando...';
    
    // Obter o nome do município para o arquivo CSV
    let outputFilename = document.getElementById('fileName').value;
    if (!outputFilename) {
        const municipioset = document.getElementById('municipio').value || 'resultado';
        outputFilename = cleanFileName(municipioset);
    }
    
    // Coletar todos os valores do formulário
    const formData = {
        termo: getArrayFromInput('termo'),
        atividade_principal: getArrayFromInput('atividade_principal'),
        incluir_atividade_secundaria: document.getElementById('incluir_atividade_secundaria').checked,
        natureza_juridica: document.getElementById('natureza_juridica').value ? [document.getElementById('natureza_juridica').value] : [],
        situacaoCadastral: getCheckedRadioValue('situacao_cadastral'),
        cep: document.getElementById('cep').value ? [document.getElementById('cep').value] : [],
        uf: document.getElementById('uf').value ? [document.getElementById('uf').value] : [],
        municipio: document.getElementById('municipio').value ? [document.getElementById('municipio').value] : [],
        bairro: document.getElementById('bairro').value ? [document.getElementById('bairro').value] : [],
        ddd: document.getElementById('ddd').value ? [document.getElementById('ddd').value] : [],
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
        pagina: parseInt(document.getElementById('pagina').value) || 1,
        preview: document.getElementById('previewBeforeExport').checked,
        exportFormat: getCheckedRadioValue('exportFormat')
    };

    // Iniciar a busca recursiva
    fetchPage(formData.pagina, [], formData, outputFilename)
        .finally(() => {
            // Restaurar botão de pesquisa
            searchButton.disabled = false;
            searchButton.innerHTML = '<i class="fas fa-search"></i> Pesquisar';
            loadingElement.style.display = 'none';
        });
}

/**
 * Valida o formulário antes do envio
 * @returns {Boolean} Resultado da validação
 */
function validateForm() {
    // Verificar se pelo menos um critério de busca foi informado
    const termo = document.getElementById('termo').value.trim();
    const atividade = document.getElementById('atividade_principal').value.trim();
    const uf = document.getElementById('uf').value;
    const municipio = document.getElementById('municipio').value.trim();
    
    if (!termo && !atividade && !uf && !municipio) {
        showToast('Informe pelo menos um critério de busca (termo, atividade, UF ou município)', 'warning');
        return false;
    }
    
    // Verificar condições contraditórias
    if (document.getElementById('somente_mei').checked && document.getElementById('excluir_mei').checked) {
        showToast('Você não pode selecionar "Somente MEI" e "Excluir MEI" ao mesmo tempo', 'warning');
        return false;
    }
    
    if (document.getElementById('somente_celular').checked && document.getElementById('somente_fixo').checked) {
        showToast('Você não pode selecionar "Somente Celular" e "Somente Fixo" ao mesmo tempo', 'warning');
        return false;
    }
    
    if (document.getElementById('somente_matriz').checked && document.getElementById('somente_filial').checked) {
        showToast('Você não pode selecionar "Somente Matriz" e "Somente Filial" ao mesmo tempo', 'warning');
        return false;
    }
    
    return true;
}

/**
 * Limpa o nome do arquivo para evitar caracteres especiais
 * @param {string} fileName - Nome do arquivo original
 * @returns {string} - Nome do arquivo limpo
 */
function cleanFileName(fileName) {
    return fileName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();
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
    const loadingTextElement = document.getElementById('loadingMessage');
    if (loadingTextElement) {
        loadingTextElement.textContent = message;
    }
}

/**
 * Atualiza a barra de progresso
 * @param {number} percent - Porcentagem de progresso (0-100)
 * @param {string} message - Mensagem a ser exibida
 */
function updateProgress(percent, message) {
    progressElement.style.width = `${percent}%`;
    progressElement.setAttribute('aria-valuenow', percent);
    progressTextElement.textContent = message;
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
    updateProgress(25, `Buscando página ${page}...`);

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
            updateProgress(50, `Processando ${data.data.cnpj.length} registros da página ${page}...`);

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
            updateProgress(75, `Encontrados ${combinedData.length} registros até agora...`);

            if (hasMorePages) {
                // Chamar a função recursivamente para a próxima página
                return fetchPage(page + 1, combinedData, formData, outputFilename);
            } else {
                // Guardar os resultados para uso posterior
                currentSearchResults = combinedData;
                
                // Verificar se devemos mostrar preview antes de exportar
                if (formData.preview && combinedData.length > 0) {
                    updateLoadingMessage(`Preparando visualização de ${combinedData.length} registros...`);
                    updateProgress(90, `Preparando visualização...`);
                    
                    // Mostrar preview
                    showResultsPreview(combinedData);
                    
                    // Mostrar estatísticas
                    generateStatistics(combinedData);
                    
                    // Mostrar ferramentas de prospecção
                    document.getElementById('prospectingTools').style.display = 'block';
                    
                    showToast(`Encontrados ${combinedData.length} registros.`, "success");
                } else if (combinedData.length > 0) {
                    // Exportar todos os dados diretamente
                    updateLoadingMessage(`Exportando ${combinedData.length} registros...`);
                    updateProgress(90, `Exportando dados...`);
                    
                    if (formData.exportFormat === 'xlsx') {
                        exportToExcel(combinedData, outputFilename);
                    } else {
                        exportToCSV(combinedData, `${outputFilename}.csv`);
                    }
                    
                    showToast(`Download concluído com ${combinedData.length} registros.`, "success");
                }
                
                updateProgress(100, `Concluído!`);
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
 * Mostra uma pré-visualização dos resultados
 * @param {Array} data - Array de dados a serem mostrados
 */
function showResultsPreview(data) {
    if (!data || data.length === 0) {
        showToast("Não há dados para visualizar", "warning");
        return;
    }
    
    const previewDiv = document.getElementById('resultsPreview');
    const tableHeader = document.getElementById('previewTableHeader');
    const tableBody = document.getElementById('previewTableBody');
    const resultCount = document.getElementById('resultCount');
    
    // Limpar conteúdo anterior
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    
    // Definir cabeçalhos prioritários
    const priorityKeys = ['cnpj', 'razao_social', 'nome_fantasia', 'atividade_principal', 
                         'telefone1', 'telefone2', 'email', 'municipio', 'uf'];
                         
    // Obter todas as chaves dos objetos
    const allKeys = new Set();
    data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
    
    // Ordenar as chaves (prioritárias primeiro)
    const keys = [...allKeys].sort((a, b) => {
        const indexA = priorityKeys.indexOf(a);
        const indexB = priorityKeys.indexOf(b);
        
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    }).slice(0, 10); // Limitar a 10 colunas para melhor visualização
    
    // Criar cabeçalhos da tabela
    keys.forEach(key => {
        const th = document.createElement('th');
        th.textContent = formatColumnName(key);
        th.scope = 'col';
        tableHeader.appendChild(th);
    });
    
    // Preencher o corpo da tabela (limitado a 20 registros para preview)
    const previewData = data.slice(0, 20);
    previewData.forEach(item => {
        const tr = document.createElement('tr');
        
        keys.forEach(key => {
            const td = document.createElement('td');
            
            if (item.hasOwnProperty(key)) {
                const value = item[key];
                
                if (value === null || value === undefined) {
                    td.textContent = '';
                } else if (Array.isArray(value)) {
                    td.textContent = value.map(v => {
                        if (typeof v === 'object' && v !== null) {
                            return v.text || JSON.stringify(v);
                        }
                        return v;
                    }).join(', ');
                } else if (typeof value === 'object') {
                    td.textContent = JSON.stringify(value);
                } else {
                    td.textContent = value;
                }
            } else {
                td.textContent = '';
            }
            
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
    
    // Atualizar contador de resultados
    resultCount.textContent = `${data.length} resultados encontrados`;
    
    // Mostrar o preview
    previewDiv.style.display = 'block';
}

/**
 * Formata o nome da coluna para exibição
 * @param {string} key - Nome da coluna
 * @returns {string} - Nome formatado
 */
function formatColumnName(key) {
    const specialCases = {
        'cnpj': 'CNPJ',
        'razao_social': 'Razão Social',
        'nome_fantasia': 'Nome Fantasia',
        'atividade_principal': 'Atividade Principal',
        'telefone1': 'Telefone 1',
        'telefone2': 'Telefone 2',
        'email': 'E-mail',
        'municipio': 'Município',
        'uf': 'UF',
        'capital_social': 'Capital Social'
    };
    
    if (specialCases[key]) {
        return specialCases[key];
    }
    
    // Capitalizar cada palavra e substituir underscore por espaço
    return key.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Gera estatísticas e gráficos com base nos dados
 * @param {Array} data - Array de dados para análise
 */
function generateStatistics(data) {
    if (!data || data.length === 0) return;
    
    // Limpar gráficos anteriores
    destroyCharts();
    
    const statsDiv = document.getElementById('statistics');
    
    // 1. Distribuição Geográfica
    const geoData = {};
    data.forEach(item => {
        const uf = item.uf || 'Não informado';
        geoData[uf] = (geoData[uf] || 0) + 1;
    });
    
    const geoLabels = Object.keys(geoData).sort();
    const geoValues = geoLabels.map(label => geoData[label]);
    
    // 2. Distribuição por Data de Abertura
    const yearData = {};
    data.forEach(item => {
        if (item.data_abertura) {
            const year = new Date(item.data_abertura).getFullYear();
            yearData[year] = (yearData[year] || 0) + 1;
        }
    });
    
    const yearLabels = Object.keys(yearData).sort();
    const yearValues = yearLabels.map(label => yearData[label]);
    
    // 3. Distribuição por Capital Social
    const capitalRanges = {
        'Até R$ 10 mil': 0,
        'R$ 10 mil a R$ 50 mil': 0,
        'R$ 50 mil a R$ 100 mil': 0,
        'R$ 100 mil a R$ 500 mil': 0,
        'R$ 500 mil a R$ 1 milhão': 0,
        'Acima de R$ 1 milhão': 0
    };
    
    data.forEach(item => {
        const capital = parseFloat(item.capital_social) || 0;
        
        if (capital <= 10000) {
            capitalRanges['Até R$ 10 mil']++;
        } else if (capital <= 50000) {
            capitalRanges['R$ 10 mil a R$ 50 mil']++;
        } else if (capital <= 100000) {
            capitalRanges['R$ 50 mil a R$ 100 mil']++;
        } else if (capital <= 500000) {
            capitalRanges['R$ 100 mil a R$ 500 mil']++;
        } else if (capital <= 1000000) {
            capitalRanges['R$ 500 mil a R$ 1 milhão']++;
        } else {
            capitalRanges['Acima de R$ 1 milhão']++;
        }
    });
    
    const capitalLabels = Object.keys(capitalRanges);
    const capitalValues = capitalLabels.map(label => capitalRanges[label]);
    
    // 4. Tipo de Empresa (Matriz/Filial, Natureza Jurídica)
    const typeData = {
        'Matriz': 0,
        'Filial': 0,
        'MEI': 0,
        'Outros': 0
    };
    
    data.forEach(item => {
        if (item.matriz_filial === 'MATRIZ') {
            typeData['Matriz']++;
        } else if (item.matriz_filial === 'FILIAL') {
            typeData['Filial']++;
        }
        
        if (item.mei === true) {
            typeData['MEI']++;
        } else {
            typeData['Outros']++;
        }
    });
    
    const typeLabels = ['Matriz', 'Filial', 'MEI', 'Outros'];
    const typeValues = typeLabels.map(label => typeData[label]);
    
    // Criar gráficos
    setTimeout(() => {
        charts.geo = new Chart(document.getElementById('geoDistribution'), {
            type: 'bar',
            data: {
                labels: geoLabels,
                datasets: [{
                    label: 'Empresas por UF',
                    data: geoValues,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Distribuição por Estado'
                    }
                }
            }
        });
        
        charts.year = new Chart(document.getElementById('dateDistribution'), {
            type: 'line',
            data: {
                labels: yearLabels,
                datasets: [{
                    label: 'Empresas por Ano de Abertura',
                    data: yearValues,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Abertura de Empresas por Ano'
                    }
                }
            }
        });
        
        charts.capital = new Chart(document.getElementById('capitalDistribution'), {
            type: 'pie',
            data: {
                labels: capitalLabels,
                datasets: [{
                    label: 'Capital Social',
                    data: capitalValues,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)',
                        'rgba(255, 159, 64, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: 'Distribuição por Capital Social'
                    }
                }
            }
        });
        
        charts.type = new Chart(document.getElementById('companyTypeDistribution'), {
            type: 'doughnut',
            data: {
                labels: ['Matriz', 'Filial', 'MEI', 'Outros Tipos'],
                datasets: [{
                    label: 'Tipo de Empresa',
                    data: typeValues,
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: 'Tipos de Empresa'
                    }
                }
            }
        });
    }, 300);
    
    // Mostrar estatísticas
    statsDiv.style.display = 'block';
}

/**
 * Destroi gráficos existentes para evitar conflitos
 */
function destroyCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    charts = {};
}

/**
 * Fecha a visualização de preview
 */
function closePreview() {
    document.getElementById('resultsPreview').style.display = 'none';
}

/**
 * Exporta os resultados atuais no formato selecionado
 */
function exportCurrentResults() {
    if (!currentSearchResults || currentSearchResults.length === 0) {
        showToast("Não há dados para exportar", "warning");
        return;
    }
    
    // Obter nome do arquivo
    let filename = document.getElementById('fileName').value;
    if (!filename) {
        const municipio = document.getElementById('municipio').value || 'resultado';
        filename = cleanFileName(municipio);
    }
    
    // Obter formato de exportação
    const format = getCheckedRadioValue('exportFormat');
    
    // Exportar no formato correto
    if (format === 'xlsx') {
        exportToExcel(currentSearchResults, filename);
    } else {
        exportToCSV(currentSearchResults, `${filename}.csv`);
    }
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
        
        showToast(`Arquivo CSV "${fileName}" exportado com sucesso!`, 'success');
    } catch(error) {
        console.error('Erro ao exportar dados para CSV:', error);
        showToast('Erro ao gerar arquivo CSV. Verifique o console para mais detalhes.', 'error');
    }
}

/**
 * Exporta dados para um arquivo Excel (XLSX)
 * @param {Array} data - Array de objetos a serem exportados
 * @param {string} fileName - Nome do arquivo de saída (sem extensão)
 */
function exportToExcel(data, fileName) {
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
        
        // Ordenar as colunas mais importantes primeiro
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
        
        // Criar array para o cabeçalho com nomes formatados
        const header = keys.map(key => formatColumnName(key));
        
        // Preparar linhas de dados
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
                    return JSON.stringify(value);
                }
                
                return value;
            });
        });
        
        // Juntar cabeçalho e linhas
        const sheetData = [header, ...rows];
        
        // Criar workbook e adicionar worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        
        // Adicionar estilo ao cabeçalho
        ws['!cols'] = keys.map(() => { return { wch: 20 }; }); // Largura padrão de 20 caracteres
        
        // Adicionar a planilha ao workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
        
        // Exportar o arquivo
        XLSX.writeFile(wb, `${fileName}.xlsx`);
        
        showToast(`Arquivo Excel "${fileName}.xlsx" exportado com sucesso!`, 'success');
    } catch(error) {
        console.error('Erro ao exportar dados para Excel:', error);
        showToast('Erro ao gerar arquivo Excel. Verifique o console para mais detalhes.', 'error');
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
    toastElement.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-dark');

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
                
                showToast(`CEP localizado: ${data.localidade}/${data.uf}`, "success");
            })
            .catch(error => {
                console.error('Erro ao buscar endereço:', error);
                showToast("CEP não encontrado ou inválido", "error");
                document.getElementById('loading').style.display = 'none';
            });
    } else if (cep.length > 0) {
        showToast("CEP deve ter 8 dígitos", "warning");
    }
}

/**
 * Seleciona um código CNAE da busca e adiciona ao campo
 * @param {string} cnae - Código CNAE a ser adicionado
 */
function selectCnae(cnae) {
    const cnaeInput = document.getElementById('atividade_principal');
    let currentValue = cnaeInput.value.trim();
    
    if (currentValue) {
        // Verifica se o CNAE já está na lista
        const cnaeList = currentValue.split(',').map(item => item.trim());
        if (!cnaeList.includes(cnae)) {
            cnaeInput.value = currentValue + ', ' + cnae;
        } else {
            showToast("Este CNAE já está na lista", "info");
        }
    } else {
        cnaeInput.value = cnae;
    }
    
    // Fechar o modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('cnaeSugestoesModal'));
    modal.hide();
    
    showToast(`CNAE ${cnae} adicionado`, "success");
}

/**
 * Pesquisa códigos CNAE por termo
 */
function searchCnae() {
    const searchTerm = document.getElementById('searchCnae').value.trim().toLowerCase();
    
    if (!searchTerm) {
        showToast("Digite um termo para buscar CNAEs", "warning");
        return;
    }
    
    // Aqui você poderia fazer uma chamada a uma API real para buscar CNAEs
    // Por enquanto, estamos usando dados estáticos para demonstração
    
    const cnaes = [
        { codigo: '1053800', descricao: 'Fabricação de sorvetes e outros gelados comestíveis', setor: 'Indústria' },
        { codigo: '4637106', descricao: 'Comércio atacadista de sorvetes', setor: 'Comércio' },
        { codigo: '4721104', descricao: 'Comércio varejista de doces, balas, bombons e semelhantes', setor: 'Comércio' },
        { codigo: '4729602', descricao: 'Comércio varejista de mercadorias em lojas de conveniência', setor: 'Comércio' },
        { codigo: '5611201', descricao: 'Restaurantes e similares', setor: 'Serviços' },
        { codigo: '5611203', descricao: 'Lanchonetes, casas de chá, de sucos e similares', setor: 'Serviços' },
        { codigo: '5611204', descricao: 'Bares e outros estabelecimentos especializados em servir bebidas', setor: 'Serviços' },
        { codigo: '1091101', descricao: 'Fabricação de produtos de panificação industrial', setor: 'Indústria' },
        { codigo: '1091102', descricao: 'Fabricação de produtos de padaria e confeitaria com predominância de produção própria', setor: 'Indústria' },
        { codigo: '4721102', descricao: 'Padaria e confeitaria com predominância de revenda', setor: 'Comércio' }
    ];
    
    // Filtrar CNAEs pelo termo de busca
    const results = cnaes.filter(cnae => 
        cnae.descricao.toLowerCase().includes(searchTerm) || 
        cnae.codigo.includes(searchTerm)
    );
    
    const resultsDiv = document.getElementById('cnaeResults');
    resultsDiv.innerHTML = '';
    
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="alert alert-warning">Nenhum CNAE encontrado para este termo.</div>';
    } else {
        const listGroup = document.createElement('div');
        listGroup.className = 'list-group';
        
        results.forEach(cnae => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action';
            item.onclick = function() { selectCnae(cnae.codigo); return false; };
            
            const header = document.createElement('div');
            header.className = 'd-flex w-100 justify-content-between';
            
            const title = document.createElement('h6');
            title.className = 'mb-1';
            title.textContent = cnae.codigo.replace(/(\d{4})(\d{1})(\d{2})/, '$1-$2/$3');
            
            const sector = document.createElement('small');
            sector.className = 'text-muted';
            sector.textContent = cnae.setor;
            
            header.appendChild(title);
            header.appendChild(sector);
            
            const description = document.createElement('p');
            description.className = 'mb-1';
            description.textContent = cnae.descricao;
            
            item.appendChild(header);
            item.appendChild(description);
            listGroup.appendChild(item);
        });
        
        resultsDiv.appendChild(listGroup);
    }
    
    showToast(`Encontrados ${results.length} códigos CNAE para "${searchTerm}"`, "info");
}

/**
 * Inicialização da ferramenta de análise estatística
 * Prepara os elementos de canvas para gráficos
 */
function initAnalytics() {
    // Criar elementos canvas para os gráficos
    const canvasIds = ['geoDistribution', 'dateDistribution', 'capitalDistribution', 'companyTypeDistribution'];
    
    canvasIds.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.id = `${id}Canvas`;
            container.appendChild(canvas);
        }
    });
}

/**
 * Prepara os dados para exportação em formato estruturado
 * @param {Array} data - Dados a serem preparados
 * @returns {Array} - Dados normalizados e estruturados
 */
function prepareDataForExport(data) {
    if (!data || data.length === 0) return [];
    
    // Normalizar dados para garantir consistência
    return data.map(item => {
        // Garantir que todos os campos importantes estejam presentes
        const normalizedItem = {
            cnpj: formatCNPJ(item.cnpj || ''),
            razao_social: item.razao_social || '',
            nome_fantasia: item.nome_fantasia || '',
            data_abertura: formatDate(item.data_abertura),
            atividade_principal: formatarAtividadePrincipal(item),
            natureza_juridica: item.natureza_juridica ? `${item.natureza_juridica.codigo} - ${item.natureza_juridica.descricao}` : '',
            logradouro: item.logradouro || '',
            numero: item.numero || '',
            complemento: item.complemento || '',
            cep: item.cep || '',
            bairro: item.bairro || '',
            municipio: item.municipio || '',
            uf: item.uf || '',
            email: item.email || '',
            telefone1: formatPhone(item.telefone1 || ''),
            telefone2: formatPhone(item.telefone2 || ''),
            capital_social: formatCurrency(item.capital_social),
            situacao_cadastral: item.situacao_cadastral || '',
            data_situacao_cadastral: formatDate(item.data_situacao_cadastral),
            matriz_filial: item.matriz_filial || '',
            porte: item.porte || '',
            mei: item.mei ? 'Sim' : 'Não',
            data_situacao_especial: formatDate(item.data_situacao_especial),
            data_exclusao_simples: formatDate(item.data_exclusao_simples)
        };
        
        return normalizedItem;
    });
}

/**
 * Formata um CNPJ com a máscara padrão
 * @param {string} cnpj - CNPJ sem formatação
 * @returns {string} - CNPJ formatado
 */
function formatCNPJ(cnpj) {
    if (!cnpj) return '';
    
    // Remove caracteres não numéricos
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    // Aplica a máscara
    if (cleanCnpj.length === 14) {
        return cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return cnpj;
}

/**
 * Formata um número de telefone com a máscara padrão
 * @param {string} phone - Telefone sem formatação
 * @returns {string} - Telefone formatado
 */
function formatPhone(phone) {
    if (!phone) return '';
    
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Aplica a máscara de acordo com o comprimento
    if (cleanPhone.length === 10) { // Telefone fixo
        return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (cleanPhone.length === 11) { // Celular
        return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
}

/**
 * Formata uma data no padrão brasileiro
 * @param {string} date - Data em formato ISO ou similar
 * @returns {string} - Data formatada
 */
function formatDate(date) {
    if (!date) return '';
    
    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '';
        
        return dateObj.toLocaleDateString('pt-BR');
    } catch (error) {
        return '';
    }
}

/**
 * Formata um valor monetário no padrão brasileiro
 * @param {number|string} value - Valor numérico ou string
 * @returns {string} - Valor formatado como moeda
 */
function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    return numValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Função principal de inicialização do script
 * Configura todos os listeners e componentes
 */
function init() {
    // Inicializar componentes de análise
    initAnalytics();
    
    // Verificar se há parâmetros na URL para preencher formulário
    fillFormFromURL();
    
    console.log('Extrator Casa dos Dados inicializado com sucesso!');
}

/**
 * Verifica e preenche o formulário com base nos parâmetros da URL
 * Útil para compartilhar buscas pré-configuradas
 */
function fillFormFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Mapear parâmetros da URL para os campos do formulário
    const paramMapping = {
        'termo': 'termo',
        'atividade': 'atividade_principal',
        'uf': 'uf',
        'municipio': 'municipio',
        'situacao': 'situacao_cadastral'
    };
    
    // Preencher campos de texto
    for (const [param, fieldId] of Object.entries(paramMapping)) {
        if (urlParams.has(param)) {
            document.getElementById(fieldId).value = urlParams.get(param);
        }
    }
    
    // Preencher checkboxes
    if (urlParams.has('mei')) {
        document.getElementById('somente_mei').checked = urlParams.get('mei') === 'true';
    }
    
    if (urlParams.has('contato')) {
        document.getElementById('com_contato_telefonico').checked = urlParams.get('contato') === 'true';
    }
    
    if (urlParams.has('email')) {
        document.getElementById('com_email').checked = urlParams.get('email') === 'true';
    }
}

// Inicializar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
