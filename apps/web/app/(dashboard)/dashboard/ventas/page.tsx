'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { downloadCSV, PLANTILLA_VENTAS_CSV } from '@/lib/csv-download';
import { CSVUploader, type CSVData } from '@/components/csv/CSVUploader';
import { CSVPreview } from '@/components/csv/CSVPreview';
import { PageHeader } from '@/components/ui';

interface Sale {
  id: string;
  store_id: string;
  fecha: string;
  hora: string | null;
  numero_ticket: string | null;
  ean: string;
  unidades_vendidas: number;
  pvp: number | null;
  store_nombre?: string;
}

function formatFecha(iso: string) {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportSalesToCSV(sales: Sale[]) {
  const headers = ['Fecha', 'Hora', 'Número de ticket', 'EAN', 'Unidades vendidas', 'PVP'];
  const rows = sales.map((s) => [
    formatFecha(s.fecha),
    s.hora || '',
    s.numero_ticket || '',
    s.ean,
    s.unidades_vendidas,
    s.pvp != null ? Number(s.pvp).toFixed(2) : '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map(escapeCSV).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const today = new Date();
  const filename = `ventas_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.csv`;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function VentasPage() {
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        setLoadingSales(false);
        return;
      }

      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, nombre')
        .eq('user_id', userId);

      if (storesError) {
        console.error('Error cargando tiendas:', storesError);
        setLoadingSales(false);
        return;
      }

      if (!stores || stores.length === 0) {
        setLoadingSales(false);
        return;
      }

      const storeIds = stores.map((s: any) => s.id as string);
      const storeNameById = new Map(stores.map((s: any) => [s.id, s.nombre]));

      const { data, error: fetchError } = await supabase
        .from('sales')
        .select('id, store_id, fecha, hora, numero_ticket, ean, unidades_vendidas, pvp')
        .in('store_id', storeIds)
        .order('numero_ticket', { ascending: true });

      if (fetchError) {
        console.error('Error cargando ventas:', fetchError);
      } else {
        const enriched = (data || []).map((s: any) => ({
          ...s,
          store_nombre: storeNameById.get(s.store_id) || '',
        }));
        setSales(enriched);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleDataLoaded = (data: CSVData) => {
    setCSVData(data);
    setStep('preview');
  };

  const handleConfirm = async () => {
    if (!csvData) return;

    setError('');
    setLoading(true);

    try {
      const userId = getUserId();
      if (!userId) {
        setError('Usuario no autenticado');
        return;
      }

      // Intentar obtener store_id del localStorage primero
      let storeId = localStorage.getItem('current_store_id');

      if (!storeId) {
        // Si no está en localStorage, buscar por usuario
        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', userId);

        if (!stores || stores.length === 0) {
          setError('Debes configurar tu tienda primero');
          return;
        }

        storeId = stores[0].id as string;
        localStorage.setItem('current_store_id', storeId);
      }

      if (!storeId) {
        setError('Error obteniendo tienda');
        return;
      }

      // Procesar y validar ventas
      const salesToInsert = csvData.rows.map((row) => ({
        store_id: storeId,
        fecha: convertToISO(row['Fecha'] || row['fecha'] || ''),
        hora: row['Hora'] || row['hora'] || '',
        numero_ticket: row['Número de ticket'] || row['numero_ticket'] || '',
        ean: row['EAN'] || row['ean'] || '',
        unidades_vendidas: parseInt(row['Unidades vendidas'] || row['unidades_vendidas'] || '0'),
        pvp: parseFloat(row['PVP'] || row['pvp'] || '0'),
      }));

      // Filtrar filas según su estado
      const emptyRows = salesToInsert.filter(
        (sale) => !sale.fecha && !sale.numero_ticket && !sale.ean && !sale.unidades_vendidas
      );

      const validSales = salesToInsert.filter(
        (sale) => sale.fecha && sale.numero_ticket && sale.ean && sale.unidades_vendidas
      );

      const incompleteRows = salesToInsert.filter(
        (sale) =>
          !emptyRows.includes(sale) &&
          !validSales.includes(sale)
      );

      if (validSales.length === 0) {
        setError('No hay filas válidas con todos los campos requeridos');
        return;
      }

      // 1) Quitar duplicados dentro del propio CSV
      const seenInCSV = new Set<string>();
      const duplicadosEnCSV: typeof validSales = [];
      const uniqueFromCSV = validSales.filter((sale) => {
        const key = `${sale.fecha}|${sale.hora}|${sale.numero_ticket}|${sale.ean}|${sale.unidades_vendidas}|${sale.pvp}`;
        if (seenInCSV.has(key)) {
          duplicadosEnCSV.push(sale);
          return false;
        }
        seenInCSV.add(key);
        return true;
      });

      // 2) Quitar las que ya existen en la BD (mismas fecha+hora+ticket+ean+unidades+pvp)
      const { data: existingSales } = await supabase
        .from('sales')
        .select('fecha, hora, numero_ticket, ean, unidades_vendidas, pvp')
        .eq('store_id', storeId);

      const existingKeys = new Set<string>(
        (existingSales || []).map((s: any) => {
          const fecha = s.fecha;
          const pvp = s.pvp != null ? Number(s.pvp) : 0;
          return `${fecha}|${s.hora || ''}|${s.numero_ticket || ''}|${s.ean}|${s.unidades_vendidas}|${pvp}`;
        })
      );

      const duplicadosEnBD: typeof validSales = [];
      const finalSales = uniqueFromCSV.filter((sale) => {
        const key = `${sale.fecha}|${sale.hora || ''}|${sale.numero_ticket || ''}|${sale.ean}|${sale.unidades_vendidas}|${sale.pvp}`;
        if (existingKeys.has(key)) {
          duplicadosEnBD.push(sale);
          return false;
        }
        return true;
      });

      // Construir mensaje de aviso si hay omisiones
      const avisos: string[] = [];
      if (incompleteRows.length > 0) avisos.push(`${incompleteRows.length} filas incompletas`);
      if (duplicadosEnCSV.length > 0) avisos.push(`${duplicadosEnCSV.length} duplicadas dentro del CSV`);
      if (duplicadosEnBD.length > 0) avisos.push(`${duplicadosEnBD.length} ya existentes en la base de datos`);
      if (avisos.length > 0) {
        setError(`Se omitieron: ${avisos.join(' · ')}. Se importarán ${finalSales.length} ventas nuevas.`);
      }

      if (finalSales.length === 0) {
        setError(`Todas las filas válidas ya existen en la base de datos o están duplicadas. No se importó nada.`);
        return;
      }

      // Insertar ventas válidas (en batches de 1000)
      for (let i = 0; i < finalSales.length; i += 1000) {
        const batch = finalSales.slice(i, i + 1000);
        const { error: insertError } = await supabase
          .from('sales')
          .insert(batch);

        if (insertError) {
          throw new Error(`Error al insertar ventas: ${insertError.message}`);
        }
      }

      setImportedCount(finalSales.length);
      await loadSales();
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar ventas');
    } finally {
      setLoading(false);
    }
  };

  const convertToISO = (dateStr: string): string => {
    // Convertir DD/MM/YYYY o DD/MM/YY a YYYY-MM-DD
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      let day = parts[0].padStart(2, '0');
      let month = parts[1].padStart(2, '0');
      let year = parts[2];

      // Si el año tiene 2 dígitos, convertir a 4 dígitos
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum > 30 ? `19${year}` : `20${year}`;
      }

      // Validar que sea una fecha válida
      const dateNum = new Date(`${year}-${month}-${day}`);
      if (isNaN(dateNum.getTime())) {
        return dateStr; // Retornar original si no es válida
      }

      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-6xl mx-auto">
        <PageHeader
          label="Datos"
          title="Ventas"
          description="Sube las ventas de la semana para que el planograma se recalcule con datos reales."
        />

        {step === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-serif font-bold text-cartistry-text mb-2">
                Sube tu datos de ventas semanales
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Botón de descarga */}
              <button
                onClick={() => downloadCSV('plantilla_ventas.csv', PLANTILLA_VENTAS_CSV)}
                className="p-6 bg-cartistry-surface rounded border border-cartistry-border hover:border-cartistry-accent hover:bg-cartistry-bg transition text-left"
              >
                <p className="text-sm font-medium text-cartistry-text">
                  Descargar plantilla
                </p>
              </button>

              {/* Uploader */}
              <div className="p-6 bg-cartistry-surface rounded border border-cartistry-border">
                <p className="text-sm font-medium text-cartistry-text mb-4">
                  Sube tus ventas
                </p>
                <CSVUploader onDataLoaded={handleDataLoaded} />
              </div>
            </div>

            {!loadingSales && (
              <div className="mt-8">
                {sales.length === 0 ? (
                  <p className="text-cartistry-text-secondary text-sm">No hay ventas registradas aún</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-serif font-bold text-cartistry-text">
                        Ventas registradas ({sales.length})
                      </h3>
                      <button
                        onClick={() => exportSalesToCSV(sales)}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Exportar datos
                      </button>
                    </div>
                    <div className="space-y-2">
                      {sales.map((sale) => (
                        <div
                          key={sale.id}
                          className="bg-cartistry-surface rounded border border-cartistry-border p-4 hover:border-cartistry-accent transition"
                        >
                          <div className="grid grid-cols-7 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-cartistry-text-secondary font-medium mb-1">Fecha</p>
                              <p className="text-cartistry-text">{formatFecha(sale.fecha)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-cartistry-text-secondary font-medium mb-1">Hora</p>
                              <p className="text-cartistry-text-secondary text-sm">{sale.hora || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-cartistry-text-secondary font-medium mb-1">Tienda</p>
                              <p className="text-cartistry-text-secondary text-sm">{sale.store_nombre || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-cartistry-text-secondary font-medium mb-1">Ticket</p>
                              <p className="text-cartistry-text-secondary text-xs font-mono">{sale.numero_ticket || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-cartistry-text-secondary font-medium mb-1">EAN</p>
                              <p className="text-cartistry-text-secondary text-xs font-mono">{sale.ean}</p>
                            </div>
                            <div>
                              <p className="text-xs text-cartistry-text-secondary font-medium mb-1">Unidades</p>
                              <p className="text-cartistry-text font-medium">{sale.unidades_vendidas}</p>
                            </div>
                            <div>
                              <p className="text-xs text-cartistry-text-secondary font-medium mb-1">PVP</p>
                              <p className="text-cartistry-text">{sale.pvp != null ? `€${Number(sale.pvp).toFixed(2)}` : '—'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'preview' && csvData && (
          <div className="space-y-6">
            <CSVPreview {...csvData} />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep('upload')}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                ← Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {loading ? `Guardando ${csvData.rows.length} ventas...` : 'Confirmar y guardar'}
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6 text-center">
            <div className="bg-green-50 border border-green-200 rounded p-8">
              <h2 className="text-lg font-serif font-bold text-green-900 mb-2">
                ✓ Datos de ventas guardados correctamente
              </h2>
              <p className="text-sm text-green-800">
                {importedCount} registros de ventas han sido importados a tu tienda.
              </p>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
