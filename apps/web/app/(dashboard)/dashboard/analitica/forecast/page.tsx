'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { ExportButton } from '@/components/analitica/ExportButton';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

interface Store {
  id: string;
  nombre: string;
}

interface MonthForecast {
  objetivo_unidades: string;
  objetivo_ticket_medio: string;
  objetivo_ventas_totales: string;
}

interface MonthlyAggregate {
  unidades: number;
  ventasTotales: number;
  ticketMedio: number;
}

const emptyMonth = (): MonthForecast => ({
  objetivo_unidades: '',
  objetivo_ticket_medio: '',
  objetivo_ventas_totales: '',
});

const emptyAggregate = (): MonthlyAggregate => ({
  unidades: 0,
  ventasTotales: 0,
  ticketMedio: 0,
});

const formatInt = (n: number) => n > 0 ? Math.round(n).toLocaleString('es-ES') : '—';
const formatEur = (n: number) => n > 0 ? `€${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

function DeltaPct({ actual, forecast }: { actual: number; forecast: number }) {
  if (forecast <= 0) return <span className="text-cartistry-text-secondary">—</span>;
  if (actual <= 0) return <span className="text-cartistry-text-secondary">—</span>;
  const pct = ((actual - forecast) / forecast) * 100;
  const positive = pct >= 0;
  const cls = positive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
  const sign = positive ? '+' : '';
  return (
    <span className={`inline-block px-1 py-0.5 rounded font-medium ${cls}`} style={{ fontSize: '0.65rem' }}>
      {sign}{pct.toFixed(0)}%
    </span>
  );
}

export default function ForecastPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [rows, setRows] = useState<MonthForecast[]>(Array.from({ length: 12 }, emptyMonth));
  const [prevYearAggregates, setPrevYearAggregates] = useState<MonthlyAggregate[]>(
    Array.from({ length: 12 }, emptyAggregate)
  );
  const [currentYearAggregates, setCurrentYearAggregates] = useState<MonthlyAggregate[]>(
    Array.from({ length: 12 }, emptyAggregate)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (!selectedStoreId) return;
    loadForecast(selectedStoreId, year);
    loadActuals(selectedStoreId, year);
  }, [selectedStoreId, year]);

  const loadStores = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('stores')
        .select('id, nombre')
        .eq('user_id', userId)
        .order('nombre', { ascending: true });

      if (fetchError) {
        setError('Error cargando tiendas');
        return;
      }

      const list = data || [];
      setStores(list);
      if (list.length > 0) {
        const storedActive = localStorage.getItem('current_store_id');
        const initial = list.find((s: any) => s.id === storedActive) || list[0];
        setSelectedStoreId(initial.id);
      }
    } catch (err) {
      setError('Error cargando tiendas');
    } finally {
      setLoading(false);
    }
  };

  const loadForecast = async (storeId: string, yr: number) => {
    setError('');
    setSuccess('');
    const { data, error: fetchError } = await supabase
      .from('forecasts')
      .select('month, objetivo_unidades, objetivo_ticket_medio, objetivo_ventas_totales')
      .eq('store_id', storeId)
      .eq('year', yr);

    if (fetchError) {
      setError(`Error cargando forecast: ${fetchError.message}`);
      return;
    }

    const next = Array.from({ length: 12 }, emptyMonth);
    for (const r of data || []) {
      const idx = (r.month as number) - 1;
      if (idx >= 0 && idx < 12) {
        next[idx] = {
          objetivo_unidades: r.objetivo_unidades?.toString() || '',
          objetivo_ticket_medio: r.objetivo_ticket_medio?.toString() || '',
          objetivo_ventas_totales: r.objetivo_ventas_totales?.toString() || '',
        };
      }
    }
    setRows(next);
  };

  const loadActuals = async (storeId: string, yr: number) => {
    const desde = `${yr - 1}-01-01`;
    const hasta = `${yr}-12-31`;

    const { data, error: fetchError } = await supabase
      .from('sales')
      .select('fecha, numero_ticket, unidades_vendidas, pvp')
      .eq('store_id', storeId)
      .gte('fecha', desde)
      .lte('fecha', hasta);

    if (fetchError) {
      console.error('Error cargando ventas reales:', fetchError);
      setPrevYearAggregates(Array.from({ length: 12 }, emptyAggregate));
      setCurrentYearAggregates(Array.from({ length: 12 }, emptyAggregate));
      return;
    }

    const buildAggregates = (targetYear: number) => {
      const unidadesPorMes = Array(12).fill(0);
      const ventasPorMes = Array(12).fill(0);
      const ticketsPorMes: Array<Map<string, number>> = Array.from({ length: 12 }, () => new Map());

      for (const s of data || []) {
        if (!s.fecha) continue;
        const [yyStr, mmStr] = String(s.fecha).split('-');
        const yy = parseInt(yyStr, 10);
        const mm = parseInt(mmStr, 10);
        if (yy !== targetYear || !mm || mm < 1 || mm > 12) continue;
        const idx = mm - 1;
        const unidades = Number(s.unidades_vendidas) || 0;
        const importe = Number(s.pvp) || 0;
        unidadesPorMes[idx] += unidades;
        ventasPorMes[idx] += importe;
        const ticket = s.numero_ticket || `__no_ticket_${Math.random()}`;
        const prev = ticketsPorMes[idx].get(ticket) || 0;
        ticketsPorMes[idx].set(ticket, prev + importe);
      }

      return ticketsPorMes.map((m, idx) => {
        const numTickets = m.size;
        const ventasTotales = ventasPorMes[idx];
        const ticketMedio = numTickets > 0 ? ventasTotales / numTickets : 0;
        return {
          unidades: unidadesPorMes[idx],
          ventasTotales,
          ticketMedio,
        };
      });
    };

    setPrevYearAggregates(buildAggregates(yr - 1));
    setCurrentYearAggregates(buildAggregates(yr));
  };

  const updateCell = (
    monthIdx: number,
    field: keyof MonthForecast,
    value: string
  ) => {
    setRows((prev) => {
      const next = [...prev];
      next[monthIdx] = { ...next[monthIdx], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedStoreId) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = rows
        .map((row, idx) => ({
          store_id: selectedStoreId,
          year,
          month: idx + 1,
          objetivo_unidades: parseFloat(row.objetivo_unidades) || 0,
          objetivo_ticket_medio: parseFloat(row.objetivo_ticket_medio) || 0,
          objetivo_ventas_totales: parseFloat(row.objetivo_ventas_totales) || 0,
        }));

      const { error: upsertError } = await supabase
        .from('forecasts')
        .upsert(payload, { onConflict: 'store_id,year,month' });

      if (upsertError) {
        setError(`Error guardando: ${upsertError.message}`);
        return;
      }

      setSuccess('✓ Forecast guardado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando forecast');
    } finally {
      setSaving(false);
    }
  };

  const yearOptions = (() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1, current + 2];
  })();

  const storeName = stores.find((s) => s.id === selectedStoreId)?.nombre || '';
  const exportHeaders = [
    'Métrica',
    'Mes',
    `Año anterior (${year - 1})`,
    `Forecast (${year})`,
    `Año en curso (${year})`,
    'Δ% vs forecast',
  ];
  const METRIC_NAMES: Record<'unidades' | 'ticketMedio' | 'ventasTotales', string> = {
    unidades: 'Unidades',
    ticketMedio: 'Ticket medio (€)',
    ventasTotales: 'Ventas totales (€)',
  };
  const METRIC_FIELDS: Record<'unidades' | 'ticketMedio' | 'ventasTotales', 'objetivo_unidades' | 'objetivo_ticket_medio' | 'objetivo_ventas_totales'> = {
    unidades: 'objetivo_unidades',
    ticketMedio: 'objetivo_ticket_medio',
    ventasTotales: 'objetivo_ventas_totales',
  };
  const exportRows = (['unidades', 'ticketMedio', 'ventasTotales'] as const).flatMap(
    (key) =>
      MESES.map((mes, idx) => {
        const prev = prevYearAggregates[idx][key];
        const current = currentYearAggregates[idx][key];
        const forecast = parseFloat(rows[idx][METRIC_FIELDS[key]]) || 0;
        const delta =
          forecast > 0 && current > 0 ? ((current - forecast) / forecast) * 100 : null;
        return [
          METRIC_NAMES[key],
          mes,
          prev,
          forecast,
          current,
          delta === null ? '' : `${delta.toFixed(1)}%`,
        ];
      })
  );

  type MetricKey = 'unidades' | 'ticketMedio' | 'ventasTotales';
  const METRICS: Array<{
    key: MetricKey;
    title: string;
    formatter: (n: number) => string;
    forecastField: keyof MonthForecast;
    inputStep: string;
    inputPlaceholder: string;
  }> = [
    {
      key: 'unidades',
      title: 'Unidades',
      formatter: formatInt,
      forecastField: 'objetivo_unidades',
      inputStep: '1',
      inputPlaceholder: '0',
    },
    {
      key: 'ticketMedio',
      title: 'Ticket medio (€)',
      formatter: formatEur,
      forecastField: 'objetivo_ticket_medio',
      inputStep: '0.01',
      inputPlaceholder: '0.00',
    },
    {
      key: 'ventasTotales',
      title: 'Ventas totales (€)',
      formatter: formatEur,
      forecastField: 'objetivo_ventas_totales',
      inputStep: '0.01',
      inputPlaceholder: '0.00',
    },
  ];

  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-end justify-between gap-4">
          <div>
            <Link href="/dashboard/analitica" className="text-cartistry-accent hover:underline text-sm">
              ← Volver
            </Link>
            <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">
              Forecast — Objetivos de ventas
            </h1>
          </div>
          <ExportButton
            filenameBase={`forecast_${(storeName || 'todas').replace(/\s+/g, '_')}_${year}`}
            headers={exportHeaders}
            rows={exportRows}
          />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando...</p>
        ) : stores.length === 0 ? (
          <p className="text-cartistry-text-secondary text-sm">No tienes tiendas configuradas todavía.</p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <label className="block text-sm font-medium text-cartistry-text mb-2">🏬 Tienda</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full px-3 py-2 border border-cartistry-border rounded bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent text-sm"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <label className="block text-sm font-medium text-cartistry-text mb-2">📅 Año</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-cartistry-border rounded bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent text-sm"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">{success}</div>
            )}

            {METRICS.map((metric) => {
              const isAverage = metric.key === 'ticketMedio';
              const today = new Date();
              const currentYear = today.getFullYear();
              const currentMonthIdx0 = today.getMonth(); // 0..11
              // Cuántos meses cubre el "hasta la fecha" para el año seleccionado
              const ytdCount =
                year < currentYear ? 12 : year === currentYear ? currentMonthIdx0 + 1 : 0;

              const aggregate = (monthlies: number[], count: number) => {
                const slice = monthlies.slice(0, count);
                const sum = slice.reduce((s, v) => s + v, 0);
                if (!isAverage) return sum;
                const nonZero = slice.filter((v) => v > 0).length;
                return nonZero > 0 ? sum / nonZero : 0;
              };

              const prevMonthly = prevYearAggregates.map((a) => a[metric.key]);
              const currentMonthly = currentYearAggregates.map((a) => a[metric.key]);
              const forecastMonthly = rows.map(
                (r) => parseFloat(r[metric.forecastField]) || 0
              );

              const prevYTD = aggregate(prevMonthly, ytdCount);
              const currentYTD = aggregate(currentMonthly, ytdCount);
              const forecastYTD = aggregate(forecastMonthly, ytdCount);

              const prevTotal = aggregate(prevMonthly, 12);
              const currentTotal = aggregate(currentMonthly, 12);
              const forecastTotal = aggregate(forecastMonthly, 12);

              const totalLabel = isAverage ? 'Media' : 'Total';
              const ytdLabel = isAverage ? 'Media YTD' : 'YTD';
              return (
              <div key={metric.key} className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
                <div className="px-4 py-3 border-b border-cartistry-border bg-cartistry-bg">
                  <h3 className="font-serif font-bold text-cartistry-text">{metric.title}</h3>
                </div>
                <table className="w-full table-fixed text-xs">
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    {MESES_CORTOS.map((m) => (
                      <col key={m} style={{ width: '6.25%' }} />
                    ))}
                    <col style={{ width: '7.5%' }} />
                    <col style={{ width: '7.5%' }} />
                  </colgroup>
                  <thead className="bg-cartistry-bg/50">
                    <tr className="text-cartistry-text-secondary">
                      <th className="text-left px-2 py-2 font-medium">&nbsp;</th>
                      {MESES_CORTOS.map((m, idx) => (
                        <th key={m} className="text-center px-1 py-2 font-medium" title={MESES[idx]}>{m}</th>
                      ))}
                      <th
                        className="text-center px-1 py-2 font-medium border-l border-cartistry-border bg-cartistry-bg"
                        title={`Enero a ${ytdCount > 0 ? MESES[ytdCount - 1] : '—'}`}
                      >
                        {ytdLabel}
                      </th>
                      <th
                        className="text-center px-1 py-2 font-medium border-l border-cartistry-border bg-cartistry-bg"
                        title="Enero a Diciembre"
                      >
                        {totalLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-cartistry-border">
                      <td className="px-2 py-1.5 font-medium text-cartistry-text truncate" title={`Año anterior (${year - 1})`}>
                        Año ant. ({year - 1})
                      </td>
                      {MESES_CORTOS.map((_, idx) => (
                        <td key={idx} className="px-1 py-1.5 text-center text-cartistry-text-secondary truncate">
                          {metric.formatter(prevYearAggregates[idx][metric.key])}
                        </td>
                      ))}
                      <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                        {metric.formatter(prevYTD)}
                      </td>
                      <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                        {metric.formatter(prevTotal)}
                      </td>
                    </tr>
                    <tr className="border-t border-cartistry-border">
                      <td className="px-2 py-1.5 font-medium text-cartistry-text truncate" title={`Forecast (${year})`}>
                        Forecast ({year})
                      </td>
                      {MESES_CORTOS.map((_, idx) => (
                        <td key={idx} className="px-0.5 py-1.5">
                          <input
                            type="number"
                            value={rows[idx][metric.forecastField]}
                            onChange={(e) => updateCell(idx, metric.forecastField, e.target.value)}
                            className="no-spinner w-full px-1 py-1 border border-cartistry-border rounded bg-white text-cartistry-text focus:outline-none focus:ring-1 focus:ring-cartistry-accent text-xs text-center"
                            placeholder={metric.inputPlaceholder}
                            min="0"
                            step={metric.inputStep}
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                        {metric.formatter(forecastYTD)}
                      </td>
                      <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                        {metric.formatter(forecastTotal)}
                      </td>
                    </tr>
                    <tr className="border-t border-cartistry-border">
                      <td className="px-2 py-1.5 font-medium text-cartistry-text truncate" title={`Año en curso (${year})`}>
                        Año en curso
                      </td>
                      {MESES_CORTOS.map((_, idx) => (
                        <td key={idx} className="px-1 py-1.5 text-center text-cartistry-text truncate">
                          {metric.formatter(currentYearAggregates[idx][metric.key])}
                        </td>
                      ))}
                      <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                        {metric.formatter(currentYTD)}
                      </td>
                      <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                        {metric.formatter(currentTotal)}
                      </td>
                    </tr>
                    <tr className="border-t border-cartistry-border">
                      <td className="px-2 py-1.5 font-medium text-cartistry-text truncate" title="Δ% vs forecast">
                        Δ% forecast
                      </td>
                      {MESES_CORTOS.map((_, idx) => {
                        const currentValue = currentYearAggregates[idx][metric.key];
                        const forecastValue = parseFloat(rows[idx][metric.forecastField]) || 0;
                        return (
                          <td key={idx} className="px-1 py-1.5 text-center">
                            <DeltaPct actual={currentValue} forecast={forecastValue} />
                          </td>
                        );
                      })}
                      <td className="px-1 py-1.5 text-center border-l border-cartistry-border bg-cartistry-bg/40">
                        <DeltaPct actual={currentYTD} forecast={forecastYTD} />
                      </td>
                      <td className="px-1 py-1.5 text-center border-l border-cartistry-border bg-cartistry-bg/40">
                        <DeltaPct actual={currentTotal} forecast={forecastTotal} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              );
            })}

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar forecast'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
