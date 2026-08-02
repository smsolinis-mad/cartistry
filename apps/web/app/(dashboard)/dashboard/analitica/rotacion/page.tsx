'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { ExportButton } from '@/components/analitica/ExportButton';
import { PageHeader } from '@/components/ui';
import { formatEUR as fmtEur, formatInt as fmtInt } from '@/lib/format';
import { toISODate as toISO } from '@/lib/dates';
import { rangoDeFechas } from '@/lib/supabase/rango';

type Granularidad = 'diario' | 'semanal' | 'mensual' | 'anual' | 'personalizado';

interface Store {
  id: string;
  nombre: string;
}

interface Product {
  ean: string;
  store_id: string;
  unidades: number | null;
  pvp: number | null;
  precio_compra: number | null;
}

interface Sale {
  fecha: string;
  pvp: number | null;
  unidades_vendidas: number | null;
  numero_ticket: string | null;
  ean: string;
  store_id: string;
}

type TramoKey = 'alta' | 'buena' | 'media' | 'baja' | 'sin_dato';

const TRAMOS: Array<{ key: TramoKey; label: string; range: string; color: string }> = [
  { key: 'alta',     label: 'Alta',  range: '≥ 2,0×',  color: '#3F7D5A' },
  { key: 'buena',    label: 'Buena', range: '1,0–2,0×', color: '#7DA86F' },
  { key: 'media',    label: 'Media', range: '0,5–1,0×', color: '#C9892F' },
  { key: 'baja',     label: 'Baja',  range: '0–0,5×',   color: '#D97A3A' },
  { key: 'sin_dato', label: 'Sin stock conocido', range: '—', color: '#8A8073' },
];

function tramoForRotacion(rot: number | null): TramoKey {
  if (rot === null) return 'sin_dato';
  if (rot >= 2.0) return 'alta';
  if (rot >= 1.0) return 'buena';
  if (rot >= 0.5) return 'media';
  return 'baja';
}

interface TramoRow {
  key: TramoKey;
  label: string;
  range: string;
  color: string;
  storeName: string;
  unidades: number;
  ventas: number;
  margenTotal: number;
  rotacionMedia: number;
  tickets: number;
  numProductos: number;
}

