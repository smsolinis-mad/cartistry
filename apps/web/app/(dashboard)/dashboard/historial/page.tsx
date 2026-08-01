'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PlanogramReport, type ReportData } from '@/components/planograma/PlanogramReport';

interface HistorialItem {
  id: string;
  store_id: string;
  objetivo: string;
  generado_at: string;
  storeName: string;
  reportData: ReportData | null;
}

interface Store {
  id: string;
  nombre: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function buildFileName(storeName: string, iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const safeStore = (storeName || 'tienda').replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
  return `planograma_${safeStore}_${yyyy}-${mm}-${dd}_${hh}-${mi}.pdf`;
}

export default function HistorialPage() {
  const [items, setItems] = useState<HistorialItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filterStoreId, setFilterStoreId] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    loadHistorial();
  }, []);

  const loadHistorial = async () => {
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

      if (storesError || !storesData || storesData.length === 0) {
        setItems([]);
        setStores([]);
        setLoading(false);
        return;
      }

      setStores(storesData);

      const storeMap = new Map<string, string>();
      storesData.forEach((s: any) => storeMap.set(s.id, s.nombre));

      const storeIds = storesData.map((s: any) => s.id);

      const { data: planograms, error: planogramsError } = await supabase
        .from('planograms')
        .select('id, store_id, objetivo, generado_at, datos_json')
        .in('store_id', storeIds)
        .order('generado_at', { ascending: false });

      if (planogramsError) {
        setError('Error al cargar el historial');
        setLoading(false);
        return;
      }

      const mapped: HistorialItem[] = (planograms || []).map((p: any) => ({
        id: p.id,
        store_id: p.store_id,
        objetivo: p.objetivo,
        generado_at: p.generado_at,
        storeName: storeMap.get(p.store_id) || 'Tienda',
        reportData: p.datos_json?.report_data || null,
      }));

      setItems(mapped);
    } catch (err) {
      setError('Error al cargar el historial');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: HistorialItem) => {
    const ok = window.confirm(
      `¿Borrar el planograma de "${item.storeName}" del ${formatDateTime(item.generado_at)}?\n\nEsta acción no se puede deshacer.`
    );
    if (!ok) return;

    setDeletingId(item.id);
    setError('');
    try {
      const { error: deleteError } = await supabase
        .from('planograms')
        .delete()
        .eq('id', item.id);

      if (deleteError) {
        setError(`Error al borrar: ${deleteError.message}`);
        return;
      }

      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError('Error al borrar el planograma');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterStoreId && item.store_id !== filterStoreId) return false;
      if (filterDateFrom || filterDateTo) {
        const itemDate = item.generado_at.slice(0, 10); // YYYY-MM-DD
        if (filterDateFrom && itemDate < filterDateFrom) return false;
        if (filterDateTo && itemDate > filterDateTo) return false;
      }
      return true;
    });
  }, [items, filterStoreId, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterStoreId('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = filterStoreId || filterDateFrom || filterDateTo;

  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="text-cartistry-accent hover:underline text-sm">
            ← Volver
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">
            Historial de planogramas
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {loading && <p className="text-cartistry-text-secondary">Cargando…</p>}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="bg-cartistry-surface border border-cartistry-border rounded p-8 text-center">
            <p className="text-cartistry-text-secondary">
              Aún no has generado ningún planograma.
            </p>
            <Link
              href="/dashboard/planograma"
              className="inline-block mt-4 px-6 py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition"
            >
              Generar primer planograma
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            <div className="bg-cartistry-surface border border-cartistry-border rounded p-4 mb-6">
              <div className="grid md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs text-cartistry-text-secondary mb-1">
                    Tienda
                  </label>
                  <select
                    value={filterStoreId}
                    onChange={(e) => setFilterStoreId(e.target.value)}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  >
                    <option value="">Todas</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-cartistry-text-secondary mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cartistry-text-secondary mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
                <div>
                  <button
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className="w-full px-3 py-2 border border-cartistry-border rounded text-sm text-cartistry-accent hover:bg-cartistry-bg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
              <p className="text-xs text-cartistry-text-secondary mt-3">
                {filteredItems.length} de {items.length} planograma{items.length === 1 ? '' : 's'}
              </p>
            </div>

            {filteredItems.length === 0 ? (
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-8 text-center">
                <p className="text-cartistry-text-secondary">
                  No hay planogramas que coincidan con los filtros.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-cartistry-surface border border-cartistry-border rounded p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-bold text-cartistry-text">
                        {item.storeName}
                      </p>
                      <p className="text-sm text-cartistry-text-secondary mt-1">
                        {formatDateTime(item.generado_at)} · Objetivo: {item.objetivo}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {item.reportData ? (
                        <LazyPdfButton
                          reportData={item.reportData}
                          fileName={buildFileName(item.storeName, item.generado_at)}
                        />
                      ) : (
                        <span className="text-xs text-cartistry-text-secondary italic">
                          Sin datos del informe
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="px-3 py-2 border border-red-300 text-red-700 rounded text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
                        title="Borrar planograma"
                      >
                        {deletingId === item.id ? '…' : '🗑'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// Prepara el PDF solo cuando el usuario lo pide (evita construir 45 PDFs al cargar).
function LazyPdfButton({ reportData, fileName }: { reportData: ReportData; fileName: string }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        onClick={() => setArmed(true)}
        className="px-4 py-2 bg-cartistry-cta text-cartistry-cta-text rounded text-sm font-medium hover:opacity-90 transition"
      >
        📥 Descargar PDF
      </button>
    );
  }

  return (
    <PDFDownloadLink document={<PlanogramReport data={reportData} />} fileName={fileName}>
      {({ loading: pdfLoading, url }) => (
        <a
          href={url || undefined}
          className={`px-4 py-2 rounded text-sm font-medium transition inline-block ${
            pdfLoading
              ? 'bg-cartistry-bg-secondary text-cartistry-text-secondary pointer-events-none'
              : 'bg-cartistry-cta text-cartistry-cta-text hover:opacity-90'
          }`}
        >
          {pdfLoading ? 'Preparando…' : '📥 Descargar PDF'}
        </a>
      )}
    </PDFDownloadLink>
  );
}
