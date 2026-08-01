'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PLANES, planInfo, type PlanKey } from '@/lib/admin';
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

export default function AdminHomePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  const [invoices, setInvoices] = useState<Record<string, Invoice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const period = currentPeriod();

  useEffect(() => {
    (async () => {
      try {
        const [{ brands, storeCounts }, inv] = await Promise.all([
          loadBrands(),
          loadInvoices(period),
        ]);
        setBrands(brands);
        setStoreCounts(storeCounts);
        setInvoices(inv);
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
    const invList = Object.values(invoices);
    const cobrado = invList.filter((i) => i.estado === 'cobrada').reduce((s, i) => s + Number(i.importe), 0);
    const pendiente = invList.filter((i) => i.estado !== 'cobrada').reduce((s, i) => s + Number(i.importe), 0);
    const facturado = cobrado + pendiente;
    const tasaCobro = facturado > 0 ? Math.round((cobrado / facturado) * 100) : 0;
    const tiendas = Object.values(storeCounts).reduce((s, n) => s + n, 0);

    const porPlan = (Object.keys(PLANES) as PlanKey[]).map((k) => ({
      key: k,
      label: PLANES[k].label,
      count: brands.filter((b) => (b.plan || 'estandar') === k).length,
    }));

    return { mrr, cobrado, pendiente, facturado, tasaCobro, tiendas, porPlan };
  }, [brands, storeCounts, invoices]);

  return (
    <main>
      <header className="bg-cartistry-surface border-b border-cartistry-border px-8 py-5">
        <h1 className="text-2xl font-serif font-bold text-cartistry-text">Home</h1>
        <p className="text-sm text-cartistry-text-secondary mt-1">
          Principales ratios · {periodLabel(period)}
        </p>
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
              <MetricCard label="Marcas activas" value={String(brands.length)} sub={`${stats.tiendas} tiendas`} />
              <MetricCard label="MRR potencial" value={formatEUR(stats.mrr)} sub="Ingreso recurrente mensual" />
              <MetricCard label="Cobrado (mes)" value={formatEUR(stats.cobrado)} tone="green" />
              <MetricCard label="Pendiente (mes)" value={formatEUR(stats.pendiente)} tone="red" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Tasa de cobro */}
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-6">
                <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-3">
                  Tasa de cobro del mes
                </p>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-3xl font-serif font-bold text-cartistry-text">{stats.tasaCobro}%</span>
                  <span className="text-sm text-cartistry-text-secondary mb-1">
                    {formatEUR(stats.cobrado)} de {formatEUR(stats.facturado)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-cartistry-bg-secondary overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full" style={{ width: `${stats.tasaCobro}%` }} />
                </div>
              </div>

              {/* Distribución por plan */}
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-6">
                <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-3">
                  Marcas por plan
                </p>
                <div className="space-y-2">
                  {stats.porPlan.map((p) => {
                    const pct = brands.length > 0 ? Math.round((p.count / brands.length) * 100) : 0;
                    return (
                      <div key={p.key} className="flex items-center gap-3 text-sm">
                        <span className="w-20 text-cartistry-text-secondary">{p.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-cartistry-bg-secondary overflow-hidden">
                          <div className="h-full bg-cartistry-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-cartistry-text font-medium">{p.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/facturacion"
                className="px-4 py-2 rounded text-sm font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition"
              >
                Ir a facturación →
              </Link>
              <Link
                href="/admin/empresas"
                className="px-4 py-2 rounded text-sm font-medium border border-cartistry-border text-cartistry-accent hover:bg-cartistry-bg transition"
              >
                Ver empresas
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
