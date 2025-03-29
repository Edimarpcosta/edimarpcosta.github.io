/**
 * Casa dos Dados - Extrator de Dados
 * Script aprimorado para extrair e processar dados de empresas
 * Versão 2.2 - Correção de paginação, tratamento robusto de erros, download parcial e inputs múltiplos.
 */

// Configuração principal
const config = {
    apiUrl: 'https://api.casadosdados.com.br/v2/public/cnpj/search',
    initialRetryTimeout: 60, // Tempo inicial de espera em segundos para erros (429 ou fetch)
    maxRetries: 3,           // Número máximo de tentativas para cada página
    itemsPerPage: 20,        // Itens por página (padrão da API Casa dos Dados)
    ufs: ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]
};

// Estado da aplicação
const state = {
    allData: [],             // Todos os dados acumulados
    isFetching: false,       // Flag de requisição em andamento
    fetchAborted: false,     // Flag se a busca foi abortada por erro persistente
    retryCount: 0,           // Contador de tentativas para a página atual
    currentRetryTimeout: 60, // Tempo atual de espera (começa com o inicial)
    waitTimer: null,         // Referência ao timer de espera
    currentPage: 1,          // Página atual sendo buscada
    totalPages: 0,           // Total de páginas (calculado após a primeira busca)
    totalCount: 0            // Total de registros (vindo da API)
};

// Elementos globais
let loadingElement;
let progressElement;
let progressTextElement;
let progressContainerElement;
let timerContainer;
let searchButton;
let downloadPartialButton;
let partialCountSpan;
let currentSearchResults = []; // Usado para preview/exportação final
let charts = {};

// Inicializar elementos quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    loadingElement = document.getElementById('loading');
    progressElement = document.getElementById('searchProgress');
    progressTextElement = document.getElementById('progressText');
    progressContainerElement = document.getElementById('progressContainer');
    timerContainer = document.getElementById('timerContainer');
    searchButton = document.getElementById('searchButton');
    downloadPartialButton = document.getElementById('downloadPartialButton');
    partialCountSpan = document.getElementById('partialCount');

    if (!loadingElement || !progressElement || !progressTextElement || !progressContainerElement || !timerContainer || !searchButton || !downloadPartialButton || !partialCountSpan) {
        console.error("ERRO CRÍTICO: Um ou mais elementos essenciais do DOM não foram encontrados. Verifique os IDs no HTML.");
        alert("Erro na inicialização da página. Verifique o console (F12).");
        return;
    }

    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Adicionar event listeners para botões
    document.getElementById('btnExportPreview')?.addEventListener('click', exportCurrentResults);
    document.getElementById('btnClosePreview')?.addEventListener('click', closePreview);
    document.getElementById('btnSearchCnae')?.addEventListener('click', searchCnae);
    downloadPartialButton.addEventListener('click', downloadCollectedData); // Listener para o novo botão

    // Inicializar os selects
    document.getElementById('uf').value = 'SP';

    // Adicionar event listeners para campos relacionados e lógica exclusiva
    setupExclusiveCheckboxes();
    setupDelayOptionsToggle();
    setupConfigInputs();

    // Inicialização geral
    init();
});

/**
 * Configura a lógica para checkboxes mutuamente exclusivos
 */
function setupExclusiveCheckboxes() {
    const exclusivePairs = [
        ['somente_mei', 'excluir_mei'],
        ['somente_celular', 'somente_fixo'],
        ['somente_matriz', 'somente_filial']
    ];

    exclusivePairs.forEach(pair => {
        const el1 = document.getElementById(pair[0]);
        const el2 = document.getElementById(pair[1]);
        if (el1 && el2) {
            el1.addEventListener('change', function() { if (this.checked) el2.checked = false; });
            el2.addEventListener('change', function() { if (this.checked) el1.checked = false; });
        }
    });
}

/**
 * Configura o toggle para opções de atraso de requisição
 */
function setupDelayOptionsToggle() {
    const enableDelayedRequests = document.getElementById('enableDelayedRequests');
    const delayOptionsContainer = document.getElementById('delayOptionsContainer');

    if (!enableDelayedRequests || !delayOptionsContainer) return;

    function toggleDelayOptions() {
        delayOptionsContainer.style.display = enableDelayedRequests.checked ? 'block' : 'none';
    }

    toggleDelayOptions(); // Estado inicial
    enableDelayedRequests.addEventListener('change', toggleDelayOptions);
}

/**
 * Configura listeners para os inputs de configuração (timeout, retries)
 */
function setupConfigInputs() {
    const retryTimeoutInput = document.getElementById('retryTimeoutInput');
    if (retryTimeoutInput) {
        retryTimeoutInput.value = config.initialRetryTimeout; // Define valor inicial
        retryTimeoutInput.addEventListener('change', function() {
            const value = parseInt(this.value);
            if (value >= 5 && value <= 300) {
                config.initialRetryTimeout = value;
                // Atualiza o state.currentRetryTimeout apenas se não estiver em uma espera ativa
                if (!state.waitTimer) {
                    state.currentRetryTimeout = value;
                }
            } else {
                this.value = config.initialRetryTimeout; // Reseta se inválido
                showToast(`Tempo de espera deve ser entre 5 e 300 segundos.`, 'warning');
            }
        });
    }

    const maxRetriesInput = document.getElementById('maxRetries');
    if (maxRetriesInput) {
        maxRetriesInput.value = config.maxRetries; // Define valor inicial
        maxRetriesInput.addEventListener('change', function() {
            const value = parseInt(this.value);
            if (value >= 1 && value <= 10) {
                config.maxRetries = value;
            } else {
                this.value = config.maxRetries; // Reseta se inválido
                showToast(`Número máximo de tentativas deve ser entre 1 e 10.`, 'warning');
            }
        });
    }
}

/**
 * Cria o JSON para a pesquisa e inicia o processo de busca
 */
function createJson() {
    if (!validateForm()) {
        return;
    }

    resetState(); // Reseta o estado antes de uma nova busca

    // Esconder elementos de resultados anteriores
    document.getElementById('resultsPreview').style.display = 'none';
    document.getElementById('statistics').style.display = 'none';
    document.getElementById('prospectingTools').style.display = 'none';

    // Mostrar indicador de carregamento e resetar progresso
    loadingElement.style.display = 'block';
    progressContainerElement.style.display = 'block';
    updateProgress(0, 'Iniciando busca...');

    // Desabilitar botões
    searchButton.disabled = true;
    searchButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Buscando...';
    downloadPartialButton.disabled = true;
    downloadPartialButton.style.display = 'none'; // Esconder até ter dados
    updatePartialCount(0);

    // Obter o nome do arquivo
    let outputFilename = document.getElementById('fileName').value.trim();
    if (!outputFilename) {
        const municipioset = getArrayFromInput('municipio').join('_') || 'resultado'; // Usa múltiplos municípios se houver
        outputFilename = cleanFileName(municipioset);
    } else {
        outputFilename = cleanFileName(outputFilename);
    }

    // Coletar dados do formulário
    const formData = {
        termo: getArrayFromInput('termo'),
        atividade_principal: getArrayFromInput('atividade_principal'),
        incluir_atividade_secundaria: document.getElementById('incluir_atividade_secundaria').checked,
        natureza_juridica: document.getElementById('natureza_juridica').value ? [document.getElementById('natureza_juridica').value] : [],
        situacaoCadastral: getCheckedRadioValue('situacao_cadastral'),
        cep: getArrayFromInput('cep'), // Usa getArrayFromInput
        uf: document.getElementById('uf').value ? [document.getElementById('uf').value] : [],
        municipio: getArrayFromInput('municipio'), // Usa getArrayFromInput
        bairro: getArrayFromInput('bairro'), // Usa getArrayFromInput
        ddd: getArrayFromInput('ddd'), // Usa getArrayFromInput
        data_abertura_lte: document.getElementById('data_abertura_lte').value || null, // Garante null se vazio
        data_abertura_gte: document.getElementById('data_abertura_gte').value || null, // Garante null se vazio
        capital_abertura_lte: document.getElementById('capital_abertura_lte').value || null, // Garante null se vazio
        capital_abertura_gte: document.getElementById('capital_abertura_gte').value || null, // Garante null se vazio
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
        enableDelayedRequests: document.getElementById('enableDelayedRequests').checked,
        delayStartPage: parseInt(document.getElementById('delayStartPage').value) || 10,
        delaySeconds: parseInt(document.getElementById('delaySeconds').value) || 3,
        exportFormat: getCheckedRadioValue('exportFormat') || 'xlsx' // Padrão para xlsx se nada for selecionado
    };

    // Atualizar configurações de retry com base nos inputs (já feito nos listeners, mas garante aqui)
    config.initialRetryTimeout = parseInt(document.getElementById('retryTimeoutInput')?.value || 30);
    config.maxRetries = parseInt(document.getElementById('maxRetries')?.value || 3);
    state.currentRetryTimeout = config.initialRetryTimeout; // Resetar timeout atual

    // Limpar alertas de erro anteriores (se houver um container para eles)
    // const loadingAlertsElement = document.getElementById('loadingAlerts');
    // if (loadingAlertsElement) loadingAlertsElement.innerHTML = '';

    // Iniciar estado de busca
    state.isFetching = true;
    state.fetchAborted = false;
    state.currentPage = formData.pagina;
    state.totalPages = 0; // Será definido após a primeira busca bem-sucedida
    state.totalCount = 0;

    // Iniciar a busca recursiva
    fetchAllPages(formData, outputFilename)
        .finally(() => {
            // Restaurar botão de pesquisa
            searchButton.disabled = false;
            searchButton.innerHTML = '<i class="fas fa-search"></i> Pesquisar';
            state.isFetching = false;
            hideWaitTimer(); // Garante que o timer seja escondido
            // Esconde o loading principal, mas mantém o progresso se houver resultados
            if (state.allData.length === 0 && !state.fetchAborted) {
                 loadingElement.style.display = 'none';
                 progressContainerElement.style.display = 'none';
            } else if (!state.fetchAborted) {
                 loadingElement.style.display = 'none'; // Esconde spinner, mantém progresso/resultados
            }
            // Mantém o botão de download parcial visível e habilitado se houver dados
             if (state.allData.length > 0) {
                 downloadPartialButton.disabled = false;
                 downloadPartialButton.style.display = 'block';
             }
        });
}

