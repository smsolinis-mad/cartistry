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
  categoria: string;
  concepto: string | null;
  importe: number;
  fecha: string | null;
  created_at: string;
}

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

export default function PettyCashPage() {
  const supabase = createClient();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modo, setModo] = useState<'anadir' | 'retirar' | null>(null);
  const [importe, setImporte] = useState('');
  const [motivo, setMotivo] = useState('');
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
    const { data, error: err } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('store_id', sid)
      .eq('categoria', 'petty_cash')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setMovimientos((data as Movimiento[]) || []);
    setLoading(false);
  };

  const signo = (m: Movimiento) => (m.tipo === 'retirada' ? -1 : 1);
  const saldo = useMemo(
    () => movimientos.reduce((s, m) => s + signo(m) * Number(m.importe), 0),
    [movimientos]
  );

  const abrir = (m: 'anadir' | 'retirar') => {
    setModo(m);
    setImporte('');
    setMotivo('');
  };

  const guardar = async () => {
    const cents = parseFloat(importe) || 0;
    if (cents <= 0 || !storeId) return;
    setGuardando(true);
    setError('');
    try {
      const { error: err } = await supabase.from('cash_movements').insert({
        store_id: storeId,
        tipo: modo === 'retirar' ? 'retirada' : 'ingreso',
        categoria: 'petty_cash',
        concepto: motivo.trim() || (modo === 'retirar' ? 'Retirada de efectivo' : 'Entrada de efectivo'),
        importe: cents,
        fecha: hoyISO(),
      });
      if (err) throw err;
      setModo(null);
      await cargar(storeId);
    } catch (err: any) {
      setError(err?.message || 'Error guardando movimiento');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Gestión de efectivo"
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
            {/* Saldo + acciones */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-cartistry-surface border border-cartistry-border rounded px-4 py-3 mb-6">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-0.5">
                  Saldo petty cash
                </p>
                <p className="text-xl font-serif font-bold text-cartistry-text">{formatEUR(saldo)}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => abrir('retirar')}
                  className="px-4 py-2 rounded text-sm font-medium border border-red-300 text-red-700 hover:bg-red-50 transition"
                >
                  Retirar efectivo
                </button>
                <button
                  onClick={() => abrir('anadir')}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Añadir efectivo
                </button>
              </div>
            </div>

            {/* Formulario */}
            {modo && (
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4 mb-6">
                <h3 className="text-sm font-medium text-cartistry-text mb-4">
                  {modo === 'anadir' ? 'Añadir efectivo a la caja' : 'Retirar efectivo de la caja'}
                </h3>
                <div className="grid sm:grid-cols-[160px_1fr_auto] gap-4 items-end">
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
                  <div>
                    <label className="eyebrow block mb-1.5">Motivo</label>
                    <input
                      type="text"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej. Fondo de apertura, pago proveedor…"
                      className="w-full px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModo(null)}
                      disabled={guardando}
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardar}
                      disabled={guardando}
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm mb-6">{error}</div>
            )}

            {/* Tabla de movimientos */}
            <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
              <div className="grid grid-cols-[120px_1fr_1.5fr_130px] gap-4 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
                <span>Fecha</span>
                <span>Usuario</span>
                <span>Concepto</span>
                <span className="text-right">Transacciones (€)</span>
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
                      className="grid grid-cols-[120px_1fr_1.5fr_130px] gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 last:border-b-0 text-sm"
                    >
                      <span className="text-cartistry-text-secondary">{m.fecha || '—'}</span>
                      <span className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded flex items-center justify-center bg-cartistry-accent text-cartistry-cta-text text-xs font-medium">
                          U
                        </span>
                        <span className="text-cartistry-text">Usuario</span>
                      </span>
                      <span className="text-cartistry-text-secondary">{m.concepto || '—'}</span>
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
