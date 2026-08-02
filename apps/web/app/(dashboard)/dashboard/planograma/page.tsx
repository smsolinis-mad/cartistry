'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import dynamic from 'next/dynamic';
import type { ReportData } from '@/components/planograma/PlanogramReport';
import { PlanogramWebReport } from '@/components/planograma/PlanogramWebReport';

// El motor de PDF pesa ~550 kB: se carga al pulsar, no al abrir la página.
const PlanogramPdfLink = dynamic(
  () => import('@/components/planograma/PlanogramPdfLink'),
  {
    ssr: false,
    loading: () => (
      <span className="inline-flex items-center justify-center h-10 px-4 rounded-[2px] text-sm font-medium bg-sunk text-ink-3">
        Preparando…
      </span>
    ),
  }
);
import { PageHeader } from '@/components/ui';

type Objective = 'promocion' | 'liquidacion' | 'aumentar_ventas' | 'aumentar_margen' | 'nueva_coleccion';

const OBJECTIVES: Array<{ value: Objective; label: string; description: string }> = [
  { value: 'nueva_coleccion', label: 'Nueva colección', description: 'Entrada de nueva colección al punto de venta' },
  { value: 'promocion', label: 'Promoción', description: 'Ejecutar una campaña o acción promocional' },
  { value: 'aumentar_ventas', label: 'Aumentar ventas', description: 'Maximizar unidades vendidas en el período' },
  { value: 'liquidacion', label: 'Liquidación', description: 'Reducir stock y dar salida a producto parado' },
  { value: 'aumentar_margen', label: 'Aumentar margen', description: 'Maximizar el margen neto de la tienda' },
];

const DURACIONES: Array<{ value: string; label: string; dias: number }> = [
  { value: '1_semana', label: '1 semana', dias: 7 },
  { value: '2_semanas', label: '2 semanas', dias: 14 },
  { value: '3_semanas', label: '3 semanas', dias: 21 },
  { value: '1_mes', label: '1 mes', dias: 30 },
  { value: '6_semanas', label: '6 semanas', dias: 42 },
  { value: '2_meses', label: '2 meses', dias: 60 },
  { value: '3_meses', label: '3 meses', dias: 90 },
  { value: '6_meses', label: '6 meses', dias: 180 },
];