/**
 * Reseta o estado da aplicação para uma nova busca
 */
function resetState() {
    state.allData = [];
    state.retryCount = 0;
    state.currentRetryTimeout = config.initialRetryTimeout; // Usa o valor atual da config
    state.currentPage = parseInt(document.getElementById('pagina')?.value || 1);
    state.totalPages = 0;
    state.totalCount = 0;
    state.isFetching = false;
    state.fetchAborted = false;
    currentSearchResults = [];

    // Limpar timer se estiver ativo
    if (state.waitTimer) {
        clearInterval(state.waitTimer);
        state.waitTimer = null;
    }
    hideWaitTimer(); // Garante que a UI do timer seja escondida

    // Resetar botão de download parcial
    if (downloadPartialButton) {
        downloadPartialButton.disabled = true;
        downloadPartialButton.style.display = 'none';
        updatePartialCount(0);
    }

     // Resetar progresso visual
     updateProgress(0, 'Pronto para nova busca.');
     // Ocultar container de progresso se não houver busca ativa
     if (progressContainerElement) progressContainerElement.style.display = 'none';
     if (loadingElement) loadingElement.style.display = 'none';

     // Limpar gráficos
     destroyCharts();
}

/**
 * Valida o formulário antes do envio
 * @returns {Boolean} Resultado da validação
 */
function validateForm() {
    // Verificar se pelo menos um critério de busca foi informado (exceto paginação/config)
    const hasTermo = document.getElementById('termo').value.trim() !== '';
    const hasAtividade = document.getElementById('atividade_principal').value.trim() !== '';
    const hasUf = document.getElementById('uf').value !== '';
    const hasMunicipio = document.getElementById('municipio').value.trim() !== '';
    const hasNatureza = document.getElementById('natureza_juridica').value !== '';
    const hasDataGte = document.getElementById('data_abertura_gte').value !== '';
    const hasDataLte = document.getElementById('data_abertura_lte').value !== '';
    const hasCapitalGte = document.getElementById('capital_abertura_gte').value !== '';
    const hasCapitalLte = document.getElementById('capital_abertura_lte').value !== '';
    const hasDdd = document.getElementById('ddd').value.trim() !== '';

    if (!hasTermo && !hasAtividade && !hasUf && !hasMunicipio && !hasNatureza && !hasDataGte && !hasDataLte && !hasCapitalGte && !hasCapitalLte && !hasDdd) {
        showToast('Informe pelo menos um critério de busca (Ex: Termo, Atividade, UF, Município, Data, Capital, DDD).', 'warning');
        return false;
    }

    // Validações de campos exclusivos já são tratadas pelos listeners, mas verificamos aqui por segurança
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

    // Validar inputs numéricos de configuração
    const retryTimeout = parseInt(document.getElementById('retryTimeoutInput')?.value || 30);
    const maxRetries = parseInt(document.getElementById('maxRetries')?.value || 3);
    if (retryTimeout < 5 || retryTimeout > 300) {
         showToast(`Tempo de espera inválido (${retryTimeout}s). Use entre 5 e 300.`, 'warning');
         return false;
    }
     if (maxRetries < 1 || maxRetries > 10) {
         showToast(`Número de tentativas inválido (${maxRetries}). Use entre 1 e 10.`, 'warning');
         return false;
    }


    return true;
}

/**
 * Limpa o nome do arquivo para evitar caracteres inválidos
 * @param {string} fileName - Nome do arquivo original
 * @returns {string} - Nome do arquivo limpo
 */
function cleanFileName(fileName) {
    if (!fileName) return 'resultado_extracao';
    return fileName
        .normalize('NFD')              // Separa acentos
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s-]/g, '')      // Remove caracteres não alfanuméricos (exceto espaço e hífen)
        .trim()                        // Remove espaços no início/fim
        .replace(/[-\s]+/g, '_')       // Substitui espaços/hífens por underscore
        .toLowerCase() || 'resultado_extracao'; // Garante um nome padrão se tudo for removido
}

/**
 * Obtém um array de valores a partir de um input de texto com valores separados por vírgula
 * @param {string} elementId - ID do elemento input
 * @returns {Array<string>} - Array de strings sem espaços em branco extras e sem vazios
 */
function getArrayFromInput(elementId) {
    const inputElement = document.getElementById(elementId);
    if (!inputElement) return [];
    const value = inputElement.value;
    if (!value) return [];
    return value.split(',')            // Divide por vírgula
                .map(item => item.trim()) // Remove espaços extras
                .filter(item => item !== ''); // Remove itens vazios
}


/**
 * Obtém o valor de um botão radio selecionado
 * @param {string} name - Nome do grupo de radio buttons
 * @returns {string | null} - Valor do radio button selecionado ou null se nenhum for selecionado
 */
function getCheckedRadioValue(name) {
    const elements = document.getElementsByName(name);
    for (let i = 0; i < elements.length; i++) {
        if (elements[i].checked) {
            return elements[i].value;
        }
    }
    return null; // Retorna null se nada estiver selecionado
}

/**
 * Atualiza a mensagem de carregamento principal
 * @param {string} message - Mensagem a ser exibida
 */
function updateLoadingMessage(message) {
    const loadingTextElement = document.getElementById('loadingMessage');
    if (loadingTextElement) {
        loadingTextElement.textContent = message;
    }
}

/**
 * Atualiza a barra de progresso e o texto associado
 * @param {number} percent - Porcentagem de progresso (0-100)
 * @param {string} message - Mensagem a ser exibida
 */
function updateProgress(percent, message) {
    const clampedPercent = Math.max(0, Math.min(100, Math.round(percent))); // Garante 0-100

    if (progressElement) {
        progressElement.style.width = `${clampedPercent}%`;
        progressElement.setAttribute('aria-valuenow', clampedPercent);
        progressElement.textContent = `${clampedPercent}%`; // Mostra porcentagem na barra
    }

    if (progressTextElement) {
        progressTextElement.textContent = message;
    }
}

/**
 * Atualiza o contador no botão de download parcial
 * @param {number} count - Número de registros coletados
 */
function updatePartialCount(count) {
    if (partialCountSpan) {
        partialCountSpan.textContent = count;
    }
}

