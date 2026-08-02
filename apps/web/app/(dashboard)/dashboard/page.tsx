'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getUserId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import { agruparPor } from '@/lib/agrupar';
import { hoyLocal, parseISODate, restarDias, toISODate } from '@/lib/dates';
import {
  Alert,
  Badge,
  ButtonLink,
  DataTable,
  EmptyState,
  HeatLegend,
  Kpi,
  KpiRow,
  LoadingBlock,
  PageHeader,
  Td,
  Th,
  Tr,
  heatFrom,
} from '@/components/ui';

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

/** El estado solo se enciende cuando hay algo que hacer con el lineal. */
function estadoDeCumplimiento(
  cumpl: number
): { label: string; tone: 'neutral' | 'signal' | 'danger' } {
  if (cumpl >= 85) return { label: 'Al día', tone: 'neutral' };
  if (cumpl >= 60) return { label: 'Revisar', tone: 'signal' };
  return { label: 'Actuar', tone: 'danger' };
}

export default function DashboardPage() {
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

      const hoy = hoyLocal();
      const inicioVentana = restarDias(hoy, VENTANA_DIAS);
      const inicioVentanaAnterior = restarDias(inicioVentana, VENTANA_ANTERIOR_DIAS);

      const [productsRes, salesRes, planogramsRes] = await Promise.all([
        supabase.from('products').select('store_id, ean, unidades').in('store_id', storeIds),
        // Solo las dos ventanas que se comparan: el resto del histórico de
        // ventas no se usa aquí y traerlo entero es la consulta más cara
        // de la aplicación.
        supabase
          .from('sales')
          .select('store_id, fecha, unidades_vendidas, pvp')
          .in('store_id', storeIds)
          .gte('fecha', toISODate(inicioVentanaAnterior))
          .lte('fecha', toISODate(hoy)),
        supabase
          .from('planograms')
          .select('store_id, generado_at, datos_json')
          .in('store_id', storeIds)
          .order('generado_at', { ascending: false }),
      ]);

      const products = (productsRes.data as any[]) || [];
      const sales = (salesRes.data as any[]) || [];
      const planograms = (planogramsRes.data as any[]) || [];

      // Índices por tienda: un recorrido en total en lugar de uno por tienda.
      const productsPorTienda = agruparPor(products, (p) => p.store_id);
      const salesPorTienda = agruparPor(sales, (s) => s.store_id);
      const ultimoPlanogramaPorTienda = new Map<string, any>();
      for (const p of planograms) {
        // Vienen ordenados por fecha descendente: el primero de cada tienda gana.
        if (!ultimoPlanogramaPorTienda.has(p.store_id)) {
          ultimoPlanogramaPorTienda.set(p.store_id, p);
        }
      }

      const storeMetrics: StoreMetrics[] = storesData.map((store: any) => {
        const storeProducts = productsPorTienda.get(store.id) || [];
        const storeSales = salesPorTienda.get(store.id) || [];

        const stockTotal = storeProducts.reduce(
          (sum, p) => sum + (Number(p.unidades) || 0),
          0
        );

        const ventasVentana = storeSales.filter((s) => {
          const f = parseISODate(s.fecha);
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
            const f = parseISODate(s.fecha);
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

        const latestPlanogram = ultimoPlanogramaPorTienda.get(store.id);
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
      setError('No se ha podido cargar el resumen. Recarga la página.');
    } finally {
      setLoading(false);
    }
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


  const hayTiendas = !loading && stores.length > 0;

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          label="Tienda · Resumen"
          title="Resumen global"
          description={`Ventas y cumplimiento de los últimos ${VENTANA_DIAS} días en toda tu red.`}
          actions={
            hayTiendas ? (
              <ButtonLink href="/dashboard/planograma" size="sm">
                Generar planograma
              </ButtonLink>
            ) : null
          }
        />

        {loading ? <LoadingBlock label="Leyendo tus tiendas" rows={5} /> : null}

        {error ? <Alert className="mb-6">{error}</Alert> : null}

        {!loading && stores.length === 0 && !error ? (
          <EmptyState
            title="Todavía no hay ningún espacio de venta"
            description="Dibuja tu primera tienda —góndolas, baldas y alturas— y Cartistry podrá colocar tu surtido."
            action={<ButtonLink href="/dashboard/tienda">Configurar mi tienda</ButtonLink>}
          />
        ) : null}

        {hayTiendas ? (
          <>
            <KpiRow className="mb-10">
              <Kpi
                label="Tiendas activas"
                value={totalTiendas}
                note={`${totalMetros.toLocaleString('es-ES')} m² en total`}
              />
              <Kpi
                label="Venta por m²"
                value={ventasPorMetroAgg.toLocaleString('es-ES')}
                unit="€"
                note={`${VENTANA_DIAS} días`}
              />
              <Kpi
                label="Sell-through"
                value={sellThroughAgg}
                unit="%"
                note={`${totalUnidadesVendidas.toLocaleString('es-ES')} uds. vendidas`}
              />
              <Kpi
                label="Cumplimiento VM"
                value={cumplimientoAgg}
                unit="%"
                note="Media de la red"
              />
            </KpiRow>

            <section className="mb-10">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                <h2 className="font-display font-semibold text-lg">Estado por tienda</h2>
                <HeatLegend />
              </div>

              <DataTable>
                <thead>
                  <tr>
                    <Th>Tienda</Th>
                    <Th numeric>Venta / m²</Th>
                    <Th numeric>Sell-through</Th>
                    <Th numeric>Cumplimiento</Th>
                    <Th numeric>Últ. planograma</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((s) => {
                    const estado = estadoDeCumplimiento(s.cumplimientoVM);
                    return (
                      <Tr key={s.id}>
                        <Td>
                          <span className="font-medium">{s.nombre}</span>
                          <span className="font-mono text-[11px] text-ink-3 ml-2">
                            {s.metros2} m²
                          </span>
                        </Td>
                        <Td numeric>{s.ventasPorMetro.toLocaleString('es-ES')} €</Td>
                        <Td numeric>{s.sellThrough} %</Td>
                        <Td numeric>
                          <span className="inline-flex items-center gap-2 justify-end">
                            <span
                              className="facing h-3 w-8"
                              data-heat={heatFrom(s.cumplimientoVM)}
                              aria-hidden
                            />
                            {s.cumplimientoVM} %
                          </span>
                        </Td>
                        <Td numeric>
                          {s.diasUltimoPlanograma === null
                            ? '—'
                            : `hace ${s.diasUltimoPlanograma} d`}
                        </Td>
                        <Td>
                          <Badge tone={estado.tone}>{estado.label}</Badge>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </DataTable>
            </section>

            <section>
              <h2 className="font-display font-semibold text-lg mb-3">
                Qué atender ahora
                {alertas.length > 0 ? (
                  <span className="font-mono text-[12px] font-normal text-ink-3 ml-2">
                    {alertas.length}
                  </span>
                ) : null}
              </h2>

              {alertas.length === 0 ? (
                <div className="bg-surface rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] px-4 py-5">
                  <p className="text-sm text-ink-2">
                    Nada pendiente. Los planogramas están al día y no hay SKUs agotados.
                  </p>
                </div>
              ) : (
                <ul className="bg-surface rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] divide-y divide-line">
                  {alertas.map((a, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge tone={a.tipo === 'agotados' ? 'danger' : 'signal'}>
                          {a.tipo === 'planograma'
                            ? 'Lineal'
                            : a.tipo === 'agotados'
                              ? 'Stock'
                              : 'Venta'}
                        </Badge>
                        <p className="text-sm text-ink truncate">{a.mensaje}</p>
                      </div>
                      <Link
                        href={a.href}
                        className="text-[13px] text-ink underline underline-offset-4 shrink-0"
                      >
                        Resolver
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
