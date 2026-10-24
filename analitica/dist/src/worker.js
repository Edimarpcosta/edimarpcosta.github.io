/**
 * Web Worker Oficial - Polling Resiliente TSE & Agregação em Segundo Plano
 * Implementa a Arquitetura Dual-Engine Failover:
 * 1ª Camada: Proxy Cloudflare Workers / TSE Direto com timeout controlado.
 * 2ª Camada (Failover Automático): Snapshot GitHub Actions RAW live.json com CORS Universal (*).
 */

const TSE_BASE = "https://resultados.tse.jus.br/oficial";
const PRIMARY_PROXY = "https://tse-proxy.edimarpcosta.workers.dev";
const FALLBACK_RAW = "https://raw.githubusercontent.com/edimarpcosta/resultados_politicos/main/analitica/dist/data/live.json";

let pollingInterval = 8000;
let jitterMs = 2000;
let isRunning = false;
let electionId = '6258';
let govUf = 'DF';
let isSimulation = false;
let timerId = null;
let simStep = 0;
let currentBackoff = 0;
let useFallback = false;
let cachedSnapshot = null;

const etags = new Map();

const GOV_SIM_DATA = {
  AC: { n1: '10', nm1: 'ALAN RICK', p1: 'REPUBLICANOS', pct1: 53.2, n2: '11', nm2: 'MAILZA ASSIS', p2: 'PP', pct2: 46.8, te: 588433 },
  AM: { n1: '22', nm1: 'PROFESSORA MARIA DO CARMO', p1: 'PL', pct1: 52.0, n2: '55', nm2: 'OMAR AZIZ', p2: 'PSD', pct2: 48.0, te: 2647820 },
  DF: { n1: '11', nm1: 'CELINA LEAO', p1: 'PP', pct1: 54.0, n2: '43', nm2: 'LEANDRO GRASS', p2: 'PV/PT', pct2: 46.0, te: 2206126 },
  ES: { n1: '10', nm1: 'LORENZO PAZOLINI', p1: 'REPUBLICANOS', pct1: 52.5, n2: '15', nm2: 'RICARDO FERRACO', p2: 'MDB', pct2: 47.5, te: 2921450 },
  RN: { n1: '44', nm1: 'ALLYSON BEZERRA', p1: 'UNIAO', pct1: 53.0, n2: '15', nm2: 'WALTER ALVES', p2: 'MDB', pct2: 47.0, te: 2554720 },
  TO: { n1: '44', nm1: 'PROFESSORA DORINHA', p1: 'UNIAO', pct1: 54.0, n2: '11', nm2: 'VICENTINHO JUNIOR', p2: 'PP', pct2: 46.0, te: 1098240 }
};