/**
 * Função principal para buscar todas as páginas de resultados
 * @param {Object} formData - Dados do formulário coletados
 * @param {string} outputFilename - Nome do arquivo para exportação
 * @returns {Promise<Array>} - Promise com todos os resultados coletados (ou parcial em caso de erro)
 */
async function fetchAllPages(formData, outputFilename) {
    let firstFetch = true; // Flag para processamento especial na primeira busca

    updateLoadingMessage(`Iniciando busca a partir da página ${state.currentPage}...`);

    while (state.isFetching) {
        try {
            // --- Lógica de Atraso Opcional ---
            const useDelay = formData.enableDelayedRequests && state.currentPage >= formData.delayStartPage;
            if (useDelay && !firstFetch) { // Não atrasa na primeira página da busca
                const delayMs = (formData.delaySeconds || 3) * 1000;
                updateLoadingMessage(`Aguardando ${formData.delaySeconds}s antes de buscar página ${state.currentPage}...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            // --- Busca da Página Atual ---
            updateLoadingMessage(`Buscando página ${state.currentPage}...`);
            const pageResult = await fetchPage(state.currentPage, formData); // fetchPage agora trata retries internos

            // --- Processamento da Primeira Página ---
            if (firstFetch && pageResult.totalCount > 0) {
                state.totalCount = pageResult.totalCount;
                state.totalPages = Math.ceil(state.totalCount / config.itemsPerPage);
                updateProgress(0, `Encontrados ${state.totalCount} registros em ${state.totalPages} páginas. Buscando...`);
                firstFetch = false; // Já processou a primeira página
            }

            // --- Processamento de Resultados ---
            if (pageResult.cnpjs && pageResult.cnpjs.length > 0) {
                state.allData = state.allData.concat(pageResult.cnpjs);
                updatePartialCount(state.allData.length); // Atualiza contador parcial

                // Habilita botão de download parcial assim que tiver dados
                 if (state.allData.length > 0 && downloadPartialButton.disabled) {
                    downloadPartialButton.disabled = false;
                    downloadPartialButton.style.display = 'block'; // Mostra o botão
                 }

                // Atualiza progresso
                const progressPercent = state.totalPages > 0 ? (state.currentPage / state.totalPages) * 100 : 0;
                updateProgress(progressPercent, `Página ${state.currentPage}/${state.totalPages || '?'} | ${state.allData.length} de ${state.totalCount || '?'} registros (${Math.round(progressPercent)}%)`);

            }

            // --- Condição de Parada ---
            // Parar se:
            // 1. A API indicar que não há mais páginas (considerando a página atual)
            // 2. A página atual for a última calculada E a API retornou resultados OU não retornou totalCount
            // 3. A página retornou vazia (garantia extra)
            const isLastPageAccordingToApi = (state.currentPage * config.itemsPerPage) >= state.totalCount;
            const isLastCalculatedPage = state.totalPages > 0 && state.currentPage >= state.totalPages;

             if (isLastPageAccordingToApi || isLastCalculatedPage || pageResult.cnpjs.length === 0) {
                 console.log(`Condição de parada atingida. API diz última: ${isLastPageAccordingToApi}, Calculado diz último: ${isLastCalculatedPage}, Página vazia: ${pageResult.cnpjs.length === 0}. Página atual: ${state.currentPage}, Total Páginas: ${state.totalPages}`);
                state.isFetching = false; // Termina o loop while
                break;
            }

            // --- Avança para próxima página ---
            state.currentPage++;

        } catch (error) {
            // Erros de 'fetchPage' (após retries falharem) são pegos aqui
            console.error(`ERRO FATAL na busca da página ${state.currentPage}:`, error);
            showToast(`Erro ao buscar página ${state.currentPage} após ${config.maxRetries} tentativas: ${error.message}. Busca interrompida.`, "error");
            updateLoadingMessage(`Erro na página ${state.currentPage}. Busca interrompida.`);
            updateProgress(state.totalPages > 0 ? (state.currentPage / state.totalPages) * 100 : 0, `Erro na página ${state.currentPage}.`);
            state.isFetching = false; // Interrompe o loop while
            state.fetchAborted = true; // Marca que a busca não foi completa
            break; // Sai do loop while
        }
    } // Fim do while(state.isFetching)

    // --- Finalização da Busca (Completa ou Parcial) ---
    currentSearchResults = state.allData; // Guarda os resultados para preview/export

    if (state.allData.length > 0) {
        const finalMessage = state.fetchAborted
            ? `Busca interrompida por erro. ${state.allData.length} registros foram coletados.`
            : `Busca concluída! ${state.allData.length} registros encontrados.`;

        updateProgress(100, finalMessage);
        showToast(finalMessage, state.fetchAborted ? "warning" : "success");

        // Mostrar preview ou exportar diretamente
        if (formData.preview && !state.fetchAborted) { // Só mostra preview se não abortou
            updateLoadingMessage(`Preparando visualização de ${state.allData.length} registros...`);
            showResultsPreview(state.allData);
            generateStatistics(state.allData); // Gera estatísticas
            document.getElementById('prospectingTools').style.display = 'block'; // Mostra ferramentas
        } else {
            // Exporta o que foi coletado (completo ou parcial)
            updateLoadingMessage(`Exportando ${state.allData.length} registros...`);
             downloadData(state.allData, outputFilename, formData.exportFormat); // Chama a função de download
        }
         // Garante que o botão de download parcial esteja ativo e atualizado
         downloadPartialButton.disabled = false;
         downloadPartialButton.style.display = 'block';
         updatePartialCount(state.allData.length);

    } else if (!state.fetchAborted) {
        showToast("Nenhum resultado encontrado para sua pesquisa.", "warning");
        updateProgress(100, "Nenhum resultado encontrado.");
    } // Se abortou e não coletou nada, a mensagem de erro já foi exibida

    return state.allData; // Retorna os dados coletados (parcial ou total)
}


/**
 * Busca uma página específica de resultados com tratamento de erro e retentativas.
 * @param {number} page - Número da página a buscar
 * @param {Object} formData - Dados do formulário
 * @returns {Promise<Object>} - Objeto com { cnpjs: Array, totalCount: number }
 * @throws {Error} - Lança erro se as retentativas falharem
 */
async function fetchPage(page, formData) {
    const requestData = buildRequestData(page, formData);
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
    };

    let attempt = 0;
    state.retryCount = 0; // Reseta contador de retry para esta PÁGINA
    state.currentRetryTimeout = config.initialRetryTimeout; // Reseta timeout para esta PÁGINA

    while (attempt <= config.maxRetries) {
        try {
            if (attempt > 0) {
                const waitTime = state.currentRetryTimeout;
                const nextRetryTimeout = state.currentRetryTimeout * 2; // Prepara próximo timeout (exponencial)
                const attemptMsg = `Erro ao buscar página ${page}. Tentativa ${attempt}/${config.maxRetries}. Aguardando ${waitTime}s...`;

                updateLoadingMessage(attemptMsg);
                console.warn(attemptMsg);
                showWaitTimer(waitTime, nextRetryTimeout); // Mostra timer para o usuário

                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));

                hideWaitTimer();
                state.currentRetryTimeout = nextRetryTimeout; // Aplica o próximo timeout para a tentativa seguinte
            }

            const response = await fetch(config.apiUrl, requestOptions);

            // --- Tratamento de Erros HTTP ---
            if (response.status === 429 || !response.ok) {
                 let errorReason = `HTTP ${response.status}`;
                 let errorBody = '';
                 try { errorBody = await response.text(); } catch (e) {} // Tenta pegar corpo do erro
                 if (response.status === 429) errorReason = "429 (Too Many Requests)";
                 console.error(`Falha na tentativa ${attempt} para página ${page}: ${errorReason}. Corpo: ${errorBody}`);
                 // Incrementa tentativa e continua o loop para retry
                 attempt++;
                 state.retryCount = attempt; // Atualiza estado global de retry (embora seja por página)
                 continue; // Próxima iteração do while (retry)
            }

            // --- Sucesso ---
            hideWaitTimer(); // Esconde timer se estava visível por erro anterior
            state.retryCount = 0; // Reseta contador GERAL de retry em caso de sucesso
            state.currentRetryTimeout = config.initialRetryTimeout; // Reseta timeout GERAL

            const result = await response.json();

            // Extrair dados relevantes
            const cnpjs = result.data?.cnpj || [];
            const totalCount = result.data?.count || 0; // Pega o total de registros da API

             // Formatar atividade principal aqui, antes de retornar
            const processedData = cnpjs.map(empresa => ({
                ...empresa,
                atividade_principal_formatada: formatarAtividadePrincipal(empresa) // Usa um campo novo para não sobrescrever o original
             }));


            // Retorna os dados da página e o totalCount
            return {
                cnpjs: processedData,
                totalCount: totalCount
            };

        } catch (error) { // Captura erros de rede (TypeError: Failed to fetch) ou JSON parse errors
            console.error(`Falha GERAL na tentativa ${attempt} para página ${page}:`, error);
            // Incrementa tentativa e continua o loop para retry
            attempt++;
            state.retryCount = attempt;
            // Não precisa mostrar timer aqui, pois o erro pode não ser de rate limit,
            // mas a lógica de espera no início do loop tratará disso.
            if (attempt <= config.maxRetries) {
                 updateLoadingMessage(`Erro de conexão/fetch na página ${page}. Tentativa ${attempt}/${config.maxRetries}...`);
            }
            continue; // Próxima iteração do while (retry)
        }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw new Error(`Falha ao buscar página ${page} após ${config.maxRetries} tentativas.`);
}


/**
 * Monta o objeto de dados para a requisição API
 * @param {number} page - Número da página
 * @param {Object} formData - Dados do formulário
 * @returns {Object} - Objeto pronto para ser enviado como JSON
 */
function buildRequestData(page, formData) {
     // Remover chaves com valores null, undefined ou arrays vazios para limpar a requisição
    const cleanQuery = Object.entries(formData.query || { // Cria query se não existir
         termo: formData.termo,
         atividade_principal: formData.atividade_principal,
         natureza_juridica: formData.natureza_juridica,
         uf: formData.uf,
         municipio: formData.municipio,
         bairro: formData.bairro,
         situacao_cadastral: formData.situacaoCadastral,
         cep: formData.cep,
         ddd: formData.ddd
    }).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)) {
            acc[key] = value;
        }
        return acc;
    }, {});

     const cleanRangeQuery = {
         data_abertura: {},
         capital_social: {}
     };
     if (formData.data_abertura_gte) cleanRangeQuery.data_abertura.gte = formData.data_abertura_gte;
     if (formData.data_abertura_lte) cleanRangeQuery.data_abertura.lte = formData.data_abertura_lte;
     if (formData.capital_abertura_gte) cleanRangeQuery.capital_social.gte = formData.capital_abertura_gte;
     if (formData.capital_abertura_lte) cleanRangeQuery.capital_social.lte = formData.capital_abertura_lte;

     // Remove sub-objetos vazios de range_query
     if (Object.keys(cleanRangeQuery.data_abertura).length === 0) delete cleanRangeQuery.data_abertura;
     if (Object.keys(cleanRangeQuery.capital_social).length === 0) delete cleanRangeQuery.capital_social;


    const requestData = {
        query: cleanQuery,
        range_query: cleanRangeQuery,
        extras: {
            somente_mei: formData.somente_mei,
            excluir_mei: formData.excluir_mei,
            com_email: formData.com_email,
            incluir_atividade_secundaria: formData.incluir_atividade_secundaria,
            com_contato_telefonico: formData.com_contato_telefonico,
            somente_celular: formData.somente_celular,
            somente_fixo: formData.somente_fixo,
            somente_matriz: formData.somente_matriz,
            somente_filial: formData.somente_filial
        },
        page: page
    };

     // Remove range_query se estiver completamente vazio
     if (Object.keys(requestData.range_query).length === 0) {
         delete requestData.range_query;
     }

     // Remove extras se todos forem false (ou padrão) - Opcional, mas limpa a requisição
     const hasExtras = Object.values(requestData.extras).some(value => value === true);
     if (!hasExtras) {
         // Poderia remover, mas a API pode esperar o objeto 'extras' mesmo vazio. Manter por segurança.
         // delete requestData.extras;
     }

    //console.log("Request Data for Page", page, ":", JSON.stringify(requestData, null, 2)); // Para debug
    return requestData;
}


/**
 * Mostra o timer de espera para erros (429 ou fetch)
 * @param {number} seconds - Segundos para esperar
 * @param {number} nextRetrySeconds - Segundos previstos para a próxima tentativa
 */
function showWaitTimer(seconds, nextRetrySeconds = null) {
    if (!timerContainer || !timerContainer.querySelector('.timer-countdown') || !timerContainer.querySelector('.timer-bar')) {
        console.error('Elementos do timer não encontrados no DOM');
        return;
    }

    const timerCountdown = timerContainer.querySelector('.timer-countdown');
    const timerNextRetry = timerContainer.querySelector('.timer-next-retry');
    const timerBar = timerContainer.querySelector('.timer-bar');
    const timerMessage = timerContainer.querySelector('.timer-message'); // Assumindo que existe

    // Mensagem padrão ou específica para 429
    timerMessage.textContent = state.retryCount > 0 && state.isFetching // Adapta msg se for retry de 429
        ? `Limite de requisições (429) atingido. Aguardando para tentar novamente:`
        : `Erro na requisição. Aguardando para tentar novamente (Tentativa ${state.retryCount}/${config.maxRetries}):`;


    timerContainer.style.display = 'flex'; // Tornar visível

    if (nextRetrySeconds && nextRetrySeconds > seconds) { // Só mostra se for maior que o atual
        timerNextRetry.textContent = `Próximo tempo de espera: ${nextRetrySeconds}s`;
        timerNextRetry.style.display = 'block';
    } else {
        timerNextRetry.style.display = 'none';
    }

    // Iniciar contagem regressiva visual
    timerCountdown.textContent = `${seconds}s`;
    timerBar.style.transition = 'none'; // Resetar transição para aplicar width instantaneamente
    timerBar.style.width = '100%';

    // Força reflow para garantir que a transição funcione corretamente depois
    void timerBar.offsetWidth;

    // Aplica a transição para a animação
    timerBar.style.transition = `width ${seconds}s linear`;
    timerBar.style.width = '0%';

    // Limpar intervalo anterior se existir
    if (state.waitTimer) clearInterval(state.waitTimer);

    // Configurar intervalo para atualizar contador
    let timeLeft = seconds;
    state.waitTimer = setInterval(() => {
        timeLeft--;
        timerCountdown.textContent = `${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(state.waitTimer);
            state.waitTimer = null;
            // Não esconder o timer aqui, ele será escondido antes da próxima tentativa ou no final
        }
    }, 1000);
}

/**
 * Esconde o timer de espera e limpa o intervalo
 */
function hideWaitTimer() {
    if (state.waitTimer) {
        clearInterval(state.waitTimer);
        state.waitTimer = null;
    }
    if (timerContainer) {
        timerContainer.style.display = 'none';
        // Resetar barra de progresso do timer para a próxima vez
        const timerBar = timerContainer.querySelector('.timer-bar');
        if (timerBar) {
            timerBar.style.transition = 'none';
            timerBar.style.width = '100%';
        }
    }
}

// --- Funções de Pré-visualização, Estatísticas e Exportação (mantidas como estavam, mas revisadas) ---

/**
 * Mostra uma pré-visualização dos resultados na tabela HTML
 * @param {Array} data - Array de dados a serem mostrados
 */
function showResultsPreview(data) {
    const previewDiv = document.getElementById('resultsPreview');
    const tableHeader = document.getElementById('previewTableHeader');
    const tableBody = document.getElementById('previewTableBody');
    const resultCountSpan = document.getElementById('resultCount'); // Span para o contador

    if (!previewDiv || !tableHeader || !tableBody || !resultCountSpan) {
        console.error("Elementos da tabela de preview não encontrados.");
        return;
    }

    if (!data || data.length === 0) {
        showToast("Não há dados para visualizar", "info");
        previewDiv.style.display = 'none'; // Esconde se não há dados
        return;
    }

    // Limpar conteúdo anterior
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';

    // Definir cabeçalhos prioritários e usar o campo formatado
    const priorityKeys = ['cnpj', 'razao_social', 'nome_fantasia', 'atividade_principal_formatada',
                         'telefone1', 'telefone2', 'email', 'municipio', 'uf', 'capital_social'];

    // Obter todas as chaves dos objetos (incluindo a formatada)
    const allKeys = new Set();
    data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));

    // Ordenar as chaves (prioritárias primeiro)
    const sortedKeys = [...allKeys].sort((a, b) => {
        const indexA = priorityKeys.indexOf(a);
        const indexB = priorityKeys.indexOf(b);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB; // Ambos prioritários
        if (indexA !== -1) return -1; // A é prioritário
        if (indexB !== -1) return 1;  // B é prioritário
        return a.localeCompare(b); // Ordem alfabética para os demais
    });

    // Limitar colunas para melhor visualização (opcional)
     const keysToShow = sortedKeys; //.slice(0, 10); // Descomente para limitar

    // Criar cabeçalhos da tabela
    keysToShow.forEach(key => {
        const th = document.createElement('th');
        th.textContent = formatColumnName(key); // Formata nome da coluna
        th.scope = 'col';
        tableHeader.appendChild(th);
    });

    // Preencher o corpo da tabela (limitado a 20 registros para preview)
    const previewData = data.slice(0, 20);
    previewData.forEach(item => {
        const tr = document.createElement('tr');
        keysToShow.forEach(key => {
            const td = document.createElement('td');
            let value = item.hasOwnProperty(key) ? item[key] : ''; // Pega o valor ou string vazia

            // Formatação específica para exibição na tabela
            if (key === 'cnpj') value = formatCNPJ(value);
            else if (key === 'telefone1' || key === 'telefone2') value = formatPhone(value);
            else if (key === 'capital_social') value = formatCurrency(value);
            else if (key === 'data_abertura' || key === 'data_situacao_cadastral') value = formatDate(value);
            else if (key === 'mei') value = value === true ? 'Sim' : (value === false ? 'Não' : ''); // Trata booleano
            else if (Array.isArray(value)) { // Trata arrays (ex: atividades secundárias)
                value = value.map(v => (typeof v === 'object' && v !== null ? v.text || JSON.stringify(v) : v)).join(', ');
            } else if (typeof value === 'object' && value !== null && key !== 'atividade_principal') { // Trata objetos (exceto a atividade já formatada)
                 value = JSON.stringify(value); // Representação JSON genérica
            } else if (key === 'atividade_principal' && typeof value === 'object' && value !== null) {
                 // Usa a versão já formatada se disponível, senão formata aqui
                 value = item.atividade_principal_formatada || formatarAtividadePrincipal(value);
            } else if (value === null || value === undefined) {
                value = ''; // Garante string vazia para nulos
            }

            td.textContent = value;
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });

    // Atualizar contador de resultados
    resultCountSpan.textContent = `${data.length} resultado(s)`; // Atualiza o span

    // Mostrar o preview
    previewDiv.style.display = 'block';
    // Rolar para a visualização
    previewDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Formata o nome da coluna (key) para exibição no cabeçalho da tabela/exportação
 * @param {string} key - Nome da chave do objeto
 * @returns {string} - Nome formatado
 */
function formatColumnName(key) {
    // Mapeamento de nomes específicos
    const nameMap = {
        'cnpj': 'CNPJ',
        'razao_social': 'Razão Social',
        'nome_fantasia': 'Nome Fantasia',
        'atividade_principal': 'Atividade Principal (Original)',
        'atividade_principal_formatada': 'Atividade Principal', // Usar este como principal na exibição
        'natureza_juridica': 'Natureza Jurídica',
        'telefone1': 'Telefone 1',
        'telefone2': 'Telefone 2',
        'email': 'E-mail',
        'municipio': 'Município',
        'uf': 'UF',
        'cep': 'CEP',
        'bairro': 'Bairro',
        'logradouro': 'Logradouro',
        'numero': 'Número',
        'complemento': 'Complemento',
        'capital_social': 'Capital Social',
        'data_abertura': 'Data Abertura',
        'situacao_cadastral': 'Situação Cadastral',
        'data_situacao_cadastral': 'Data Situação',
        'matriz_filial': 'Matriz/Filial',
        'porte': 'Porte',
        'mei': 'É MEI?',
        // Adicione outros mapeamentos conforme necessário
    };

    if (nameMap[key]) {
        return nameMap[key];
    }

    // Formatação genérica: substituir underscores e capitalizar
    return key.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Gera gráficos estatísticos com base nos dados coletados
 * @param {Array} data - Array de dados para análise
 */
function generateStatistics(data) {
    const statsDiv = document.getElementById('statistics');
    if (!statsDiv || !data || data.length === 0) return;

    destroyCharts(); // Limpar gráficos anteriores

    try {
        // 1. Distribuição Geográfica (UF)
        const geoData = data.reduce((acc, item) => {
            const uf = item.uf || 'N/I';
            acc[uf] = (acc[uf] || 0) + 1;
            return acc;
        }, {});
        createChart('geoDistribution', 'bar', geoData, 'Empresas por UF');

        // 2. Distribuição por Ano de Abertura
        const yearData = data.reduce((acc, item) => {
            if (item.data_abertura) {
                const year = new Date(item.data_abertura).getFullYear();
                if (!isNaN(year)) {
                    acc[year] = (acc[year] || 0) + 1;
                }
            }
            return acc;
        }, {});
         // Ordenar anos antes de criar o gráfico
         const sortedYearData = Object.entries(yearData)
             .sort(([yearA], [yearB]) => parseInt(yearA) - parseInt(yearB))
             .reduce((obj, [key, value]) => { obj[key] = value; return obj; }, {});
        createChart('dateDistribution', 'line', sortedYearData, 'Empresas por Ano de Abertura');

        // 3. Distribuição por Capital Social (Faixas)
        const capitalRanges = {
            'Até 10k': 0, '10k-50k': 0, '50k-100k': 0, '100k-500k': 0, '500k-1M': 0, '> 1M': 0, 'N/I': 0
        };
        data.forEach(item => {
            const capital = parseFloat(item.capital_social);
            if (isNaN(capital)) { capitalRanges['N/I']++; }
            else if (capital <= 10000) { capitalRanges['Até 10k']++; }
            else if (capital <= 50000) { capitalRanges['10k-50k']++; }
            else if (capital <= 100000) { capitalRanges['50k-100k']++; }
            else if (capital <= 500000) { capitalRanges['100k-500k']++; }
            else if (capital <= 1000000) { capitalRanges['500k-1M']++; }
            else { capitalRanges['> 1M']++; }
        });
        createChart('capitalDistribution', 'pie', capitalRanges, 'Distribuição por Capital Social');

        // 4. Tipo de Empresa (MEI vs Outros, Matriz vs Filial)
        const companyTypeData = data.reduce((acc, item) => {
            acc['MEI'] = (acc['MEI'] || 0) + (item.mei === true ? 1 : 0);
            acc['Outros'] = (acc['Outros'] || 0) + (item.mei === false ? 1 : 0);
            acc['Matriz'] = (acc['Matriz'] || 0) + (item.matriz_filial === 'MATRIZ' ? 1 : 0);
            acc['Filial'] = (acc['Filial'] || 0) + (item.matriz_filial === 'FILIAL' ? 1 : 0);
            return acc;
        }, {});
        createChart('companyTypeDistribution', 'doughnut', {
             'MEI': companyTypeData['MEI'], 'Outros Tipos': companyTypeData['Outros'],
             'Matriz': companyTypeData['Matriz'], 'Filial': companyTypeData['Filial']
         }, 'Tipos de Empresa');


        statsDiv.style.display = 'block'; // Mostra a seção de estatísticas
        statsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error("Erro ao gerar estatísticas:", error);
        showToast("Erro ao gerar gráficos de análise.", "error");
    }
}

/**
 * Cria um gráfico Chart.js em um container específico
 * @param {string} elementId - ID do elemento container (div)
 * @param {string} type - Tipo de gráfico ('bar', 'line', 'pie', 'doughnut')
 * @param {Object} dataObject - Objeto com { label: value }
 * @param {string} title - Título do gráfico
 */
function createChart(elementId, type, dataObject, title) {
    const container = document.getElementById(elementId);
    if (!container) return;

    // Limpar container e criar novo canvas
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const labels = Object.keys(dataObject);
    const data = Object.values(dataObject);

     // Paleta de cores base
     const baseColors = [
         'rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)',
         'rgba(255, 206, 86, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
         'rgba(99, 255, 132, 0.7)', 'rgba(162, 54, 235, 0.7)', 'rgba(192, 75, 192, 0.7)',
         'rgba(206, 255, 86, 0.7)', 'rgba(102, 153, 255, 0.7)', 'rgba(159, 255, 64, 0.7)'
     ];
     const borderColors = baseColors.map(color => color.replace('0.7', '1')); // Cores sólidas para bordas

     // Garante cores suficientes, repetindo a paleta se necessário
     const backgroundColors = Array.from({ length: labels.length }, (_, i) => baseColors[i % baseColors.length]);


    charts[elementId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                tension: type === 'line' ? 0.1 : undefined // Suavização para gráficos de linha
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Permite ajustar a altura
            plugins: {
                title: { display: true, text: title, font: { size: 16 } },
                legend: {
                     display: true, // Mostrar legenda por padrão
                     position: (type === 'pie' || type === 'doughnut') ? 'right' : 'top', // Posição da legenda
                 },
                 tooltip: { // Configuração de tooltips
                     callbacks: {
                         label: function(context) {
                             let label = context.dataset.label || '';
                             if (label) label += ': ';
                             if (context.parsed.y !== null && (type === 'bar' || type === 'line')) {
                                 label += context.parsed.y;
                             } else if (context.parsed !== null && (type === 'pie' || type === 'doughnut')) {
                                 label += context.parsed;
                                 // Calcular porcentagem para pie/doughnut
                                 const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                                 const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                 label += ` (${percentage}%)`;
                             }
                             return label;
                         }
                     }
                 }
            },
             scales: (type === 'bar' || type === 'line') ? { // Mostrar eixos apenas para bar/line
                 y: { beginAtZero: true }
             } : undefined // Sem eixos para pie/doughnut
        }
    });
}


/**
 * Destroi gráficos Chart.js existentes para liberar memória e evitar conflitos
 */
function destroyCharts() {
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            try {
                chart.destroy();
            } catch (e) {
                console.error("Erro ao destruir gráfico:", e);
            }
        }
    });
    charts = {}; // Limpa a referência
}

