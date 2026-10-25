/**
 * Roteador Oficial Baseado em Hash & Parâmetros - Analítica Política 2026 (v9.1 - Seção 10)
 * Rotas suportadas com código IBGE de 7 dígitos e parâmetros de turno/cargo/modo.
 */

import { State } from './state.js';

export class AppRouter {
  constructor(app) {
    this.app = app;
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('popstate', () => this.handleRoute());
    this.handleRoute();
  }

  /**
   * Constrói URL canônica compartilhável com base no estado atual da aplicação
   */
  static buildShareUrl() {
    let route = '#/';
    const params = new URLSearchParams();

    // 1. Rota de acordo com a aba e nível
    if (State.activeTab === 'mapa') {
      if (State.selectedCityId) {
        route = `#/mapa/cidade/${State.selectedCityId}`;
      } else if (State.selectedUf) {
        route = `#/mapa/uf/${State.selectedUf}`;
      } else if (State.selectedRegion) {
        route = `#/mapa/regiao/${State.selectedRegion}`;
      } else {
        route = `#/mapa`;
      }
    } else if (State.activeTab === 'comparador') {
      route = `#/comparar/presidente`;
    } else if (State.activeTab === 'parlamentares') {
      const casa = document.getElementById('select-parl-casa')?.value || 'camara';
      route = casa === 'senado' ? `#/congresso/senado` : `#/congresso/camara`;
      const modo = State.parlMode || 'exercicio';
      params.set('modo', modo);
    } else {
      route = `#/`;
    }

    // 2. Parâmetros de turno e cargo
    if (State.electionId === '6257') {
      params.set('turno', '1');
      params.set('cargo', 'presidente');
    } else if (State.electionId === '6260') {
      params.set('turno', '2');
      params.set('cargo', 'governador');
      params.set('uf', State.govUf);
    } else {
      params.set('turno', '2');
      params.set('cargo', 'presidente');
    }

    if (State.isSimulation) {
      params.set('sim', '1');
    }

    const qs = params.toString();
    const origin = window.location.origin + window.location.pathname;
    return `${origin}${route}${qs ? '?' + qs : ''}`;
  }

  /**
   * Analisa e despacha a rota atual do navegador
   */
  handleRoute() {
    const rawHash = window.location.hash || '#/';
    const [pathPart, queryPart] = rawHash.split('?');
    const path = pathPart.replace(/^#\/?/, '').trim();
    const params = new URLSearchParams(queryPart || window.location.search || '');

    // Parâmetro de simulação
    if (params.get('sim') === '1') {
      State.setSimulation(true);
      const btnSim = document.getElementById('btn-simulation-toggle');
      if (btnSim) btnSim.classList.add('active');
    }

    // Parâmetros de eleição
    const turno = params.get('turno');
    const cargo = params.get('cargo');
    const paramUf = params.get('uf');

    if (cargo === 'governador' && turno === '2') {
      State.setElection('6260');
      if (paramUf) State.setGovUf(paramUf);
    } else if (turno === '1') {
      State.setElection('6257');
    } else if (turno === '2') {
      State.setElection('6258');
    }

    // Roteamento por caminho
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      // #/
      State.setActiveTab('apuracao');
    } else if (segments[0] === 'mapa') {
      State.setActiveTab('mapa');
      if (segments[1] === 'regiao' && segments[2]) {
        State.setSelectedRegion(segments[2]);
        if (this.app?.map) this.app.map.selectRegion(segments[2]);
      } else if (segments[1] === 'uf' && segments[2]) {
        State.setSelectedUf(segments[2].toUpperCase());
        if (this.app?.map) this.app.map.selectUf(segments[2].toUpperCase());
      } else if (segments[1] === 'cidade' && segments[2]) {
        const ibgeCode = segments[2];
        State.selectedCityId = ibgeCode;
        if (this.app?.map) this.app.map.selectCityById(ibgeCode);
      } else {
        if (this.app?.map) this.app.map.deselectAll();
      }
    } else if (segments[0] === 'comparar') {
      State.setActiveTab('comparador');
    } else if (segments[0] === 'congresso') {
      State.setActiveTab('parlamentares');
      const casa = segments[1] || 'camara';
      const selCasa = document.getElementById('select-parl-casa');
      if (selCasa) {
        selCasa.value = casa;
        selCasa.dispatchEvent(new Event('change'));
      }
    } else if (segments[0] === 'parlamentar' && segments[1]) {
      State.setActiveTab('parlamentares');
      const parlId = segments[1];
      if (this.app?.parlamentares) {
        this.app.parlamentares.openModalById(parlId);
      }
    } else if (segments[0] === 'sobre') {
      const modal = document.getElementById('sobre-modal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
      }
    }

    // Foco acessível no cabeçalho da seção
    const activeSection = document.querySelector('section:not(.hidden)');
    if (activeSection) {
      const heading = activeSection.querySelector('h1, h2, [tabindex="0"]');
      if (heading) heading.focus?.();
    }
  }

  navigate(newHash) {
    window.location.hash = newHash;
  }
}
