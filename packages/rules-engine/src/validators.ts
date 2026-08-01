// Bloque 5 + 5b — Validadores post-asignación.
//
// Cada validador recibe el estado del planograma (asignaciones + spaceMap)
// y devuelve una lista de issues (alertas). No mutan el planograma; el
// motor decide si re-rotar o aceptar la alerta como advertencia.
//
// El asignador llama a estos validadores al final de `run()` y los issues
// se exponen en `EngineOutput.alerts` para que el PDF y la UI puedan
// mostrarlos al usuario.

import { Store, Product, PlanogramPosition, Balda } from '@cartistry/types';
import { SpaceMap, ZoneHeatmap } from './position-scorer';
import { ForcedGroup } from './grouping';

export type AlertSeverity = 'info' | 'warn' | 'error';

export interface PlanogramAlert {
  code: string;             // ZV-05, ZV-09, 5B-COL, 5B-RHYTHM, 5B-N-IMPAR...
  severity: AlertSeverity;
  message: string;
  // Contexto opcional: a qué balda/zona/producto afecta. Para el PDF/UI.
  baldaId?: string;
  zoneId?: string;
  productEans?: string[];
}

export interface ValidatorInput {
  store: Store;
  products: Product[];
  positions: PlanogramPosition[];
  baldaAsignaciones: Map<string, { products: string[]; espacioUsado: number }>;
  espaciosPorBalda: Map<string, number>;
  spaceMap?: SpaceMap;
  forcedGroups?: ForcedGroup[];
}

