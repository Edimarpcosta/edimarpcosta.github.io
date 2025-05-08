
document.addEventListener('DOMContentLoaded', () => {
    // ========= CONFIGURAÇÃO DA APLICAÇÃO =========
    const AppConfig = {
        spreadsheetId: "1vWWvnYGgZyqVYMoBfcciCCGgEN1FLzSrmXYPBOPKUjk",
        // ---------------------------------------------------------------------------
        // !!!!! ALERTA DE SEGURANÇA !!!!!
        // A API KEY ABAIXO ESTÁ EXPOSTA NO CÓDIGO DO CLIENTE.
        // ISSO É UM RISCO DE SEGURANÇA.
        // VOCÊ DEVE:
        // 1. (IDEAL) Mover a lógica de acesso ao Google Sheets para um BACKEND.
        // 2. (MÍNIMO) RESTRINGIR SEVERAMENTE esta API Key no Google Cloud Console:
        //    - Apenas para a API do Google Sheets.
        //    - Apenas para os domínios HTTP onde sua aplicação está hospedada.
        //    - Se possível, para acesso de LEITURA apenas à planilha específica.
        //    NÃO USE UMA API KEY NÃO RESTRITA EM PRODUÇÃO NO FRONTEND.
        // SUBSTITUA "SUA_API_KEY_RESTRITA_AQUI" PELA SUA CHAVE CONFIGURADA.
        // ---------------------------------------------------------------------------
        apiKey: "AIzaSyChiZPUY-G3oyZN2NGY_vlgRXUzry9Pkeo", // EXEMPLO: "AIzaSyChiZPUY-G3oyZN2NGY_vlgRXUzry9Pkeo"
        range: "panificacao", // Aba da planilha
        geoJsonUrls: [ // URLs para fallback do GeoJSON
		    'https://edimarpcosta.github.io/geojson/geojs-35-mun.json',
			'https://gitlab.c3sl.ufpr.br/simcaq/geodata-br/-/raw/master/geojson/geojs-35-mun.json',
            'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-35-mun.json',
            'https://raw.githubusercontent.com/Edimarpcosta/edimarpcosta.github.io/refs/heads/main/geojson/geojs-35-mun.json'
            // Adicione mais URLs de fallback confiáveis aqui, se disponíveis
        ],
        weatherApiGeocode: 'https://geocoding-api.open-meteo.com/v1/search',
        weatherApiForecast: 'https://api.open-meteo.com/v1/forecast',
        mapInitialView: { lat: -23.5505, lng: -46.6333 },
        mapInitialZoom: 7,
        // Cores para os vendedores (excluindo vermelho, que é para destaque)
        vendedorColors: [
            '#ffd700', '#1f3a93', '#616a6b', '#7d3c98', '#27ae60', '#a04000', '#48d1cc',
            '#f1c40f', '#8e44ad', '#95a5a6', '#196f3d', '#d68910', '#5dade2', '#40e0d0',
            '#6e2c00', '#bb8fce', '#1e8449', '#808080', '#f39c12', '#21618c', '#c19a6b',
            '#9b59b6', '#a9dfbf', '#566573', '#d35400', '#117a65', '#9370db', '#6495ed',
            '#229954', '#d7bde2', '#5b2c6f', '#f8c471', '#4682b4', '#1abc9c', '#d2b48c',
            '#7f8c8d', '#00fa9a', '#6a0dad', '#f4d03f', '#87ceeb', '#cd853f', '#2980b9',
            '#76d7c4', '#00ced1', '#8a2be2', '#f5cba7', '#16a085', '#ffdb58', '#00a86b', '#5d6d7e'
        ],
        diasSemana: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
        meses: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    };

    // ========= ESTADO DA APLICAÇÃO =========
    const AppState = {
        map: null,
        selectedCity: null, // { name: string, id: string, layer: L.Layer }
        cityLayers: {}, // { cityName: L.Layer }
        normalizedCityNames: {}, // { normalizedName: originalName }
        favorites: [], // Array de objetos { name: string, id: string }
        groups: {}, // { groupName: [cityName1, cityName2] }
        vendedores: [], // Array de objetos { id, nome, supervisor, email, telefone, color }
        cityAssignments: {}, // { cityName: [vendedorId1, vendedorId2] }
        activeGroup: null, // Nome do grupo ativo
        activeVendedorId: null, // ID do vendedor ativo
        lastUpdateTime: null, // Data da última atualização da planilha
        weatherMarkers: [], // Array de marcadores de clima no mapa
        currentWeatherModalCity: null // Guarda a cidade do modal de clima aberto
    };

    // ========= CONSTANTES =========
    const CONSTANTS = {
        LOCAL_STORAGE_KEYS: {
            FAVORITES: 'sga territoriale_spMapFavorites',
            GROUPS: 'sga territoriale_spMapGroups',
            VENDEDORES: 'sga territoriale_spMapVendedores',
            ASSIGNMENTS: 'sga territoriale_spMapAssignments',
            LAST_UPDATE: 'sga territoriale_spMapLastUpdate'
        },
        DEFAULT_CITY_STYLE: {
            fillColor: '#3388ff', fillOpacity: 0.2, color: '#3388ff', weight: 1, dashArray: ''
        },
        SELECTED_CITY_STYLE: {
            fillColor: '#ff7800', fillOpacity: 0.7, color: '#ff7800', weight: 3, dashArray: ''
        },
        HIGHLIGHT_GROUP_STYLE: {
            fillColor: '#9b59b6', fillOpacity: 0.6, color: '#9b59b6', weight: 3, dashArray: ''
        },
        HIGHLIGHT_VENDEDOR_STYLE: { // Cor para destacar cidades de um vendedor
            fillColor: '#e74c3c', fillOpacity: 0.7, color: '#e74c3c', weight: 3, dashArray: ''
        },
        MULTIPLE_VENDEDORES_STYLE: { // Cor para cidades com múltiplos vendedores
            fillColor: '#ff9800', fillOpacity: 0.6, color: '#ff9800', weight: 2, dashArray: '5, 5'
        }
    };

    // ========= ELEMENTOS DO DOM (Cache) =========
    const DOMElements = {}; // Será populado em initDOMElements

    function initDOMElements() {
        DOMElements.loadingOverlay = document.getElementById('loading-overlay');
        DOMElements.loadingMessage = document.getElementById('loading-message');
        DOMElements.syncStatus = document.getElementById('sync-status');
        DOMElements.sidebar = document.getElementById('sidebar');
        DOMElements.sidebarTitle = document.getElementById('sidebar-title');
        DOMElements.toggleSidebarButton = document.getElementById('toggle-sidebar');
        DOMElements.sidebarTabsContainer = document.getElementById('sidebar-tabs');
        DOMElements.tabButtons = document.querySelectorAll('.tab-button');
        DOMElements.tabContents = document.querySelectorAll('.tab-content');
        DOMElements.searchInput = document.getElementById('search-input');
        DOMElements.searchButton = document.getElementById('search-button');
        DOMElements.selectedCityInfo = document.getElementById('selected-city-info');
        DOMElements.selectedCityActions = document.getElementById('selected-city-actions');
        DOMElements.addFavoriteButton = document.getElementById('add-favorite');
        DOMElements.assignVendedorButton = document.getElementById('assign-vendedor');
        DOMElements.favoritesList = document.getElementById('favorites-list');
        DOMElements.groupNameInput = document.getElementById('group-name');
        DOMElements.createGroupButton = document.getElementById('create-group');
        DOMElements.groupSelect = document.getElementById('group-select');
        DOMElements.groupsList = document.getElementById('groups-list');
        DOMElements.vendedoresList = document.getElementById('vendedores-list');
        DOMElements.reloadDataButton = document.getElementById('reload-data');
        DOMElements.lastUpdateSpan = document.getElementById('last-update');
        DOMElements.spreadsheetIdDisplay = document.getElementById('spreadsheet-id-display');
        DOMElements.configRangeNameDisplay = document.querySelector('.config-range-name');

        DOMElements.weatherVendedorSelect = document.getElementById('weather-vendedor-select');
        DOMElements.showWeatherForVendedorButton = document.getElementById('show-weather-for-vendedor');
        DOMElements.clearWeatherMarkersButton = document.getElementById('clear-weather-markers');

        DOMElements.modalAssignVendedor = document.getElementById('modal-assign-vendedor');
        DOMElements.assignCityNameSpan = document.getElementById('assign-city-name').querySelector('strong');
        DOMElements.currentVendedoresContainer = document.getElementById('current-vendedores-container');
        DOMElements.assignedVendedoresList = document.getElementById('assigned-vendedores-list');
        DOMElements.assignVendedorSelect = document.getElementById('assign-vendedor-select');
        DOMElements.confirmAssignVendedorButton = document.getElementById('confirm-assign-vendedor');

        DOMElements.modalVendedorDetails = document.getElementById('modal-vendedor-details');
        DOMElements.vendedorDetailsModalTitle = document.getElementById('vendedor-details-modal-title');
        DOMElements.detailVendedorNomeSpan = document.getElementById('detail-vendedor-nome');
        DOMElements.detailVendedorSupervisorSpan = document.getElementById('detail-vendedor-supervisor');
        DOMElements.vendedorCidadesList = document.getElementById('vendedor-cidades-list');
        DOMElements.highlightVendedorCitiesButton = document.getElementById('highlight-vendedor-cities-button');
        
        DOMElements.modalWeatherForecast = document.getElementById('modal-weather-forecast');
        DOMElements.weatherModalTitle = document.getElementById('weather-modal-title');
        DOMElements.weatherModalBody = document.getElementById('weather-modal-body');

        DOMElements.notificationContainer = document.getElementById('notification-container');
        DOMElements.mapContainer = document.getElementById('map'); // O div que contém o mapa
    }

    // ========= FUNÇÕES UTILITÁRIAS =========
    function normalizeString(str) {
        if (!str) return '';
        str = String(str).toLowerCase();
        str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        // Cuidado: remove hífens e apóstrofos. Pode ser necessário ajustar para cidades como "Mogi-Guaçu".
        str = str.replace(/[^\w\s-]/g, ''); // Mantém hífens
        str = str.replace(/\s+/g, ' ').trim();
        return str;
    }

    function showNotification(message, type = 'success', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.textContent = message;
        DOMElements.notificationContainer.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (DOMElements.notificationContainer.contains(notification)) {
                    DOMElements.notificationContainer.removeChild(notification);
                }
            }, 500); // Tempo para a animação de fade-out
        }, duration);
    }

    function openModal(modalElement) {
        modalElement.classList.add('show');
    }

    function closeModal(modalElement) {
        modalElement.classList.remove('show');
    }

    function closeAllModals() {
        document.querySelectorAll('.modal.show').forEach(modal => closeModal(modal));
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    function formatDateTime(date) {
        if (!date) return "Nunca";
        const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        return new Date(date).toLocaleDateString('pt-BR', options);
    }

    function showLoading(show = true, message = "Carregando...") {
        DOMElements.loadingMessage.textContent = message;
        if (show) {
            DOMElements.loadingOverlay.classList.remove('hidden');
        } else {
            DOMElements.loadingOverlay.classList.add('hidden');
        }
    }

    function showSyncStatus(show = true) {
        DOMElements.syncStatus.style.display = show ? 'block' : 'none';
    }

    // ========= FUNÇÕES DO MAPA =========
    function initMap() {
        AppState.map = L.map(DOMElements.mapContainer).setView([AppConfig.mapInitialView.lat, AppConfig.mapInitialView.lng], AppConfig.mapInitialZoom);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(AppState.map);
    }

    async function loadGeoJsonWithFallback() {
        for (const url of AppConfig.geoJsonUrls) {
            try {
                showLoading(true, `Carregando mapa de ${new URL(url).hostname}...`);
                const response = await fetch(url);
                if (!response.ok) {
                    if (response.status === 429) {
                        console.warn(`Erro 429 (Too Many Requests) para ${url}. Tentando próximo fallback.`);
                    } else {
                        throw new Error(`Falha ao carregar GeoJSON de ${url}: ${response.status} ${response.statusText}`);
                    }
                } else {
                    const data = await response.json();
                    showLoading(true, 'Mapa carregado. Processando cidades...');
                    return data;
                }
            } catch (error) {
                console.warn(`Erro ao carregar GeoJSON de ${url}:`, error.message);
                 // Adiciona um pequeno delay antes de tentar a próxima URL
                if (AppConfig.geoJsonUrls.indexOf(url) < AppConfig.geoJsonUrls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        }
        throw new Error('Falha ao carregar GeoJSON de todas as fontes de fallback.');
    }

    function processGeoJsonData(geoJsonData) {
        L.geoJSON(geoJsonData, {
            style: CONSTANTS.DEFAULT_CITY_STYLE,
            onEachFeature: (feature, layer) => {
                const cityName = feature.properties.name;
                const cityId = feature.properties.id;

                AppState.cityLayers[cityName] = layer;
                AppState.normalizedCityNames[normalizeString(cityName)] = cityName;

                layer.on('click', () => handleCityClick(cityName, cityId, layer));
                layer.bindTooltip(cityName, {
                    permanent: false, direction: 'center', className: 'city-tooltip'
                });
            }
        }).addTo(AppState.map);
    }

    function handleCityClick(cityName, cityId, layer) {
        AppState.selectedCity = { name: cityName, id: cityId, layer: layer };
        
        resetMapStyles(); // Reseta todos
        setLayerStyle(layer, CONSTANTS.SELECTED_CITY_STYLE); // Destaca o selecionado
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }

        updateSelectedCityInfo();
        
        if (DOMElements.sidebar.classList.contains('collapsed')) {
            DOMElements.toggleSidebarButton.click();
        }
        // Ativa a aba de busca
        DOMElements.tabButtons.forEach(btn => btn.classList.remove('active'));
        DOMElements.tabContents.forEach(content => content.classList.remove('active'));
        document.querySelector('.tab-button[data-tab="search"]').classList.add('active');
        document.getElementById('tab-search').classList.add('active');
    }

    function setLayerStyle(layer, style) {
        if (layer && typeof layer.setStyle === 'function') {
            layer.setStyle(style);
        }
    }
    
    function getCityStyle(cityName) {
        let styleOptions = { ...CONSTANTS.DEFAULT_CITY_STYLE }; // Começa com o padrão

        // Favorito (leve alteração se não tiver outra sobreposição mais forte)
        if (AppState.favorites.some(fav => fav.name === cityName) && !AppState.cityAssignments[cityName]?.length) {
            styleOptions.fillOpacity = 0.3; // Um pouco mais opaco que o padrão
            styleOptions.weight = 1.5;
        }

        // Atribuída a vendedores
        if (AppState.cityAssignments[cityName] && AppState.cityAssignments[cityName].length > 0) {
            if (AppState.cityAssignments[cityName].length === 1) {
                const vendedorId = AppState.cityAssignments[cityName][0];
                const vendedor = AppState.vendedores.find(v => v.id === vendedorId);
                if (vendedor && vendedor.color) {
                    styleOptions.fillColor = vendedor.color;
                    styleOptions.color = vendedor.color;
                    styleOptions.fillOpacity = 0.5;
                    styleOptions.weight = 2;
                }
            } else { // Múltiplos vendedores
                styleOptions = { ...CONSTANTS.MULTIPLE_VENDEDORES_STYLE };
            }
        }
        
        // Destaque de grupo ativo (sobrepõe outros, exceto seleção e vendedor ativo)
        if (AppState.activeGroup && AppState.groups[AppState.activeGroup]?.includes(cityName)) {
            styleOptions = { ...CONSTANTS.HIGHLIGHT_GROUP_STYLE };
        }

        // Destaque de vendedor ativo (sobrepõe outros, exceto seleção)
        if (AppState.activeVendedorId && AppState.cityAssignments[cityName]?.includes(AppState.activeVendedorId)) {
             styleOptions = { ...CONSTANTS.HIGHLIGHT_VENDEDOR_STYLE };
        }

        // Cidade selecionada (máxima prioridade de estilo)
        if (AppState.selectedCity && AppState.selectedCity.name === cityName) {
            styleOptions = { ...CONSTANTS.SELECTED_CITY_STYLE };
        }
        
        return styleOptions;
    }

    function resetMapStyles() {
        Object.entries(AppState.cityLayers).forEach(([cityName, layer]) => {
            const style = getCityStyle(cityName);
            setLayerStyle(layer, style);
        });
    }
    
    function highlightVendedorCitiesOnMap(vendedorId) {
        clearWeatherMarkers();
        AppState.activeVendedorId = vendedorId;
        AppState.activeGroup = null; // Desativa destaque de grupo
        DOMElements.groupSelect.value = '';
        resetMapStyles(); // Recalcula todos os estilos

        const cidadesDoVendedor = Object.keys(AppState.cityAssignments).filter(
            cityName => AppState.cityAssignments[cityName]?.includes(vendedorId)
        );

        if (cidadesDoVendedor.length > 0) {
            const layers = cidadesDoVendedor
                .map(cityName => AppState.cityLayers[cityName])
                .filter(Boolean);
            
            if (layers.length > 0) {
                const groupOfLayers = L.featureGroup(layers);
                AppState.map.fitBounds(groupOfLayers.getBounds(), { padding: [50, 50] });
            }

            // Adicionar clima (se a funcionalidade de clima estiver ativa)
            // Isso pode ser feito de forma assíncrona para não bloquear
            layers.forEach(layer => {
                const cityName = Object.keys(AppState.cityLayers).find(key => AppState.cityLayers[key] === layer);
                if (cityName) {
                     const bounds = layer.getBounds();
                     const center = bounds.getCenter();
                     addWeatherToMap(cityName, center.lat, center.lng);
                }
            });
        }
         showNotification(`Cidades do vendedor destacadas.`, 'info');
    }

    function highlightGroupOnMap(groupName) {
        AppState.activeGroup = groupName;
        AppState.activeVendedorId = null; // Desativa destaque de vendedor
        resetMapStyles(); // Recalcula todos os estilos

        if (groupName && AppState.groups[groupName]?.length > 0) {
            const layers = AppState.groups[groupName]
                .map(cityName => AppState.cityLayers[cityName])
                .filter(Boolean);

            if (layers.length > 0) {
                const groupOfLayers = L.featureGroup(layers);
                AppState.map.fitBounds(groupOfLayers.getBounds(), { padding: [50, 50] });
            }
        }
        showNotification(`Grupo ${groupName || 'Nenhum'} destacado.`, 'info');
    }


    // ========= FUNÇÕES DO GOOGLE SHEETS =========
    function loadDataFromSheets() {
        if (AppConfig.apiKey === "SUA_API_KEY_RESTRITA_AQUI" || !AppConfig.apiKey) {
            showNotification("API Key do Google Sheets não configurada. Não é possível carregar dados da planilha.", "danger", 10000);
            console.error("API Key do Google Sheets não configurada em AppConfig.apiKey.");
            showLoading(false);
            return Promise.resolve(); // Retorna uma promessa resolvida para não quebrar a cadeia
        }

        showLoading(true, "Carregando dados da planilha...");
        showSyncStatus(true);

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${AppConfig.spreadsheetId}/values/${AppConfig.range}?key=${AppConfig.apiKey}`;

        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 403) {
                         throw new Error("Erro de permissão (403) ao acessar a planilha. Verifique as permissões da API Key ou se a planilha é pública.");
                    }
                    throw new Error(`Erro ${response.status} na solicitação à API do Google Sheets.`);
                }
                return response.json();
            })
            .then(data => {
                processSheetsData(data);
                AppState.lastUpdateTime = new Date();
                DOMElements.lastUpdateSpan.textContent = formatDateTime(AppState.lastUpdateTime);
                showNotification("Dados carregados com sucesso da planilha!", "success");
                saveDataToLocalStorage(); // Salva os dados processados
                updateUIAfterDataLoad(); // Atualiza todas as listas da UI
            })
            .catch(error => {
                console.error("Erro ao obter dados da planilha:", error);
                showNotification(`Erro ao carregar dados da planilha: ${error.message}`, "danger", 10000);
            })
            .finally(() => {
                showLoading(false);
                showSyncStatus(false);
            });
    }

    function processSheetsData(data) {
        AppState.vendedores = [];
        AppState.cityAssignments = {}; // Resetar atribuições existentes vindas da planilha

        if (!data.values || data.values.length < 2) { // Precisa de pelo menos linha de supervisor e vendedor
            showNotification("Nenhum dado de vendedor encontrado na planilha ou formato incorreto.", "warning");
            return;
        }

        let colorIndex = 0;
        const supervisorsRow = data.values[0];
        const vendedoresRow = data.values[1];

        for (let colIndex = 0; colIndex < supervisorsRow.length; colIndex++) {
            const supervisor = supervisorsRow[colIndex]?.trim();
            const vendedorNome = vendedoresRow[colIndex]?.trim();

            if (supervisor && vendedorNome) {
                const vendedorId = generateId();
                const vendedorColor = AppConfig.vendedorColors[colorIndex % AppConfig.vendedorColors.length];
                colorIndex++;

                AppState.vendedores.push({
                    id: vendedorId,
                    nome: vendedorNome,
                    supervisor: supervisor,
                    email: "", // Pode ser adicionado na planilha se necessário
                    telefone: "", // Pode ser adicionado na planilha se necessário
                    color: vendedorColor
                });

                for (let rowIndex = 2; rowIndex < data.values.length; rowIndex++) {
                    if (data.values[rowIndex] && data.values[rowIndex][colIndex]) {
                        const cidadeNomePlanilha = data.values[rowIndex][colIndex].trim();
                        const cidadeNomeNormalizadoPlanilha = normalizeString(cidadeNomePlanilha);
                        
                        // Tenta encontrar a cidade no nosso mapa
                        let cidadeNomeRealNoMapa = AppState.normalizedCityNames[cidadeNomeNormalizadoPlanilha];

                        if (!cidadeNomeRealNoMapa) {
                            // Tentativa de correspondência parcial (menos robusta)
                            for (const [normalizedMapName, originalMapName] of Object.entries(AppState.normalizedCityNames)) {
                                if (normalizedMapName.includes(cidadeNomeNormalizadoPlanilha) || cidadeNomeNormalizadoPlanilha.includes(normalizedMapName)) {
                                    cidadeNomeRealNoMapa = originalMapName;
                                    break;
                                }
                            }
                        }
                        
                        if (cidadeNomeRealNoMapa) {
                            if (!AppState.cityAssignments[cidadeNomeRealNoMapa]) {
                                AppState.cityAssignments[cidadeNomeRealNoMapa] = [];
                            }
                            if (!AppState.cityAssignments[cidadeNomeRealNoMapa].includes(vendedorId)) {
                                AppState.cityAssignments[cidadeNomeRealNoMapa].push(vendedorId);
                            }
                        } else {
                            console.warn(`Cidade da planilha "${cidadeNomePlanilha}" não encontrada no mapa.`);
                        }
                    }
                }
            }
        }
    }

    // ========= PERSISTÊNCIA DE DADOS (LocalStorage) =========
    function loadSavedData() {
        showLoading(true, "Carregando dados salvos...");
        try {
            const savedFavorites = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES);
            if (savedFavorites) AppState.favorites = JSON.parse(savedFavorites);

            const savedGroups = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS);
            if (savedGroups) AppState.groups = JSON.parse(savedGroups);
            
            // Vendedores e Assignments são primariamente da planilha, mas podemos carregar se não houver conexão
            // Isso pode causar inconsistências se a planilha for a fonte da verdade.
            // Decidi carregar da planilha sempre que possível. Se precisar de offline total, esta lógica muda.
            const savedVendedores = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES);
            if (savedVendedores) AppState.vendedores = JSON.parse(savedVendedores);

            const savedAssignments = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.ASSIGNMENTS);
            if (savedAssignments) AppState.cityAssignments = JSON.parse(savedAssignments);


            const savedLastUpdate = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.LAST_UPDATE);
            if (savedLastUpdate) {
                AppState.lastUpdateTime = new Date(savedLastUpdate);
                DOMElements.lastUpdateSpan.textContent = formatDateTime(AppState.lastUpdateTime);
            }
        } catch (error) {
            console.error('Erro ao carregar dados do localStorage:', error);
            showNotification('Erro ao carregar dados salvos. Podem estar corrompidos.', 'warning');
            // Limpar localStorage se corrompido? Ou apenas ignorar e carregar da planilha.
            localStorage.removeItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES);
            localStorage.removeItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS);
        }
    }

    function saveDataToLocalStorage() {
        try {
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES, JSON.stringify(AppState.favorites));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS, JSON.stringify(AppState.groups));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES, JSON.stringify(AppState.vendedores));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(AppState.cityAssignments));
            if (AppState.lastUpdateTime) {
                localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.LAST_UPDATE, AppState.lastUpdateTime.toISOString());
            }
        } catch (error) {
            console.error('Erro ao salvar dados no localStorage:', error);
            showNotification('Erro ao salvar dados localmente. Pode ser que o armazenamento esteja cheio.', 'danger');
        }
    }
    
    // ========= ATUALIZAÇÃO DA INTERFACE (UI) =========
    function updateSelectedCityInfo() {
        if (!AppState.selectedCity) {
            DOMElements.selectedCityInfo.innerHTML = '<p class="empty-message">Nenhuma cidade selecionada</p>';
            DOMElements.selectedCityActions.classList.add('hidden');
            return;
        }

        const { name: cityName, id: cityId } = AppState.selectedCity;
        let vendedorHtml = '';
        const assignedVendedorIds = AppState.cityAssignments[cityName];

        if (assignedVendedorIds && assignedVendedorIds.length > 0) {
            vendedorHtml = '<p><strong>Vendedores Atribuídos:</strong></p><ul class="vendedores-list" style="list-style-type: none; padding-left: 0;">';
            assignedVendedorIds.forEach(vendedorId => {
                const vendedor = AppState.vendedores.find(v => v.id === vendedorId);
                if (vendedor) {
                    vendedorHtml += `
                        <li style="display: flex; align-items: center; margin-bottom: 5px;">
                            <div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div>
                            <div>
                                <div><strong>${vendedor.nome}</strong></div>
                                <div><small>Supervisor: ${vendedor.supervisor || 'N/A'}</small></div>
                            </div>
                        </li>
                    `;
                }
            });
            vendedorHtml += '</ul>';
        } else {
            vendedorHtml = '<p><em>Esta cidade não está atribuída a nenhum vendedor.</em></p>';
        }

        const ibgeLink = `https://cidades.ibge.gov.br/brasil/sp/${normalizeString(cityName).replace(/\s+/g, '-')}/panorama`;
        // const ibgeLink = `https://cidades.ibge.gov.br/panorama-impresso?codmun=${cityId}`; // Se o ID for o código do IBGE de 7 dígitos

        DOMElements.selectedCityInfo.innerHTML = `
            <h4>${cityName}</h4>
            ${vendedorHtml}
            <p><small>ID (GeoJSON): ${cityId}</small></p>
            <div class="btn-group" role="group">
                <a href="${ibgeLink}" target="_blank" class="btn btn-info btn-sm mt-10" style="margin-right: 5px;">
                    <i class="fas fa-info-circle"></i> Info IBGE
                </a>
                <button type="button" id="show-weather-forecast-selected" class="btn btn-primary btn-sm mt-10">
                    <i class="fas fa-cloud-sun"></i> Previsão do Tempo
                </button>
            </div>
        `;
        
        document.getElementById('show-weather-forecast-selected').addEventListener('click', () => {
            showWeatherForecastModal(AppState.selectedCity);
        });

        DOMElements.selectedCityActions.classList.remove('hidden');
        DOMElements.assignVendedorButton.innerHTML = (assignedVendedorIds && assignedVendedorIds.length > 0) ?
            '<i class="fas fa-user-tie"></i> Gerenciar Vendedores' :
            '<i class="fas fa-user-tie"></i> Atribuir a Vendedor';
    }

    function updateFavoritesList() {
        DOMElements.favoritesList.innerHTML = '';
        if (AppState.favorites.length === 0) {
            DOMElements.favoritesList.innerHTML = '<li class="empty-message">Nenhuma cidade favorita</li>';
            return;
        }

        const fragment = document.createDocumentFragment();
        AppState.favorites.forEach(city => {
            const li = document.createElement('li');
            li.className = 'list-item';

            const cityInfoDiv = document.createElement('div');
            cityInfoDiv.innerHTML = `<strong>${city.name}</strong>`;
            
            const assignedVendedorIds = AppState.cityAssignments[city.name];
            if (assignedVendedorIds && assignedVendedorIds.length > 0) {
                const badgeClass = assignedVendedorIds.length === 1 ? 'badge-success' : 'badge-warning';
                const iconClass = assignedVendedorIds.length === 1 ? 'fa-user-tie' : 'fa-users';
                const title = assignedVendedorIds.length === 1 ? `Vendedor: ${AppState.vendedores.find(v => v.id === assignedVendedorIds[0])?.nome || 'N/A'}` : `${assignedVendedorIds.length} vendedores`;
                cityInfoDiv.innerHTML += ` <span class="badge ${badgeClass}" title="${title}"><i class="fas ${iconClass}"></i></span>`;
            }
            li.appendChild(cityInfoDiv);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';

            // Select de Grupo
            const groupSelect = document.createElement('select');
            groupSelect.className = 'form-control form-control-sm'; // Adicionar form-control-sm se tiver
            groupSelect.style.maxWidth = '120px'; // Para não ocupar muito espaço
            groupSelect.innerHTML = '<option value="">Sem grupo</option>';
            Object.keys(AppState.groups).forEach(groupName => {
                const option = document.createElement('option');
                option.value = groupName;
                option.textContent = groupName;
                if (AppState.groups[groupName].includes(city.name)) {
                    option.selected = true;
                }
                groupSelect.appendChild(option);
            });
            groupSelect.addEventListener('change', function() {
                const selectedGroup = this.value;
                // Remove de todos os grupos primeiro
                Object.keys(AppState.groups).forEach(gName => {
                    AppState.groups[gName] = AppState.groups[gName].filter(cName => cName !== city.name);
                });
                // Adiciona ao novo grupo, se houver
                if (selectedGroup) {
                    AppState.groups[selectedGroup].push(city.name);
                }
                saveDataToLocalStorage();
                resetMapStyles(); // Atualiza estilos no mapa
                showNotification(`Cidade ${city.name} ${selectedGroup ? 'adicionada ao grupo ' + selectedGroup : 'removida de grupos'}.`);
            });
            actionsDiv.appendChild(groupSelect);

            // Botão Ver no Mapa
            const viewButton = document.createElement('button');
            viewButton.className = 'btn btn-primary btn-sm';
            viewButton.innerHTML = '<i class="fas fa-eye"></i>';
            viewButton.title = 'Ver no mapa';
            viewButton.addEventListener('click', () => {
                const cityLayer = AppState.cityLayers[city.name];
                if (cityLayer) {
                    AppState.map.fitBounds(cityLayer.getBounds());
                    cityLayer.fire('click'); // Simula clique para selecionar
                }
            });
            actionsDiv.appendChild(viewButton);

            // Botão Remover Favorito
            const removeButton = document.createElement('button');
            removeButton.className = 'btn btn-danger btn-sm';
            removeButton.innerHTML = '<i class="fas fa-trash"></i>';
            removeButton.title = 'Remover dos favoritos';
            removeButton.addEventListener('click', () => {
                AppState.favorites = AppState.favorites.filter(fav => fav.name !== city.name);
                // Também remove de todos os grupos se removido dos favoritos
                Object.keys(AppState.groups).forEach(gName => {
                    AppState.groups[gName] = AppState.groups[gName].filter(cName => cName !== city.name);
                });
                saveDataToLocalStorage();
                updateFavoritesList(); // Re-renderiza esta lista
                updateGroupsLists(); // Atualiza contagem nos grupos
                resetMapStyles(); // Atualiza estilo no mapa
                showNotification(`Cidade ${city.name} removida dos favoritos.`);
            });
            actionsDiv.appendChild(removeButton);
            
            li.appendChild(actionsDiv);
            fragment.appendChild(li);
        });
        DOMElements.favoritesList.appendChild(fragment);
    }

    function updateGroupsLists() {
        DOMElements.groupsList.innerHTML = '';
        // Limpa select, mantendo a primeira opção
        while (DOMElements.groupSelect.options.length > 1) DOMElements.groupSelect.remove(1);

        if (Object.keys(AppState.groups).length === 0) {
            DOMElements.groupsList.innerHTML = '<li class="empty-message">Nenhum grupo criado</li>';
            return;
        }

        const fragmentList = document.createDocumentFragment();
        const fragmentSelect = document.createDocumentFragment();

        Object.keys(AppState.groups).sort().forEach(groupName => {
            // Opção para o select
            const option = document.createElement('option');
            option.value = groupName;
            option.textContent = groupName;
            fragmentSelect.appendChild(option);

            // Item para a lista
            const li = document.createElement('li');
            li.className = 'list-item';
            li.innerHTML = `
                <div>
                    <strong>${groupName}</strong> 
                    <span class="badge badge-primary">${AppState.groups[groupName].length}</span>
                </div>
                <div class="actions">
                    <button type="button" class="btn btn-warning btn-sm btn-highlight-group" title="Destacar grupo no mapa">
                        <i class="fas fa-highlighter"></i>
                    </button>
                    <button type="button" class="btn btn-danger btn-sm btn-remove-group" title="Remover grupo">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            li.querySelector('.btn-highlight-group').addEventListener('click', () => {
                DOMElements.groupSelect.value = groupName; // Sincroniza o select
                highlightGroupOnMap(groupName);
            });
            li.querySelector('.btn-remove-group').addEventListener('click', () => {
                if (confirm(`Tem certeza que deseja remover o grupo "${groupName}"? As cidades não serão removidas dos favoritos.`)) {
                    delete AppState.groups[groupName];
                    saveDataToLocalStorage();
                    updateGroupsLists(); // Re-renderiza esta lista
                    updateFavoritesList(); // Re-renderiza selects de grupo nos favoritos
                    if (AppState.activeGroup === groupName) {
                        AppState.activeGroup = null;
                        resetMapStyles();
                    }
                    showNotification(`Grupo ${groupName} removido.`);
                }
            });
            fragmentList.appendChild(li);
        });
        DOMElements.groupSelect.appendChild(fragmentSelect);
        DOMElements.groupsList.appendChild(fragmentList);
    }

    function updateVendedoresList() {
        DOMElements.vendedoresList.innerHTML = '';
        // Limpa select de atribuição de vendedor, mantendo a primeira opção
        while (DOMElements.assignVendedorSelect.options.length > 1) DOMElements.assignVendedorSelect.remove(1);
        // Limpa select de clima, mantendo a primeira opção
        while (DOMElements.weatherVendedorSelect.options.length > 1) DOMElements.weatherVendedorSelect.remove(1);


        if (AppState.vendedores.length === 0) {
            DOMElements.vendedoresList.innerHTML = '<li class="empty-message">Nenhum vendedor cadastrado</li>';
            return;
        }

        const fragmentList = document.createDocumentFragment();
        const fragmentAssignSelect = document.createDocumentFragment();
        const fragmentWeatherSelect = document.createDocumentFragment();

        AppState.vendedores.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(vendedor => {
            // Opção para select de atribuição
            const assignOption = document.createElement('option');
            assignOption.value = vendedor.id;
            assignOption.textContent = `${vendedor.nome} (${vendedor.supervisor})`;
            fragmentAssignSelect.appendChild(assignOption);
            
            // Opção para select de clima
            const weatherOption = document.createElement('option');
            weatherOption.value = vendedor.id;
            weatherOption.textContent = vendedor.nome;
            fragmentWeatherSelect.appendChild(weatherOption);

            // Item para a lista de vendedores
            const li = document.createElement('li');
            li.className = 'list-item';
            const cidadesCount = Object.values(AppState.cityAssignments).flat().filter(id => id === vendedor.id).length;

            li.innerHTML = `
                <div>
                    <div class="vendedor-list-item-info">
                        <div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div>
                        <strong>${vendedor.nome}</strong>
                    </div>
                    <div class="vendedor-list-item-details">
                        <small>Supervisor: ${vendedor.supervisor || 'N/A'}</small>
                        <span class="badge badge-primary">${cidadesCount} cidades</span>
                    </div>
                </div>
                <div class="actions">
                    <button type="button" class="btn btn-primary btn-sm btn-vendedor-details" title="Ver detalhes">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button type="button" class="btn btn-warning btn-sm btn-highlight-vendedor-map" title="Ver cidades no mapa">
                        <i class="fas fa-map-marker-alt"></i>
                    </button>
                </div>
            `;
            li.querySelector('.btn-vendedor-details').addEventListener('click', () => showVendedorDetailsModal(vendedor));
            li.querySelector('.btn-highlight-vendedor-map').addEventListener('click', () => highlightVendedorCitiesOnMap(vendedor.id));
            
            fragmentList.appendChild(li);
        });
        DOMElements.assignVendedorSelect.appendChild(fragmentAssignSelect);
        DOMElements.weatherVendedorSelect.appendChild(fragmentWeatherSelect);
        DOMElements.vendedoresList.appendChild(fragmentList);
    }
    
    function updateUIAfterDataLoad() {
        updateFavoritesList();
        updateGroupsLists();
        updateVendedoresList(); // Isso também popula os selects de clima e atribuição
        resetMapStyles(); // Aplicar estilos iniciais às cidades
    }

    // ========= MODAIS ESPECÍFICOS =========
    function prepareAssignVendedorModal() {
        if (!AppState.selectedCity) return;
        DOMElements.assignCityNameSpan.textContent = AppState.selectedCity.name;
        DOMElements.assignVendedorSelect.value = ''; // Reseta o select

        const assignedVendedorIds = AppState.cityAssignments[AppState.selectedCity.name];
        DOMElements.assignedVendedoresList.innerHTML = '';

        if (assignedVendedorIds && assignedVendedorIds.length > 0) {
            const fragment = document.createDocumentFragment();
            assignedVendedorIds.forEach(vendedorId => {
                const vendedor = AppState.vendedores.find(v => v.id === vendedorId);
                if (vendedor) {
                    const li = document.createElement('li');
                    li.className = 'list-item';
                    li.innerHTML = `
                        <div class="vendedor-list-item-info">
                            <div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div>
                            <span>${vendedor.nome}</span>
                        </div>
                        <button type="button" class="btn btn-danger btn-sm btn-remove-assignment" title="Remover atribuição">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    li.querySelector('.btn-remove-assignment').addEventListener('click', () => {
                        AppState.cityAssignments[AppState.selectedCity.name] = AppState.cityAssignments[AppState.selectedCity.name].filter(id => id !== vendedorId);
                        if (AppState.cityAssignments[AppState.selectedCity.name].length === 0) {
                            delete AppState.cityAssignments[AppState.selectedCity.name];
                        }
                        saveDataToLocalStorage();
                        prepareAssignVendedorModal(); // Re-renderiza este modal
                        updateSelectedCityInfo();   // Atualiza info na sidebar
                        updateVendedoresList();     // Atualiza contagem de cidades dos vendedores
                        resetMapStyles();           // Atualiza estilo no mapa
                        showNotification(`Vendedor ${vendedor.nome} removido da cidade ${AppState.selectedCity.name}.`);
                    });
                    fragment.appendChild(li);
                }
            });
            DOMElements.assignedVendedoresList.appendChild(fragment);
            DOMElements.currentVendedoresContainer.classList.remove('hidden');
        } else {
            DOMElements.currentVendedoresContainer.classList.add('hidden');
        }
        openModal(DOMElements.modalAssignVendedor);
    }

    function showVendedorDetailsModal(vendedor) {
        DOMElements.vendedorDetailsModalTitle.innerHTML = `
            <div class="vendedor-list-item-info">
                <div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div>
                Detalhes do Vendedor
            </div>`;
        DOMElements.detailVendedorNomeSpan.textContent = vendedor.nome;
        DOMElements.detailVendedorSupervisorSpan.textContent = vendedor.supervisor || 'N/A';

        DOMElements.vendedorCidadesList.innerHTML = '';
        const cidadesAtribuidas = Object.keys(AppState.cityAssignments).filter(
            cityName => AppState.cityAssignments[cityName]?.includes(vendedor.id)
        ).sort();

        if (cidadesAtribuidas.length === 0) {
            DOMElements.vendedorCidadesList.innerHTML = '<li class="empty-message">Nenhuma cidade atribuída</li>';
        } else {
            const fragment = document.createDocumentFragment();
            cidadesAtribuidas.forEach(cityName => {
                const li = document.createElement('li');
                li.className = 'list-item';
                
                let cityHtml = cityName;
                const cityTotalAssignments = AppState.cityAssignments[cityName]?.length || 0;
                if (cityTotalAssignments > 1) {
                    cityHtml += ` <span class="badge badge-warning" title="Atendida por ${cityTotalAssignments} vendedores"><i class="fas fa-users"></i> ${cityTotalAssignments}</span>`;
                }

                li.innerHTML = `
                    <div>${cityHtml}</div>
                    <div class="actions">
                        <button type="button" class="btn btn-primary btn-sm btn-view-city-on-map" title="Ver cidade no mapa">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                `;
                li.querySelector('.btn-view-city-on-map').addEventListener('click', () => {
                    const cityLayer = AppState.cityLayers[cityName];
                    if (cityLayer) {
                        closeAllModals();
                        AppState.map.fitBounds(cityLayer.getBounds());
                        cityLayer.fire('click');
                    }
                });
                fragment.appendChild(li);
            });
            DOMElements.vendedorCidadesList.appendChild(fragment);
        }
        // Atualiza o handler do botão para o vendedor atual
        DOMElements.highlightVendedorCitiesButton.onclick = () => {
            highlightVendedorCitiesOnMap(vendedor.id);
            closeAllModals();
        };
        openModal(DOMElements.modalVendedorDetails);
    }
    
    // ========= FUNÇÕES DE CLIMA =========
    async function getCityCoordinatesForWeather(cityName) {
        try {
            // Tenta pegar do GeoJSON primeiro, se a cidade foi clicada ou é conhecida
            if (AppState.cityLayers[cityName]) {
                 const bounds = AppState.cityLayers[cityName].getBounds();
                 const center = bounds.getCenter();
                 return { name: cityName, lat: center.lat, lon: center.lng, admin1: 'São Paulo', country: 'Brasil' };
            }
            // Se não, usa a API de geocodificação
            const response = await fetch(`${AppConfig.weatherApiGeocode}?name=${encodeURIComponent(cityName)}&count=1&language=pt&format=json`);
            if (!response.ok) throw new Error('Erro ao obter coordenadas da cidade para clima.');
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return {
                    name: data.results[0].name,
                    lat: data.results[0].latitude,
                    lon: data.results[0].longitude,
                    admin1: data.results[0].admin1,
                    country: data.results[0].country
                };
            } else {
                throw new Error('Cidade não encontrada para clima.');
            }
        } catch (error) {
            console.error('Erro na geocodificação para clima:', error);
            return null;
        }
    }

    async function getWeatherForecast(lat, lon) {
        try {
            const params = new URLSearchParams({
                latitude: lat, longitude: lon,
                hourly: 'temperature_2m,relativehumidity_2m,precipitation,weathercode,windspeed_10m',
                daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum',
                timezone: 'America/Sao_Paulo', forecast_days: 7, // 7 dias para não ser muito pesado
                current_weather: 'true' // Corrigido para string 'true'
            });
            const response = await fetch(`${AppConfig.weatherApiForecast}?${params.toString()}`);
            if (!response.ok) throw new Error('Erro ao obter previsão meteorológica.');
            return await response.json();
        } catch (error) {
            console.error('Erro na API de previsão do tempo:', error);
            showNotification('Erro ao carregar previsão meteorológica.', 'warning');
            return null;
        }
    }

    function formatForecastDate(dateString, formatType = 'full') {
        const date = new Date(dateString);
        const dia = date.getDate();
        const mes = AppConfig.meses[date.getMonth()];
        const diaSemana = AppConfig.diasSemana[date.getDay()];
        if (formatType === 'short') return `${diaSemana.substring(0,3)}, ${dia}/${date.getMonth()+1}`;

        const hora = date.getHours().toString().padStart(2, '0');
        const minuto = date.getMinutes().toString().padStart(2, '0');
        return `${diaSemana}, ${dia} de ${mes} ${hora}:${minuto}`;
    }
    
    function getWeatherInfo(code) {
        const weatherCodes = {
            0: { description: 'Céu limpo', icon: 'sun' }, 1: { description: 'Principalmente limpo', icon: 'sun' },
            2: { description: 'Parcialmente nublado', icon: 'cloud-sun' }, 3: { description: 'Nublado', icon: 'cloud' },
            45: { description: 'Nevoeiro', icon: 'smog' }, 48: { description: 'Nevoeiro com geada', icon: 'smog' },
            51: { description: 'Garoa leve', icon: 'cloud-rain' }, 53: { description: 'Garoa moderada', icon: 'cloud-rain' },
            55: { description: 'Garoa densa', icon: 'cloud-rain' },
            61: { description: 'Chuva fraca', icon: 'cloud-rain' }, 63: { description: 'Chuva moderada', icon: 'cloud-showers-heavy' },
            65: { description: 'Chuva forte', icon: 'cloud-showers-heavy' },
            71: { description: 'Neve leve', icon: 'snowflake' }, 73: { description: 'Neve moderada', icon: 'snowflake' },
            75: { description: 'Neve intensa', icon: 'snowflake' },
            80: { description: 'Pancadas de chuva leves', icon: 'cloud-rain' }, 81: { description: 'Pancadas de chuva moderadas', icon: 'cloud-showers-heavy' },
            82: { description: 'Pancadas de chuva violentas', icon: 'cloud-showers-heavy' },
            95: { description: 'Tempestade', icon: 'bolt' }, 96: { description: 'Tempestade com granizo leve', icon: 'cloud-bolt' },
            99: { description: 'Tempestade com granizo forte', icon: 'cloud-bolt' }
        };
        return weatherCodes[code] || { description: 'Desconhecido', icon: 'question' };
    }

    async function showWeatherForecastModal(city) { // city é {name, id, layer}
        AppState.currentWeatherModalCity = city; // Salva a cidade para o modal
        DOMElements.weatherModalTitle.textContent = `Previsão - ${city.name}`;
        DOMElements.weatherModalBody.innerHTML = `
            <div style="text-align: center;">
                <div class="loader-spinner" style="margin: 20px auto;"></div>
                <p>Carregando previsão meteorológica...</p>
            </div>`;
        openModal(DOMElements.modalWeatherForecast);

        let coords;
        if (city.layer) { // Se temos a layer, usamos o centro dela
            const bounds = city.layer.getBounds();
            const center = bounds.getCenter();
            coords = { lat: center.lat, lon: center.lng };
        } else { // Senão, tentamos geocodificar pelo nome
            const cityData = await getCityCoordinatesForWeather(city.name);
            if (!cityData) {
                DOMElements.weatherModalBody.innerHTML = `<div class="alert alert-warning">Não foi possível obter as coordenadas de ${city.name}.</div>`;
                return;
            }
            coords = { lat: cityData.lat, lon: cityData.lon };
        }
        
        const forecast = await getWeatherForecast(coords.lat, coords.lon);
        if (!forecast) {
            DOMElements.weatherModalBody.innerHTML = `<div class="alert alert-warning">Não foi possível obter a previsão para ${city.name}.</div>`;
            return;
        }

        let forecastHTML = `<div class="weather-city-info"><h5>${city.name}</h5></div>`;

        if (forecast.current_weather) {
            const cw = forecast.current_weather;
            const wi = getWeatherInfo(cw.weathercode);
            forecastHTML += `
                <div class="card">
                    <div class="card-header"><strong>Clima Atual</strong> (${formatForecastDate(cw.time)})</div>
                    <div class="card-body" style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center;">
                            <i class="fas fa-${wi.icon}" style="font-size: 2.5rem; margin-right: 15px; color: var(--primary-color);"></i>
                            <div>
                                <div style="font-size: 1.8rem; font-weight: bold;">${cw.temperature.toFixed(0)}°C</div>
                                <div>${wi.description}</div>
                            </div>
                        </div>
                        <div>
                            <div><i class="fas fa-wind"></i> ${cw.windspeed.toFixed(1)} km/h</div>
                        </div>
                    </div>
                </div>`;
        }

        if (forecast.daily) {
            forecastHTML += `
                <div class="card mt-15">
                    <div class="card-header"><strong>Próximos Dias</strong></div>
                    <div class="card-body" style="padding: 0;">
                        <div class="daily-forecast">`;
            for (let i = 0; i < forecast.daily.time.length; i++) {
                const date = forecast.daily.time[i];
                const wi = getWeatherInfo(forecast.daily.weathercode[i]);
                forecastHTML += `
                    <div class="list-item" style="font-size: 0.9rem;">
                        <div style="flex: 1.5;"><strong>${formatForecastDate(date, 'short')}</strong></div>
                        <div style="flex: 1; text-align: center;">
                            <i class="fas fa-${wi.icon}" title="${wi.description}" style="font-size: 1.1rem;"></i>
                        </div>
                        <div style="flex: 2; text-align: left; padding-left: 5px;">${wi.description}</div>
                        <div style="flex: 1; text-align: right;">
                            ${forecast.daily.temperature_2m_max[i].toFixed(0)}° / ${forecast.daily.temperature_2m_min[i].toFixed(0)}°
                        </div>
                         <div style="flex: 1; text-align: right; font-size:0.8rem">
                            <i class="fas fa-tint"></i> ${forecast.daily.precipitation_sum[i].toFixed(1)}mm
                        </div>
                    </div>`;
            }
            forecastHTML += `</div></div></div>`;
        }
        // Poderia adicionar previsão horária aqui se necessário (fica extenso)
        DOMElements.weatherModalBody.innerHTML = forecastHTML;
    }

    async function addWeatherToMap(cityName, lat, lon) {
        try {
            const forecast = await getWeatherForecast(lat, lon);
            if (!forecast || !forecast.current_weather) return null;

            const cw = forecast.current_weather;
            const wi = getWeatherInfo(cw.weathercode);
            const temp = cw.temperature;

            const weatherIcon = L.divIcon({
                html: `
                    <div style="background-color: white; border-radius: 50%; padding: 5px; border: 2px solid var(--secondary-color); width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                        <i class="fas fa-${wi.icon}" style="font-size: 1.2rem; color: var(--secondary-color);"></i>
                        <span style="position: absolute; bottom: -5px; right: -5px; background-color: var(--secondary-color); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; border: 1px solid white;">
                            ${temp.toFixed(0)}°
                        </span>
                    </div>`,
                className: 'weather-map-icon', iconSize: [40, 40], iconAnchor: [20, 40] // Anchor no pé do ícone
            });
            
            const marker = L.marker([lat, lon], { icon: weatherIcon }).addTo(AppState.map);
            marker.bindTooltip(`
                <strong>${cityName}</strong><br>
                <i class="fas fa-${wi.icon}"></i> ${wi.description}, ${temp.toFixed(1)}°C<br>
                Vento: ${cw.windspeed.toFixed(1)} km/h
            `);
            AppState.weatherMarkers.push(marker);
            return marker;
        } catch (error) {
            console.error('Erro ao adicionar clima ao mapa:', error);
            return null;
        }
    }

    function clearWeatherMarkers() {
        AppState.weatherMarkers.forEach(marker => AppState.map.removeLayer(marker));
        AppState.weatherMarkers = [];
    }

    async function showWeatherForVendedorCities(vendedorId) {
        clearWeatherMarkers();
        const vendedor = AppState.vendedores.find(v => v.id === vendedorId);
        if (!vendedor) return;

        const cidadesDoVendedor = Object.keys(AppState.cityAssignments).filter(
            cityName => AppState.cityAssignments[cityName]?.includes(vendedorId)
        );

        if (cidadesDoVendedor.length === 0) {
            showNotification(`Nenhuma cidade atribuída a ${vendedor.nome}.`, 'warning');
            return;
        }
        showNotification(`Carregando clima para ${cidadesDoVendedor.length} cidades de ${vendedor.nome}...`, 'info');
        
        let markersAdded = 0;
        for (const cityName of cidadesDoVendedor) {
            if (AppState.cityLayers[cityName]) {
                const bounds = AppState.cityLayers[cityName].getBounds();
                const center = bounds.getCenter();
                if (await addWeatherToMap(cityName, center.lat, center.lng)) {
                    markersAdded++;
                }
            }
        }
        if (markersAdded > 0) {
             showNotification(`Clima exibido para ${markersAdded} cidades.`, 'success');
        } else {
             showNotification('Não foi possível exibir o clima para as cidades.', 'warning');
        }
    }


    // ========= MANIPULADORES DE EVENTOS GLOBAIS =========
    function setupEventListeners() {
        // Toggle Sidebar
        DOMElements.toggleSidebarButton.addEventListener('click', () => {
            DOMElements.sidebar.classList.toggle('collapsed');
            const icon = DOMElements.toggleSidebarButton.querySelector('i');
            icon.className = DOMElements.sidebar.classList.contains('collapsed') ? 'fas fa-bars' : 'fas fa-chevron-left';
            // Força o redimensionamento do mapa após a animação da sidebar
            setTimeout(() => AppState.map.invalidateSize(), 310);
        });

        // Abas da Sidebar
        DOMElements.sidebarTabsContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.tab-button');
            if (!button) return;

            DOMElements.tabButtons.forEach(btn => btn.classList.remove('active'));
            DOMElements.tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            const tabId = `tab-${button.dataset.tab}`;
            const activeContent = document.getElementById(tabId);
            if (activeContent) activeContent.classList.add('active');
        });

        // Busca de Cidade
        DOMElements.searchButton.addEventListener('click', handleSearchCity);
        DOMElements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearchCity();
        });

        // Ações da Cidade Selecionada
        DOMElements.addFavoriteButton.addEventListener('click', handleAddFavorite);
        DOMElements.assignVendedorButton.addEventListener('click', () => {
             if (!AppState.selectedCity) return;
             if (AppState.vendedores.length === 0) {
                showNotification('Nenhum vendedor cadastrado. Carregue os dados da planilha primeiro.', 'warning');
                return;
             }
             prepareAssignVendedorModal();
        });

        // Modal de Atribuição de Vendedor
        DOMElements.confirmAssignVendedorButton.addEventListener('click', handleConfirmAssignVendedor);

        // Grupos
        DOMElements.createGroupButton.addEventListener('click', handleCreateGroup);
        DOMElements.groupSelect.addEventListener('change', (event) => {
            highlightGroupOnMap(event.target.value);
        });

        // Sincronização
        DOMElements.reloadDataButton.addEventListener('click', () => {
            if (confirm("Isso irá recarregar os dados da planilha, sobrescrevendo vendedores e atribuições locais. Deseja continuar?")) {
                loadDataFromSheets();
            }
        });
        
        // Clima
        DOMElements.showWeatherForVendedorButton.addEventListener('click', () => {
            const vendedorId = DOMElements.weatherVendedorSelect.value;
            if (!vendedorId) {
                showNotification('Selecione um vendedor para ver o clima.', 'warning');
                return;
            }
            showWeatherForVendedorCities(vendedorId);
        });
        DOMElements.clearWeatherMarkersButton.addEventListener('click', clearWeatherMarkers);


        // Fechar Modais (delegação de evento)
        document.addEventListener('click', (event) => {
            if (event.target.matches('.modal-close')) {
                const modal = event.target.closest('.modal');
                if (modal) closeModal(modal);
            }
            // Clicar no backdrop para fechar
            if (event.target.matches('.modal.show')) {
                 closeModal(event.target);
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === "Escape") {
                closeAllModals();
            }
        });
    }

    // ========= LÓGICA DOS HANDLERS DE EVENTO =========
    function handleSearchCity() {
        const searchTerm = DOMElements.searchInput.value.trim();
        if (!searchTerm) return;
        const normalizedSearchTerm = normalizeString(searchTerm);

        let foundCityName = AppState.normalizedCityNames[normalizedSearchTerm]; // Tentativa exata
        if (!foundCityName) { // Tentativa parcial
            const partialMatchKey = Object.keys(AppState.normalizedCityNames).find(
                key => key.includes(normalizedSearchTerm) || normalizedSearchTerm.includes(key)
            );
            if (partialMatchKey) foundCityName = AppState.normalizedCityNames[partialMatchKey];
        }

        if (foundCityName && AppState.cityLayers[foundCityName]) {
            const layer = AppState.cityLayers[foundCityName];
            AppState.map.fitBounds(layer.getBounds());
            layer.fire('click'); // Simula clique para selecionar
            showNotification(`Cidade ${foundCityName} encontrada.`);
            DOMElements.searchInput.value = ''; // Limpa busca
        } else {
            showNotification(`Cidade "${searchTerm}" não encontrada.`, 'warning');
        }
    }

    function handleAddFavorite() {
        if (!AppState.selectedCity) return;
        const alreadyFavorite = AppState.favorites.some(fav => fav.name === AppState.selectedCity.name);
        if (alreadyFavorite) {
            showNotification(`${AppState.selectedCity.name} já está nos favoritos.`, 'info');
        } else {
            AppState.favorites.push({ name: AppState.selectedCity.name, id: AppState.selectedCity.id });
            saveDataToLocalStorage();
            updateFavoritesList();
            resetMapStyles(); // Atualiza estilo da cidade no mapa
            showNotification(`${AppState.selectedCity.name} adicionada aos favoritos.`);
        }
    }
    
    function handleConfirmAssignVendedor() {
        const vendedorId = DOMElements.assignVendedorSelect.value;
        if (!AppState.selectedCity || !vendedorId) {
            showNotification('Selecione um vendedor.', 'warning');
            return;
        }

        const cityName = AppState.selectedCity.name;
        if (!AppState.cityAssignments[cityName]) {
            AppState.cityAssignments[cityName] = [];
        }

        if (AppState.cityAssignments[cityName].includes(vendedorId)) {
            showNotification('Este vendedor já está atribuído a esta cidade.', 'info');
            closeModal(DOMElements.modalAssignVendedor);
            return;
        }

        AppState.cityAssignments[cityName].push(vendedorId);
        saveDataToLocalStorage();
        
        prepareAssignVendedorModal(); // Atualiza o próprio modal (para caso de adicionar outro)
        updateSelectedCityInfo();
        updateVendedoresList(); // Atualizar contagem de cidades
        resetMapStyles();
        
        const vendedor = AppState.vendedores.find(v => v.id === vendedorId);
        showNotification(`Cidade ${cityName} atribuída ao vendedor ${vendedor.nome}.`);
        // Não fechar o modal automaticamente, o usuário pode querer adicionar mais
    }

    function handleCreateGroup() {
        const groupName = DOMElements.groupNameInput.value.trim();
        if (!groupName) {
            showNotification('Digite um nome para o grupo.', 'warning');
            return;
        }
        if (AppState.groups[groupName]) {
            showNotification('Já existe um grupo com este nome.', 'warning');
            return;
        }
        AppState.groups[groupName] = [];
        saveDataToLocalStorage();
        updateGroupsLists();
        updateFavoritesList(); // Para atualizar os selects de grupo nos favoritos
        DOMElements.groupNameInput.value = '';
        showNotification(`Grupo "${groupName}" criado com sucesso.`);
    }


    // ========= INICIALIZAÇÃO DA APLICAÇÃO =========
    async function initializeApp() {
        initDOMElements(); // Cacheia os elementos do DOM
        DOMElements.spreadsheetIdDisplay.textContent = AppConfig.spreadsheetId;
        DOMElements.configRangeNameDisplay.textContent = AppConfig.range;


        if (AppConfig.apiKey === "SUA_API_KEY_RESTRITA_AQUI" || !AppConfig.apiKey) {
             console.warn("***************************************************************************");
             console.warn("ALERTA: API Key do Google Sheets não configurada ou usando valor padrão!");
             console.warn("Acesse script.js, localize AppConfig.apiKey e insira sua chave restrita.");
             console.warn("Sem uma API Key válida, a funcionalidade da planilha não funcionará.");
             console.warn("***************************************************************************");
             showNotification("API Key do Google Sheets não configurada! Funcionalidades da planilha desabilitadas.", "danger", 15000);
        }


        setupEventListeners();
        initMap();

        try {
            const geoJsonData = await loadGeoJsonWithFallback();
            processGeoJsonData(geoJsonData); // Processa e adiciona ao mapa

            loadSavedData(); // Carrega favoritos, grupos, etc. do localStorage
            
            // Se não houver vendedores do localStorage OU se for a primeira carga sem lastUpdate
            // OU se o usuário explicitamente recarregar, então busca da planilha.
            // Por padrão, agora sempre carrega da planilha na inicialização para manter dados atualizados.
            // A lógica de só carregar se não tiver local foi removida para priorizar dados da planilha.
            await loadDataFromSheets(); 
            // loadDataFromSheets já chama updateUIAfterDataLoad e saveDataToLocalStorage
            // Se loadDataFromSheets falhar ou não carregar, ainda precisamos atualizar UI com dados locais
            if (AppState.vendedores.length === 0) { // Se a planilha falhou e não temos vendedores
                 updateUIAfterDataLoad(); // Atualiza UI com o que foi carregado do localStorage
            }

        } catch (error) {
            console.error("Erro crítico na inicialização do mapa ou dados:", error);
            showNotification(`Erro crítico: ${error.message}. Algumas funcionalidades podem não operar.`, "danger", 10000);
            // Mesmo com erro, tenta atualizar a UI com o que tiver sido carregado do localStorage
            updateUIAfterDataLoad();
        } finally {
            showLoading(false);
        }
    }

    initializeApp();
});