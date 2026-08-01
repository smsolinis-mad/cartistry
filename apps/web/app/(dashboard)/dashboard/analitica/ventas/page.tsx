'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { ExportButton } from '@/components/analitica/ExportButton';

type Granularidad = 'diario' | 'semanal' | 'mensual' | 'anual';

interface Store {
  id: string;
  nombre: string;
}

interface Sale {
  fecha: string;
  pvp: number | null;
  unidades_vendidas: number | null;
  numero_ticket: string | null;
  store_id: string;
}

interface Bucket {
  key: string;
  label: string;
  ventas: number;
  unidades: number;
  tickets: number;
  sortKey: string;
}

const fmtEur = (n: number) =>
  '€' + n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (n: number) => n.toLocaleString('es-ES');

function startOfWeekISO(d: Date): string {
  // ISO week: Monday as first day
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7; // Mon=0...Sun=6
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
}

function bucketize(sales: Sale[], granularidad: Granularidad): Bucket[] {
  const groups = new Map<string, { ventas: number; unidades: number; tickets: Set<string>; sortKey: string }>();

  for (const s of sales) {
    if (!s.fecha) continue;
    const [yyyy, mm, dd] = s.fecha.split('-');
    if (!yyyy || !mm || !dd) continue;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

    let key = '';
    let label = '';
    let sortKey = '';

    if (granularidad === 'diario') {
      key = s.fecha;
      sortKey = s.fecha;
      label = `${dd}/${mm}/${yyyy}`;
    } else if (granularidad === 'semanal') {
      const monday = startOfWeekISO(date);
      key = monday;
      sortKey = monday;
      const m = new Date(monday);
      const sundayDate = new Date(m);
      sundayDate.setDate(sundayDate.getDate() + 6);
      const fmtDate = (d: Date) =>
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      label = `${fmtDate(m)} – ${fmtDate(sundayDate)} (${m.getFullYear()})`;
    } else if (granularidad === 'mensual') {
      key = `${yyyy}-${mm}`;
      sortKey = key;
      const MESES = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ];
      label = `${MESES[Number(mm) - 1]} ${yyyy}`;
    } else {
      key = yyyy;
      sortKey = yyyy;
      label = yyyy;
    }

    let bucket = groups.get(key);
    if (!bucket) {
      bucket = { ventas: 0, unidades: 0, tickets: new Set<string>(), sortKey };
      groups.set(key, bucket);
    }
    bucket.ventas += Number(s.pvp) || 0;
    bucket.unidades += Number(s.unidades_vendidas) || 0;
    if (s.numero_ticket) bucket.tickets.add(s.numero_ticket);
  }

  const buckets: Bucket[] = Array.from(groups.entries()).map(([key, b]) => ({
    key,
    label:
      granularidad === 'diario'
        ? (() => {
            const [y, m, d] = key.split('-');
            return `${d}/${m}/${y}`;
          })()
        : granularidad === 'semanal'
          ? (() => {
              const m = new Date(key);
              const sun = new Date(m);
              sun.setDate(sun.getDate() + 6);
              const fmt = (d: Date) =>
                `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
              return `${fmt(m)} – ${fmt(sun)} ${m.getFullYear()}`;
            })()
          : granularidad === 'mensual'
            ? (() => {
                const MESES = [
                  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
                ];
                const [y, m] = key.split('-');
                return `${MESES[Number(m) - 1]} ${y}`;
              })()
            : key,
    ventas: b.ventas,
    unidades: b.unidades,
    tickets: b.tickets.size,
    sortKey: b.sortKey,
  }));

  buckets.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  return buckets;
}

export default function VentasAnaliticaPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [storeId, setStoreId] = useState<string>('');
  const [granularidad, setGranularidad] = useState<Granularidad>('mensual');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

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
        setLoading(false);
        return;
      }

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('fecha, pvp, unidades_vendidas, numero_ticket, store_id')
        .in('store_id', storeIds);

      if (salesError) {
        setError('Error cargando ventas');
        setLoading(false);
        return;
      }

      setSales((salesData as any) || []);
    } catch (err) {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (storeId && s.store_id !== storeId) return false;
      if (dateFrom && s.fecha < dateFrom) return false;
      if (dateTo && s.fecha > dateTo) return false;
      return true;
    });
  }, [sales, storeId, dateFrom, dateTo]);

  const buckets = useMemo(() => bucketize(filteredSales, granularidad), [filteredSales, granularidad]);

  const totalVentas = useMemo(
    () => filteredSales.reduce((s, x) => s + (Number(x.pvp) || 0), 0),
    [filteredSales]
  );
  const totalUnidades = useMemo(
    () => filteredSales.reduce((s, x) => s + (Number(x.unidades_vendidas) || 0), 0),
    [filteredSales]
  );
  const ticketsUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const s of filteredSales) if (s.numero_ticket) set.add(s.numero_ticket);
    return set.size;
  }, [filteredSales]);
  const ticketMedio = ticketsUnicos > 0 ? totalVentas / ticketsUnicos : 0;

  const maxVentas = useMemo(
    () => buckets.reduce((m, b) => Math.max(m, b.ventas), 0),
    [buckets]
  );

  const clearFilters = () => {
    setStoreId('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = !!(storeId || dateFrom || dateTo);

  const exportHeaders = [
    'Periodo',
    'Importe (€)',
    'Unidades',
    'Tickets',
    'Ticket medio (€)',
  ];
  const exportRows = buckets.map((b) => [
    b.label,
    b.ventas,
    b.unidades,
    b.tickets,
    b.tickets > 0 ? b.ventas / b.tickets : 0,
  ]);

  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-end justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-cartistry-accent hover:underline text-sm">
              ← Volver
            </Link>
            <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">
              Analítica · Ventas
            </h1>
          </div>
          <ExportButton
            filenameBase={`analitica_ventas_${granularidad}`}
            headers={exportHeaders}
            rows={exportRows}
          />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando...</p>
        ) : (
          <>
            <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
              <div className="grid md:grid-cols-5 gap-3 items-end">
                <div>
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
                  <label className="block text-xs text-cartistry-text-secondary mb-1">📅 Agrupación</label>
                  <select
                    value={granularidad}
                    onChange={(e) => setGranularidad(e.target.value as Granularidad)}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  >
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-cartistry-text-secondary mb-1">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cartistry-text-secondary mb-1">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
                <div>
                  <button
                    onClick={clearFilters}
                    disabled={!hasFilters}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm text-cartistry-accent hover:bg-cartistry-bg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Limpiar filtros
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
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Tickets</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtInt(ticketsUnicos)}</p>
              </div>
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs text-cartistry-text-secondary font-medium uppercase tracking-wider">Ticket medio</p>
                <p className="text-2xl font-serif font-bold text-cartistry-text mt-1">{fmtEur(ticketMedio)}</p>
              </div>
            </div>

            <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-cartistry-border bg-cartistry-bg">
                <h3 className="font-serif font-bold text-cartistry-text">
                  Ventas por periodo · {granularidad}
                </h3>
                <p className="text-xs text-cartistry-text-secondary mt-0.5">
                  {buckets.length} periodos con ventas
                </p>
              </div>

              {buckets.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-cartistry-text-secondary text-sm">
                    No hay ventas con estos filtros.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-cartistry-bg/50">
                    <tr className="text-xs text-cartistry-text-secondary">
                      <th className="text-left px-4 py-2 font-medium">Periodo</th>
                      <th className="text-left px-4 py-2 font-medium">Ventas (€)</th>
                      <th className="text-right px-4 py-2 font-medium">Importe</th>
                      <th className="text-right px-4 py-2 font-medium">Unidades</th>
                      <th className="text-right px-4 py-2 font-medium">Tickets</th>
                      <th className="text-right px-4 py-2 font-medium">Ticket medio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.map((b) => {
                      const ticketMed = b.tickets > 0 ? b.ventas / b.tickets : 0;
                      const pct = maxVentas > 0 ? (b.ventas / maxVentas) * 100 : 0;
                      return (
                        <tr key={b.key} className="border-t border-cartistry-border">
                          <td className="px-4 py-2 font-medium text-cartistry-text">{b.label}</td>
                          <td className="px-4 py-2">
                            <div className="h-2 bg-cartistry-bg rounded overflow-hidden min-w-[80px]">
                              <div
                                className="h-full bg-cartistry-accent rounded"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right text-cartistry-text font-medium">
                            {fmtEur(b.ventas)}
                          </td>
                          <td className="px-4 py-2 text-right text-cartistry-text-secondary">
                            {fmtInt(b.unidades)}
                          </td>
                          <td className="px-4 py-2 text-right text-cartistry-text-secondary">
                            {fmtInt(b.tickets)}
                          </td>
                          <td className="px-4 py-2 text-right text-cartistry-text-secondary">
                            {fmtEur(ticketMed)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
