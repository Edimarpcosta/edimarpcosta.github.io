/**
 * TopoJSON Vector Engine - Analítica Política 2026
 * Decodifica instantaneamente arquivos TopoJSON particionados por UF em caminhos SVG limpos (<path d="...">),
 * calculando coordenadas geográficas, polígonos múltiplos e caixa delimitadora (viewBox).
 */

export class TopoJsonEngine {
  constructor() {
    this.cache = new Map(); // ufSigla -> { paths, bounds, rawTopology }
  }

  /**
   * Carrega e decodifica os municípios de uma UF sob demanda.
   * @param {string} uf - Sigla da UF em maiúsculas (ex: 'SP', 'DF', 'AC')
   * @returns {Promise<{ paths: Array<{ id: string, nome: string, uf: string, pop: number, d: string }>, bounds: { minX: number, minY: number, width: number, height: number, viewBox: string } }>}
   */
  async loadUf(uf) {
    const key = String(uf).trim().toUpperCase();
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const file = key.toLowerCase();
    const candidatePaths = [
      `./public/data/municipios_uf/${file}.json`,
      `./data/municipios_uf/${file}.json`,
      `./assets/data/municipios_uf/${file}.json`,
      `../public/data/municipios_uf/${file}.json`
    ];

    let topo = null;
    for (const p of candidatePaths) {
      try {
        const res = await fetch(p);
        if (res.ok) {
          topo = await res.json();
          break;
        }
      } catch (e) {
        // tenta o próximo path
      }
    }

    if (!topo) {
      throw new Error(`Não foi possível carregar a malha municipal da UF ${key}`);
    }

    const decoded = this.decodeTopology(topo, key);
    this.cache.set(key, decoded);
    return decoded;
  }

  /**
   * Decodifica a topologia e seus arcos delta em SVG paths.
   */
  decodeTopology(topo, ufKey) {
    const scale = topo.transform ? topo.transform.scale : [1, 1];
    const trans = topo.transform ? topo.transform.translate : [0, 0];

    // 1. Decodificar todos os arcos delta
    const decodedArcs = (topo.arcs || []).map(arc => {
      let x = 0, y = 0;
      return arc.map(([dx, dy]) => {
        x += dx;
        y += dy;
        return [(x * scale[0] + trans[0]) / 1000.0, -(y * scale[1] + trans[1]) / 1000.0];
      });
    });

    const geometries = topo.objects?.municipios?.geometries || [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const paths = [];

    // 2. Reconstruir anéis poligonais para cada município
    for (const geom of geometries) {
      const props = geom.properties || {};
      const id = String(props.id || '').trim();
      const nome = props.n || 'Município';
      const uf = props.uf || ufKey;
      const pop = props.p || 0;

      const rings = geom.type === 'MultiPolygon' ? geom.arcs : [geom.arcs];
      const dParts = [];

      for (const ringGroup of rings) {
        if (!Array.isArray(ringGroup)) continue;
        for (const arcIndices of ringGroup) {
          if (!Array.isArray(arcIndices)) continue;
          const ring = [];
          for (const arcIdx of arcIndices) {
            const isReversed = arcIdx < 0;
            const idx = isReversed ? ~arcIdx : arcIdx;
            const arcCoords = decodedArcs[idx];
            if (!arcCoords) continue;

            const coords = isReversed ? arcCoords.slice().reverse() : arcCoords;
            const start = ring.length ? 1 : 0;
            for (let i = start; i < coords.length; i++) {
              ring.push(coords[i]);
            }
          }

          if (ring.length > 2) {
            for (const pt of ring) {
              if (pt[0] < minX) minX = pt[0];
              if (pt[1] < minY) minY = pt[1];
              if (pt[0] > maxX) maxX = pt[0];
              if (pt[1] > maxY) maxY = pt[1];
            }
            dParts.push('M ' + ring.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ') + ' Z');
          }
        }
      }

      const d = dParts.join(' ');
      if (d) {
        paths.push({ id, nome, uf, pop, d });
      }
    }

    // Margem de respiro para o viewBox da UF
    const padX = (maxX - minX) * 0.05 || 20;
    const padY = (maxY - minY) * 0.05 || 20;
    const vbMinX = minX - padX;
    const vbMinY = minY - padY;
    const vbWidth = (maxX - minX) + 2 * padX;
    const vbHeight = (maxY - minY) + 2 * padY;

    return {
      paths,
      bounds: {
        minX: vbMinX,
        minY: vbMinY,
        width: vbWidth,
        height: vbHeight,
        viewBox: `${vbMinX.toFixed(1)} ${vbMinY.toFixed(1)} ${vbWidth.toFixed(1)} ${vbHeight.toFixed(1)}`
      }
    };
  }
}
