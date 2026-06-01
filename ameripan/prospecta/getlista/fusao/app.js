/**
 * Motor de Fusão B2B: GetLista & Maps
 * Lógica do Client-Side e Algoritmo de Cruzamento Geográfico
 */

// Estado global dos arquivos carregados e dados processados
const state = {
    getlistaRaw: null,
    getlistaData: null,
    getlistaHeaders: null,
    
    mapsRaw: null,
    mapsData: null,
    mapsHeaders: null,
    
    resultEnriched: [],
    resultUnmatchedGetLista: [],
    resultUnmatchedMaps: [],
    manualMatchesHistory: [],
    
    matchStats: {
        totalGetLista: 0,
        totalMaps: 0,
        matched: 0,
        unmatchedGetLista: 0,
        unmatchedMaps: 0,
        rate: 0
    }
};

// Configurações do DOM
const DOM = {
    fileGetLista: document.getElementById('fileGetLista'),
    fileMaps: document.getElementById('fileMaps'),
    dropzoneGetLista: document.getElementById('dropzoneGetLista'),
    dropzoneMaps: document.getElementById('dropzoneMaps'),
    statusGetLista: document.getElementById('statusGetLista'),
    statusMaps: document.getElementById('statusMaps'),
    btnProcess: document.getElementById('btnProcess'),
    btnClearConsole: document.getElementById('btnClearConsole'),
    consoleLogs: document.getElementById('consoleLogs'),
    
    // Stats elements
    statsSection: document.getElementById('statsSection'),
    statMatchRate: document.getElementById('statMatchRate'),
    statRadialProgress: document.getElementById('statRadialProgress'),
    countGetListaTotal: document.getElementById('countGetListaTotal'),
    countMapsTotal: document.getElementById('countMapsTotal'),
    countMatched: document.getElementById('countMatched'),
    countUnmatched: document.getElementById('countUnmatched'),
    btnDownload: document.getElementById('btnDownload'),
    
    // Tab and Table elements
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    tblEnrichedHeaders: document.getElementById('tblEnrichedHeaders'),
    tblEnrichedBody: document.getElementById('tblEnrichedBody'),
    tblUnmatchedGetListaHeaders: document.getElementById('tblUnmatchedGetListaHeaders'),
    tblUnmatchedGetListaBody: document.getElementById('tblUnmatchedGetListaBody'),
    tblUnmatchedMapsHeaders: document.getElementById('tblUnmatchedMapsHeaders'),
    tblUnmatchedMapsBody: document.getElementById('tblUnmatchedMapsBody'),

    // Elementos da reconciliação manual
    manualMatchingContainer: document.getElementById('manualMatchingContainer'),
    searchManualGetLista: document.getElementById('searchManualGetLista'),
    searchManualMaps: document.getElementById('searchManualMaps'),
    lstManualGetLista: document.getElementById('lstManualGetLista'),
    lstManualMaps: document.getElementById('lstManualMaps'),
    lblGetListaUnmatchedCount: document.getElementById('lblGetListaUnmatchedCount'),
    lblMapsUnmatchedCount: document.getElementById('lblMapsUnmatchedCount'),
    manualMatchesHistoryBox: document.getElementById('manualMatchesHistoryBox'),
    lstManualMatchesHistory: document.getElementById('lstManualMatchesHistory')
};

