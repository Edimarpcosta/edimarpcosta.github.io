document.addEventListener('DOMContentLoaded', () => {
    // ========= CONFIGURAÇÃO DA APLICAÇÃO =========
    const AppConfig = {
        spreadsheetId: "1f03fl_8HI5V6moTLYNMsQLFoi3EsLYZQI23CKkHqsow",
        apiKey: "AIzaSyChiZPUY-G3oyZN2NGY_vlgRXUzry9Pkeo", // Mantenha sua chave aqui
        range: "novas-rotas!A:ZZ", 
        potentialSheetRange: "potencial!A:F", 
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
            '#FF0000', '#0000FF', '#008000', '#FFA500', '#800080', '#F9A825', '#FF00FF', '#008B8B', '#A52A2A', '#800000', '#000080', '#808000',
            '#E6194B', '#3CB44B', '#4363D8', '#F58231', '#911EB4', '#F032E6', '#008080', '#9A6324', '#2F4F4F', '#17A2B8', '#FF1493', '#E6B333', '#B34D4D', '#809900', '#6610F2', '#E6331A', '#005C00', '#D23E9A',
            '#FF6B00', '#7000A0', '#C20000', '#0075AC', '#AD1457', '#3B7A57', '#BF360C', '#4A148C', '#004D40', '#880E4F', '#2E7D32', '#D32F2F', '#4527A0', '#EF6C00', '#01579B', '#B71C1C', '#1B5E20', '#E65100', '#C51162', '#006064',
            '#FF6F00', '#3E2723', '#B22222', '#556B2F', '#483D8B', '#FF8C00', '#9932CC', '#2F4F4F', '#9400D3', '#DC143C', '#228B22', '#4169E1', '#8A2BE2', '#D2691E', '#FF7F50', '#B8860B', '#006400', '#4B0082', '#CD5C5C', '#6B8E23',
            '#4682B4', '#A0522D', '#C71585', '#32CD32', '#DB7093', '#CD853F', '#BA55D3', '#7B68EE', '#6A5ACD', '#DAA520', '#20B2AA', '#66CDAA', '#E9967A', '#FF4500', '#F08080', '#DDA0DD', '#FFA07A', '#2E8B57', '#708090', '#6A0DAD', '#C04000', '#BD572A', '#DE3163', '#FD6A02', '#088F8F', '#AA00FF', '#FFBF00', '#B03060', '#5F4B8B', '#00A86B'
        ],
    };

    const AppState = {
        map: null, selectedCity: null, cityLayers: {}, normalizedCityNames: {},
        cityIBGEData: {}, 
        cityPotentialData: {}, 
        favorites: [], groups: {}, vendedores: [], cityAssignments: {},
        activeGroup: null, activeVendedorId: null, lastUpdateTime: null,
        cityInfoMarker: null, cityInfoMarkerTimeout: null, isMouseOverInfoIcon: false,
        currentRouteControl: null,
        destinationMarkerForRoute: null,
        radiusCircleLayer: null, 
        ameripanFixedMarker: null, 
        highlightedUnattendedLayersInRadius: [], 
        unattendedInRadiusMarkers: [], 
    };

    const CONSTANTS = {
        LOCAL_STORAGE_KEYS: { 
            FAVORITES: 'sga_territoriale_fav_v19_potential',
            GROUPS: 'sga_territoriale_grp_v19_potential',
            VENDEDORES: 'sga_territoriale_vnd_v19_potential',
            LAST_UPDATE: 'sga_territoriale_upd_v19_potential',
            CITY_IBGE_DATA: 'sga_territoriale_ibge_data_v19_potential',
            CITY_POTENTIAL_DATA: 'sga_territoriale_potential_data_v19_potential'
        },
       DEFAULT_CITY_STYLE: { fillColor: '#3388ff', fillOpacity: 0.05, color: '#0000FF', weight: 0.5 },
        SELECTED_CITY_STYLE: { fillColor: '#ff7800', fillOpacity: 0.7, color: '#ff7800', weight: 3 },
        SP_BOUNDARY_STYLE: { color: "red", weight: 3, opacity: 0.8, fillOpacity: 0, dashArray: '5, 5', interactive: false },
        HIGHLIGHT_GROUP_STYLE: { fillColor: '#9b59b6', fillOpacity: 0.6, color: '#9b59b6', weight: 3 },
        HIGHLIGHT_VENDEDOR_STYLE: { fillColor: '#e74c3c', fillOpacity: 0.7, color: '#e74c3c', weight: 3 },
        MULTIPLE_VENDEDORES_STYLE: { fillColor: '#f39c12', fillOpacity: 0.6, color: '#f39c12', weight: 2, dashArray: '5, 5' },
        RADIUS_CIRCLE_STYLE: { 
            color: '#FF0000',    
            weight: 5,           
            opacity: 0.9,        
            fillColor: '#FF0000', 
            fillOpacity: 0.2,    
        }, 
        UNATTENDED_CITY_IN_RADIUS_ICON: L.divIcon({
            html: '<i class="fas fa-exclamation-triangle" style="color: #FF0000; font-size: 18px; text-shadow: 0 0 3px #fff;"></i>',
            className: 'unattended-city-div-icon', 
            iconSize: [20, 20],
            iconAnchor: [10, 10] 
        }),
        IBGE_INDICATORS: {
            POPULATION: '96385',           
            DENSITY: '96386',             
            TERRITORIAL_AREA: '29167',     
            URBANIZED_AREA: '95335'        
        }
    };

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
        DOMElements.autocompleteResultsContainer = document.getElementById('autocomplete-results');
        DOMElements.selectedCityInfo = document.getElementById('selected-city-info');
        DOMElements.selectedCityPotentialInfo = document.getElementById('selected-city-potential-info'); 
        DOMElements.cityPotentialDetailsSidebar = document.getElementById('city-potential-details-sidebar'); 

        DOMElements.selectedCityActions = document.getElementById('selected-city-actions');
        DOMElements.addFavoriteButton = document.getElementById('add-favorite');
        DOMElements.assignVendedorButton = document.getElementById('assign-vendedor');
        
        DOMElements.favoritesList = document.getElementById('favorites-list');
        
        DOMElements.groupNameInput = document.getElementById('group-name');
        DOMElements.createGroupButton = document.getElementById('create-group');
        DOMElements.groupSelect = document.getElementById('group-select');
        DOMElements.groupsList = document.getElementById('groups-list');
        
        DOMElements.vendedoresList = document.getElementById('vendedores-list');
        
        DOMElements.radiusInput = document.getElementById('radius-input');
        DOMElements.drawRadiusButton = document.getElementById('draw-radius-button');
        DOMElements.clearRadiusButton = document.getElementById('clear-radius-button');
        DOMElements.radiusAnalysisFeedbackContainer = document.getElementById('radius-analysis-feedback-container'); 
        DOMElements.radiusAnalysisFeedback = document.getElementById('radius-analysis-feedback'); 
        DOMElements.openAboutModalButton = document.getElementById('open-about-modal-button');

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
        DOMElements.modalCityPotentialDetails = document.getElementById('modal-city-potential-details'); 
        DOMElements.cityPotentialDetailsModalContent = document.getElementById('city-potential-details-modal-content'); 
        
        DOMElements.modalAbout = document.getElementById('modal-about'); 

        DOMElements.notificationContainer = document.getElementById('notification-container');
        DOMElements.mapContainer = document.getElementById('map');
    }

    function normalizeString(str) {
        if (!str) return '';
        let s = String(str).toLowerCase();
        s = s.replace(/\b([a-zà-ú]+)['’]([a-zà-ú])/gi, '$1 $2'); 
        s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); 
        s = s.replace(/['’]/g, ''); 
        s = s.replace(/[^a-z0-9\s-]/g, ' '); 
        s = s.replace(/\s+/g, ' ').trim(); 
        return s;
    }

    function toSimpleForm(normalizedName) {
        if (!normalizedName) return '';
        let simple = normalizedName;
        simple = simple.replace(/\s+\b(d|de|do|da|dos|das)\b\s+/g, ' '); 
        simple = simple.replace(/^\b(d|de|do|da|dos|das)\b\s+/g, ''); 
        simple = simple.replace(/\s+\b(d|de|do|da|dos|das)\b$/g, ''); 
        if (/^(d|de|do|da|dos|das)$/.test(simple.trim())) { 
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
            setTimeout(() => el.remove(), 500); 
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
        removeCityInfoMarker(); 
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
    
    function initMap() {
        AppState.map = L.map(DOMElements.mapContainer, {
            dragging: true, touchZoom: true, doubleClickZoom: true,
            scrollWheelZoom: true, boxZoom: true, keyboard: true, tap: true,
        }).setView(AppConfig.mapInitialView, AppConfig.mapInitialZoom);

        const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
            keepBuffer: 2 
        });

        const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18
        });

        openStreetMap.addTo(AppState.map); 

        const baseLayers = {
            "Padrão (Ruas)": openStreetMap,
            "Satélite": esriSatellite
        };

        L.control.layers(baseLayers, null, { position: 'bottomright' }).addTo(AppState.map);

        AppState.map.createPane('boundaryPane'); 
        AppState.map.getPane('boundaryPane').style.zIndex = 650;
        AppState.map.createPane('cityFillPane'); 
        AppState.map.getPane('cityFillPane').style.zIndex = 420; 
        AppState.map.createPane('highlightedCityPane'); 
        AppState.map.getPane('highlightedCityPane').style.zIndex = 425; 
        AppState.map.createPane('routingPane'); 
        AppState.map.getPane('routingPane').style.zIndex = 640;
        AppState.map.createPane('radiusPane'); 
        AppState.map.getPane('radiusPane').style.zIndex = 630; 
        AppState.map.createPane('ameripanMarkerPane'); 
        AppState.map.getPane('ameripanMarkerPane').style.zIndex = 655; 
        AppState.map.createPane('unattendedMarkersPane'); 
        AppState.map.getPane('unattendedMarkersPane').style.zIndex = 656; 
        AppState.map.createPane('cityInfoIconPane'); 
        AppState.map.getPane('cityInfoIconPane').style.zIndex = 660; 

        if (AppConfig.distribuidoraAmeripanCoords) {
            const ameripanIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', 
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
                tooltipAnchor: [16, -28]
            });

            AppState.ameripanFixedMarker = L.marker(AppConfig.distribuidoraAmeripanCoords, {
                icon: ameripanIcon,
                title: "Ameripan Distribuidora - Sede",
                pane: 'ameripanMarkerPane', 
                interactive: true, 
                riseOnHover: true 
            })
            .addTo(AppState.map)
            .bindPopup("<b>Ameripan Distribuidora</b><br>Sede / Ponto de Partida")
            .bindTooltip("Ameripan Distribuidora");
        }
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
                } else if (["Feature", "Polygon", "MultiPolygon", "LineString", "MultiLineString"].includes(data.type)) { 
                    featuresLoaded = [data];
                } else {
                    console.warn(`GeoJSON de ${url} em formato inesperado.`, data);
                    throw new Error(`Formato inesperado para ${url}`);
                }
                console.log(`${dataSet.description} carregado com sucesso de: ${url}. Features: ${featuresLoaded.length}`);
                break; 
            } catch (error) {
                console.warn(`Erro ao carregar ${dataSet.description} de ${url}:`, error.message);
            }
        }

        if (featuresLoaded && featuresLoaded.length > 0) {
            const layerOptions = {
                style: dataSet.styleFunction,
                onEachFeature: dataSet.onFeatureCallback,
                pane: dataSet.paneName || (dataSet.id.startsWith('municipios') ? 'cityFillPane' : undefined) 
            };
            const geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: featuresLoaded }, layerOptions).addTo(AppState.map);
            console.log(`${dataSet.description} adicionado ao mapa.`);
            return geoJsonLayer; 
        }

        showNotification(`Falha ao carregar dados para: ${dataSet.description}`, 'danger', 7000);
        console.error(`Não foi possível carregar ${dataSet.description} de nenhuma fonte.`);
        return null;
    }

    function onEachCityFeature(feature, layer) {
        const cityName = feature.properties.name || feature.properties.NOME_MUN || feature.properties.NM_MUN;
        const cityId = feature.properties.id || feature.properties.CD_MUN || feature.properties.geocodigo || feature.properties.codarea || generateId(); 

        if (!cityName) { console.warn("Feature sem nome:", feature.properties); return; }

        if (!AppState.cityLayers[cityName]) { 
            AppState.cityLayers[cityName] = layer;
        }
        AppState.normalizedCityNames[normalizeString(cityName)] = cityName; 
        layer.options.originalPane = layer.options.pane || 'cityFillPane'; 

        layer.on('click', (e) => handleCityClick(cityName, cityId, layer));
        layer.on('dblclick', (e) => showCityDetailsModal(cityName, cityId)); 
        layer.on('mouseover', function (eL) { 
            if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
            if (document.querySelector('.modal.show')) return; 

            if (!AppState.cityInfoMarker || AppState.cityInfoMarker.options.cityName !== cityName) {
                removeCityInfoMarker();
                const markerLatLng = this.getBounds().getCenter();
                const customIcon = L.divIcon({ className: 'city-info-icon-marker', html: `<i class="fas fa-info-circle"></i>`, iconSize: [30, 30], iconAnchor: [15, 15] });
                AppState.cityInfoMarker = L.marker(markerLatLng, { icon: customIcon, interactive: true, cityName: cityName, bubblingMouseEvents: false, pane: 'cityInfoIconPane' }).addTo(AppState.map);

                AppState.cityInfoMarker.on('mouseover', async function(evIcon) { 
                    AppState.isMouseOverInfoIcon = true;
                    if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
                    const tooltip = this.getTooltip();
                    if (tooltip && typeof this.isTooltipOpen === 'function' && this.isTooltipOpen()) return;

                    const tooltipContent = await generateCityTooltipContent(this.options.cityName);
                    this.bindTooltip(tooltipContent, { permanent: false, direction: 'top', offset: L.point(0, -15), className: 'city-info-tooltip', interactive: true }).openTooltip();
                });
                AppState.cityInfoMarker.on('mouseout', function(evIcon) { 
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
                    showCityDetailsModal(AppState.cityInfoMarker.options.cityName, cityId); 
                });
            }
        });
        layer.on('mouseout', function (eL) { 
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
        if (cityLayer?.feature?.properties) { 
            cityId = cityLayer.feature.properties.CD_MUN || cityLayer.feature.properties.geocodigo || cityLayer.feature.properties.id;
        }

        const ibgeData = await fetchCityDataFromIBGE(cityId, cityName); 
        const potentialData = AppState.cityPotentialData[cityName];

        const population = ibgeData?.population;
        const populationYear = ibgeData?.populationYear;
        const density = ibgeData?.density;
        
        let content = `<h6>${cityName}</h6>`;
        content += `<p><strong>População:</strong> ${population ? population.toLocaleString('pt-BR') + (populationYear ? ` (${populationYear})` : '') : 'N/D'}</p>`;
        if (density) {
            content += `<p><strong>Densidade:</strong> ${density.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hab/km²</p>`;
        }
        if (potentialData && typeof potentialData.valorPotencial === 'number') {
            content += `<p><strong>Potencial Estimado:</strong> R$ ${potentialData.valorPotencial.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>`;
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
            createMarker: (i, waypoint, n) => {
                if (i === 0) {
                    return null; 
                }
                return null; // Marcador de destino será criado no 'routesfound'
            }
        }).on('routesfound', function(e) {
            if (AppState.destinationMarkerForRoute) AppState.map.removeLayer(AppState.destinationMarkerForRoute); 
            const summary = e.routes?.[0]?.summary;
            if (summary) {
                const distKm = (summary.totalDistance / 1000).toFixed(1);
                const timeMinutes = Math.round(summary.totalTime / 60);
                const hours = Math.floor(timeMinutes / 60);
                const minutes = timeMinutes % 60;
                let timeStr = (hours > 0 ? `${hours}h ` : '') + `${minutes}min`;
                const routeInfoText = `Distância: ${distKm} km<br>Tempo Estimado: ${timeStr}`;
                if (routeDetailsEl) routeDetailsEl.innerHTML = `<p><strong>Distância de Americana:</strong> ${distKm} km</p><p><strong>Tempo estimado de viagem:</strong> ${timeStr}</p>`;
                
                if (e.routes[0].inputWaypoints[1] && e.routes[0].inputWaypoints[1].latLng) {
                    const destLatLng = e.routes[0].inputWaypoints[1].latLng;
                     AppState.destinationMarkerForRoute = L.marker(destLatLng, { 
                        icon: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]}), 
                        title: destinationCityName 
                    }).addTo(AppState.map)
                      .bindTooltip(`<b>${destinationCityName}</b><br>${routeInfoText}`)
                      .bindPopup(`<b>Destino: ${destinationCityName}</b><br>${routeInfoText}`);
                }

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
        clearUnattendedHighlightsAndMarkers(); 
        resetMapStyles(); 
        setLayerStyle(layer, CONSTANTS.SELECTED_CITY_STYLE);
        if (layer.bringToFront && typeof layer.bringToFront === 'function') { 
            try { layer.bringToFront(); } catch(e) { console.warn("Erro ao usar bringToFront():", e); }
        }
        
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

    function setLayerStyle(layer, style) { 
        if (layer?.setStyle) {
            layer.setStyle(style);
            if (!AppState.highlightedUnattendedLayersInRadius.includes(layer) && 
                layer.options.pane !== layer.options.originalPane &&
                AppState.map.hasLayer(layer) && 
                layer.options.originalPane && 
                AppState.map.getPane(layer.options.originalPane) &&
                layer.getElement()) {
                    
                AppState.map.getPane(layer.options.originalPane).appendChild(layer.getElement());
                layer.options.pane = layer.options.originalPane; 
            }
        }
    }

    function getCityStyle(feature) {
        const cityName = feature.properties.name || feature.properties.NOME_MUN || feature.properties.NM_MUN;
        
        if (AppState.selectedCity?.name === cityName) {
            return { ...CONSTANTS.SELECTED_CITY_STYLE };
        }
        if (AppState.activeVendedorId && AppState.cityAssignments[cityName]?.includes(AppState.activeVendedorId)) {
            return { ...CONSTANTS.HIGHLIGHT_VENDEDOR_STYLE };
        }
        if (AppState.activeGroup && AppState.groups[AppState.activeGroup]?.includes(cityName)) {
            return { ...CONSTANTS.HIGHLIGHT_GROUP_STYLE };
        }
        if (AppState.cityAssignments[cityName]?.length) {
            if (AppState.cityAssignments[cityName].length === 1) {
                const vend = AppState.vendedores.find(v => v.id === AppState.cityAssignments[cityName][0]);
                if (vend?.color) { 
                    return { fillColor: vend.color, color: vend.color, fillOpacity: 0.5, weight: 2 };
                }
            } else {
                return { ...CONSTANTS.MULTIPLE_VENDEDORES_STYLE };
            }
        }
        if (AppState.favorites.some(fav => fav.name === cityName)) {
            return { fillColor: '#3388ff', fillOpacity: 0.05, weight: 1, color: '#a0a0a0' };
        }
        
        return { ...CONSTANTS.DEFAULT_CITY_STYLE }; 
    }
    
    function resetMapStyles() {    
        Object.values(AppState.cityLayers).forEach(layer => { 
            if (layer.feature) {
                const isHighlightedUnattended = AppState.highlightedUnattendedLayersInRadius.includes(layer);
                
                const layerElement = layer.getElement();
                if (layerElement) { 
                    L.DomUtil.removeClass(layerElement, 'city-highlight-unattended-in-radius');
                }

                if (!isHighlightedUnattended) {
                    if (layer.options.pane !== layer.options.originalPane && 
                        AppState.map.getPane(layer.options.originalPane) && 
                        layerElement &&
                        AppState.map.hasLayer(layer)) { 
                            
                        AppState.map.getPane(layer.options.originalPane).appendChild(layerElement);
                        layer.options.pane = layer.options.originalPane;
                    }
                    setLayerStyle(layer, getCityStyle(layer.feature));
                }
            } 
        });
    
        AppState.map.eachLayer(layer => { 
            if (layer.options?.id === 'limiteSPGeoJSON') {
                setLayerStyle(layer, CONSTANTS.SP_BOUNDARY_STYLE); 
            }
        });
    }
    
    function highlightVendedorCitiesOnMap(vendedorId) {
        AppState.activeVendedorId = vendedorId; AppState.activeGroup = null; 
        if(DOMElements.groupSelect) DOMElements.groupSelect.value = ''; 
        clearUnattendedHighlightsAndMarkers(); 
        resetMapStyles(); 
        
        Object.values(AppState.cityLayers).forEach(layer => {
            if (layer.feature && AppState.cityAssignments[layer.feature.properties.name || layer.feature.properties.NOME_MUN || layer.feature.properties.NM_MUN]?.includes(vendedorId)) {
                setLayerStyle(layer, CONSTANTS.HIGHLIGHT_VENDEDOR_STYLE);
                if (layer.bringToFront && typeof layer.bringToFront === 'function') {
                    try {layer.bringToFront();} catch(e){}
                }
            }
        });
        const vendedor = AppState.vendedores.find(v => v.id === vendedorId);
        if (vendedor?.cidades.length) { const layers = vendedor.cidades.map(name => AppState.cityLayers[name]).filter(Boolean); if (layers.length) AppState.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [50, 50] }); }
        showNotification(`Cidades do vendedor ${vendedor?.nome || ''} destacadas.`, 'info');
    }

    function highlightGroupOnMap(groupName) {
        AppState.activeGroup = groupName; AppState.activeVendedorId = null; 
        clearUnattendedHighlightsAndMarkers();
        resetMapStyles(); 
        if (groupName && AppState.groups[groupName]?.length) {
            const groupLayers = [];
            AppState.groups[groupName].forEach(cityName => {
                const layer = AppState.cityLayers[cityName];
                if (layer) {
                    setLayerStyle(layer, CONSTANTS.HIGHLIGHT_GROUP_STYLE);
                     if (layer.bringToFront && typeof layer.bringToFront === 'function') {
                        try {layer.bringToFront();} catch(e){}
                    }
                    groupLayers.push(layer);
                }
            });
            if (groupLayers.length) AppState.map.fitBounds(L.featureGroup(groupLayers).getBounds(), { padding: [50, 50] });
        }
        showNotification(`Grupo ${groupName || 'Nenhum'} destacado.`, 'info');
    }

    async function loadDataFromSheets() {
        if (AppConfig.apiKey === "SUA_API_KEY_RESTRITA_AQUI" || !AppConfig.apiKey) { 
            showNotification("API Key do Google Sheets não configurada. Funcionalidades da planilha desabilitadas.", "danger", 10000); 
            return; 
        }
        showLoading(true, "Carregando dados da planilha..."); 
        showSyncStatus(true);
        
        let mainDataLoaded = false;

        try {
            const mainPromise = fetch(`https://sheets.googleapis.com/v4/spreadsheets/${AppConfig.spreadsheetId}/values/${AppConfig.range}?key=${AppConfig.apiKey}`)
                .then(response => {
                    if (!response.ok) throw new Error(`Erro ${response.status} na API do Sheets (aba principal: ${AppConfig.range.split('!')[0]}).`);
                    return response.json();
                })
                .then(data => {
                    processSheetsData(data);
                    mainDataLoaded = true;
                });

            const potentialPromise = AppConfig.potentialSheetRange ? 
                fetch(`https://sheets.googleapis.com/v4/spreadsheets/${AppConfig.spreadsheetId}/values/${AppConfig.potentialSheetRange}?key=${AppConfig.apiKey}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`Erro ${response.status} na API do Sheets (aba: ${AppConfig.potentialSheetRange.split('!')[0]}).`);
                        return response.json();
                    })
                    .then(data => {
                        processPotentialData(data);
                    })
                    .catch(potentialError => {
                        console.error("Erro ao obter dados de potencial da planilha:", potentialError);
                        showNotification(`Erro ao carregar dados de ${AppConfig.potentialSheetRange.split('!')[0]}: ${potentialError.message}. Verifique se a aba existe e está formatada.`, "warning", 10000);
                        AppState.cityPotentialData = {};
                    }) : Promise.resolve(); 

            await Promise.all([mainPromise, potentialPromise]);

            AppState.lastUpdateTime = new Date(); 
            if(DOMElements.lastUpdateSpan) DOMElements.lastUpdateSpan.textContent = formatDateTime(AppState.lastUpdateTime);
            
            saveDataToLocalStorage(); 
            updateUIAfterDataLoad(); 
            if (mainDataLoaded) { 
                 showNotification("Dados carregados com sucesso da planilha!", "success");
            }

        } catch (error) { 
            console.error("Erro geral ao obter dados da planilha:", error); 
            showNotification(`Erro ao carregar dados da planilha: ${error.message}`, "danger", 10000); 
            updateUIAfterDataLoad(); 
        }
        finally { 
            showLoading(false); 
            showSyncStatus(false); 
        }
    }

    function processSheetsData(data) { 
        const newVendedores = []; const newCityAssignments = {}; let cidadesNaoEncontradas = [];
        if (!data.values || data.values.length < 2) {
            showNotification(`Formato da planilha principal ('${AppConfig.range.split('!')[0]}') incorreto ou vazia. Poucas linhas.`, "warning", 10000); AppState.vendedores = []; AppState.cityAssignments = {}; return; 
        }
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
                    let cidadeRealNoMapaKey = Object.keys(AppState.normalizedCityNames).find(key => key === normPlanilhaOriginal || AppState.normalizedCityNames[key].toLowerCase() === cidadeNomePlanilha.toLowerCase());
                    let cidadeRealNoMapa = cidadeRealNoMapaKey ? AppState.normalizedCityNames[cidadeRealNoMapaKey] : null;

                    if (!cidadeRealNoMapa && normPlanilhaOriginal) { 
                        const simplePlanilha = toSimpleForm(normPlanilhaOriginal);
                        for (const [normMapKey, originalMapNameValue] of Object.entries(AppState.normalizedCityNames)) {
                            if (toSimpleForm(normMapKey) === simplePlanilha) { 
                                cidadeRealNoMapa = originalMapNameValue; 
                                break; 
                            }
                        }
                    }
                    if (!cidadeRealNoMapa && normPlanilhaOriginal && normPlanilhaOriginal.length > 3) {
                         for (const [normMapKey, originalMapNameValue] of Object.entries(AppState.normalizedCityNames)) { 
                             const simpleMap = toSimpleForm(normMapKey);
                             const simplePlanilha = toSimpleForm(normPlanilhaOriginal);
                             if (simpleMap.includes(simplePlanilha) && (simplePlanilha.length / simpleMap.length > 0.75)) { cidadeRealNoMapa = originalMapNameValue; break; } 
                             else if (simplePlanilha.includes(simpleMap) && (simpleMap.length / simplePlanilha.length > 0.75)) { cidadeRealNoMapa = originalMapNameValue; break; } 
                         } 
                    }

                    if (cidadeRealNoMapa) { 
                        vendedor.cidades.push(cidadeRealNoMapa); 
                        if (!newCityAssignments[cidadeRealNoMapa]) newCityAssignments[cidadeRealNoMapa] = []; 
                        if (!newCityAssignments[cidadeRealNoMapa].includes(vendedorId)) newCityAssignments[cidadeRealNoMapa].push(vendedorId);
                    } else if (!cidadesNaoEncontradas.includes(cidadeNomePlanilha)) { 
                        cidadesNaoEncontradas.push(cidadeNomePlanilha); 
                        console.warn(`Cidade da planilha "${cidadeNomePlanilha}" (Vendedor: ${vendedorNome}) não encontrada no mapa.`); 
                    }
                }
            }
            newVendedores.push(vendedor);
        }
        AppState.vendedores = newVendedores; AppState.cityAssignments = newCityAssignments;
        if (cidadesNaoEncontradas.length) showNotification(`Cidades da planilha principal não encontradas no mapa: ${cidadesNaoEncontradas.slice(0,3).join(', ')}${cidadesNaoEncontradas.length > 3 ? ' e mais...' : ''}. Verifique a aba "Sincronizar" para a grafia correta.`, "warning", 15000);
    }

    function processPotentialData(data) {
        AppState.cityPotentialData = {}; 
        if (!data.values || data.values.length < 2) { 
            console.info("Aba 'potencial' não possui dados suficientes ou está vazia.");
            if (data.values && data.values.length === 1 && data.values[0].every(cell => cell.trim() === '')) {
                 console.info("Aba 'potencial' parece conter apenas cabeçalhos ou estar completamente vazia.");
            } else if (data.values) { 
                 showNotification("Dados da aba 'potencial' em formato incorreto (poucas linhas).", "info", 7000);
            }
            return;
        }
        const values = data.values;
        let cidadesNaoMapeadasPotencial = [];
        for (let i = 1; i < values.length; i++) {
            const row = values[i];
            const cityNameRaw = row[0]?.trim(); 
            if (!cityNameRaw) continue; 

            const normalizedCityNameSheet = normalizeString(cityNameRaw);
            let actualMapCityName = AppState.normalizedCityNames[normalizedCityNameSheet] || 
                                  Object.keys(AppState.normalizedCityNames).find(key => AppState.normalizedCityNames[key].toLowerCase() === cityNameRaw.toLowerCase());
            
            if (actualMapCityName && AppState.cityLayers[actualMapCityName]) { 
                AppState.cityPotentialData[actualMapCityName] = {
                    nomeOriginalPlanilha: cityNameRaw,
                    sorveterias: parseInt(row[1]?.trim()) || 0,       
                    padarias: parseInt(row[2]?.trim()) || 0,          
                    supermercados: parseInt(row[3]?.trim()) || 0,     
                    somaEstabelecimentos: parseInt(row[4]?.trim()) || 0, 
                    valorPotencial: parseFloat(String(row[5]?.trim()).replace(/\./g, '').replace(',', '.')) || 0 
                };
            } else {
                if (!cidadesNaoMapeadasPotencial.includes(cityNameRaw)) {
                     cidadesNaoMapeadasPotencial.push(cityNameRaw);
                }
                console.warn(`Cidade "${cityNameRaw}" da aba "potencial" não encontrada no mapa ou sem camada correspondente. Dados ignorados.`);
            }
        }
        if (cidadesNaoMapeadasPotencial.length > 0) {
            showNotification(`Cidades da aba "potencial" não encontradas no mapa: ${cidadesNaoMapeadasPotencial.slice(0,3).join(', ')}${cidadesNaoMapeadasPotencial.length > 3 ? ' e mais...' : ''}. Verifique a grafia.`, "warning", 10000);
        }
        console.log("Dados de potencial processados:", Object.keys(AppState.cityPotentialData).length, "cidades com potencial.");
    }
    
    function loadSavedData() {
        showLoading(true, "Carregando dados salvos...");
        try {
            AppState.favorites = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES)) || [];
            AppState.groups = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS)) || {};
            AppState.vendedores = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES)) || [];
            AppState.cityIBGEData = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.CITY_IBGE_DATA)) || {};
            AppState.cityPotentialData = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.CITY_POTENTIAL_DATA)) || {}; 

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
            AppState.favorites = []; AppState.groups = {}; AppState.vendedores = []; AppState.cityAssignments = {}; AppState.cityIBGEData = {}; AppState.cityPotentialData = {}; AppState.lastUpdateTime = null;
        }
    }

    function saveDataToLocalStorage() {
        try {
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES, JSON.stringify(AppState.favorites));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS, JSON.stringify(AppState.groups));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES, JSON.stringify(AppState.vendedores));
            if (AppState.lastUpdateTime) localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.LAST_UPDATE, AppState.lastUpdateTime.toISOString());
            if (Object.keys(AppState.cityIBGEData).length) localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.CITY_IBGE_DATA, JSON.stringify(AppState.cityIBGEData));
            if (Object.keys(AppState.cityPotentialData).length) localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.CITY_POTENTIAL_DATA, JSON.stringify(AppState.cityPotentialData)); 
        } catch (e) { console.error('Erro ao salvar dados no localStorage:', e); showNotification('Erro ao salvar dados localmente.', 'danger');}
    }

    async function fetchCityDataFromIBGE(cityId, cityName) {
        const normalizedCityKey = normalizeString(cityName) || cityId; 
        const originalCityNameForCache = AppState.normalizedCityNames[normalizedCityKey] || cityName; 
    
        if (AppState.cityIBGEData[originalCityNameForCache]?.timestamp && (Date.now() - AppState.cityIBGEData[originalCityNameForCache].timestamp < 24 * 60 * 60 * 1000 * 7)) { 
            console.log("Dados do IBGE para", originalCityNameForCache, "encontrados no cache.");
            return AppState.cityIBGEData[originalCityNameForCache];
        }
        console.log("Buscando dados do IBGE da API para:", originalCityNameForCache);

        if (!cityId || String(cityId).length < 7) {
            console.warn(`Código IBGE inválido para ${originalCityNameForCache}: ${cityId}.`);
            const cachedErrorData = AppState.cityIBGEData[originalCityNameForCache] || {};
            return { ...cachedErrorData, urbanizedArea: null, error: "Código IBGE inválido fornecido." }; 
        }

        const indicatorsQuery = Object.values(CONSTANTS.IBGE_INDICATORS).join('%7C');
        const apiUrl = `https://servicodados.ibge.gov.br/api/v1/pesquisas/indicadores/${indicatorsQuery}/resultados/${cityId}`;
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Falha API IBGE ${response.status} para ${originalCityNameForCache}`);
            const data = await response.json();
            
            const cityData = {
                population: null, populationYear: null, density: null,
                territorialArea: null, urbanizedArea: null, 
                timestamp: Date.now(), error: null
            };

            data.forEach(indicatorData => {
                if (indicatorData.res?.length > 0) {
                    const resultSeries = indicatorData.res[0].res;
                    const latestYear = Object.keys(resultSeries).sort().pop();
                    if (latestYear && resultSeries[latestYear] !== null && resultSeries[latestYear] !== "-") { 
                        const rawValue = resultSeries[latestYear];
                        if (indicatorData.id == CONSTANTS.IBGE_INDICATORS.POPULATION) {
                            cityData.population = parseInt(rawValue, 10);
                            cityData.populationYear = latestYear;
                        } else if (indicatorData.id == CONSTANTS.IBGE_INDICATORS.DENSITY) {
                            cityData.density = parseFloat(rawValue);
                        } else if (indicatorData.id == CONSTANTS.IBGE_INDICATORS.TERRITORIAL_AREA) {
                            cityData.territorialArea = parseFloat(rawValue);
                        } else if (indicatorData.id == CONSTANTS.IBGE_INDICATORS.URBANIZED_AREA) { 
                            cityData.urbanizedArea = parseFloat(rawValue);
                        }
                    }
                }
            });
            AppState.cityIBGEData[originalCityNameForCache] = cityData; 
            saveDataToLocalStorage();
            return cityData;
        } catch (error) {
            console.error(`Erro IBGE ${originalCityNameForCache} (${cityId}):`, error);
            const cachedErrorData = AppState.cityIBGEData[originalCityNameForCache] || {};
            if (!cachedErrorData.timestamp) {
                 AppState.cityIBGEData[originalCityNameForCache] = { ...cachedErrorData, urbanizedArea: null, error: error.message, timestamp: Date.now() }; 
                 saveDataToLocalStorage();
            }
            return { ...cachedErrorData, urbanizedArea: null, error: error.message }; 
        }
    }

    async function updateSelectedCityInfo() {
        DOMElements.selectedCityPotentialInfo.classList.add('hidden'); 
        DOMElements.cityPotentialDetailsSidebar.innerHTML = '<p class="empty-message">Carregando dados de potencial...</p>';

        if (!AppState.selectedCity) {
            DOMElements.selectedCityInfo.innerHTML = '<p class="empty-message">Nenhuma cidade selecionada.</p>'; 
            DOMElements.selectedCityActions.classList.add('hidden');
            if(document.getElementById('route-details')) document.getElementById('route-details').innerHTML = '<p class="empty-message">Clique em uma cidade para ver a rota.</p>';
            return;
        }
        const { name: cityName, id: cityIdOriginal } = AppState.selectedCity;
        let ibgeCityCode = cityIdOriginal; 
        const cityLayer = AppState.cityLayers[cityName];
        if (cityLayer?.feature?.properties) { 
             ibgeCityCode = cityLayer.feature.properties.CD_MUN || cityLayer.feature.properties.geocodigo || cityLayer.feature.properties.id || cityIdOriginal;
        }

        const ibgeData = await fetchCityDataFromIBGE(ibgeCityCode, cityName);
        const potentialData = AppState.cityPotentialData[cityName]; 

        const pop = ibgeData?.population;
        const popYear = ibgeData?.populationYear;
        const dens = ibgeData?.density;
        const area = ibgeData?.territorialArea;
        const urbanArea = ibgeData?.urbanizedArea; 

        let dataHTML = `<h4>${cityName}</h4>`; 
        dataHTML += `<p><strong>População:</strong> ${pop ? pop.toLocaleString('pt-BR') + (popYear ? ` (${popYear})` : '') + ' hab.' : 'N/D'}</p>`;
        if (dens) dataHTML += `<p><strong>Densidade:</strong> ${dens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hab/km²</p>`;
        if (area) dataHTML += `<p><strong>Área Territorial:</strong> ${area.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km²</p>`;
        if (urbanArea) dataHTML += `<p><strong>Área Urbanizada:</strong> ${urbanArea.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km²</p>`; 
        if (ibgeData?.error && !pop) dataHTML += `<p><small style="color:red;">Erro ao buscar dados do IBGE: ${ibgeData.error}</small></p>`;

        let vendHTML = '';
        const assignedVendIds = AppState.cityAssignments[cityName];
        if (assignedVendIds?.length) {
            vendHTML = '<p class="mt-10"><strong>Vendedores:</strong></p><ul class="vendedores-list" style="padding-left:0;list-style:none;">';
            assignedVendIds.forEach(vId => {
                const v = AppState.vendedores.find(vend => vend.id === vId);
                if (v) vendHTML += `<li style="display:flex;align-items:center;margin-bottom:3px;"><div class="vendedor-color-indicator" style="background-color:${v.color};"></div>${v.nome}(Sup:${v.supervisor})</li>`;
            });
            vendHTML += '</ul>';
        } else vendHTML = '<p class="mt-10"><em>Nenhum vendedor atribuído.</em></p>';
        dataHTML += vendHTML;

        const ibgeLink = `https://cidades.ibge.gov.br/panorama-impresso?cod=${ibgeCityCode}`;
        dataHTML += `<p class="mt-10"><small>Cód.IBGE: ${ibgeCityCode||'N/A'}. (Duplo clique para mais detalhes)</small></p>`;
        dataHTML += `<div class="btn-group mt-10"><a href="${ibgeCityCode?.length >= 7 ? ibgeLink : '#'}" target="_blank" class="btn btn-info btn-sm ${!(ibgeCityCode?.length >= 7) ? 'disabled':''}" title="Panorama IBGE"><i class="fas fa-chart-bar"></i> IBGE</a></div>`;
        dataHTML += `<div id="route-details" class="mt-15 bt-eee pt-15"><p class="empty-message">Calculando rota...</p></div>`;
        
        DOMElements.selectedCityInfo.innerHTML = dataHTML; 

        if (potentialData) {
            let potentialHTML = `<p><strong><i class="fas fa-ice-cream"></i> Sorveterias:</strong> ${potentialData.sorveterias.toLocaleString('pt-BR')}</p>`;
            potentialHTML += `<p><strong><i class="fas fa-birthday-cake"></i> Padarias/Conf.:</strong> ${potentialData.padarias.toLocaleString('pt-BR')}</p>`;
            potentialHTML += `<p><strong><i class="fas fa-shopping-cart"></i> Supermercados:</strong> ${potentialData.supermercados.toLocaleString('pt-BR')}</p>`;
            potentialHTML += `<p><strong><i class="fas fa-calculator"></i> Soma Estab.:</strong> ${potentialData.somaEstabelecimentos.toLocaleString('pt-BR')}</p>`;
            potentialHTML += `<p><strong><i class="fas fa-dollar-sign"></i> Valor Potencial:</strong> R$ ${potentialData.valorPotencial.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>`;
            DOMElements.cityPotentialDetailsSidebar.innerHTML = potentialHTML;
            DOMElements.selectedCityPotentialInfo.classList.remove('hidden');
        } else {
            DOMElements.cityPotentialDetailsSidebar.innerHTML = '<p class="empty-message">Dados de potencial não disponíveis.</p>';
            DOMElements.selectedCityPotentialInfo.classList.remove('hidden'); 
        }

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

    function updateUIAfterDataLoad() { 
        updateFavoritesList(); 
        updateGroupsLists(); 
        updateVendedoresList(); 
        resetMapStyles(); 
        if (AppState.selectedCity) {
            updateSelectedCityInfo();
        }
    }

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
        DOMElements.cityDetailsModalBody.innerHTML = '<p class="empty-message">Carregando dados...</p>'; 
        DOMElements.modalCityPotentialDetails.classList.add('hidden'); 
        DOMElements.cityPotentialDetailsModalContent.innerHTML = '<p class="empty-message">Carregando dados de potencial...</p>';
        openModal(DOMElements.modalCityDetails); 
        removeCityInfoMarker();
        
        let ibgeCityCode = cityIdOriginal;
        const cityLayer = AppState.cityLayers[cityName];
        if (cityLayer?.feature?.properties) ibgeCityCode = cityLayer.feature.properties.CD_MUN || cityLayer.feature.properties.geocodigo || cityLayer.feature.properties.id || cityIdOriginal;

        const ibgeData = await fetchCityDataFromIBGE(ibgeCityCode, cityName);
        const potentialData = AppState.cityPotentialData[cityName];

        let detailsHTML = `<div class="city-general-info"><h4>${cityName}</h4>`;
        if (ibgeData) {
            const pop = ibgeData.population; const popY = ibgeData.populationYear; const dens = ibgeData.density; const area = ibgeData.territorialArea; const urbanArea = ibgeData.urbanizedArea;
            detailsHTML += `<p><strong>População Estimada:</strong> ${pop ? pop.toLocaleString('pt-BR') + (popY ? ` (${popY})` : '') + ' habitantes' : 'N/D'}</p>`;
            detailsHTML += `<p><strong>Densidade Demográfica:</strong> ${dens ? dens.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' hab/km²' : 'N/D'}</p>`;
            detailsHTML += `<p><strong>Área da Unidade Territorial:</strong> ${area ? area.toLocaleString('pt-BR', {minimumFractionDigits:3, maximumFractionDigits:3}) + ' km²' : 'N/D'}</p>`;
            detailsHTML += `<p><strong>Área Urbanizada:</strong> ${urbanArea ? urbanArea.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' km²' : 'N/D'}</p>`;
            if (ibgeData.error && !pop) detailsHTML += `<p style="color:red;"><small>Erro ao buscar dados do IBGE: ${ibgeData.error}</small></p>`;
            const ibgePanoramaLink = `https://cidades.ibge.gov.br/brasil/${String(ibgeCityCode).substring(0,2)}/${normalizeString(cityName).replace(/\s+/g, '-')}/panorama`;
            const ibgePanoramaImpressoLink = `https://cidades.ibge.gov.br/panorama-impresso?cod=${ibgeCityCode}`;
            detailsHTML += `<p class="mt-10"><a href="${ibgeCityCode && String(ibgeCityCode).length >= 7 ? ibgePanoramaLink : '#'}" target="_blank" class="btn btn-info btn-sm ${!(ibgeCityCode && String(ibgeCityCode).length >= 7) ? 'disabled' : ''}"><i class="fas fa-external-link-alt"></i> Panorama IBGE</a> <a href="${ibgeCityCode && String(ibgeCityCode).length >= 7 ? ibgePanoramaImpressoLink : '#'}" target="_blank" class="btn btn-secondary btn-sm ml-10 ${!(ibgeCityCode && String(ibgeCityCode).length >= 7) ? 'disabled' : ''}"><i class="fas fa-print"></i> Panorama Impresso</a></p>`;
        } else detailsHTML += '<p><em>Dados do IBGE não puderam ser carregados.</em></p>';
        detailsHTML += '</div>'; 

        const assignedVendedorIds = AppState.cityAssignments[cityName]; let totalCadastrosCidade = 0, totalPositivadosCidade = 0;
        if (assignedVendedorIds?.length > 0) {
            detailsHTML += '<h5 class="mt-15">Vendedores Atuantes:</h5>';
            assignedVendedorIds.forEach(vId => { const vendedor = AppState.vendedores.find(v => v.id === vId); if (vendedor) { totalCadastrosCidade += (vendedor.totalCadastros||0); totalPositivadosCidade += (vendedor.totalPositivados||0); detailsHTML += `<div class="vendedor-details-card"><h5><div class="vendedor-color-indicator" style="background-color:${vendedor.color};"></div> ${vendedor.nome}</h5><p><strong>Supervisor:</strong>${vendedor.supervisor||'N/A'}</p><p><strong>Código Vendedor:</strong>${vendedor.codigoVendedor||'N/A'}</p><p><strong>Cadastros (Indiv.):</strong>${(vendedor.totalCadastros||0).toLocaleString('pt-BR')}</p><p><strong>Positivados (Indiv.):</strong>${(vendedor.totalPositivados||0).toLocaleString('pt-BR')}</p></div>`; } });
            if (assignedVendedorIds.length > 0) { const faltouPositivar = totalCadastrosCidade - totalPositivadosCidade; detailsHTML += `<div class="city-summary-card"><h5>Sumário da Cidade (${cityName})</h5><p><strong>Total de Cadastros (Soma Vendedores):</strong> ${totalCadastrosCidade.toLocaleString('pt-BR')}</p><p><strong>Total de Positivados (Soma Vendedores):</strong> ${totalPositivadosCidade.toLocaleString('pt-BR')}</p><p><strong>Clientes Não Positivados (Base Vendedores):</strong> ${faltouPositivar.toLocaleString('pt-BR')}</p></div>`; }
        } else detailsHTML += '<p class="mt-15"><em>Nenhum vendedor atribuído a esta cidade.</em></p>';
        
        DOMElements.cityDetailsModalBody.innerHTML = detailsHTML; 
        
        if (potentialData) {
            let potentialModalHTML = `<p><strong><i class="fas fa-ice-cream"></i> Sorveterias:</strong> ${potentialData.sorveterias.toLocaleString('pt-BR')}</p>`;
            potentialModalHTML += `<p><strong><i class="fas fa-birthday-cake"></i> Padarias/Confeitarias:</strong> ${potentialData.padarias.toLocaleString('pt-BR')}</p>`;
            potentialModalHTML += `<p><strong><i class="fas fa-shopping-cart"></i> Supermercados:</strong> ${potentialData.supermercados.toLocaleString('pt-BR')}</p>`;
            potentialModalHTML += `<p><strong><i class="fas fa-calculator"></i> Soma Estabelecimentos:</strong> ${potentialData.somaEstabelecimentos.toLocaleString('pt-BR')}</p>`;
            potentialModalHTML += `<p><strong><i class="fas fa-dollar-sign"></i> Valor Potencial Estimado:</strong> R$ ${potentialData.valorPotencial.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>`;
            DOMElements.cityPotentialDetailsModalContent.innerHTML = potentialModalHTML;
            DOMElements.modalCityPotentialDetails.classList.remove('hidden');
        } else {
            DOMElements.cityPotentialDetailsModalContent.innerHTML = '<p class="empty-message">Dados de potencial não disponíveis para esta cidade.</p>';
            DOMElements.modalCityPotentialDetails.classList.remove('hidden');
        }
    }

    async function drawRadiusCircle() { 
        const radiusKm = parseFloat(DOMElements.radiusInput.value);
        if (isNaN(radiusKm) || radiusKm <= 0) {
            showNotification('Por favor, insira um valor de raio válido em KM.', 'warning');
            return;
        }
    
        clearRadiusCircle(); 
    
        const radiusMeters = radiusKm * 1000;
        AppState.radiusCircleLayer = L.circle(AppConfig.distribuidoraAmeripanCoords, {
            radius: radiusMeters,
            ...CONSTANTS.RADIUS_CIRCLE_STYLE, 
            pane: 'radiusPane' 
        }).addTo(AppState.map);
    
        AppState.radiusCircleLayer.bindPopup(`Raio de ${radiusKm} km a partir da Ameripan.`);
        
        if (AppState.radiusCircleLayer) {
            AppState.map.fitBounds(AppState.radiusCircleLayer.getBounds(), { padding: [30, 30] });
        }
        
        DOMElements.clearRadiusButton.classList.remove('hidden');
        DOMElements.radiusAnalysisFeedbackContainer.classList.remove('hidden');
        DOMElements.radiusAnalysisFeedback.innerHTML = `<p><i>Analisando cidades no raio de ${radiusKm} km...</i></p>`;
    
        const unattendedCitiesDetails = [];
        const promises = [];
    
        Object.entries(AppState.cityLayers).forEach(([cityName, layer]) => {
            if (layer.getBounds && AppState.radiusCircleLayer && layer.feature) { 
                const cityCenter = layer.getBounds().getCenter();
                const distanceToCenter = AppState.radiusCircleLayer.getLatLng().distanceTo(cityCenter);
    
                if (distanceToCenter <= AppState.radiusCircleLayer.getRadius()) {
                    const isUnattended = !AppState.cityAssignments[cityName] || AppState.cityAssignments[cityName].length === 0;
                    if (isUnattended) {
                        AppState.highlightedUnattendedLayersInRadius.push(layer);
                        
                        const layerElement = layer.getElement();
                        if (layerElement && AppState.map.getPane('highlightedCityPane')) {
                             AppState.map.getPane('highlightedCityPane').appendChild(layerElement);
                             layer.options.pane = 'highlightedCityPane'; 
                             L.DomUtil.addClass(layerElement, 'city-highlight-unattended-in-radius');
                        } else { 
                             layer.setStyle({ fillColor: '#FF0000', fillOpacity: 0.5, color: '#FF0000', weight: 2}); 
                        }
                        if (typeof layer.bringToFront === 'function') layer.bringToFront();

                        const marker = L.marker(cityCenter, { 
                            icon: CONSTANTS.UNATTENDED_CITY_IN_RADIUS_ICON,
                            pane: 'unattendedMarkersPane' 
                        }).addTo(AppState.map);
                        
                        const cityIdFromFeature = layer.feature.properties.CD_MUN || layer.feature.properties.geocodigo || layer.feature.properties.id;
                        promises.push(
                            fetchCityDataFromIBGE(cityIdFromFeature, cityName).then(ibgeData => {
                                marker.bindTooltip(`${cityName}<br>Pop: ${ibgeData.population ? ibgeData.population.toLocaleString('pt-BR') : 'N/D'}<br>(Não Atendida)`);
                                unattendedCitiesDetails.push({ name: cityName, population: ibgeData.population || 0, layer: layer });
                            }).catch(err => { 
                                console.error(`Erro ao buscar IBGE para ${cityName} no raio:`, err);
                                marker.bindTooltip(`${cityName}<br>Pop: N/D<br>(Não Atendida)`);
                                unattendedCitiesDetails.push({ name: cityName, population: 'N/D', layer: layer });
                            })
                        );
                        AppState.unattendedInRadiusMarkers.push(marker);
                    }
                }
            }
        });
        
        await Promise.all(promises); 

        unattendedCitiesDetails.sort((a, b) => {
            const popA = (a.population === 'N/D' || isNaN(a.population)) ? -1 : a.population;
            const popB = (b.population === 'N/D' || isNaN(b.population)) ? -1 : b.population;
            return popB - popA; 
        });

        if (unattendedCitiesDetails.length > 0) {
            let feedbackHTML = `<h6><i class="fas fa-map-pin"></i> Cidades Não Atendidas no Raio (${unattendedCitiesDetails.length}):</h6><ul class="list-group">`;
            unattendedCitiesDetails.forEach(cityDetail => {
                const popDisplay = (cityDetail.population === 'N/D' || isNaN(cityDetail.population)) ? 'N/D' : cityDetail.population.toLocaleString('pt-BR');
                feedbackHTML += `<li class="list-item radius-city-item" data-cityname="${cityDetail.name}">${cityDetail.name} (Pop: ${popDisplay})</li>`;
            });
            feedbackHTML += `</ul>`;
            DOMElements.radiusAnalysisFeedback.innerHTML = feedbackHTML;

            document.querySelectorAll('.radius-city-item').forEach(item => {
                item.addEventListener('click', function() {
                    const cityName = this.dataset.cityname;
                    const cityDetail = unattendedCitiesDetails.find(cd => cd.name === cityName);
                    if (cityDetail && cityDetail.layer) {
                        AppState.map.fitBounds(cityDetail.layer.getBounds(), {maxZoom: 12, paddingTopLeft: [DOMElements.sidebar.offsetWidth + 20, 20] });
                        // cityDetail.layer.fire('click'); // Opcional: disparar clique para ver detalhes completos
                    }
                });
            });

        } else {
            DOMElements.radiusAnalysisFeedback.innerHTML = `<p class="empty-message">Nenhuma cidade não atendida encontrada no raio de ${radiusKm} km.</p>`;
        }
        showNotification(`${unattendedCitiesDetails.length} cidade(s) não atendida(s) destacada(s) no raio.`, 'success');
    }

    function clearUnattendedHighlightsAndMarkers() {
        AppState.highlightedUnattendedLayersInRadius.forEach(layer => {
            const layerElement = layer.getElement();
            if (layerElement) {
                L.DomUtil.removeClass(layerElement, 'city-highlight-unattended-in-radius');
            }
            
            if (layer.options.originalPane && AppState.map.getPane(layer.options.originalPane) && layerElement && AppState.map.hasLayer(layer)) {
                AppState.map.getPane(layer.options.originalPane).appendChild(layerElement);
                layer.options.pane = layer.options.originalPane;
            }
             if (layer.feature) { 
                setLayerStyle(layer, getCityStyle(layer.feature)); 
             }
        });
        AppState.highlightedUnattendedLayersInRadius = [];

        AppState.unattendedInRadiusMarkers.forEach(marker => AppState.map.removeLayer(marker));
        AppState.unattendedInRadiusMarkers = [];
    }

    function clearRadiusCircle() {
        clearUnattendedHighlightsAndMarkers(); 
        if (AppState.radiusCircleLayer) {
            AppState.map.removeLayer(AppState.radiusCircleLayer);
            AppState.radiusCircleLayer = null;
        }
        DOMElements.clearRadiusButton.classList.add('hidden');
        DOMElements.radiusAnalysisFeedbackContainer.classList.add('hidden');
        DOMElements.radiusAnalysisFeedback.innerHTML = '<i>Clique em "Desenhar Raio" para analisar.</i>';
    }

    function setupEventListeners() {
        DOMElements.toggleSidebarButton.addEventListener('click', () => {
            DOMElements.sidebar.classList.toggle('collapsed');
            DOMElements.toggleSidebarButton.querySelector('i').className = DOMElements.sidebar.classList.contains('collapsed') ? 'fas fa-bars' : 'fas fa-chevron-left';
            setTimeout(() => AppState.map?.invalidateSize(), 310); 
        });

        DOMElements.sidebarTabsContainer.addEventListener('click', e => {
            const btn = e.target.closest('.tab-button');
            if (!btn) return;
            DOMElements.tabButtons.forEach(b => b.classList.remove('active'));
            DOMElements.tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetTab = document.getElementById(`tab-${btn.dataset.tab}`);
            if (targetTab) targetTab.classList.add('active');
        });

        DOMElements.searchInput.addEventListener('input', handleAutocompleteSearchInput);
        DOMElements.searchInput.addEventListener('blur', () => { 
            setTimeout(() => {
                if (DOMElements.autocompleteResultsContainer && !DOMElements.autocompleteResultsContainer.matches(':hover')) {
                    DOMElements.autocompleteResultsContainer.innerHTML = '';
                    DOMElements.autocompleteResultsContainer.classList.remove('active');
                }
            }, 200);
        });
        DOMElements.searchButton.addEventListener('click', () => handleSearchCity(DOMElements.searchInput.value));
        DOMElements.searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                handleSearchCity(DOMElements.searchInput.value);
                if (DOMElements.autocompleteResultsContainer) { 
                    DOMElements.autocompleteResultsContainer.innerHTML = '';
                    DOMElements.autocompleteResultsContainer.classList.remove('active');
                }
            }
        });

        DOMElements.addFavoriteButton.addEventListener('click', handleAddFavorite);
        DOMElements.assignVendedorButton.addEventListener('click', () => {
            if (!AppState.selectedCity) {
                showNotification('Nenhuma cidade selecionada.', 'info');
                return;
            }
            if (!AppState.vendedores.length) {
                showNotification('Nenhum vendedor cadastrado. Sincronize os dados primeiro.', 'warning');
                return;
            }
            prepareAssignVendedorModal();
        });

        DOMElements.confirmAssignVendedorButton.addEventListener('click', handleConfirmAssignVendedor);

        DOMElements.createGroupButton.addEventListener('click', handleCreateGroup);
        if (DOMElements.groupSelect) { 
            DOMElements.groupSelect.addEventListener('change', e => highlightGroupOnMap(e.target.value));
        }

        DOMElements.drawRadiusButton.addEventListener('click', drawRadiusCircle);
        DOMElements.clearRadiusButton.addEventListener('click', clearRadiusCircle);
        DOMElements.openAboutModalButton.addEventListener('click', () => openModal(DOMElements.modalAbout));

        DOMElements.reloadDataButton.addEventListener('click', () => {
            if (confirm("Recarregar dados da planilha? Alterações locais não refletidas na planilha (como favoritos ou grupos) NÃO serão perdidas, mas os dados de vendedores e potencial serão sobrescritos.")) {
                loadDataFromSheets();
            }
        });

        document.addEventListener('click', e => {
            if (e.target.matches('.modal-close') || e.target.matches('.modal.show')) {
                closeModal(e.target.closest('.modal') || e.target);
            }
        });
        document.addEventListener('keydown', e => { 
            if (e.key === "Escape") {
                closeAllModals();
            }
        });

        if (AppState.map) { 
            AppState.map.on('zoomstart movestart popupopen', removeCityInfoMarker); 
            AppState.map.on('click', e => { 
                if (AppState.cityInfoMarker && e.originalEvent.target === AppState.map.getContainer()) {
                    removeCityInfoMarker();
                }
            });
        }
    }

    function handleAutocompleteSearchInput(event) {
        const searchTerm = event.target.value; 
        const resultsContainer = DOMElements.autocompleteResultsContainer; 
        resultsContainer.innerHTML = ''; 

        if (searchTerm.length < 2) { 
            resultsContainer.classList.remove('active');
            return;
        }

        const normSearch = normalizeString(searchTerm);
        const matchingCities = new Set();

        for (const [normalizedMapName, originalMapName] of Object.entries(AppState.normalizedCityNames)) {
            if (normalizedMapName.startsWith(normSearch)) {
                matchingCities.add(originalMapName);
            }
            if (matchingCities.size >= 15) break; 
        }

        if (matchingCities.size < 15) {
            for (const [normalizedMapName, originalMapName] of Object.entries(AppState.normalizedCityNames)) {
                if (normalizedMapName.includes(normSearch) && !matchingCities.has(originalMapName)) { 
                    matchingCities.add(originalMapName);
                }
                if (matchingCities.size >= 15) break;
            }
        }
        
        const simpleSearch = toSimpleForm(normSearch);
        if (matchingCities.size < 15 && simpleSearch !== normSearch && simpleSearch.length > 1) {
            for (const [normalizedMapName, originalMapName] of Object.entries(AppState.normalizedCityNames)) {
                if (toSimpleForm(normalizedMapName).startsWith(simpleSearch) && !matchingCities.has(originalMapName)) {
                    matchingCities.add(originalMapName);
                }
                if (matchingCities.size >= 15) break;
            }
            if (matchingCities.size < 15) {
                 for (const [normalizedMapName, originalMapName] of Object.entries(AppState.normalizedCityNames)) {
                    if (toSimpleForm(normalizedMapName).includes(simpleSearch) && !matchingCities.has(originalMapName)) {
                        matchingCities.add(originalMapName);
                    }
                    if (matchingCities.size >= 15) break;
                }
            }
        }

        const sortedMatches = Array.from(matchingCities); 

        if (sortedMatches.length) {
            sortedMatches.forEach(cityName => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = cityName;
                item.addEventListener('mousedown', (e) => { 
                    e.preventDefault(); 
                    DOMElements.searchInput.value = cityName;
                    resultsContainer.innerHTML = '';
                    resultsContainer.classList.remove('active');
                    handleSearchCity(cityName); 
                });
                resultsContainer.appendChild(item);
            });
            resultsContainer.classList.add('active');
        } else {
            resultsContainer.classList.remove('active');
        }
    }

    function handleSearchCity(searchTermOriginal) {
        if (!searchTermOriginal?.trim()) {
            showNotification("Por favor, digite o nome de uma cidade.", "info");
            return;
        }
        const searchTermNormalized = normalizeString(searchTermOriginal);
        const simpleSearchTerm = toSimpleForm(searchTermNormalized);

        let foundName = null;
        let foundLayer = null;
        let bestScore = 0; 

        if (AppState.normalizedCityNames[searchTermNormalized]) {
            foundName = AppState.normalizedCityNames[searchTermNormalized];
            foundLayer = AppState.cityLayers[foundName];
            bestScore = 100;
        }

        if (!foundLayer && AppState.cityLayers[searchTermOriginal]) {
            foundName = searchTermOriginal;
            foundLayer = AppState.cityLayers[searchTermOriginal];
            bestScore = 99; 
        }
        
        if (!foundLayer) {
            for (const [normKey, origName] of Object.entries(AppState.normalizedCityNames)) {
                if (toSimpleForm(normKey) === simpleSearchTerm) {
                    foundName = origName;
                    foundLayer = AppState.cityLayers[origName];
                    bestScore = 90;
                    break;
                }
            }
        }
        
        if (!foundLayer) {
            for (const [normKey, origName] of Object.entries(AppState.normalizedCityNames)) {
                if (normKey.startsWith(searchTermNormalized)) {
                    const currentScore = 80 + (searchTermNormalized.length / normKey.length * 5); 
                    if (currentScore > bestScore) {
                        bestScore = currentScore;
                        foundName = origName;
                        foundLayer = AppState.cityLayers[origName];
                    }
                }
            }
        }
        
         if (!foundLayer && bestScore < 80) { 
            for (const [normKey, origName] of Object.entries(AppState.normalizedCityNames)) {
                if (normKey.includes(searchTermNormalized)) {
                     const currentScore = 70 + (searchTermNormalized.length / normKey.length * 5);
                     if (currentScore > bestScore) {
                        bestScore = currentScore;
                        foundName = origName;
                        foundLayer = AppState.cityLayers[origName];
                    }
                }
            }
        }

        if (foundName && foundLayer) {
            AppState.map.fitBounds(foundLayer.getBounds(), { padding: [70, 70], maxZoom: 12 });
            foundLayer.fire('click'); 
            showNotification(`Cidade ${foundName} encontrada e centralizada.`, 'success');
            DOMElements.searchInput.value = foundName; 
            if (DOMElements.autocompleteResultsContainer) {
                DOMElements.autocompleteResultsContainer.innerHTML = '';
                DOMElements.autocompleteResultsContainer.classList.remove('active');
            }
        } else {
            showNotification(`Cidade "${searchTermOriginal}" não encontrada. Verifique a ortografia ou tente um nome mais completo.`, 'warning');
        }
    }

    function handleAddFavorite() {
        if (!AppState.selectedCity) {
            showNotification('Nenhuma cidade selecionada para adicionar aos favoritos.', 'info');
            return;
        }
        if (AppState.favorites.some(fav => fav.name === AppState.selectedCity.name)) {
            showNotification(`${AppState.selectedCity.name} já está nos favoritos.`, 'info');
            return;
        }
        AppState.favorites.push({ name: AppState.selectedCity.name, id: AppState.selectedCity.id });
        saveDataToLocalStorage();
        updateFavoritesList();
        resetMapStyles(); 
        showNotification(`${AppState.selectedCity.name} adicionado(a) aos favoritos!`, 'success');
    }

    function handleConfirmAssignVendedor() {
        const vendedorIdToAssign = DOMElements.assignVendedorSelect.value;
        if (!AppState.selectedCity || !vendedorIdToAssign) {
            showNotification('Selecione uma cidade e um vendedor para atribuir.', 'warning');
            return;
        }

        const cityName = AppState.selectedCity.name;
        const vendedor = AppState.vendedores.find(v => v.id === vendedorIdToAssign);

        if (!vendedor) {
            showNotification('Vendedor selecionado não encontrado.', 'danger');
            return;
        }

        if (!vendedor.cidades.includes(cityName)) {
            vendedor.cidades.push(cityName);
        }

        if (!AppState.cityAssignments[cityName]) {
            AppState.cityAssignments[cityName] = [];
        }
        if (!AppState.cityAssignments[cityName].includes(vendedorIdToAssign)) {
            AppState.cityAssignments[cityName].push(vendedorIdToAssign);
        } else {
            showNotification(`Vendedor ${vendedor.nome} já está atribuído a ${cityName}.`, 'info');
            prepareAssignVendedorModal(); 
            return;
        }

        saveDataToLocalStorage();
        prepareAssignVendedorModal(); 
        updateSelectedCityInfo();   
        updateVendedoresList();     
        resetMapStyles();           
        showNotification(`${cityName} atribuída a ${vendedor.nome} com sucesso!`, 'success');
    }

    function handleCreateGroup() {
        const groupName = DOMElements.groupNameInput.value.trim();
        if (!groupName) {
            showNotification('Por favor, digite um nome para o novo grupo.', 'warning');
            return;
        }
        if (AppState.groups[groupName]) {
            showNotification(`O grupo "${groupName}" já existe. Escolha outro nome.`, 'warning');
            return;
        }
        AppState.groups[groupName] = []; 
        saveDataToLocalStorage();
        updateGroupsLists();    
        updateFavoritesList();  
        DOMElements.groupNameInput.value = ''; 
        showNotification(`Grupo "${groupName}" criado com sucesso!`, 'success');
    }

    async function initializeApp() {
        initDOMElements(); 

        if (DOMElements.spreadsheetIdDisplay) DOMElements.spreadsheetIdDisplay.textContent = AppConfig.spreadsheetId;
        if (DOMElements.configRangeNameDisplay) DOMElements.configRangeNameDisplay.textContent = AppConfig.range.split('!')[0]; 
        
        if (AppConfig.apiKey === "SUA_API_KEY_RESTRITA_AQUI" || !AppConfig.apiKey) {
             console.warn("ALERTA: API Key do Google Sheets não configurada!");
             showNotification("API Key do Google Sheets não configurada! Funcionalidades da planilha (vendedores, potencial) estarão desabilitadas.", "danger", 20000);
        }

        initMap(); 
        
        setupEventListeners(); 

        try {
            showLoading(true, "Carregando dados geográficos...");
            for (const dataSet of AppConfig.geoJsonSources) {
                await loadGeoJsonWithFallback(dataSet);
            }
            if (!Object.keys(AppState.cityLayers).length && AppConfig.geoJsonSources.some(ds => ds.id.startsWith('municipios'))) {
                 showNotification("Falha crítica ao carregar dados geográficos dos municípios. Algumas funcionalidades podem não operar corretamente.", "danger", 10000);
                 console.error("Nenhuma camada de cidade (municípios) foi carregada.");
            }
            
            loadSavedData(); 
            
            await loadDataFromSheets(); 
            
            updateUIAfterDataLoad(); 

        } catch (error) {
            console.error("Erro crítico na inicialização geral:", error.message, error.stack);
            showNotification(`Erro crítico na inicialização: ${error.message}. Verifique o console.`, "danger", 15000);
            updateUIAfterDataLoad(); 
        } finally {
            showLoading(false); 
        }
    }

    initializeApp(); 
});