function generateWorkerSimData(step, eleId, uf = 'DF') {
  const progress = Math.min(100, Math.max(5, step * 1.5));
  const factor = progress / 100;

  if (eleId === '6257') {
    return {
      ele: "6257",
      t: "1",
      f: "o",
      and: "n",
      tf: "s",
      dg: "04/10/2026",
      hg: "21:30:00",
      s: { ts: "499248", st: "499248", pst: "100,00" },
      e: { te: "158745502", c: "125275835", pc: "78,92", a: "33469244", pa: "21,08" },
      v: { tv: "125275835", vvc: "119300788", pvvc: "95,23", vb: "2300798", pvb: "1,84", tvn: "3674249", ptvn: "2,93" },
      carg: [{
        cd: "1",
        nmn: "Presidente",
        agr: [
          { par: [{ cand: [{ n: "22", nm: "FLAVIO NANTES BOLSONARO", nmu: "FLAVIO BOLSONARO", vap: "56104503", pvap: "47,03", st: "2º turno", dvt: "Válido" }] }] },
          { par: [{ cand: [{ n: "13", nm: "LUIZ INACIO LULA DA SILVA", nmu: "LULA", vap: "53879538", pvap: "45,16", st: "2º turno", dvt: "Válido" }] }] },
          { par: [{ cand: [{ n: "70", nm: "AUGUSTO JORGE CURY", nmu: "ESCRITOR AUGUSTO CURY", vap: "3448569", pvap: "2,89", st: "Não eleito", dvt: "Válido" }] }] },
          { par: [{ cand: [{ n: "14", nm: "RENAN CALHEIROS SANTOS", nmu: "RENAN SANTOS", vap: "2675887", pvap: "2,24", st: "Não eleito", dvt: "Válido" }] }] },
          { par: [{ cand: [{ n: "55", nm: "RONALDO RAMOS CAIADO", nmu: "RONALDO CAIADO", vap: "2605148", pvap: "2,18", st: "Não eleito", dvt: "Válido" }] }] },
          { par: [{ cand: [{ n: "30", nm: "ROMEO ZEMA NETO", nmu: "ZEMA", vap: "326488", pvap: "0,27", st: "Não eleito", dvt: "Válido" }] }] }
        ]
      }]
    };
  }

  if (eleId === '6260') {
    const g = GOV_SIM_DATA[uf] || GOV_SIM_DATA.DF;
    const totalValidos = Math.round(g.te * 0.76 * factor);
    const v1 = Math.round(totalValidos * (g.pct1 / 100));
    const v2 = totalValidos - v1;

    return {
      ele: "6260",
      uf: uf,
      t: "2",
      and: progress < 100 ? "s" : "n",
      tf: progress >= 100 ? "s" : "n",
      dg: "25/10/2026",
      hg: "18:45:00",
      s: {
        ts: "7000",
        st: String(Math.round(7000 * factor)),
        pst: progress.toFixed(2).replace('.', ',')
      },
      e: {
        te: String(g.te),
        c: String(Math.round(g.te * 0.8 * factor)),
        pc: "80,00",
        a: String(Math.round(g.te * 0.2 * factor)),
        pa: "20,00"
      },
      v: {
        tv: String(Math.round(g.te * 0.8 * factor)),
        vvc: String(totalValidos),
        pvvc: "95,00",
        vb: String(Math.round(g.te * 0.02 * factor)),
        pvb: "2,00",
        tvn: String(Math.round(g.te * 0.03 * factor)),
        ptvn: "3,00"
      },
      carg: [{
        cd: "3",
        nmn: `Governador - ${uf}`,
        agr: [
          {
            par: [{
              cand: [{
                n: g.n1,
                nm: g.nm1,
                nmu: g.nm1,
                vap: String(v1),
                pvap: g.pct1.toFixed(2).replace('.', ','),
                st: progress >= 100 ? "Eleito" : ""
              }]
            }]
          },
          {
            par: [{
              cand: [{
                n: g.n2,
                nm: g.nm2,
                nmu: g.nm2,
                vap: String(v2),
                pvap: g.pct2.toFixed(2).replace('.', ','),
                st: progress >= 100 ? "Não eleito" : ""
              }]
            }]
          }
        ]
      }]
    };
  }

  const baseBolsonaro = Math.round(59800000 * factor);
  const baseLula = Math.round(57900000 * factor);
  const totalValidos = baseBolsonaro + baseLula;
  const pctB = totalValidos > 0 ? (baseBolsonaro / totalValidos * 100).toFixed(2).replace('.', ',') : '0,00';
  const pctL = totalValidos > 0 ? (baseLula / totalValidos * 100).toFixed(2).replace('.', ',') : '0,00';

  return {
    ele: eleId,
    t: "2",
    f: "o",
    and: progress < 100 ? "s" : "n",
    tf: progress >= 100 ? "s" : "n",
    dg: "25/10/2026",
    hg: "18:42:00",
    s: {
      ts: "499248",
      st: String(Math.round(499248 * factor)),
      pst: progress.toFixed(2).replace('.', ',')
    },
    e: {
      te: "158745502",
      c: String(Math.round(125000000 * factor)),
      pc: "78,90",
      a: String(Math.round(33745502 * factor)),
      pa: "21,10"
    },
    v: {
      tv: String(Math.round(125000000 * factor)),
      vvc: String(totalValidos),
      pvvc: "95,20",
      vb: String(Math.round(2300000 * factor)),
      pvb: "1,84",
      tvn: String(Math.round(3600000 * factor)),
      ptvn: "2,96"
    },
    carg: [{
      cd: "1",
      nmn: "Presidente",
      agr: [
        {
          par: [{
            cand: [{
              n: "22",
              nm: "FLAVIO NANTES BOLSONARO",
              nmu: "FLAVIO BOLSONARO",
              vap: String(baseBolsonaro),
              pvap: pctB,
              st: progress >= 100 ? "Eleito" : ""
            }]
          }]
        },
        {
          par: [{
            cand: [{
              n: "13",
              nm: "LUIZ INACIO LULA DA SILVA",
              nmu: "LULA",
              vap: String(baseLula),
              pvap: pctL,
              st: progress >= 100 ? "Não eleito" : ""
            }]
          }]
        }
      ]
    }]
  };
}

async function getLiveSnapshot() {
  if (cachedSnapshot) return cachedSnapshot;
  const candidatePaths = [
    './public/data/live.json',
    './data/live.json',
    './assets/data/live.json',
    FALLBACK_RAW
  ];
  for (const p of candidatePaths) {
    try {
      const res = await fetch(p, { cache: 'no-cache' });
      if (res.ok) {
        cachedSnapshot = await res.json();
        return cachedSnapshot;
      }
    } catch (e) {}
  }
  return null;
}

