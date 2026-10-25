/**
 * Gerenciador de Estado Centralizado e Reativo - Analítica Política 2026
 * Aplica as diretrizes de normalização estrita de identificadores e persistência de visualização.
 */

export function removeAccents(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export const State = {
  electionId: '6258', // 6258 (2º Turno Presidencial), 6260 (Governador 2T) ou 6257 (1º Turno)
  govUf: 'DF',        // UF ativa no 2º Turno de Governadores (AC, AM, DF, ES, RN, TO)
  theme: localStorage.getItem('analitica-theme') || 'light', // Light mode por padrão
  isSimulation: false,
  activeLayer: 'winner_margin', // winner_margin, leader_pct, total_votes, sections_pct, turnout, blank_null
  selectedRegion: null, // norte, nordeste, centro-oeste, sudeste, sul
  selectedUf: null,
  selectedMun: null,
  selectedCityId: null,
  activeTab: 'apuracao', // apuracao, mapa, comparador, parlamentares
  
  // Dados recebidos
  nationalData: null,
  ufData: new Map(), // normalizado: siglaUf -> dados
  parlamentares: [],
  municipiosLookup: [],
  
  // Histórico de pontos para curva de evolução
  historyPoints: [],
  
  // Pesos do Índice de Eficiência Parlamentar (soma 100)
  weights: {
    presenca: 30,
    economia: 30,
    atividade: 20,
    transparencia: 20
  },
  
  // Telemetria e Frescor
  telemetry: {
    lastFetchTime: null,
    latencyMs: 120,
    status: 'conectando', // conectando, ao_vivo, lento, offline
    etag: null
  },
  
  // Cache de estado para visualização e exportação (DIRETRIZ MANDATÓRIA)
  cache: {
    filtrados: [],
    ufsOrdenadas: [],
    parlamentaresFiltrados: []
  },
  
  // Listeners de mudança de estado
  _subscribers: new Set(),
  
  /**
   * Normalização estrita de identificadores (DIRETRIZ MANDATÓRIA)
   */
  normalizeId(id) {
    if (id === null || id === undefined) return '';
    return String(id).trim();
  },

  removeAccents(str) {
    return removeAccents(str);
  },

  subscribe(listener) {
    this._subscribers.add(listener);
    return () => this._subscribers.delete(listener);
  },

  notify(event, payload) {
    for (const listener of this._subscribers) {
      try {
        listener(event, payload, this);
      } catch (err) {
        console.error('[State Error]', err);
      }
    }
  },

  setTheme(theme) {
    this.theme = theme === 'dark' ? 'dark' : 'light';
    try {
      localStorage.setItem('analitica-theme', this.theme);
    } catch (e) {}
    
    if (this.theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    this.notify('theme_changed', this.theme);
  },

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  },

  setElection(electionId) {
    this.electionId = this.normalizeId(electionId);
    this.nationalData = null;
    this.ufData.clear();
    this.historyPoints = [];
    this.selectedUf = null;
    this.selectedMun = null;
    this.notify('election_changed', this.electionId);
  },

  setGovUf(uf) {
    this.govUf = this.normalizeId(uf).toUpperCase();
    this.notify('gov_uf_changed', this.govUf);
  },

  setSimulation(enabled) {
    this.isSimulation = Boolean(enabled);
    this.notify('simulation_toggled', this.isSimulation);
  },

  setLayer(layerName) {
    this.activeLayer = layerName;
    this.notify('layer_changed', layerName);
  },

  setSelectedRegion(regionName) {
    this.selectedRegion = regionName ? this.normalizeId(regionName).toLowerCase() : null;
    this.selectedUf = null;
    this.selectedMun = null;
    this.selectedCityId = null;
    this.notify('region_selected', this.selectedRegion);
  },

  setSelectedUf(ufSigla) {
    this.selectedUf = ufSigla ? this.normalizeId(ufSigla).toUpperCase() : null;
    this.selectedMun = null;
    this.selectedCityId = null;
    this.notify('uf_selected', this.selectedUf);
  },

  setSelectedMun(munObj) {
    this.selectedMun = munObj;
    this.notify('mun_selected', munObj);
  },

  setActiveTab(tabName) {
    this.activeTab = tabName;
    this.notify('tab_changed', tabName);
  },

  setNationalData(data, latencyMs = 0, etag = null) {
    this.nationalData = data;
    this.telemetry.lastFetchTime = Date.now();
    this.telemetry.latencyMs = latencyMs;
    this.telemetry.etag = etag;
    this.telemetry.status = 'ao_vivo';
    
    // Armazenar ponto na curva temporal
    if (data && data.s && data.s.pst) {
      const pctNumber = parseFloat(data.s.pst.replace(',', '.'));
      const cargs = data.carg?.[0];
      let bVal = 0, lVal = 0;
      if (cargs?.agr) {
        for (const agr of cargs.agr) {
          for (const par of agr.par || []) {
            for (const cand of par.cand || []) {
              if (cand.n === '22') bVal = parseFloat(cand.pvap?.replace(',', '.') || '0');
              if (cand.n === '13') lVal = parseFloat(cand.pvap?.replace(',', '.') || '0');
            }
          }
        }
      }
      this.historyPoints.push({
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        apurado: pctNumber,
        bolsonaro: bVal,
        lula: lVal
      });
      // Manter histórico razoável
      if (this.historyPoints.length > 50) this.historyPoints.shift();
    }
    
    this.notify('national_data_updated', data);
  },

  setUfData(ufSigla, data) {
    const key = this.normalizeId(ufSigla).toUpperCase();
    this.ufData.set(key, data);
    this.notify('uf_data_updated', { uf: key, data });
  },

  setWeights(w) {
    this.weights = { ...this.weights, ...w };
    this.notify('weights_changed', this.weights);
  }
};
