#!/usr/bin/env node
/**
 * Inspect Space Map — corre los Bloques 2 + 2b contra una tienda real de
 * Supabase y muestra el ranking de posiciones + heatmap por zona.
 *
 * Uso:
 *   npx tsx packages/rules-engine/scripts/inspect-space-map.mjs [storeId]
 *
 * Si no se pasa storeId, lista las tiendas disponibles y elige la primera.
 */

import { createClient } from '@supabase/supabase-js';
import { PositionScorer } from '../src/position-scorer.ts';
import { buildForcedGroups, groupLabel } from '../src/grouping.ts';
import { buildAffinityMatrix, buildSlowMovers } from '../src/affinity.ts';
import { caraTocaPasillo, caraToOrientation } from '../../../apps/web/lib/aisle-adjacency.ts';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://pfsdufsokjpgacfmwexw.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_weOER6e_pLmIXBpJlpjcAg_y504BnWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const argStoreId = process.argv[2];

function table(rows, columns) {
  // Pequeño formateador de tabla por consola sin libs externas.
  const widths = columns.map((c) =>
    Math.max(
      c.label.length,
      ...rows.map((r, i) => String(c.value(r, i) ?? '').length)
    )
  );
  const sep = '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
  const header =
    '|' + columns.map((c, i) => ` ${c.label.padEnd(widths[i])} `).join('|') + '|';
  console.log(sep);
  console.log(header);
  console.log(sep);
  rows.forEach((row, idx) => {
    console.log(
      '|' +
        columns
          .map((c, i) => ` ${String(c.value(row, idx) ?? '').padEnd(widths[i])} `)
          .join('|') +
        '|'
    );
  });
  console.log(sep);
}

