'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PLANES, type PlanKey } from '@/lib/admin';
import {
  loadBrands,
  loadInvoices,
  importeDe,
  formatEUR,
  currentPeriod,
  periodLabel,
  type Brand,
  type Invoice,
} from '@/lib/admin-data';
import { MetricCard } from '@/components/admin/AdminSidebar';
import { MESES_LARGO as MESES, MESES as MESES_CORTOS } from '@/lib/dates';


type MetricKey = 'empresas' | 'tiendas' | 'facturacion';

const formatInt = (n: number) => (n > 0 ? Math.round(n).toLocaleString('es-ES') : '—');
const formatEur = (n: number) => (n > 0 ? formatEUR(n) : '—');

function DeltaPct({ actual, forecast }: { actual: number; forecast: number }) {
  if (forecast <= 0 || actual <= 0) return <span className="text-cartistry-text-secondary">—</span>;
  const pct = ((actual - forecast) / forecast) * 100;
  const positive = pct >= 0;
  const cls = positive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
  return (
    <span className={`inline-block px-1 py-0.5 rounded font-medium ${cls}`} style={{ fontSize: '0.65rem' }}>
      {positive ? '+' : ''}
      {pct.toFixed(0)}%
    </span>
  );
}

export default function RatiosPage() {
  const supabase = createClient();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  const [invoicesPeriodo, setInvoicesPeriodo] = useState<Record<string, Invoice>>({});
  const [allInvoices, setAllInvoices] = useState<{ periodo: string; importe: number }[]>([]);
  const [companyTs, setCompanyTs] = useState<number[]>([]);
  const [storeTs, setStoreTs] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [year, setYear] = useState(new Date().getFullYear());
  // Forecast editable por métrica → 12 meses
  const [forecastRows, setForecastRows] = useState<Record<MetricKey, string[]>>({
    empresas: Array(12).fill(''),
    tiendas: Array(12).fill(''),
    facturacion: Array(12).fill(''),
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const period = currentPeriod();

  // Cargar el forecast guardado del año seleccionado
  useEffect(() => {
    (async () => {
      setSaveMsg('');
      const { data, error: err } = await supabase
        .from('admin_forecasts')
        .select('metrica, month, valor')
        .eq('year', year);
      const next: Record<MetricKey, string[]> = {
        empresas: Array(12).fill(''),
        tiendas: Array(12).fill(''),
        facturacion: Array(12).fill(''),
      };
      if (!err) {
        (data || []).forEach((r: any) => {
          const key = r.metrica as MetricKey;
          const idx = (r.month as number) - 1;
          if (next[key] && idx >= 0 && idx < 12) {
            next[key][idx] = r.valor != null ? String(r.valor) : '';
          }
        });
      }
      setForecastRows(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const guardarForecast = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const rows: { metrica: MetricKey; year: number; month: number; valor: number; updated_at: string }[] = [];
      (Object.keys(forecastRows) as MetricKey[]).forEach((key) => {
        forecastRows[key].forEach((v, idx) => {
          rows.push({
            metrica: key,
            year,
            month: idx + 1,
            valor: parseFloat(v) || 0,
            updated_at: new Date().toISOString(),
          });
        });
      });
      const { error: err } = await supabase
        .from('admin_forecasts')
        .upsert(rows, { onConflict: 'metrica,year,month' });
      if (err) throw err;
      setSaveMsg('✓ Forecast guardado');
    } catch (err: any) {
      setSaveMsg(err?.message || 'Error guardando forecast');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [{ brands, storeCounts }, invPeriodo, invAll, companies, stores] = await Promise.all([
          loadBrands(),
          loadInvoices(period),
          supabase.from('invoices').select('periodo, importe'),
          supabase.from('company_settings').select('created_at'),
          supabase.from('stores').select('created_at'),
        ]);
        setBrands(brands);
        setStoreCounts(storeCounts);
        setInvoicesPeriodo(invPeriodo);
        setAllInvoices((invAll.data as any[]) || []);
        setCompanyTs(
          ((companies.data as any[]) || [])
            .map((r) => new Date(r.created_at).getTime())
            .filter((t) => !isNaN(t))
        );
        setStoreTs(
          ((stores.data as any[]) || [])
            .map((r) => new Date(r.created_at).getTime())
            .filter((t) => !isNaN(t))
        );
      } catch (err: any) {
        setError(err?.message || 'Error cargando datos');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const mrr = brands.reduce((s, b) => s + importeDe(b, storeCounts), 0);
    const tiendas = Object.values(storeCounts).reduce((s, n) => s + n, 0);
    const arpa = brands.length > 0 ? mrr / brands.length : 0;
    const arpu = tiendas > 0 ? mrr / tiendas : 0;
    const tiendasMedia = brands.length > 0 ? tiendas / brands.length : 0;
    const porPlan = (Object.keys(PLANES) as PlanKey[]).map((k) => {
      const bs = brands.filter((b) => (b.plan || 'estandar') === k);
      const ingreso = bs.reduce((s, b) => s + importeDe(b, storeCounts), 0);
      return { key: k, label: PLANES[k].label, producto: PLANES[k].producto, count: bs.length, ingreso };
    });
    const invList = Object.values(invoicesPeriodo);
    const cobrado = invList.filter((i) => i.estado === 'cobrada').reduce((s, i) => s + Number(i.importe), 0);
    const facturado = invList.reduce((s, i) => s + Number(i.importe), 0);
    const tasaCobro = facturado > 0 ? Math.round((cobrado / facturado) * 100) : 0;
    return { mrr, tiendas, arpa, arpu, tiendasMedia, porPlan, tasaCobro };
  }, [brands, storeCounts, invoicesPeriodo]);

  // Recuento acumulado por mes según fecha de creación
  const cumulativeByMonth = (timestamps: number[], yr: number) =>
    Array.from({ length: 12 }, (_, m) => {
      const finMes = new Date(yr, m + 1, 1).getTime(); // primer día del mes siguiente
      return timestamps.filter((t) => t < finMes).length;
    });

  // Facturación mensual (suma de facturas) por año
  const facturacionByMonth = (yr: number) => {
    const arr = Array(12).fill(0);
    allInvoices.forEach((inv) => {
      const [y, m] = inv.periodo.split('-');
      if (parseInt(y, 10) === yr) {
        const idx = parseInt(m, 10) - 1;
        if (idx >= 0 && idx < 12) arr[idx] += Number(inv.importe) || 0;
      }
    });
    return arr;
  };

  const monthlyActual = (key: MetricKey, yr: number): number[] => {
    if (key === 'empresas') return cumulativeByMonth(companyTs, yr);
    if (key === 'tiendas') return cumulativeByMonth(storeTs, yr);
    return facturacionByMonth(yr);
  };

  const METRICAS: {
    key: MetricKey;
    title: string;
    tipo: 'sum' | 'snapshot';
    format: (n: number) => string;
    step: string;
    placeholder: string;
  }[] = [
    { key: 'empresas', title: 'Número de empresas', tipo: 'snapshot', format: formatInt, step: '1', placeholder: '0' },
    { key: 'tiendas', title: 'Número de tiendas', tipo: 'snapshot', format: formatInt, step: '1', placeholder: '0' },
    { key: 'facturacion', title: 'Facturación (€)', tipo: 'sum', format: formatEur, step: '0.01', placeholder: '0.00' },
  ];

  const updateForecast = (key: MetricKey, monthIdx: number, value: string) =>
    setForecastRows((prev) => {
      const next = { ...prev, [key]: [...prev[key]] };
      next[key][monthIdx] = value;
      return next;
    });

  const yearOptions = (() => {
    const c = new Date().getFullYear();
    return [c - 1, c, c + 1, c + 2];
  })();

  const currentYear = new Date().getFullYear();
  const currentMonthIdx0 = new Date().getMonth();
  const ytdCount = year < currentYear ? 12 : year === currentYear ? currentMonthIdx0 + 1 : 0;

  const aggregate = (monthly: number[], count: number, tipo: 'sum' | 'snapshot') => {
    if (count <= 0) return 0;
    if (tipo === 'sum') return monthly.slice(0, count).reduce((s, v) => s + v, 0);
    return monthly[count - 1] || 0; // snapshot: valor del último mes del rango
  };

  return (
    <main>
      <header className="bg-cartistry-surface border-b border-cartistry-border px-8 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-cartistry-text">Ratios</h1>
          <p className="text-sm text-cartistry-text-secondary mt-1">
            Métricas de negocio · {periodLabel(period)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-cartistry-text-secondary">Año</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="px-8 py-8 space-y-8">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
        )}

        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando ratios...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Ingreso medio / marca" value={formatEUR(stats.arpa)} sub="ARPA mensual" />
              <MetricCard label="Ingreso medio / tienda" value={formatEUR(stats.arpu)} sub="ARPU mensual" />
              <MetricCard label="Tiendas por marca" value={stats.tiendasMedia.toFixed(1)} />
              <MetricCard label="Tasa de cobro" value={`${stats.tasaCobro}%`} tone="green" />
            </div>

            {/* Ingresos por plan */}
            <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
              <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr] gap-4 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
                <span>Plan</span>
                <span className="text-right">Marcas</span>
                <span className="text-right">Ingreso / mes</span>
                <span className="text-right">% del MRR</span>
              </div>
              {stats.porPlan.map((p) => {
                const pct = stats.mrr > 0 ? Math.round((p.ingreso / stats.mrr) * 100) : 0;
                return (
                  <div
                    key={p.key}
                    className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr] gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 text-sm last:border-b-0"
                  >
                    <span className="text-cartistry-text">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-cartistry-text-secondary text-xs"> · {p.producto}</span>
                    </span>
                    <span className="text-right text-cartistry-text">{p.count}</span>
                    <span className="text-right text-cartistry-text font-medium">{formatEUR(p.ingreso)}</span>
                    <span className="text-right text-cartistry-text-secondary">{pct}%</span>
                  </div>
                );
              })}
              <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr] gap-4 px-4 py-3 items-center bg-cartistry-bg-secondary text-sm font-medium">
                <span className="text-cartistry-text">Total</span>
                <span className="text-right text-cartistry-text">{brands.length}</span>
                <span className="text-right text-cartistry-text">{formatEUR(stats.mrr)}</span>
                <span className="text-right text-cartistry-text-secondary">100%</span>
              </div>
            </div>

            {/* Forecast anual por meses */}
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-serif font-bold text-cartistry-text">Forecast anual</h2>
                <div className="flex items-center gap-3">
                  {saveMsg && (
                    <span
                      className={`text-sm ${
                        saveMsg.startsWith('✓') ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {saveMsg}
                    </span>
                  )}
                  <button
                    onClick={guardarForecast}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {saving ? 'Guardando...' : 'Guardar forecast'}
                  </button>
                </div>
              </div>

              {METRICAS.map((metric) => {
                const prevMonthly = monthlyActual(metric.key, year - 1);
                const currentMonthly = monthlyActual(metric.key, year);
                const forecastMonthly = forecastRows[metric.key].map((v) => parseFloat(v) || 0);

                const prevYTD = aggregate(prevMonthly, ytdCount, metric.tipo);
                const currentYTD = aggregate(currentMonthly, ytdCount, metric.tipo);
                const forecastYTD = aggregate(forecastMonthly, ytdCount, metric.tipo);
                const prevTotal = aggregate(prevMonthly, 12, metric.tipo);
                const currentTotal = aggregate(currentMonthly, 12, metric.tipo);
                const forecastTotal = aggregate(forecastMonthly, 12, metric.tipo);

                return (
                  <div
                    key={metric.key}
                    className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden"
                  >
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
                      <thead className="bg-surface">
                        <tr className="text-cartistry-text-secondary">
                          <th className="eyebrow text-left font-normal px-2 py-2.5">&nbsp;</th>
                          {MESES_CORTOS.map((m, idx) => (
                            <th key={m} className="text-center px-1 py-2 font-medium" title={MESES[idx]}>
                              {m}
                            </th>
                          ))}
                          <th className="text-center px-1 py-2 font-medium border-l border-cartistry-border bg-cartistry-bg">
                            YTD
                          </th>
                          <th className="text-center px-1 py-2 font-medium border-l border-cartistry-border bg-cartistry-bg">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Año anterior */}
                        <tr className="border-t border-cartistry-border">
                          <td className="px-2 py-1.5 font-medium text-cartistry-text truncate">
                            Año ant. ({year - 1})
                          </td>
                          {MESES_CORTOS.map((_, idx) => (
                            <td key={idx} className="px-1 py-1.5 text-center text-cartistry-text-secondary truncate">
                              {metric.format(prevMonthly[idx])}
                            </td>
                          ))}
                          <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                            {metric.format(prevYTD)}
                          </td>
                          <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                            {metric.format(prevTotal)}
                          </td>
                        </tr>
                        {/* Forecast (editable) */}
                        <tr className="border-t border-cartistry-border">
                          <td className="px-2 py-1.5 font-medium text-cartistry-text truncate">
                            Forecast ({year})
                          </td>
                          {MESES_CORTOS.map((_, idx) => (
                            <td key={idx} className="px-0.5 py-1.5">
                              <input
                                type="number"
                                min="0"
                                step={metric.step}
                                value={forecastRows[metric.key][idx]}
                                onChange={(e) => updateForecast(metric.key, idx, e.target.value)}
                                placeholder={metric.placeholder}
                                className="no-spinner w-full px-1 py-1 border border-cartistry-border rounded bg-white text-cartistry-text focus:outline-none focus:ring-1 focus:ring-cartistry-accent text-xs text-center"
                              />
                            </td>
                          ))}
                          <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                            {metric.format(forecastYTD)}
                          </td>
                          <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                            {metric.format(forecastTotal)}
                          </td>
                        </tr>
                        {/* Año en curso */}
                        <tr className="border-t border-cartistry-border">
                          <td className="px-2 py-1.5 font-medium text-cartistry-text truncate">Año en curso</td>
                          {MESES_CORTOS.map((_, idx) => (
                            <td key={idx} className="px-1 py-1.5 text-center text-cartistry-text truncate">
                              {metric.format(currentMonthly[idx])}
                            </td>
                          ))}
                          <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                            {metric.format(currentYTD)}
                          </td>
                          <td className="px-1 py-1.5 text-center font-medium text-cartistry-text border-l border-cartistry-border bg-cartistry-bg/40 truncate">
                            {metric.format(currentTotal)}
                          </td>
                        </tr>
                        {/* Δ% forecast */}
                        <tr className="border-t border-cartistry-border">
                          <td className="px-2 py-1.5 font-medium text-cartistry-text truncate">Δ% forecast</td>
                          {MESES_CORTOS.map((_, idx) => (
                            <td key={idx} className="px-1 py-1.5 text-center">
                              <DeltaPct actual={currentMonthly[idx]} forecast={forecastMonthly[idx]} />
                            </td>
                          ))}
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
            </div>
          </>
        )}
      </div>
    </main>
  );
}