// --- FUNÇÕES DE LOG DO CONSOLE ---
function log(message, type = 'info') {
    const time = new Date().toTimeString().split(' ')[0];
    const logElement = document.createElement('div');
    logElement.className = `log-entry log-${type}`;
    
    logElement.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-text">${message}</span>
    `;
    
    DOM.consoleLogs.appendChild(logElement);
    DOM.consoleLogs.parentElement.scrollTop = DOM.consoleLogs.parentElement.scrollHeight;
}

function formatCnpjForDisplay(cnpj) {
    if (!cnpj) return '-';
    const c = String(cnpj).replace(/\D/g, '');
    if (c.length !== 14) return cnpj;
    return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Limpar console
DOM.btnClearConsole.addEventListener('click', () => {
    DOM.consoleLogs.innerHTML = '';
    log('Console limpo. Pronto para novas operações.', 'system');
});

// --- DRAG AND DROP & UPLOAD ---
function setupDropzone(dropzone, fileInput, statusEl, fileKey) {
    // Clique abre seletor de arquivos de forma segura, sem causar dupla ativação (bloqueada pelos navegadores)
    dropzone.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });
    
    // Efeitos visuais
    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0], dropzone, statusEl, fileKey);
    });
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(e.dataTransfer.files[0], dropzone, statusEl, fileKey);
        }
    });
}

setupDropzone(DOM.dropzoneGetLista, DOM.fileGetLista, DOM.statusGetLista, 'getlista');
setupDropzone(DOM.dropzoneMaps, DOM.fileMaps, DOM.statusMaps, 'maps');

function handleFileSelect(file, dropzone, statusEl, fileKey) {
    if (!file) return;
    
    statusEl.innerText = 'Lendo arquivo...';
    log(`Carregando arquivo selecionado: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)...`, 'info');
    
    const reader = new FileReader();
    
    // Leitura binária para suportar XLSX/XLS e CSV de forma robusta
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Converte para JSON com cabeçalhos estruturados
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            
            if (jsonData.length === 0) {
                throw new Error('A planilha está vazia.');
            }
            
            // Extrai cabeçalhos reais
            const headers = getSheetHeaders(worksheet);
            
            state[`${fileKey}Raw`] = jsonData;
            state[`${fileKey}Data`] = jsonData;
            state[`${fileKey}Headers`] = headers;
            
            dropzone.classList.add('file-loaded');
            statusEl.innerText = `${file.name} • ${jsonData.length} linhas`;
            
            log(`Planilha <strong>${fileKey === 'getlista' ? 'GetLista' : 'Maps'}</strong> importada com sucesso. ${jsonData.length} registros e ${headers.length} colunas encontradas.`, 'success');
            
            checkProcessingReady();
            
        } catch (error) {
            console.error(error);
            dropzone.classList.remove('file-loaded');
            statusEl.innerText = 'Erro na leitura';
            log(`Falha ao ler planilha ${file.name}: ${error.message}`, 'error');
            state[`${fileKey}Raw`] = null;
            state[`${fileKey}Data`] = null;
            state[`${fileKey}Headers`] = null;
            checkProcessingReady();
        }
    };
    
    reader.onerror = function() {
        dropzone.classList.remove('file-loaded');
        statusEl.innerText = 'Erro de leitura';
        log(`Erro físico ao ler o arquivo ${file.name}.`, 'error');
        checkProcessingReady();
    };
    
    reader.readAsArrayBuffer(file);
}

function getSheetHeaders(worksheet) {
    const headers = [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    let C;
    const R = range.s.r; // primeira linha
    for (C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ c: C, r: R })];
        let hdr = "UNKNOWN " + C;
        if (cell && cell.t) hdr = XLSX.utils.format_cell(cell);
        headers.push(hdr);
    }
    return headers;
}

function checkProcessingReady() {
    if (state.getlistaData && state.mapsData) {
        DOM.btnProcess.removeAttribute('disabled');
        log('Ambas as planilhas foram carregadas. O motor de fusão está pronto para processar.', 'system');
    } else {
        DOM.btnProcess.setAttribute('disabled', 'true');
    }
}

// --- UTILITÁRIOS DE NORMALIZAÇÃO ---

// Normaliza o CEP para 8 números limpos
function normalizeCEP(cep) {
    if (!cep) return '';
    return cep.toString().replace(/\D/g, '').padStart(8, '0').substring(0, 8);
}

// Extrai o primeiro número puro da coluna correspondente
function extractFirstNumber(val) {
    if (val === undefined || val === null) return '';
    const valStr = val.toString().trim();
    const match = valStr.match(/\b\d+\b/);
    return match ? match[0] : '';
}

// Remove acentos e normaliza texto
function removeAccents(text) {
    if (!text) return '';
    return text.toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

// Limpa nome de rua para cruzamento geográfico robusto
function cleanStreetName(street) {
    if (!street) return '';
    let str = removeAccents(street.toLowerCase());
    
    // Remove prefixos comuns de endereços urbanos em português
    const prefixes = [
        /\brua\b/g, /\bavenida\b/g, /\bav\b/g, /\br\b/g, /\btravessa\b/g, /\btv\b/g,
        /\balameda\b/g, /\bal\b/g, /\bpraca\b/g, /\brodovia\b/g, /\brod\b/g,
        /\bchacara\b/g, /\bsitio\b/g, /\bfazenda\b/g, /\beco\b/g, /\bviaduto\b/g
    ];
    
    prefixes.forEach(pattern => {
        str = str.replace(pattern, '');
    });
    
    // Remove caracteres especiais, deixando apenas letras e números
    str = str.replace(/[^a-z0-9]/g, '');
    return str.trim();
}

// Extrai logradouro e número da string Maps (Fulladdress ou Street)
function parseMapsAddress(street, fullAddress) {
    let addressStr = street ? street : (fullAddress ? fullAddress : '');
    let streetName = '';
    let number = '';
    
    if (addressStr.includes(',')) {
        let parts = addressStr.split(',');
        streetName = parts[0].trim();
        let rest = parts.slice(1).join(',');
        
        // Pega o número antes do primeiro hífen ou vírgula
        let numMatch = rest.match(/^\s*([A-Za-z0-9\-/\s]+?)(?=\s*-|\s*,|$)/);
        if (numMatch) {
            number = numMatch[1].trim();
        } else {
            let fallbackNum = rest.match(/\b\d+\b/);
            if (fallbackNum) number = fallbackNum[0];
        }
    } else {
        if (addressStr.includes('-')) {
            let parts = addressStr.split('-');
            streetName = parts[0].trim();
            let numMatch = streetName.match(/\b\d+$/);
            if (numMatch) {
                number = numMatch[0];
                streetName = streetName.replace(/\b\d+$/, '').trim();
            }
        } else {
            streetName = addressStr;
        }
    }
    
    let cleanNum = number.replace(/\D/g, '');
    return {
        street: streetName,
        number: cleanNum || number
    };
}

// Busca coluna dinamicamente ignorando caixa e acentos
function getColumnValue(row, headers, possibleNames, defaultValue = '') {
    for (let name of possibleNames) {
        let cleanTarget = removeAccents(name.toLowerCase());
        for (let header of headers) {
            let cleanHeader = removeAccents(header.toLowerCase());
            if (cleanHeader === cleanTarget) {
                return row[header] !== undefined && row[header] !== null ? row[header] : defaultValue;
            }
        }
    }
    return defaultValue;
}

// Calcula similaridade de nomes comerciais
function getSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;
    let n1 = removeAccents(name1.toLowerCase()).replace(/[^a-z0-9]/g, '');
    let n2 = removeAccents(name2.toLowerCase()).replace(/[^a-z0-9]/g, '');
    
    if (n1 === n2) return 1.0;
    if (n1.includes(n2) || n2.includes(n1)) return 0.8;
    
    // Quebra em palavras significativas
    let words1 = name1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let words2 = name2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let intersection = words1.filter(w => words2.includes(w));
    return intersection.length / Math.max(words1.length, words2.length);
}

// Parsing de Redes Sociais se a coluna direta for nula
function parseSocialMedias(socialJson, platform) {
    if (!socialJson) return '';
    try {
        const parsed = JSON.parse(socialJson);
        return parsed[platform] || '';
    } catch (e) {
        return '';
    }
}

// --- COMPONENTES DE ENRIQUECIMENTO DE ENDEREÇOS VIA API ---

// Auxiliar para atualizar valores de colunas de forma robusta e case-insensitive
function setColumnValue(row, headers, possibleNames, value) {
    for (let name of possibleNames) {
        let cleanTarget = removeAccents(name.toLowerCase());
        for (let header of headers) {
            let cleanHeader = removeAccents(header.toLowerCase());
            if (cleanHeader === cleanTarget) {
                row[header] = value;
                return true;
            }
        }
    }
    // Caso a coluna não exista, adiciona sob o primeiro nome sugerido
    if (possibleNames.length > 0) {
        row[possibleNames[0]] = value;
        return true;
    }
    return false;
}

// Resolvedor para decodificar o payload serializado complexo do SvelteKit retornado pela API cnpja.com
function resolveCnpjaData(data) {
    try {
        if (!data || !data.nodes) return null;
        const dataNode = data.nodes.find(n => n && n.type === 'data' && Array.isArray(n.data));
        if (!dataNode) return null;
        const flatList = dataNode.data;
        
        const cache = new Map();
        function resolve(index) {
            if (index === null || index === undefined) return null;
            if (typeof index !== 'number') return index;
            if (cache.has(index)) return cache.get(index);
            
            const val = flatList[index];
            if (val === null || val === undefined) return val;
            if (Array.isArray(val)) {
                const arr = [];
                cache.set(index, arr);
                for (const item of val) {
                    arr.push(resolve(item));
                }
                return arr;
            }
            if (typeof val === 'object') {
                const obj = {};
                cache.set(index, obj);
                for (const key in val) {
                    obj[key] = resolve(val[key]);
                }
                return obj;
            }
            return val;
        }

        const root = resolve(0);
        const office = root?.office;
        if (!office) return null;
        
        return {
            logradouro: office.address ? `${office.address.street || ''}`.trim() : '',
            numero: office.address?.number || '',
            complemento: office.address?.details || '',
            bairro: office.address?.district || '',
            municipio: office.address?.city || '',
            uf: office.address?.state || '',
            cep: office.address?.zip ? String(office.address.zip).replace(/\D/g, '') : ''
        };
    } catch (e) {
        console.warn('Erro ao decodificar dados CNPJa:', e);
        return null;
    }
}

// Realiza consultas de CNPJ utilizando a fila de APIs com fallbacks
async function fetchCNPJAddress(cnpj) {
    // API 1: ReceitaWS
    try {
        const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.status !== 'ERROR' && data.logradouro) {
                return {
                    logradouro: data.logradouro,
                    numero: data.numero || '',
                    complemento: data.complemento || '',
                    bairro: data.bairro || '',
                    municipio: data.municipio || '',
                    uf: data.uf || '',
                    cep: data.cep ? data.cep.replace(/\D/g, '') : '',
                    api: 'ReceitaWS'
                };
            }
        }
    } catch (e) {
        console.warn(`ReceitaWS falhou para o CNPJ ${cnpj}:`, e);
    }

    // API 2: Publica CNPJ WS
    try {
        const response = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`);
        if (response.ok) {
            const data = await response.json();
            const est = data.estabelecimento;
            if (est && est.logradouro) {
                const streetType = est.tipo_logradouro ? est.tipo_logradouro + ' ' : '';
                return {
                    logradouro: streetType + est.logradouro,
                    numero: est.numero || '',
                    complemento: est.complemento || '',
                    bairro: est.bairro || '',
                    municipio: est.cidade ? est.cidade.nome : '',
                    uf: est.estado ? est.estado.sigla : '',
                    cep: est.cep ? est.cep.replace(/\D/g, '') : '',
                    api: 'Publica CNPJ WS'
                };
            }
        }
    } catch (e) {
        console.warn(`Publica CNPJ WS falhou para o CNPJ ${cnpj}:`, e);
    }

    // API 3: CNPJa
    try {
        const response = await fetch(`https://cnpja.com/office/${cnpj}/__data.json?x-sveltekit-invalidated=001`);
        if (response.ok) {
            const data = await response.json();
            const resolved = resolveCnpjaData(data);
            if (resolved && resolved.logradouro) {
                return {
                    logradouro: resolved.logradouro,
                    numero: resolved.numero || '',
                    complemento: resolved.complemento || '',
                    bairro: resolved.bairro || '',
                    municipio: resolved.municipio || '',
                    uf: resolved.uf || '',
                    cep: resolved.cep || '',
                    api: 'CNPJa'
                };
            }
        }
    } catch (e) {
        console.warn(`CNPJa falhou para o CNPJ ${cnpj}:`, e);
    }

    return null;
}

// Realiza consultas de CEP utilizando as APIs de fallback em último caso
async function fetchCEPAddress(cep) {
    if (!cep || cep.length < 8) return null;
    
    // API 4: BrasilAPI (CEP)
    try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.street) {
                return {
                    logradouro: data.street,
                    numero: '',
                    complemento: '',
                    bairro: data.neighborhood || '',
                    municipio: data.city || '',
                    uf: data.state || '',
                    cep: cep,
                    api: 'BrasilAPI (CEP)'
                };
            }
        }
    } catch (e) {
        console.warn(`BrasilAPI (CEP) falhou para o CEP ${cep}:`, e);
    }

    // API 5: ViaCEP
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.logradouro) {
                return {
                    logradouro: data.logradouro,
                    numero: '',
                    complemento: data.complemento || '',
                    bairro: data.bairro || '',
                    municipio: data.localidade || '',
                    uf: data.uf || '',
                    cep: cep,
                    api: 'ViaCEP'
                };
            }
        }
    } catch (e) {
        console.warn(`ViaCEP falhou para o CEP ${cep}:`, e);
    }

    return null;
}