async function main() {
  // 1) Cargar tienda
  const storeQuery = supabase.from('stores').select('*').limit(50);
  const { data: stores, error: storesErr } = await storeQuery;
  if (storesErr) throw storesErr;
  if (!stores || stores.length === 0) {
    console.log('No hay tiendas.');
    return;
  }

  const store = argStoreId
    ? stores.find((s) => s.id === argStoreId)
    : stores[0];

  if (!store) {
    console.log('Tienda no encontrada. Tiendas disponibles:');
    stores.forEach((s) => console.log(`  ${s.id} — ${s.nombre}`));
    return;
  }

  // 2) Cargar muebles de esa tienda
  const { data: muebles, error: muesErr } = await supabase
    .from('muebles')
    .select('*')
    .eq('store_id', store.id);
  if (muesErr) throw muesErr;
  if (!muebles || muebles.length === 0) {
    console.log('Esta tienda no tiene muebles configurados.');
    return;
  }

  // 3) Construir la estructura Store esperada por el PositionScorer
  //    (mismo mapping que api/planograma/route.ts pero local).
  const pasillosArr = Array.isArray(store.pasillos)
    ? store.pasillos
        .filter((c) => c && Number.isFinite(Number(c.col)) && Number.isFinite(Number(c.row)))
        .map((c) => ({ col: Number(c.col), row: Number(c.row) }))
    : [];

  const entradaOrientacion = store.entrada_orientacion || 'entrada';

  const storeForEngine = {
    id: store.id,
    user_id: store.user_id,
    nombre: store.nombre,
    direccion: store.direccion,
    tipo: store.tipo,
    metros2: store.metros2,
    fecha_apertura: store.fecha_apertura,
    entrada_orientacion: store.entrada_orientacion || 'entrada',
    muebles: muebles.map((m) => {
      const legacyFilas = m.num_filas || 4;
      const legacyCols = m.num_columnas || 1;
      const legacyFC = Array.isArray(m.filas_config) ? m.filas_config : [];
      const carasConfig = m.caras_config && typeof m.caras_config === 'object'
        ? m.caras_config
        : {};
      const esEscaparate = !!m.es_escaparate;
      const esCaja = m.tipo === 'caja';

      const flags = {
        frontal: !!m.cara_frontal,
        trasera: !!m.cara_trasera,
        izquierda: !!m.cara_izquierda,
        derecha: !!m.cara_derecha,
        superior: !!m.cara_superior,
      };
      const carasNames = Object.keys(flags).filter((k) => flags[k]);
      const efectivasNames = carasNames.length > 0 ? carasNames : ['frontal'];

      const caras = efectivasNames.map((caraName) => {
        const perCara = carasConfig[caraName] || null;
        const numColumnas = Number(perCara?.cols) || legacyCols;
        const numFilas = Number(perCara?.filas) || legacyFilas;
        const fc = Array.isArray(perCara?.filas_config)
          ? perCara.filas_config
          : legacyFC;
        const alturaTotal = m.alto || 200;
        const alturasSuelo = [];
        if (caraName === 'superior') {
          for (let fila = 0; fila < numFilas; fila++) {
            alturasSuelo.push(alturaTotal);
          }
        } else {
          const alturaUniforme = alturaTotal / numFilas;
          const usaConfig = fc.length === numFilas;
          let acumulado = 0;
          for (let fila = 0; fila < numFilas; fila++) {
            alturasSuelo.push(acumulado);
            const h = usaConfig
              ? Number(fc[fila]?.alto_cm) || alturaUniforme
              : alturaUniforme;
            acumulado += h;
          }
        }
        const baldas = [];
        for (let fila = 0; fila < numFilas; fila++) {
          for (let col = 0; col < numColumnas; col++) {
            baldas.push({
              id: `balda_${m.id}_${caraName}_${col}_${fila}`,
              columna: col,
              numero: fila,
              altura_suelo: alturasSuelo[fila],
              tipo: 'balda',
              capacidad: 1,
              tamaños_admitidos: ['XXG', 'XG', 'G', 'M', 'P', 'Mini'],
            });
          }
        }
        const orientacion = caraToOrientation(caraName, entradaOrientacion);
        const tocaPasillo = caraTocaPasillo(
          m.posicion_cuadricula,
          caraName,
          pasillosArr,
          entradaOrientacion
        );
        return {
          id: `cara_${m.id}_${caraName}`,
          orientacion,
          visibilidad: tocaPasillo ? 'alta' : 'media',
          es_pasillo_principal: tocaPasillo,
          es_escaparate: caraName === 'frontal' && esEscaparate,
          baldas,
        };
      });

      return {
        id: m.id,
        nombre: m.nombre,
        tipo: m.tipo,
        alto: m.alto,
        ancho: m.ancho,
        profundo: m.profundo,
        pared: m.pared,
        posicion_cuadricula: m.posicion_cuadricula || undefined,
        es_zona_caja: !!m.es_zona_caja || esCaja,
        es_escaparate: esEscaparate,
        caras,
      };
    }),
  };

  // 4) Ejecutar PositionScorer
  const scorer = new PositionScorer(storeForEngine, { alturaCompradorCm: 160 });
  const spaceMap = scorer.build();

  console.log(`\nTienda: ${store.nombre} (${store.id})`);
  console.log(`Entrada: ${storeForEngine.entrada_orientacion}`);
  console.log(`Muebles: ${storeForEngine.muebles.length}`);
  console.log(`Zonas: ${spaceMap.zones.length}, Posiciones: ${spaceMap.positions.length}\n`);

  console.log('═════════════ BLOQUE 2b · HEATMAP DE ZONAS ═════════════');
  table(spaceMap.zones, [
    { label: 'Mueble', value: (z) => z.muebleNombre.slice(0, 22) },
    { label: 'Traffic', value: (z) => z.trafficScore },
    { label: 'Visib', value: (z) => z.signals.visibilityCara },
    { label: 'Orient', value: (z) => z.signals.orientacion },
    { label: 'PasilloP', value: (z) => (z.signals.pasilloPrincipal ? 'sí' : '') },
    { label: 'FacingE', value: (z) => (z.signals.facingEntrada ? 'sí' : '') },
    { label: 'XPasillos', value: (z) => (z.signals.crossroads ? 'sí' : '') },
    { label: 'Caja', value: (z) => (z.signals.permanencia ? 'sí' : '') },
    { label: 'RightE', value: (z) => (z.signals.rightOfEntrance ? 'sí' : '') },
  ]);

  console.log('\n═════════════ BLOQUE 2 · TOP POSICIONES ═════════════');
  table(spaceMap.topPositions, [
    { label: '#', value: (_, i) => i + 1 },
    { label: 'Mueble', value: (p) => p.muebleNombre.slice(0, 18) },
    { label: 'Balda', value: (p) => p.baldaId.slice(-15) },
    { label: 'Total', value: (p) => p.total },
    { label: 'Traffic', value: (p) => p.components.trafficZone },
    { label: 'Visib', value: (p) => p.components.visibility },
    { label: 'Golden', value: (p) => p.components.goldenShelf },
    { label: 'Role', value: (p) => p.components.role },
    { label: 'Entry', value: (p) => p.components.entranceProximity },
    { label: 'Altura', value: (p) => `${p.alturaSuelo}cm` },
    { label: 'Esc', value: (p) => (p.flags.isEscaparate ? '⭐' : '') },
    { label: 'Gold', value: (p) => (p.flags.isGoldenShelf ? '⭐' : '') },
    { label: 'Caja', value: (p) => (p.flags.isZonaCaja ? '💰' : '') },
  ]);

  console.log('\n═════════════ BLOQUE 2 · BOTTOM POSICIONES ═════════════');
  table(spaceMap.bottomPositions, [
    { label: '#', value: (_, i) => i + 1 },
    { label: 'Mueble', value: (p) => p.muebleNombre.slice(0, 18) },
    { label: 'Balda', value: (p) => p.baldaId.slice(-15) },
    { label: 'Total', value: (p) => p.total },
    { label: 'Traffic', value: (p) => p.components.trafficZone },
    { label: 'Visib', value: (p) => p.components.visibility },
    { label: 'Golden', value: (p) => p.components.goldenShelf },
    { label: 'Role', value: (p) => p.components.role },
    { label: 'Entry', value: (p) => p.components.entranceProximity },
    { label: 'Altura', value: (p) => `${p.alturaSuelo}cm` },
  ]);

  // Resumen de distribución
  const buckets = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
  for (const p of spaceMap.positions) {
    if (p.total <= 25) buckets['0-25']++;
    else if (p.total <= 50) buckets['26-50']++;
    else if (p.total <= 75) buckets['51-75']++;
    else buckets['76-100']++;
  }
  console.log('\n═════════════ DISTRIBUCIÓN DE SCORES ═════════════');
  for (const [range, count] of Object.entries(buckets)) {
    const bar = '█'.repeat(count);
    console.log(`  ${range.padEnd(8)} │ ${bar} (${count})`);
  }

  // ───────── BLOQUE 3b · Agrupaciones forzadas (coleccion, drop) ─────────
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id);
  const productList = products || [];

  const grouping = buildForcedGroups(productList);
  console.log('\n═════════════ BLOQUE 3b · GRUPOS FORZADOS ═════════════');
  if (grouping.groups.length === 0) {
    console.log('  Sin productos en el catálogo.');
  } else {
    table(grouping.groups, [
      { label: '#', value: (_, i) => i + 1 },
      { label: 'Coleccion · Drop', value: (g) => groupLabel(g) },
      { label: 'Productos', value: (g) => g.totalProducts },
      { label: 'Unidades', value: (g) => g.totalUnidades },
    ]);
  }

  // ───────── BLOQUE 3c · Co-compra ventana 7 días ─────────
  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('store_id', store.id);
  const salesList = sales || [];

  const affinity = buildAffinityMatrix(salesList, { windowDays: 7 });
  console.log(
    `\n═════════════ BLOQUE 3c · TOP PARES CO-COMPRADOS (ventana 7d) ═════════════`
  );
  console.log(
    `  ${affinity.ticketsInWindow} tickets en ventana, ${affinity.pairs.length} pares con soporte`
  );
  if (affinity.pairs.length > 0) {
    const productByEan = new Map(productList.map((p) => [p.ean, p]));
    const top = affinity.pairs.slice(0, 10);
    table(top, [
      { label: '#', value: (_, i) => i + 1 },
      {
        label: 'A',
        value: (p) =>
          (productByEan.get(p.eanA)?.nombre || p.eanA).slice(0, 22),
      },
      {
        label: 'B',
        value: (p) =>
          (productByEan.get(p.eanB)?.nombre || p.eanB).slice(0, 22),
      },
      { label: 'Tickets A', value: (p) => p.countA },
      { label: 'Tickets B', value: (p) => p.countB },
      { label: 'Co-occ', value: (p) => p.cooccurrence },
      { label: 'Jaccard', value: (p) => p.jaccard.toFixed(3) },
    ]);
  }

  // ───────── BLOQUE 3c · Slow-movers (histórico) ─────────
  const slow = buildSlowMovers(
    productList.map((p) => p.ean),
    salesList
  );
  const flagged = slow.filter(
    (s) => s.severity === 'sin_ventas' || s.severity === 'frio'
  );
  console.log(`\n═════════════ BLOQUE 3c · SLOW-MOVERS (histórico) ═════════════`);
  console.log(
    `  ${flagged.length}/${slow.length} productos en estado sin_ventas o frío`
  );
  if (flagged.length > 0) {
    const productByEan = new Map(productList.map((p) => [p.ean, p]));
    const muestra = flagged.slice(0, 15);
    table(muestra, [
      {
        label: 'Producto',
        value: (s) =>
          (productByEan.get(s.ean)?.nombre || s.ean).slice(0, 26),
      },
      { label: 'Severity', value: (s) => s.severity },
      { label: 'Dias s.v.', value: (s) => s.diasSinVenta ?? '—' },
      { label: 'Tickets', value: (s) => s.totalTickets },
      { label: 'Última', value: (s) => s.lastSaleDate || '—' },
    ]);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
