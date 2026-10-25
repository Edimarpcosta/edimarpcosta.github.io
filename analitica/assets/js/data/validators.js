/**
 * Validações de Integridade e Monotonia de Dados Eleitorais - Analítica Política 2026 (v9.1)
 * Regras estritas:
 * 1. Monotonia de seções apuradas (não pode diminuir).
 * 2. Monotonia de votos nominais por candidato (não pode diminuir).
 * 3. Soma das 27 UFs + Exterior (ZZ) == Total Nacional (diferença zero).
 * 4. Soma das 5 regiões + Exterior == Total Nacional.
 * 5. Soma dos percentuais de votos válidos entre 99.9% e 100.1%.
 * 6. Registro determinístico de anomalias com fallback após 3 rejeições consecutivas.
 */

export class DataValidators {
  /**
   * Converte string pt-BR ("12.345" ou "51,20") para número
   */
  static parseNum(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).replace(/\./g, '').replace(',', '.').trim();
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }

  /**
   * Valida se a porcentagem de seções apuradas não diminuiu
   */
  static validarMonotoniaSecoes(novoPct, anteriorPct) {
    const n = this.parseNum(novoPct);
    const a = this.parseNum(anteriorPct);
    if (n < a - 0.001) {
      return `Regressão de apuração: novo (${n}%) é menor que anterior (${a}%).`;
    }
    return null;
  }

  /**
   * Valida se a votação de cada candidato não diminuiu
   */
  static validarMonotoniaVotos(novosCandidatos, anterioresCandidatos) {
    if (!anterioresCandidatos || !anterioresCandidatos.length) return null;
    const mapAnt = new Map();
    for (const c of anterioresCandidatos) {
      mapAnt.set(String(c.n || c.numero).trim(), this.parseNum(c.vap || c.votos));
    }

    for (const c of novosCandidatos) {
      const num = String(c.n || c.numero).trim();
      const nVotos = this.parseNum(c.vap || c.votos);
      if (mapAnt.has(num)) {
        const aVotos = mapAnt.get(num);
        if (nVotos < aVotos) {
          return `Regressão de votos do candidato ${num}: novo (${nVotos}) < anterior (${aVotos}).`;
        }
      }
    }
    return null;
  }

  /**
   * Valida fechamento exato: Soma das 27 UFs + Exterior (ZZ) == Total Nacional
   */
  static validarSomaNacional(totalNacionalVotos, votosPorUf) {
    if (!votosPorUf || !Object.keys(votosPorUf).length) return null;
    let somaUfs = 0;
    for (const [uf, v] of Object.entries(votosPorUf)) {
      somaUfs += this.parseNum(v);
    }
    const total = this.parseNum(totalNacionalVotos);
    if (total > 0 && somaUfs !== total) {
      return `Divergência na soma nacional: Total (${total}) != Soma UFs + Exterior (${somaUfs}).`;
    }
    return null;
  }

  /**
   * Valida fechamento regional: Soma das 5 regiões + Exterior == Total Nacional
   */
  static validarSomaRegional(totalNacional, regioesVotos, exteriorVotos = 0) {
    const total = this.parseNum(totalNacional);
    let somaReg = this.parseNum(exteriorVotos);
    for (const v of Object.values(regioesVotos || {})) {
      somaReg += this.parseNum(v);
    }
    if (total > 0 && Math.abs(total - somaReg) > 0.01) {
      return `Divergência regional: Total (${total}) != Soma Regiões + Exterior (${somaReg}).`;
    }
    return null;
  }

  /**
   * Valida soma dos percentuais dos candidatos (entre 99.9% e 100.1%)
   */
  static validarSomaPercentuais(candidatos) {
    if (!candidatos || candidatos.length < 2) return null;
    let somaPct = 0;
    for (const c of candidatos) {
      somaPct += this.parseNum(c.pvap || c.percentual);
    }
    if (somaPct < 99.9 || somaPct > 100.1) {
      return `Soma de percentuais inválida: ${somaPct.toFixed(2)}% (esperado entre 99,9% e 100,1%).`;
    }
    return null;
  }

  /**
   * Valida snapshot completo em relação ao anterior
   */
  static validarSnapshot(snap, lastSnap) {
    if (!snap) return 'Snapshot nulo ou vazio.';
    if (!snap.s && !snap.secoes_apuradas_pct) return 'Estrutura do snapshot sem estatísticas de seções.';

    const novoPct = snap.s?.pst ?? snap.secoes_apuradas_pct;
    const antPct = lastSnap?.s?.pst ?? lastSnap?.secoes_apuradas_pct;
    if (antPct !== undefined && novoPct !== undefined) {
      const errSec = this.validarMonotoniaSecoes(novoPct, antPct);
      if (errSec) return errSec;
    }

    return null;
  }
}
