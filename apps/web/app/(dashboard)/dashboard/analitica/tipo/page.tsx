'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { ExportButton } from '@/components/analitica/ExportButton';

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

const fmtEur = (n: number) =>
  '€' + n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('es-ES');

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
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
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

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
        supabase
          .from('sales')
          .select('fecha, pvp, unidades_vendidas, numero_ticket, ean, store_id')
          .in('store_id', storeIds),
      ]);

      setProducts((productsData as any) || []);
      setSales((salesData as any) || []);
    } catch (err) {
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
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-end justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-cartistry-accent hover:underline text-sm">
              ← Volver
            </Link>
            <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">
              Analítica · Tipo
            </h1>
          </div>
          <ExportButton
            filenameBase={`analitica_tipo_${granularidad}`}
            headers={['Tipo', 'Tienda', 'Importe (€)', 'Unidades', 'Productos', 'PVP medio (€)', 'Margen (€)', 'Tickets']}
            rows={tipoRows.map((r) => [r.tipo, r.storeName, r.ventas, r.unidades, r.numProductos, r.pvpMedio, r.margenTotal, r.tickets])}
          />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando...</p>
        ) : (
          <>
            <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
              <div className="grid md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs text-cartistry-text-secondary mb-1">🏬 Tienda</label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  >
                    <option value="">Todas</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-cartistry-text-secondary mb-1">📅 Periodo</label>
                  <select
                    value={granularidad}
                    onChange={(e) => setGranularidad(e.target.value as Granularidad)}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  >
                    <option value="diario">Diario (hoy)</option>
                    <option value="semanal">Semanal (7d)</option>
                    <option value="mensual">Mensual (30d)</option>
                    <option value="anual">Anual (365d)</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-cartistry-text-secondary mb-1">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setGranularidad('personalizado');
                    }}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cartistry-text-secondary mb-1">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setGranularidad('personalizado');
                    }}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
                <div>
                  <button
                    onClick={clearFilters}
                    disabled={!hasFilters}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm text-cartistry-accent hover:bg-cartistry-bg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
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
                    <thead className="bg-cartistry-bg/50">
                      <tr className="text-xs text-cartistry-text-secondary">
                        <th className="text-left px-4 py-2 font-medium">Tipo</th>
                        <th className="text-left px-4 py-2 font-medium">Tienda</th>
                        <th className="text-left px-4 py-2 font-medium">Ventas (€)</th>
                        <th className="text-right px-4 py-2 font-medium">Importe</th>
                        <th className="text-right px-4 py-2 font-medium">Unidades</th>
                        <th className="text-right px-4 py-2 font-medium">Productos</th>
                        <th className="text-right px-4 py-2 font-medium">PVP medio</th>
                        <th className="text-right px-4 py-2 font-medium">Margen</th>
                        <th className="text-right px-4 py-2 font-medium">Tickets</th>
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
                            <td className="px-4 py-2 text-right text-cartistry-text font-medium">
                              {fmtEur(r.ventas)}
                            </td>
                            <td className="px-4 py-2 text-right text-cartistry-text-secondary">
                              {fmtInt(r.unidades)}
                            </td>
                            <td className="px-4 py-2 text-right text-cartistry-text-secondary">
                              {fmtInt(r.numProductos)}
                            </td>
                            <td className="px-4 py-2 text-right text-cartistry-text-secondary">
                              {fmtEur(r.pvpMedio)}
                            </td>
                            <td className="px-4 py-2 text-right text-cartistry-text-secondary">
                              {fmtEur(r.margenTotal)}
                            </td>
                            <td className="px-4 py-2 text-right text-cartistry-text-secondary">
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