/**
 * Fecha a visualização de preview
 */
function closePreview() {
    const previewDiv = document.getElementById('resultsPreview');
    if (previewDiv) previewDiv.style.display = 'none';
}

/**
 * Exporta os resultados atualmente armazenados em `currentSearchResults`
 */
function exportCurrentResults() {
    if (!currentSearchResults || currentSearchResults.length === 0) {
        showToast("Não há dados na visualização atual para exportar", "warning");
        return;
    }

    // Obter nome do arquivo e formato do formulário
    let filename = document.getElementById('fileName').value.trim();
    if (!filename) {
        const municipioset = getArrayFromInput('municipio').join('_') || 'resultado_preview';
        filename = cleanFileName(municipioset);
    } else {
        filename = cleanFileName(filename);
    }
    const format = getCheckedRadioValue('exportFormat') || 'xlsx';

    downloadData(currentSearchResults, filename, format);
}


/**
 * Função wrapper para download dos dados coletados parcialmente
 */
function downloadCollectedData() {
     if (!state.allData || state.allData.length === 0) {
         showToast("Nenhum dado foi coletado ainda para download.", "warning");
         return;
     }

     // Obter nome do arquivo e formato do formulário
    let filename = document.getElementById('fileName').value.trim();
     if (!filename) {
         const municipioset = getArrayFromInput('municipio').join('_') || 'dados_coletados';
         filename = cleanFileName(municipioset + '_parcial'); // Adiciona sufixo
     } else {
         filename = cleanFileName(filename + '_parcial');
     }
     const format = getCheckedRadioValue('exportFormat') || 'xlsx';

     downloadData(state.allData, filename, format); // Usa state.allData
 }


