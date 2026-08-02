'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { PageHeader } from '@/components/ui';

interface Store {
  id: string;
  nombre: string;
}

interface Movimiento {
  id: string;
  store_id: string;
  tipo: string; // 'ingreso' | 'retirada'
  categoria: string; // 'ventas' | 'petty_cash'
  concepto: string | null;
  importe: number;
  fecha: string | null;
  created_at: string;
}

const CATEGORIAS: Record<string, string> = {
  ventas: 'Ventas',
  petty_cash: 'Petty cash',
};

function formatEUR(n: number): string {
  const s = n < 0 ? '-' : '';
  return `${s}€${Math.abs(n || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function IngresosPage() {
  const supabase = createClient();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [cashSales, setCashSales] = useState(0);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulario añadir movimiento
  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipo, setTipo] = useState('ingreso');
  const [categoria, setCategoria] = useState('ventas');
  const [importe, setImporte] = useState('');
  const [concepto, setConcepto] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      const userId = getUserId();
      if (!userId) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('stores')
        .select('id, nombre')
        .eq('user_id', userId)
        .order('nombre', { ascending: true });
      const list = (data as Store[]) || [];
      setStores(list);
      if (list.length > 0) {
        const active = typeof window !== 'undefined' ? localStorage.getItem('current_store_id') : null;
        setStoreId(list.find((s) => s.id === active)?.id || list[0].id);
      } else {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!storeId) return;
    cargar(storeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const cargar = async (sid: string) => {
    setLoading(true);
    setError('');
    try {
      const [ventasRes, movRes] = await Promise.all([
        supabase
          .from('sales')
          .select('unidades_vendidas, pvp, metodo_pago')
          .eq('store_id', sid)
          .eq('metodo_pago', 'moneda'),
        supabase
          .from('cash_movements')
          .select('*')
          .eq('store_id', sid)
          .order('created_at', { ascending: false }),
      ]);
      if (ventasRes.error) throw ventasRes.error;
      if (movRes.error) throw movRes.error;

      const cash = (ventasRes.data || []).reduce(
        (s: number, r: any) => s + (Number(r.pvp) || 0) * (Number(r.unidades_vendidas) || 0),
        0
      );
      setCashSales(cash);
      setMovimientos((movRes.data as Movimiento[]) || []);
    } catch (err: any) {
      setError(err?.message || 'Error cargando movimientos');
    } finally {
      setLoading(false);
    }
  };

  const signo = (m: Movimiento) => (m.tipo === 'retirada' ? -1 : 1);

  const totales = useMemo(() => {
    let ventas = cashSales;
    let petty = 0;
    for (const m of movimientos) {
      const efecto = signo(m) * Number(m.importe);
      if (m.categoria === 'petty_cash') petty += efecto;
      else ventas += efecto;
    }
    return { ventas, petty, total: ventas + petty };
  }, [cashSales, movimientos]);

  const guardar = async () => {
    const cents = parseFloat(importe) || 0;
    if (cents <= 0 || !storeId) return;
    setGuardando(true);
    setError('');
    try {
      const { error: err } = await supabase.from('cash_movements').insert({
        store_id: storeId,
        tipo,
        categoria,
        concepto: concepto.trim() || null,
        importe: cents,
        fecha,
      });
      if (err) throw err;
      setImporte('');
      setConcepto('');
      setTipo('ingreso');
      setCategoria('ventas');
      setFecha(hoyISO());
      setMostrarForm(false);
      await cargar(storeId);
    } catch (err: any) {
      setError(err?.message || 'Error guardando movimiento');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          label="Ventas"
          title="Ingresos"
          actions={<>{stores.length > 1 && (
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          )}</>}
        />

        {stores.length === 0 && !loading ? (
          <p className="text-cartistry-text-secondary text-sm">No tienes tiendas configuradas todavía.</p>
        ) : (
          <>
            {/* Dinero que debe haber ahora */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-1">
                  En ventas (efectivo)
                </p>
                <p className="text-2xl font-serif font-bold text-cartistry-text">
                  {formatEUR(totales.ventas)}
                </p>
              </div>
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-1">
                  En petty cash
                </p>
                <p className="text-2xl font-serif font-bold text-cartistry-text">
                  {formatEUR(totales.petty)}
                </p>
              </div>
              <div className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none">
                <p className="text-xs uppercase tracking-wider font-bold opacity-80 mb-1">
                  Total en tienda
                </p>
                <p className="text-2xl font-serif font-bold">{formatEUR(totales.total)}</p>
              </div>
            </div>

            {/* Acción añadir */}
            <div className="flex justify-end">
              <button
                onClick={() => setMostrarForm((v) => !v)}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {mostrarForm ? 'Cancelar' : '+ Añadir ingreso'}
              </button>
            </div>

            {mostrarForm && (
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <div className="grid sm:grid-cols-[120px_140px_1fr_130px_120px_auto] gap-3 items-end">
                  <div>
                    <label className="eyebrow block mb-1.5">Tipo</label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      className="w-full px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                    >
                      <option value="ingreso">Ingreso</option>
                      <option value="retirada">Retirada</option>
                    </select>
                  </div>
                  <div>
                    <label className="eyebrow block mb-1.5">Categoría</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                    >
                      <option value="ventas">Ventas</option>
                      <option value="petty_cash">Petty cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="eyebrow block mb-1.5">Concepto</label>
                    <input
                      type="text"
                      value={concepto}
                      onChange={(e) => setConcepto(e.target.value)}
                      placeholder="Motivo del movimiento"
                      className="w-full px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                    />
                  </div>
                  <div>
                    <label className="eyebrow block mb-1.5">Fecha</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                    />
                  </div>
                  <div>
                    <label className="eyebrow block mb-1.5">Importe (€)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={importe}
                      onChange={(e) => setImporte(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                    />
                  </div>
                  <button
                    onClick={guardar}
                    disabled={guardando}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
            )}

            {/* Listado de movimientos */}
            <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
              <div className="grid grid-cols-[110px_1fr_130px_120px] gap-4 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
                <span>Fecha</span>
                <span>Concepto</span>
                <span>Categoría</span>
                <span className="text-right">Importe</span>
              </div>

              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-cartistry-text-secondary">Cargando...</div>
              ) : movimientos.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-cartistry-text-secondary">
                  No hay movimientos registrados aún.
                </div>
              ) : (
                movimientos.map((m) => {
                  const efecto = signo(m) * Number(m.importe);
                  return (
                    <div
                      key={m.id}
                      className="grid grid-cols-[110px_1fr_130px_120px] gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 last:border-b-0 text-sm"
                    >
                      <span className="text-cartistry-text-secondary">{m.fecha || '—'}</span>
                      <span className="text-cartistry-text">
                        {m.concepto || (m.tipo === 'retirada' ? 'Retirada' : 'Ingreso')}
                      </span>
                      <span className="text-cartistry-text-secondary text-xs">
                        {CATEGORIAS[m.categoria] || m.categoria}
                      </span>
                      <span
                        className={`text-right font-medium ${
                          efecto < 0 ? 'text-red-600' : 'text-green-700'
                        }`}
                      >
                        {formatEUR(efecto)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