export default function PlanogramaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [allMuebles, setAllMuebles] = useState<any[]>([]);
  const [generatingPlanogram, setGeneratingPlanogram] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [currentPositions, setCurrentPositions] = useState<any[]>([]);
  const [guardandoDiseno, setGuardandoDiseno] = useState(false);
  const [guardadoMsg, setGuardadoMsg] = useState('');
  const [selectedObjective, setSelectedObjective] = useState<Objective>('aumentar_ventas');
  const [selectedDuracion, setSelectedDuracion] = useState<string>('2_semanas');
  const [userStores, setUserStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedStoreId || userStores.length === 0) return;
    localStorage.setItem('current_store_id', selectedStoreId);
    rebuildReportForStore(selectedStoreId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId, userStores, allProducts, allSales, allMuebles]);

  const rebuildReportForStore = (storeId: string) => {
    const store = userStores.find((s: any) => s.id === storeId);
    if (!store) return;

    const products = allProducts.filter((p: any) => p.store_id === storeId);
    const sales = allSales.filter((s: any) => s.store_id === storeId);
    const muebles = allMuebles.filter((m: any) => m.store_id === storeId);

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const estructura = muebles.length > 0
      ? {
          num_columnas: muebles[0].num_columnas || 1,
          num_filas: muebles[0].num_filas || 4,
        }
      : { num_columnas: 1, num_filas: 4 };

    let periodoVentas = { inicio: 'N/A', fin: 'N/A' };
    if (sales.length > 0) {
      const fechas = sales.map((s: any) => new Date(s.fecha)).sort((a, b) => a.getTime() - b.getTime());
      const inicio = fechas[0];
      const fin = fechas[fechas.length - 1];
      periodoVentas = {
        inicio: inicio.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
        fin: fin.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
    }

    const stockTotalUnidades = products.reduce(
      (sum: number, p: any) => sum + (Number(p.unidades) || 0),
      0
    );
    const stockTotalValorado = products.reduce(
      (sum: number, p: any) => sum + (Number(p.pvp) || 0) * (Number(p.unidades) || 0),
      0
    );

    setReportData({
      store,
      productCount: products.length,
      salesCount: sales.length,
      stockTotalUnidades,
      stockTotalValorado: Math.round(stockTotalValorado),
      generatedAt: dateStr,
      estructura,
      periodoVentas,
      muebles: muebles.map((m: any) => ({
        id: m.id,
        nombre: m.nombre,
        alto: m.alto,
        ancho: m.ancho,
        profundo: m.profundo,
        num_filas: m.num_filas,
        num_columnas: m.num_columnas,
      })),
    });
  };

  const generatePlanogram = async () => {
    try {
      setError('');
      setGeneratingPlanogram(true);

      const storeId = selectedStoreId || localStorage.getItem('current_store_id');
      if (!storeId || !reportData) {
        setError('No hay datos de tienda');
        return;
      }

      const storeProducts = allProducts.filter((p: any) => p.store_id === storeId);
      const storeSales = allSales.filter((s: any) => s.store_id === storeId);

      // Backup: max_skus_por_hueco guardado localmente si la BD no lo persiste
      let maxSkusOverride: number | undefined;
      try {
        const cached = localStorage.getItem(`max_skus_${storeId}`);
        if (cached) maxSkusOverride = Number(cached) || undefined;
      } catch {}

      const response = await fetch('/api/planograma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          objective: selectedObjective,
          maxSkusPorHueco: maxSkusOverride,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error generando planograma');
      }

      const result = await response.json();
      const savedId: string | undefined = result.savedId;
      setSavedPlanId(savedId || null);
      setCurrentPositions(result.planogram?.positions || []);
      setGuardadoMsg('');

      if (result.planogram?.positions) {
        const assignments = result.planogram.positions
          .map((pos: any) => {
            const product = storeProducts.find(p => p.ean === pos.ean) ||
                           storeProducts.find(p => p.id === pos.product_id);
            return product ? {
              ean: pos.ean,
              productName: product.nombre,
              position: pos.balda_id,
              razon: pos.razon,
              isLiquidation: pos.razon?.includes('[LIQUIDACION]'),
              imageUrl: product['URL Imagen'] || product.imagen_url || undefined,
            } : null;
          })
          .filter((a: any) => a !== null);

        const assignmentsByMueble = new Map<string, Array<any>>();
        const usedEans = new Set<string>();

        if (reportData?.muebles) {
          reportData.muebles.forEach(m => {
            assignmentsByMueble.set(m.id, []);
          });

          for (const assignment of assignments) {
            if (usedEans.has(assignment.ean)) {
              continue;
            }

            const baldaId = assignment.position;
            // Soportamos los dos formatos vigentes:
            //   nuevo: balda_<muebleUUID>_<cara>_<col>_<fila>  (cara ∈ frontal/trasera/izquierda/derecha/superior)
            //   legacy: balda_<muebleUUID>_<col>_<fila>        (pre-refactor caras)
            const match =
              baldaId.match(/^balda_([a-f0-9\-]+)_(?:superior|frontal|trasera|izquierda|derecha)_(\d+)_(\d+)$/) ||
              baldaId.match(/^balda_([a-f0-9\-]+)_(\d+)_(\d+)$/);

            if (match) {
              const muebleIdFromBalda = match[1];
              const targetMueble = reportData.muebles.find(m => m.id === muebleIdFromBalda);

              if (targetMueble) {
                const muebleAssignments = assignmentsByMueble.get(targetMueble.id) || [];
                muebleAssignments.push(assignment);
                assignmentsByMueble.set(targetMueble.id, muebleAssignments);
                usedEans.add(assignment.ean);
              }
            }
          }
        }

        const muebblesWithAssignments = reportData?.muebles?.map(m => ({
          ...m,
          assignmentsDelMueble: assignmentsByMueble.get(m.id) || [],
        })) || [];

        const objectiveLabels: Record<Objective, string> = {
          'promocion': 'Promoción',
          'liquidacion': 'Liquidación',
          'aumentar_ventas': 'Aumentar ventas',
          'aumentar_margen': 'Aumentar margen',
          'nueva_coleccion': 'Nueva colección',
        };

        const assignedEans = new Set(Array.from(usedEans));
        const assignedProducts = storeProducts.filter(p => assignedEans.has(p.ean));

        const totalUnidadesVendidas = assignedProducts.reduce((sum, p) => sum + (p.unidades || 0), 0);
        const totalStockAsignado = assignedProducts.reduce((sum, p) => sum + (p.unidades || 0), 0);
        const ventasPromedioPorSemana = totalUnidadesVendidas / 4;
        const semanasDeCoverage = ventasPromedioPorSemana > 0 ? (totalStockAsignado / ventasPromedioPorSemana).toFixed(1) : '0';

        const margenBrutoProyectado = assignedProducts.reduce((sum, p) => {
          const margenUnitario = (p.pvp || 0) - (p.precio_compra || 0);
          return sum + (margenUnitario * (p.unidades || 0));
        }, 0);

        const rotacionMedia = totalStockAsignado > 0 ? (totalUnidadesVendidas / totalStockAsignado).toFixed(2) : '0';

        const valorStockExpuesto = assignedProducts.reduce((sum, p) => {
          return sum + ((p.pvp || 0) * (p.unidades || 0));
        }, 0);

        let productoMasRentable = null;
        let margenMaximo = -Infinity;
        for (const p of assignedProducts) {
          const margen = (p.pvp || 0) - (p.precio_compra || 0);
          if (margen > margenMaximo) {
            margenMaximo = margen;
            productoMasRentable = { nombre: p.nombre, margenUnitario: margen };
          }
        }

        const productosEnRiesgo: Array<{nombre: string; periodossinVenta: number}> = [];

        const stockAnalysis = {
          cobertura: `Stock para ${semanasDeCoverage} semanas`,
          margenBrutoProyectado: Math.round(margenBrutoProyectado),
          rotacionMedia: parseFloat(rotacionMedia as string),
          valorStockExpuesto: Math.round(valorStockExpuesto),
          productoMasRentable,
          productosEnRiesgo,
        };

        const top10Productos = assignedProducts
          .sort((a, b) => (b.unidades || 0) - (a.unidades || 0))
          .slice(0, 10)
          .map(p => ({
            nombre: p.nombre,
            unidadesVendidas: p.unidades || 0,
            porcentajeMax: 0,
          }));

        const maxUnidades = Math.max(...top10Productos.map(p => p.unidadesVendidas), 1);
        top10Productos.forEach(p => {
          p.porcentajeMax = (p.unidadesVendidas / maxUnidades) * 100;
        });

        const top3Tendencias = top10Productos.slice(0, 3).map(p => {
          const tendencia: 'up' | 'down' | 'stable' = p.unidadesVendidas > 0 ? 'up' : 'stable';
          return {
            nombre: p.nombre,
            tendencia,
          };
        });

        const margenPorCategoriaMap = new Map<string, number>();
        assignedProducts.forEach(p => {
          const categoria = p.division || p.tipo || 'Sin categoría';
          const margen = ((p.pvp || 0) - (p.precio_compra || 0)) * (p.unidades || 0);
          margenPorCategoriaMap.set(categoria, (margenPorCategoriaMap.get(categoria) || 0) + margen);
        });

        const margenPorCategoria = Array.from(margenPorCategoriaMap.entries())
          .map(([categoria, margenTotal]) => ({
            categoria,
            margenTotal: Math.round(margenTotal),
            porcentajeMax: 0,
          }))
          .filter(c => c.categoria !== 'Sin categoría')
          .sort((a, b) => b.margenTotal - a.margenTotal);

        const maxMargen = Math.max(...margenPorCategoria.map(m => m.margenTotal), 1);
        margenPorCategoria.forEach(m => {
          m.porcentajeMax = (m.margenTotal / maxMargen) * 100;
        });

        const analisisProductos = {
          top10Productos,
          top3Tendencias,
          margenPorCategoria,
        };

        const duracionConfig = DURACIONES.find(d => d.value === selectedDuracion);
        const duracionLabel = duracionConfig?.label || '';
        const duracionDias = duracionConfig?.dias || 14;

        // Ventana de duración: tope superior = AYER (un día menos que el día en curso).
        // tope inferior = ayer - duracionDias. La comparación es día-a-día (no por hora).
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fin = new Date(hoy);
        fin.setDate(fin.getDate() - 1);
        const desde = new Date(fin);
        desde.setDate(desde.getDate() - duracionDias);
        const ventasEnVentana = storeSales.filter((s: any) => {
          if (!s.fecha) return false;
          const [yy, mm, dd] = String(s.fecha).split('-').map((v) => parseInt(v, 10));
          if (!yy || !mm || !dd) return false;
          const fechaVenta = new Date(yy, mm - 1, dd);
          return fechaVenta >= desde && fechaVenta <= fin;
        });

        // Agrupar por número de ticket. El campo `pvp` del CSV de ventas ya es el
        // importe total de la línea (no precio unitario), así que NO se multiplica
        // por unidades para calcular el importe.
        const ticketMap = new Map<string, { unidades: number; importe: number }>();
        for (const venta of ventasEnVentana) {
          const ticket = venta.numero_ticket || `ticket_${venta.id}`;
          const unidades = Number(venta.unidades_vendidas) || 0;
          const importe = Number(venta.pvp) || 0;
          const acumulado = ticketMap.get(ticket) || { unidades: 0, importe: 0 };
          acumulado.unidades += unidades;
          acumulado.importe += importe;
          ticketMap.set(ticket, acumulado);
        }

        const numTickets = ticketMap.size;
        const unidadesVendidasTotales = Array.from(ticketMap.values()).reduce((s, t) => s + t.unidades, 0);
        const ventasTotales = Array.from(ticketMap.values()).reduce((s, t) => s + t.importe, 0);
        const unidadesMediasPorTicket = numTickets > 0 ? unidadesVendidasTotales / numTickets : 0;
        const ticketMedioValorado = numTickets > 0 ? ventasTotales / numTickets : 0;

        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const metricasDuracion = {
          numeroTickets: numTickets,
          unidadesMediasPorTicket: Number(unidadesMediasPorTicket.toFixed(2)),
          ticketMedioValorado: Math.round(ticketMedioValorado * 100) / 100,
          unidadesVendidasTotales,
          ventasTotales: Math.round(ventasTotales),
          inicio: fmt(desde),
          fin: fmt(fin),
        };
        console.log('[Planograma] métricas de', duracionLabel, '→', metricasDuracion, 'tickets:', numTickets, 'ventas filtradas:', ventasEnVentana.length);


        // Recalcular stock total a partir del catálogo actual
        const stockTotalUnidades = storeProducts.reduce(
          (sum, p) => sum + (Number(p.unidades) || 0),
          0
        );
        const stockTotalValorado = Math.round(
          storeProducts.reduce(
            (sum, p) => sum + (Number(p.pvp) || 0) * (Number(p.unidades) || 0),
            0
          )
        );
        console.log('[Planograma] stockTotalUnidades:', stockTotalUnidades, 'stockTotalValorado:', stockTotalValorado, 'productos:', storeProducts.length);

        // Información global del visual: solo sobre productos asignados al planograma
        const numRefExpuestas = assignedProducts.length;
        const unidadesStockExpuesto = assignedProducts.reduce(
          (s, p) => s + (Number(p.unidades) || 0),
          0
        );
        const valorStockExpuestoCalc = Math.round(
          assignedProducts.reduce(
            (s, p) => s + (Number(p.pvp) || 0) * (Number(p.unidades) || 0),
            0
          )
        );
        // Productos en los que se debe enfocar la venta — depende del objetivo
        // seleccionado. Cada item lleva un nombre y una razón cualitativa
        // (sin cifras exactas) explicando por qué entra en la lista.
        const ventasPorEan = new Map<string, number>();
        for (const v of ventasEnVentana) {
          const ean = v.ean;
          if (!ean) continue;
          ventasPorEan.set(ean, (ventasPorEan.get(ean) || 0) + (Number(v.unidades_vendidas) || 0));
        }

        const productosConDatos = assignedProducts.map((p) => ({
          producto: p,
          margenUnitario: (Number(p.pvp) || 0) - (Number(p.precio_compra) || 0),
          margenTotal: ((Number(p.pvp) || 0) - (Number(p.precio_compra) || 0)) * (Number(p.unidades) || 0),
          unidadesVendidas: ventasPorEan.get(p.ean) || 0,
          stockRestante: Number(p.unidades) || 0,
        }));

        // Contar productos por drop para detectar drops "sueltos"
        const productosPorDrop = new Map<string, number>();
        for (const p of storeProducts) {
          const d = p.drop || '';
          if (!d) continue;
          productosPorDrop.set(d, (productosPorDrop.get(d) || 0) + 1);
        }

        let productosEnfoqueVenta: Array<{ nombre: string; razon: string }> = [];

        if (selectedObjective === 'aumentar_margen') {
          productosEnfoqueVenta = productosConDatos
            .filter((p) => p.margenTotal > 0)
            .sort((a, b) => b.margenTotal - a.margenTotal)
            .slice(0, 3)
            .map((p) => ({ nombre: p.producto.nombre, razon: 'Mayor margen del catálogo expuesto' }));
        } else if (selectedObjective === 'aumentar_ventas') {
          productosEnfoqueVenta = productosConDatos
            .filter((p) => p.unidadesVendidas > 0)
            .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
            .slice(0, 3)
            .map((p) => ({ nombre: p.producto.nombre, razon: 'Más vendido en el periodo analizado' }));
        } else if (selectedObjective === 'liquidacion') {
          // Prioridad: producto único en su drop > drop antiguo + sin ventas > sin ventas
          const candidatos = productosConDatos.map((p) => {
            const drop = p.producto.drop || '';
            const esUnicoEnDrop = drop && productosPorDrop.get(drop) === 1;
            const sinVentas = p.unidadesVendidas === 0;
            let razon = '';
            let prioridad = 0;
            if (esUnicoEnDrop) {
              razon = `Producto suelto único del drop "${drop}"`;
              prioridad = 3;
            } else if (sinVentas && drop) {
              razon = `Sin ventas en el periodo · drop "${drop}"`;
              prioridad = 2;
            } else if (sinVentas) {
              razon = 'Sin ventas en el periodo analizado';
              prioridad = 1;
            }
            return { producto: p.producto, prioridad, razon, stockRestante: p.stockRestante };
          });
          productosEnfoqueVenta = candidatos
            .filter((c) => c.prioridad > 0)
            .sort((a, b) => b.prioridad - a.prioridad || b.stockRestante - a.stockRestante)
            .slice(0, 3)
            .map((c) => ({ nombre: c.producto.nombre, razon: c.razon }));
        } else if (selectedObjective === 'nueva_coleccion') {
          // Productos del drop más nuevo (por created_at) o cualquier producto reciente
          const ordenadosPorFecha = [...assignedProducts]
            .filter((p) => p.created_at)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          productosEnfoqueVenta = ordenadosPorFecha.slice(0, 3).map((p) => ({
            nombre: p.nombre,
            razon: p.drop ? `Drop "${p.drop}" recién incorporado` : 'Producto recién incorporado al catálogo',
          }));
        } else if (selectedObjective === 'promocion') {
          // Productos con stock alto y buen margen para promocionar
          productosEnfoqueVenta = productosConDatos
            .filter((p) => p.margenUnitario > 0 && p.stockRestante > 0)
            .sort((a, b) => b.stockRestante * b.margenUnitario - a.stockRestante * a.margenUnitario)
            .slice(0, 3)
            .map((p) => ({
              nombre: p.producto.nombre,
              razon: 'Alto potencial para campaña promocional (stock + margen)',
            }));
        }

        const infoGlobalVisual = {
          numRefExpuestas,
          unidadesStockExpuesto,
          valorStockExpuesto: valorStockExpuestoCalc,
          productoMasRentable,
          productosEnfoqueVenta,
        };

        // Cobertura de stock: cuántas semanas dura el stock total al ritmo de ventas
        // medido en la ventana de duración seleccionada.
        const semanasEnVentana = duracionDias / 7;
        const ventasPorSemana =
          semanasEnVentana > 0 ? unidadesVendidasTotales / semanasEnVentana : 0;
        const coberturaStock =
          ventasPorSemana > 0
            ? `${(stockTotalUnidades / ventasPorSemana).toFixed(1)} semanas`
            : 'Sin ventas en el periodo';

        const nextReport: ReportData = {
          ...reportData,
          productCount: storeProducts.length,
          stockTotalUnidades,
          stockTotalValorado,
          coberturaStock,
          metricasDuracion,
          infoGlobalVisual,
          assignments,
          estructura: reportData.estructura,
          objetivo: objectiveLabels[selectedObjective],
          duracion: duracionLabel,
          topRules: result.topRules || [],
          stockAnalysis,
          analisisProductos,
          muebles: muebblesWithAssignments,
          alerts: result.alerts || [],
        };

        setReportData(nextReport);

        if (savedId) {
          const { error: updateError } = await supabase
            .from('planograms')
            .update({
              datos_json: {
                positions: result.planogram.positions,
                report_data: nextReport,
              },
            })
            .eq('id', savedId);
          if (updateError) {
            console.warn('No se pudo guardar el reportData completo:', updateError);
          }
        }
      }
    } catch (err) {
      // Volcamos el error en consola para que sea visible aunque la caja
      // roja quede fuera de pantalla.
      // eslint-disable-next-line no-console
      console.error('[generatePlanogram] error', err);
      const msg = err instanceof Error ? err.message : 'Error generando planograma';
      setError(msg);
      // Scroll arriba para que el banner rojo quede visible.
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    } finally {
      setGeneratingPlanogram(false);
    }
  };

  const guardarDiseno = async () => {
    if (!reportData) return;
    setGuardandoDiseno(true);
    setGuardadoMsg('');
    try {
      const storeId = selectedStoreId || localStorage.getItem('current_store_id');
      const datos_json = { positions: currentPositions, report_data: reportData };
      if (savedPlanId) {
        const { error: err } = await supabase
          .from('planograms')
          .update({ datos_json })
          .eq('id', savedPlanId);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase
          .from('planograms')
          .insert({
            store_id: storeId,
            objetivo: reportData.objetivo || '',
            datos_json,
            generado_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (err) throw err;
        setSavedPlanId((data as any)?.id || null);
      }
      setGuardadoMsg('✓ Diseño guardado en tu historial');
    } catch (err: any) {
      setGuardadoMsg(err?.message || 'No se pudo guardar el diseño');
    } finally {
      setGuardandoDiseno(false);
    }
  };

  const loadData = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', userId);

      if (storesError || !stores || stores.length === 0) {
        setError('No hay tiendas configuradas');
        setLoading(false);
        return;
      }

      const storeIds = stores.map((s: any) => s.id as string);

      const [{ data: products }, { data: sales }, { data: muebles }] = await Promise.all([
        supabase.from('products').select('*').in('store_id', storeIds),
        supabase.from('sales').select('*').in('store_id', storeIds),
        supabase.from('muebles').select('*').in('store_id', storeIds),
      ]);

      setUserStores(stores);
      setAllProducts(products || []);
      setAllSales(sales || []);
      setAllMuebles(muebles || []);

      const storedActive = localStorage.getItem('current_store_id');
      const initialStore =
        stores.find((s: any) => s.id === storedActive) || stores[0];
      setSelectedStoreId(initialStore.id);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="px-6 py-10 lg:px-10 lg:py-12">
        <div className="max-w-4xl mx-auto text-center">
        <PageHeader
          label="Lineal"
          title="Generar planograma"
          description="Elige el objetivo y Cartistry coloca el surtido aplicando las 26 reglas."
        />

          <p className="text-cartistry-text-secondary">Cargando datos...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-6xl mx-auto">
        <PageHeader
          label="Lineal"
          title="Generar planograma"
          description="Elige el objetivo y Cartistry coloca el surtido aplicando las 26 reglas."
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm mb-6">
            {error}
          </div>
        )}

        {reportData && (
          <div className="space-y-8">
            {/* Configuración compacta en una fila */}
            <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
              <div className="grid sm:grid-cols-3 gap-4">
                {userStores.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-cartistry-text-secondary mb-1">
                      Tienda
                    </label>
                    <select
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                      className="w-full px-3 py-2 border border-cartistry-border rounded bg-white text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                    >
                      {userStores.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-cartistry-text-secondary mb-1">
                    ⏱ Duración
                  </label>
                  <select
                    value={selectedDuracion}
                    onChange={(e) => setSelectedDuracion(e.target.value)}
                    className="w-full px-3 py-2 border border-cartistry-border rounded bg-white text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  >
                    {DURACIONES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-cartistry-text-secondary mb-1">
                    Objetivo
                  </label>
                  <select
                    value={selectedObjective}
                    onChange={(e) => setSelectedObjective(e.target.value as Objective)}
                    className="w-full px-3 py-2 border border-cartistry-border rounded bg-white text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  >
                    {OBJECTIVES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Botones juntos y centrados */}
            {reportData.productCount > 0 && reportData.salesCount > 0 && (
              <div className="flex flex-col items-center gap-3 pt-4">
                <div className="flex flex-wrap justify-center items-center gap-4">
                  <button
                    onClick={generatePlanogram}
                    disabled={generatingPlanogram}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {generatingPlanogram ? 'Generando planograma...' : '✨ Generar planograma'}
                  </button>

                  {reportData.assignments && (
                    <button
                      onClick={guardarDiseno}
                      disabled={guardandoDiseno}
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {guardandoDiseno ? 'Guardando...' : '💾 Guarda tu diseño'}
                    </button>
                  )}

                  {reportData.assignments && (
                    <PlanogramPdfLink
                      data={reportData}
                      fileName={`planograma_${reportData.store?.nombre?.replace(/\s+/g, '_')}.pdf`}
                    />
                  )}
                </div>

                {guardadoMsg && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className={guardadoMsg.startsWith('✓') ? 'text-green-700' : 'text-red-700'}>
                      {guardadoMsg}
                    </span>
                    {guardadoMsg.startsWith('✓') && (
                      <Link href="/dashboard/historial" className="text-cartistry-accent hover:underline">
                        Ver historial →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Informe en pantalla (web) */}
            {reportData.assignments && <PlanogramWebReport data={reportData} />}

          </div>
        )}
      </div>
    </main>
  );
}