// Orquestrador assíncrono principal para higienizar endereços faltantes por CNPJ
async function enrichIncompleteAddresses() {
    const getlista = state.getlistaData;
    const headers = state.getlistaHeaders;
    
    if (!getlista || getlista.length === 0) return;
    
    // Filtra apenas leads que não possuem endereço estruturado
    const incompleteLeads = [];
    getlista.forEach((row, idx) => {
        const logradouro = getColumnValue(row, headers, ['Logradouro']).toString().trim();
        const num = getColumnValue(row, headers, ['Número', 'Numero']).toString().trim();
        
        // Critério: Sem logradouro, ou apenas placeholder de vírgula
        if (!logradouro || logradouro === ',' || logradouro === '') {
            const cnpjRaw = getColumnValue(row, headers, ['CNPJ']);
            const cleanCnpj = cnpjRaw ? cnpjRaw.toString().replace(/\D/g, '').padStart(14, '0') : '';
            const cepRaw = getColumnValue(row, headers, ['CEP']);
            const cleanCep = cepRaw ? cepRaw.toString().replace(/\D/g, '') : '';
            const name = getColumnValue(row, headers, ['Razão Social', 'Razao Social']) || getColumnValue(row, headers, ['Nome Fantasia']) || `Lead #${idx + 1}`;
            
            if (cleanCnpj && cleanCnpj.length === 14) {
                incompleteLeads.push({ row, cnpj: cleanCnpj, cep: cleanCep, name, index: idx });
            }
        }
    });
    
    if (incompleteLeads.length === 0) {
        log('Todos os leads GetLista possuem endereço preenchido. Pulando etapa de enriquecimento.', 'success');
        return;
    }
    
    log(`[ENRIQUECIMENTO] Encontrados <strong>${incompleteLeads.length} leads sem endereço</strong>. Iniciando consulta de enriquecimento...`, 'system');
    
    for (let i = 0; i < incompleteLeads.length; i++) {
        const lead = incompleteLeads[i];
        log(`[ENRIQUECIMENTO] (${i+1}/${incompleteLeads.length}) Consultando dados para <strong>${lead.name}</strong> (CNPJ: ${formatCnpjForDisplay(lead.cnpj)})...`, 'info');
        
        // 1. Tenta enriquecer por CNPJ
        let result = await fetchCNPJAddress(lead.cnpj);
        
        // 2. Fallback: Se falhar, tenta por CEP (se CEP for válido)
        if (!result && lead.cep && lead.cep.length === 8 && lead.cep !== '13400000') {
            log(`[ENRIQUECIMENTO] Falha nas APIs de CNPJ para <strong>${lead.name}</strong>. Tentando CEP fallback (${lead.cep})...`, 'warning');
            result = await fetchCEPAddress(lead.cep);
        }
        
        // 3. Aplica o enriquecimento se houver resultado
        if (result) {
            setColumnValue(lead.row, headers, ['Logradouro'], result.logradouro);
            setColumnValue(lead.row, headers, ['Número', 'Numero'], result.numero);
            setColumnValue(lead.row, headers, ['Complemento'], result.complemento);
            setColumnValue(lead.row, headers, ['Bairro'], result.bairro);
            setColumnValue(lead.row, headers, ['Município', 'Municipio'], result.municipio);
            setColumnValue(lead.row, headers, ['UF'], result.uf);
            setColumnValue(lead.row, headers, ['CEP'], result.cep);
            setColumnValue(lead.row, headers, ['API Origem', 'API_Origem'], result.api);
            
            log(`[ENRIQUECIMENTO] Lead <strong>${lead.name}</strong> enriquecido com sucesso via <strong>${result.api}</strong>: ${result.logradouro}, ${result.numero || '(s/n)'} - ${result.bairro} (${result.cep})`, 'success');
        } else {
            log(`[ENRIQUECIMENTO] ❌ Não foi possível obter o endereço para <strong>${lead.name}</strong> através das APIs públicas de CNPJ ou CEP.`, 'error');
        }
        
        // Atraso de 1 segundo entre requisições para evitar rate-limit
        if (i < incompleteLeads.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// --- ALGORITMO PRINCIPAL DE RECONCILIAÇÃO ---
function processMerge() {
    log('Iniciando reconciliação georeferenciada...', 'info');
    
    const getlista = state.getlistaData;
    const maps = state.mapsData;
    const gHeaders = state.getlistaHeaders;
    const mHeaders = state.mapsHeaders;
    
    const useFallback = document.getElementById('chkFallbackStreet').checked;
    
    // Reinicializa histórico de matching manual
    state.manualMatchesHistory = [];
    
    // Mapeamento e limpeza de dados do Maps em Dicionários
    const mapsByCepNum = {};
    const mapsByStreetNum = {};
    
    log(`Preparando indexadores geográficos para ${maps.length} registros Maps...`, 'info');
    
    maps.forEach((mRow, idx) => {
        const fullAddr = getColumnValue(mRow, mHeaders, ['Fulladdress', 'address']);
        const street = getColumnValue(mRow, mHeaders, ['Street']);
        const name = getColumnValue(mRow, mHeaders, ['Name', 'Title']);
        
        // Extrai CEP do Fulladdress
        let cepVal = '';
        const cepMatch = fullAddr.match(/\b\d{5}-\d{3}\b/) || fullAddr.match(/\b\d{8}\b/);
        if (cepMatch) {
            cepVal = normalizeCEP(cepMatch[0]);
        }
        
        // Extrai logradouro e número
        const parsedAddr = parseMapsAddress(street, fullAddr);
        const cleanS = cleanStreetName(parsedAddr.street);
        const cleanN = extractFirstNumber(parsedAddr.number);
        
        const record = {
            row: mRow,
            index: idx,
            name: name,
            cep: cepVal,
            street_clean: cleanS,
            number_clean: cleanN,
            matched: false
        };
        
        // Indexa por CEP + Número
        if (cepVal && cleanN && cepVal !== '13400000') {
            const key = `${cepVal}_${cleanN}`;
            if (!mapsByCepNum[key]) mapsByCepNum[key] = [];
            mapsByCepNum[key].push(record);
        }
        
        // Indexa por Logradouro + Número
        if (cleanS && cleanN) {
            const key = `${cleanS}_${cleanN}`;
            if (!mapsByStreetNum[key]) mapsByStreetNum[key] = [];
            mapsByStreetNum[key].push(record);
        }
    });
    
    // Resultados finais
    const enriched = [];
    const unmatchedGetLista = [];
    
    let matchedCount = 0;
    
    log(`Processando cruzamento para ${getlista.length} leads GetLista...`, 'info');
    
    getlista.forEach((gRow, gIdx) => {
        const cepRaw = getColumnValue(gRow, gHeaders, ['CEP']);
        const cepClean = normalizeCEP(cepRaw);
        const numRaw = getColumnValue(gRow, gHeaders, ['Número', 'Numero']);
        const numClean = extractFirstNumber(numRaw);
        const logradouroRaw = getColumnValue(gRow, gHeaders, ['Logradouro']);
        const logradouroClean = cleanStreetName(logradouroRaw);
        
        const razaoSocial = getColumnValue(gRow, gHeaders, ['Razão Social', 'Razao Social']);
        const nomeFantasiaGL = getColumnValue(gRow, gHeaders, ['Nome Fantasia']);
        
        let matchRecord = null;
        let matchMethod = '';
        
        // NÍVEL 1: Match por CEP + Número (se CEP válido e não genérico)
        if (cepClean && numClean && cepClean !== '13400000') {
            const key = `${cepClean}_${numClean}`;
            const candidates = mapsByCepNum[key];
            if (candidates && candidates.length > 0) {
                // Filtra candidatos não casados ainda
                const activeCandidates = candidates.filter(c => !c.matched);
                if (activeCandidates.length === 1) {
                    matchRecord = activeCandidates[0];
                    matchMethod = 'CEP+NUM';
                } else if (activeCandidates.length > 1) {
                    // Múltiplos candidatos: desempata por nome
                    let bestScore = -1;
                    let bestCand = null;
                    activeCandidates.forEach(cand => {
                        const score = Math.max(
                            getSimilarity(razaoSocial, cand.name),
                            getSimilarity(nomeFantasiaGL, cand.name)
                        );
                        if (score > bestScore) {
                            bestScore = score;
                            bestCand = cand;
                        }
                    });
                    matchRecord = bestCand;
                    matchMethod = `CEP+NUM (Desempate Nome: ${(bestScore*100).toFixed(0)}%)`;
                }
            }
        }
        
        // NÍVEL 2: Match por Logradouro + Número (se CEP geral ou se nível 1 falhou)
        if (!matchRecord && useFallback && logradouroClean && numClean) {
            const key = `${logradouroClean}_${numClean}`;
            const candidates = mapsByStreetNum[key];
            if (candidates && candidates.length > 0) {
                const activeCandidates = candidates.filter(c => !c.matched);
                if (activeCandidates.length === 1) {
                    matchRecord = activeCandidates[0];
                    matchMethod = 'LOGRADOURO+NUM';
                } else if (activeCandidates.length > 1) {
                    let bestScore = -1;
                    let bestCand = null;
                    activeCandidates.forEach(cand => {
                        const score = Math.max(
                            getSimilarity(razaoSocial, cand.name),
                            getSimilarity(nomeFantasiaGL, cand.name)
                        );
                        if (score > bestScore) {
                            bestScore = score;
                            bestCand = cand;
                        }
                    });
                    matchRecord = bestCand;
                    matchMethod = `LOGRADOURO+NUM (Desempate Nome: ${(bestScore*100).toFixed(0)}%)`;
                }
            }
        }
        
        // Se encontrou um match, extrai dados enriquecidos
        if (matchRecord) {
            matchRecord.matched = true;
            matchedCount++;
            
            const mRow = matchRecord.row;
            const nomeFantasiaMaps = getColumnValue(mRow, mHeaders, ['Name', 'Title']);
            
            // Regra de fallback para Nome Fantasia: herda Maps se getlista estiver nulo/vazio
            const nomeFantasiaFinal = (nomeFantasiaGL && nomeFantasiaGL.trim()) ? nomeFantasiaGL : nomeFantasiaMaps;
            
            // Coleta de redes sociais com fallback de JSON se necessário
            let fb = getColumnValue(mRow, mHeaders, ['Facebook']);
            let ig = getColumnValue(mRow, mHeaders, ['Instagram']);
            const socialJson = getColumnValue(mRow, mHeaders, ['Social Medias']);
            
            if (!fb && socialJson) fb = parseSocialMedias(socialJson, 'facebook');
            if (!ig && socialJson) ig = parseSocialMedias(socialJson, 'instagram');
            
            // Criação do objeto final com as 40 colunas mapeadas
            // Criação do objeto final com as 40 colunas mapeadas (Status_Fusao no início)
            const enrichedRow = {
                "Status_Fusao": "SUCESSO",
                "CNPJ": getColumnValue(gRow, gHeaders, ['CNPJ']),
                "Razão Social": getColumnValue(gRow, gHeaders, ['Razão Social', 'Razao Social']),
                "Nome Fantasia": nomeFantasiaFinal,
                "Nome Fantasia 2": nomeFantasiaMaps,
                "Opening hours": getColumnValue(mRow, mHeaders, ['Opening hours', 'Opening_hours']),
                "Data de Abertura": getColumnValue(gRow, gHeaders, ['Data de Abertura', 'Data_de_Abertura']),
                "CNAE Principal": getColumnValue(gRow, gHeaders, ['CNAE Principal', 'CNAE_Principal']),
                "Descrição CNAE": getColumnValue(gRow, gHeaders, ['Descrição CNAE', 'Descricao CNAE']),
                "CNAE Secundário 1": getColumnValue(gRow, gHeaders, ['CNAE Secundário 1', 'CNAE_Secundario_1']),
                "Descrição CNAE Secundário 1": getColumnValue(gRow, gHeaders, ['Descrição CNAE Secundário 1', 'Descricao CNAE Secundario_1']),
                "Natureza Jurídica": getColumnValue(gRow, gHeaders, ['Natureza Jurídica', 'Natureza_Juridica']),
                "Fulladdress": getColumnValue(mRow, mHeaders, ['Fulladdress', 'address']),
                "Logradouro": logradouroRaw,
                "Número": numRaw,
                "Complemento": getColumnValue(gRow, gHeaders, ['Complemento']),
                "Bairro": getColumnValue(gRow, gHeaders, ['Bairro']),
                "Município": getColumnValue(gRow, gHeaders, ['Município', 'Municipio']),
                "UF": getColumnValue(gRow, gHeaders, ['UF']),
                "CEP": cepRaw,
                "Telefone": getColumnValue(gRow, gHeaders, ['Telefone']),
                "Telefone 2": getColumnValue(gRow, gHeaders, ['Telefone 2', 'Telefone_2']),
                "Telefone Maps": getColumnValue(mRow, mHeaders, ['Phone']),
                "Email": getColumnValue(gRow, gHeaders, ['Email']),
                "Email (Maps)": getColumnValue(mRow, mHeaders, ['Email']),
                "Capital Social": getColumnValue(gRow, gHeaders, ['Capital Social', 'Capital_Social']),
                "Porte": getColumnValue(gRow, gHeaders, ['Porte']),
                "Sócio 1 - Nome": getColumnValue(gRow, gHeaders, ['Sócio 1 - Nome', 'Socio 1 - Nome']),
                "Sócio 2 - Nome": getColumnValue(gRow, gHeaders, ['Sócio 2 - Nome', 'Socio 2 - Nome']),
                "Categories": getColumnValue(mRow, mHeaders, ['Categories', 'Category']),
                "Google Maps URL": getColumnValue(mRow, mHeaders, ['Google Maps URL', 'Google_Maps_URL', 'Review URL']),
                "Phone": getColumnValue(mRow, mHeaders, ['Phone']),
                "Phones": getColumnValue(mRow, mHeaders, ['Phones']),
                "Review Count": getColumnValue(mRow, mHeaders, ['Review Count', 'Review_Count']),
                "Average Rating": getColumnValue(mRow, mHeaders, ['Average Rating', 'Average_Rating', 'Rating']),
                "Latitude": getColumnValue(mRow, mHeaders, ['Latitude']),
                "Longitude": getColumnValue(mRow, mHeaders, ['Longitude']),
                "Website": getColumnValue(mRow, mHeaders, ['Website']),
                "Facebook": fb,
                "Instagram": ig,
                "_gl_idx": gIdx,
                "_maps_idx": matchRecord.index
            };
            
            enriched.push(enrichedRow);
        } else {
            // Nível 3: Sobras de GetLista (Vão para Aba 2 e compõem a "FALHA")
            const unmatchedRow = { ...gRow };
            unmatchedRow["Status_Fusao"] = "FALHA";
            unmatchedRow["_gl_idx"] = gIdx;
            unmatchedGetLista.push(unmatchedRow);
        }
    });
    
    // Coleta sobras da planilha Maps (que não foram utilizadas no pareamento)
    const unmatchedMaps = [];
    maps.forEach((mRow, idx) => {
        // Encontra o registro equivalente no array de controle (se já foi casado, ignora)
        const isMatched = enriched.some(row => row._maps_idx === idx);
        
        if (!isMatched) {
            const mapsFailRow = { ...mRow };
            mapsFailRow["Status_Fusao"] = "FALHA";
            mapsFailRow["_maps_idx"] = idx;
            unmatchedMaps.push(mapsFailRow);
        }
    });
    
    // Atualiza estado global dos resultados
    state.resultEnriched = enriched;
    state.resultUnmatchedGetLista = unmatchedGetLista;
    state.resultUnmatchedMaps = unmatchedMaps;
    
    // Calcula métricas estatísticas
    const totalGetLista = getlista.length;
    const totalMaps = maps.length;
    const rate = totalGetLista > 0 ? (matchedCount / totalGetLista) * 100 : 0;
    
    state.matchStats = {
        totalGetLista,
        totalMaps,
        matched: matchedCount,
        unmatchedGetLista: unmatchedGetLista.length,
        unmatchedMaps: unmatchedMaps.length,
        rate: rate
    };
    
    log(`Fusão concluída. Taxa de Matching: <strong>${rate.toFixed(1)}%</strong> (${matchedCount} pareados, ${unmatchedGetLista.length} órfãos no GetLista, ${unmatchedMaps.length} no Maps).`, 'success');
    
    // Inicializa painel de reconciliação manual
    initManualMatching();

    // Renderiza UI de resultados
    renderResults();
}

// Vincula evento do botão principal de fusão
DOM.btnProcess.addEventListener('click', async () => {
    try {
        DOM.btnProcess.setAttribute('disabled', 'true');
        
        const enrichEnabled = document.getElementById('chkEnrichAddress').checked;
        if (enrichEnabled) {
            DOM.btnProcess.querySelector('span').innerText = 'Enriquecendo Endereços...';
            try {
                await enrichIncompleteAddresses();
            } catch (err) {
                log(`[ENRIQUECIMENTO] Erro durante enriquecimento: ${err.message}`, 'error');
            }
        }
        
        DOM.btnProcess.querySelector('span').innerText = 'Mesclando...';
        
        // Simula pequena folga para a UI respirar antes de travar thread
        setTimeout(() => {
            processMerge();
            DOM.btnProcess.removeAttribute('disabled');
            DOM.btnProcess.querySelector('span').innerText = 'Iniciar Fusão e Higienização';
        }, 100);
    } catch (e) {
        log(`Erro crítico no processador: ${e.message}`, 'error');
        DOM.btnProcess.removeAttribute('disabled');
        DOM.btnProcess.querySelector('span').innerText = 'Iniciar Fusão e Higienização';
    }
});

// --- RENDERIZAR RESULTADOS E DASHBOARDS ---
function renderResults() {
    const stats = state.matchStats;
    
    // Exibe painel de estatísticas
    DOM.statsSection.style.display = 'block';
    
    // Anima taxa de match progressiva
    DOM.statMatchRate.innerText = `${stats.rate.toFixed(1)}%`;
    
    // Calcula circunferência do círculo SVG: 2 * PI * r = 2 * 3.14159 * 40 = 251.2
    const strokeDashoffset = 251.2 - (251.2 * stats.rate) / 100;
    DOM.statRadialProgress.style.strokeDashoffset = strokeDashoffset;
    
    // Popula contadores
    DOM.countGetListaTotal.innerText = stats.totalGetLista;
    DOM.countMapsTotal.innerText = stats.totalMaps;
    DOM.countMatched.innerText = `${stats.matched} leads`;
    DOM.countUnmatched.innerText = `${stats.unmatchedGetLista} GL / ${stats.unmatchedMaps} Maps`;
    
    // Preenche tabelas de preview (Top 10)
    const enrichedHeaders = getOrderedHeaders(state.resultEnriched.slice(0, 10), "Status_Fusao");
    fillPreviewTable(state.resultEnriched.slice(0, 10), enrichedHeaders, DOM.tblEnrichedHeaders, DOM.tblEnrichedBody);
    
    const glHeaders = getOrderedHeaders(state.resultUnmatchedGetLista.slice(0, 10), "Status_Fusao");
    fillPreviewTable(state.resultUnmatchedGetLista.slice(0, 10), glHeaders, DOM.tblUnmatchedGetListaHeaders, DOM.tblUnmatchedGetListaBody);
    
    const mapsHeaders = getOrderedHeaders(state.resultUnmatchedMaps.slice(0, 10), "Status_Fusao");
    fillPreviewTable(state.resultUnmatchedMaps.slice(0, 10), mapsHeaders, DOM.tblUnmatchedMapsHeaders, DOM.tblUnmatchedMapsBody);
    
    // Scroll da página para os resultados de forma suave
    DOM.statsSection.scrollIntoView({ behavior: 'smooth' });
}

function fillPreviewTable(data, headers, headersEl, bodyEl) {
    headersEl.innerHTML = '';
    bodyEl.innerHTML = '';
    
    if (data.length === 0) {
        headersEl.innerHTML = '<th>Nenhum registro para exibir</th>';
        bodyEl.innerHTML = '<tr><td style="text-align: center; color: var(--text-muted);">Nenhum dado encontrado</td></tr>';
        return;
    }
    
    // Insere cabeçalhos
    headers.forEach(h => {
        const th = document.createElement('th');
        th.innerText = h;
        headersEl.appendChild(th);
    });
    
    // Insere linhas
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(h => {
            const td = document.createElement('td');
            const val = row[h];
            td.innerText = val !== undefined && val !== null ? val : '';
            td.title = val !== undefined && val !== null ? val : '';
            
            // Destaca status_fusao
            if (h === 'Status_Fusao') {
                if (val === 'SUCESSO') {
                    td.innerHTML = `<span style="color: var(--color-emerald); font-weight: 600;">SUCESSO</span>`;
                } else {
                    td.innerHTML = `<span style="color: var(--color-red); font-weight: 600;">FALHA</span>`;
                }
            }
            
            tr.appendChild(td);
        });
        bodyEl.appendChild(tr);
    });
}

// --- TABS CONTROLS ---
DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class
        DOM.tabButtons.forEach(b => b.classList.remove('active'));
        DOM.tabPanels.forEach(p => p.classList.remove('active'));
        
        // Add active class
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        document.getElementById(targetTab).classList.add('active');
    });
});