/**
 * Função centralizada para exportar dados para CSV ou Excel
 * @param {Array} data - Array de objetos a serem exportados
 * @param {string} baseFilename - Nome base do arquivo (sem extensão)
 * @param {string} format - Formato desejado ('csv' ou 'xlsx')
 */
function downloadData(data, baseFilename, format) {
    if (!data || data.length === 0) {
        showToast(`Não há dados para exportar como ${format.toUpperCase()}.`, "warning");
        return;
    }

    // Prepara os dados formatando colunas importantes
    const preparedData = prepareDataForExport(data);

    const filename = cleanFileName(baseFilename); // Garante limpeza final

    if (format === 'xlsx') {
        exportToExcel(preparedData, filename);
    } else {
        exportToCSV(preparedData, `${filename}.csv`);
    }
}


/**
 * Exporta dados para um arquivo CSV formatado com TAB como separador
 * @param {Array} data - Array de objetos JÁ PREPARADOS a serem exportados
 * @param {string} fileName - Nome completo do arquivo de saída (com .csv)
 */
function exportToCSV(data, fileName) {
    if (!data || data.length === 0) return; // Segurança

    try {
        // Obter todas as chaves do primeiro objeto (assumindo que todos têm as mesmas após prepareDataForExport)
        const keys = Object.keys(data[0]);
        // Mapear para nomes de coluna formatados
        const header = keys.map(formatColumnName).join('\t') + '\n'; // Usa TAB como separador

        // Criar linhas, tratando valores
        const rows = data.map(obj => {
            return keys.map(key => {
                let value = obj[key];
                if (value === null || value === undefined) return '';

                // Escapar aspas duplas e substituir TABs e novas linhas dentro dos campos
                if (typeof value === 'string') {
                    value = value.replace(/"/g, '""'); // Escapa aspas duplas
                    value = value.replace(/\t/g, ' '); // Substitui TAB por espaço
                    value = value.replace(/\n|\r/g, ' '); // Substitui nova linha por espaço
                    // Envolve em aspas duplas se contiver o separador (TAB) ou aspas duplas
                     if (value.includes('\t') || value.includes('"')) {
                        value = `"${value}"`;
                    }
                }
                return value;
            }).join('\t'); // Usa TAB como separador
        }).join('\n');

        // Combinar cabeçalho e linhas (com BOM para UTF-8)
        const csvContent = '\ufeff' + header + rows;

        // Criar blob e link de download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // Limpeza
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);

        showToast(`Arquivo CSV "${fileName}" exportado com sucesso!`, 'success');
    } catch(error) {
        console.error('Erro ao exportar dados para CSV:', error);
        showToast(`Erro ao gerar arquivo CSV: ${error.message}`, 'error');
    }
}

