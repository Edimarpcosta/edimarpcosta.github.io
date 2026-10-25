/**
 * Aplicação Principal - Analítica Política 2026
 * Orquestra Web Worker, Aba Líder (Web Locks), Mapa SVG, Placar e Módulo Parlamentar.
 */

import { State } from './state.js';
import { TseClient } from './tse_client.js';
import { BrazilMap } from './map/brazil_map.js';
import { PlacarUI } from './ui/placar.js';
import { TimelineChart } from './ui/grafico.js';
import { ComparadorUI } from './ui/comparador.js';
import { ParlamentaresUI } from './ui/parlamentares.js';
import { RegionAnalyticsUI } from './ui/region_analytics.js';
import { FeedUI } from './ui/feed.js';
import { HemicycleUI } from './ui/hemicycle.js';
import { LiveStateMachine } from './data/live_state.js';
import { FreshnessBarUI } from './ui/freshness_bar.js';
import { CreditsUI } from './ui/credits.js';
import { AppRouter } from './router.js';

class App {
  constructor() {
    this.tseClient = new TseClient();
    this.worker = null;
    this.isLeader = false;
    this.broadcastChannel = null;
    this.pollTimer = null;
  }

  async init() {
    this.showLoading("Inicializando Analítica Política 2026...");
    try {
      this.initBroadcastAndLocks();
      this.initUiComponents();
      this.updateThemeButton();
      this.setupGlobalEvents();
      await this.loadStaticData();
      await this.initialFetch();
      this.startPolling();
    } catch (err) {
      console.error("[App Init Error]", err);
    } finally {
      // Bloco finally obrigatório (DIRETRIZ MANDATÓRIA)
      this.hideLoading();
    }
  }

  showLoading(msg = "Carregando...") {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-msg');
    if (overlay) {
      if (text) text.innerText = msg;
      overlay.classList.remove('hidden');
      overlay.style.display = 'flex'; // Abertura redundante
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none'; // Fechamento redundante
    }
  }

