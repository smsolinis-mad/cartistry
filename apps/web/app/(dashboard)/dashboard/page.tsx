'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AlertTriangle, PackageX, TrendingDown } from 'lucide-react';
import { clearUserCookie, getUserId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

interface StoreMetrics {
  id: string;
  nombre: string;
  metros2: number;
  ventasUltimas2Semanas: number;
  unidadesVendidas: number;
  stockTotal: number;
  ventasPorMetro: number;
  sellThrough: number;
  cumplimientoVM: number;
  diasUltimoPlanograma: number | null;
  skusAgotados: number;
  variacionSemanal: number | null;
}

interface Alerta {
  tipo: 'planograma' | 'agotados' | 'conversion';
  storeNombre: string;
  mensaje: string;
  href: string;
}

const VENTANA_DIAS = 14;
const VENTANA_ANTERIOR_DIAS = 14;

function statusFromCumpl(cumpl: number): { label: string; cls: string } {
  if (cumpl >= 85) return { label: 'OK', cls: 'bg-green-100 text-green-800 border-green-200' };
  if (cumpl >= 60) return { label: 'Revisar', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  return { label: 'Acción', cls: 'bg-red-100 text-red-800 border-red-200' };
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stores, setStores] = useState<StoreMetrics[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    loadResumen();
  }, []);

  const loadResumen = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      const { data: storesData } = await supabase
        .from('stores')
        .select('id, nombre, metros2')
        .eq('user_id', userId);

      if (!storesData || storesData.length === 0) {
        setStores([]);
        setLoading(false);
        return;
      }

      const storeIds = storesData.map((s: any) => s.id);

      const [productsRes, salesRes, planogramsRes] = await Promise.all([
        supabase.from('products').select('store_id, ean, unidades').in('store_id', storeIds),
        supabase.from('sales').select('store_id, fecha, ean, unidades_vendidas, pvp').in('store_id', storeIds),
        supabase
          .from('planograms')
          .select('store_id, generado_at, datos_json')
          .in('store_id', storeIds)
          .order('generado_at', { ascending: false }),
      ]);

      const products = (productsRes.data as any[]) || [];
      const sales = (salesRes.data as any[]) || [];
      const planograms = (planogramsRes.data as any[]) || [];

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const inicioVentana = new Date(hoy);
      inicioVentana.setDate(inicioVentana.getDate() - VENTANA_DIAS);
      const inicioVentanaAnterior = new Date(inicioVentana);
      inicioVentanaAnterior.setDate(inicioVentanaAnterior.getDate() - VENTANA_ANTERIOR_DIAS);

      const parseFecha = (s: string): Date | null => {
        if (!s) return null;
        const [yy, mm, dd] = String(s).split('-').map((v) => parseInt(v, 10));
        if (!yy || !mm || !dd) return null;
        return new Date(yy, mm - 1, dd);
      };

      const storeMetrics: StoreMetrics[] = storesData.map((store: any) => {
        const storeProducts = products.filter((p) => p.store_id === store.id);
        const storeSales = sales.filter((s) => s.store_id === store.id);

        const stockTotal = storeProducts.reduce(
          (sum, p) => sum + (Number(p.unidades) || 0),
          0
        );

        const ventasVentana = storeSales.filter((s) => {
          const f = parseFecha(s.fecha);
          return f !== null && f >= inicioVentana && f <= hoy;
        });
        const ventasUltimas2Semanas = ventasVentana.reduce(
          (sum, s) => sum + (Number(s.pvp) || 0),
          0
        );
        const unidadesVendidas = ventasVentana.reduce(
          (sum, s) => sum + (Number(s.unidades_vendidas) || 0),
          0
        );

        const ventasAnteriores = storeSales
          .filter((s) => {
            const f = parseFecha(s.fecha);
            return (
              f !== null && f >= inicioVentanaAnterior && f < inicioVentana
            );
          })
          .reduce((sum, s) => sum + (Number(s.pvp) || 0), 0);

        const ventasPorMetro = store.metros2 > 0 ? ventasUltimas2Semanas / store.metros2 : 0;
        const sellThrough =
          stockTotal + unidadesVendidas > 0
            ? (unidadesVendidas / (stockTotal + unidadesVendidas)) * 100
            : 0;

        const latestPlanogram = planograms.find((p) => p.store_id === store.id);
        const placedEans = new Set<string>(
          latestPlanogram?.datos_json?.report_data?.assignments?.map((a: any) => a.ean) || []
        );
        const cumplimientoVM =
          storeProducts.length > 0
            ? (placedEans.size / storeProducts.length) * 100
            : 0;

        let diasUltimoPlanograma: number | null = null;
        if (latestPlanogram?.generado_at) {
          const fechaGen = new Date(latestPlanogram.generado_at);
          diasUltimoPlanograma = Math.floor(
            (hoy.getTime() - fechaGen.getTime()) / (1000 * 60 * 60 * 24)
          );
        }

        const skusAgotados = storeProducts.filter(
          (p) => (Number(p.unidades) || 0) === 0
        ).length;

        let variacionSemanal: number | null = null;
        if (ventasAnteriores > 0) {
          variacionSemanal =
            ((ventasUltimas2Semanas - ventasAnteriores) / ventasAnteriores) * 100;
        }

        return {
          id: store.id,
          nombre: store.nombre,
          metros2: Number(store.metros2) || 0,
          ventasUltimas2Semanas: Math.round(ventasUltimas2Semanas),
          unidadesVendidas,
          stockTotal,
          ventasPorMetro: Math.round(ventasPorMetro),
          sellThrough: Math.round(sellThrough),
          cumplimientoVM: Math.round(cumplimientoVM),
          diasUltimoPlanograma,
          skusAgotados,
          variacionSemanal,
        };
      });

      setStores(storeMetrics);

      const nuevasAlertas: Alerta[] = [];
      for (const s of storeMetrics) {
        if (s.diasUltimoPlanograma === null || s.diasUltimoPlanograma > 30) {
          nuevasAlertas.push({
            tipo: 'planograma',
            storeNombre: s.nombre,
            mensaje:
              s.diasUltimoPlanograma === null
                ? `${s.nombre}: sin planograma generado`
                : `${s.nombre}: planograma sin actualizar (${s.diasUltimoPlanograma} días)`,
            href: '/dashboard/planograma',
          });
        }
        if (s.skusAgotados > 0) {
          nuevasAlertas.push({
            tipo: 'agotados',
            storeNombre: s.nombre,
            mensaje: `${s.nombre}: ${s.skusAgotados} SKUs agotados`,
            href: '/dashboard/productos',
          });
        }
        if (s.variacionSemanal !== null && s.variacionSemanal <= -10) {
          nuevasAlertas.push({
            tipo: 'conversion',
            storeNombre: s.nombre,
            mensaje: `${s.nombre}: ventas ${s.variacionSemanal.toFixed(
              0
            )}% vs. periodo anterior`,
            href: '/dashboard/ventas',
          });
        }
      }
      setAlertas(nuevasAlertas);
    } catch (err) {
      console.error(err);
      setError('Error al cargar el resumen');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    clearUserCookie();
    await new Promise((resolve) => setTimeout(resolve, 100));
    router.push('/');
  };

  // Agregados
  const totalTiendas = stores.length;
  const totalMetros = stores.reduce((s, x) => s + x.metros2, 0);
  const totalVentas = stores.reduce((s, x) => s + x.ventasUltimas2Semanas, 0);
  const totalUnidadesVendidas = stores.reduce((s, x) => s + x.unidadesVendidas, 0);
  const totalStock = stores.reduce((s, x) => s + x.stockTotal, 0);
  const ventasPorMetroAgg = totalMetros > 0 ? Math.round(totalVentas / totalMetros) : 0;
  const sellThroughAgg =
    totalStock + totalUnidadesVendidas > 0
      ? Math.round((totalUnidadesVendidas / (totalStock + totalUnidadesVendidas)) * 100)
      : 0;
  const cumplimientoAgg =
    stores.length > 0
      ? Math.round(stores.reduce((s, x) => s + x.cumplimientoVM, 0) / stores.length)
      : 0;

  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-serif font-bold text-cartistry-text">Resumen</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-cartistry-text mb-2">
            Resumen global
          </h2>
          <p className="text-cartistry-text-secondary">Estado de tu red de tiendas</p>
        </div>

        {loading && <p className="text-cartistry-text-secondary">Cargando…</p>}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && stores.length === 0 && !error && (
          <div className="bg-cartistry-surface border border-cartistry-border rounded p-8 text-center">
            <p className="text-cartistry-text-secondary mb-4">
              Aún no has configurado ninguna tienda.
            </p>
            <Link
              href="/dashboard/tienda"
              className="inline-block px-6 py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition"
            >
              Configurar primera tienda
            </Link>
          </div>
        )}

        {!loading && stores.length > 0 && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <KpiCard label="Tiendas activas" value={totalTiendas.toString()} />
              <KpiCard label="Ventas / m²" value={`€${ventasPorMetroAgg.toLocaleString()}`} />
              <KpiCard label="Sell-through" value={`${sellThroughAgg}%`} />
              <KpiCard label="Cumplimiento VM" value={`${cumplimientoAgg}%`} />
            </div>

            {/* Estado de tiendas */}
            <section className="mb-12">
              <h3 className="text-xl font-serif font-bold text-cartistry-text mb-4">
                Estado de tiendas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stores.map((s) => {
                  const status = statusFromCumpl(s.cumplimientoVM);
                  return (
                    <div
                      key={s.id}
                      className="bg-cartistry-surface border border-cartistry-border rounded p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-serif font-bold text-cartistry-text">
                          {s.nombre}
                        </h4>
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full border ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-cartistry-text-secondary">
                        €{s.ventasPorMetro.toLocaleString()}/m² · {s.cumplimientoVM}% cumpl.
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Alertas activas */}
            <section>
              <h3 className="text-xl font-serif font-bold text-cartistry-text mb-4">
                Alertas activas
              </h3>
              {alertas.length === 0 ? (
                <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                  <p className="text-sm text-cartistry-text-secondary">
                    No hay alertas. Todo está en orden.
                  </p>
                </div>
              ) : (
                <div className="bg-cartistry-surface border border-cartistry-border rounded divide-y divide-cartistry-border">
                  {alertas.map((a, idx) => {
                    const Icon =
                      a.tipo === 'planograma'
                        ? AlertTriangle
                        : a.tipo === 'agotados'
                        ? PackageX
                        : TrendingDown;
                    const iconColor =
                      a.tipo === 'planograma'
                        ? 'text-red-600'
                        : a.tipo === 'agotados'
                        ? 'text-amber-600'
                        : 'text-orange-600';
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Icon size={18} className={`${iconColor} flex-shrink-0`} />
                          <p className="text-sm text-cartistry-text">{a.mensaje}</p>
                        </div>
                        <Link
                          href={a.href}
                          className="text-sm text-cartistry-accent hover:underline flex-shrink-0"
                        >
                          Ver →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cartistry-surface border border-cartistry-border rounded p-5">
      <p className="text-sm text-cartistry-text-secondary mb-2">{label}</p>
      <p className="text-3xl font-serif font-bold text-cartistry-text">{value}</p>
    </div>
  );
}
