// Bloque 3c — Co-compra (afinidad entre productos).
//
// Política: la afinidad entre productos se calcula sobre la ventana semanal
// (últimos 7 días) usando `numero_ticket` como agrupador. Se construye una
// matriz de pares (EAN_a, EAN_b) con su score Jaccard:
//
//     J(a, b) = |tickets(a) ∩ tickets(b)| / |tickets(a) ∪ tickets(b)|
//
// El asignador (Bloque 3c integrado) usa este score como bonus de
// adyacencia: pares con J alto deberían quedar en posiciones contiguas.
//
// Determinista, sin side-effects, sin red.

import { Sale } from '@cartistry/types';

const DEFAULT_WINDOW_DAYS = 7;

export interface AffinityPair {
  eanA: string;
  eanB: string;
  /** Tickets en los que aparecen ambos. */
  cooccurrence: number;
  /** Tickets únicos donde aparece a. */
  countA: number;
  /** Tickets únicos donde aparece b. */
  countB: number;
  /** Score Jaccard en [0, 1]. */
  jaccard: number;
}

export interface AffinityMatrix {
  /** Pares ordenados por jaccard descendente. */
  pairs: AffinityPair[];
  /** Lookup rápido: 'eanA|eanB' (con eanA < eanB) → AffinityPair. */
  byKey: Map<string, AffinityPair>;
  /** EAN → todos los pares en los que participa, ya ordenados. */
  byEan: Map<string, AffinityPair[]>;
  /** Metadatos para logs/UI. */
  windowDays: number;
  ticketsInWindow: number;
  productsWithSales: number;
}

export interface AffinityParams {
  /** Tamaño de la ventana en días (default 7). */
  windowDays?: number;
  /**
   * Fecha de referencia (now). Útil para tests deterministas. Si se omite
   * usa Date.now().
   */
  now?: Date;
  /**
   * Soporte mínimo de tickets (count_a y count_b ≥ minSupport) para que
   * el par aparezca en la matriz. Default 2.
   */
  minSupport?: number;
}

/**
 * Parsea una fecha de Sale, que puede venir como ISO 'YYYY-MM-DD...' o
 * formato local 'DD/MM/YYYY'. Devuelve null si no se puede parsear.
 */
function parseSaleDate(s: string): Date | null {
  if (!s) return null;
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  }
  // ISO
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Calcula la matriz de afinidad sobre las ventas suministradas, filtrando
 * por ventana de `windowDays` (default 7) desde `now`.
 */
export function buildAffinityMatrix(
  sales: Sale[],
  params: AffinityParams = {}
): AffinityMatrix {
  const windowDays = params.windowDays ?? DEFAULT_WINDOW_DAYS;
  const minSupport = params.minSupport ?? 2;
  const now = params.now ?? new Date();
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // 1) Filtrar ventas dentro de la ventana
  const ventanaSales: Sale[] = [];
  for (const s of sales) {
    const d = parseSaleDate(s.fecha);
    if (!d) continue;
    if (d < cutoff) continue;
    if (d > now) continue;
    ventanaSales.push(s);
  }

  // 2) Agrupar EANs por numero_ticket (set de EANs únicos por ticket)
  const ticketToEans = new Map<string, Set<string>>();
  for (const s of ventanaSales) {
    const ticket = s.numero_ticket || '';
    if (!ticket) continue;
    let set = ticketToEans.get(ticket);
    if (!set) {
      set = new Set();
      ticketToEans.set(ticket, set);
    }
    set.add(s.ean);
  }

  // 3) Contar apariciones por EAN (tickets distintos) y co-ocurrencias
  const ticketsPorEan = new Map<string, number>();
  const cooccurrence = new Map<string, number>(); // pairKey → count
  Array.from(ticketToEans.values()).forEach((eansSet) => {
    const eans = Array.from(eansSet);
    for (const ean of eans) {
      ticketsPorEan.set(ean, (ticketsPorEan.get(ean) || 0) + 1);
    }
    for (let i = 0; i < eans.length; i++) {
      for (let j = i + 1; j < eans.length; j++) {
        const k = pairKey(eans[i], eans[j]);
        cooccurrence.set(k, (cooccurrence.get(k) || 0) + 1);
      }
    }
  });

  // 4) Construir los pares con Jaccard y filtrar por soporte mínimo
  const pairs: AffinityPair[] = [];
  Array.from(cooccurrence.entries()).forEach(([key, co]) => {
    const [eanA, eanB] = key.split('|');
    const countA = ticketsPorEan.get(eanA) || 0;
    const countB = ticketsPorEan.get(eanB) || 0;
    if (countA < minSupport || countB < minSupport) return;
    const union = countA + countB - co;
    const jaccard = union > 0 ? co / union : 0;
    pairs.push({ eanA, eanB, cooccurrence: co, countA, countB, jaccard });
  });

  pairs.sort((a, b) => b.jaccard - a.jaccard);

  const byKey = new Map<string, AffinityPair>();
  const byEan = new Map<string, AffinityPair[]>();
  for (const p of pairs) {
    byKey.set(pairKey(p.eanA, p.eanB), p);
    if (!byEan.has(p.eanA)) byEan.set(p.eanA, []);
    if (!byEan.has(p.eanB)) byEan.set(p.eanB, []);
    byEan.get(p.eanA)!.push(p);
    byEan.get(p.eanB)!.push(p);
  }

  return {
    pairs,
    byKey,
    byEan,
    windowDays,
    ticketsInWindow: ticketToEans.size,
    productsWithSales: ticketsPorEan.size,
  };
}