  initBroadcastAndLocks() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('analitica_tse_channel');
      this.broadcastChannel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'TSE_UPDATE' && !this.isLeader) {
          State.setNationalData(payload.data, payload.latency, payload.etag);
        }
      };
    }

    // Coordenação de Aba Líder com navigator.locks
    if (navigator.locks) {
      navigator.locks.request('tse_polling_leader', { mode: 'exclusive' }, async () => {
        this.isLeader = true;
        console.log('[App] Esta aba é a Líder de Polling do TSE.');
        // Mantém a lock indefinidamente enquanto a aba estiver aberta
        return new Promise(() => {});
      }).catch(err => {
        console.warn('[App] Web Locks indisponível, fallback para polling individual:', err);
        this.isLeader = true;
      });
    } else {
      this.isLeader = true;
    }
  }

  initUiComponents() {
    this.liveState = new LiveStateMachine();
    this.freshnessBar = new FreshnessBarUI('freshness-bar-container', this.liveState);
    this.freshnessBar.init();

    this.credits = new CreditsUI('sobre-modal');
    this.credits.init();

    this.placar = new PlacarUI('scoreboard-container', 'banner-status', 'metrics-strip', 'telemetry-status');
    this.map = new BrazilMap('svg-map-container', 'detail-panel-container', 'map-tooltip', this.tseClient);
    this.chart = new TimelineChart('timeline-canvas');
    this.comparador = new ComparadorUI('side-by-side-container', 'analytical-table-container');
    this.parlamentares = new ParlamentaresUI('parlamentares-container', 'efficiency-formula-card');
    this.regionAnalytics = new RegionAnalyticsUI('region-analytics-container');
    this.feed = new FeedUI('live-feed-container');
    this.hemicycle = new HemicycleUI('hemicycle-container');

    this.map.init();
    this.comparador.init();
    this.regionAnalytics.render();
    this.feed.init();
    this.hemicycle.init();

    this.router = new AppRouter(this);
    this.router.init();

    // Inscrever componentes nas mudanças de State
    State.subscribe((event, payload) => {
      switch (event) {
        case 'national_data_updated':
          this.placar.update(payload);
          this.chart.render();
          this.comparador.render();
          this.regionAnalytics.render();
          if (payload) {
            this.liveState.registerSuccess(payload);
            this.feed.processSnapshot(payload);
          }
          break;

        case 'uf_data_updated':
          this.map.updateColors();
          this.comparador.render();
          this.regionAnalytics.render();
          if (payload && payload.uf && payload.data) {
            this.feed.processUfUpdate(payload.uf, payload.data);
          }
          break;

        case 'layer_changed':
          this.map.updateColors();
          break;

        case 'election_changed':
          if (this.map) this.map.deselectUf();
          if (this.placar) this.placar.renderWaitingState();
          this.handleElectionChanged();
          break;

        case 'gov_uf_changed':
          if (this.map) this.map.deselectUf();
          if (this.placar) this.placar.renderWaitingState();
          this.handleElectionChanged();
          break;

        case 'theme_changed':
          this.updateThemeButton();
          break;

        case 'simulation_toggled':
          this.handleSimulationToggled();
          break;

        case 'tab_changed':
          this.handleTabChanged(payload);
          break;
      }
    });
  }

  async loadStaticData() {
    // Carregar busca de municípios
    const munPaths = [
      './public/data/municipios_lookup.json',
      './data/municipios_lookup.json',
      './assets/data/municipios_lookup.json'
    ];
    for (const p of munPaths) {
      try {
        const res = await fetch(p);
        if (res.ok) {
          State.municipiosLookup = await res.json();
          break;
        }
      } catch (e) {
        // tenta proximo path
      }
    }

    // Carregar parlamentares
    const parlPaths = [
      './public/data/parlamentares.json',
      './data/parlamentares.json',
      './assets/data/parlamentares.json'
    ];
    for (const p of parlPaths) {
      try {
        const resP = await fetch(p);
        if (resP.ok) {
          State.parlamentares = await resP.json();
          this.parlamentares.init();
          break;
        }
      } catch (e) {
        // tenta proximo path
      }
    }
  }

  async initialFetch() {
    try {
      const res = await this.tseClient.fetchNational(State.electionId, State.isSimulation, State.govUf);
      if (res && res.data) {
        if (this.liveState) this.liveState.registerSuccess(res.data);
        State.setNationalData(res.data, res.latency, res.etag);
      }
    } catch (err) {
      console.warn('[App] Falha no fetch nacional inicial, o worker continuará tentando:', err);
      if (this.liveState) this.liveState.registerFailure(err);
      State.telemetry.status = 'offline';
      this.placar.renderWaitingState();
    }

    // Pré-carregar dados das principais UFs para o mapa em paralelo
    const initialUfs = State.electionId === '6260'
      ? ['AC', 'AM', 'DF', 'ES', 'RN', 'TO']
      : ['SP', 'RJ', 'MG', 'BA', 'RS', 'PR', 'PE', 'CE', 'DF', 'SC', 'GO'];

    await Promise.allSettled(initialUfs.map(async (uf) => {
      try {
        const uRes = await this.tseClient.fetchUf(uf, State.electionId, State.isSimulation);
        if (uRes && uRes.data) {
          State.setUfData(uf, uRes.data);
        }
      } catch (err) {
        // silencioso
      }
    }));
    this.map.updateColors();
  }

  startPolling() {
    if (window.Worker) {
      try {
        const isDist = window.location.pathname.includes('/dist/') || Boolean(document.querySelector('script[src*="assets/js"]'));
        const workerPath = isDist ? './assets/js/worker.js' : './src/worker.js';
        this.worker = new Worker(workerPath);
        this.worker.onmessage = (e) => {
          const { type, data, latency, etag } = e.data || {};
          if (type === 'DATA_UPDATE' && data) {
            if (data.ele && String(data.ele) !== String(State.electionId)) {
              return;
            }
            State.setNationalData(data, latency, etag);
            if (this.broadcastChannel && this.isLeader) {
              this.broadcastChannel.postMessage({
                type: 'TSE_UPDATE',
                payload: { data, latency, etag }
              });
            }
          }
        };

        this.worker.postMessage({
          action: 'START',
          payload: {
            electionId: State.electionId,
            govUf: State.govUf,
            isSimulation: State.isSimulation,
            interval: 8000
          }
        });
        return;
      } catch (e) {
        console.warn('[App] Web Worker bloqueado, usando fallback setInterval:', e);
      }
    }

    // Fallback caso Worker não seja suportado
    this.pollTimer = setInterval(async () => {
      if (!this.isLeader || document.hidden) return;
      const res = await this.tseClient.fetchNational(State.electionId, State.isSimulation, State.govUf);
      if (res && res.data && !res.notModified) {
        State.setNationalData(res.data, res.latency, res.etag);
      }
    }, 8000);
  }

  setupGlobalEvents() {
    // Seletor de Eleição
    const electionSelect = document.getElementById('select-election');
    if (electionSelect) {
      electionSelect.addEventListener('change', (e) => {
        State.setElection(e.target.value);
        this.updateUrlHash();
      });
    }

    // Seletor de Estado de Governador 2T (ID 6260)
    const selectGov = document.getElementById('select-gov-state');
    if (selectGov) {
      selectGov.value = State.govUf;
      selectGov.addEventListener('change', (e) => {
        State.setGovUf(e.target.value);
      });
    }

    // Toggle de Tema Claro / Escuro
    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
      this.updateThemeButton();
      btnTheme.addEventListener('click', () => {
        State.toggleTheme();
      });
    }

    // Toggle Simulação
    const btnSim = document.getElementById('btn-simulation-toggle');
    if (btnSim) {
      btnSim.addEventListener('click', () => {
        State.setSimulation(!State.isSimulation);
        btnSim.classList.toggle('active', State.isSimulation);
        this.updateUrlHash();
      });
    }

    // Tabs de Navegação
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        State.setActiveTab(tab);
        this.updateUrlHash();
      });
    });

    // Camadas do Mapa
    document.querySelectorAll('.layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const layer = btn.getAttribute('data-layer');
        State.setLayer(layer);
        this.updateUrlHash();
      });
    });

    // Compartilhar Visão
    document.getElementById('btn-share-view')?.addEventListener('click', () => {
      this.openShareModal();
    });

    const btnCopy = document.getElementById('btn-copy-share');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const input = document.getElementById('share-url-input');
        if (input) {
          input.select();
          if (navigator.clipboard) {
            navigator.clipboard.writeText(input.value);
          }
          const orig = btnCopy.textContent;
          btnCopy.textContent = '✓ Copiado!';
          setTimeout(() => { btnCopy.textContent = orig; }, 2000);
        }
      });
    }

    // Atualização manual
    document.getElementById('btn-refresh-now')?.addEventListener('click', async () => {
      this.showLoading("Atualizando dados do TSE...");
      try {
        const res = await this.tseClient.fetchNational(State.electionId, State.isSimulation, State.govUf);
        if (res && res.data) {
          State.setNationalData(res.data, res.latency, res.etag);
        }
      } finally {
        this.hideLoading();
      }
    });

    // Page Visibility API
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isLeader) {
        this.tseClient.fetchNational(State.electionId, State.isSimulation, State.govUf).then(res => {
          if (res && res.data) State.setNationalData(res.data, res.latency, res.etag);
        });
      }
    });

    // Fechamento de Modais (DIRETRIZ MANDATÓRIA: Fechamento Redundante)
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        }
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        }
      });
    });
  }

  handleElectionChanged() {
    const selectGov = document.getElementById('select-gov-state');
    if (selectGov) {
      if (State.electionId === '6260') {
        selectGov.classList.remove('hidden');
        selectGov.style.display = 'inline-block';
      } else {
        selectGov.classList.add('hidden');
        selectGov.style.display = 'none';
      }
    }

    if (this.tseClient) {
      this.tseClient.useFallback = false;
    }

    this.showLoading(`Carregando eleição ID ${State.electionId}...`);
    this.initialFetch().finally(() => this.hideLoading());

    if (this.worker) {
      this.worker.postMessage({
        action: 'CONFIG',
        payload: { electionId: State.electionId, isSimulation: State.isSimulation, govUf: State.govUf, resetFallback: true }
      });
    }
  }

  updateThemeButton() {
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (State.theme === 'dark') {
      document.body.classList.add('dark-theme');
      if (icon) icon.textContent = '☀️';
      if (label) label.textContent = 'Claro';
    } else {
      document.body.classList.remove('dark-theme');
      if (icon) icon.textContent = '🌙';
      if (label) label.textContent = 'Escuro';
    }
  }

  handleSimulationToggled() {
    const banner = document.getElementById('simulation-banner');
    if (banner) {
      if (State.isSimulation) {
        banner.classList.remove('hidden');
        banner.style.display = 'block';
      } else {
        banner.classList.add('hidden');
        banner.style.display = 'none';
      }
    }

    if (this.worker) {
      this.worker.postMessage({
        action: 'CONFIG',
        payload: { isSimulation: State.isSimulation }
      });
    }
    this.initialFetch();
  }

  handleTabChanged(tabName) {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Alternar visibilidade das seções
    const secApuracao = document.getElementById('section-apuracao');
    const secMapa = document.getElementById('section-mapa');
    const secComparador = document.getElementById('section-comparador');
    const secParlamentar = document.getElementById('section-parlamentar');

    const sections = {
      apuracao: secApuracao,
      mapa: secMapa,
      comparador: secComparador,
      parlamentares: secParlamentar
    };

    for (const [key, el] of Object.entries(sections)) {
      if (!el) continue;
      if (key === tabName) {
        el.classList.remove('hidden');
        el.style.display = 'flex';
      } else {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    }

    // Trigger de resize para gráficos
    if (tabName === 'apuracao') {
      setTimeout(() => {
        this.chart.resizeCanvas();
        this.chart.render();
      }, 50);
    }
  }

  parseUrlHash() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('sim') === '1') {
      State.setSimulation(true);
      const btnSim = document.getElementById('btn-simulation-toggle');
      if (btnSim) btnSim.classList.add('active');
    }

    if (!hash) return;

    const parts = hash.split('/');
    for (let i = 0; i < parts.length; i += 2) {
      const key = parts[i];
      const val = parts[i + 1];
      if (!val) continue;

      if (key === 'eleicao') {
        State.electionId = val;
        const sel = document.getElementById('select-election');
        if (sel) sel.value = val;
      } else if (key === 'uf') {
        State.selectedUf = val.toUpperCase();
      } else if (key === 'camada') {
        State.activeLayer = val;
      } else if (key === 'tab') {
        State.activeTab = val;
      }
    }
  }

  updateUrlHash() {
    const full = AppRouter.buildShareUrl();
    const hashIdx = full.indexOf('#');
    if (hashIdx !== -1) {
      const canonicalHash = full.substring(hashIdx);
      if (window.location.hash !== canonicalHash) {
        history.replaceState(null, '', canonicalHash);
      }
    }
  }

  openShareModal() {
    const modal = document.getElementById('share-modal');
    const input = document.getElementById('share-url-input');
    if (!modal || !input) return;

    input.value = AppRouter.buildShareUrl();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

// Inicialização segura ao carregar o DOM
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