/**
 * Exporta dados para um arquivo Excel (XLSX)
 * @param {Array} data - Array de objetos JÁ PREPARADOS a serem exportados
 * @param {string} fileName - Nome do arquivo de saída (sem extensão)
 */
function exportToExcel(data, fileName) {
    if (!data || data.length === 0) return; // Segurança
    if (typeof XLSX === 'undefined') {
         showToast('Erro: Biblioteca XLSX (SheetJS) não carregada.', 'error');
         console.error('XLSX library is not defined. Make sure xlsx.full.min.js is loaded.');
         return;
     }


    try {
         // Obter todas as chaves do primeiro objeto
         const keys = Object.keys(data[0]);
         // Mapear para nomes de coluna formatados para o cabeçalho
         const header = keys.map(formatColumnName);

         // Mapear os dados, garantindo que os tipos sejam adequados para Excel
         const rows = data.map(obj => {
             return keys.map(key => {
                 let value = obj[key];
                 if (value === null || value === undefined) return '';
                 // O Excel pode lidar com números e strings diretamente.
                 // Datas já foram formatadas como string em prepareDataForExport.
                 // Booleanos também foram convertidos para 'Sim'/'Não'.
                 return value;
             });
         });

        // Juntar cabeçalho e linhas
        const sheetData = [header, ...rows];

        // Criar worksheet e workbook
        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        // Ajustar largura das colunas (opcional, mas melhora a visualização)
        const colWidths = header.map((_, i) => {
             const maxLength = Math.max(
                 header[i]?.length || 0,
                 ...rows.map(row => row[i]?.toString().length || 0)
             );
             return { wch: Math.min(Math.max(maxLength, 10), 50) }; // min 10, max 50 chars
         });
        ws['!cols'] = colWidths;


        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Empresas'); // Nome da aba

        // Exportar o arquivo
        XLSX.writeFile(wb, `${fileName}.xlsx`, { bookType: 'xlsx', type: 'binary' });

        showToast(`Arquivo Excel "${fileName}.xlsx" exportado com sucesso!`, 'success');
    } catch(error) {
        console.error('Erro ao exportar dados para Excel:', error);
        showToast(`Erro ao gerar arquivo Excel: ${error.message}`, 'error');
    }
}


