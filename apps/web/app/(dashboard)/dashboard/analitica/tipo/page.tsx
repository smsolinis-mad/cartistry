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
  tipo: string | null;
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

interface TipoRow {
  tipo: string;
  storeName: string;
  unidades: number;
  ventas: number;
  pvpMedio: number;
  margenTotal: number;
  tickets: number;
  numProductos: number;
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

export default function TipoAnaliticaPage() {
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
  const [search, setSearch] = useState<string>('');

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
          .select('ean, store_id, tipo, pvp, precio_compra')
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

  const tipoRows: TipoRow[] = useMemo(() => {
    const groups = new Map<
      string,
      {
        tipo: string;
        storeId: string;
        unidades: number;
        ventas: number;
        tickets: Set<string>;
        eans: Set<string>;
        margenAcumulado: number;
      }
    >();

    for (const s of filteredSales) {
      const product = productByKey.get(`${s.store_id}|${s.ean}`);
      const tipo = (product?.tipo || '').trim() || '(sin tipo)';
      const key = `${s.store_id}|${tipo}`;
      let bucket = groups.get(key);
      if (!bucket) {
        bucket = {
          tipo,
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
      if (product) {
        const pvpCat = Number(product.pvp) || 0;
        const precioCompra = Number(product.precio_compra) || 0;
        bucket.margenAcumulado += (pvpCat - precioCompra) * unidades;
      }
    }

    const rows: TipoRow[] = [];
    for (const b of Array.from(groups.values())) {
      const storeName = storeNameById.get(b.storeId) || '—';
      const pvpMedio = b.unidades > 0 ? b.ventas / b.unidades : 0;
      rows.push({
        tipo: b.tipo,
        storeName,
        unidades: b.unidades,
        ventas: b.ventas,
        pvpMedio,
        margenTotal: b.margenAcumulado,
        tickets: b.tickets.size,
        numProductos: b.eans.size,
      });
    }

    const term = search.trim().toLowerCase();
    const filtered = term
      ? rows.filter((r) => r.tipo.toLowerCase().includes(term))
      : rows;

    filtered.sort((a, b) => b.ventas - a.ventas);
    return filtered;
  }, [filteredSales, productByKey, storeNameById, search]);

  const totalVentas = useMemo(
    () => tipoRows.reduce((s, r) => s + r.ventas, 0),
    [tipoRows]
  );
  const totalUnidades = useMemo(
    () => tipoRows.reduce((s, r) => s + r.unidades, 0),
    [tipoRows]
  );
  const numTipos = tipoRows.length;
  const maxVentas = useMemo(
    () => tipoRows.reduce((m, r) => Math.max(m, r.ventas), 0),
    [tipoRows]
  );

  const clearFilters = () => {
    setStoreId('');
    setSearch('');
    setGranularidad('mensual');
  };

  const hasFilters = !!(storeId || search);

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          label="Analítica"
          title="Tipo"
          actions={<><ExportButton
            filenameBase={`analitica_tipo_${granularidad}`}
            headers={['Tipo', 'Tienda', 'Importe (€)', 'Unidades', 'Productos', 'PVP medio (€)', 'Margen (€)', 'Tickets']}
            rows={tipoRows.map((r) => [r.tipo, r.storeName, r.ventas, r.unidades, r.numProductos, r.pvpMedio, r.margenTotal, r.tickets])}
          /></>}
        />

        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando...</p>
        ) : (
          <>
            <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
              <div className="grid md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-2">
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
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="🔎 Buscar tipo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 px-3 bg-surface text-ink text-sm rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-ink-3 focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)] transition-shadow"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
            )}

            <div className="grid md:grid-cols-3 gap-3">
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Ventas totales</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtEur(totalVentas)}</p>
              </div>
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Unidades</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtInt(totalUnidades)}</p>
              </div>
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Tipos con ventas</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtInt(numTipos)}</p>
              </div>
            </div>

            <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-cartistry-border bg-cartistry-bg">
                <h3 className="font-serif font-bold text-cartistry-text">
                  Ventas por tipo
                </h3>
                <p className="text-xs text-cartistry-text-secondary mt-0.5">
                  Cada fila agrega las ventas de los productos del mismo tipo, ordenadas por importe.
                </p>
              </div>

              {tipoRows.length === 0 ? (
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
                        <th className="eyebrow text-left font-normal px-4 py-2.5">Tipo</th>
                        <th className="eyebrow text-left font-normal px-4 py-2.5">Tienda</th>
                        <th className="eyebrow text-left font-normal px-4 py-2.5">Ventas (€)</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Importe</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Unidades</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Productos</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">PVP medio</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Margen</th>
                        <th className="eyebrow text-right font-normal px-4 py-2.5">Tickets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipoRows.map((r) => {
                        const pct = maxVentas > 0 ? (r.ventas / maxVentas) * 100 : 0;
                        return (
                          <tr key={`${r.storeName}-${r.tipo}`} className="border-t border-cartistry-border">
                            <td className="px-4 py-2 font-medium text-cartistry-text">{r.tipo}</td>
                            <td className="px-4 py-2 text-cartistry-text-secondary">{r.storeName}</td>
                            <td className="px-4 py-2">
                              <div className="h-2 bg-cartistry-bg rounded overflow-hidden min-w-[80px]">
                                <div
                                  className="h-full bg-cartistry-accent rounded"
                                  style={{ width: `${pct}%` }}
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
                              {fmtEur(r.pvpMedio)}
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
