document.addEventListener('DOMContentLoaded', () => {
    // ========= CONFIGURAÇÃO DA APLICAÇÃO =========
    const AppConfig = {
        spreadsheetId: "1vWWvnYGgZyqVYMoBfcciCCGgEN1FLzSrmXYPBOPKUjk",
        apiKey: "AIzaSyChiZPUY-G3oyZN2NGY_vlgRXUzry9Pkeo",
        range: "novas-rotas",
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
                paneName: null
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
                paneName: null
            },
            {
                id: 'limiteSP',
                description: 'Limite do Estado de São Paulo',
                urls: [
				'http://edimarpcosta.github.io/geojson/UFs/br_sp.json',
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
    '#FF0000', // 1. Vermelho Puro
    '#0000FF', // 2. Azul Puro
    '#008000', // 3. Verde Puro
    '#FFA500', // 4. Laranja Puro
    '#800080', // 5. Roxo Puro
    '#FFFF00', // 6. Amarelo Puro (ATENÇÃO: MUITO CLARO COM OPACIDADE 0.5, considere substituir)
    // Substituição para Amarelo:
    // '#FFD700', // Amarelo Ouro (um pouco menos claro)
    // '#F9A825', // Âmbar (Ainda melhor, mais escuro)
    '#F9A825', // 6. Âmbar (Substituindo Amarelo Puro)
    '#FF00FF', // 7. Magenta Puro (Fúcsia)
    '#00FFFF', // 8. Ciano Puro (Aqua) (ATENÇÃO: MUITO CLARO COM OPACIDADE 0.5, considere substituir)
    // Substituição para Ciano:
    // '#008080', // Teal (bem mais escuro e seguro)
    '#008B8B', // 8. Ciano Escuro (DarkCyan, Substituindo Ciano Puro)
    '#A52A2A', // 9. Marrom
    '#800000', // 10. Vinho (Maroon)
    '#000080', // 11. Azul Marinho (Navy)
    '#808000', // 12. Oliva

    // Grupo 2: Variações Fortes e Tons Escuros Distintos - 18 cores (Total 30)
    '#E6194B', // 13. Vermelho Rubi
    '#3CB44B', // 14. Verde Esmeralda
    '#4363D8', // 15. Azul Cobalto
    '#F58231', // 16. Laranja Abóbora
    '#911EB4', // 17. Roxo Ametista
    '#F032E6', // 18. Rosa Choque
    '#008080', // 19. Teal (Verde-azulado Escuro)
    '#9A6324', // 20. Marrom Sela
    '#000000', // 21. Preto (Para contraste máximo, se aplicável) - Pode ser '#2F4F4F' (Cinza Ardósia Escuro) se preto puro for demais.
    '#17A2B8', // 22. Azul Petróleo Claro / Ciano Escuro
    '#FF1493', // 23. Rosa Pink Forte (DeepPink)
    '#E6B333', // 24. Amarelo Mostarda Escuro
    '#B34D4D', // 25. Terracota / Vermelho Queimado
    '#809900', // 26. Verde Limão Escuro
    '#6610F2', // 27. Roxo Índigo Vibrante
    '#E6331A', // 28. Vermelho Tomate Intenso
    '#005C00', // 29. Verde Muito Escuro
    '#D23E9A', // 30. Rosa Forte / Fúcsia Médio

    // Grupo 3: Mais Cores Vibrantes e Escuras - 20 cores (Total 50)
    '#FF6B00', // 31. Laranja Vibrante Escuro
    '#7000A0', // 32. Roxo Escuro Intenso
    '#C20000', // 33. Vermelho Sangue Escuro
    '#0075AC', // 34. Azul Aço
    '#AD1457', // 35. Vinho Rosado Forte (Framboesa Escuro)
    '#3B7A57', // 36. Verde Floresta Escuro
    '#BF360C', // 37. Laranja Queimado Bem Escuro
    '#4A148C', // 38. Roxo Bispo (Muito Escuro)
    '#004D40', // 39. Teal Muito Escuro (Quase Preto-azulado)
    '#880E4F', // 40. Magenta Escuro / Borgonha
    '#2E7D32', // 41. Verde Escuro Sólido
    '#D32F2F', // 42. Vermelho Cardinal Forte
    '#4527A0', // 43. Roxo Azulado Escuro
    '#EF6C00', // 44. Laranja Âmbar Forte
    '#01579B', // 45. Azul Náutico Escuro
    '#B71C1C', // 46. Vermelho Fogo Escuro
    '#1B5E20', // 47. Verde Pinheiro Muito Escuro
    '#E65100', // 48. Laranja Abóbora Escuro
    '#C51162', // 49. Rosa Escuro Vibrante
    '#006064', // 50. Ciano Muito Escuro

    // Grupo 4: Tons Médios Fortes e Outras Variações - 20 cores (Total 70)
    '#FF6F00', // 51. Laranja Manga Escuro
    '#3E2723', // 52. Marrom Café Muito Escuro
    '#B22222', // 53. Vermelho Tijolo (Firebrick)
    '#556B2F', // 54. Verde Oliva Escuro (DarkOliveGreen)
    '#483D8B', // 55. Azul Ardósia Escuro (DarkSlateBlue)
    '#FF8C00', // 56. Laranja Escuro (DarkOrange)
    '#9932CC', // 57. Orquídea Escura (DarkOrchid)
    '#8B008B', // 58. Magenta Escuro (DarkMagenta) - pode ser similar a #880E4F
    '#2F4F4F', // 58. Cinza Ardósia Escuro (DarkSlateGray) (Substituído)
    '#9400D3', // 59. Violeta Escuro (DarkViolet)
    '#DC143C', // 60. Vermelho Carmesim (Crimson)
    '#228B22', // 61. Verde Floresta (ForestGreen)
    '#4169E1', // 62. Azul Real (RoyalBlue)
    '#8A2BE2', // 63. Azul Violeta (BlueViolet)
    '#D2691E', // 64. Chocolate (Marrom Médio)
    '#FF7F50', // 65. Coral (Laranja Rosado)
    '#B8860B', // 66. Dourado Escuro (DarkGoldenrod)
    '#006400', // 67. Verde Escuro (DarkGreen) - pode ser similar a #005C00 / #1B5E20
    '#4B0082', // 68. Índigo (Indigo) - pode ser similar a #6610F2 / #4A148C
    '#CD5C5C', // 69. Coral Indiano (IndianRed)
    '#6B8E23', // 70. Verde Oliva Amarelado (OliveDrab)

    // Grupo 5: Completando até 100 com mais variações, evitando os muito claros - 30 cores (Total 100)
    '#4682B4', // 71. Azul Aço (SteelBlue)
    '#A0522D', // 72. Siena (Marrom Avermelhado)
    '#C71585', // 73. Violeta Vermelho Médio (MediumVioletRed)
    '#32CD32', // 74. Verde Limão (LimeGreen)
    '#DB7093', // 75. Vermelho Violeta Pálido (PaleVioletRed, mas ainda forte)
    '#CD853F', // 76. Peru (Marrom Avermelhado Médio)
    '#BA55D3', // 77. Orquídea Média (MediumOrchid)
    '#7B68EE', // 78. Azul Ardósia Médio (MediumSlateBlue)
    '#6A5ACD', // 79. Azul Ardósia (SlateBlue)
    '#DAA520', // 80. Vareta Dourada (Goldenrod)
    '#20B2AA', // 81. Verde Mar Claro (LightSeaGreen)
    '#66CDAA', // 82. Água Marinha Média (MediumAquamarine)
    '#E9967A', // 83. Salmão Escuro (DarkSalmon)
    '#FF4500', // 84. Laranja Avermelhado (OrangeRed)
    '#F08080', // 85. Coral Claro (LightCoral)
    '#DDA0DD', // 86. Ameixa (Plum)
    '#FFA07A', // 87. Salmão Claro (LightSalmon)
    '#2E8B57', // 88. Verde Mar (SeaGreen)
    '#708090', // 89. Cinza Ardósia (SlateGray)
    '#6A0DAD', // 90. Roxo Brilhante Intenso
    '#C04000', // 91. Marrom Mogno
    '#BD572A', // 92. Marrom Argila
    '#DE3163', // 93. Vermelho Cereja
    '#FD6A02', // 94. Laranja Abóbora Brilhante
    '#088F8F', // 95. Verde Azul Marinho
    '#AA00FF', // 96. Roxo Elétrico
    '#FFBF00', // 97. Âmbar Dourado
    '#B03060', // 98. Vermelho Marrom (Maroon Red)
    '#5F4B8B', // 99. Roxo Imperial Escuro (Novo)
    '#00A86B'  // 100. Verde Jade Escuro (Novo)
],
    };

    const AppState = {
        map: null, selectedCity: null, cityLayers: {}, normalizedCityNames: {},
        cityPopulations: {}, favorites: [], groups: {}, vendedores: [], cityAssignments: {},
        activeGroup: null, activeVendedorId: null, lastUpdateTime: null,
        cityInfoMarker: null, cityInfoMarkerTimeout: null, isMouseOverInfoIcon: false,
        currentRouteControl: null,
        destinationMarkerForRoute: null,
    };

    const CONSTANTS = {
        LOCAL_STORAGE_KEYS: {
            FAVORITES: 'sga_territoriale_fav_v13_routing', GROUPS: 'sga_territoriale_grp_v13_routing',
            VENDEDORES: 'sga_territoriale_vnd_v13_routing', LAST_UPDATE: 'sga_territoriale_upd_v13_routing',
            CITY_POPULATIONS: 'sga_territoriale_pop_v13_routing'
        },
       DEFAULT_CITY_STYLE: { fillColor: '#3388ff', fillOpacity: 0, color: '#0000FF', weight: 0.3 },
        SELECTED_CITY_STYLE: { fillColor: '#ff7800', fillOpacity: 0.7, color: '#ff7800', weight: 3 },
        SP_BOUNDARY_STYLE: { color: "red", weight: 3, opacity: 0.8, fillOpacity: 0, dashArray: '5, 5', interactive: false },
        HIGHLIGHT_GROUP_STYLE: { fillColor: '#9b59b6', fillOpacity: 0.6, color: '#9b59b6', weight: 3 },
        HIGHLIGHT_VENDEDOR_STYLE: { fillColor: '#e74c3c', fillOpacity: 0.7, color: '#e74c3c', weight: 3 },
        MULTIPLE_VENDEDORES_STYLE: { fillColor: '#f39c12', fillOpacity: 0.6, color: '#f39c12', weight: 2, dashArray: '5, 5' }
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
        if (!/^(d|de|do|da|dos|das)$/.test(simple.trim())) {
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

    // ========= MAPA E ROTEAMENTO =========
    function initMap() {
        AppState.map = L.map(DOMElements.mapContainer, {
            dragging: true, touchZoom: true, doubleClickZoom: true,
            scrollWheelZoom: true, boxZoom: true, keyboard: true, tap: true,
        }).setView(AppConfig.mapInitialView, AppConfig.mapInitialZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18, keepBuffer: 2
        }).addTo(AppState.map);

        AppState.map.createPane('boundaryPane');
        AppState.map.getPane('boundaryPane').style.zIndex = 650;
        AppState.map.createPane('routingPane');
        AppState.map.getPane('routingPane').style.zIndex = 640;
    }

    async function loadGeoJsonWithFallback(dataSet) {
        showLoading(true, `Carregando: ${dataSet.description}...`);
        let featuresLoaded = null;
        console.log(`Iniciando carregamento para: ${dataSet.description}`);

        for (const url of dataSet.urls) {
            try {
                console.log(`Tentando carregar ${dataSet.description} de: ${url}`);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Falha ${response.status} (${response.statusText}) ao carregar ${url}`);
                }
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
                onEachFeature: dataSet.onFeatureCallback
            };
            if (dataSet.paneName && AppState.map.getPane(dataSet.paneName)) {
                layerOptions.pane = dataSet.paneName;
            }

            const geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: featuresLoaded }, layerOptions);
            if (geoJsonLayer) {
                geoJsonLayer.addTo(AppState.map);
                console.log(`${dataSet.description} adicionado ao mapa.`);
                return geoJsonLayer;
            }
        } else {
            showNotification(`Falha ao carregar dados para: ${dataSet.description}`, 'danger', 7000);
            console.error(`Não foi possível carregar ${dataSet.description} de nenhuma fonte.`);
        }
        return null;
    }

    function onEachCityFeature(feature, layer) {
        const cityName = feature.properties.name || feature.properties.NOME_MUN || feature.properties.NM_MUN;
        const cityId = feature.properties.id || feature.properties.CD_MUN || feature.properties.geocodigo || feature.properties.codarea || generateId();

        if (!cityName) { console.warn("Feature sem nome:", feature.properties); return; }
        // console.log(`onEachCityFeature: Processando ${cityName}`); // LOG ADICIONADO

        if (!AppState.cityLayers[cityName]) {
            AppState.cityLayers[cityName] = layer;
        } else {
            // console.warn(`Layer para a cidade ${cityName} já existe. Isso pode indicar dados duplicados de GeoJSON.`);
        }
        AppState.normalizedCityNames[normalizeString(cityName)] = cityName;

        layer.on('click', (e) => handleCityClick(cityName, cityId, layer));
        layer.on('dblclick', (e) => showCityDetailsModal(cityName, cityId));
        layer.on('mouseover', function (eL) {
            if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
            if (document.querySelector('.modal.show')) return;
            if (!AppState.cityInfoMarker || AppState.cityInfoMarker.options.cityName !== cityName) {
                removeCityInfoMarker();
                const markerLatLng = this.getBounds().getCenter();
                const customIcon = L.divIcon({ className: 'city-info-icon-marker', html: `<i class="fas fa-info-circle"></i>`, iconSize: [30, 30], iconAnchor: [15, 15] });
                AppState.cityInfoMarker = L.marker(markerLatLng, { icon: customIcon, interactive: true, cityName: cityName, bubblingMouseEvents: false }).addTo(AppState.map);
                AppState.cityInfoMarker.on('mouseover', async function(evIcon) {
                    AppState.isMouseOverInfoIcon = true; if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
                    const tooltip = this.getTooltip(); if (tooltip && typeof this.isTooltipOpen === 'function' && this.isTooltipOpen()) return;
                    const tooltipContent = await generateCityTooltipContent(this.options.cityName);
                    this.bindTooltip(tooltipContent, { permanent: false, direction: 'top', offset: L.point(0, -15), className: 'city-info-tooltip', interactive: true }).openTooltip();
                });
                AppState.cityInfoMarker.on('mouseout', function(evIcon) {
                    AppState.isMouseOverInfoIcon = false; const self = this; if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
                    AppState.cityInfoMarkerTimeout = setTimeout(() => { const tooltip = self.getTooltip(); if (!AppState.isMouseOverInfoIcon && AppState.cityInfoMarker === self && !(tooltip && self.isTooltipOpen && self.isTooltipOpen())) removeCityInfoMarker(); }, 300);
                });
                AppState.cityInfoMarker.on('click', (eClickIcon) => { L.DomEvent.stopPropagation(eClickIcon); showCityDetailsModal(AppState.cityInfoMarker.options.cityName, cityId); });
            }
        });
        layer.on('mouseout', function (eL) {
            if (AppState.cityInfoMarkerTimeout) clearTimeout(AppState.cityInfoMarkerTimeout);
            AppState.cityInfoMarkerTimeout = setTimeout(() => { if (!AppState.isMouseOverInfoIcon && AppState.cityInfoMarker && AppState.cityInfoMarker.options.cityName === cityName) removeCityInfoMarker(); }, 450);
        });
        layer.bindTooltip(cityName, { permanent: false, direction: 'center', className: 'city-tooltip' });
    }

    function removeCityInfoMarker() {
        if (AppState.cityInfoMarker) {
            AppState.cityInfoMarker.off('mouseover').off('mouseout').off('click');
            const tooltip = AppState.cityInfoMarker.getTooltip(); if (tooltip && typeof AppState.cityInfoMarker.isTooltipOpen === 'function' && AppState.cityInfoMarker.isTooltipOpen()) AppState.cityInfoMarker.closeTooltip().unbindTooltip();
            if (AppState.map && AppState.map.hasLayer(AppState.cityInfoMarker)) AppState.map.removeLayer(AppState.cityInfoMarker);
            AppState.cityInfoMarker = null;
        }
        if (AppState.cityInfoMarkerTimeout) { clearTimeout(AppState.cityInfoMarkerTimeout); AppState.cityInfoMarkerTimeout = null; }
        AppState.isMouseOverInfoIcon = false;
    }

    async function generateCityTooltipContent(cityName) {
        const population = await fetchCityPopulation(cityName);
        let content = `<h6>${cityName}</h6>`;
        content += `<p><strong>População:</strong> ${population ? population.toLocaleString('pt-BR') : 'N/D'}</p>`;
        const assignedVendedorIds = AppState.cityAssignments[cityName];
        if (assignedVendedorIds && assignedVendedorIds.length > 0) {
            assignedVendedorIds.forEach(vId => {
                const vendedor = AppState.vendedores.find(v => v.id === vId);
                if (vendedor) content += `<div class="vendedor-tooltip-info"><p class="vendedor-name-indicator"><span class="vendedor-color-indicator" style="background-color:${vendedor.color};"></span>${vendedor.nome}</p><p>Cód: ${vendedor.codigoVendedor || 'N/A'}, Sup: ${vendedor.supervisor || 'N/A'}</p><p>Cad: ${(vendedor.totalCadastros || 0).toLocaleString('pt-BR')}, Posit: ${(vendedor.totalPositivados || 0).toLocaleString('pt-BR')}</p></div>`;
            });
        } else content += '<p><em>Nenhum vendedor atribuído.</em></p>';
        return content;
    }

    function displayRouteToCity(destinationCoords, destinationCityName) {
        console.log("displayRouteToCity - Iniciando para:", destinationCityName, "Coords:", destinationCoords); // LOG ADICIONADO
        if (!destinationCoords || typeof destinationCoords.lat === 'undefined' || typeof destinationCoords.lng === 'undefined') {
            console.error("Coordenadas de destino inválidas para roteamento:", destinationCoords);
            const routeDetailsEl = document.getElementById('route-details');
            if (routeDetailsEl) routeDetailsEl.innerHTML = '<p><em>Coordenadas da cidade de destino inválidas.</em></p>';
            showNotification('Não foi possível traçar a rota: coordenadas de destino inválidas.', 'danger');
            return;
        }

        if (AppState.currentRouteControl) {
            AppState.map.removeControl(AppState.currentRouteControl);
            AppState.currentRouteControl = null;
        }
        if (AppState.destinationMarkerForRoute) {
            AppState.map.removeLayer(AppState.destinationMarkerForRoute);
            AppState.destinationMarkerForRoute = null;
        }

        const routeDetailsEl = document.getElementById('route-details');
        if (routeDetailsEl) routeDetailsEl.innerHTML = '<p><em>Calculando rota... Por favor, aguarde.</em></p>';

        AppState.currentRouteControl = L.Routing.control({
            waypoints: [
                AppConfig.distribuidoraAmeripanCoords,
                destinationCoords
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            show: false, 
            fitSelectedRoutes: 'smart',
            lineOptions: {
                styles: [{ color: '#03A9F4', opacity: 0.9, weight: 7 }],
                pane: 'routingPane'
            },
            createMarker: function(i, waypoint, n) {
                if (i === 0) {
                    return L.marker(waypoint.latLng, {
                        icon: L.icon({
                            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                        }),
                        title: "Ameripan Distribuidora"
                    }).bindPopup("<b>Ameripan Distribuidora</b><br>Origem da Rota");
                }
                return null;
            }
        }).on('routesfound', function(e) {
            const routes = e.routes;
            console.log("displayRouteToCity - Evento routesfound. Rotas:", routes); // LOG ADICIONADO

            if (AppState.destinationMarkerForRoute) {
                AppState.map.removeLayer(AppState.destinationMarkerForRoute);
                AppState.destinationMarkerForRoute = null;
            }

            if (routes && routes.length > 0 && routes[0].summary) {
                const summary = routes[0].summary;
                const distanceKm = (summary.totalDistance / 1000).toFixed(1);
                const timeMinutes = Math.round(summary.totalTime / 60);
                
                const hours = Math.floor(timeMinutes / 60);
                const minutes = timeMinutes % 60;
                let timeStr = '';
                if (hours > 0) timeStr += `${hours}h `;
                timeStr += `${minutes}min`;

                const routeInfoText = `Distância: ${distanceKm} km<br>Tempo Estimado: ${timeStr}`;

                if (routeDetailsEl) {
                    routeDetailsEl.innerHTML = `
                        <p><strong>Distância de Americana:</strong> ${distanceKm} km</p>
                        <p><strong>Tempo estimado de viagem:</strong> ${timeStr}</p>
                    `;
                }
                
                AppState.destinationMarkerForRoute = L.marker(destinationCoords, {
                    icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                    }),
                    title: destinationCityName
                })
                .addTo(AppState.map)
                .bindTooltip(`<b>${destinationCityName}</b><br>${routeInfoText}`)
                .bindPopup(`<b>Destino: ${destinationCityName}</b><br>${routeInfoText}`);
                
                // Comentado para confiar no fitSelectedRoutes: 'smart'
                /*
                if (routes[0].bounds && typeof routes[0].bounds.isValid === 'function' && routes[0].bounds.isValid()) {
                    AppState.map.fitBounds(routes[0].bounds, {padding: [70, 70]});
                } else {
                    console.warn("Route bounds are not valid for manual fitting, relying on fitSelectedRoutes if active.");
                }
                */
            } else {
                 if (routeDetailsEl) routeDetailsEl.innerHTML = '<p><em>Não foi possível calcular os detalhes da rota.</em></p>';
                 showNotification('Não foi possível encontrar uma rota para esta cidade (sem detalhes da rota).', 'warning');
                 console.warn("Nenhuma rota ou resumo encontrado:", routes);
            }
        }).on('routingerror', function(e) {
            console.error("displayRouteToCity - Evento routingerror:", e);  // LOG ADICIONADO
            let errorMessage = "Erro ao calcular a rota.";
            if (e.error) {
                errorMessage += ` (${e.error.message || 'Detalhes indisponíveis'})`;
                if (e.error.code) { 
                    console.error(`Código do Erro de Roteamento: ${e.error.code}`);
                    errorMessage += ` Código: ${e.error.code}.`;
                }
            } else {
                errorMessage += " Detalhes técnicos indisponíveis.";
            }
            
            if (routeDetailsEl) routeDetailsEl.innerHTML = `<p><em>${errorMessage}</em></p>`;
            showNotification(errorMessage, 'danger', 7000);
        }).addTo(AppState.map);
    }


    async function handleCityClick(cityName, cityId, layer) {
        console.log("handleCityClick - City:", cityName, "ID:", cityId, "Layer:", layer); // LOG ADICIONADO
        AppState.selectedCity = { name: cityName, id: cityId, layer: layer };
        removeCityInfoMarker();
        resetMapStyles();
        setLayerStyle(layer, CONSTANTS.SELECTED_CITY_STYLE);
        if (layer.bringToFront) layer.bringToFront();
        
        await updateSelectedCityInfo(); 

        if (layer.getBounds && typeof layer.getBounds === 'function') {
            const destinationCoords = layer.getBounds().getCenter();
            console.log("handleCityClick - Destination Coords:", destinationCoords); // LOG ADICIONADO
            if (destinationCoords && typeof destinationCoords.lat !== 'undefined' && typeof destinationCoords.lng !== 'undefined') {
                displayRouteToCity(destinationCoords, cityName);
            } else {
                console.error("handleCityClick - Coordenadas de destino inválidas após getCenter()", destinationCoords);
                const routeDetailsEl = document.getElementById('route-details');
                if (routeDetailsEl) routeDetailsEl.innerHTML = '<p><em>Erro: Coordenadas de destino inválidas.</em></p>';
                 showNotification('Erro interno: Coordenadas de destino inválidas para rota.', 'danger');
            }
        } else {
            console.warn("Layer da cidade não possui getBounds(), não é possível obter centro para rota.", layer);
            const routeDetailsEl = document.getElementById('route-details');
            if (routeDetailsEl) routeDetailsEl.innerHTML = '<p><em>Não foi possível obter coordenadas da cidade para rota.</em></p>';
        }

        if (DOMElements.sidebar.classList.contains('collapsed')) DOMElements.toggleSidebarButton.click();
        DOMElements.tabButtons.forEach(btn => btn.classList.remove('active'));
        DOMElements.tabContents.forEach(content => content.classList.remove('active'));
        const searchTabButton = document.querySelector('.tab-button[data-tab="search"]');
        const searchTabContent = document.getElementById('tab-search');
        if (searchTabButton) searchTabButton.classList.add('active');
        if (searchTabContent) searchTabContent.classList.add('active');
    }

    function setLayerStyle(layer, style) { if (layer?.setStyle) layer.setStyle(style); }

    function getCityStyle(feature) {
        const cityName = feature.properties.name || feature.properties.NOME_MUN || feature.properties.NM_MUN;
        let styleOptions = { ...CONSTANTS.DEFAULT_CITY_STYLE };

        if (AppState.favorites.some(fav => fav.name === cityName) && (!AppState.cityAssignments[cityName] || AppState.cityAssignments[cityName].length === 0)) {
            styleOptions.fillOpacity = 0.05; styleOptions.weight = 1; styleOptions.color = '#a0a0a0';
        }
        if (AppState.cityAssignments[cityName]?.length > 0) {
            if (AppState.cityAssignments[cityName].length === 1) {
                const vendedor = AppState.vendedores.find(v => v.id === AppState.cityAssignments[cityName][0]);
                if (vendedor?.color) { styleOptions.fillColor = vendedor.color; styleOptions.color = vendedor.color; styleOptions.fillOpacity = 0.5; styleOptions.weight = 2; }
            } else { styleOptions = { ...CONSTANTS.MULTIPLE_VENDEDORES_STYLE }; }
        }
        if (AppState.activeGroup && AppState.groups[AppState.activeGroup]?.includes(cityName)) styleOptions = { ...CONSTANTS.HIGHLIGHT_GROUP_STYLE };
        if (AppState.activeVendedorId && AppState.cityAssignments[cityName]?.includes(AppState.activeVendedorId)) styleOptions = { ...CONSTANTS.HIGHLIGHT_VENDEDOR_STYLE };
        if (AppState.selectedCity?.name === cityName) styleOptions = { ...CONSTANTS.SELECTED_CITY_STYLE };
        return styleOptions;
    }

    function resetMapStyles() {
        Object.values(AppState.cityLayers).forEach(layer => {
            if (layer.feature) {
                setLayerStyle(layer, getCityStyle(layer.feature));
            }
        });
    }

    function highlightVendedorCitiesOnMap(vendedorId) {
        AppState.activeVendedorId = vendedorId; AppState.activeGroup = null; if(DOMElements.groupSelect) DOMElements.groupSelect.value = ''; resetMapStyles();
        const vendedor = AppState.vendedores.find(v => v.id === vendedorId);
        if (vendedor?.cidades.length > 0) { const layers = vendedor.cidades.map(name => AppState.cityLayers[name]).filter(Boolean); if (layers.length > 0) AppState.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [50, 50] }); }
        showNotification(`Cidades do vendedor ${vendedor?.nome || ''} destacadas.`, 'info');
    }

    function highlightGroupOnMap(groupName) {
        AppState.activeGroup = groupName; AppState.activeVendedorId = null; resetMapStyles();
        if (groupName && AppState.groups[groupName]?.length > 0) { const layers = AppState.groups[groupName].map(name => AppState.cityLayers[name]).filter(Boolean); if (layers.length > 0) AppState.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [50, 50] }); }
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
        } catch (error) { console.error("Erro ao obter dados da planilha:", error); showNotification(`Erro ao carregar dados: ${error.message}`, "danger", 10000); updateUIAfterDataLoad(); }
        finally { showLoading(false); showSyncStatus(false); }
    }

    function processSheetsData(data) {
        const newVendedores = []; const newCityAssignments = {}; let cidadesNaoEncontradas = [];
        if (!data.values || data.values.length < 6) {
            showNotification("Formato da planilha incorreto. Verifique as instruções e se há dados suficientes.", "warning", 7000);
            AppState.vendedores = []; AppState.cityAssignments = {}; return;
        }
        const values = data.values; const numCols = values[0]?.length || 0; let colorIndex = 0;

        for (let col = 0; col < numCols; col++) {
            const supervisor = values[0]?.[col]?.trim();
            const vendedorNome = values[1]?.[col]?.trim();
            if (!supervisor || !vendedorNome) continue;

            const vendedorId = generateId();
            const vendedor = {
                id: vendedorId, nome: vendedorNome, supervisor: supervisor,
                codigoVendedor: values[2]?.[col]?.trim() || 'N/A',
                totalCadastros: parseInt(values[3]?.[col]?.trim(), 10) || 0,
                totalPositivados: parseInt(values[4]?.[col]?.trim(), 10) || 0,
                color: AppConfig.vendedorColors[colorIndex++ % AppConfig.vendedorColors.length],
                cidades: []
            };

            for (let row = 5; row < values.length; row++) {
                const cidadeNomePlanilha = values[row]?.[col]?.trim();
                if (cidadeNomePlanilha) {
                    const normPlanilhaOriginal = normalizeString(cidadeNomePlanilha);
                    let cidadeRealNoMapa = null;

                    if (AppState.normalizedCityNames[normPlanilhaOriginal]) {
                        cidadeRealNoMapa = AppState.normalizedCityNames[normPlanilhaOriginal];
                    }

                    if (!cidadeRealNoMapa) {
                        const simplePlanilha = toSimpleForm(normPlanilhaOriginal);
                        for (const [normMapKey, originalMapNameValue] of Object.entries(AppState.normalizedCityNames)) {
                            if (normMapKey === normPlanilhaOriginal) {
                                cidadeRealNoMapa = originalMapNameValue;
                                break;
                            }
                            const simpleMap = toSimpleForm(normMapKey);
                            if (simpleMap === simplePlanilha) {
                                cidadeRealNoMapa = originalMapNameValue;
                                break;
                            }
                        }
                    }
                    
                    if (!cidadeRealNoMapa) {
                        const simplePlanilha = toSimpleForm(normPlanilhaOriginal);
                        for (const [normMapKey, originalMapNameValue] of Object.entries(AppState.normalizedCityNames)) {
                            const simpleMap = toSimpleForm(normMapKey);
                            if (simpleMap.includes(simplePlanilha) && (simplePlanilha.length / simpleMap.length > 0.7)) {
                                cidadeRealNoMapa = originalMapNameValue;
                                break;
                            }
                             else if (simpleMap.includes(normPlanilhaOriginal) && (normPlanilhaOriginal.length / simpleMap.length > 0.7)) {
                                 cidadeRealNoMapa = originalMapNameValue;
                                break;
                             }
                        }
                    }

                    if (cidadeRealNoMapa) {
                        vendedor.cidades.push(cidadeRealNoMapa);
                        if (!newCityAssignments[cidadeRealNoMapa]) newCityAssignments[cidadeRealNoMapa] = [];
                        if (!newCityAssignments[cidadeRealNoMapa].includes(vendedorId)) newCityAssignments[cidadeRealNoMapa].push(vendedorId);
                    } else {
                        if (!cidadesNaoEncontradas.includes(cidadeNomePlanilha)) {
                            cidadesNaoEncontradas.push(cidadeNomePlanilha);
                            console.warn(`Cidade da planilha "${cidadeNomePlanilha}" (Normalizada: "${normPlanilhaOriginal}") (Vendedor: ${vendedorNome}) não encontrada no mapa.`);
                        }
                    }
                }
            }
            newVendedores.push(vendedor);
        }
        AppState.vendedores = newVendedores; AppState.cityAssignments = newCityAssignments;
        if (cidadesNaoEncontradas.length > 0) {
            const nomesExibicao = cidadesNaoEncontradas.slice(0, 3).join(', ');
            const mais = cidadesNaoEncontradas.length > 3 ? ` e mais ${cidadesNaoEncontradas.length - 3}...` : '';
            showNotification(`Algumas cidades (${nomesExibicao}${mais}) não encontradas. Verifique o console e a grafia dos nomes.`, "warning", 10000);
        }
    }

    function loadSavedData() {
        showLoading(true, "Carregando dados salvos...");
        try {
            AppState.favorites = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES)) || [];
            AppState.groups = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS)) || {};
            AppState.vendedores = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES)) || [];
            AppState.cityPopulations = JSON.parse(localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.CITY_POPULATIONS)) || {};
            if (AppState.vendedores.length > 0 && Object.keys(AppState.cityAssignments).length === 0) {
                AppState.cityAssignments = {}; AppState.vendedores.forEach(v => v.cidades.forEach(cName => { if (!AppState.cityAssignments[cName]) AppState.cityAssignments[cName] = []; if (!AppState.cityAssignments[cName].includes(v.id)) AppState.cityAssignments[cName].push(v.id); }));
            }
            const savedLastUpdate = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.LAST_UPDATE);
            if (savedLastUpdate) AppState.lastUpdateTime = new Date(savedLastUpdate);
            if (DOMElements.lastUpdateSpan) DOMElements.lastUpdateSpan.textContent = formatDateTime(AppState.lastUpdateTime);
        } catch (e) { console.error('Erro ao carregar dados do localStorage:', e); Object.values(CONSTANTS.LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key)); }
    }

    function saveDataToLocalStorage() {
        try {
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.FAVORITES, JSON.stringify(AppState.favorites));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.GROUPS, JSON.stringify(AppState.groups));
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.VENDEDORES, JSON.stringify(AppState.vendedores));
            if (AppState.lastUpdateTime) localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.LAST_UPDATE, AppState.lastUpdateTime.toISOString());
            if (Object.keys(AppState.cityPopulations).length > 0) localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.CITY_POPULATIONS, JSON.stringify(AppState.cityPopulations));
        } catch (e) { console.error('Erro ao salvar dados no localStorage:', e); showNotification('Erro ao salvar dados localmente.', 'danger');}
    }

    async function fetchCityPopulation(cityName, forceLoadFile = false) {
        const normalizedCityForPop = normalizeString(cityName);
        if (normalizedCityForPop && AppState.cityPopulations[normalizedCityForPop] && !forceLoadFile) return AppState.cityPopulations[normalizedCityForPop];
        if (forceLoadFile || Object.keys(AppState.cityPopulations).length === 0) {
            try {
                const response = await fetch('populacao_sp_mg.json'); if (!response.ok) { console.warn('Arquivo de população (populacao_sp_mg.json) não encontrado.'); return null; }
                const allPopulations = await response.json(); AppState.cityPopulations = {};
                for (const [key, value] of Object.entries(allPopulations)) AppState.cityPopulations[normalizeString(key)] = value;
                saveDataToLocalStorage();
            } catch (error) { console.error("Erro ao carregar arquivo de população:", error.message); return null; }
        }
        return normalizedCityForPop ? AppState.cityPopulations[normalizedCityForPop] || null : null;
    }

    async function updateSelectedCityInfo() {
        if (!AppState.selectedCity) {
            DOMElements.selectedCityInfo.innerHTML = '<p class="empty-message">Nenhuma cidade selecionada.</p>';
            DOMElements.selectedCityActions.classList.add('hidden');
            return;
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
        } else {
            vendedorHtml = '<p><em>Nenhum vendedor atribuído.</em></p>';
        }

        const ibgeLink = `https://cidades.ibge.gov.br/panorama-impresso?cod=${cityId}`;

        DOMElements.selectedCityInfo.innerHTML = `
            <h4>${cityName}</h4>
            ${populationInfo}
            ${vendedorHtml}
            <p><small>ID Geo (IBGE): ${cityId}. (Duplo clique no mapa para mais detalhes)</small></p>
            <div class="btn-group" role="group">
                <a href="${ibgeLink}" target="_blank" class="btn btn-info btn-sm mt-10">
                    <i class="fas fa-info-circle"></i> Info IBGE (Panorama Impresso)
                </a>
            </div>
            <div id="route-details" class="mt-15 bt-eee pt-15">
                <p class="empty-message">Clique em uma cidade para ver a rota desde Americana.</p>
            </div>`;
        DOMElements.selectedCityActions.classList.remove('hidden');
        DOMElements.assignVendedorButton.innerHTML = assignedVendedorIds?.length > 0 ? '<i class="fas fa-user-tie"></i> Gerenciar Vendedores' : '<i class="fas fa-user-tie"></i> Atribuir Vendedor';
    }

    function updateFavoritesList() {
        DOMElements.favoritesList.innerHTML = AppState.favorites.length === 0 ? '<li class="empty-message">Nenhuma cidade favorita</li>' : '';
        AppState.favorites.forEach(city => { const li = document.createElement('li'); li.className = 'list-item'; const assignedIds = AppState.cityAssignments[city.name]; let badge = ''; if (assignedIds?.length) badge = ` <span class="badge ${assignedIds.length === 1 ? 'badge-success' : 'badge-warning'}" title="${assignedIds.length} vend."><i class="fas ${assignedIds.length === 1 ? 'fa-user-tie' : 'fa-users'}"></i></span>`; li.innerHTML = `<div><strong>${city.name}</strong>${badge}</div><div class="actions"></div>`; const groupSelect = document.createElement('select'); groupSelect.className = 'form-control form-control-sm'; groupSelect.style.maxWidth = '120px'; groupSelect.innerHTML = '<option value="">Sem grupo</option>'; Object.keys(AppState.groups).forEach(gName => groupSelect.innerHTML += `<option value="${gName}" ${AppState.groups[gName]?.includes(city.name) ? 'selected' : ''}>${gName}</option>`); groupSelect.onchange = function() { Object.keys(AppState.groups).forEach(g => { if(AppState.groups[g]) AppState.groups[g] = AppState.groups[g].filter(c => c !== city.name)}); if (this.value) { if(!AppState.groups[this.value]) AppState.groups[this.value] = []; AppState.groups[this.value].push(city.name); } saveDataToLocalStorage(); resetMapStyles(); showNotification(`Cidade ${city.name} ${this.value ? 'adicionada ao ' + this.value : 'removida de grupos'}.`); }; li.querySelector('.actions').appendChild(groupSelect); const viewBtn = document.createElement('button'); viewBtn.className = 'btn btn-primary btn-sm'; viewBtn.innerHTML = '<i class="fas fa-eye"></i>'; viewBtn.title = 'Ver no mapa'; viewBtn.onclick = () => { if (AppState.cityLayers[city.name]) { AppState.map.fitBounds(AppState.cityLayers[city.name].getBounds()); AppState.cityLayers[city.name].fire('click'); }}; li.querySelector('.actions').appendChild(viewBtn); const removeBtn = document.createElement('button'); removeBtn.className = 'btn btn-danger btn-sm'; removeBtn.innerHTML = '<i class="fas fa-trash"></i>'; removeBtn.title = 'Remover favorito'; removeBtn.onclick = () => { AppState.favorites = AppState.favorites.filter(f => f.name !== city.name); Object.keys(AppState.groups).forEach(g => {if(AppState.groups[g]) AppState.groups[g] = AppState.groups[g].filter(c => c !== city.name)}); saveDataToLocalStorage(); updateFavoritesList(); updateGroupsLists(); resetMapStyles(); showNotification(`${city.name} removida dos favoritos.`); }; li.querySelector('.actions').appendChild(removeBtn); DOMElements.favoritesList.appendChild(li); });
    }

    function updateGroupsLists() {
        DOMElements.groupsList.innerHTML = Object.keys(AppState.groups).length === 0 ? '<li class="empty-message">Nenhum grupo criado</li>' : ''; if(DOMElements.groupSelect) DOMElements.groupSelect.innerHTML = '<option value="">Selecione um grupo</option>';
        Object.keys(AppState.groups).sort().forEach(groupName => { if(DOMElements.groupSelect) DOMElements.groupSelect.innerHTML += `<option value="${groupName}">${groupName}</option>`; const li = document.createElement('li'); li.className = 'list-item'; li.innerHTML = `<div><strong>${groupName}</strong> <span class="badge badge-primary">${AppState.groups[groupName]?.length || 0}</span></div> <div class="actions"> <button class="btn btn-warning btn-sm btn-highlight-group" title="Destacar"><i class="fas fa-highlighter"></i></button> <button class="btn btn-danger btn-sm btn-remove-group" title="Remover"><i class="fas fa-trash"></i></button> </div>`; li.querySelector('.btn-highlight-group').onclick = () => { if(DOMElements.groupSelect) DOMElements.groupSelect.value = groupName; highlightGroupOnMap(groupName); }; li.querySelector('.btn-remove-group').onclick = () => { if (confirm(`Remover grupo "${groupName}"?`)) { delete AppState.groups[groupName]; saveDataToLocalStorage(); updateGroupsLists(); updateFavoritesList(); if (AppState.activeGroup === groupName) { AppState.activeGroup = null; resetMapStyles(); } showNotification(`Grupo ${groupName} removido.`); } }; DOMElements.groupsList.appendChild(li); });
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
    }

    function prepareAssignVendedorModal() {
        if (!AppState.selectedCity) return; DOMElements.assignCityNameSpan.textContent = AppState.selectedCity.name; DOMElements.assignVendedorSelect.value = ''; DOMElements.assignedVendedoresList.innerHTML = '';
        const assignedIds = AppState.cityAssignments[AppState.selectedCity.name];
        if (assignedIds?.length > 0) { assignedIds.forEach(vId => { const vend = AppState.vendedores.find(v => v.id === vId); if (vend) { const li = document.createElement('li'); li.className = 'list-item'; li.innerHTML = `<div class="vendedor-list-item-info"><div class="vendedor-color-indicator" style="background-color: ${vend.color};"></div>${vend.nome}</div> <button class="btn btn-danger btn-sm btn-remove-assignment" title="Remover"><i class="fas fa-trash"></i></button>`; li.querySelector('.btn-remove-assignment').onclick = () => { vend.cidades = vend.cidades.filter(c => c !== AppState.selectedCity.name); AppState.cityAssignments[AppState.selectedCity.name] = AppState.cityAssignments[AppState.selectedCity.name].filter(id => id !== vId); if (AppState.cityAssignments[AppState.selectedCity.name].length === 0) delete AppState.cityAssignments[AppState.selectedCity.name]; saveDataToLocalStorage(); prepareAssignVendedorModal(); updateSelectedCityInfo(); updateVendedoresList(); resetMapStyles(); showNotification(`Vendedor ${vend.nome} removido de ${AppState.selectedCity.name}.`); }; DOMElements.assignedVendedoresList.appendChild(li); } }); DOMElements.currentVendedoresContainer.classList.remove('hidden'); }
        else { DOMElements.currentVendedoresContainer.classList.add('hidden'); } openModal(DOMElements.modalAssignVendedor);
    }

    function showVendedorDetailsModal(vendedor) {
        DOMElements.vendedorDetailsModalTitle.innerHTML = `<div class="vendedor-list-item-info"><div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div>Detalhes do Vendedor</div>`; DOMElements.vendedorInfoDiv.innerHTML = ` <p><strong>Nome:</strong> ${vendedor.nome}</p> <p><strong>Supervisor:</strong> ${vendedor.supervisor || 'N/A'}</p> <p><strong>Código:</strong> ${vendedor.codigoVendedor || 'N/A'}</p> <p><strong>Total Cadastros:</strong> ${(vendedor.totalCadastros || 0).toLocaleString('pt-BR')}</p> <p><strong>Total Positivados:</strong> ${(vendedor.totalPositivados || 0).toLocaleString('pt-BR')}</p>`; DOMElements.vendedorCidadesList.innerHTML = vendedor.cidades.length === 0 ? '<li class="empty-message">Nenhuma cidade</li>' : '';
        vendedor.cidades.sort().forEach(cityName => { const li = document.createElement('li'); li.className = 'list-item'; const totalAssignments = AppState.cityAssignments[cityName]?.length || 0; let badge = totalAssignments > 1 ? ` <span class="badge badge-warning" title="${totalAssignments} vend."><i class="fas fa-users"></i> ${totalAssignments}</span>` : ''; li.innerHTML = `<div>${cityName}${badge}</div><button class="btn btn-primary btn-sm btn-view-city" title="Ver no mapa"><i class="fas fa-eye"></i></button>`; li.querySelector('.btn-view-city').onclick = () => { if (AppState.cityLayers[cityName]) { closeAllModals(); AppState.map.fitBounds(AppState.cityLayers[cityName].getBounds()); AppState.cityLayers[cityName].fire('click');} }; DOMElements.vendedorCidadesList.appendChild(li); });
        DOMElements.highlightVendedorCitiesButton.onclick = () => { highlightVendedorCitiesOnMap(vendedor.id); closeAllModals(); }; openModal(DOMElements.modalVendedorDetails);
    }

    async function showCityDetailsModal(cityName, cityId) {
        DOMElements.cityDetailsModalTitle.textContent = `Detalhes - ${cityName}`; DOMElements.cityDetailsModalBody.innerHTML = '<p class="empty-message">Carregando...</p>'; openModal(DOMElements.modalCityDetails); removeCityInfoMarker();
        const population = await fetchCityPopulation(cityName); let detailsHTML = `<div class="city-general-info"><h4>${cityName}</h4><p><strong>População:</strong> ${population ? population.toLocaleString('pt-BR') : 'Não disponível'}</p></div>`;
        const assignedVendedorIds = AppState.cityAssignments[cityName]; let totalCadastrosCidade = 0; let totalPositivadosCidade = 0;
        if (assignedVendedorIds && assignedVendedorIds.length > 0) { detailsHTML += '<h5>Vendedores Atuantes:</h5>'; assignedVendedorIds.forEach(vId => { const vendedor = AppState.vendedores.find(v => v.id === vId); if (vendedor) { totalCadastrosCidade += (vendedor.totalCadastros || 0); totalPositivadosCidade += (vendedor.totalPositivados || 0); detailsHTML += ` <div class="vendedor-details-card"> <h5><div class="vendedor-color-indicator" style="background-color: ${vendedor.color};"></div> ${vendedor.nome}</h5> <p><strong>Supervisor:</strong> ${vendedor.supervisor || 'N/A'}</p> <p><strong>Código Vendedor:</strong> ${vendedor.codigoVendedor || 'N/A'}</p> <p><strong>Cadastros (Indiv.):</strong> ${(vendedor.totalCadastros || 0).toLocaleString('pt-BR')}</p> <p><strong>Positivados (Indiv.):</strong> ${(vendedor.totalPositivados || 0).toLocaleString('pt-BR')}</p> </div> `; } });
            if (assignedVendedorIds.length > 0) { const faltouPositivar = totalCadastrosCidade - totalPositivadosCidade; detailsHTML += ` <div class="city-summary-card"> <h5>Sumário da Cidade (${cityName})</h5> <p><strong>Total de Cadastros (Soma):</strong> ${totalCadastrosCidade.toLocaleString('pt-BR')}</p> <p><strong>Total de Positivados (Soma):</strong> ${totalPositivadosCidade.toLocaleString('pt-BR')}</p> <p><strong>Clientes Não Positivados:</strong> ${faltouPositivar.toLocaleString('pt-BR')}</p> </div> `; }
        } else { detailsHTML += '<p><em>Nenhum vendedor atribuído a esta cidade.</em></p>'; } DOMElements.cityDetailsModalBody.innerHTML = detailsHTML;
    }

    function setupEventListeners() {
        DOMElements.toggleSidebarButton.addEventListener('click', () => { DOMElements.sidebar.classList.toggle('collapsed'); DOMElements.toggleSidebarButton.querySelector('i').className = DOMElements.sidebar.classList.contains('collapsed') ? 'fas fa-bars' : 'fas fa-chevron-left'; setTimeout(() => { if(AppState.map) AppState.map.invalidateSize(); }, 310); });
        DOMElements.sidebarTabsContainer.addEventListener('click', e => { const btn = e.target.closest('.tab-button'); if (!btn) return; DOMElements.tabButtons.forEach(b => b.classList.remove('active')); DOMElements.tabContents.forEach(c => c.classList.remove('active')); btn.classList.add('active'); const targetTab = document.getElementById(`tab-${btn.dataset.tab}`); if(targetTab) targetTab.classList.add('active'); });
        DOMElements.searchButton.addEventListener('click', handleSearchCity); DOMElements.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearchCity(); });
        DOMElements.addFavoriteButton.addEventListener('click', handleAddFavorite);
        DOMElements.assignVendedorButton.addEventListener('click', () => { if (!AppState.selectedCity) {showNotification('Nenhuma cidade selecionada.', 'info'); return;} if (AppState.vendedores.length === 0) { showNotification('Nenhum vendedor cadastrado. Sincronize os dados.', 'warning'); return; } prepareAssignVendedorModal(); });
        DOMElements.confirmAssignVendedorButton.addEventListener('click', handleConfirmAssignVendedor); DOMElements.createGroupButton.addEventListener('click', handleCreateGroup);
        if(DOMElements.groupSelect) DOMElements.groupSelect.addEventListener('change', e => highlightGroupOnMap(e.target.value));
        DOMElements.reloadDataButton.addEventListener('click', () => { if (confirm("Recarregar dados da planilha? Isso pode sobrescrever alterações locais não sincronizadas.")) loadDataFromSheets(); });
        document.addEventListener('click', e => { if (e.target.matches('.modal-close') || e.target.matches('.modal.show')) { const modal = e.target.closest('.modal') || e.target; if (modal) closeModal(modal); } });
        document.addEventListener('keydown', e => { if (e.key === "Escape") closeAllModals(); });
        if(AppState.map) { AppState.map.on('zoomstart movestart', removeCityInfoMarker); AppState.map.on('click', (e) => { if (AppState.cityInfoMarker && e.originalEvent.target === AppState.map.getContainer()) removeCityInfoMarker(); }); AppState.map.on('popupopen', removeCityInfoMarker); }
    }

    function handleSearchCity() {
        const searchTermOriginal = DOMElements.searchInput.value;
        if (!searchTermOriginal) return;

        const normalizedSearchTerm = normalizeString(searchTermOriginal);
        const simpleSearchTerm = toSimpleForm(normalizedSearchTerm);

        let foundName = null;
        let foundLayer = null;
        let bestMatchScore = 0;

        for (const [normalizedCityNameFromMap, originalCityName] of Object.entries(AppState.normalizedCityNames)) {
            if (normalizedCityNameFromMap === normalizedSearchTerm) {
                foundName = originalCityName;
                foundLayer = AppState.cityLayers[originalCityName];
                bestMatchScore = 100;
                break;
            }
            const simpleMapName = toSimpleForm(normalizedCityNameFromMap);
            if (simpleMapName === simpleSearchTerm) {
                if (bestMatchScore < 90) {
                    foundName = originalCityName;
                    foundLayer = AppState.cityLayers[originalCityName];
                    bestMatchScore = 90;
                }
            }
        }
        
        if (bestMatchScore < 90) {
            for (const [normalizedCityNameFromMap, originalCityName] of Object.entries(AppState.normalizedCityNames)) {
                const simpleMapName = toSimpleForm(normalizedCityNameFromMap);
                if (simpleMapName.includes(simpleSearchTerm)) {
                    const currentScore = (simpleSearchTerm.length / simpleMapName.length) * 70;
                    if (currentScore > bestMatchScore) {
                        bestMatchScore = currentScore;
                        foundName = originalCityName;
                        foundLayer = AppState.cityLayers[originalCityName];
                    }
                } 
                else if (simpleSearchTerm.includes(simpleMapName) && simpleMapName.length > 3) {
                     const currentScore = (simpleMapName.length / simpleSearchTerm.length) * 60;
                     if (currentScore > bestMatchScore) {
                        bestMatchScore = currentScore;
                        foundName = originalCityName;
                        foundLayer = AppState.cityLayers[originalCityName];
                    }
                }
            }
        }

        if (foundName && foundLayer) {
            AppState.map.fitBounds(foundLayer.getBounds());
            foundLayer.fire('click');
            showNotification(`Cidade ${foundName} encontrada.`);
            DOMElements.searchInput.value = '';
        } else {
            showNotification(`Cidade "${searchTermOriginal}" não encontrada. Verifique a grafia ou tente um nome mais simples.`, 'warning');
        }
    }

    function handleAddFavorite() {
        if (!AppState.selectedCity) return; if (AppState.favorites.some(f => f.name === AppState.selectedCity.name)) { showNotification(`${AppState.selectedCity.name} já é favorito.`, 'info'); return; }
        AppState.favorites.push({ name: AppState.selectedCity.name, id: AppState.selectedCity.id }); saveDataToLocalStorage(); updateFavoritesList(); resetMapStyles(); showNotification(`${AppState.selectedCity.name} adicionado aos favoritos.`);
    }

    function handleConfirmAssignVendedor() {
        const vendedorId = DOMElements.assignVendedorSelect.value; if (!AppState.selectedCity || !vendedorId) { showNotification('Selecione um vendedor.', 'warning'); return; }
        const cityName = AppState.selectedCity.name; const vendedor = AppState.vendedores.find(v => v.id === vendedorId); if (!vendedor) { showNotification('Vendedor não encontrado.', 'danger'); return; }
        if (!vendedor.cidades.includes(cityName)) vendedor.cidades.push(cityName); else { showNotification('Este vendedor já está atribuído a esta cidade.', 'info'); return; }
        if (!AppState.cityAssignments[cityName]) AppState.cityAssignments[cityName] = []; if (!AppState.cityAssignments[cityName].includes(vendedorId)) AppState.cityAssignments[cityName].push(vendedorId);
        saveDataToLocalStorage(); prepareAssignVendedorModal(); updateSelectedCityInfo(); updateVendedoresList(); resetMapStyles(); showNotification(`${cityName} atribuída a ${vendedor.nome}.`);
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
                await loadGeoJsonWithFallback(dataSet);
            }
            
            if (Object.keys(AppState.cityLayers).length === 0 && 
                (AppConfig.geoJsonSources.some(ds => ds.id.startsWith('municipios')))) {
                 showNotification("Falha ao carregar dados geográficos dos municípios. Algumas funcionalidades podem ser limitadas.", "danger", 10000);
                 console.error("Nenhuma camada de cidade (municípios) foi carregada. Verifique os URLs e a rede.");
            }

            if (Object.keys(AppState.cityPopulations).length === 0) {
                 await fetchCityPopulation(null, true);
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