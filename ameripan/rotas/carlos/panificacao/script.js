document.addEventListener('DOMContentLoaded', () => {
    // ========= CONFIGURAÇÃO DA APLICAÇÃO =========
    const AppConfig = {
        spreadsheetId: "1vWWvnYGgZyqVYMoBfcciCCGgEN1FLzSrmXYPBOPKUjk",
        apiKey: "AIzaSyChiZPUY-G3oyZN2NGY_vlgRXUzry9Pkeo", // Mantenha sua chave aqui
        range: "panificacao",
        distribuidoraAmeripanCoords: L.latLng(-22.730986246840104, -47.358144521713264),
        geoJsonSources: [
            {
                id: 'municipiosSP',
                description: 'Municípios de São Paulo',
                urls: [
                    'https://edimarpcosta.github.io/geojson/geojs-35-mun.json',
                    'https://gitlab.c3sl.ufpr.br/simcaq/geodata-br/-/raw/master/geojson/geojs-35-mun.json',
                    'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-35-mun.json'
                ],
                styleFunction: getCityStyle,
                onFeatureCallback: onEachCityFeature,
                paneName: 'cityFillPane'
            },
            {
                id: 'municipiosMG',
                description: 'Municípios de Minas Gerais',
                urls: [
                    'https://edimarpcosta.github.io/geojson/geojs-31-mun.json',
                    'https://gitlab.c3sl.ufpr.br/simcaq/geodata-br/-/raw/master/geojson/geojs-31-mun.json',
                    'https://raw.githubusercontent.com/tbrugz/geodata-br/refs/heads/master/geojson/geojs-31-mun.json'
                ],
                styleFunction: getCityStyle,
                onFeatureCallback: onEachCityFeature,
                paneName: 'cityFillPane'
            },
            {
                id: 'limiteSP',
                description: 'Limite do Estado de São Paulo',
                urls: [
				    'https://edimarpcosta.github.io/geojson/UFs/br_sp.json',
                    'https://raw.githubusercontent.com/giuliano-macedo/geodata-br-states/main/geojson/br_states/br_sp.json'
                ],
                styleFunction: () => CONSTANTS.SP_BOUNDARY_STYLE,
                onFeatureCallback: null,
                isBoundaryLayer: true,
                paneName: 'boundaryPane'
            }
        ],
        mapInitialView: { lat: -21.5, lng: -47.0 },
        mapInitialZoom: 7,
        vendedorColors: [
            // Grupo 1: Cores Primárias e Secundárias Fortes (Alto Contraste) - 12 cores
            '#FF0000', '#0000FF', '#008000', '#FFA500', '#800080', '#F9A825', '#FF00FF', '#008B8B', '#A52A2A', '#800000', '#000080', '#808000',
            // Grupo 2: Variações Fortes e Tons Escuros Distintos - 18 cores (Total 30)
            '#E6194B', '#3CB44B', '#4363D8', '#F58231', '#911EB4', '#F032E6', '#008080', '#9A6324', '#2F4F4F', '#17A2B8', '#FF1493', '#E6B333', '#B34D4D', '#809900', '#6610F2', '#E6331A', '#005C00', '#D23E9A',
            // Grupo 3: Mais Cores Vibrantes e Escuras - 20 cores (Total 50)
            '#FF6B00', '#7000A0', '#C20000', '#0075AC', '#AD1457', '#3B7A57', '#BF360C', '#4A148C', '#004D40', '#880E4F', '#2E7D32', '#D32F2F', '#4527A0', '#EF6C00', '#01579B', '#B71C1C', '#1B5E20', '#E65100', '#C51162', '#006064',
            // Grupo 4: Tons Médios Fortes e Outras Variações - 20 cores (Total 70)
            '#FF6F00', '#3E2723', '#B22222', '#556B2F', '#483D8B', '#FF8C00', '#9932CC', '#2F4F4F', '#9400D3', '#DC143C', '#228B22', '#4169E1', '#8A2BE2', '#D2691E', '#FF7F50', '#B8860B', '#006400', '#4B0082', '#CD5C5C', '#6B8E23',
            // Grupo 5: Completando até 100 com mais variações, evitando os muito claros - 30 cores (Total 100)
            '#4682B4', '#A0522D', '#C71585', '#32CD32', '#DB7093', '#CD853F', '#BA55D3', '#7B68EE', '#6A5ACD', '#DAA520', '#20B2AA', '#66CDAA', '#E9967A', '#FF4500', '#F08080', '#DDA0DD', '#FFA07A', '#2E8B57', '#708090', '#6A0DAD', '#C04000', '#BD572A', '#DE3163', '#FD6A02', '#088F8F', '#AA00FF', '#FFBF00', '#B03060', '#5F4B8B', '#00A86B'
        ],
    };

    const AppState = {
        map: null, selectedCity: null, cityLayers: {}, normalizedCityNames: {},
        cityIBGEData: {}, // Armazena dados do IBGE, incluindo ano da população e área urbanizada
        favorites: [], groups: {}, vendedores: [], cityAssignments: {},
        activeGroup: null, activeVendedorId: null, lastUpdateTime: null,
        cityInfoMarker: null, cityInfoMarkerTimeout: null, isMouseOverInfoIcon: false,
        currentRouteControl: null,
        destinationMarkerForRoute: null,
    };

    const CONSTANTS = {
        LOCAL_STORAGE_KEYS: { // Versão incrementada para atualização de cache
            FAVORITES: 'sga_territoriale_fav_v18_urban',
            GROUPS: 'sga_territoriale_grp_v18_urban',
            VENDEDORES: 'sga_territoriale_vnd_v18_urban',
            LAST_UPDATE: 'sga_territoriale_upd_v18_urban',
            CITY_IBGE_DATA: 'sga_territoriale_ibge_data_v18_urban'
        },
       DEFAULT_CITY_STYLE: { fillColor: '#3388ff', fillOpacity: 0.05, color: '#0000FF', weight: 0.5 },
        SELECTED_CITY_STYLE: { fillColor: '#ff7800', fillOpacity: 0.7, color: '#ff7800', weight: 3 },
        SP_BOUNDARY_STYLE: { color: "red", weight: 3, opacity: 0.8, fillOpacity: 0, dashArray: '5, 5', interactive: false },
        HIGHLIGHT_GROUP_STYLE: { fillColor: '#9b59b6', fillOpacity: 0.6, color: '#9b59b6', weight: 3 },
        HIGHLIGHT_VENDEDOR_STYLE: { fillColor: '#e74c3c', fillOpacity: 0.7, color: '#e74c3c', weight: 3 },
        MULTIPLE_VENDEDORES_STYLE: { fillColor: '#f39c12', fillOpacity: 0.6, color: '#f39c12', weight: 2, dashArray: '5, 5' },
        IBGE_INDICATORS: {
            POPULATION: '96385',           // População residente estimada
            DENSITY: '96386',             // Densidade demográfica
            TERRITORIAL_AREA: '29167',     // Área da unidade territorial (km²)
            URBANIZED_AREA: '95335'        // Área urbanizada (km²)
        }
    };

    const DOMElements = {}; // Preenchido em initDOMElements

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
        DOMElements.autocompleteResultsContainer = document.getElementById('autocomplete-results');
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

    function normalizeString(str) {
        if (!str) return '';
        let s = String(str).toLowerCase();
        s = s.replace(/\b([a-zà-ú]+)['’]([a-zà-ú])/gi, '$1 $2'); // Trata apóstrofos como separadores
        s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove acentos
        s = s.replace(/['’]/g, ''); // Remove apóstrofos restantes
        s = s.replace(/[^a-z0-9\s-]/g, ' '); // Remove caracteres não alfanuméricos, exceto espaço e hífen
        s = s.replace(/\s+/g, ' ').trim(); // Normaliza múltiplos espaços para um único e remove espaços no início/fim
        return s;
    }

    function toSimpleForm(normalizedName) {
        if (!normalizedName) return '';
        let simple = normalizedName;
        simple = simple.replace(/\s+\b(d|de|do|da|dos|das)\b\s+/g, ' '); // Remove preposições no meio
        simple = simple.replace(/^\b(d|de|do|da|dos|das)\b\s+/g, ''); // Remove no início
        simple = simple.replace(/\s+\b(d|de|do|da|dos|das)\b$/g, ''); // Remove no fim
        if (/^(d|de|do|da|dos|das)$/.test(simple.trim())) { // Remove se for a única palavra
             simple = simple.replace(/^(d|de|do|da|dos|das)$/, '');
        }
        return simple.trim();
    }

    function showNotification(message, type = 'success', duration = 5000) {
        const el = document.createElement('div');
        el.className = `alert alert-${type}`;
        el.textContent = message;
        DOMElements.notificationContainer.appendChild(el);
        setTimeout(() => {
            el.classList.add('fade-out');
            setTimeout(() => el.remove(), 500); // Tempo para a animação de fade-out
        }, duration);
    }

    function openModal(modalElement) {
        if (modalElement) modalElement.classList.add('show');
    }

    function closeModal(modalElement) {
        if (modalElement) modalElement.classList.remove('show');
    }

    function closeAllModals() {
        document.querySelectorAll('.modal.show').forEach(closeModal);
        removeCityInfoMarker(); // Também remove o marcador de info ao fechar modais
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    function formatDateTime(date) {
        if (!date) return "Nunca";
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }

    function showLoading(show = true, message = "Carregando...") {
        DOMElements.loadingMessage.textContent = message;
        DOMElements.loadingOverlay.classList.toggle('hidden', !show);
    }

    function showSyncStatus(show = true) {
        DOMElements.syncStatus.style.display = show ? 'block' : 'none';
    }

    // ========= MAPA E ROTEAMENTO =========
    function initMap() {
        AppState.map = L.map(DOMElements.mapContainer, {
            dragging: true, touchZoom: true, doubleClickZoom: true,
            scrollWheelZoom: true, boxZoom: true, keyboard: true, tap: true,
        }).setView(AppConfig.mapInitialView, AppConfig.mapInitialZoom);

        const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
            keepBuffer: 2 // Ajuda com o carregamento de tiles
        });

        const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18
        });

        openStreetMap.addTo(AppState.map); // Camada base padrão

        const baseLayers = {
            "Padrão (Ruas)": openStreetMap,
            "Satélite": esriSatellite
        };

        L.control.layers(baseLayers, null, { position: 'bottomright' }).addTo(AppState.map);

        // Definindo a ordem dos panes
        AppState.map.createPane('boundaryPane'); // Limites estaduais
        AppState.map.getPane('boundaryPane').style.zIndex = 650;
        AppState.map.createPane('cityFillPane'); // Preenchimento das cidades
        AppState.map.getPane('cityFillPane').style.zIndex = 420;
        AppState.map.createPane('routingPane'); // Rotas
        AppState.map.getPane('routingPane').style.zIndex = 640;
        AppState.map.createPane('cityInfoIconPane'); // Ícone de info
        AppState.map.getPane('cityInfoIconPane').style.zIndex = 660; // Acima de muitas coisas
    }

    async function loadGeoJsonWithFallback(dataSet) {
        showLoading(true, `Carregando: ${dataSet.description}...`);
        let featuresLoaded = null;
        console.log(`Iniciando carregamento para: ${dataSet.description}`);
        for (const url of dataSet.urls) {
            try {
                console.log(`Tentando carregar ${dataSet.description} de: ${url}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Falha ${response.status} (${response.statusText})`);
                const data = await response.json();
                if (data.features) {
                    featuresLoaded = data.features;
                } else if (["Feature", "Polygon", "MultiPolygon", "LineString", "MultiLineString"].includes(data.type)) { // Suporte a GeoJSON com um único feature
                    featuresLoaded = [data];
                } else {
                    console.warn(`GeoJSON de ${url} em formato inesperado.`, data);
                    throw new Error(`Formato inesperado para ${url}`);
                }
                console.log(`${dataSet.description} carregado com sucesso de: ${url}. Features: ${featuresLoaded.length}`);
                break; // Sucesso, sai do loop de URLs
            } catch (error) {
                console.warn(`Erro ao carregar ${dataSet.description} de ${url}:`, error.message);
            }
        }

        if (featuresLoaded && featuresLoaded.length > 0) {
            const layerOptions = {
                style: dataSet.styleFunction,
                onEachFeature: dataSet.onFeatureCallback,
                pane: dataSet.paneName || (dataSet.id.startsWith('municipios') ? 'cityFillPane' : undefined) // Define o pane
            };
            const geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: featuresLoaded }, layerOptions).addTo(AppState.map);
            console.log(`${dataSet.description} adicionado ao mapa.`);
            return geoJsonLayer; // Retorna a camada para referência, se necessário (ex: limiteSP)
        }

        showNotification(`Falha ao carregar dados para: ${dataSet.description}`, 'danger', 7000);
        console.error(`Não foi possível carregar ${dataSet.description} de nenhuma fonte.`);
        return null;
    }


    function onEachCityFeature(feature, layer) {
        const cityName = feature.properties.name || feature.properties.NOME_MUN || feature.properties.NM_MUN;
        const cityId = feature.properties.id || feature.properties.CD_MUN || feature.properties.geocodigo || feature.properties.codarea || generateId(); // Usa um ID do GeoJSON ou gera um

        if (!cityName) { console.warn("Feature sem nome:", feature.properties); return; }

        if (!AppState.cityLayers[cityName]) { // Evita sobrescrever se já existir
            AppState.cityLayers[cityName] = layer;
        }
        AppState.normalizedCityNames[normalizeString(cityName)] = cityName; // Mapeia nome normalizado para original

        layer.on('click', (e) => handleCityClick(cityName, cityId, layer));
        layer.on('dblclick', (e) => showCityDetailsModal(cityName, cityId)); // cityId aqui é o do GeoJSON
        layer.on('mouseover', function (eL) { // 'this' refere-se à camada (layer)
            if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
            if (document.querySelector('.modal.show')) return; // Não mostrar se modal estiver aberto

            if (!AppState.cityInfoMarker || AppState.cityInfoMarker.options.cityName !== cityName) {
                removeCityInfoMarker();
                const markerLatLng = this.getBounds().getCenter();
                const customIcon = L.divIcon({ className: 'city-info-icon-marker', html: `<i class="fas fa-info-circle"></i>`, iconSize: [30, 30], iconAnchor: [15, 15] });
                AppState.cityInfoMarker = L.marker(markerLatLng, { icon: customIcon, interactive: true, cityName: cityName, bubblingMouseEvents: false, pane: 'cityInfoIconPane' }).addTo(AppState.map);

                AppState.cityInfoMarker.on('mouseover', async function(evIcon) { // 'this' refere-se ao marcador
                    AppState.isMouseOverInfoIcon = true;
                    if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
                    const tooltip = this.getTooltip();
                    if (tooltip && typeof this.isTooltipOpen === 'function' && this.isTooltipOpen()) return;

                    const tooltipContent = await generateCityTooltipContent(this.options.cityName);
                    this.bindTooltip(tooltipContent, { permanent: false, direction: 'top', offset: L.point(0, -15), className: 'city-info-tooltip', interactive: true }).openTooltip();
                });
                AppState.cityInfoMarker.on('mouseout', function(evIcon) { // 'this' refere-se ao marcador
                    AppState.isMouseOverInfoIcon = false;
                    const self = this;
                    if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
                    AppState.cityInfoMarkerTimeout = setTimeout(() => {
                        const tooltip = self.getTooltip();
                        if (!AppState.isMouseOverInfoIcon && AppState.cityInfoMarker === self && !(tooltip && self.isTooltipOpen && self.isTooltipOpen())) {
                            removeCityInfoMarker();
                        }
                    }, 300);
                });
                AppState.cityInfoMarker.on('click', (eClickIcon) => {
                    L.DomEvent.stopPropagation(eClickIcon);
                    showCityDetailsModal(AppState.cityInfoMarker.options.cityName, cityId); // Usa o cityId da feature original
                });
            }
        });
        layer.on('mouseout', function (eL) { // 'this' refere-se à camada (layer)
            if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
            AppState.cityInfoMarkerTimeout = setTimeout(() => {
                if (!AppState.isMouseOverInfoIcon && AppState.cityInfoMarker && AppState.cityInfoMarker.options.cityName === cityName) {
                    removeCityInfoMarker();
                }
            }, 450);
        });
        layer.bindTooltip(cityName, { permanent: false, direction: 'center', className: 'city-tooltip' });
    }

    function removeCityInfoMarker() {
        if (AppState.cityInfoMarker) {
            AppState.cityInfoMarker.off('mouseover').off('mouseout').off('click');
            const tooltip = AppState.cityInfoMarker.getTooltip();
            if (tooltip && typeof AppState.cityInfoMarker.isTooltipOpen === 'function' && AppState.cityInfoMarker.isTooltipOpen()) {
                AppState.cityInfoMarker.closeTooltip().unbindTooltip();
            }
            if (AppState.map && AppState.map.hasLayer(AppState.cityInfoMarker)) {
                AppState.map.removeLayer(AppState.cityInfoMarker);
            }
            AppState.cityInfoMarker = null;
        }
        if (AppState.cityInfoMarkerTimeout) {
            clearTimeout(AppState.cityInfoMarkerTimeout);
            AppState.cityInfoMarkerTimeout = null;
        }
        AppState.isMouseOverInfoIcon = false;
    }

    async function generateCityTooltipContent(cityName) {
        let cityId = null;
        const cityLayer = AppState.cityLayers[cityName];
        if (cityLayer?.feature?.properties) { // Garante que cityLayer e feature.properties existem
            cityId = cityLayer.feature.properties.CD_MUN || cityLayer.feature.properties.geocodigo || cityLayer.feature.properties.id;
        }

        const ibgeData = await fetchCityDataFromIBGE(cityId, cityName); // cityId pode ser nulo se não encontrado
        const population = ibgeData?.population;
        const populationYear = ibgeData?.populationYear;
        const density = ibgeData?.density;
        // Área não será mostrada no tooltip para mantê-lo conciso.

        let content = `<h6>${cityName}</h6>`;
        content += `<p><strong>População:</strong> ${population ? population.toLocaleString('pt-BR') + (populationYear ? ` (${populationYear})` : '') : 'N/D'}</p>`;
        if (density) {
            content += `<p><strong>Densidade:</strong> ${density.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hab/km²</p>`;
        }

        const assignedVendedorIds = AppState.cityAssignments[cityName];
        if (assignedVendedorIds?.length > 0) {
            assignedVendedorIds.forEach(vId => {
                const vendedor = AppState.vendedores.find(v => v.id === vId);
                if (vendedor) content += `<div class="vendedor-tooltip-info"><p class="vendedor-name-indicator"><span class="vendedor-color-indicator" style="background-color:${vendedor.color};"></span>${vendedor.nome}</p><p>Cód: ${vendedor.codigoVendedor || 'N/A'}, Sup: ${vendedor.supervisor || 'N/A'}</p><p>Cad: ${(vendedor.totalCadastros || 0).toLocaleString('pt-BR')}, Posit: ${(vendedor.totalPositivados || 0).toLocaleString('pt-BR')}</p></div>`;
            });
        } else content += '<p><em>Nenhum vendedor atribuído.</em></p>';
        return content;
    }

    function displayRouteToCity(destinationCoords, destinationCityName) {
        if (!destinationCoords?.lat || !destinationCoords?.lng) {
            showNotification('Coordenadas de destino inválidas para rota.', 'danger');
            const routeDetailsEl = document.getElementById('route-details');
            if(routeDetailsEl) routeDetailsEl.innerHTML = '<p><em>Coordenadas inválidas para traçar rota.</em></p>';
            return;
        }
        if (AppState.currentRouteControl) AppState.map.removeControl(AppState.currentRouteControl);
        if (AppState.destinationMarkerForRoute) AppState.map.removeLayer(AppState.destinationMarkerForRoute);

        const routeDetailsEl = document.getElementById('route-details');
        if (routeDetailsEl) routeDetailsEl.innerHTML = '<p><em>Calculando rota... Por favor, aguarde.</em></p>';

        AppState.currentRouteControl = L.Routing.control({
            waypoints: [AppConfig.distribuidoraAmeripanCoords, destinationCoords],
            routeWhileDragging: false, addWaypoints: false, show: false, fitSelectedRoutes: 'smart',
            lineOptions: { styles: [{ color: '#03A9F4', opacity: 0.9, weight: 7 }], pane: 'routingPane' },
            createMarker: (i, waypoint) => i === 0 ? L.marker(waypoint.latLng, { icon: L.icon({ iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png', iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }), title: "Ameripan Distribuidora" }).bindPopup("<b>Ameripan Distribuidora</b><br>Origem da Rota") : null
        }).on('routesfound', function(e) {
            if (AppState.destinationMarkerForRoute) AppState.map.removeLayer(AppState.destinationMarkerForRoute); // Limpa marcador anterior
            const summary = e.routes?.[0]?.summary;
            if (summary) {
                const distKm = (summary.totalDistance / 1000).toFixed(1);
                const timeMinutes = Math.round(summary.totalTime / 60);
                const hours = Math.floor(timeMinutes / 60);
                const minutes = timeMinutes % 60;
                let timeStr = (hours > 0 ? `${hours}h ` : '') + `${minutes}min`;
                const routeInfoText = `Distância: ${distKm} km<br>Tempo Estimado: ${timeStr}`;
                if (routeDetailsEl) routeDetailsEl.innerHTML = `<p><strong>Distância de Americana:</strong> ${distKm} km</p><p><strong>Tempo estimado de viagem:</strong> ${timeStr}</p>`;
                AppState.destinationMarkerForRoute = L.marker(destinationCoords, { icon: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]}), title: destinationCityName }).addTo(AppState.map).bindTooltip(`<b>${destinationCityName}</b><br>${routeInfoText}`).bindPopup(`<b>Destino: ${destinationCityName}</b><br>${routeInfoText}`);
            } else { if (routeDetailsEl) routeDetailsEl.innerHTML = '<p><em>Não foi possível calcular os detalhes da rota.</em></p>'; showNotification('Não foi possível encontrar uma rota para esta cidade.', 'warning');}
        }).on('routingerror', function(e) {
            const errorMsg = e.error?.message || 'Detalhes indisponíveis';
            if (routeDetailsEl) routeDetailsEl.innerHTML = `<p><em>Erro ao calcular a rota. (${errorMsg})</em></p>`;
            showNotification(`Erro ao calcular a rota: ${errorMsg}`, 'danger');
        }).addTo(AppState.map);
    }

    async function handleCityClick(cityName, cityId, layer) {
        AppState.selectedCity = { name: cityName, id: cityId, layer: layer };
        removeCityInfoMarker();
        resetMapStyles();
        setLayerStyle(layer, CONSTANTS.SELECTED_CITY_STYLE);
        if (layer.bringToFront) layer.bringToFront();
        await updateSelectedCityInfo();
        if (layer.getBounds && typeof layer.getBounds === 'function') {
            displayRouteToCity(layer.getBounds().getCenter(), cityName);
        } else {
            console.warn("Layer da cidade não possui getBounds(), não é possível obter centro para rota.", layer);
            const routeDetailsEl = document.getElementById('route-details');
            if (routeDetailsEl) routeDetailsEl.innerHTML = '<p><em>Não foi possível obter coordenadas da cidade para rota.</em></p>';
        }
        if (DOMElements.sidebar.classList.contains('collapsed')) DOMElements.toggleSidebarButton.click();
        DOMElements.tabButtons.forEach(btn => btn.classList.remove('active'));
        DOMElements.tabContents.forEach(content => content.classList.remove('active'));
        document.querySelector('.tab-button[data-tab="search"]')?.classList.add('active');
        document.getElementById('tab-search')?.classList.add('active');
    }

    function setLayerStyle(layer, style) { if (layer?.setStyle) layer.setStyle(style); }

    function getCityStyle(feature) {
        const cityName = feature.properties.name || feature.properties.NOME_MUN || feature.properties.NM_MUN;
        let styleOptions = { ...CONSTANTS.DEFAULT_CITY_STYLE };
        if (AppState.favorites.some(fav => fav.name === cityName) && !AppState.cityAssignments[cityName]?.length) {
            styleOptions.fillOpacity = 0.05; styleOptions.weight = 1; styleOptions.color = '#a0a0a0';
        }
        if (AppState.cityAssignments[cityName]?.length) {
            if (AppState.cityAssignments[cityName].length === 1) {
                const vend = AppState.vendedores.find(v => v.id === AppState.cityAssignments[cityName][0]);
                if (vend?.color) { styleOptions.fillColor = vend.color; styleOptions.color = vend.color; styleOptions.fillOpacity = 0.5; styleOptions.weight = 2; }
            } else styleOptions = { ...CONSTANTS.MULTIPLE_VENDEDORES_STYLE };
        }
        if (AppState.activeGroup && AppState.groups[AppState.activeGroup]?.includes(cityName)) styleOptions = { ...CONSTANTS.HIGHLIGHT_GROUP_STYLE };
        if (AppState.activeVendedorId && AppState.cityAssignments[cityName]?.includes(AppState.activeVendedorId)) styleOptions = { ...CONSTANTS.HIGHLIGHT_VENDEDOR_STYLE };
        if (AppState.selectedCity?.name === cityName) styleOptions = { ...CONSTANTS.SELECTED_CITY_STYLE };
        return styleOptions;
    }

    function resetMapStyles() {
        Object.values(AppState.cityLayers).forEach(layer => { if (layer.feature) setLayerStyle(layer, getCityStyle(layer.feature)); });
        AppState.map.eachLayer(layer => { if (layer.options?.id === 'limiteSPGeoJSON') setLayerStyle(layer, CONSTANTS.SP_BOUNDARY_STYLE); });
    }

    function highlightVendedorCitiesOnMap(vendedorId) {
        AppState.activeVendedorId = vendedorId; AppState.activeGroup = null; if(DOMElements.groupSelect) DOMElements.groupSelect.value = ''; resetMapStyles();
        const vendedor = AppState.vendedores.find(v => v.id === vendedorId);
        if (vendedor?.cidades.length) { const layers = vendedor.cidades.map(name => AppState.cityLayers[name]).filter(Boolean); if (layers.length) AppState.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [50, 50] }); }
        showNotification(`Cidades do vendedor ${vendedor?.nome || ''} destacadas.`, 'info');
    }

    function highlightGroupOnMap(groupName) {
        AppState.activeGroup = groupName; AppState.activeVendedorId = null; resetMapStyles();
        if (groupName && AppState.groups[groupName]?.length) { const layers = AppState.groups[groupName].map(name => AppState.cityLayers[name]).filter(Boolean); if (layers.length) AppState.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [50, 50] }); }
        showNotification(`Grupo ${groupName || 'Nenhum'} destacado.`, 'info');
    }

    async function loadDataFromSheets() {
        if (AppConfig.apiKey === "SUA_API_KEY_RESTRITA_AQUI" || !AppConfig.apiKey) { showNotification("API Key do Google Sheets não configurada.", "danger", 10000); return; }
        showLoading(true, "Carregando dados da planilha..."); showSyncStatus(true);
        try {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${AppConfig.spreadsheetId}/values/${AppConfig.range}?key=${AppConfig.apiKey}`);
            if (!response.ok) throw new Error(`Erro ${response.status} na API do Sheets.`);
            const data = await response.json();
            processSheetsData(data);
            AppState.lastUpdateTime = new Date(); if(DOMElements.lastUpdateSpan) DOMElements.lastUpdateSpan.textContent = formatDateTime(AppState.lastUpdateTime);
            saveDataToLocalStorage(); updateUIAfterDataLoad(); showNotification("Dados carregados com sucesso da planilha!", "success");
        } catch (error) { console.error("Erro ao obter dados da planilha:", error); showNotification(`Erro ao carregar dados da planilha: ${error.message}`, "danger", 10000); updateUIAfterDataLoad(); }
        finally { showLoading(false); showSyncStatus(false); }
    }

    function processSheetsData(data) {
        const newVendedores = []; const newCityAssignments = {}; let cidadesNaoEncontradas = [];
        if (!data.values || data.values.length < 6) { showNotification("Formato da planilha incorreto. Verifique as instruções.", "warning", 10000); AppState.vendedores = []; AppState.cityAssignments = {}; return; }
        const values = data.values; const numCols = values[0]?.length || 0; let colorIndex = 0;
        for (let col = 0; col < numCols; col++) {
            const supervisor = values[0]?.[col]?.trim();
            const vendedorNome = values[1]?.[col]?.trim();
            if (!supervisor || !vendedorNome) continue;
            const vendedorId = generateId();
            const vendedor = { id: vendedorId, nome: vendedorNome, supervisor, codigoVendedor: values[2]?.[col]?.trim() || 'N/A', totalCadastros: parseInt(values[3]?.[col]?.trim()) || 0, totalPositivados: parseInt(values[4]?.[col]?.trim()) || 0, color: AppConfig.vendedorColors[colorIndex++ % AppConfig.vendedorColors.length], cidades: [] };
            for (let row = 5; row < values.length; row++) {
                const cidadeNomePlanilha = values[row]?.[col]?.trim();
                if (cidadeNomePlanilha) {
                    const normPlanilhaOriginal = normalizeString(cidadeNomePlanilha);
                    let cidadeRealNoMapa = AppState.normalizedCityNames[normPlanilhaOriginal];
                    if (!cidadeRealNoMapa) { const simplePlanilha = toSimpleForm(normPlanilhaOriginal); for (const [normMapKey, originalMapNameValue] of Object.entries(AppState.normalizedCityNames)) { if (toSimpleForm(normMapKey) === simplePlanilha) { cidadeRealNoMapa = originalMapNameValue; break; } } }
                    if (!cidadeRealNoMapa) { const simplePlanilha = toSimpleForm(normPlanilhaOriginal); if (simplePlanilha.length > 3) { for (const [normMapKey, originalMapNameValue] of Object.entries(AppState.normalizedCityNames)) { const simpleMap = toSimpleForm(normMapKey); if (simpleMap.includes(simplePlanilha) && (simplePlanilha.length / simpleMap.length > 0.7)) { cidadeRealNoMapa = originalMapNameValue; break; } else if (simplePlanilha.includes(simpleMap) && (simpleMap.length / simplePlanilha.length > 0.7)) { cidadeRealNoMapa = originalMapNameValue; break; } } } }
                    if (cidadeRealNoMapa) { vendedor.cidades.push(cidadeRealNoMapa); if (!newCityAssignments[cidadeRealNoMapa]) newCityAssignments[cidadeRealNoMapa] = []; if (!newCityAssignments[cidadeRealNoMapa].includes(vendedorId)) newCityAssignments[cidadeRealNoMapa].push(vendedorId);
                    } else if (!cidadesNaoEncontradas.includes(cidadeNomePlanilha)) { cidadesNaoEncontradas.push(cidadeNomePlanilha); console.warn(`Cidade da planilha "${cidadeNomePlanilha}" (Vendedor: ${vendedorNome}) não encontrada no mapa.`); }
                }
            }
            newVendedores.push(vendedor);
        }
        AppState.vendedores = newVendedores; AppState.cityAssignments = newCityAssignments;
        if (cidadesNaoEncontradas.length) showNotification(`Cidades não encontradas na planilha: ${cidadesNaoEncontradas.slice(0,5).join(', ')}${cidadesNaoEncontradas.length > 5 ? ' e mais...' : ''}`, "warning", 15000);
    }

    function loadSavedData() {
        showLoading(true, "Carregando dados salvos...");
        try {
            AppState.favorites = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES)) || [];
            AppState.groups = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS)) || {};
            AppState.vendedores = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES)) || [];
            AppState.cityIBGEData = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.CITY_IBGE_DATA)) || {};
            if (AppState.vendedores.length && !Object.keys(AppState.cityAssignments).length && localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES)) {
                console.warn("Recriando 'cityAssignments' a partir dos dados de vendedores salvos.");
                AppState.cityAssignments = {};
                AppState.vendedores.forEach(v => v.cidades?.forEach(cName => {
                    if (!AppState.cityAssignments[cName]) AppState.cityAssignments[cName] = [];
                    if (!AppState.cityAssignments[cName].includes(v.id)) AppState.cityAssignments[cName].push(v.id);
                }));
            }
            const savedLastUpdate = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.LAST_UPDATE);
            if (savedLastUpdate) AppState.lastUpdateTime = new Date(savedLastUpdate);
            if (DOMElements.lastUpdateSpan) DOMElements.lastUpdateSpan.textContent = formatDateTime(AppState.lastUpdateTime);
        } catch (e) {
            console.error('Erro ao carregar dados do localStorage:', e);
            Object.values(CONSTANTS.LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
            showNotification('Erro ao carregar dados salvos. Os dados locais foram resetados.', 'danger', 7000);
            AppState.favorites = []; AppState.groups = {}; AppState.vendedores = []; AppState.cityAssignments = {}; AppState.cityIBGEData = {}; AppState.lastUpdateTime = null;
        }
    }

    function saveDataToLocalStorage() {
        try {
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES, JSON.stringify(AppState.favorites));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS, JSON.stringify(AppState.groups));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES, JSON.stringify(AppState.vendedores));
            if (AppState.lastUpdateTime) localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.LAST_UPDATE, AppState.lastUpdateTime.toISOString());
            if (Object.keys(AppState.cityIBGEData).length) localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.CITY_IBGE_DATA, JSON.stringify(AppState.cityIBGEData));
        } catch (e) { console.error('Erro ao salvar dados no localStorage:', e); showNotification('Erro ao salvar dados localmente.', 'danger');}
    }

    async function fetchCityDataFromIBGE(cityId, cityName) {
        const normalizedCityKey = normalizeString(cityName) || cityId;
        if (AppState.cityIBGEData[normalizedCityKey]?.timestamp && (Date.now() - AppState.cityIBGEData[normalizedCityKey].timestamp < 24 * 60 * 60 * 1000)) {
            console.log("Dados do IBGE para", normalizedCityKey, "encontrados no cache.");
            return AppState.cityIBGEData[normalizedCityKey];
        }
        console.log("Buscando dados do IBGE da API para:", normalizedCityKey);

        if (!cityId || String(cityId).length < 7) {
            console.warn(`Código IBGE inválido para ${cityName}: ${cityId}.`);
            const cachedErrorData = AppState.cityIBGEData[normalizedCityKey] || {};
            return { ...cachedErrorData, urbanizedArea: null, error: "Código IBGE inválido fornecido." }; // Adiciona urbanizedArea: null
        }

        const indicatorsQuery = Object.values(CONSTANTS.IBGE_INDICATORS).join('%7C');
        const apiUrl = `https://servicodados.ibge.gov.br/api/v1/pesquisas/indicadores/${indicatorsQuery}/resultados/${cityId}`;
        console.log("API URL IBGE:", apiUrl);

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Falha API IBGE ${response.status}`);
            const data = await response.json();
            console.log("Dados IBGE para " + cityName + ":", data);

            const cityData = {
                population: null, populationYear: null, density: null,
                territorialArea: null, urbanizedArea: null, // Adicionado urbanizedArea
                timestamp: Date.now(), error: null
            };

            data.forEach(indicatorData => {
                if (indicatorData.res?.length > 0) {
                    const resultSeries = indicatorData.res[0].res;
                    const latestYear = Object.keys(resultSeries).sort().pop();
                    if (latestYear && resultSeries[latestYear] !== null) {
                        const rawValue = resultSeries[latestYear];
                        if (indicatorData.id == CONSTANTS.IBGE_INDICATORS.POPULATION) {
                            cityData.population = parseInt(rawValue, 10);
                            cityData.populationYear = latestYear;
                        } else if (indicatorData.id == CONSTANTS.IBGE_INDICATORS.DENSITY) {
                            cityData.density = parseFloat(rawValue);
                        } else if (indicatorData.id == CONSTANTS.IBGE_INDICATORS.TERRITORIAL_AREA) {
                            cityData.territorialArea = parseFloat(rawValue);
                        } else if (indicatorData.id == CONSTANTS.IBGE_INDICATORS.URBANIZED_AREA) { // Processa área urbanizada
                            cityData.urbanizedArea = parseFloat(rawValue);
                        }
                    }
                }
            });
            AppState.cityIBGEData[normalizedCityKey] = cityData;
            saveDataToLocalStorage();
            return cityData;
        } catch (error) {
            console.error(`Erro IBGE ${cityName} (${cityId}):`, error);
            const cachedErrorData = AppState.cityIBGEData[normalizedCityKey] || {};
            return { ...cachedErrorData, urbanizedArea: null, error: error.message }; // Adiciona urbanizedArea: null em erro
        }
    }

    async function updateSelectedCityInfo() {
        if (!AppState.selectedCity) {
            DOMElements.selectedCityInfo.innerHTML = '<p class="empty-message">Nenhuma cidade selecionada.</p>';
            DOMElements.selectedCityActions.classList.add('hidden');
            if(document.getElementById('route-details')) document.getElementById('route-details').innerHTML = '<p class="empty-message">Clique em uma cidade para ver a rota.</p>';
            return;
        }
        const { name: cityName, id: cityIdOriginal } = AppState.selectedCity;
        let ibgeCityCode = cityIdOriginal;
        const cityLayer = AppState.cityLayers[cityName];
        if (cityLayer?.feature?.properties) ibgeCityCode = cityLayer.feature.properties.CD_MUN || cityLayer.feature.properties.geocodigo || cityLayer.feature.properties.id || cityIdOriginal;

        const ibgeData = await fetchCityDataFromIBGE(ibgeCityCode, cityName);
        const pop = ibgeData?.population;
        const popYear = ibgeData?.populationYear;
        const dens = ibgeData?.density;
        const area = ibgeData?.territorialArea;
        const urbanArea = ibgeData?.urbanizedArea; // Pega área urbanizada

        let dataHTML = `<p><strong>População:</strong> ${pop ? pop.toLocaleString('pt-BR') + (popYear ? ` (${popYear})` : '') + ' hab.' : 'N/D'}</p>`;
        if (dens) dataHTML += `<p><strong>Densidade:</strong> ${dens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hab/km²</p>`;
        if (area) dataHTML += `<p><strong>Área Territorial:</strong> ${area.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km²</p>`;
        if (urbanArea) dataHTML += `<p><strong>Área Urbanizada:</strong> ${urbanArea.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km²</p>`; // Exibe área urbanizada
        if (ibgeData?.error) dataHTML += `<p><small style="color:red;">Erro IBGE: ${ibgeData.error}</small></p>`;

        let vendHTML = '';
        const assignedVendIds = AppState.cityAssignments[cityName];
        if (assignedVendIds?.length) {
            vendHTML = '<p><strong>Vendedores:</strong></p><ul class="vendedores-list" style="padding-left:0;list-style:none;">';
            assignedVendIds.forEach(vId => {
                const v = AppState.vendedores.find(vend => vend.id === vId);
                if (v) vendHTML += `<li style="display:flex;align-items:center;margin-bottom:3px;"><div class="vendedor-color-indicator" style="background-color:${v.color};"></div>${v.nome}(Sup:${v.supervisor})</li>`;
            });
            vendHTML += '</ul>';
        } else vendHTML = '<p><em>Nenhum vendedor.</em></p>';

        const ibgeLink = `https://cidades.ibge.gov.br/panorama-impresso?cod=${ibgeCityCode}`;
        DOMElements.selectedCityInfo.innerHTML = `<h4>${cityName}</h4>${dataHTML}${vendHTML}<p><small>Cód.IBGE:${ibgeCityCode||'N/A'}. (Duplo clique p/ detalhes)</small></p><div class="btn-group"><a href="${ibgeCityCode?.length >= 7 ? ibgeLink : '#'}" target="_blank" class="btn btn-info btn-sm mt-10 ${!(ibgeCityCode?.length >= 7) ? 'disabled':''}" title="Panorama IBGE"><i class="fas fa-chart-bar"></i> IBGE</a></div><div id="route-details" class="mt-15 bt-eee pt-15"><p class="empty-message">Calculando rota...</p></div>`;
        DOMElements.selectedCityActions.classList.remove('hidden');
        DOMElements.assignVendedorButton.innerHTML = assignedVendIds?.length ? '<i class="fas fa-user-tie"></i> Gerenciar Vends.' : '<i class="fas fa-user-tie"></i> Atribuir Vend.';
    }

    function updateFavoritesList() {
        DOMElements.favoritesList.innerHTML = AppState.favorites.length === 0 ? '<li class="empty-message">Nenhuma cidade favorita</li>' : '';
        AppState.favorites.forEach(city => { const li = document.createElement('li'); li.className = 'list-item'; const assignedIds = AppState.cityAssignments[city.name]; let badge = ''; if (assignedIds?.length) badge = ` <span class="badge ${assignedIds.length === 1 ? 'badge-success' : 'badge-warning'}" title="${assignedIds.length} vend."><i class="fas ${assignedIds.length === 1 ? 'fa-user-tie' : 'fa-users'}"></i></span>`; li.innerHTML = `<div><strong>${city.name}</strong>${badge}</div><div class="actions"></div>`; const groupSelect = document.createElement('select'); groupSelect.className = 'form-control form-control-sm'; groupSelect.style.maxWidth = '120px'; groupSelect.innerHTML = '<option value="">Sem grupo</option>'; Object.keys(AppState.groups).sort().forEach(gName => groupSelect.innerHTML += `<option value="${gName}" ${AppState.groups[gName]?.includes(city.name) ? 'selected' : ''}>${gName}</option>`); groupSelect.onchange = function() { Object.keys(AppState.groups).forEach(g => { if(AppState.groups[g]) AppState.groups[g] = AppState.groups[g].filter(c => c !== city.name)}); if (this.value) { if(!AppState.groups[this.value]) AppState.groups[this.value] = []; AppState.groups[this.value].push(city.name); } saveDataToLocalStorage(); resetMapStyles(); showNotification(`Cidade ${city.name} ${this.value ? 'adicionada ao ' + this.value : 'removida de grupos'}.`); }; li.querySelector('.actions').appendChild(groupSelect); const viewBtn = document.createElement('button'); viewBtn.className = 'btn btn-primary btn-sm'; viewBtn.innerHTML = '<i class="fas fa-eye"></i>'; viewBtn.title = 'Ver no mapa'; viewBtn.onclick = () => { if (AppState.cityLayers[city.name]) { AppState.map.fitBounds(AppState.cityLayers[city.name].getBounds()); AppState.cityLayers[city.name].fire('click'); }}; li.querySelector('.actions').appendChild(viewBtn); const removeBtn = document.createElement('button'); removeBtn.className = 'btn btn-danger btn-sm'; removeBtn.innerHTML = '<i class="fas fa-trash"></i>'; removeBtn.title = 'Remover favorito'; removeBtn.onclick = () => { AppState.favorites = AppState.favorites.filter(f => f.name !== city.name); Object.keys(AppState.groups).forEach(g => {if(AppState.groups[g]) AppState.groups[g] = AppState.groups[g].filter(c => c !== city.name)}); saveDataToLocalStorage(); updateFavoritesList(); updateGroupsLists(); resetMapStyles(); showNotification(`${city.name} removida dos favoritos.`); }; li.querySelector('.actions').appendChild(removeBtn); DOMElements.favoritesList.appendChild(li); });
    }

    function updateGroupsLists() {
        DOMElements.groupsList.innerHTML = Object.keys(AppState.groups).length === 0 ? '<li class="empty-message">Nenhum grupo criado</li>' : ''; if(DOMElements.groupSelect) DOMElements.groupSelect.innerHTML = '<option value="">Selecione um grupo</option>';
        Object.keys(AppState.groups).sort().forEach(groupName => { if(DOMElements.groupSelect) DOMElements.groupSelect.innerHTML += `<option value="${groupName}">${groupName}</option>`; const li = document.createElement('li'); li.className = 'list-item'; li.innerHTML = `<div><strong>${groupName}</strong> <span class="badge badge-primary">${AppState.groups[groupName]?.length || 0}</span></div> <div class="actions"> <button class="btn btn-warning btn-sm btn-highlight-group" title="Destacar"><i class="fas fa-highlighter"></i></button> <button class="btn btn-danger btn-sm btn-remove-group" title="Remover"><i class="fas fa-trash"></i></button> </div>`; li.querySelector('.btn-highlight-group').onclick = () => { if(DOMElements.groupSelect) DOMElements.groupSelect.value = groupName; highlightGroupOnMap(groupName); }; li.querySelector('.btn-remove-group').onclick = () => { if (confirm(`Remover grupo "${groupName}"? As cidades não serão removidas dos favoritos, apenas do grupo.`)) { delete AppState.groups[groupName]; saveDataToLocalStorage(); updateGroupsLists(); updateFavoritesList(); if (AppState.activeGroup === groupName) { AppState.activeGroup = null; resetMapStyles(); } showNotification(`Grupo ${groupName} removido.`); } }; DOMElements.groupsList.appendChild(li); });
    }

    function updateVendedoresList() {
        DOMElements.vendedoresList.innerHTML = AppState.vendedores.length === 0 ? '<li class="empty-message">Nenhum vendedor. Sincronize.</li>' : ''; if(DOMElements.assignVendedorSelect) DOMElements.assignVendedorSelect.innerHTML = '<option value="">Selecione um vendedor</option>';
        AppState.vendedores.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(vendedor => { if(DOMElements.assignVendedorSelect) DOMElements.assignVendedorSelect.innerHTML += `<option value="${vendedor.id}">${vendedor.nome} (Sup: ${vendedor.supervisor})</option>`; const li = document.createElement('li'); li.className = 'list-item'; li.innerHTML = ` <div> <div class="vendedor-list-item-info"> <div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div> <strong>${vendedor.nome}</strong> </div> <div class="vendedor-list-item-details"> <small>Sup: ${vendedor.supervisor || 'N/A'}</small> <small>Cód: ${vendedor.codigoVendedor || 'N/A'}</small> <small>Cad: ${(vendedor.totalCadastros || 0).toLocaleString('pt-BR')}</small> <small>Posit: ${(vendedor.totalPositivados || 0).toLocaleString('pt-BR')}</small> <span class="badge badge-primary">${vendedor.cidades.length} cidades</span> </div> </div> <div class="actions"> <button class="btn btn-primary btn-sm btn-vendedor-details" title="Detalhes"><i class="fas fa-info-circle"></i></button> <button class="btn btn-warning btn-sm btn-highlight-vendedor-map" title="No mapa"><i class="fas fa-map-marker-alt"></i></button> </div>`; li.querySelector('.btn-vendedor-details').onclick = () => showVendedorDetailsModal(vendedor); li.querySelector('.btn-highlight-vendedor-map').onclick = () => highlightVendedorCitiesOnMap(vendedor.id); DOMElements.vendedoresList.appendChild(li); });
    }

    function updateUIAfterDataLoad() { updateFavoritesList(); updateGroupsLists(); updateVendedoresList(); resetMapStyles(); }

    function prepareAssignVendedorModal() {
        if (!AppState.selectedCity) return; DOMElements.assignCityNameSpan.textContent = AppState.selectedCity.name; DOMElements.assignVendedorSelect.value = ''; DOMElements.assignedVendedoresList.innerHTML = '';
        const assignedIds = AppState.cityAssignments[AppState.selectedCity.name];
        if (assignedIds?.length > 0) {
            assignedIds.forEach(vId => { const vend = AppState.vendedores.find(v => v.id === vId); if (vend) { const li = document.createElement('li'); li.className = 'list-item'; li.innerHTML = `<div class="vendedor-list-item-info"><div class="vendedor-color-indicator" style="background-color: ${vend.color};"></div>${vend.nome}</div> <button class="btn btn-danger btn-sm btn-remove-assignment" title="Remover atribuição"><i class="fas fa-user-minus"></i></button>`; li.querySelector('.btn-remove-assignment').onclick = () => { vend.cidades = vend.cidades.filter(c => c !== AppState.selectedCity.name); AppState.cityAssignments[AppState.selectedCity.name] = AppState.cityAssignments[AppState.selectedCity.name].filter(id => id !== vId); if (AppState.cityAssignments[AppState.selectedCity.name].length === 0) delete AppState.cityAssignments[AppState.selectedCity.name]; saveDataToLocalStorage(); prepareAssignVendedorModal(); updateSelectedCityInfo(); updateVendedoresList(); resetMapStyles(); showNotification(`Vendedor ${vend.nome} removido de ${AppState.selectedCity.name}.`); }; DOMElements.assignedVendedoresList.appendChild(li); } });
            DOMElements.currentVendedoresContainer.classList.remove('hidden');
        } else DOMElements.currentVendedoresContainer.classList.add('hidden');
        openModal(DOMElements.modalAssignVendedor);
    }

    function showVendedorDetailsModal(vendedor) {
        DOMElements.vendedorDetailsModalTitle.innerHTML = `<div class="vendedor-list-item-info"><div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div>Detalhes do Vendedor</div>`; DOMElements.vendedorInfoDiv.innerHTML = ` <p><strong>Nome:</strong> ${vendedor.nome}</p> <p><strong>Supervisor:</strong> ${vendedor.supervisor || 'N/A'}</p> <p><strong>Código:</strong> ${vendedor.codigoVendedor || 'N/A'}</p> <p><strong>Total Cadastros:</strong> ${(vendedor.totalCadastros || 0).toLocaleString('pt-BR')}</p> <p><strong>Total Positivados:</strong> ${(vendedor.totalPositivados || 0).toLocaleString('pt-BR')}</p>`; DOMElements.vendedorCidadesList.innerHTML = vendedor.cidades.length === 0 ? '<li class="empty-message">Nenhuma cidade</li>' : '';
        vendedor.cidades.sort().forEach(cityName => { const li = document.createElement('li'); li.className = 'list-item'; const totalAssignments = AppState.cityAssignments[cityName]?.length || 0; let badge = totalAssignments > 1 ? ` <span class="badge badge-warning" title="${totalAssignments} vend."><i class="fas fa-users"></i> ${totalAssignments}</span>` : ''; li.innerHTML = `<div>${cityName}${badge}</div><button class="btn btn-primary btn-sm btn-view-city" title="Ver no mapa"><i class="fas fa-eye"></i></button>`; li.querySelector('.btn-view-city').onclick = () => { if (AppState.cityLayers[cityName]) { closeAllModals(); AppState.map.fitBounds(AppState.cityLayers[cityName].getBounds()); AppState.cityLayers[cityName].fire('click');} }; DOMElements.vendedorCidadesList.appendChild(li); });
        DOMElements.highlightVendedorCitiesButton.onclick = () => { highlightVendedorCitiesOnMap(vendedor.id); closeAllModals(); }; openModal(DOMElements.modalVendedorDetails);
    }

    async function showCityDetailsModal(cityName, cityIdOriginal) {
        DOMElements.cityDetailsModalTitle.textContent = `Detalhes - ${cityName}`;
        DOMElements.cityDetailsModalBody.innerHTML = '<p class="empty-message">Carregando dados do IBGE e da aplicação...</p>';
        openModal(DOMElements.modalCityDetails); removeCityInfoMarker();
        let ibgeCityCode = cityIdOriginal;
        const cityLayer = AppState.cityLayers[cityName];
        if (cityLayer?.feature?.properties) ibgeCityCode = cityLayer.feature.properties.CD_MUN || cityLayer.feature.properties.geocodigo || cityLayer.feature.properties.id || cityIdOriginal;

        const ibgeData = await fetchCityDataFromIBGE(ibgeCityCode, cityName);
        let detailsHTML = `<div class="city-general-info"><h4>${cityName}</h4>`;
        if (ibgeData) {
            const pop = ibgeData.population; const popY = ibgeData.populationYear; const dens = ibgeData.density; const area = ibgeData.territorialArea; const urbanArea = ibgeData.urbanizedArea;
            detailsHTML += `<p><strong>População Estimada:</strong> ${pop ? pop.toLocaleString('pt-BR') + (popY ? ` (${popY})` : '') + ' habitantes' : 'N/D'}</p>`;
            detailsHTML += `<p><strong>Densidade Demográfica:</strong> ${dens ? dens.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' hab/km²' : 'N/D'}</p>`;
            detailsHTML += `<p><strong>Área da Unidade Territorial:</strong> ${area ? area.toLocaleString('pt-BR', {minimumFractionDigits:3, maximumFractionDigits:3}) + ' km²' : 'N/D'}</p>`;
            detailsHTML += `<p><strong>Área Urbanizada:</strong> ${urbanArea ? urbanArea.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' km²' : 'N/D'}</p>`;
            if (ibgeData.error) detailsHTML += `<p style="color:red;"><small>Erro ao buscar dados do IBGE: ${ibgeData.error}</small></p>`;
            const ibgePanoramaLink = `https://cidades.ibge.gov.br/brasil/${String(ibgeCityCode).substring(0,2)}/${normalizeString(cityName).replace(/\s+/g, '-')}/panorama`;
            const ibgePanoramaImpressoLink = `https://cidades.ibge.gov.br/panorama-impresso?cod=${ibgeCityCode}`;
            detailsHTML += `<p class="mt-10"><a href="${ibgeCityCode && String(ibgeCityCode).length >= 7 ? ibgePanoramaLink : '#'}" target="_blank" class="btn btn-info btn-sm ${!(ibgeCityCode && String(ibgeCityCode).length >= 7) ? 'disabled' : ''}">Ver Panorama Completo no IBGE</a> <a href="${ibgeCityCode && String(ibgeCityCode).length >= 7 ? ibgePanoramaImpressoLink : '#'}" target="_blank" class="btn btn-secondary btn-sm ml-10 ${!(ibgeCityCode && String(ibgeCityCode).length >= 7) ? 'disabled' : ''}">Panorama Impresso IBGE</a></p>`;
        } else detailsHTML += '<p><em>Dados do IBGE não puderam ser carregados.</em></p>';
        detailsHTML += '</div>';

        const assignedVendedorIds = AppState.cityAssignments[cityName]; let totalCadastrosCidade = 0, totalPositivadosCidade = 0;
        if (assignedVendedorIds?.length > 0) {
            detailsHTML += '<h5>Vendedores Atuantes:</h5>';
            assignedVendedorIds.forEach(vId => { const vendedor = AppState.vendedores.find(v => v.id === vId); if (vendedor) { totalCadastrosCidade += (vendedor.totalCadastros||0); totalPositivadosCidade += (vendedor.totalPositivados||0); detailsHTML += `<div class="vendedor-details-card"><h5><div class="vendedor-color-indicator" style="background-color:${vendedor.color};"></div> ${vendedor.nome}</h5><p><strong>Supervisor:</strong>${vendedor.supervisor||'N/A'}</p><p><strong>Código Vendedor:</strong>${vendedor.codigoVendedor||'N/A'}</p><p><strong>Cadastros (Indiv.):</strong>${(vendedor.totalCadastros||0).toLocaleString('pt-BR')}</p><p><strong>Positivados (Indiv.):</strong>${(vendedor.totalPositivados||0).toLocaleString('pt-BR')}</p></div>`; } });
            if (assignedVendedorIds.length > 0) { const faltouPositivar = totalCadastrosCidade - totalPositivadosCidade; detailsHTML += `<div class="city-summary-card"><h5>Sumário da Cidade (${cityName})</h5><p><strong>Total de Cadastros (Soma Vendedores):</strong> ${totalCadastrosCidade.toLocaleString('pt-BR')}</p><p><strong>Total de Positivados (Soma Vendedores):</strong> ${totalPositivadosCidade.toLocaleString('pt-BR')}</p><p><strong>Clientes Não Positivados (Base Vendedores):</strong> ${faltouPositivar.toLocaleString('pt-BR')}</p></div>`; }
        } else detailsHTML += '<p><em>Nenhum vendedor atribuído a esta cidade.</em></p>';
        DOMElements.cityDetailsModalBody.innerHTML = detailsHTML;
    }

    function setupEventListeners() {
        DOMElements.toggleSidebarButton.addEventListener('click', () => { DOMElements.sidebar.classList.toggle('collapsed'); DOMElements.toggleSidebarButton.querySelector('i').className = DOMElements.sidebar.classList.contains('collapsed') ? 'fas fa-bars' : 'fas fa-chevron-left'; setTimeout(() => AppState.map?.invalidateSize(), 310); });
        DOMElements.sidebarTabsContainer.addEventListener('click', e => { const btn = e.target.closest('.tab-button'); if (!btn) return; DOMElements.tabButtons.forEach(b => b.classList.remove('active')); DOMElements.tabContents.forEach(c => c.classList.remove('active')); btn.classList.add('active'); document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add('active'); });
        DOMElements.searchInput.addEventListener('input', handleAutocompleteSearchInput);
        DOMElements.searchInput.addEventListener('blur', () => setTimeout(() => { if (DOMElements.autocompleteResultsContainer && !DOMElements.autocompleteResultsContainer.matches(':hover')) { DOMElements.autocompleteResultsContainer.innerHTML = ''; DOMElements.autocompleteResultsContainer.classList.remove('active'); } }, 200));
        DOMElements.searchButton.addEventListener('click', () => handleSearchCity(DOMElements.searchInput.value));
        DOMElements.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') { handleSearchCity(DOMElements.searchInput.value); if (DOMElements.autocompleteResultsContainer) { DOMElements.autocompleteResultsContainer.innerHTML = ''; DOMElements.autocompleteResultsContainer.classList.remove('active'); } } });
        DOMElements.addFavoriteButton.addEventListener('click', handleAddFavorite);
        DOMElements.assignVendedorButton.addEventListener('click', () => { if (!AppState.selectedCity) { showNotification('Nenhuma cidade selecionada.', 'info'); return; } if (!AppState.vendedores.length) { showNotification('Nenhum vendedor cadastrado. Sincronize os dados.', 'warning'); return; } prepareAssignVendedorModal(); });
        DOMElements.confirmAssignVendedorButton.addEventListener('click', handleConfirmAssignVendedor); DOMElements.createGroupButton.addEventListener('click', handleCreateGroup);
        DOMElements.groupSelect?.addEventListener('change', e => highlightGroupOnMap(e.target.value));
        DOMElements.reloadDataButton.addEventListener('click', () => { if (confirm("Recarregar dados da planilha? Alterações locais não refletidas na planilha podem ser sobrescritas.")) loadDataFromSheets(); });
        document.addEventListener('click', e => { if (e.target.matches('.modal-close') || e.target.matches('.modal.show')) closeModal(e.target.closest('.modal') || e.target); });
        document.addEventListener('keydown', e => { if (e.key === "Escape") closeAllModals(); });
        AppState.map?.on('zoomstart movestart popupopen', removeCityInfoMarker).on('click', e => { if (AppState.cityInfoMarker && e.originalEvent.target === AppState.map.getContainer()) removeCityInfoMarker(); });
    }

    function handleAutocompleteSearchInput(event) {
        const searchTerm = event.target.value; const resultsContainer = DOMElements.autocompleteResultsContainer; resultsContainer.innerHTML = '';
        if (searchTerm.length < 2) { resultsContainer.classList.remove('active'); return; }
        const normSearch = normalizeString(searchTerm); const matchingCities = new Set();
        for (const [normMap, origMap] of Object.entries(AppState.normalizedCityNames)) { if (normMap.startsWith(normSearch)) matchingCities.add(origMap); if (matchingCities.size >= 15) break; }
        if (matchingCities.size < 15) for (const [normMap, origMap] of Object.entries(AppState.normalizedCityNames)) { if (normMap.includes(normSearch)) matchingCities.add(origMap); if (matchingCities.size >= 15) break; }
        if (matchingCities.size < 15) { const simpleSearch = toSimpleForm(normSearch); if (simpleSearch !== normSearch && simpleSearch.length > 1) { for (const [normMap, origMap] of Object.entries(AppState.normalizedCityNames)) { if (toSimpleForm(normMap).startsWith(simpleSearch)) matchingCities.add(origMap); if (matchingCities.size >= 15) break; } if (matchingCities.size < 15) for (const [normMap, origMap] of Object.entries(AppState.normalizedCityNames)) { if (toSimpleForm(normMap).includes(simpleSearch)) matchingCities.add(origMap); if (matchingCities.size >= 15) break; } } }
        const sortedMatches = Array.from(matchingCities);
        if (sortedMatches.length) { sortedMatches.forEach(cName => { const item = document.createElement('div'); item.className = 'autocomplete-item'; item.textContent = cName; item.addEventListener('mousedown', e => { e.preventDefault(); DOMElements.searchInput.value = cName; resultsContainer.innerHTML = ''; resultsContainer.classList.remove('active'); handleSearchCity(cName); }); resultsContainer.appendChild(item); }); resultsContainer.classList.add('active'); }
        else resultsContainer.classList.remove('active');
    }

    function handleSearchCity(searchTermOriginal) {
        if (!searchTermOriginal?.trim()) { showNotification("Por favor, digite o nome de uma cidade.", "info"); return; }
        const normSearch = normalizeString(searchTermOriginal); const simpleSearch = toSimpleForm(normSearch);
        let foundName = null, foundLayer = null, bestScore = 0;
        if (AppState.cityLayers[searchTermOriginal]) { foundName = searchTermOriginal; foundLayer = AppState.cityLayers[searchTermOriginal]; bestScore = 100; }
        else if (AppState.normalizedCityNames[normSearch]) { foundName = AppState.normalizedCityNames[normSearch]; foundLayer = AppState.cityLayers[foundName]; bestScore = 95; }
        else for (const [normKey, origName] of Object.entries(AppState.normalizedCityNames)) { if (toSimpleForm(normKey) === simpleSearch && bestScore < 90) { foundName = origName; foundLayer = AppState.cityLayers[origName]; bestScore = 90; }}
        if (bestScore < 90) for (const [normKey, origName] of Object.entries(AppState.normalizedCityNames)) { if (normKey.startsWith(normSearch)) { const score = 80 + (normSearch.length / normKey.length * 5); if (score > bestScore) { bestScore = score; foundName = origName; foundLayer = AppState.cityLayers[origName]; }}}
        if (bestScore < 80) for (const [normKey, origName] of Object.entries(AppState.normalizedCityNames)) { if (normKey.includes(normSearch)) { const score = 70 + (normSearch.length / normKey.length * 5); if (score > bestScore) { bestScore = score; foundName = origName; foundLayer = AppState.cityLayers[origName]; }}}
        if (bestScore < 70 && simpleSearch.length > 1) for (const [normKey, origName] of Object.entries(AppState.normalizedCityNames)) { const simpleKey = toSimpleForm(normKey); if (simpleKey.startsWith(simpleSearch)) { const score = 60 + (simpleSearch.length / simpleKey.length * 5); if (score > bestScore) { bestScore = score; foundName = origName; foundLayer = AppState.cityLayers[origName]; }} else if (simpleKey.includes(simpleSearch)) { const score = 50 + (simpleSearch.length / simpleKey.length * 5); if (score > bestScore) { bestScore = score; foundName = origName; foundLayer = AppState.cityLayers[origName]; }}}
        if (foundName && foundLayer) { AppState.map.fitBounds(foundLayer.getBounds(), {padding:[70,70], maxZoom:12}); foundLayer.fire('click'); showNotification(`Cidade ${foundName} encontrada.`); DOMElements.searchInput.value = foundName; if (DOMElements.autocompleteResultsContainer) { DOMElements.autocompleteResultsContainer.innerHTML = ''; DOMElements.autocompleteResultsContainer.classList.remove('active'); } }
        else showNotification(`Cidade "${searchTermOriginal}" não encontrada. Verifique a grafia.`, 'warning');
    }

    function handleAddFavorite() {
        if (!AppState.selectedCity) { showNotification('Nenhuma cidade selecionada para adicionar aos favoritos.', 'info'); return; }
        if (AppState.favorites.some(f => f.name === AppState.selectedCity.name)) { showNotification(`${AppState.selectedCity.name} já está nos favoritos.`, 'info'); return; }
        AppState.favorites.push({ name: AppState.selectedCity.name, id: AppState.selectedCity.id }); saveDataToLocalStorage(); updateFavoritesList(); resetMapStyles(); showNotification(`${AppState.selectedCity.name} adicionado aos favoritos.`);
    }

    function handleConfirmAssignVendedor() {
        const vendId = DOMElements.assignVendedorSelect.value; if (!AppState.selectedCity || !vendId) { showNotification('Selecione uma cidade e um vendedor.', 'warning'); return; }
        const cName = AppState.selectedCity.name; const vend = AppState.vendedores.find(v => v.id === vendId); if (!vend) { showNotification('Vendedor não encontrado.', 'danger'); return; }
        if (!vend.cidades.includes(cName)) vend.cidades.push(cName); else { showNotification('Este vendedor já está atribuído a esta cidade.', 'info'); return; }
        if (!AppState.cityAssignments[cName]) AppState.cityAssignments[cName] = [];
        if (!AppState.cityAssignments[cName].includes(vendId)) AppState.cityAssignments[cName].push(vendId);
        saveDataToLocalStorage(); prepareAssignVendedorModal(); updateSelectedCityInfo(); updateVendedoresList(); resetMapStyles(); showNotification(`${cName} atribuída a ${vend.nome}.`);
    }

    function handleCreateGroup() {
        const groupName = DOMElements.groupNameInput.value.trim(); if (!groupName) { showNotification('Digite um nome para o grupo.', 'warning'); return; }
        if (AppState.groups[groupName]) { showNotification('Grupo com este nome já existe.', 'warning'); return; }
        AppState.groups[groupName] = []; saveDataToLocalStorage(); updateGroupsLists(); updateFavoritesList(); DOMElements.groupNameInput.value = ''; showNotification(`Grupo "${groupName}" criado com sucesso.`);
    }

    async function initializeApp() {
        initDOMElements();
        if (DOMElements.spreadsheetIdDisplay) DOMElements.spreadsheetIdDisplay.textContent = AppConfig.spreadsheetId;
        if (DOMElements.configRangeNameDisplay) DOMElements.configRangeNameDisplay.textContent = AppConfig.range;
        if (AppConfig.apiKey === "SUA_API_KEY_RESTRITA_AQUI" || !AppConfig.apiKey) {
             console.warn("ALERTA: API Key do Google Sheets não configurada!");
             showNotification("API Key do Google Sheets não configurada! Funcionalidades da planilha desabilitadas.", "danger", 15000);
        }
        initMap();
        setupEventListeners();
        try {
            loadSavedData();
            for (const dataSet of AppConfig.geoJsonSources) {
                const layer = await loadGeoJsonWithFallback(dataSet);
                if (dataSet.id === 'limiteSP' && layer) {
                     // Camada de limite já adicionada, nenhuma ação específica extra aqui além do pane definido.
                }
            }
            if (!Object.keys(AppState.cityLayers).length && AppConfig.geoJsonSources.some(ds => ds.id.startsWith('municipios'))) {
                 showNotification("Falha ao carregar dados geográficos dos municípios.", "danger", 10000);
                 console.error("Nenhuma camada de cidade (municípios) foi carregada.");
            }
            await loadDataFromSheets();
            updateUIAfterDataLoad();
        } catch (error) {
            console.error("Erro crítico na inicialização:", error.message, error.stack);
            showNotification(`Erro crítico na inicialização: ${error.message}. Verifique o console.`, "danger", 10000);
            updateUIAfterDataLoad();
        } finally {
            showLoading(false);
        }
    }
    initializeApp();
});