// --- COMPRESSÃO E DOWNLOAD XLSX (SheetJS) ---

function fitToColumn(ws, data) {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const colWidths = keys.map(key => {
        let maxLen = key.toString().length;
        for (let row of data) {
            const val = row[key];
            if (val !== undefined && val !== null) {
                const len = val.toString().length;
                if (len > maxLen) maxLen = len;
            }
        }
        // Limita a largura entre 10 e 50 para manter o layout limpo
        return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
    });
    ws['!cols'] = colWidths;
}

// Retorna os cabeçalhos ordenados, garantindo que a coluna Status_Fusao fique no início e excluindo chaves de controle internas
function getOrderedHeaders(data, firstKey = "Status_Fusao") {
    if (!data || data.length === 0) return [];
    const allKeys = new Set();
    data.forEach(row => {
        Object.keys(row).forEach(k => {
            if (k !== '_gl_idx' && k !== '_maps_idx') {
                allKeys.add(k);
            }
        });
    });
    const keysArray = Array.from(allKeys);
    const index = keysArray.indexOf(firstKey);
    if (index > -1) {
        keysArray.splice(index, 1);
        keysArray.unshift(firstKey);
    }
    return keysArray;
}

// Limpa dados temporários internos de rastreamento antes da gravação de planilhas
function cleanDataForExport(data) {
    return data.map(row => {
        const newRow = { ...row };
        delete newRow._gl_idx;
        delete newRow._maps_idx;
        return newRow;
    });
}