// ---------------------------------------------------------------------------
// ZV-05 — Densidad decreciente desde la entrada.
//
// Política: la densidad de productos por balda debe DECRECER conforme se
// avanza desde la entrada hacia el fondo. Si una balda lejana está más
// llena que una balda cercana a la entrada, se emite alerta.
//
// Mide: % ocupación (espacioUsado / espacioDisponible) por balda, ordenado
// por el `entranceProximity` que devuelve el position scorer.
// ---------------------------------------------------------------------------
export function validateDensidadDecreciente(input: ValidatorInput): PlanogramAlert[] {
  if (!input.spaceMap) return [];
  const alerts: PlanogramAlert[] = [];

  // Calcular ocupación por balda
  const ocupacionPorBalda = new Map<string, number>();
  for (const [baldaId, asig] of Array.from(input.baldaAsignaciones.entries())) {
    const disp = input.espaciosPorBalda.get(baldaId) || 0;
    const pct = disp > 0 ? (asig.espacioUsado / disp) * 100 : 0;
    ocupacionPorBalda.set(baldaId, pct);
  }

  // Para cada balda con posiciones, capturar su entranceProximity (max
  // entre las posiciones que comparte). Mayor = más cerca de la entrada.
  const proxByBalda = new Map<string, number>();
  for (const p of input.spaceMap.positions) {
    const cur = proxByBalda.get(p.baldaId) || 0;
    const v = p.components.entranceProximity;
    if (v > cur) proxByBalda.set(p.baldaId, v);
  }

  // Ordenar baldas por proximidad DESCENDENTE (más cerca primero).
  const orden = Array.from(proxByBalda.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // Recorrer: cada balda debería tener ≤ densidad que la anterior.
  let maxAnterior = Infinity;
  for (const id of orden) {
    const ocup = ocupacionPorBalda.get(id) || 0;
    if (ocup > maxAnterior + 5) {
      // tolerancia 5 puntos para evitar falsos positivos por redondeo
      alerts.push({
        code: 'ZV-05',
        severity: 'warn',
        message: `Densidad creciente detectada: balda ${id.slice(-18)} está al ${ocup.toFixed(1)}% mientras una más cercana a la entrada está al ${maxAnterior.toFixed(1)}%. La densidad debe decrecer desde la entrada.`,
        baldaId: id,
      });
    }
    if (ocup < maxAnterior) maxAnterior = ocup;
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// ZV-09 — Imán de tráfico: validar que las zonas frías tienen al menos un
// producto atractivo. Se ejecuta a posteriori porque la regla del Bloque 4
// hace el "intento", pero un producto puede haber sido rechazado por
// constraints físicas. Aquí lo verificamos.
// ---------------------------------------------------------------------------
export function validateImanTrafico(
  input: ValidatorInput,
  bestSellerEans: Set<string>
): PlanogramAlert[] {
  if (!input.spaceMap || bestSellerEans.size === 0) return [];
  const alerts: PlanogramAlert[] = [];

  // Bottom 20% de zonas por trafficScore
  const zonasFrias = input.spaceMap.zones
    .slice()
    .sort((a, b) => a.trafficScore - b.trafficScore)
    .slice(0, Math.max(1, Math.floor(input.spaceMap.zones.length * 0.2)));

  // ¿Alguna de esas zonas tiene un best-seller?
  const baldasFrias = new Set<string>();
  for (const z of zonasFrias) {
    for (const p of input.spaceMap.positions) {
      if (p.zoneId === z.zoneId) baldasFrias.add(p.baldaId);
    }
  }

  let tieneIman = false;
  for (const id of Array.from(baldasFrias)) {
    const asig = input.baldaAsignaciones.get(id);
    if (!asig) continue;
    for (const ean of asig.products) {
      if (bestSellerEans.has(ean)) {
        tieneIman = true;
        break;
      }
    }
    if (tieneIman) break;
  }

  if (!tieneIman && baldasFrias.size > 0) {
    alerts.push({
      code: 'ZV-09',
      severity: 'info',
      message: `Ninguna zona fría (${baldasFrias.size} baldas en el bottom 20% de tráfico) tiene un best-seller que actúe como imán. El cliente puede no descubrir el fondo del lineal.`,
    });
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// ZV-06 — Coherencia de colección: las baldas que comparten producto
// deberían pertenecer a la misma (coleccion, drop). Como el asignador ya
// fuerza esto, aquí emitimos alerta sólo si por fallback se ha colado un
// producto de otro grupo en una balda mayoritaria.
// ---------------------------------------------------------------------------
export function validateCoherenciaColeccion(input: ValidatorInput): PlanogramAlert[] {
  const alerts: PlanogramAlert[] = [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  for (const [baldaId, asig] of Array.from(input.baldaAsignaciones.entries())) {
    if (asig.products.length <= 1) continue;
    const labels = new Set<string>();
    for (const ean of asig.products) {
      const prod = productByEan.get(ean);
      if (!prod) continue;
      const key = `${(prod.coleccion || '—').trim()}|${(prod.drop || '—').trim()}`;
      labels.add(key);
    }
    if (labels.size > 1) {
      alerts.push({
        code: 'PR-02',
        severity: 'warn',
        message: `Balda ${baldaId.slice(-18)} mezcla ${labels.size} colecciones/drops distintos: ${Array.from(labels).join(' · ')}. Esperado: un único grupo (coleccion, drop) por balda.`,
        baldaId,
        productEans: asig.products,
      });
    }
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Bloque 5b — Coherencia visual global
// ---------------------------------------------------------------------------

const COLOR_MONOTONIA_UMBRAL = 0.7; // 70% mismo color = monotonía
const N_REFERENCIAS_FATIGA = 6;     // >6 SKUs/balda = fatiga
const N_REFERENCIAS_IDEAL = new Set([1, 3, 5]); // nº impar atractivo

/**
 * Detecta monotonía de color: si una balda tiene ≥70% productos del mismo
 * `color_principal`, emite alerta.
 */
export function validateMonotoniaColor(input: ValidatorInput): PlanogramAlert[] {
  const alerts: PlanogramAlert[] = [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  for (const [baldaId, asig] of Array.from(input.baldaAsignaciones.entries())) {
    if (asig.products.length < 3) continue; // muy pocos para juzgar
    const counter = new Map<string, number>();
    for (const ean of asig.products) {
      const p = productByEan.get(ean);
      const color = (p?.color_principal || '').trim().toLowerCase() || '__sin_color__';
      counter.set(color, (counter.get(color) || 0) + 1);
    }
    const top = Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])[0];
    if (!top) continue;
    const [color, count] = top;
    const pct = count / asig.products.length;
    if (pct >= COLOR_MONOTONIA_UMBRAL && color !== '__sin_color__') {
      alerts.push({
        code: '5B-COL',
        severity: 'info',
        message: `Monotonía de color en balda ${baldaId.slice(-18)}: ${Math.round(pct * 100)}% productos color "${color}". Considera intercalar otro color.`,
        baldaId,
      });
    }
  }
  return alerts;
}

/**
 * Ritmo visual grande/pequeño: una balda con TODOS los productos del mismo
 * rango de tamaño (todos grandes o todos mini) pierde ritmo. Aquí miramos
 * `medida_largo` y avisamos si todos están en el mismo decil.
 */
export function validateRitmoTamano(input: ValidatorInput): PlanogramAlert[] {
  const alerts: PlanogramAlert[] = [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  for (const [baldaId, asig] of Array.from(input.baldaAsignaciones.entries())) {
    if (asig.products.length < 3) continue;
    const largos: number[] = [];
    for (const ean of asig.products) {
      const p = productByEan.get(ean);
      const l = Number(p?.medida_largo) || 0;
      if (l > 0) largos.push(l);
    }
    if (largos.length < 3) continue;
    const max = Math.max(...largos);
    const min = Math.min(...largos);
    // Si rango < 20% del mayor, todos son del mismo "tamaño visual".
    if (max > 0 && (max - min) / max < 0.2) {
      alerts.push({
        code: '5B-RHYTHM',
        severity: 'info',
        message: `Balda ${baldaId.slice(-18)} sin ritmo visual: todos los productos son de tamaño similar (${min.toFixed(0)}–${max.toFixed(0)}cm). Intercala tamaños para crear contraste.`,
        baldaId,
      });
    }
  }
  return alerts;
}

/**
 * Número impar de referencias por balda (1, 3, 5) es más atractivo
 * visualmente. Emite alerta sólo cuando hay 2 o 4 productos por balda.
 */
export function validateNumeroImpar(input: ValidatorInput): PlanogramAlert[] {
  const alerts: PlanogramAlert[] = [];
  for (const [baldaId, asig] of Array.from(input.baldaAsignaciones.entries())) {
    const n = asig.products.length;
    if (n === 0) continue;
    if (n >= N_REFERENCIAS_FATIGA) {
      alerts.push({
        code: '5B-FATIGA',
        severity: 'warn',
        message: `Balda ${baldaId.slice(-18)} con ${n} referencias — fatiga de decisión. Considera dividir o reducir.`,
        baldaId,
      });
      continue;
    }
    if (!N_REFERENCIAS_IDEAL.has(n)) {
      alerts.push({
        code: '5B-N-IMPAR',
        severity: 'info',
        message: `Balda ${baldaId.slice(-18)} con ${n} referencias. Un número impar (1, 3, 5) suele resultar más atractivo visualmente.`,
        baldaId,
      });
    }
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Bloque 3c — Diversidad de tipo por drop (PR-06).
//
// Dentro de un mismo drop, si todas las baldas tienen el mismo `tipo` el
// lineal pierde variedad. Emite alerta cuando para un drop existe ≥3
// baldas y todas comparten tipo.
// ---------------------------------------------------------------------------
export function validateDiversidadTipo(input: ValidatorInput): PlanogramAlert[] {
  const alerts: PlanogramAlert[] = [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  // Agrupar baldas por (coleccion, drop) — usando el producto mayoritario.
  const baldasPorGrupo = new Map<string, { baldaId: string; tipos: string[] }[]>();
  for (const [baldaId, asig] of Array.from(input.baldaAsignaciones.entries())) {
    if (asig.products.length === 0) continue;
    const first = productByEan.get(asig.products[0]);
    if (!first) continue;
    const key = `${(first.coleccion || '—').trim()}|${(first.drop || '—').trim()}`;
    const tipos = asig.products
      .map((e) => (productByEan.get(e)?.tipo || '').trim())
      .filter(Boolean);
    if (!baldasPorGrupo.has(key)) baldasPorGrupo.set(key, []);
    baldasPorGrupo.get(key)!.push({ baldaId, tipos });
  }

  Array.from(baldasPorGrupo.entries()).forEach(([key, baldas]) => {
    if (baldas.length < 3) return;
    const allTipos = new Set<string>();
    for (const b of baldas) for (const t of b.tipos) allTipos.add(t);
    if (allTipos.size === 1 && !allTipos.has('')) {
      const tipo = Array.from(allTipos)[0];
      alerts.push({
        code: 'PR-06',
        severity: 'info',
        message: `Drop "${key}" ocupa ${baldas.length} baldas pero todas son del mismo tipo "${tipo}". Considera variar el tipo dentro del drop para evitar monotonía.`,
      });
    }
  });
  return alerts;
}

// ---------------------------------------------------------------------------
// Bloque 3c — Complementariedad de categoría / outfit.
//
// Heurística: si una balda tiene producto del mismo `subtipo` (p.ej. bolso),
// las baldas adyacentes idealmente complementan (cartera/monedero del mismo
// `division`). Emite info cuando una zona entera (≥3 baldas contiguas) es
// monocategoría y NO hay complementarios cerca.
// ---------------------------------------------------------------------------
export function validateComplementariedad(input: ValidatorInput): PlanogramAlert[] {
  const alerts: PlanogramAlert[] = [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  // Para cada mueble, tomar la cara y comprobar el subtipo dominante por balda.
  const baldasOrdenadas: { baldaId: string; subtipo: string; division: string }[] = [];
  for (const m of input.store.muebles) {
    for (const cara of m.caras) {
      for (const b of cara.baldas) {
        const asig = input.baldaAsignaciones.get(b.id);
        if (!asig || asig.products.length === 0) continue;
        const subtipos = new Map<string, number>();
        const divisiones = new Map<string, number>();
        for (const e of asig.products) {
          const p = productByEan.get(e);
          if (!p) continue;
          const s = (p.subtipo || '').trim();
          const d = (p.division || '').trim();
          if (s) subtipos.set(s, (subtipos.get(s) || 0) + 1);
          if (d) divisiones.set(d, (divisiones.get(d) || 0) + 1);
        }
        const topSubtipo = Array.from(subtipos.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        const topDivision = Array.from(divisiones.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        baldasOrdenadas.push({ baldaId: b.id, subtipo: topSubtipo, division: topDivision });
      }
    }
  }

  // Buscar zonas con ≥3 baldas contiguas de mismo subtipo Y sin variedad de división.
  for (let i = 0; i + 2 < baldasOrdenadas.length; i++) {
    const a = baldasOrdenadas[i];
    const b = baldasOrdenadas[i + 1];
    const c = baldasOrdenadas[i + 2];
    if (a.subtipo && a.subtipo === b.subtipo && b.subtipo === c.subtipo) {
      const divisions = new Set([a.division, b.division, c.division].filter(Boolean));
      if (divisions.size <= 1) {
        alerts.push({
          code: 'PR-06b',
          severity: 'info',
          message: `Zona de 3 baldas consecutivas con subtipo "${a.subtipo}" sin productos complementarios. Considera intercalar otro subtipo (efecto outfit).`,
          baldaId: a.baldaId,
        });
        i += 2; // saltar para no duplicar alertas
      }
    }
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Bloque 3c — Compatibilidad de color en baldas adyacentes.
//
// Heurística simple: si dos baldas contiguas (en la misma cara) tienen
// `color_principal` mayoritario distinto pero ambos son colores "fuertes"
// que chocan (rojo+verde, amarillo+morado, naranja+azul), emite alerta.
// ---------------------------------------------------------------------------
const CHOQUES_COLOR: Array<[string, string]> = [
  ['rojo', 'verde'],
  ['amarillo', 'morado'],
  ['amarillo', 'violeta'],
  ['naranja', 'azul'],
  ['rosa', 'rojo'],
  ['fucsia', 'naranja'],
];

function normalizaColor(c: string | undefined): string {
  return (c || '').trim().toLowerCase();
}

function colorMayoritario(
  asig: { products: string[] },
  productByEan: Map<string, Product>
): string {
  const counter = new Map<string, number>();
  for (const e of asig.products) {
    const p = productByEan.get(e);
    const c = normalizaColor(p?.color_principal);
    if (c) counter.set(c, (counter.get(c) || 0) + 1);
  }
  return Array.from(counter.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

function colorsChocan(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  for (const [x, y] of CHOQUES_COLOR) {
    if ((a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))) return true;
  }
  return false;
}

export function validateCompatibilidadColor(input: ValidatorInput): PlanogramAlert[] {
  const alerts: PlanogramAlert[] = [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  for (const m of input.store.muebles) {
    for (const cara of m.caras) {
      const baldasCara = cara.baldas.slice().sort((a, b) => {
        if (a.numero !== b.numero) return a.numero - b.numero;
        return a.columna - b.columna;
      });
      for (let i = 0; i + 1 < baldasCara.length; i++) {
        const aId = baldasCara[i].id;
        const bId = baldasCara[i + 1].id;
        const aAsig = input.baldaAsignaciones.get(aId);
        const bAsig = input.baldaAsignaciones.get(bId);
        if (!aAsig || !bAsig || aAsig.products.length === 0 || bAsig.products.length === 0) continue;
        const ca = colorMayoritario(aAsig, productByEan);
        const cb = colorMayoritario(bAsig, productByEan);
        if (colorsChocan(ca, cb)) {
          alerts.push({
            code: '3C-COLOR',
            severity: 'info',
            message: `Baldas adyacentes con colores que chocan: "${ca}" junto a "${cb}" (${aId.slice(-12)} ↔ ${bId.slice(-12)}). Considera intercalar otro color o cambiar el orden.`,
            baldaId: aId,
          });
        }
      }
    }
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Bloque 13 — Psicología consumidor: efecto anclaje.
//
// El precio más alto que ve el cliente al entrar condiciona toda la
// percepción del lineal. La primera zona desde la entrada debe contener un
// producto de precio top (top 10% del catálogo) para que el resto parezca
// asequible por comparación.
// ---------------------------------------------------------------------------
export function validateAnclajePrecio(input: ValidatorInput): PlanogramAlert[] {
  if (!input.spaceMap) return [];
  const alerts: PlanogramAlert[] = [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  // Umbral top 10% del catálogo
  const precios = input.products.map((p) => Number(p.pvp) || 0).filter((x) => x > 0);
  if (precios.length === 0) return [];
  const sortedDesc = precios.slice().sort((a, b) => b - a);
  const umbralTop = sortedDesc[Math.floor(sortedDesc.length * 0.1)] || sortedDesc[0];

  // Baldas en zona de entrada
  const baldasEntrada = new Set<string>();
  for (const p of input.spaceMap.positions) {
    if (p.flags.isEntrada) baldasEntrada.add(p.baldaId);
  }
  if (baldasEntrada.size === 0) return [];

  let tieneAncla = false;
  Array.from(baldasEntrada).forEach((id) => {
    const asig = input.baldaAsignaciones.get(id);
    if (!asig) return;
    for (const ean of asig.products) {
      const prod = productByEan.get(ean);
      if (prod && (Number(prod.pvp) || 0) >= umbralTop) {
        tieneAncla = true;
        break;
      }
    }
  });

  if (!tieneAncla) {
    alerts.push({
      code: '13-ANCLA',
      severity: 'info',
      message: `Efecto anclaje: la zona de entrada no tiene ningún producto de precio top (≥${umbralTop.toFixed(2)}€). Colocar el más caro a la vista al entrar hace que el resto parezca más asequible.`,
    });
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Bloque 13 — Efecto escasez.
//
// Producto con stock muy bajo en posición visible activa el sesgo de
// escasez ("últimas unidades"). Detectar productos con stock ≤ 3 unidades
// y comprobar si están en baldas con buen score. Si NO están en zona
// visible, sugerir moverlos.
// ---------------------------------------------------------------------------
export function validateEscasez(input: ValidatorInput): PlanogramAlert[] {
  if (!input.spaceMap) return [];
  const alerts: PlanogramAlert[] = [];
  const productByEan = new Map<string, Product>(input.products.map((p) => [p.ean, p]));

  // Posiciones ordenadas por score descendente
  const positionsByBalda = new Map<string, number>();
  for (const p of input.spaceMap.positions) {
    const cur = positionsByBalda.get(p.baldaId) || 0;
    if (p.total > cur) positionsByBalda.set(p.baldaId, p.total);
  }
  const mediana = (() => {
    const arr = Array.from(positionsByBalda.values()).sort((a, b) => a - b);
    return arr[Math.floor(arr.length / 2)] || 0;
  })();

  // Productos escasos
  for (const prod of input.products) {
    const stock = Number(prod.unidades) || 0;
    if (stock === 0 || stock > 3) continue;
    // Buscar dónde está colocado
    let baldaIdAsignada: string | undefined;
    for (const [bid, asig] of Array.from(input.baldaAsignaciones.entries())) {
      if (asig.products.includes(prod.ean)) {
        baldaIdAsignada = bid;
        break;
      }
    }
    if (!baldaIdAsignada) continue;
    const score = positionsByBalda.get(baldaIdAsignada) || 0;
    if (score < mediana) {
      alerts.push({
        code: '13-ESCASEZ',
        severity: 'info',
        message: `Escasez no aprovechada: "${prod.nombre}" tiene solo ${stock} unidades pero está en balda de bajo score (${score}). Moverlo a zona visible activa "últimas unidades".`,
        baldaId: baldaIdAsignada,
        productEans: [prod.ean],
      });
    }
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// MUEBLE-SEXO — Mueble configurado para un público pero sin productos
// compatibles en el catálogo. El usuario debe actualizar la configuración
// del mueble (o subir productos del sexo correcto).
// ---------------------------------------------------------------------------
export function validateMuebleSinProductosCompatibles(
  input: ValidatorInput
): PlanogramAlert[] {
  const alerts: PlanogramAlert[] = [];
  const sexoMap: Record<string, string> = {
    femenino: 'mujer',
    masculino: 'hombre',
    unisex: 'unisex',
  };

  for (const mueble of input.store.muebles) {
    const target = mueble.sexo_target;
    if (!target || target === 'indiferente') continue;
    const sexoEsperado = sexoMap[target];
    if (!sexoEsperado) continue;
    const compatibles = input.products.filter(
      (p) => (p.sexo || '').toLowerCase() === sexoEsperado
    );
    if (compatibles.length === 0) {
      alerts.push({
        code: 'MUEBLE-SEXO',
        severity: 'warn',
        message: `El mueble "${mueble.nombre}" está configurado para público ${target} pero no hay productos de ${sexoEsperado} en el catálogo. Actualiza el sexo objetivo del mueble o sube productos del público correcto.`,
      });
    }
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// STOCK-INSUFICIENTE — La ocupación final del mueble es muy baja porque no
// había suficientes productos elegibles para llenarlo. Avisar al usuario.
// ---------------------------------------------------------------------------
export function validateStockInsuficiente(
  input: ValidatorInput
): PlanogramAlert[] {
  const alerts: PlanogramAlert[] = [];
  const UMBRAL_OCUPACION = 0.3; // <30% de huecos = stock insuficiente

  for (const mueble of input.store.muebles) {
    // Recolectar todos los baldaIds del mueble
    const baldaIds: string[] = [];
    for (const cara of mueble.caras) {
      for (const b of cara.baldas) baldaIds.push(b.id);
    }
    if (baldaIds.length === 0) continue;

    let baldasOcupadas = 0;
    for (const id of baldaIds) {
      const asig = input.baldaAsignaciones.get(id);
      if (asig && asig.products.length > 0) baldasOcupadas++;
    }
    const ratio = baldasOcupadas / baldaIds.length;
    if (ratio < UMBRAL_OCUPACION) {
      const target = mueble.sexo_target;
      const huecosTotales = baldaIds.length;
      const huecosLlenos = baldasOcupadas;
      const contexto =
        target && target !== 'indiferente'
          ? ` (objetivo: ${target})`
          : '';
      alerts.push({
        code: 'STOCK-INSUF',
        severity: 'warn',
        message: `El mueble "${mueble.nombre}"${contexto} ha quedado al ${Math.round(ratio * 100)}% (${huecosLlenos}/${huecosTotales} huecos). No tienes suficiente stock elegible para completarlo — sube más producto o reduce su tamaño.`,
      });
    }
  }
  return alerts;
}

/**
 * Avisos "raíz" — situaciones de configuración o stock que invalidan los
 * avisos derivados (densidad, monotonía, ritmo, nº impar, etc) porque
 * estos últimos son consecuencia inevitable de tener muebles vacíos o
 * mal configurados. Si hay alertas raíz, se suprimen las derivadas y se
 * añade un meta-aviso explicando por qué.
 */
const ROOT_CAUSE_CODES = new Set(['MUEBLE-SEXO', 'STOCK-INSUF']);

export function runAllValidators(
  input: ValidatorInput,
  bestSellerEans: Set<string>
): PlanogramAlert[] {
  const root = [
    ...validateMuebleSinProductosCompatibles(input),
    ...validateStockInsuficiente(input),
  ];
  const derived = [
    ...validateDensidadDecreciente(input),
    ...validateImanTrafico(input, bestSellerEans),
    ...validateCoherenciaColeccion(input),
    ...validateMonotoniaColor(input),
    ...validateRitmoTamano(input),
    ...validateNumeroImpar(input),
    ...validateDiversidadTipo(input),
    ...validateComplementariedad(input),
    ...validateCompatibilidadColor(input),
    ...validateAnclajePrecio(input),
    ...validateEscasez(input),
  ];

  if (root.length > 0) {
    const suppressed = derived.length;
    const out: PlanogramAlert[] = [...root];
    if (suppressed > 0) {
      out.push({
        code: 'META-SUPPRESS',
        severity: 'info',
        message: `Se han ocultado ${suppressed} aviso${suppressed === 1 ? '' : 's'} secundario${suppressed === 1 ? '' : 's'} (densidad, monotonía, ritmo, etc.) porque son consecuencia de los avisos de configuración/stock anteriores. Resuelve los avisos de arriba y vuelve a generar el planograma para ver los avisos visuales reales.`,
      });
    }
    return out;
  }
  return derived;
}

// Marcador para futuros consumidores (UI/PDF) por si quieren clasificar
// qué códigos son raíz.
export function isRootCauseAlert(code: string): boolean {
  return ROOT_CAUSE_CODES.has(code);
}