/** Devuelve el Jaccard de un par concreto (0 si no existe). */
export function affinityScore(
  matrix: AffinityMatrix,
  eanA: string,
  eanB: string
): number {
  if (eanA === eanB) return 1;
  const p = matrix.byKey.get(pairKey(eanA, eanB));
  return p?.jaccard ?? 0;
}

/** Devuelve los top N partners de un EAN ordenados por afinidad descendente. */
export function topPartners(
  matrix: AffinityMatrix,
  ean: string,
  n: number
): AffinityPair[] {
  return (matrix.byEan.get(ean) || []).slice(0, n);
}

// ---------------------------------------------------------------------------
// Bloque 3c — Señal de slow-movers (días sin venta) sobre el histórico
// completo. Independiente de la afinidad: se expone como input separado
// para que el motor pueda demotear prime spots o derivar a liquidación.
// ---------------------------------------------------------------------------

export interface SlowMoverInfo {
  ean: string;
  /** Tickets en los que aparece en TODO el histórico. */
  totalTickets: number;
  /** Última fecha con venta (ISO 'YYYY-MM-DD'). null si nunca se vendió. */
  lastSaleDate: string | null;
  /** Días desde la última venta hasta `now`. null si nunca se vendió. */
  diasSinVenta: number | null;
  /** Etiqueta de severidad calculada en función de diasSinVenta. */
  severity: 'sin_ventas' | 'frio' | 'tibio' | 'activo';
}

export interface SlowMoversParams {
  /** Umbral para etiquetar como "frío" (default 60 días). */
  frioDias?: number;
  /** Umbral para etiquetar como "tibio" (default 30 días). */
  tibioDias?: number;
  /**
   * Fecha de referencia. Si se omite usa Date.now(). Útil para tests.
   */
  now?: Date;
}

/**
 * Calcula la señal de slow-movers para cada EAN del histórico. Recibe la
 * lista completa de productos (para asegurar que aparezcan también los que
 * NO tienen ninguna venta) y todas las ventas registradas.
 */
