/**
 * Motor TopoJSON Vetorial no Cliente - Analítica Política 2026 (v9.1 - Seção 5.2)
 * Decodifica deltas e transforma arcos sem divisão por 1000 e sem inversão de Y no cliente.
 * As malhas municipais do build já entregam coordenadas reprojetadas com Y crescente para baixo.
 */

// Decodificação delta + transform (padrão TopoJSON)
export function decodeArcs(topology) {
  const [sx, sy] = topology.transform?.scale ?? [1, 1];
  const [tx, ty] = topology.transform?.translate ?? [0, 0];
  return (topology.arcs || []).map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
}

// Polygon e MultiPolygon -> atributo "d" do SVG. Índices negativos (~i) invertem o arco.
export function geometryToPath(geom, arcs) {
  const polygons = geom.type === 'MultiPolygon' ? geom.arcs
                 : geom.type === 'Polygon' ? [geom.arcs] : [];
  const parts = [];
  for (const polygon of polygons) {
    for (const ringArcs of polygon) {
      const ring = [];
      ringArcs.forEach((idx, k) => {
        const pts = idx < 0 ? arcs[~idx].slice().reverse() : arcs[idx];
        if (!pts) return;
        for (let i = k === 0 ? 0 : 1; i < pts.length; i++) {
          ring.push(pts[i]); // une arcos sem repetir o ponto de junção
        }
      });
      if (ring.length > 2) {
        parts.push('M' + ring.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z');
      }
    }
  }
  return parts.join(' ');
}

// Caixa delimitadora a partir dos pontos decodificados dos arcos usados pela UF
export function bbox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

export class TopoJsonEngine {
  constructor() {
    this.cache = new Map();
  }

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
        // tenta proximo path
      }
    }

    if (!topo) {
      throw new Error(`Não foi possível carregar a malha municipal da UF ${key}`);
    }

    const decoded = this.decodeTopology(topo, key);
    this.cache.set(key, decoded);
    return decoded;
  }

  decodeTopology(topo, ufKey) {
    const arcs = decodeArcs(topo);
    const geometries = topo.objects?.municipios?.geometries || [];
    const paths = [];

    let allPoints = [];

    for (const geom of geometries) {
      const props = geom.properties || {};
      const id = String(props.id || '').trim();
      const nome = props.n || 'Município';
      const uf = props.uf || ufKey;
      const pop = props.p || 0;

      const d = geometryToPath(geom, arcs);
      if (d) {
        paths.push({ id, nome, uf, pop, d });
      }

      // Coletar pontos para bbox
      const rings = geom.type === 'MultiPolygon' ? geom.arcs : [geom.arcs];
      for (const ringGroup of rings) {
        if (!Array.isArray(ringGroup)) continue;
        for (const arcIndices of ringGroup) {
          if (!Array.isArray(arcIndices)) continue;
          for (const arcIdx of arcIndices) {
            const idx = arcIdx < 0 ? ~arcIdx : arcIdx;
            const pts = arcs[idx];
            if (pts) {
              for (const pt of pts) allPoints.push(pt);
            }
          }
        }
      }
    }

    const box = bbox(allPoints);
    const padX = (box.width * 0.05) || 20;
    const padY = (box.height * 0.05) || 20;
    const vbMinX = box.minX - padX;
    const vbMinY = box.minY - padY;
    const vbWidth = box.width + 2 * padX;
    const vbHeight = box.height + 2 * padY;

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
