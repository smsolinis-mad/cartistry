// Bloque 3b — Agrupaciones forzadas.
//
// Política de producto: dos productos van juntos sí o sí cuando comparten
// (coleccion, drop). El usuario lo justifica como el patrón clásico de
// moda/boutique — la nueva entrega se reconoce como una unidad y romperla
// daña el storytelling visual del lineal.
//
// Determinista, sin side-effects. La integración con el asignador es
// responsabilidad de quien lo consume (ver engine.ts).

import { Product } from '@cartistry/types';

const SIN_VALOR = '__sin_valor__';

export interface ForcedGroup {
  /** Clave canónica del grupo: `${coleccion}|${drop}`. */
  key: string;
  coleccion: string;
  drop: string;
  /** EANs de los productos que pertenecen al grupo, en orden de entrada. */
  productEans: string[];
  totalProducts: number;
  /** Stock total (suma de `unidades`) del grupo — útil para reservar espacio. */
  totalUnidades: number;
}

export interface GroupingResult {
  groups: ForcedGroup[];
  /** EAN → key del grupo. */
  groupByEan: Map<string, string>;
}

/**
 * Devuelve la clave de grupo forzada para un producto. Si `coleccion` o
 * `drop` están vacíos, se sustituyen por una constante reservada para que
 * los productos huérfanos formen un grupo "sin colección/sin drop" y no
 * caigan en un mismo cubo con los demás por accidente.
 */
export function groupKeyOf(product: Pick<Product, 'coleccion' | 'drop'>): string {
  const coleccion = (product.coleccion || '').trim() || SIN_VALOR;
  const drop = (product.drop || '').trim() || SIN_VALOR;
  return `${coleccion}|${drop}`;
}

/** True si los dos productos pertenecen al mismo grupo forzado. */
export function sameForcedGroup(
  a: Pick<Product, 'coleccion' | 'drop'>,
  b: Pick<Product, 'coleccion' | 'drop'>
): boolean {
  return groupKeyOf(a) === groupKeyOf(b);
}

/**
 * Construye los grupos forzados a partir del catálogo de productos.
 * El orden de los grupos preserva la primera aparición de cada (coleccion,
 * drop) en `products`. Los EANs dentro de cada grupo también preservan ese
 * orden — el asignador puede consumirlos en ese orden para mantener
 * coherencia entre planogramas.
 */
export function buildForcedGroups(products: Product[]): GroupingResult {
  const byKey = new Map<string, ForcedGroup>();
  const groupByEan = new Map<string, string>();
  const order: string[] = [];

  for (const p of products) {
    const key = groupKeyOf(p);
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        coleccion: (p.coleccion || '').trim() || SIN_VALOR,
        drop: (p.drop || '').trim() || SIN_VALOR,
        productEans: [],
        totalProducts: 0,
        totalUnidades: 0,
      };
      byKey.set(key, group);
      order.push(key);
    }
    group.productEans.push(p.ean);
    group.totalProducts += 1;
    group.totalUnidades += Number(p.unidades) || 0;
    groupByEan.set(p.ean, key);
  }

  return {
    groups: order.map((k) => byKey.get(k)!),
    groupByEan,
  };
}

/**
 * Etiqueta legible del grupo para logs/UI. Cuando alguno de los campos
 * está vacío usamos un guion para que sea evidente en los logs.
 */
export function groupLabel(group: Pick<ForcedGroup, 'coleccion' | 'drop'>): string {
  const c = group.coleccion === SIN_VALOR ? '—' : group.coleccion;
  const d = group.drop === SIN_VALOR ? '—' : group.drop;
  return `${c} · ${d}`;
}
