// Bloque 6 — Explicabilidad: diff entre planograma actual y el anterior.
//
// Devuelve una lista de movimientos (added/removed/moved/stayed) por EAN
// que permite al PDF/UI mostrar "qué ha cambiado esta semana".

import { PlanogramPosition, PlanogramMovement, Product } from '@cartistry/types';

export function diffPlanograms(
  prev: PlanogramPosition[],
  curr: PlanogramPosition[],
  products?: Product[]
): PlanogramMovement[] {
  const prevByEan = new Map<string, PlanogramPosition>();
  for (const p of prev) prevByEan.set(p.ean, p);

  const currByEan = new Map<string, PlanogramPosition>();
  for (const p of curr) currByEan.set(p.ean, p);

  const productById = new Map<string, Product>();
  if (products) for (const p of products) productById.set(p.id, p);

  const movements: PlanogramMovement[] = [];
  // Recorrido por todos los EANs que aparezcan en cualquiera de los dos.
  const allEans = new Set<string>([
    ...Array.from(prevByEan.keys()),
    ...Array.from(currByEan.keys()),
  ]);
  Array.from(allEans).forEach((ean) => {
    const before = prevByEan.get(ean);
    const after = currByEan.get(ean);
    if (before && !after) {
      movements.push({
        ean,
        product_id: before.product_id,
        type: 'removed',
        from_balda_id: before.balda_id,
      });
    } else if (!before && after) {
      movements.push({
        ean,
        product_id: after.product_id,
        type: 'added',
        to_balda_id: after.balda_id,
      });
    } else if (before && after) {
      if (before.balda_id === after.balda_id) {
        movements.push({
          ean,
          product_id: after.product_id,
          type: 'stayed',
          from_balda_id: before.balda_id,
          to_balda_id: after.balda_id,
        });
      } else {
        movements.push({
          ean,
          product_id: after.product_id,
          type: 'moved',
          from_balda_id: before.balda_id,
          to_balda_id: after.balda_id,
        });
      }
    }
  });
  return movements;
}

/**
 * Extrae el código de regla del campo `razon`. Formato esperado:
 *   "ZV-07: Golden shelf — top score por spaceMap"
 * Si no encuentra un patrón ABC-NNN al inicio, devuelve undefined.
 */
export function extractRuleCode(razon: string): string | undefined {
  const m = razon.match(/^([A-Z]{2}-\d{2})\b/);
  return m ? m[1] : undefined;
}