/**
 * Prepara os dados brutos da API para exportação, formatando campos chave.
 * @param {Array} data - Dados brutos da API
 * @returns {Array} - Dados normalizados e formatados para exportação
 */
function prepareDataForExport(data) {
    if (!data || data.length === 0) return [];

    // Determina todas as chaves possíveis nos dados brutos + a formatada
    const allKeys = new Set(['atividade_principal_formatada']); // Inclui a chave formatada
    data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));

    // Define a ordem desejada para as colunas na exportação
     const exportOrder = [
         'cnpj', 'razao_social', 'nome_fantasia', 'atividade_principal_formatada', 'natureza_juridica',
         'logradouro', 'numero', 'complemento', 'cep', 'bairro', 'municipio', 'uf',
         'email', 'telefone1', 'telefone2', 'capital_social', 'porte', 'mei',
         'situacao_cadastral', 'data_situacao_cadastral', 'data_abertura',
         'matriz_filial',
         // Adicione outras chaves que você quer garantir na exportação aqui
     ];

     // Cria um conjunto de chaves ordenadas: primeiro as da lista, depois as restantes em ordem alfabética
     const orderedKeys = [
         ...exportOrder,
         ...[...allKeys].filter(k => !exportOrder.includes(k)).sort()
     ];


    // Normaliza cada item
    return data.map(item => {
        const normalizedItem = {};
        orderedKeys.forEach(key => {
             let value = item.hasOwnProperty(key) ? item[key] : undefined; // Pega o valor original

             // Aplica formatações específicas para exportação
             if (value !== undefined && value !== null) {
                 switch (key) {
                     case 'cnpj': value = formatCNPJ(value); break;
                     case 'telefone1':
                     case 'telefone2': value = formatPhone(value); break;
                     case 'capital_social': value = formatCurrency(value); break;
                     case 'data_abertura':
                     case 'data_situacao_cadastral':
                     case 'data_situacao_especial':
                     case 'data_exclusao_simples': value = formatDate(value); break;
                     case 'mei': value = value === true ? 'Sim' : (value === false ? 'Não' : ''); break;
                     case 'natureza_juridica': // Formata se for objeto
                         if (typeof value === 'object' && value.codigo && value.descricao) {
                            value = `${value.codigo} - ${substituirCaracteres(value.descricao)}`;
                         } break;
                     case 'atividade_principal': // Mantém o objeto original ou string
                          // A versão formatada já está em 'atividade_principal_formatada'
                          // Não fazer nada aqui para manter o original se necessário
                          break;
                     case 'atividade_principal_formatada': // Já está formatado
                          break;
                     default:
                         // Tratar arrays (juntar com vírgula)
                         if (Array.isArray(value)) {
                              value = value.map(v => (typeof v === 'object' && v !== null ? v.text || JSON.stringify(v) : v)).join(', ');
                         }
                         // Tratar outros objetos (converter para JSON string)
                         else if (typeof value === 'object') {
                              value = JSON.stringify(value);
                         }
                 }
             }

             // Garante que o valor seja string vazia se for null/undefined após processamento
             normalizedItem[key] = (value === null || value === undefined) ? '' : value;
        });
        return normalizedItem;
    });
}

// --- Funções Auxiliares de Formatação ---

/**
 * Formata a atividade principal (objeto) em uma string legível
 * @param {Object} atividadeObj - Objeto da atividade principal da API
 * @returns {string} - String formatada "CODIGO - DESCRICAO" ou ""
 */
function formatarAtividadePrincipal(empresa) {
    const atividadeObj = empresa?.atividade_principal; // Acessa o objeto dentro da empresa
    if (!atividadeObj || !atividadeObj.codigo || !atividadeObj.descricao) {
        return "";
    }
    // Usa a função de substituição para limpar a descrição
    let descricaoLimpa = substituirCaracteres(atividadeObj.descricao);
    return `${atividadeObj.codigo} - ${descricaoLimpa}`;
}

/**
 * Substitui caracteres acentuados e cedilha
 * @param {string} str - String de entrada
 * @returns {string} - String limpa
 */
function substituirCaracteres(str) {
    if (!str) return '';
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos (acentos)
              .replace(/ç/gi, 'c');            // Substitui ç/Ç por c/C
}

/**
 * Formata CNPJ (XX.XXX.XXX/XXXX-XX)
 * @param {string} cnpj - CNPJ (apenas números ou formatado)
 * @returns {string} - CNPJ formatado ou original se inválido
 */
function formatCNPJ(cnpj) {
    if (!cnpj) return '';
    const cleanCnpj = String(cnpj).replace(/\D/g, ''); // Remove não dígitos
    if (cleanCnpj.length === 14) {
        return cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj; // Retorna original se não tiver 14 dígitos
}

/**
 * Formata Telefone ( (XX) XXXX-XXXX ou (XX) XXXXX-XXXX )
 * @param {string} phone - Telefone (apenas números ou formatado)
 * @returns {string} - Telefone formatado ou original se inválido
 */
function formatPhone(phone) {
    if (!phone) return '';
    const cleanPhone = String(phone).replace(/\D/g, '');
    const len = cleanPhone.length;
    if (len === 10) {
        return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (len === 11) {
        return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone; // Retorna original se não tiver 10 ou 11 dígitos
}

/**
 * Formata Data (DD/MM/AAAA) a partir de string ISO ou similar
 * @param {string} dateString - Data como string
 * @returns {string} - Data formatada ou "" se inválida
 */
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        // Tenta criar data, ajustando para UTC para evitar problemas de fuso horário na conversão simples
         const dateParts = dateString.split(/[-/]/); // Aceita YYYY-MM-DD ou YYYY/MM/DD
         let dateObj;
         if (dateParts.length === 3) {
             // Assumindo YYYY-MM-DD vindo da API
             dateObj = new Date(Date.UTC(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])));
         } else {
              dateObj = new Date(dateString); // Fallback para outros formatos
         }

        if (isNaN(dateObj.getTime())) return ''; // Verifica se a data é válida

        // Formata para DD/MM/YYYY
        const day = String(dateObj.getUTCDate()).padStart(2, '0');
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0'); // Mês é base 0
        const year = dateObj.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.warn(`Erro ao formatar data "${dateString}":`, error);
        return ''; // Retorna vazio se houver erro
    }
}

/**
 * Formata valor monetário (R$ X.XXX,XX)
 * @param {number|string} value - Valor numérico
 * @returns {string} - Valor formatado como moeda BRL ou "" se inválido
 */
function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '';
    const numValue = Number(value);
    if (isNaN(numValue)) return ''; // Retorna vazio se não for um número válido

    return numValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// --- Funções de UI Adicionais (Toast, CEP, CNAE) ---

/**
 * Exibe uma notificação toast
 * @param {string} message - Mensagem
 * @param {string} type - Tipo (success, error, warning, info) - Padrão 'info'
 */
function showToast(message, type = 'info') {
    const toastElement = document.getElementById('toast');
    const toastBodyElement = document.getElementById('toast-body');
    if (!toastElement || !toastBodyElement) {
        console.error('Elementos do toast não encontrados!');
        alert(message); // Fallback
        return;
    }

    toastBodyElement.innerText = message;
    toastElement.className = 'toast align-items-center text-white border-0'; // Reset classes
    let bgClass = 'bg-info'; // Padrão
    if (type === 'success') bgClass = 'bg-success';
    else if (type === 'error') bgClass = 'bg-danger';
    else if (type === 'warning') {
         bgClass = 'bg-warning';
         toastElement.classList.add('text-dark'); // Texto escuro para fundo amarelo
     }
    toastElement.classList.add(bgClass);

    try {
        const toast = bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 5000 });
        toast.show();
    } catch (error) {
         console.error('Erro ao exibir toast Bootstrap:', error);
         alert(message); // Fallback
     }
}

/**
 * Busca CEP usando a API ViaCEP
 * @param {string} cep - CEP (apenas números)
 */
