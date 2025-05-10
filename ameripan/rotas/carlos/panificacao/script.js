//_TOOL_MERGE_BLOCK_בקשה_להדגמה_של_Edimarpcosta_עם_המשתמש_1715313944171
//_CONTINUE_
document.addEventListener('DOMContentLoaded', () => {
    // ========= CONFIGURAÇÃO DA APLICAÇÃO =========
    const AppConfig = {
        spreadsheetId: "1vWWvnYGgZyqVYMoBfcciCCGgEN1FLzSrmXYPBOPKUjk", // SEU ID DA PLANILHA
        apiKey: "AIzaSyChiZPUY-G3oyZN2NGY_vlgRXUzry9Pkeo", // SUA API KEY RESTRINGIDA
        range: "panificacao", // NOME CORRETO DA ABA DA SUA PLANILHA
        geoJsonUrls: [ // URLs para fallback do GeoJSON
            'https://edimarpcosta.github.io/geojson/geojs-35-mun.json',
            'https://gitlab.c3sl.ufpr.br/simcaq/geodata-br/-/raw/master/geojson/geojs-35-mun.json',
            'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-35-mun.json',
            'https://raw.githubusercontent.com/Edimarpcosta/edimarpcosta.github.io/refs/heads/main/geojson/geojs-35-mun.json'
        ],
        mapInitialView: { lat: -23.5505, lng: -46.6333 },
        mapInitialZoom: 7,
        vendedorColors: [ // Cores para os vendedores
            '#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6', '#E6B333', '#3366E6', '#999966',
            '#99FF99', '#B34D4D', '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', '#FF99E6',
            '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC', '#66994D', '#B366CC', '#4D8000', '#B33300',
            '#CC80CC', '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399', '#E666B3', '#33991A',
            '#CC9999', '#B3B31A', '#00E680', '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
            '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', '#E64D66', '#4DB380', '#FF4D4D',
            '#99E6E6', '#6666FF', '#f39c12', '#27ae60', '#c0392b', '#8e44ad', '#2980b9', '#d35400',
            '#16a085', '#2c3e50', '#7f8c8d', '#f1c40f', '#1abc9c', '#e67e22', '#e74c3c', '#9b59b6',
            '#3498db', '#34495e', '#95a5a6', '#fdd835', '#43a047', '#d81b60', '#00897b', '#1e88e5',
            '#8e24aa', '#f4511e', '#5e35b1', '#039be5', '#6d4c41', '#455a64', '#c2185b', '#00acc1',
            '#7cb342', '#fb8c00', '#546e7a', '#3949ab', '#00838f', '#f9a825', '#ad1457', '#6a1b9a',
            '#283593', '#0277bd', '#00695c', '#2e7d32', '#ef6c00', '#d84315', '#4e342e', '#37474f',
            '#F08080', '#E0FFFF', '#FAFAD2', '#D2B48C', '#FFDEAD', '#98FB98', '#AFEEEE', '#DB7093',
            '#FFEFD5', '#FFDAB9', '#CD853F', '#FFC0CB', '#DDA0DD', '#B0E0E6', '#87CEFA', '#778899',
            '#B0C4DE', '#FFFFE0', '#32CD32', '#FAF0E6', '#800000', '#6B8E23', '#FF00FF', '#F0E68C',
            '#E6E6FA', '#FFF0F5', '#DCDCDC', '#F8F8FF', '#FFD700' // Total 100 cores
        ],
    };

    // ========= ESTADO DA APLICAÇÃO =========
    const AppState = {
        map: null,
        selectedCity: null, // Objeto: { name: string, id: string, layer: L.Layer }
        cityLayers: {}, // Cache: { cityName: L.Layer }
        normalizedCityNames: {}, // Cache: { normalizedName: originalName }
        cityPopulations: {}, // Cache: { cityNameNormalized: population }
        favorites: [], // Array de objetos { name: string, id: string }
        groups: {}, // Objeto: { groupName: [cityName1, cityName2, ...] }
        // Estrutura do vendedor: { id, nome, supervisor, codigoVendedor, totalCadastros, totalPositivados, color, cidades: [cityName1,...] }
        vendedores: [],
        cityAssignments: {}, // Cache: { cityName: [vendedorId1, vendedorId2, ...] }
        activeGroup: null, // Nome do grupo ativo para destaque
        activeVendedorId: null, // ID do vendedor ativo para destaque
        lastUpdateTime: null, // Data da última atualização da planilha
        cityInfoMarker: null, // Referência ao marcador de ícone de informação no hover
        cityInfoMarkerTimeout: null, // Timeout para remover o marcador de informação
    };

    // ========= CONSTANTES =========
    const CONSTANTS = { // Atualize as versões se a estrutura de dados do localStorage mudar
        LOCAL_STORAGE_KEYS: {
            FAVORITES: 'sga_territoriale_fav_v6',
            GROUPS: 'sga_territoriale_grp_v6',
            VENDEDORES: 'sga_territoriale_vnd_v6',
            LAST_UPDATE: 'sga_territoriale_upd_v6',
            CITY_POPULATIONS: 'sga_territoriale_pop_v6'
        },
        DEFAULT_CITY_STYLE: { fillColor: '#3388ff', fillOpacity: 0.2, color: '#3388ff', weight: 1, dashArray: '' },
        SELECTED_CITY_STYLE: { fillColor: '#ff7800', fillOpacity: 0.7, color: '#ff7800', weight: 3, dashArray: '' },
        HIGHLIGHT_GROUP_STYLE: { fillColor: '#9b59b6', fillOpacity: 0.6, color: '#9b59b6', weight: 3, dashArray: '' },
        HIGHLIGHT_VENDEDOR_STYLE: { fillColor: '#e74c3c', fillOpacity: 0.7, color: '#e74c3c', weight: 3, dashArray: '' },
        MULTIPLE_VENDEDORES_STYLE: { fillColor: '#f39c12', fillOpacity: 0.6, color: '#f39c12', weight: 2, dashArray: '5, 5' }
    };

    // ========= ELEMENTOS DO DOM (Cache) =========
    const DOMElements = {};

    function initDOMElements() {
        DOMElements.loadingOverlay = document.getElementById('loading-overlay');
        DOMElements.loadingMessage = document.getElementById('loading-message');
        DOMElements.syncStatus = document.getElementById('sync-status');
        DOMElements.sidebar = document.getElementById('sidebar');
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
        DOMElements.modalAssignVendedor = document.getElementById('modal-assign-vendedor');
        DOMElements.assignCityNameSpan = document.getElementById('assign-city-name').querySelector('strong');
        DOMElements.currentVendedoresContainer = document.getElementById('current-vendedores-container');
        DOMElements.assignedVendedoresList = document.getElementById('assigned-vendedores-list');
        DOMElements.assignVendedorSelect = document.getElementById('assign-vendedor-select');
        DOMElements.confirmAssignVendedorButton = document.getElementById('confirm-assign-vendedor');
        DOMElements.modalVendedorDetails = document.getElementById('modal-vendedor-details');
        DOMElements.vendedorDetailsModalTitle = document.getElementById('vendedor-details-modal-title');
        DOMElements.vendedorInfoDiv = DOMElements.modalVendedorDetails.querySelector('#vendedor-info');
        DOMElements.vendedorCidadesList = document.getElementById('vendedor-cidades-list');
        DOMElements.highlightVendedorCitiesButton = document.getElementById('highlight-vendedor-cities-button');
        DOMElements.modalCityDetails = document.getElementById('modal-city-details');
        DOMElements.cityDetailsModalTitle = document.getElementById('city-details-modal-title');
        DOMElements.cityDetailsModalBody = document.getElementById('city-details-modal-body');
        DOMElements.notificationContainer = document.getElementById('notification-container');
        DOMElements.mapContainer = document.getElementById('map');
    }

    // ========= FUNÇÕES UTILITÁRIAS =========
    function normalizeString(str) {
        if (!str) return '';
        return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
    }
    function showNotification(message, type = 'success', duration = 5000) {
        const el = document.createElement('div'); el.className = `alert alert-${type}`; el.textContent = message;
        DOMElements.notificationContainer.appendChild(el);
        setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 500); }, duration);
    }
    function openModal(modalElement) { if(modalElement) modalElement.classList.add('show'); }
    function closeModal(modalElement) { if(modalElement) modalElement.classList.remove('show'); }
    function closeAllModals() { document.querySelectorAll('.modal.show').forEach(closeModal); }
    function generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 7); }
    function formatDateTime(date) {
        if (!date) return "Nunca";
        return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    function showLoading(show = true, message = "Carregando...") {
        DOMElements.loadingMessage.textContent = message;
        DOMElements.loadingOverlay.classList.toggle('hidden', !show);
    }
    function showSyncStatus(show = true) { DOMElements.syncStatus.style.display = show ? 'block' : 'none'; }

    // ========= FUNÇÕES DO MAPA =========
    function initMap() {
        AppState.map = L.map(DOMElements.mapContainer).setView(AppConfig.mapInitialView, AppConfig.mapInitialZoom);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(AppState.map);
    }

    async function loadGeoJsonWithFallback() {
        for (const url of AppConfig.geoJsonUrls) {
            try {
                showLoading(true, `Carregando mapa de ${new URL(url).hostname}...`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Falha ${response.status} ao carregar GeoJSON de ${url}`);
                const data = await response.json();
                showLoading(true, 'Mapa carregado. Processando cidades...');
                return data;
            } catch (error) {
                console.warn(`Erro ao carregar GeoJSON de ${url}:`, error.message);
                if (AppConfig.geoJsonUrls.indexOf(url) < AppConfig.geoJsonUrls.length - 1) await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        throw new Error('Falha ao carregar GeoJSON de todas as fontes de fallback.');
    }

    async function processGeoJsonData(geoJsonData) {
        L.geoJSON(geoJsonData, {
            style: CONSTANTS.DEFAULT_CITY_STYLE,
            onEachFeature: (feature, layer) => {
                const cityName = feature.properties.name;
                const cityId = feature.properties.id;
                AppState.cityLayers[cityName] = layer;
                AppState.normalizedCityNames[normalizeString(cityName)] = cityName;

                layer.on('click', () => handleCityClick(cityName, cityId, layer));
                layer.on('dblclick', () => showCityDetailsModal(cityName, cityId));

                layer.on('mouseover', async function (e) {
                    if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
                    if (document.querySelector('.modal.show') || AppState.map.dragging.enabled() || AppState.map.scrollWheelZoom.enabled()) {
                        // Não mostra se um modal está aberto ou se o mapa está sendo arrastado/zoomado
                        // (Isso é uma heurística, pode precisar de ajuste fino)
                        // A verificação de dragging/scrollWheelZoom pode ser mais complexa se o evento de mouseover disparar durante essas ações.
                        // Para simplificar, podemos apenas verificar modais.
                         if (document.querySelector('.modal.show')) return;
                    }
                    
                    removeCityInfoMarker(); // Remove o marcador anterior, se houver

                    const markerLatLng = layer.getBounds().getCenter();
                    const customIcon = L.divIcon({
                        className: 'city-info-icon-marker',
                        html: `<i class="fas fa-info-circle"></i>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    });
                    AppState.cityInfoMarker = L.marker(markerLatLng, { icon: customIcon, interactive: false }).addTo(AppState.map);

                    const tooltipContent = await generateCityTooltipContent(cityName);
                    // Vincula o tooltip à camada da cidade, não ao ícone, para melhor posicionamento e comportamento.
                    layer.bindTooltip(tooltipContent, {
                        sticky: true, // Segue o mouse
                        direction: 'auto',
                        className: 'city-info-tooltip',
                        // offset: L.point(0, -layer.getBounds().height / 2) // Tenta posicionar acima
                    }).openTooltip();
                });

                layer.on('mouseout', function () {
                    if (layer.isTooltipOpen()) {
                        layer.closeTooltip().unbindTooltip(); // Fecha e desvincula para não reaparecer
                    }
                    if (AppState.cityInfoMarker) {
                        if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
                        AppState.cityInfoMarkerTimeout = setTimeout(() => {
                            removeCityInfoMarker();
                        }, 200); // Delay para permitir mover para o tooltip se fosse no ícone
                    }
                });
                layer.bindTooltip(cityName, { permanent: false, direction: 'center', className: 'city-tooltip' }); // Tooltip padrão
            }
        }).addTo(AppState.map);
        if (Object.keys(AppState.cityPopulations).length === 0) {
            await fetchCityPopulation(null, true); // Força carga do arquivo de população
        }
    }

    function removeCityInfoMarker() {
        if (AppState.cityInfoMarker) {
            AppState.map.removeLayer(AppState.cityInfoMarker);
            AppState.cityInfoMarker = null;
        }
        if (AppState.cityInfoMarkerTimeout) {
            clearTimeout(AppState.cityInfoMarkerTimeout);
            AppState.cityInfoMarkerTimeout = null;
        }
         // Garante que tooltips dinâmicos sejam removidos de todas as camadas
        Object.values(AppState.cityLayers).forEach(l => {
            if (l.isTooltipOpen() && l.getTooltip().options.className === 'city-info-tooltip') {
                l.closeTooltip().unbindTooltip();
            }
        });
    }

    async function generateCityTooltipContent(cityName) {
        const population = await fetchCityPopulation(cityName);
        let content = `<h6>${cityName}</h6>`;
        content += `<p><strong>População:</strong> ${population ? population.toLocaleString('pt-BR') : 'N/D'}</p>`;
        const assignedVendedorIds = AppState.cityAssignments[cityName];
        if (assignedVendedorIds && assignedVendedorIds.length > 0) {
            assignedVendedorIds.forEach(vId => {
                const vendedor = AppState.vendedores.find(v => v.id === vId);
                if (vendedor) {
                    content += `
                        <div class="vendedor-tooltip-info">
                            <p class="vendedor-name-indicator">
                                <span class="vendedor-color-indicator" style="background-color:${vendedor.color};"></span>
                                ${vendedor.nome}
                            </p>
                            <p>Cód: ${vendedor.codigoVendedor || 'N/A'}, Sup: ${vendedor.supervisor || 'N/A'}</p>
                            <p>Cad: ${vendedor.totalCadastros || 0}, Posit: ${vendedor.totalPositivados || 0}</p>
                        </div>
                    `;
                }
            });
        } else {
            content += '<p><em>Nenhum vendedor atribuído.</em></p>';
        }
        return content;
    }

    async function handleCityClick(cityName, cityId, layer) {
        AppState.selectedCity = { name: cityName, id: cityId, layer: layer };
        removeCityInfoMarker(); // Remove o ícone e tooltip de info ao clicar
        resetMapStyles();
        setLayerStyle(layer, CONSTANTS.SELECTED_CITY_STYLE);
        if (layer.bringToFront) layer.bringToFront();
        await updateSelectedCityInfo();
        if (DOMElements.sidebar.classList.contains('collapsed')) DOMElements.toggleSidebarButton.click();
        // Ativa a aba de busca
        DOMElements.tabButtons.forEach(btn => btn.classList.remove('active'));
        DOMElements.tabContents.forEach(content => content.classList.remove('active'));
        document.querySelector('.tab-button[data-tab="search"]').classList.add('active');
        document.getElementById('tab-search').classList.add('active');
    }

    function setLayerStyle(layer, style) { if (layer?.setStyle) layer.setStyle(style); }
    function getCityStyle(cityName) {
        let styleOptions = { ...CONSTANTS.DEFAULT_CITY_STYLE };
        if (AppState.favorites.some(fav => fav.name === cityName) && !AppState.cityAssignments[cityName]?.length) {
            styleOptions.fillOpacity = 0.3; styleOptions.weight = 1.5;
        }
        if (AppState.cityAssignments[cityName]?.length > 0) {
            if (AppState.cityAssignments[cityName].length === 1) {
                const vendedor = AppState.vendedores.find(v => v.id === AppState.cityAssignments[cityName][0]);
                if (vendedor?.color) {
                    styleOptions.fillColor = vendedor.color; styleOptions.color = vendedor.color;
                    styleOptions.fillOpacity = 0.5; styleOptions.weight = 2;
                }
            } else { styleOptions = { ...CONSTANTS.MULTIPLE_VENDEDORES_STYLE }; }
        }
        if (AppState.activeGroup && AppState.groups[AppState.activeGroup]?.includes(cityName)) styleOptions = { ...CONSTANTS.HIGHLIGHT_GROUP_STYLE };
        if (AppState.activeVendedorId && AppState.cityAssignments[cityName]?.includes(AppState.activeVendedorId)) styleOptions = { ...CONSTANTS.HIGHLIGHT_VENDEDOR_STYLE };
        if (AppState.selectedCity?.name === cityName) styleOptions = { ...CONSTANTS.SELECTED_CITY_STYLE };
        return styleOptions;
    }
    function resetMapStyles() { Object.entries(AppState.cityLayers).forEach(([name, layer]) => setLayerStyle(layer, getCityStyle(name))); }

    function highlightVendedorCitiesOnMap(vendedorId) {
        AppState.activeVendedorId = vendedorId; AppState.activeGroup = null; DOMElements.groupSelect.value = '';
        resetMapStyles();
        const vendedor = AppState.vendedores.find(v => v.id === vendedorId);
        if (vendedor?.cidades.length > 0) {
            const layers = vendedor.cidades.map(name => AppState.cityLayers[name]).filter(Boolean);
            if (layers.length > 0) AppState.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [50, 50] });
        }
        showNotification(`Cidades do vendedor ${vendedor?.nome || ''} destacadas.`, 'info');
    }
    function highlightGroupOnMap(groupName) {
        AppState.activeGroup = groupName; AppState.activeVendedorId = null; resetMapStyles();
        if (groupName && AppState.groups[groupName]?.length > 0) {
            const layers = AppState.groups[groupName].map(name => AppState.cityLayers[name]).filter(Boolean);
            if (layers.length > 0) AppState.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [50, 50] });
        }
        showNotification(`Grupo ${groupName || 'Nenhum'} destacado.`, 'info');
    }

    async function loadDataFromSheets() {
        if (AppConfig.apiKey === "SUA_API_KEY_RESTRITA_AQUI" || !AppConfig.apiKey) {
            showNotification("API Key do Google Sheets não configurada.", "danger", 10000); return;
        }
        showLoading(true, "Carregando dados da planilha..."); showSyncStatus(true);
        try {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${AppConfig.spreadsheetId}/values/${AppConfig.range}?key=${AppConfig.apiKey}`);
            if (!response.ok) throw new Error(`Erro ${response.status} na API do Sheets.`);
            const data = await response.json();
            processSheetsData(data);
            AppState.lastUpdateTime = new Date();
            if(DOMElements.lastUpdateSpan) DOMElements.lastUpdateSpan.textContent = formatDateTime(AppState.lastUpdateTime);
            saveDataToLocalStorage(); updateUIAfterDataLoad();
            showNotification("Dados carregados com sucesso da planilha!", "success");
        } catch (error) {
            console.error("Erro ao obter dados da planilha:", error);
            showNotification(`Erro ao carregar dados: ${error.message}`, "danger", 10000);
        } finally {
            showLoading(false); showSyncStatus(false);
        }
    }

    function processSheetsData(data) {
        const newVendedores = []; const newCityAssignments = {};
        if (!data.values || data.values.length < 6) { // Linha 1 a 5 para cabeçalho, Linha 6+ para cidades
            showNotification("Formato da planilha incorreto. Verifique as instruções.", "warning", 7000);
            AppState.vendedores = []; AppState.cityAssignments = {}; return;
        }
        const values = data.values; const numCols = values[0]?.length || 0; let colorIndex = 0;

        for (let col = 0; col < numCols; col++) {
            const supervisor = values[0]?.[col]?.trim();
            const vendedorNome = values[1]?.[col]?.trim();
            if (!supervisor || !vendedorNome) continue;

            const vendedorId = generateId();
            const vendedor = {
                id: vendedorId,
                nome: vendedorNome,
                supervisor: supervisor,
                codigoVendedor: values[2]?.[col]?.trim() || 'N/A',
                totalCadastros: parseInt(values[3]?.[col]?.trim(), 10) || 0,
                totalPositivados: parseInt(values[4]?.[col]?.trim(), 10) || 0,
                color: AppConfig.vendedorColors[colorIndex++ % AppConfig.vendedorColors.length],
                cidades: []
            };

            for (let row = 5; row < values.length; row++) {
                const cidadeNomePlanilha = values[row]?.[col]?.trim();
                if (cidadeNomePlanilha) {
                    const normPlanilha = normalizeString(cidadeNomePlanilha);
                    let cidadeRealNoMapa = AppState.normalizedCityNames[normPlanilha];
                     if (!cidadeRealNoMapa) {
                         const foundKey = Object.keys(AppState.normalizedCityNames).find(key => key.includes(normPlanilha) || normPlanilha.includes(key));
                         if (foundKey) cidadeRealNoMapa = AppState.normalizedCityNames[foundKey];
                    }
                    if (cidadeRealNoMapa) {
                        vendedor.cidades.push(cidadeRealNoMapa);
                        if (!newCityAssignments[cidadeRealNoMapa]) newCityAssignments[cidadeRealNoMapa] = [];
                        if (!newCityAssignments[cidadeRealNoMapa].includes(vendedorId)) newCityAssignments[cidadeRealNoMapa].push(vendedorId);
                    } else { console.warn(`Cidade "${cidadeNomePlanilha}" (Vendedor: ${vendedorNome}) não encontrada no mapa.`); }
                }
            }
            newVendedores.push(vendedor);
        }
        AppState.vendedores = newVendedores;
        AppState.cityAssignments = newCityAssignments;
    }

    function loadSavedData() {
        showLoading(true, "Carregando dados salvos...");
        try {
            AppState.favorites = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES)) || [];
            AppState.groups = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS)) || {};
            AppState.vendedores = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES)) || [];
            AppState.cityPopulations = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.CITY_POPULATIONS)) || {};

            if (AppState.vendedores.length > 0 && Object.keys(AppState.cityAssignments).length === 0) {
                AppState.cityAssignments = {};
                AppState.vendedores.forEach(v => v.cidades.forEach(cName => {
                    if (!AppState.cityAssignments[cName]) AppState.cityAssignments[cName] = [];
                    if (!AppState.cityAssignments[cName].includes(v.id)) AppState.cityAssignments[cName].push(v.id);
                }));
            }
            const savedLastUpdate = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.LAST_UPDATE);
            if (savedLastUpdate) AppState.lastUpdateTime = new Date(savedLastUpdate);
            if (DOMElements.lastUpdateSpan) DOMElements.lastUpdateSpan.textContent = formatDateTime(AppState.lastUpdateTime);
        } catch (e) { console.error('Erro localStorage:', e); Object.values(CONSTANTS.LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key)); }
    }
    function saveDataToLocalStorage() {
        try {
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES, JSON.stringify(AppState.favorites));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS, JSON.stringify(AppState.groups));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES, JSON.stringify(AppState.vendedores));
            if (AppState.lastUpdateTime) localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.LAST_UPDATE, AppState.lastUpdateTime.toISOString());
            if (Object.keys(AppState.cityPopulations).length > 0) localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.CITY_POPULATIONS, JSON.stringify(AppState.cityPopulations));
        } catch (e) { console.error('Erro salvar localStorage:', e); showNotification('Erro ao salvar dados.', 'danger');}
    }

    async function fetchCityPopulation(cityName, forceLoadFile = false) {
        const normalizedCity = cityName ? normalizeString(cityName) : null;
        if (!normalizedCity && !forceLoadFile && AppState.cityPopulations[normalizedCity]) return AppState.cityPopulations[normalizedCity];

        if (forceLoadFile || Object.keys(AppState.cityPopulations).length === 0) {
            try {
                const response = await fetch('populacao_sp.json');
                if (!response.ok) { console.warn('populacao_sp.json não encontrado ou erro na leitura.'); return null; }
                const allPopulations = await response.json();
                AppState.cityPopulations = {}; // Limpa para garantir chaves normalizadas
                for (const [key, value] of Object.entries(allPopulations)) {
                    AppState.cityPopulations[normalizeString(key)] = value;
                }
                saveDataToLocalStorage();
                console.log("Arquivo de populações (populacao_sp.json) carregado e cacheado.");
            } catch (error) {
                console.error("Erro ao carregar ou processar populacao_sp.json:", error.message);
                return null; // Retorna null em caso de erro para não quebrar outras partes
            }
        }
        return normalizedCity ? AppState.cityPopulations[normalizedCity] || null : null;
    }

    async function updateSelectedCityInfo() {
        if (!AppState.selectedCity) {
            DOMElements.selectedCityInfo.innerHTML = '<p class="empty-message">Nenhuma cidade selecionada.</p>';
            DOMElements.selectedCityActions.classList.add('hidden'); return;
        }
        const { name: cityName, id: cityId } = AppState.selectedCity;
        const population = await fetchCityPopulation(cityName);
        let populationInfo = `<p><strong>População:</strong> ${population ? population.toLocaleString('pt-BR') : 'Não disponível'}</p>`;
        let vendedorHtml = '';
        const assignedVendedorIds = AppState.cityAssignments[cityName];

        if (assignedVendedorIds?.length > 0) {
            vendedorHtml = '<p><strong>Vendedores Atendendo:</strong></p><ul class="vendedores-list" style="padding-left:0; list-style:none;">';
            assignedVendedorIds.forEach(vId => {
                const vend = AppState.vendedores.find(v => v.id === vId);
                if (vend) vendedorHtml += `<li style="display:flex; align-items:center; margin-bottom:3px;"><div class="vendedor-color-indicator" style="background-color: ${vend.color};"></div> ${vend.nome} (Sup: ${vend.supervisor})</li>`;
            });
            vendedorHtml += '</ul>';
        } else { vendedorHtml = '<p><em>Nenhum vendedor atribuído.</em></p>'; }

        const ibgeLink = `https://cidades.ibge.gov.br/brasil/sp/${normalizeString(cityName).replace(/\s+/g, '-')}/panorama`;
        DOMElements.selectedCityInfo.innerHTML = `<h4>${cityName}</h4>${populationInfo}${vendedorHtml}
            <p><small>ID Geo: ${cityId}. (Duplo clique no mapa para mais detalhes)</small></p>
            <div class="btn-group" role="group">
                <a href="${ibgeLink}" target="_blank" class="btn btn-info btn-sm mt-10"><i class="fas fa-info-circle"></i> Info IBGE</a>
            </div>`;
        DOMElements.selectedCityActions.classList.remove('hidden');
        DOMElements.assignVendedorButton.innerHTML = assignedVendedorIds?.length > 0 ? '<i class="fas fa-user-tie"></i> Gerenciar Vendedores' : '<i class="fas fa-user-tie"></i> Atribuir Vendedor';
    }

    function updateFavoritesList() {
        DOMElements.favoritesList.innerHTML = AppState.favorites.length === 0 ? '<li class="empty-message">Nenhuma cidade favorita</li>' : '';
        AppState.favorites.forEach(city => {
            const li = document.createElement('li'); li.className = 'list-item';
            const assignedIds = AppState.cityAssignments[city.name];
            let badge = '';
            if (assignedIds?.length) badge = ` <span class="badge ${assignedIds.length === 1 ? 'badge-success' : 'badge-warning'}" title="${assignedIds.length} vend."><i class="fas ${assignedIds.length === 1 ? 'fa-user-tie' : 'fa-users'}"></i></span>`;
            li.innerHTML = `<div><strong>${city.name}</strong>${badge}</div><div class="actions"></div>`;
            const groupSelect = document.createElement('select'); groupSelect.className = 'form-control form-control-sm'; groupSelect.style.maxWidth = '120px';
            groupSelect.innerHTML = '<option value="">Sem grupo</option>';
            Object.keys(AppState.groups).forEach(gName => groupSelect.innerHTML += `<option value="${gName}" ${AppState.groups[gName]?.includes(city.name) ? 'selected' : ''}>${gName}</option>`);
            groupSelect.onchange = function() {
                Object.keys(AppState.groups).forEach(g => { if(AppState.groups[g]) AppState.groups[g] = AppState.groups[g].filter(c => c !== city.name)});
                if (this.value) { if(!AppState.groups[this.value]) AppState.groups[this.value] = []; AppState.groups[this.value].push(city.name); }
                saveDataToLocalStorage(); resetMapStyles(); showNotification(`Cidade ${city.name} ${this.value ? 'adicionada ao ' + this.value : 'removida de grupos'}.`);
            };
            li.querySelector('.actions').appendChild(groupSelect);
            const viewBtn = document.createElement('button'); viewBtn.className = 'btn btn-primary btn-sm'; viewBtn.innerHTML = '<i class="fas fa-eye"></i>'; viewBtn.title = 'Ver no mapa';
            viewBtn.onclick = () => { if (AppState.cityLayers[city.name]) { AppState.map.fitBounds(AppState.cityLayers[city.name].getBounds()); AppState.cityLayers[city.name].fire('click'); }};
            li.querySelector('.actions').appendChild(viewBtn);
            const removeBtn = document.createElement('button'); removeBtn.className = 'btn btn-danger btn-sm'; removeBtn.innerHTML = '<i class="fas fa-trash"></i>'; removeBtn.title = 'Remover favorito';
            removeBtn.onclick = () => {
                AppState.favorites = AppState.favorites.filter(f => f.name !== city.name);
                Object.keys(AppState.groups).forEach(g => {if(AppState.groups[g]) AppState.groups[g] = AppState.groups[g].filter(c => c !== city.name)});
                saveDataToLocalStorage(); updateFavoritesList(); updateGroupsLists(); resetMapStyles(); showNotification(`${city.name} removida dos favoritos.`);
            };
            li.querySelector('.actions').appendChild(removeBtn);
            DOMElements.favoritesList.appendChild(li);
        });
    }
    function updateGroupsLists() {
        DOMElements.groupsList.innerHTML = Object.keys(AppState.groups).length === 0 ? '<li class="empty-message">Nenhum grupo criado</li>' : '';
        DOMElements.groupSelect.innerHTML = '<option value="">Selecione um grupo</option>';
        Object.keys(AppState.groups).sort().forEach(groupName => {
            DOMElements.groupSelect.innerHTML += `<option value="${groupName}">${groupName}</option>`;
            const li = document.createElement('li'); li.className = 'list-item';
            li.innerHTML = `<div><strong>${groupName}</strong> <span class="badge badge-primary">${AppState.groups[groupName]?.length || 0}</span></div>
                <div class="actions">
                    <button class="btn btn-warning btn-sm btn-highlight-group" title="Destacar"><i class="fas fa-highlighter"></i></button>
                    <button class="btn btn-danger btn-sm btn-remove-group" title="Remover"><i class="fas fa-trash"></i></button>
                </div>`;
            li.querySelector('.btn-highlight-group').onclick = () => { DOMElements.groupSelect.value = groupName; highlightGroupOnMap(groupName); };
            li.querySelector('.btn-remove-group').onclick = () => {
                if (confirm(`Remover grupo "${groupName}"?`)) {
                    delete AppState.groups[groupName]; saveDataToLocalStorage(); updateGroupsLists(); updateFavoritesList();
                    if (AppState.activeGroup === groupName) { AppState.activeGroup = null; resetMapStyles(); }
                    showNotification(`Grupo ${groupName} removido.`);
                }
            };
            DOMElements.groupsList.appendChild(li);
        });
    }
    function updateVendedoresList() {
        DOMElements.vendedoresList.innerHTML = AppState.vendedores.length === 0 ? '<li class="empty-message">Nenhum vendedor. Sincronize.</li>' : '';
        DOMElements.assignVendedorSelect.innerHTML = '<option value="">Selecione um vendedor</option>';
        AppState.vendedores.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(vendedor => {
            DOMElements.assignVendedorSelect.innerHTML += `<option value="${vendedor.id}">${vendedor.nome} (Sup: ${vendedor.supervisor})</option>`;
            const li = document.createElement('li'); li.className = 'list-item';
            li.innerHTML = `
                <div>
                    <div class="vendedor-list-item-info">
                        <div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div>
                        <strong>${vendedor.nome}</strong>
                    </div>
                    <div class="vendedor-list-item-details">
                        <small>Sup: ${vendedor.supervisor || 'N/A'}</small>
                        <small>Cód: ${vendedor.codigoVendedor || 'N/A'}</small>
                        <small>Cad: ${(vendedor.totalCadastros || 0).toLocaleString('pt-BR')}</small>
                        <small>Posit: ${(vendedor.totalPositivados || 0).toLocaleString('pt-BR')}</small>
                        <span class="badge badge-primary">${vendedor.cidades.length} cidades</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="btn btn-primary btn-sm btn-vendedor-details" title="Detalhes"><i class="fas fa-info-circle"></i></button>
                    <button class="btn btn-warning btn-sm btn-highlight-vendedor-map" title="No mapa"><i class="fas fa-map-marker-alt"></i></button>
                </div>`;
            li.querySelector('.btn-vendedor-details').onclick = () => showVendedorDetailsModal(vendedor);
            li.querySelector('.btn-highlight-vendedor-map').onclick = () => highlightVendedorCitiesOnMap(vendedor.id);
            DOMElements.vendedoresList.appendChild(li);
        });
    }
    function updateUIAfterDataLoad() { updateFavoritesList(); updateGroupsLists(); updateVendedoresList(); resetMapStyles(); }

    function prepareAssignVendedorModal() {
        if (!AppState.selectedCity) return;
        DOMElements.assignCityNameSpan.textContent = AppState.selectedCity.name;
        DOMElements.assignVendedorSelect.value = ''; DOMElements.assignedVendedoresList.innerHTML = '';
        const assignedIds = AppState.cityAssignments[AppState.selectedCity.name];
        if (assignedIds?.length > 0) {
            assignedIds.forEach(vId => {
                const vend = AppState.vendedores.find(v => v.id === vId);
                if (vend) {
                    const li = document.createElement('li'); li.className = 'list-item';
                    li.innerHTML = `<div class="vendedor-list-item-info"><div class="vendedor-color-indicator" style="background-color: ${vend.color};"></div>${vend.nome}</div>
                        <button class="btn btn-danger btn-sm btn-remove-assignment" title="Remover"><i class="fas fa-trash"></i></button>`;
                    li.querySelector('.btn-remove-assignment').onclick = () => {
                        vend.cidades = vend.cidades.filter(c => c !== AppState.selectedCity.name);
                        AppState.cityAssignments[AppState.selectedCity.name] = AppState.cityAssignments[AppState.selectedCity.name].filter(id => id !== vId);
                        if (AppState.cityAssignments[AppState.selectedCity.name].length === 0) delete AppState.cityAssignments[AppState.selectedCity.name];
                        saveDataToLocalStorage(); prepareAssignVendedorModal(); updateSelectedCityInfo(); updateVendedoresList(); resetMapStyles();
                        showNotification(`Vendedor ${vend.nome} removido de ${AppState.selectedCity.name}.`);
                    };
                    DOMElements.assignedVendedoresList.appendChild(li);
                }
            });
            DOMElements.currentVendedoresContainer.classList.remove('hidden');
        } else { DOMElements.currentVendedoresContainer.classList.add('hidden'); }
        openModal(DOMElements.modalAssignVendedor);
    }

    function showVendedorDetailsModal(vendedor) {
        DOMElements.vendedorDetailsModalTitle.innerHTML = `<div class="vendedor-list-item-info"><div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div>Detalhes do Vendedor</div>`;
        DOMElements.vendedorInfoDiv.innerHTML = `
            <p><strong>Nome:</strong> ${vendedor.nome}</p>
            <p><strong>Supervisor:</strong> ${vendedor.supervisor || 'N/A'}</p>
            <p><strong>Código:</strong> ${vendedor.codigoVendedor || 'N/A'}</p>
            <p><strong>Total Cadastros:</strong> ${(vendedor.totalCadastros || 0).toLocaleString('pt-BR')}</p>
            <p><strong>Total Positivados:</strong> ${(vendedor.totalPositivados || 0).toLocaleString('pt-BR')}</p>`;
        DOMElements.vendedorCidadesList.innerHTML = vendedor.cidades.length === 0 ? '<li class="empty-message">Nenhuma cidade</li>' : '';
        vendedor.cidades.sort().forEach(cityName => {
            const li = document.createElement('li'); li.className = 'list-item';
            const totalAssignments = AppState.cityAssignments[cityName]?.length || 0;
            let badge = totalAssignments > 1 ? ` <span class="badge badge-warning" title="${totalAssignments} vend."><i class="fas fa-users"></i> ${totalAssignments}</span>` : '';
            li.innerHTML = `<div>${cityName}${badge}</div><button class="btn btn-primary btn-sm btn-view-city" title="Ver no mapa"><i class="fas fa-eye"></i></button>`;
            li.querySelector('.btn-view-city').onclick = () => {
                if (AppState.cityLayers[cityName]) { closeAllModals(); AppState.map.fitBounds(AppState.cityLayers[cityName].getBounds()); AppState.cityLayers[cityName].fire('click');}
            };
            DOMElements.vendedorCidadesList.appendChild(li);
        });
        DOMElements.highlightVendedorCitiesButton.onclick = () => { highlightVendedorCitiesOnMap(vendedor.id); closeAllModals(); };
        openModal(DOMElements.modalVendedorDetails);
    }

    async function showCityDetailsModal(cityName, cityId) {
        DOMElements.cityDetailsModalTitle.textContent = `Detalhes - ${cityName}`;
        DOMElements.cityDetailsModalBody.innerHTML = '<p class="empty-message">Carregando...</p>';
        openModal(DOMElements.modalCityDetails);
        if(AppState.cityLayers[cityName] && AppState.cityLayers[cityName].isTooltipOpen()){ // Fecha tooltip da camada
            AppState.cityLayers[cityName].closeTooltip().unbindTooltip();
        }
        removeCityInfoMarker();

        const population = await fetchCityPopulation(cityName);
        let detailsHTML = `<div class="city-general-info"><h4>${cityName}</h4><p><strong>População:</strong> ${population ? population.toLocaleString('pt-BR') : 'Não disponível'}</p></div>`;
        const assignedVendedorIds = AppState.cityAssignments[cityName];
        let totalCadastrosCidade = 0;
        let totalPositivadosCidade = 0;

        if (assignedVendedorIds && assignedVendedorIds.length > 0) {
            detailsHTML += '<h5>Vendedores Atuantes:</h5>';
            assignedVendedorIds.forEach(vId => {
                const vendedor = AppState.vendedores.find(v => v.id === vId);
                if (vendedor) {
                    totalCadastrosCidade += (vendedor.totalCadastros || 0);
                    totalPositivadosCidade += (vendedor.totalPositivados || 0);
                    detailsHTML += `
                        <div class="vendedor-details-card">
                            <h5><div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div> ${vendedor.nome}</h5>
                            <p><strong>Supervisor:</strong> ${vendedor.supervisor || 'N/A'}</p>
                            <p><strong>Código Vendedor:</strong> ${vendedor.codigoVendedor || 'N/A'}</p>
                            <p><strong>Cadastros (Indiv.):</strong> ${(vendedor.totalCadastros || 0).toLocaleString('pt-BR')}</p>
                            <p><strong>Positivados (Indiv.):</strong> ${(vendedor.totalPositivados || 0).toLocaleString('pt-BR')}</p>
                        </div>
                    `;
                }
            });

            if (assignedVendedorIds.length > 0) {
                const faltouPositivar = totalCadastrosCidade - totalPositivadosCidade;
                detailsHTML += `
                    <div class="city-summary-card">
                        <h5>Sumário da Cidade (${cityName})</h5>
                        <p><strong>Total de Cadastros (Soma):</strong> ${totalCadastrosCidade.toLocaleString('pt-BR')}</p>
                        <p><strong>Total de Positivados (Soma):</strong> ${totalPositivadosCidade.toLocaleString('pt-BR')}</p>
                        <p><strong>Clientes Não Positivados:</strong> ${faltouPositivar.toLocaleString('pt-BR')}</p>
                    </div>
                `;
            }
        } else {
            detailsHTML += '<p><em>Nenhum vendedor atribuído a esta cidade.</em></p>';
        }
        DOMElements.cityDetailsModalBody.innerHTML = detailsHTML;
    }

    function setupEventListeners() {
        DOMElements.toggleSidebarButton.addEventListener('click', () => {
            DOMElements.sidebar.classList.toggle('collapsed');
            DOMElements.toggleSidebarButton.querySelector('i').className = DOMElements.sidebar.classList.contains('collapsed') ? 'fas fa-bars' : 'fas fa-chevron-left';
            setTimeout(() => { if(AppState.map) AppState.map.invalidateSize(); }, 310);
        });
        DOMElements.sidebarTabsContainer.addEventListener('click', e => {
            const btn = e.target.closest('.tab-button'); if (!btn) return;
            DOMElements.tabButtons.forEach(b => b.classList.remove('active')); DOMElements.tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active'); const targetTab = document.getElementById(`tab-${btn.dataset.tab}`); if(targetTab) targetTab.classList.add('active');
        });
        DOMElements.searchButton.addEventListener('click', handleSearchCity);
        DOMElements.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearchCity(); });
        DOMElements.addFavoriteButton.addEventListener('click', handleAddFavorite);
        DOMElements.assignVendedorButton.addEventListener('click', () => {
            if (!AppState.selectedCity) return; if (AppState.vendedores.length === 0) { showNotification('Nenhum vendedor cadastrado. Sincronize os dados.', 'warning'); return; }
            prepareAssignVendedorModal();
        });
        DOMElements.confirmAssignVendedorButton.addEventListener('click', handleConfirmAssignVendedor);
        DOMElements.createGroupButton.addEventListener('click', handleCreateGroup);
        DOMElements.groupSelect.addEventListener('change', e => highlightGroupOnMap(e.target.value));
        DOMElements.reloadDataButton.addEventListener('click', () => {
            if (confirm("Recarregar dados da planilha? Isso pode sobrescrever alterações locais não sincronizadas.")) loadDataFromSheets();
        });
        document.addEventListener('click', e => {
            if (e.target.matches('.modal-close') || e.target.matches('.modal.show')) {
                const modal = e.target.closest('.modal') || e.target;
                if (modal) closeModal(modal);
            }
            if (!e.target.closest('.leaflet-popup-content-wrapper') && !e.target.closest('.city-info-icon-marker') && !e.target.closest('.leaflet-tooltip')) {
                 // Esta lógica de remover o ícone no clique fora pode ser agressiva.
                 // A remoção principal do ícone agora é no mouseout da camada ou ao abrir modais/mover mapa.
            }
        });
        document.addEventListener('keydown', e => { if (e.key === "Escape") closeAllModals(); });
        if(AppState.map) { // Garante que o mapa esteja inicializado
            AppState.map.on('zoomstart movestart', removeCityInfoMarker);
            AppState.map.on('popupopen', removeCityInfoMarker); // Remove ícone se um popup padrão do Leaflet abrir
        }
    }

    function handleSearchCity() {
        const term = normalizeString(DOMElements.searchInput.value); if (!term) return;
        let foundName = AppState.normalizedCityNames[term];
        if (!foundName) {
            const searchLower = term.toLowerCase();
            const foundEntry = Object.entries(AppState.normalizedCityNames).find(([norm, orig]) => norm.includes(searchLower) || orig.toLowerCase().includes(searchLower));
            if (foundEntry) foundName = foundEntry[1];
        }
        if (foundName && AppState.cityLayers[foundName]) {
            const layer = AppState.cityLayers[foundName]; AppState.map.fitBounds(layer.getBounds()); layer.fire('click');
            showNotification(`Cidade ${foundName} encontrada.`); DOMElements.searchInput.value = '';
        } else { showNotification(`Cidade "${DOMElements.searchInput.value}" não encontrada.`, 'warning'); }
    }
    function handleAddFavorite() {
        if (!AppState.selectedCity) return; if (AppState.favorites.some(f => f.name === AppState.selectedCity.name)) { showNotification(`${AppState.selectedCity.name} já é favorito.`, 'info'); return; }
        AppState.favorites.push({ name: AppState.selectedCity.name, id: AppState.selectedCity.id });
        saveDataToLocalStorage(); updateFavoritesList(); resetMapStyles(); showNotification(`${AppState.selectedCity.name} adicionado aos favoritos.`);
    }
    function handleConfirmAssignVendedor() {
        const vendedorId = DOMElements.assignVendedorSelect.value; if (!AppState.selectedCity || !vendedorId) { showNotification('Selecione um vendedor.', 'warning'); return; }
        const cityName = AppState.selectedCity.name; const vendedor = AppState.vendedores.find(v => v.id === vendedorId);
        if (!vendedor) { showNotification('Vendedor não encontrado.', 'danger'); return; }
        if (!vendedor.cidades.includes(cityName)) vendedor.cidades.push(cityName); else { showNotification('Este vendedor já está atribuído a esta cidade.', 'info'); return; }
        if (!AppState.cityAssignments[cityName]) AppState.cityAssignments[cityName] = [];
        if (!AppState.cityAssignments[cityName].includes(vendedorId)) AppState.cityAssignments[cityName].push(vendedorId);
        saveDataToLocalStorage(); prepareAssignVendedorModal(); updateSelectedCityInfo(); updateVendedoresList(); resetMapStyles();
        showNotification(`${cityName} atribuída a ${vendedor.nome}.`);
    }
    function handleCreateGroup() {
        const groupName = DOMElements.groupNameInput.value.trim(); if (!groupName) { showNotification('Digite um nome para o grupo.', 'warning'); return; }
        if (AppState.groups[groupName]) { showNotification('Grupo com este nome já existe.', 'warning'); return; }
        AppState.groups[groupName] = []; saveDataToLocalStorage(); updateGroupsLists(); updateFavoritesList();
        DOMElements.groupNameInput.value = ''; showNotification(`Grupo "${groupName}" criado com sucesso.`);
    }

    async function initializeApp() {
        initDOMElements();
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
        initMap(); // Inicializa o mapa antes de configurar os event listeners que dependem dele
        setupEventListeners(); // Configura listeners após mapa estar pronto
        try {
            loadSavedData();
            const geoJsonData = await loadGeoJsonWithFallback();
            await processGeoJsonData(geoJsonData);
            await loadDataFromSheets();
            if (AppState.vendedores.length === 0 && !localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES)) {
                updateUIAfterDataLoad();
            }
        } catch (error) {
            console.error("Erro crítico na inicialização:", error.message, error.stack);
            showNotification(`Erro crítico: ${error.message}. Verifique o console.`, "danger", 10000);
            updateUIAfterDataLoad(); // Tenta atualizar UI com dados locais mesmo em caso de erro.
        } finally {
            showLoading(false);
        }
    }
    initializeApp();
});