DOM.btnDownload.addEventListener('click', () => {
    try {
        log('Gerando pasta de trabalho Excel multi-abas (.xlsx)...', 'info');
        
        // Cria nova pasta de trabalho
        const wb = XLSX.utils.book_new();
        
        // Converte os dados limpos para planilhas virtuais (Sheet)
        const enrichedCleaned = cleanDataForExport(state.resultEnriched);
        const glCleaned = cleanDataForExport(state.resultUnmatchedGetLista);
        const mapsCleaned = cleanDataForExport(state.resultUnmatchedMaps);

        const wsEnriched = XLSX.utils.json_to_sheet(enrichedCleaned, { header: getOrderedHeaders(enrichedCleaned, "Status_Fusao") });
        const wsUnmatchedGetLista = XLSX.utils.json_to_sheet(glCleaned, { header: getOrderedHeaders(glCleaned, "Status_Fusao") });
        const wsUnmatchedMaps = XLSX.utils.json_to_sheet(mapsCleaned, { header: getOrderedHeaders(mapsCleaned, "Status_Fusao") });
        
        // Auto-fit das colunas
        fitToColumn(wsEnriched, enrichedCleaned);
        fitToColumn(wsUnmatchedGetLista, glCleaned);
        fitToColumn(wsUnmatchedMaps, mapsCleaned);
        
        // Adiciona as abas na pasta de trabalho
        XLSX.utils.book_append_sheet(wb, wsEnriched, "Enriquecida");
        XLSX.utils.book_append_sheet(wb, wsUnmatchedGetLista, "Não Encontrados - GetLista");
        XLSX.utils.book_append_sheet(wb, wsUnmatchedMaps, "Não Encontrados - Maps");
        
        // Exporta e faz download físico do arquivo com formato .xlsx nativo
        const dataAtual = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const filename = `Base_Leads_Piracicaba_Enriquecida_${dataAtual}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        
        log(`Download da pasta de trabalho concluído: <strong>${filename}</strong>`, 'success');
    } catch (e) {
        log(`Erro ao exportar planilha Excel: ${e.message}`, 'error');
        console.error(e);
    }
});

// Download individual - Apenas Enriquecida
document.getElementById('btnDownloadEnriched').addEventListener('click', () => {
    try {
        if (!state.resultEnriched || state.resultEnriched.length === 0) {
            log('Nenhum lead enriquecido (Sucesso) para exportar.', 'warning');
            return;
        }
        log('Gerando planilha contendo apenas registros enriquecidos...', 'info');
        const wb = XLSX.utils.book_new();
        const cleaned = cleanDataForExport(state.resultEnriched);
        const ws = XLSX.utils.json_to_sheet(cleaned, { header: getOrderedHeaders(cleaned, "Status_Fusao") });
        fitToColumn(ws, cleaned);
        XLSX.utils.book_append_sheet(wb, ws, "Enriquecida");
        
        const filename = `Leads_Enriquecidos_Apenas_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.xlsx`;
        XLSX.writeFile(wb, filename);
        log(`Exportado apenas matched: <strong>${filename}</strong>`, 'success');
    } catch (e) {
        log(`Erro ao exportar: ${e.message}`, 'error');
    }
});

// Download individual - Apenas Não Encontrados GetLista
document.getElementById('btnDownloadGL').addEventListener('click', () => {
    try {
        if (!state.resultUnmatchedGetLista || state.resultUnmatchedGetLista.length === 0) {
            log('Nenhum lead órfão do GetLista para exportar.', 'warning');
            return;
        }
        log('Gerando planilha contendo apenas órfãos do GetLista...', 'info');
        const wb = XLSX.utils.book_new();
        const cleaned = cleanDataForExport(state.resultUnmatchedGetLista);
        const ws = XLSX.utils.json_to_sheet(cleaned, { header: getOrderedHeaders(cleaned, "Status_Fusao") });
        fitToColumn(ws, cleaned);
        XLSX.utils.book_append_sheet(wb, ws, "Não Encontrados - GetLista");
        
        const filename = `Orfaos_GetLista_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.xlsx`;
        XLSX.writeFile(wb, filename);
        log(`Exportado órfãos GetLista: <strong>${filename}</strong>`, 'success');
    } catch (e) {
        log(`Erro ao exportar: ${e.message}`, 'error');
    }
});

// Download individual - Apenas Não Encontrados Maps
document.getElementById('btnDownloadMaps').addEventListener('click', () => {
    try {
        if (!state.resultUnmatchedMaps || state.resultUnmatchedMaps.length === 0) {
            log('Nenhum estabelecimento órfão do Maps para exportar.', 'warning');
            return;
        }
        log('Gerando planilha contendo apenas órfãos do Maps...', 'info');
        const wb = XLSX.utils.book_new();
        const cleaned = cleanDataForExport(state.resultUnmatchedMaps);
        const ws = XLSX.utils.json_to_sheet(cleaned, { header: getOrderedHeaders(cleaned, "Status_Fusao") });
        fitToColumn(ws, cleaned);
        XLSX.utils.book_append_sheet(wb, ws, "Não Encontrados - Maps");
        
        const filename = `Orfaos_Maps_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.xlsx`;
        XLSX.writeFile(wb, filename);
        log(`Exportado órfãos Maps: <strong>${filename}</strong>`, 'success');
    } catch (e) {
        log(`Erro ao exportar: ${e.message}`, 'error');
    }
});

// --- RECONCILIAÇÃO MANUAL INTERATIVA ---

function initManualMatching() {
    // Exibe o painel de reconciliação manual se houver itens não pareados
    if (state.resultUnmatchedGetLista.length > 0 && state.resultUnmatchedMaps.length > 0) {
        DOM.manualMatchingContainer.style.display = 'block';
    } else {
        DOM.manualMatchingContainer.style.display = 'none';
    }

    // Configura os ouvintes de busca para filtros rápidos
    DOM.searchManualGetLista.removeEventListener('input', renderManualCards);
    DOM.searchManualGetLista.addEventListener('input', renderManualCards);
    
    DOM.searchManualMaps.removeEventListener('input', renderManualCards);
    DOM.searchManualMaps.addEventListener('input', renderManualCards);

    // Limpa campos de busca
    DOM.searchManualGetLista.value = '';
    DOM.searchManualMaps.value = '';

    // Renderiza os cards iniciais
    renderManualCards();
    renderManualMatchesHistory();
}

function renderManualCards() {
    const glFilter = removeAccents(DOM.searchManualGetLista.value.toLowerCase());
    const mapsFilter = removeAccents(DOM.searchManualMaps.value.toLowerCase());

    DOM.lstManualGetLista.innerHTML = '';
    DOM.lstManualMaps.innerHTML = '';

    // Filtrar e Renderizar GetLista (Esquerda)
    const filteredGL = state.resultUnmatchedGetLista.filter(row => {
        const razao = getColumnValue(row, state.getlistaHeaders, ['Razão Social', 'Razao Social'], '');
        const fantasia = getColumnValue(row, state.getlistaHeaders, ['Nome Fantasia'], '');
        const logradouro = getColumnValue(row, state.getlistaHeaders, ['Logradouro'], '');
        const bairro = getColumnValue(row, state.getlistaHeaders, ['Bairro'], '');
        
        const combined = removeAccents(`${razao} ${fantasia} ${logradouro} ${bairro}`).toLowerCase();
        return combined.includes(glFilter);
    });

    DOM.lblGetListaUnmatchedCount.innerText = filteredGL.length;

    filteredGL.forEach(row => {
        const glIdx = row._gl_idx;
        const razao = getColumnValue(row, state.getlistaHeaders, ['Razão Social', 'Razao Social'], '');
        const fantasia = getColumnValue(row, state.getlistaHeaders, ['Nome Fantasia'], '') || '(Sem Fantasia)';
        const logradouro = getColumnValue(row, state.getlistaHeaders, ['Logradouro'], '');
        const numero = getColumnValue(row, state.getlistaHeaders, ['Número', 'Numero'], '');
        const bairro = getColumnValue(row, state.getlistaHeaders, ['Bairro'], '');
        const telefone = getColumnValue(row, state.getlistaHeaders, ['Telefone'], '') || '(Sem Telefone)';

        const card = document.createElement('div');
        card.className = 'manual-card draggable';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-gl-idx', glIdx);
        
        card.innerHTML = `
            <div class="card-id-badge">GL-${glIdx + 1}</div>
            <h5>${razao}</h5>
            <div class="card-subtitle">${fantasia}</div>
            <div class="card-info-row">
                <i data-lucide="map-pin" class="card-info-icon"></i>
                <span class="card-info-text">${logradouro}, ${numero} - ${bairro}</span>
            </div>
            <div class="card-info-row">
                <i data-lucide="phone" class="card-info-icon"></i>
                <span class="card-info-text">${telefone}</span>
            </div>
        `;

        // Eventos de drag start / end
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', glIdx);
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        DOM.lstManualGetLista.appendChild(card);
    });

    // Filtrar e Renderizar Maps (Direita)
    const filteredMaps = state.resultUnmatchedMaps.filter(row => {
        const name = getColumnValue(row, state.mapsHeaders, ['Name', 'Title'], '');
        const fullAddr = getColumnValue(row, state.mapsHeaders, ['Fulladdress', 'address'], '');
        const categories = getColumnValue(row, state.mapsHeaders, ['Categories', 'Category'], '');
        
        const combined = removeAccents(`${name} ${fullAddr} ${categories}`).toLowerCase();
        return combined.includes(mapsFilter);
    });

    DOM.lblMapsUnmatchedCount.innerText = filteredMaps.length;

    filteredMaps.forEach(row => {
        const mapsIdx = row._maps_idx;
        const name = getColumnValue(row, state.mapsHeaders, ['Name', 'Title'], '');
        const fullAddr = getColumnValue(row, state.mapsHeaders, ['Fulladdress', 'address'], '');
        const categories = getColumnValue(row, state.mapsHeaders, ['Categories', 'Category'], '') || '(Sem Categoria)';
        const phone = getColumnValue(row, state.mapsHeaders, ['Phone'], '') || '(Sem Telefone)';

        const card = document.createElement('div');
        card.className = 'manual-card droppable';
        card.setAttribute('data-maps-idx', mapsIdx);

        card.innerHTML = `
            <div class="card-id-badge">MAPS-${mapsIdx + 1}</div>
            <h5>${name}</h5>
            <div class="card-subtitle">${categories}</div>
            <div class="card-info-row">
                <i data-lucide="map-pin" class="card-info-icon"></i>
                <span class="card-info-text">${fullAddr}</span>
            </div>
            <div class="card-info-row">
                <i data-lucide="phone" class="card-info-icon"></i>
                <span class="card-info-text">${phone}</span>
            </div>
            <div class="drop-helper-text">Solte o lead GetLista aqui</div>
        `;

        // Eventos de drag over / drop
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            // Acha o card correto mesmo se o dragover disparar em elementos internos (ícones/texto)
            const targetCard = e.target.closest('.manual-card');
            if (targetCard) targetCard.classList.add('drag-over');
        });

        card.addEventListener('dragleave', (e) => {
            const targetCard = e.target.closest('.manual-card');
            if (targetCard) targetCard.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetCard = e.target.closest('.manual-card');
            if (targetCard) targetCard.classList.remove('drag-over');
            
            const glIdx = e.dataTransfer.getData('text/plain');
            if (glIdx !== undefined && glIdx !== null && glIdx !== '') {
                handleManualMatch(parseInt(glIdx), mapsIdx);
            }
        });

        DOM.lstManualMaps.appendChild(card);
    });

    // Recria ícones do lucide dentro dos novos cards dinâmicos
    lucide.createIcons();
}

function handleManualMatch(glIdx, mapsIdx) {
    const glRow = state.resultUnmatchedGetLista.find(r => r._gl_idx === glIdx);
    const mRow = state.resultUnmatchedMaps.find(r => r._maps_idx === mapsIdx);

    if (!glRow || !mRow) {
        log('Falha ao parear manualmente: registros não encontrados nos dados órfãos.', 'error');
        return;
    }

    // Processamento de fusão conforme a especificação de 40 colunas (Status_Fusao no início)
    const gHeaders = state.getlistaHeaders;
    const mHeaders = state.mapsHeaders;

    const nomeFantasiaGL = getColumnValue(glRow, gHeaders, ['Nome Fantasia']);
    const nomeFantasiaMaps = getColumnValue(mRow, mHeaders, ['Name', 'Title']);
    const nomeFantasiaFinal = (nomeFantasiaGL && nomeFantasiaGL.trim()) ? nomeFantasiaGL : nomeFantasiaMaps;

    let fb = getColumnValue(mRow, mHeaders, ['Facebook']);
    let ig = getColumnValue(mRow, mHeaders, ['Instagram']);
    const socialJson = getColumnValue(mRow, mHeaders, ['Social Medias']);
    if (!fb && socialJson) fb = parseSocialMedias(socialJson, 'facebook');
    if (!ig && socialJson) ig = parseSocialMedias(socialJson, 'instagram');

    const enrichedRow = {
        "Status_Fusao": "SUCESSO (MANUAL)",
        "CNPJ": getColumnValue(glRow, gHeaders, ['CNPJ']),
        "Razão Social": getColumnValue(glRow, gHeaders, ['Razão Social', 'Razao Social']),
        "Nome Fantasia": nomeFantasiaFinal,
        "Nome Fantasia 2": nomeFantasiaMaps,
        "Opening hours": getColumnValue(mRow, mHeaders, ['Opening hours', 'Opening_hours']),
        "Data de Abertura": getColumnValue(glRow, gHeaders, ['Data de Abertura']),
        "CNAE Principal": getColumnValue(glRow, gHeaders, ['CNAE Principal']),
        "Descrição CNAE": getColumnValue(glRow, gHeaders, ['Descrição CNAE']),
        "CNAE Secundário 1": getColumnValue(glRow, gHeaders, ['CNAE Secundário 1']),
        "Descrição CNAE Secundário 1": getColumnValue(glRow, gHeaders, ['Descrição CNAE Secundário 1']),
        "Natureza Jurídica": getColumnValue(glRow, gHeaders, ['Natureza Jurídica']),
        "Fulladdress": getColumnValue(mRow, mHeaders, ['Fulladdress', 'address']),
        "Logradouro": getColumnValue(glRow, gHeaders, ['Logradouro']),
        "Número": getColumnValue(glRow, gHeaders, ['Número', 'Numero']),
        "Complemento": getColumnValue(glRow, gHeaders, ['Complemento']),
        "Bairro": getColumnValue(glRow, gHeaders, ['Bairro']),
        "Município": getColumnValue(glRow, gHeaders, ['Município']),
        "UF": getColumnValue(glRow, gHeaders, ['UF']),
        "CEP": getColumnValue(glRow, gHeaders, ['CEP']),
        "Telefone": getColumnValue(glRow, gHeaders, ['Telefone']),
        "Telefone 2": getColumnValue(glRow, gHeaders, ['Telefone 2']),
        "Telefone Maps": getColumnValue(mRow, mHeaders, ['Phone']),
        "Email": getColumnValue(glRow, gHeaders, ['Email']),
        "Email (Maps)": getColumnValue(mRow, mHeaders, ['Email']),
        "Capital Social": getColumnValue(glRow, gHeaders, ['Capital Social']),
        "Porte": getColumnValue(glRow, gHeaders, ['Porte']),
        "Sócio 1 - Nome": getColumnValue(glRow, gHeaders, ['Sócio 1 - Nome']),
        "Sócio 2 - Nome": getColumnValue(glRow, gHeaders, ['Sócio 2 - Nome']),
        "Categories": getColumnValue(mRow, mHeaders, ['Categories', 'Category']),
        "Google Maps URL": getColumnValue(mRow, mHeaders, ['Google Maps URL', 'Google_Maps_URL', 'Review URL']),
        "Phone": getColumnValue(mRow, mHeaders, ['Phone']),
        "Phones": getColumnValue(mRow, mHeaders, ['Phones']),
        "Review Count": getColumnValue(mRow, mHeaders, ['Review Count', 'Review_Count']),
        "Average Rating": getColumnValue(mRow, mHeaders, ['Average Rating', 'Average_Rating', 'Rating']),
        "Latitude": getColumnValue(mRow, mHeaders, ['Latitude']),
        "Longitude": getColumnValue(mRow, mHeaders, ['Longitude']),
        "Website": getColumnValue(mRow, mHeaders, ['Website']),
        "Facebook": fb,
        "Instagram": ig,
        "_gl_idx": glIdx,
        "_maps_idx": mapsIdx
    };

    // Salva o estado original na lista de histórico para desfazer se necessário
    state.manualMatchesHistory.push({
        glIdx: glIdx,
        mapsIdx: mapsIdx,
        glName: glRow["Razão Social"] || glRow["Nome Fantasia"] || `GL-${glIdx+1}`,
        mapsName: mRow["Name"] || `MAPS-${mapsIdx+1}`,
        originalGLRow: { ...glRow },
        originalMapsRow: { ...mRow }
    });

    // 1. Adiciona o registro na lista de enriquecidos com sucesso
    state.resultEnriched.push(enrichedRow);

    // 2. Remove dos unmatched arrays correspondentes
    state.resultUnmatchedGetLista = state.resultUnmatchedGetLista.filter(r => r._gl_idx !== glIdx);
    state.resultUnmatchedMaps = state.resultUnmatchedMaps.filter(r => r._maps_idx !== mapsIdx);

    // 3. Atualiza contadores e estatísticas
    state.matchStats.matched++;
    state.matchStats.unmatchedGetLista--;
    state.matchStats.unmatchedMaps--;
    state.matchStats.rate = (state.matchStats.matched / state.matchStats.totalGetLista) * 100;

    log(`[MATCH MANUAL] Lead <strong>GL-${glIdx + 1}</strong> (${glRow["Razão Social"] || glRow["Nome Fantasia"]}) pareado manualmente com <strong>MAPS-${mapsIdx + 1}</strong> (${mRow["Name"]}).`, 'success');

    // 4. Re-renderiza UI
    renderResults();
    renderManualCards();
    renderManualMatchesHistory();
}

function handleUndoManualMatch(glIdx) {
    const historyItemIndex = state.manualMatchesHistory.findIndex(h => h.glIdx === glIdx);
    if (historyItemIndex === -1) return;

    const item = state.manualMatchesHistory[historyItemIndex];
    
    // 1. Restaura o registro original do GetLista como não-encontrado
    state.resultUnmatchedGetLista.push(item.originalGLRow);
    state.resultUnmatchedGetLista.sort((a, b) => a._gl_idx - b._gl_idx);

    // 2. Restaura o registro original do Maps como não-encontrado
    state.resultUnmatchedMaps.push(item.originalMapsRow);
    state.resultUnmatchedMaps.sort((a, b) => a._maps_idx - b._maps_idx);

    // 3. Remove da planilha enriquecida
    state.resultEnriched = state.resultEnriched.filter(r => r._gl_idx !== glIdx);

    // 4. Remove do histórico
    state.manualMatchesHistory.splice(historyItemIndex, 1);

    // 5. Atualiza contadores
    state.matchStats.matched--;
    state.matchStats.unmatchedGetLista++;
    state.matchStats.unmatchedMaps++;
    state.matchStats.rate = (state.matchStats.matched / state.matchStats.totalGetLista) * 100;

    log(`[DESFAZER] Desfeito pareamento manual do lead <strong>GL-${glIdx + 1}</strong> (${item.glName}).`, 'info');

    // 6. Re-renderiza UI
    renderResults();
    renderManualCards();
    renderManualMatchesHistory();
}

function renderManualMatchesHistory() {
    DOM.lstManualMatchesHistory.innerHTML = '';
    
    if (state.manualMatchesHistory.length === 0) {
        DOM.manualMatchesHistoryBox.style.display = 'none';
        return;
    }

    DOM.manualMatchesHistoryBox.style.display = 'block';

    state.manualMatchesHistory.forEach(item => {
        const tag = document.createElement('div');
        tag.className = 'history-tag';
        tag.innerHTML = `
            <span><strong>GL-${item.glIdx+1}</strong> (${item.glName}) 🡘 <strong>MAPS-${item.mapsIdx+1}</strong> (${item.mapsName})</span>
            <button class="btn-undo-match" title="Desfazer Pareamento Manual" onclick="handleUndoManualMatch(${item.glIdx})">
                <i data-lucide="x"></i>
            </button>
        `;
        DOM.lstManualMatchesHistory.appendChild(tag);
    });

    lucide.createIcons();
}

// Exprime as funções para uso em escopo global no HTML
window.handleUndoManualMatch = handleUndoManualMatch;
window.handleManualMatch = handleManualMatch;

// --- FASE DE REFINAMENTO (EMENDAR NOVO ARQUIVO MAPS) ---

const refineDropzone = document.getElementById('refineDropzone');
const fileRefineMaps = document.getElementById('fileRefineMaps');
const refineStatus = document.getElementById('refineStatus');

if (refineDropzone && fileRefineMaps) {
    refineDropzone.addEventListener('click', (e) => {
        if (e.target !== fileRefineMaps) {
            fileRefineMaps.click();
        }
    });
    
    fileRefineMaps.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleRefineMapsSelect(e.target.files[0]);
        }
    });
}

function handleRefineMapsSelect(file) {
    if (!file) return;
    refineStatus.innerText = 'Lendo...';
    log(`[REFINAMENTO] Carregando nova planilha Maps: <strong>${file.name}</strong>...`, 'info');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const newMaps = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            const headers = getSheetHeaders(worksheet);
            
            if (newMaps.length === 0) {
                throw new Error('Planilha de refinamento vazia.');
            }
            
            log(`[REFINAMENTO] ${newMaps.length} registros novos carregados do Maps. Cruzando com os ${state.resultUnmatchedGetLista.length} leads GetLista órfãos...`, 'info');
            
            // Construção do indexador Maps em memória O(N) para o novo Maps
            const mapsByCepNum = {};
            const mapsByStreetNum = {};
            
            newMaps.forEach((mRow, idx) => {
                const fullAddr = getColumnValue(mRow, headers, ['Fulladdress', 'address']);
                const street = getColumnValue(mRow, headers, ['Street']);
                const name = getColumnValue(mRow, headers, ['Name', 'Title']);
                
                // Extrai CEP
                let cepVal = '';
                const cepMatch = fullAddr.match(/\b\d{5}-\d{3}\b/) || fullAddr.match(/\b\d{8}\b/);
                if (cepMatch) cepVal = normalizeCEP(cepMatch[0]);
                
                // Extrai logradouro e número
                const parsedAddr = parseMapsAddress(street, fullAddr);
                const cleanS = cleanStreetName(parsedAddr.street);
                const cleanN = extractFirstNumber(parsedAddr.number);
                
                const record = {
                    row: mRow,
                    index: state.mapsData.length + idx, // índice contínuo global
                    name: name,
                    cep: cepVal,
                    street_clean: cleanS,
                    number_clean: cleanN,
                    matched: false
                };
                
                if (cepVal && cleanN && cepVal !== '13400000') {
                    const key = `${cepVal}_${cleanN}`;
                    if (!mapsByCepNum[key]) mapsByCepNum[key] = [];
                    mapsByCepNum[key].push(record);
                }
                if (cleanS && cleanN) {
                    const key = `${cleanS}_${cleanN}`;
                    if (!mapsByStreetNum[key]) mapsByStreetNum[key] = [];
                    mapsByStreetNum[key].push(record);
                }
            });

            // Reconciliação dos órfãos
            let newMatchesCount = 0;
            const stillUnmatched = [];
            const gHeaders = state.getlistaHeaders;
            const useFallback = document.getElementById('chkFallbackStreet').checked;

            state.resultUnmatchedGetLista.forEach(gRow => {
                const gIdx = gRow._gl_idx;
                const cepRaw = getColumnValue(gRow, gHeaders, ['CEP']);
                const cepClean = normalizeCEP(cepRaw);
                const numRaw = getColumnValue(gRow, gHeaders, ['Número', 'Numero']);
                const numClean = extractFirstNumber(numRaw);
                const logradouroRaw = getColumnValue(gRow, gHeaders, ['Logradouro']);
                const logradouroClean = cleanStreetName(logradouroRaw);
                const razaoSocial = getColumnValue(gRow, gHeaders, ['Razão Social', 'Razao Social']);
                const nomeFantasiaGL = getColumnValue(gRow, gHeaders, ['Nome Fantasia']);

                let matchRecord = null;
                
                // Match por CEP + Número
                if (cepClean && numClean && cepClean !== '13400000') {
                    const key = `${cepClean}_${numClean}`;
                    const candidates = mapsByCepNum[key];
                    if (candidates && candidates.length > 0) {
                        const activeCandidates = candidates.filter(c => !c.matched);
                        if (activeCandidates.length === 1) {
                            matchRecord = activeCandidates[0];
                        } else if (activeCandidates.length > 1) {
                            let bestScore = -1;
                            let bestCand = null;
                            activeCandidates.forEach(cand => {
                                const score = Math.max(
                                    getSimilarity(razaoSocial, cand.name),
                                    getSimilarity(nomeFantasiaGL, cand.name)
                                );
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestCand = cand;
                                }
                            });
                            matchRecord = bestCand;
                        }
                    }
                }
                
                // Match por Logradouro + Número
                if (!matchRecord && useFallback && logradouroClean && numClean) {
                    const key = `${logradouroClean}_${numClean}`;
                    const candidates = mapsByStreetNum[key];
                    if (candidates && candidates.length > 0) {
                        const activeCandidates = candidates.filter(c => !c.matched);
                        if (activeCandidates.length === 1) {
                            matchRecord = activeCandidates[0];
                        } else if (activeCandidates.length > 1) {
                            let bestScore = -1;
                            let bestCand = null;
                            activeCandidates.forEach(cand => {
                                const score = Math.max(
                                    getSimilarity(razaoSocial, cand.name),
                                    getSimilarity(nomeFantasiaGL, cand.name)
                                );
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestCand = cand;
                                }
                            });
                            matchRecord = bestCand;
                        }
                    }
                }

                if (matchRecord) {
                    matchRecord.matched = true;
                    newMatchesCount++;
                    
                    const mRow = matchRecord.row;
                    const nomeFantasiaMaps = getColumnValue(mRow, headers, ['Name', 'Title']);
                    const nomeFantasiaFinal = (nomeFantasiaGL && nomeFantasiaGL.trim()) ? nomeFantasiaGL : nomeFantasiaMaps;
                    
                    let fb = getColumnValue(mRow, headers, ['Facebook']);
                    let ig = getColumnValue(mRow, headers, ['Instagram']);
                    const socialJson = getColumnValue(mRow, headers, ['Social Medias']);
                    if (!fb && socialJson) fb = parseSocialMedias(socialJson, 'facebook');
                    if (!ig && socialJson) ig = parseSocialMedias(socialJson, 'instagram');

                    const enrichedRow = {
                        "Status_Fusao": "SUCESSO (REFINADO)",
                        "CNPJ": getColumnValue(gRow, gHeaders, ['CNPJ']),
                        "Razão Social": getColumnValue(gRow, gHeaders, ['Razão Social', 'Razao Social']),
                        "Nome Fantasia": nomeFantasiaFinal,
                        "Nome Fantasia 2": nomeFantasiaMaps,
                        "Opening hours": getColumnValue(mRow, headers, ['Opening hours', 'Opening_hours']),
                        "Data de Abertura": getColumnValue(gRow, gHeaders, ['Data de Abertura']),
                        "CNAE Principal": getColumnValue(gRow, gHeaders, ['CNAE Principal']),
                        "Descrição CNAE": getColumnValue(gRow, gHeaders, ['Descrição CNAE']),
                        "CNAE Secundário 1": getColumnValue(gRow, gHeaders, ['CNAE Secundário 1']),
                        "Descrição CNAE Secundário 1": getColumnValue(gRow, gHeaders, ['Descrição CNAE Secundário 1']),
                        "Natureza Jurídica": getColumnValue(gRow, gHeaders, ['Natureza Jurídica']),
                        "Fulladdress": getColumnValue(mRow, headers, ['Fulladdress', 'address']),
                        "Logradouro": getColumnValue(gRow, gHeaders, ['Logradouro']),
                        "Número": getColumnValue(gRow, gHeaders, ['Número', 'Numero']),
                        "Complemento": getColumnValue(gRow, gHeaders, ['Complemento']),
                        "Bairro": getColumnValue(gRow, gHeaders, ['Bairro']),
                        "Município": getColumnValue(gRow, gHeaders, ['Município']),
                        "UF": getColumnValue(gRow, gHeaders, ['UF']),
                        "CEP": getColumnValue(gRow, gHeaders, ['CEP']),
                        "Telefone": getColumnValue(gRow, gHeaders, ['Telefone']),
                        "Telefone 2": getColumnValue(gRow, gHeaders, ['Telefone 2']),
                        "Telefone Maps": getColumnValue(mRow, headers, ['Phone']),
                        "Email": getColumnValue(gRow, gHeaders, ['Email']),
                        "Email (Maps)": getColumnValue(mRow, headers, ['Email']),
                        "Capital Social": getColumnValue(gRow, gHeaders, ['Capital Social']),
                        "Porte": getColumnValue(gRow, gHeaders, ['Porte']),
                        "Sócio 1 - Nome": getColumnValue(gRow, gHeaders, ['Sócio 1 - Nome']),
                        "Sócio 2 - Nome": getColumnValue(gRow, gHeaders, ['Sócio 2 - Nome']),
                        "Categories": getColumnValue(mRow, headers, ['Categories', 'Category']),
                        "Google Maps URL": getColumnValue(mRow, headers, ['Google Maps URL', 'Google_Maps_URL', 'Review URL']),
                        "Phone": getColumnValue(mRow, headers, ['Phone']),
                        "Phones": getColumnValue(mRow, headers, ['Phones']),
                        "Review Count": getColumnValue(mRow, headers, ['Review Count', 'Review_Count']),
                        "Average Rating": getColumnValue(mRow, headers, ['Average Rating', 'Average_Rating', 'Rating']),
                        "Latitude": getColumnValue(mRow, headers, ['Latitude']),
                        "Longitude": getColumnValue(mRow, headers, ['Longitude']),
                        "Website": getColumnValue(mRow, headers, ['Website']),
                        "Facebook": fb,
                        "Instagram": ig,
                        "_gl_idx": gIdx,
                        "_maps_idx": matchRecord.index
                    };
                    
                    state.resultEnriched.push(enrichedRow);
                } else {
                    stillUnmatched.push(gRow);
                }
            });

            // Sobras do novo Maps vão para unmatchedMaps
            newMaps.forEach((mRow, idx) => {
                const mapsIndex = state.mapsData.length + idx;
                const isMatched = state.resultEnriched.some(row => row._maps_idx === mapsIndex);
                if (!isMatched) {
                    const mapsFailRow = { ...mRow };
                    mapsFailRow["Status_Fusao"] = "FALHA";
                    mapsFailRow["_maps_idx"] = mapsIndex;
                    state.resultUnmatchedMaps.push(mapsFailRow);
                }
            });

            // Atualiza estado
            state.resultUnmatchedGetLista = stillUnmatched;
            state.mapsData = state.mapsData.concat(newMaps);

            // Atualiza estatísticas
            state.matchStats.matched += newMatchesCount;
            state.matchStats.unmatchedGetLista = stillUnmatched.length;
            state.matchStats.unmatchedMaps = state.resultUnmatchedMaps.length;
            state.matchStats.rate = (state.matchStats.matched / state.matchStats.totalGetLista) * 100;
            
            refineStatus.innerText = 'Emendado!';
            log(`[REFINAMENTO] Emenda de planilha Maps concluída! <strong>${newMatchesCount} novos pareamentos</strong> adicionados.`, 'success');
            
            // Re-renderiza UI
            renderResults();
            renderManualCards();
            renderManualMatchesHistory();

        } catch (err) {
            console.error(err);
            refineStatus.innerText = 'Erro';
            log(`[REFINAMENTO] Falha ao processar emenda: ${err.message}`, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}


