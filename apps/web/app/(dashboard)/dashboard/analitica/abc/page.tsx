'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { ExportButton } from '@/components/analitica/ExportButton';
import { PageHeader } from '@/components/ui';
import { formatEUR as fmtEur, formatInt as fmtInt, formatPct as fmtPct } from '@/lib/format';
import { toISODate as toISO } from '@/lib/dates';
import { rangoDeFechas } from '@/lib/supabase/rango';

type Granularidad = 'diario' | 'semanal' | 'mensual' | 'anual' | 'personalizado';

interface Store {
  id: string;
  nombre: string;
}

interface Product {
  ean: string;
  nombre: string;
  store_id: string;
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

type TramoKey = 'A' | 'B' | 'C';

const TRAMOS: Array<{ key: TramoKey; label: string; range: string; color: string }> = [
  { key: 'A', label: 'A · Estrellas',  range: '0–80% acumulado',   color: '#3F7D5A' },
  { key: 'B', label: 'B · Intermedios', range: '80–95% acumulado', color: '#C9892F' },
  { key: 'C', label: 'C · Cola larga',  range: '95–100% acumulado', color: '#D97A3A' },
];

interface TramoRow {
  key: TramoKey;
  label: string;
  range: string;
  color: string;
  storeName: string;
  unidades: number;
  ventas: number;
  margenTotal: number;
  tickets: number;
  numProductos: number;
  // calculados después
  pctVentas: number;
  pctProductos: number;
}



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

export default function ABCAnaliticaPage() {
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
          .select('ean, nombre, store_id, pvp, precio_compra')
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

  // Por cada (store_id, ean) calcular ventas totales y luego asignar A/B/C
  // ordenando por ventas dentro de cada tienda y aplicando umbrales acumulados.
  const productMetrics = useMemo(() => {
    // Paso 1: ventas por producto
    const sold = new Map<string, { ventas: number; unidades: number; storeId: string }>();
    for (const s of filteredSales) {
      const key = `${s.store_id}|${s.ean}`;
      let bucket = sold.get(key);
      if (!bucket) {
        bucket = { ventas: 0, unidades: 0, storeId: s.store_id };
        sold.set(key, bucket);
      }
      bucket.ventas += Number(s.pvp) || 0;
      bucket.unidades += Number(s.unidades_vendidas) || 0;
    }

    // Paso 2: agrupar por tienda, ordenar desc por ventas, asignar tramo según
    // % acumulado.
    const productInfo = new Map<string, { tramo: TramoKey; ventas: number }>();
    const productsByStore = new Map<string, Array<{ key: string; ventas: number }>>();
    for (const [key, b] of Array.from(sold.entries())) {
      let arr = productsByStore.get(b.storeId);
      if (!arr) {
        arr = [];
        productsByStore.set(b.storeId, arr);
      }
      arr.push({ key, ventas: b.ventas });
    }

    for (const [, arr] of Array.from(productsByStore.entries())) {
      arr.sort((a, b) => b.ventas - a.ventas);
      const total = arr.reduce((s, x) => s + x.ventas, 0);
      let cum = 0;
      for (const item of arr) {
        cum += item.ventas;
        const cumPct = total > 0 ? (cum / total) * 100 : 0;
        let tramo: TramoKey;
        if (cumPct <= 80) tramo = 'A';
        else if (cumPct <= 95) tramo = 'B';
        else tramo = 'C';
        productInfo.set(item.key, { tramo, ventas: item.ventas });
      }
    }

    return productInfo;
  }, [filteredSales]);

  const tramoRows: TramoRow[] = useMemo(() => {
    // num productos con ventas por tienda (para % productos)
    const productosVendidosPorTienda = new Map<string, number>();
    for (const [key] of Array.from(productMetrics.entries())) {
      const sId = key.split('|')[0];
      productosVendidosPorTienda.set(
        sId,
        (productosVendidosPorTienda.get(sId) || 0) + 1
      );
    }

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
      }
    >();

    for (const s of filteredSales) {
      const pKey = `${s.store_id}|${s.ean}`;
      const info = productMetrics.get(pKey);
      const tramoKey = info?.tramo ?? 'C';

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
    }

    // totales ventas por tienda (para % ventas)
    const ventasPorTienda = new Map<string, number>();
    for (const b of Array.from(groups.values())) {
      ventasPorTienda.set(b.storeId, (ventasPorTienda.get(b.storeId) || 0) + b.ventas);
    }

    const rows: TramoRow[] = [];
    for (const b of Array.from(groups.values())) {
      const storeName = storeNameById.get(b.storeId) || '—';
      const tramo = TRAMOS.find((t) => t.key === b.key)!;
      const totalVentasTienda = ventasPorTienda.get(b.storeId) || 0;
      const totalProductosTienda = productosVendidosPorTienda.get(b.storeId) || 0;
      const pctVentas =
        totalVentasTienda > 0 ? (b.ventas / totalVentasTienda) * 100 : 0;
      const pctProductos =
        totalProductosTienda > 0 ? (b.eans.size / totalProductosTienda) * 100 : 0;

      rows.push({
        key: b.key,
        label: tramo.label,
        range: tramo.range,
        color: tramo.color,
        storeName,
        unidades: b.unidades,
        ventas: b.ventas,
        margenTotal: b.margenAcumulado,
        tickets: b.tickets.size,
        numProductos: b.eans.size,
        pctVentas,
        pctProductos,
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
  const productosVendidos = useMemo(() => {
    const set = new Set<string>();
    for (const s of filteredSales) set.add(`${s.store_id}|${s.ean}`);
    return set.size;
  }, [filteredSales]);

  // Concentración Pareto: ¿qué % de productos genera el 80% de las ventas?
  const concentracionPareto = useMemo(() => {
    let nA = 0;
    let totalProd = 0;
    for (const [, info] of Array.from(productMetrics.entries())) {
      totalProd += 1;
      if (info.tramo === 'A') nA += 1;
    }
    return totalProd > 0 ? (nA / totalProd) * 100 : 0;
  }, [productMetrics]);

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
          title="Análisis ABC / Pareto"
          actions={<><ExportButton
            filenameBase={`analitica_abc_${granularidad}`}
            headers={['Tramo', 'Rango', 'Tienda', 'Importe (€)', '% ventas', 'Unidades', 'Productos', '% productos', 'Margen total (€)', 'Tickets']}
            rows={tramoRows.map((r) => [r.label, r.range, r.storeName, r.ventas, r.pctVentas.toFixed(1), r.unidades, r.numProductos, r.pctProductos.toFixed(1), r.margenTotal, r.tickets])}
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
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Unidades</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtInt(totalUnidades)}</p>
              </div>
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Productos con ventas</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtInt(productosVendidos)}</p>
              </div>
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">% productos en A</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtPct(concentracionPareto)}</p>
                <p className="text-[10px] text-cartistry-text-secondary mt-1 leading-tight">
                  generan el 80% de las ventas
                </p>
              </div>
            </div>

            <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-cartistry-border bg-cartistry-bg">
                <h3 className="font-serif font-bold text-cartistry-text">
                  Ventas por tramo ABC
                </h3>
                <p className="text-xs text-cartistry-text-secondary mt-0.5">
                  Tramo A = top que aporta el 80% acumulado · B = 80–95% · C = 95–100%. Se calcula por tienda.
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
                        <th className="eyebrow text-right font-normal px-4 py-2.5">% ventas</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Unidades</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Productos</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">% productos</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Margen total</th>
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
                              {fmtPct(r.pctVentas)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-cartistry-text-secondary">
                              {fmtInt(r.unidades)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-cartistry-text-secondary">
                              {fmtInt(r.numProductos)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-cartistry-text-secondary">
                              {fmtPct(r.pctProductos)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-cartistry-text-secondary">
                              {fmtEur(r.margenTotal)}
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