async function pollOnce() {
  if (!isRunning) return;

  const start = performance.now();

  if (isSimulation) {
    simStep = (simStep + 1) % 100;
    const simData = generateWorkerSimData(simStep, electionId, govUf);
    currentBackoff = 0;
    postMessage({
      type: 'DATA_UPDATE',
      isSimulation: true,
      data: simData,
      latency: 35,
      timestamp: Date.now()
    });
    scheduleNext();
    return;
  }

  let targetPath = '';
  if (electionId === '6260') {
    const ufL = govUf.toLowerCase();
    targetPath = `ele2026/6260/dados/${ufL}/${ufL}-c0003-e006260-u.json`;
  } else {
    targetPath = `ele2026/${electionId}/dados/br/br-c0001-e00${electionId}-u.json`;
  }

  // 1ª Linha: Tentativa via TSE Direto ou Proxy Cloudflare
  if (!useFallback) {
    try {
      const directUrl = `${TSE_BASE}/${targetPath}`;
      const res = await fetch(directUrl, { headers: { 'Accept': 'application/json' }, cache: 'no-cache' });
      const latency = Math.round(performance.now() - start);

      if (res.status === 304) {
        currentBackoff = 0;
        postMessage({ type: 'NOT_MODIFIED', latency, timestamp: Date.now() });
        scheduleNext();
        return;
      }

      if (res.ok) {
        currentBackoff = 0;
        const etag = res.headers.get('ETag');
        if (etag) etags.set(directUrl, etag);
        const data = await res.json();
        postMessage({ type: 'DATA_UPDATE', data, latency, etag, timestamp: Date.now() });
        scheduleNext();
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (directErr) {
      // Tentar via proxy
      try {
        const proxyUrl = `${PRIMARY_PROXY}/${targetPath}`;
        const res = await fetch(proxyUrl, { headers: { 'Accept': 'application/json' }, cache: 'no-cache' });
        const latency = Math.round(performance.now() - start);
        if (res.ok) {
          currentBackoff = 0;
          const data = await res.json();
          postMessage({ type: 'DATA_UPDATE', data, latency, timestamp: Date.now() });
          scheduleNext();
          return;
        }
      } catch (proxyErr) {
        useFallback = true;
      }
    }
  }

  // 2ª Linha: Failover para Snapshot Consolidado live.json
  try {
    const snapshot = await getLiveSnapshot();
    const latency = Math.round(performance.now() - start);

    if (snapshot) {
      let data = null;
      if (electionId === '6260') {
        data = snapshot.eleicoes?.['6260']?.governadores?.[govUf.toUpperCase()];
      } else {
        data = snapshot.eleicoes?.[electionId];
      }

      if (data) {
        currentBackoff = 0;
        postMessage({
          type: 'DATA_UPDATE',
          data,
          latency: Math.max(30, latency),
          etag: 'snapshot-raw',
          timestamp: Date.now()
        });
        scheduleNext();
        return;
      }
    }
  } catch (snapErr) {}

  // Fallback final: simulação com os candidatos corretos
  const simData = generateWorkerSimData(simStep, electionId, govUf);
  postMessage({
    type: 'DATA_UPDATE',
    isSimulation: true,
    data: simData,
    latency: 40,
    timestamp: Date.now()
  });
  scheduleNext();
}

function scheduleNext() {
  if (isRunning) {
    const jitter = Math.floor((Math.random() - 0.5) * jitterMs * 2);
    const nextInterval = Math.max(5000, pollingInterval + currentBackoff + jitter);
    timerId = setTimeout(pollOnce, nextInterval);
  }
}

self.onmessage = function (e) {
  const { action, payload } = e.data || {};

  switch (action) {
    case 'START':
      electionId = payload?.electionId || electionId;
      govUf = payload?.govUf ? payload.govUf.toUpperCase() : govUf;
      isSimulation = Boolean(payload?.isSimulation);
      pollingInterval = payload?.interval || pollingInterval;
      if (!isRunning) {
        isRunning = true;
        pollOnce();
      }
      break;

    case 'STOP':
      isRunning = false;
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      break;

    case 'CONFIG':
      if (payload?.electionId) electionId = payload.electionId;
      if (payload?.govUf) govUf = payload.govUf.toUpperCase();
      if (payload?.isSimulation !== undefined) isSimulation = payload.isSimulation;
      if (payload?.interval) pollingInterval = payload.interval;
      if (payload?.resetFallback) useFallback = false;
      break;

    case 'FETCH_NOW':
      if (timerId) clearTimeout(timerId);
      pollOnce();
      break;
  }
};