export function buildSlowMovers(
  productEans: string[],
  sales: Sale[],
  params: SlowMoversParams = {}
): SlowMoverInfo[] {
  const frioDias = params.frioDias ?? 60;
  const tibioDias = params.tibioDias ?? 30;
  const now = params.now ?? new Date();

  const ticketsPorEan = new Map<string, Set<string>>();
  const lastDatePorEan = new Map<string, Date>();

  for (const s of sales) {
    const d = parseSaleDate(s.fecha);
    if (!d) continue;
    if (d > now) continue;
    let set = ticketsPorEan.get(s.ean);
    if (!set) {
      set = new Set();
      ticketsPorEan.set(s.ean, set);
    }
    if (s.numero_ticket) set.add(s.numero_ticket);
    const prev = lastDatePorEan.get(s.ean);
    if (!prev || d > prev) lastDatePorEan.set(s.ean, d);
  }

  const result: SlowMoverInfo[] = [];
  for (const ean of productEans) {
    const totalTickets = ticketsPorEan.get(ean)?.size || 0;
    const last = lastDatePorEan.get(ean);
    if (!last) {
      result.push({
        ean,
        totalTickets,
        lastSaleDate: null,
        diasSinVenta: null,
        severity: 'sin_ventas',
      });
      continue;
    }
    const dias = Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
    let severity: SlowMoverInfo['severity'];
    if (dias >= frioDias) severity = 'frio';
    else if (dias >= tibioDias) severity = 'tibio';
    else severity = 'activo';
    result.push({
      ean,
      totalTickets,
      lastSaleDate: last.toISOString().slice(0, 10),
      diasSinVenta: dias,
      severity,
    });
  }

  // Orden estable: sin_ventas → frío (más días) → tibio → activo
  const severityRank: Record<SlowMoverInfo['severity'], number> = {
    sin_ventas: 0,
    frio: 1,
    tibio: 2,
    activo: 3,
  };
  result.sort((a, b) => {
    const sr = severityRank[a.severity] - severityRank[b.severity];
    if (sr !== 0) return sr;
    return (b.diasSinVenta ?? Infinity) - (a.diasSinVenta ?? Infinity);
  });

  return result;
}

// ---------------------------------------------------------------------------
// Bloque 14 — Señal día-de-semana.
//
// Por cada EAN calcula la distribución de unidades vendidas por día de
// semana (0 = domingo, ..., 6 = sábado) usando todo el histórico. Detecta
// productos cuyo % de ventas en findes (sáb+dom) es ≥ 70% → "fin de
// semana", o cuyo % entre semana es ≥ 70% → "entre semana".
// ---------------------------------------------------------------------------

export type WeeklyPattern = 'fin_de_semana' | 'entre_semana' | 'distribuido';

export interface WeekdayInfo {
  ean: string;
  /** Unidades por día de semana (índice 0..6 = dom..sáb). */
  porDia: number[];
  totalUnidades: number;
  /** Porcentaje en findes (sáb+dom). */
  pctFinde: number;
  pattern: WeeklyPattern;
}

export interface WeekdayParams {
  /** Umbral para etiquetar "fin_de_semana" (default 0.7). */
  umbralFinde?: number;
  /** Umbral para etiquetar "entre_semana" (default 0.7). */
  umbralSemana?: number;
}

export function buildWeekdaySignal(
  sales: Sale[],
  params: WeekdayParams = {}
): WeekdayInfo[] {
  const umbralFinde = params.umbralFinde ?? 0.7;
  const umbralSemana = params.umbralSemana ?? 0.7;

  const porEan = new Map<string, number[]>(); // EAN → 7 buckets
  for (const s of sales) {
    const d = parseSaleDate(s.fecha);
    if (!d) continue;
    const dow = d.getUTCDay(); // 0 dom .. 6 sáb
    const arr = porEan.get(s.ean) || [0, 0, 0, 0, 0, 0, 0];
    arr[dow] += Number(s.unidades_vendidas) || 0;
    porEan.set(s.ean, arr);
  }

  const result: WeekdayInfo[] = [];
  Array.from(porEan.entries()).forEach(([ean, arr]) => {
    const total = arr.reduce((a, b) => a + b, 0);
    if (total === 0) return;
    const finde = (arr[0] || 0) + (arr[6] || 0);
    const pctFinde = finde / total;
    let pattern: WeeklyPattern;
    if (pctFinde >= umbralFinde) pattern = 'fin_de_semana';
    else if (1 - pctFinde >= umbralSemana) pattern = 'entre_semana';
    else pattern = 'distribuido';
    result.push({ ean, porDia: arr, totalUnidades: total, pctFinde, pattern });
  });

  // Orden: fin_de_semana primero (con mayor pctFinde), luego entre_semana.
  const rank: Record<WeeklyPattern, number> = {
    fin_de_semana: 0,
    entre_semana: 1,
    distribuido: 2,
  };
  result.sort((a, b) => {
    const r = rank[a.pattern] - rank[b.pattern];
    if (r !== 0) return r;
    return b.totalUnidades - a.totalUnidades;
  });
  return result;
}