function buscaCep(cep) {
    const cleanCep = String(cep).replace(/\D/g, '');
    if (cleanCep.length !== 8) {
        if (cep.length > 0) showToast("CEP deve conter 8 dígitos.", "warning");
        return;
    }

    // Mostrar algum indicador de loading para CEP (opcional)
     // document.getElementById('cep-loading-spinner').style.display = 'inline-block';

    fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        .then(response => {
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            return response.json();
        })
        .then(data => {
             // Esconder indicador de loading para CEP
             // document.getElementById('cep-loading-spinner').style.display = 'none';

            if (data.erro) {
                showToast("CEP não encontrado.", "warning");
            } else {
                document.getElementById('uf').value = data.uf || '';
                document.getElementById('municipio').value = data.localidade || '';
                document.getElementById('bairro').value = data.bairro || '';
                // Poderia preencher logradouro também, mas pode não ser desejável
                // document.getElementById('logradouro').value = data.logradouro || '';
                showToast(`Endereço localizado para ${data.cep}: ${data.localidade}/${data.uf}`, "success");
            }
        })
        .catch(error => {
            // Esconder indicador de loading para CEP
             // document.getElementById('cep-loading-spinner').style.display = 'none';
            console.error('Erro ao buscar CEP:', error);
            showToast(`Falha ao buscar CEP: ${error.message}`, "error");
        });
}

/**
 * Adiciona o CNAE selecionado no modal ao input principal
 * @param {string} cnae - Código CNAE a adicionar
 */
function selectCnae(cnae) {
    const cnaeInput = document.getElementById('atividade_principal');
    if (!cnaeInput) return;

    let currentValue = cnaeInput.value.trim();
    const cnaeList = currentValue ? currentValue.split(',').map(item => item.trim()) : [];

    if (!cnaeList.includes(cnae)) {
        cnaeInput.value = currentValue ? `${currentValue}, ${cnae}` : cnae;
        showToast(`CNAE ${cnae} adicionado.`, "success");
    } else {
        showToast(`CNAE ${cnae} já está na lista.`, "info");
    }

    // Fechar o modal CNAE
    const modalElement = document.getElementById('cnaeSugestoesModal');
    if (modalElement) {
         const modalInstance = bootstrap.Modal.getInstance(modalElement);
         if (modalInstance) modalInstance.hide();
     }
}

/**
 * Busca CNAEs (simulado - idealmente seria uma API)
 */
function searchCnae() {
    const searchTerm = document.getElementById('searchCnae')?.value.trim().toLowerCase();
    const resultsDiv = document.getElementById('cnaeResults');
    if (!searchTerm || !resultsDiv) return;

    // --- Simulação de busca ---
    // Em um cenário real, faria fetch para um endpoint que retorna CNAEs
    const mockCnaes = [
        { codigo: '1053800', descricao: 'Fabricação de sorvetes e outros gelados comestíveis', setor: 'Indústria' },
        { codigo: '4637106', descricao: 'Comércio atacadista de sorvetes', setor: 'Comércio' },
        { codigo: '4721104', descricao: 'Comércio varejista de doces, balas, bombons e semelhantes', setor: 'Comércio' },
        { codigo: '5611203', descricao: 'Lanchonetes, casas de chá, de sucos e similares', setor: 'Serviços' },
        { codigo: '1091101', descricao: 'Fabricação de produtos de panificação industrial', setor: 'Indústria' },
        { codigo: '1091102', descricao: 'Fabricação de produtos de padaria e confeitaria com predominância de produção própria', setor: 'Indústria' },
        { codigo: '4721102', descricao: 'Padaria e confeitaria com predominância de revenda', setor: 'Comércio' },
        { codigo: '4712100', descricao: 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns', setor: 'Comércio'},
        { codigo: '9602501', descricao: 'Cabeleireiros, manicure e pedicure', setor: 'Serviços'},
        // Adicione mais CNAEs mock se necessário
    ];

    const results = mockCnaes.filter(cnae =>
        cnae.codigo.includes(searchTerm) ||
        cnae.descricao.toLowerCase().includes(searchTerm) ||
        cnae.setor.toLowerCase().includes(searchTerm)
    );
    // --- Fim da Simulação ---

    resultsDiv.innerHTML = ''; // Limpa resultados anteriores
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="alert alert-warning" role="alert">Nenhum CNAE encontrado para o termo informado.</div>';
    } else {
        const listGroup = document.createElement('div');
        listGroup.className = 'list-group';
        results.forEach(cnae => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action';
            // Usa preventDefault para evitar # na URL e chama selectCnae
             item.onclick = (e) => { e.preventDefault(); selectCnae(cnae.codigo); };

            item.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${cnae.codigo.replace(/(\d{4})(\d{1})(\d{2})/, '$1-$2/$3')}</h6>
                    <small class="text-muted">${cnae.setor}</small>
                </div>
                <p class="mb-1">${cnae.descricao}</p>
            `;
            listGroup.appendChild(item);
        });
        resultsDiv.appendChild(listGroup);
    }
    showToast(`${results.length} CNAE(s) encontrado(s).`, "info");
}

/**
 * Função de inicialização principal do script
 */
function init() {
    console.log('Extrator Casa dos Dados v2.2 inicializado.');
    // Preencher formulário a partir da URL, se houver parâmetros
    fillFormFromURL();
    // Outras inicializações podem ser adicionadas aqui
}

/**
 * Preenche campos do formulário com base em parâmetros da URL (se existirem)
 */
function fillFormFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.toString() === '') return; // Sai se não houver parâmetros

    console.log("Preenchendo formulário a partir dos parâmetros da URL...");

    // Mapeamento de parâmetro URL -> ID do campo
    const paramMap = {
        'termo': 'termo',
        'atividade': 'atividade_principal',
        'natureza': 'natureza_juridica',
        'situacao': 'situacao_cadastral', // Para radio, tratar separadamente
        'cep': 'cep',
        'uf': 'uf',
        'municipio': 'municipio',
        'bairro': 'bairro',
        'ddd': 'ddd',
        'data_inicio': 'data_abertura_gte',
        'data_fim': 'data_abertura_lte',
        'capital_min': 'capital_abertura_gte',
        'capital_max': 'capital_abertura_lte',
        'pagina': 'pagina',
        'formato': 'exportFormat', // Para radio, tratar separadamente
        'preview': 'previewBeforeExport', // Para checkbox/switch
        'somente_mei': 'somente_mei',
        'excluir_mei': 'excluir_mei',
        'com_telefone': 'com_contato_telefonico',
        'somente_celular': 'somente_celular',
        'somente_fixo': 'somente_fixo',
        'somente_matriz': 'somente_matriz',
        'somente_filial': 'somente_filial',
        'com_email': 'com_email',
    };

    urlParams.forEach((value, key) => {
        const fieldId = paramMap[key];
        if (fieldId) {
            const element = document.getElementById(fieldId);
            if (element) {
                // Tratar diferentes tipos de input
                if (element.type === 'checkbox' || element.type === 'switch') {
                    element.checked = value === 'true' || value === '1';
                } else if (element.type === 'radio') {
                     // Para radios, precisamos encontrar o elemento com o VALOR correspondente
                     const radioElement = document.querySelector(`input[name="${fieldId}"][value="${value}"]`);
                     if (radioElement) radioElement.checked = true;
                 } else if (key === 'situacao' || key === 'formato') { // Tratamento especial para radios pelo nome
                      const radioElement = document.querySelector(`input[name="${fieldId}"][value="${value.toUpperCase()}"]`); // Tenta uppercase para situacao
                      if (radioElement) radioElement.checked = true;
                      else { // Tenta lowercase para formato
                          const radioElementLower = document.querySelector(`input[name="${fieldId}"][value="${value.toLowerCase()}"]`);
                          if (radioElementLower) radioElementLower.checked = true;
                      }
                 } else {
                    // Para text, number, date, select-one
                    element.value = value;
                }
                 console.log(` > Campo ${fieldId} (${element.type || element.tagName}) preenchido com: ${value}`);
            } else {
                 console.warn(` > Elemento com ID ${fieldId} não encontrado para o parâmetro ${key}.`);
            }
        } else {
             console.log(` > Parâmetro ${key} ignorado (sem mapeamento).`);
         }
    });

     showToast("Formulário preenchido com dados da URL.", "info");
     // Disparar eventos change para garantir que lógicas associadas sejam ativadas
     Object.values(paramMap).forEach(id => document.getElementById(id)?.dispatchEvent(new Event('change')));
}

// --- Execução Inicial ---
// O listener 'DOMContentLoaded' já chama init().
