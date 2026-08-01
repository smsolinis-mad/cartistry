// Bloque 15 — Motor de recomendación.
//
// Más allá de optimizar lo que el usuario tiene, sugiere lo que debería
// haber: "te falta un producto de precio X para Goldilocks", "tu zona caja
// no tiene mini-margen alto", "el 40% de tu exposición es de la misma
// categoría — riesgo de canibalización", etc.
//
// Determinista. Sin side-effects. Lee del estado final del motor.

import { Product, PlanogramPosition } from '@cartistry/types';
import { SpaceMap } from './position-scorer';

export interface Recommendation {
  code: string;
  /** Tipo: oportunidad (algo falta) | warning (algo que sobra) | tendencia (señal débil) */
  kind: 'oportunidad' | 'warning' | 'tendencia';
  /** Mensaje listo para mostrar al usuario. */
  message: string;
  /** Contexto opcional. */
  productEans?: string[];
  zoneId?: string;
}

export interface RecommenderInput {
  products: Product[];
  positions: PlanogramPosition[];
  baldaAsignaciones: Map<string, { products: string[]; espacioUsado: number }>;
  spaceMap?: SpaceMap;
}

/** Goldilocks de precio: si no hay un producto de precio intermedio entre
 * el más barato y el más caro de la zona, falta el "ancla" psicológica. */
function recommendGoldilocks(input: RecommenderInput): Recommendation[] {
  const recs: Recommendation[] = [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  for (const [baldaId, asig] of Array.from(input.baldaAsignaciones.entries())) {
    if (asig.products.length < 2) continue;
    const precios = asig.products
      .map((e) => Number(productByEan.get(e)?.pvp) || 0)
      .filter((x) => x > 0)
      .sort((a, b) => a - b);
    if (precios.length < 2) continue;
    const min = precios[0];
    const max = precios[precios.length - 1];
    if (max / min < 3) continue; // poco rango, no aplica
    // ¿Hay producto cercano al precio medio?
    const medio = (min + max) / 2;
    const ventana = medio * 0.25; // ±25%
    const hayMedio = precios.some((p) => Math.abs(p - medio) <= ventana);
    if (!hayMedio) {
      recs.push({
        code: 'REC-GOLDILOCKS',
        kind: 'oportunidad',
        message: `Balda ${baldaId.slice(-12)} salta de ${min.toFixed(2)}€ a ${max.toFixed(2)}€ sin precio intermedio. Te falta un producto cerca de ${medio.toFixed(2)}€ ±${ventana.toFixed(2)} para activar el efecto Goldilocks.`,
      });
    }
  }
  return recs;
}

/** Concentración de categoría: si una `division` ocupa >40% de la
 * exposición, hay riesgo de canibalización. */
function recommendDiversificacion(input: RecommenderInput): Recommendation[] {
  const recs: Recommendation[] = [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  const totalAsignaciones = Array.from(input.baldaAsignaciones.values()).reduce(
    (acc, a) => acc + a.products.length,
    0
  );
  if (totalAsignaciones < 5) return recs;

  const divisionCount = new Map<string, number>();
  for (const asig of Array.from(input.baldaAsignaciones.values())) {
    for (const ean of asig.products) {
      const div = (productByEan.get(ean)?.division || '').trim();
      if (!div) continue;
      divisionCount.set(div, (divisionCount.get(div) || 0) + 1);
    }
  }

  Array.from(divisionCount.entries()).forEach(([div, count]) => {
    const pct = (count / totalAsignaciones) * 100;
    if (pct > 40) {
      recs.push({
        code: 'REC-CANIBAL',
        kind: 'warning',
        message: `La división "${div}" ocupa ${pct.toFixed(0)}% de la exposición (${count}/${totalAsignaciones}). Riesgo de canibalización interna — diversifica.`,
      });
    }
  });
  return recs;
}

/** Zona caja sin producto mini de margen alto = pérdida de venta impulsiva. */
function recommendZonaCaja(input: RecommenderInput): Recommendation[] {
  if (!input.spaceMap) return [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  const baldasCaja = new Set<string>();
  for (const p of input.spaceMap.positions) {
    if (p.flags.isZonaCaja) baldasCaja.add(p.baldaId);
  }
  if (baldasCaja.size === 0) return [];

  let tieneMiniMargen = false;
  Array.from(baldasCaja).forEach((id) => {
    const asig = input.baldaAsignaciones.get(id);
    if (!asig) return;
    for (const ean of asig.products) {
      const prod = productByEan.get(ean);
      if (!prod) continue;
      const esMini = (Number(prod.medida_largo) || 0) < 15;
      const margen = (Number(prod.pvp) || 0) - (Number(prod.precio_compra) || 0);
      if (esMini && margen > 0) {
        tieneMiniMargen = true;
        break;
      }
    }
  });

  if (!tieneMiniMargen) {
    return [{
      code: 'REC-CAJA',
      kind: 'oportunidad',
      message: `Tu zona de caja no tiene producto mini (<15cm) con margen positivo. Estás perdiendo venta impulsiva — añade complementos pequeños rentables.`,
    }];
  }
  return [];
}

/** Sin novedad en escaparate durante varias semanas → tráfico de
 * repetición cae. Detectable comparando con el `previousPositions` que
 * recibe el motor. Como el recomendador no recibe el diff directamente,
 * lo aproximamos: si ningún producto de la balda de escaparate fue
 * añadido este ciclo (todos son "stayed"), sugerimos rotar. */
function recommendEscaparateEstancado(
  input: RecommenderInput,
  movementsByEan: Map<string, 'added' | 'removed' | 'moved' | 'stayed'>
): Recommendation[] {
  if (!input.spaceMap) return [];
  const baldasEscaparate = new Set<string>();
  for (const p of input.spaceMap.positions) {
    if (p.flags.isEscaparate) baldasEscaparate.add(p.baldaId);
  }
  if (baldasEscaparate.size === 0 || movementsByEan.size === 0) return [];

  const recs: Recommendation[] = [];
  Array.from(baldasEscaparate).forEach((id) => {
    const asig = input.baldaAsignaciones.get(id);
    if (!asig || asig.products.length === 0) return;
    const allStayed = asig.products.every(
      (e) => movementsByEan.get(e) === 'stayed'
    );
    if (allStayed) {
      recs.push({
        code: 'REC-ESCAPARATE',
        kind: 'tendencia',
        message: `Escaparate sin cambios respecto al planograma anterior. El tráfico de repetición puede estar cayendo — rota al menos un producto.`,
        zoneId: id,
      });
    }
  });
  return recs;
}

export function runRecommender(
  input: RecommenderInput,
  movementsByEan: Map<string, 'added' | 'removed' | 'moved' | 'stayed'> = new Map()
): Recommendation[] {
  return [
    ...recommendGoldilocks(input),
    ...recommendDiversificacion(input),
    ...recommendZonaCaja(input),
    ...recommendEscaparateEstancado(input, movementsByEan),
  ];
}