const fmtX = (n: number) =>
  `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;


function presetRange(g: Granularidad): { from: string; to: string } | null {
  if (g === 'personalizado') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = toISO(today);
  const from = new Date(today);
  if (g === 'diario') {
    // hoy
  } else if (g === 'semanal') {
    from.setDate(from.getDate() - 6);
  } else if (g === 'mensual') {
    from.setDate(from.getDate() - 29);
  } else if (g === 'anual') {
    from.setDate(from.getDate() - 364);
  }
  return { from: toISO(from), to };
}

export default function RotacionAnaliticaPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [storeId, setStoreId] = useState<string>('');
  const [granularidad, setGranularidad] = useState<Granularidad>('mensual');
  // Arrancan en el preset mensual: si empezaran vacías, el primer render
  // pediría el histórico completo de ventas.
  const [dateFrom, setDateFrom] = useState<string>(
    () => presetRange('mensual')?.from ?? ''
  );
  const [dateTo, setDateTo] = useState<string>(() => presetRange('mensual')?.to ?? '');

  const supabase = createClient();

  // Recarga al cambiar el rango, porque el rango va en la consulta.
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const r = presetRange(granularidad);
    if (r) {
      setDateFrom(r.from);
      setDateTo(r.to);
    }
  }, [granularidad]);

  const loadData = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, nombre')
        .eq('user_id', userId)
        .order('nombre', { ascending: true });

      if (storesError || !storesData) {
        setError('Error cargando tiendas');
        setLoading(false);
        return;
      }

      setStores(storesData);
      const storeIds = storesData.map((s: any) => s.id as string);

      if (storeIds.length === 0) {
        setSales([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      const [{ data: productsData }, { data: salesData }] = await Promise.all([
        supabase
          .from('products')
          .select('ean, store_id, unidades, pvp, precio_compra')
          .in('store_id', storeIds),
        // Solo el periodo que se está mirando.
        rangoDeFechas(
          supabase
            .from('sales')
            .select('fecha, pvp, unidades_vendidas, numero_ticket, ean, store_id')
            .in('store_id', storeIds),
          dateFrom,
          dateTo
        ),
      ]);

      setProducts((productsData as any) || []);
      setSales((salesData as any) || []);
    } catch {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of stores) m.set(s.id, s.nombre);
    return m;
  }, [stores]);

  const productByKey = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(`${p.store_id}|${p.ean}`, p);
    return m;
  }, [products]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (storeId && s.store_id !== storeId) return false;
      if (dateFrom && s.fecha < dateFrom) return false;
      if (dateTo && s.fecha > dateTo) return false;
      return true;
    });
  }, [sales, storeId, dateFrom, dateTo]);

  const productMetrics = useMemo(() => {
    const sold = new Map<string, number>();
    for (const s of filteredSales) {
      const key = `${s.store_id}|${s.ean}`;
      sold.set(key, (sold.get(key) || 0) + (Number(s.unidades_vendidas) || 0));
    }
    const productInfo = new Map<string, { tramo: TramoKey; rotacion: number | null; sold: number }>();
    for (const [key, soldUnits] of Array.from(sold.entries())) {
      const product = productByKey.get(key);
      if (!product) {
        productInfo.set(key, { tramo: 'sin_dato', rotacion: null, sold: soldUnits });
        continue;
      }
      const stock = Number(product.unidades) || 0;
      const rot = stock > 0 ? soldUnits / stock : null;
      productInfo.set(key, { tramo: tramoForRotacion(rot), rotacion: rot, sold: soldUnits });
    }
    return productInfo;
  }, [filteredSales, productByKey]);

  const tramoRows: TramoRow[] = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: TramoKey;
        storeId: string;
        unidades: number;
        ventas: number;
        tickets: Set<string>;
        eans: Set<string>;
        margenAcumulado: number;
        rotWeightedSum: number;
        rotWeightedCount: number;
      }
    >();

    for (const s of filteredSales) {
      const pKey = `${s.store_id}|${s.ean}`;
      const info = productMetrics.get(pKey);
      const tramoKey = info?.tramo ?? 'sin_dato';

      const key = `${s.store_id}|${tramoKey}`;
      let bucket = groups.get(key);
      if (!bucket) {
        bucket = {
          key: tramoKey,
          storeId: s.store_id,
          unidades: 0,
          ventas: 0,
          tickets: new Set<string>(),
          eans: new Set<string>(),
          margenAcumulado: 0,
          rotWeightedSum: 0,
          rotWeightedCount: 0,
        };
        groups.set(key, bucket);
      }

      const unidades = Number(s.unidades_vendidas) || 0;
      const importe = Number(s.pvp) || 0;
      bucket.unidades += unidades;
      bucket.ventas += importe;
      if (s.numero_ticket) bucket.tickets.add(s.numero_ticket);
      bucket.eans.add(s.ean);

      const product = productByKey.get(pKey);
      if (product) {
        const pvpCat = Number(product.pvp) || 0;
        const precioCompra = Number(product.precio_compra) || 0;
        if (precioCompra > 0) {
          bucket.margenAcumulado += (pvpCat - precioCompra) * unidades;
        }
      }
      if (info?.rotacion !== null && info?.rotacion !== undefined) {
        bucket.rotWeightedSum += info.rotacion * unidades;
        bucket.rotWeightedCount += unidades;
      }
    }

    const rows: TramoRow[] = [];
    for (const b of Array.from(groups.values())) {
      const storeName = storeNameById.get(b.storeId) || '—';
      const tramo = TRAMOS.find((t) => t.key === b.key)!;
      const rotacionMedia =
        b.rotWeightedCount > 0 ? b.rotWeightedSum / b.rotWeightedCount : 0;
      rows.push({
        key: b.key,
        label: tramo.label,
        range: tramo.range,
        color: tramo.color,
        storeName,
        unidades: b.unidades,
        ventas: b.ventas,
        margenTotal: b.margenAcumulado,
        rotacionMedia,
        tickets: b.tickets.size,
        numProductos: b.eans.size,
      });
    }

    const order = new Map<TramoKey, number>();
    TRAMOS.forEach((t, i) => order.set(t.key, i));
    rows.sort((a, b) => {
      const oa = order.get(a.key) ?? 99;
      const ob = order.get(b.key) ?? 99;
      if (oa !== ob) return oa - ob;
      return a.storeName.localeCompare(b.storeName);
    });

    return rows;
  }, [filteredSales, productMetrics, productByKey, storeNameById]);

  const totalVentas = useMemo(
    () => tramoRows.reduce((s, r) => s + r.ventas, 0),
    [tramoRows]
  );
  const totalUnidades = useMemo(
    () => tramoRows.reduce((s, r) => s + r.unidades, 0),
    [tramoRows]
  );

  const rotacionGlobal = useMemo(() => {
    let soldTotal = 0;
    let stockTotal = 0;
    // `productMetrics` ya trae las unidades vendidas por producto: leerlas
    // aquí evita volver a recorrer todas las ventas una vez por producto.
    for (const [key, info] of Array.from(productMetrics.entries())) {
      const product = productByKey.get(key);
      if (!product) continue;
      soldTotal += info.sold;
      stockTotal += Number(product.unidades) || 0;
    }
    return stockTotal > 0 ? soldTotal / stockTotal : 0;
  }, [productMetrics, productByKey]);

  const productosVendidos = useMemo(() => {
    const set = new Set<string>();
    for (const s of filteredSales) set.add(`${s.store_id}|${s.ean}`);
    return set.size;
  }, [filteredSales]);

  const maxVentas = useMemo(
    () => tramoRows.reduce((m, r) => Math.max(m, r.ventas), 0),
    [tramoRows]
  );

  const clearFilters = () => {
    setStoreId('');
    setGranularidad('mensual');
  };

  const hasFilters = !!storeId;

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          label="Analítica"
          title="Rotación"
          actions={<><ExportButton
            filenameBase={`analitica_rotacion_${granularidad}`}
            headers={['Tramo', 'Rango', 'Tienda', 'Importe (€)', 'Unidades', 'Productos', 'Margen total (€)', 'Rotación media (×)', 'Tickets']}
            rows={tramoRows.map((r) => [r.label, r.range, r.storeName, r.ventas, r.unidades, r.numProductos, r.margenTotal, r.key === 'sin_dato' ? '' : r.rotacionMedia.toFixed(2), r.tickets])}
          /></>}
        />

        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando...</p>
        ) : (
          <>
            <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
              <div className="grid md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="eyebrow block mb-1.5">Tienda</label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="w-full h-10 px-3 bg-surface text-ink text-sm rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-ink-3 focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)] transition-shadow"
                  >
                    <option value="">Todas</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="eyebrow block mb-1.5">Periodo</label>
                  <select
                    value={granularidad}
                    onChange={(e) => setGranularidad(e.target.value as Granularidad)}
                    className="w-full h-10 px-3 bg-surface text-ink text-sm rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-ink-3 focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)] transition-shadow"
                  >
                    <option value="diario">Diario (hoy)</option>
                    <option value="semanal">Semanal (7d)</option>
                    <option value="mensual">Mensual (30d)</option>
                    <option value="anual">Anual (365d)</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className="eyebrow block mb-1.5">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setGranularidad('personalizado');
                    }}
                    className="w-full h-10 px-3 bg-surface text-ink text-sm rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-ink-3 focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)] transition-shadow"
                  />
                </div>
                <div>
                  <label className="eyebrow block mb-1.5">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setGranularidad('personalizado');
                    }}
                    className="w-full h-10 px-3 bg-surface text-ink text-sm rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-ink-3 focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)] transition-shadow"
                  />
                </div>
                <div>
                  <button
                    onClick={clearFilters}
                    disabled={!hasFilters}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none w-full"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
            )}

            <div className="grid md:grid-cols-4 gap-3">
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Ventas totales</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtEur(totalVentas)}</p>
              </div>
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Unidades vendidas</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtInt(totalUnidades)}</p>
              </div>
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Productos con ventas</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtInt(productosVendidos)}</p>
              </div>
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Rotación global</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtX(rotacionGlobal)}</p>
              </div>
            </div>

            <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-cartistry-border bg-cartistry-bg">
                <h3 className="font-serif font-bold text-cartistry-text">
                  Ventas por tramo de rotación
                </h3>
                <p className="text-xs text-cartistry-text-secondary mt-0.5">
                  Rotación por producto = unidades vendidas en el periodo ÷ stock actual. Cada venta cae en el tramo de su producto.
                </p>
              </div>

              {tramoRows.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-cartistry-text-secondary text-sm">
                    No hay ventas con estos filtros.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface">
                      <tr>
                        <th className="eyebrow text-left font-normal px-4 py-2.5">Tramo</th>
                        <th className="eyebrow text-left font-normal px-4 py-2.5">Rango</th>
                        <th className="eyebrow text-left font-normal px-4 py-2.5">Tienda</th>
                        <th className="eyebrow text-left font-normal px-4 py-2.5">Ventas (€)</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Importe</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Unidades</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Productos</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Margen total</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Rotación media</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Tickets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tramoRows.map((r, idx) => {
                        const pct = maxVentas > 0 ? (r.ventas / maxVentas) * 100 : 0;
                        return (
                          <tr key={`${r.key}-${r.storeName}-${idx}`} className="border-t border-cartistry-border">
                            <td className="px-4 py-2 font-medium text-cartistry-text">
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: r.color }}
                                  aria-hidden
                                />
                                {r.label}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-cartistry-text-secondary">{r.range}</td>
                            <td className="px-4 py-2 text-cartistry-text-secondary">{r.storeName}</td>
                            <td className="px-4 py-2">
                              <div className="h-2 bg-cartistry-bg rounded overflow-hidden min-w-[80px]">
                                <div
                                  className="h-full rounded"
                                  style={{ width: `${pct}%`, backgroundColor: r.color }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-cartistry-text font-medium">
                              {fmtEur(r.ventas)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-cartistry-text-secondary">
                              {fmtInt(r.unidades)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-cartistry-text-secondary">
                              {fmtInt(r.numProductos)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-cartistry-text-secondary">
                              {fmtEur(r.margenTotal)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-cartistry-text-secondary">
                              {r.key === 'sin_dato' ? '—' : fmtX(r.rotacionMedia)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-cartistry-text-secondary">
                              {fmtInt(r.tickets)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
