'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Coins, CreditCard, Ticket, Landmark, type LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { isCajaAbierta } from '@/lib/caja-estado';

const METODOS_PAGO: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'moneda', label: 'Moneda', icon: Coins },
  { key: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { key: 'vale', label: 'Vale', icon: Ticket },
  { key: 'transferencia', label: 'Transferencia', icon: Landmark },
];

interface Product {
  id: string;
  store_id: string;
  ean: string | null;
  codigo: string | null;
  nombre: string | null;
  pvp: number | null;
  unidades: number | null;
  _search: string;
  [key: string]: any;
}

interface Linea {
  product: Product;
  cantidad: number;
}

// Campos que no aportan a la búsqueda (ids, fechas, imagen)
const EXCLUIR_BUSQUEDA = new Set([
  'id',
  'store_id',
  'created_at',
  'updated_at',
  'URL Imagen',
  '_search',
]);

function formatEUR(n: number): string {
  return `€${(n || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CajaPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [cobrando, setCobrando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
  const [empleados, setEmpleados] = useState<{ id: string; nombre: string | null; apellidos: string | null }[]>([]);
  const [vendedor, setVendedor] = useState('');
  const [metodoModal, setMetodoModal] = useState(false);
  const [pagoEfectivo, setPagoEfectivo] = useState(false);
  const [entregado, setEntregado] = useState('');
  const [pagoVale, setPagoVale] = useState(false);
  const [codigoVale, setCodigoVale] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCajaAbierta(isCajaAbierta());
    (async () => {
      const userId = getUserId();
      if (!userId) return;
      const { data } = await supabase
        .from('empleados')
        .select('id, nombre, apellidos')
        .eq('user_id', userId)
        .order('apellidos', { ascending: true });
      setEmpleados((data as any[]) || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const userId = getUserId();
        if (!userId) {
          setError('Usuario no autenticado');
          setLoading(false);
          return;
        }
        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', userId);
        const storeIds = (stores || []).map((s: any) => s.id as string);
        if (storeIds.length === 0) {
          setLoading(false);
          return;
        }
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .in('store_id', storeIds);
        if (fetchError) {
          setError(`Error cargando productos: ${fetchError.message}`);
        } else {
          const enriched = (data || []).map((p: any) => {
            const search = Object.entries(p)
              .filter(([k, v]) => !EXCLUIR_BUSQUEDA.has(k) && v != null && v !== '')
              .map(([, v]) => String(v))
              .join(' ')
              .toLowerCase();
            return { ...p, _search: search } as Product;
          });
          setProducts(enriched);
        }
      } catch (err: any) {
        setError(err?.message || 'Error cargando productos');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resultados de búsqueda (por todos los campos, todos los términos deben aparecer)
  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terminos = q.split(/\s+/).filter(Boolean);
    return products
      .filter((p) => terminos.every((t) => p._search.includes(t)))
      .slice(0, 25);
  }, [query, products]);

  const anadir = (p: Product) => {
    setLineas((prev) => {
      const existe = prev.find((l) => l.product.id === p.id);
      if (existe) {
        return prev.map((l) =>
          l.product.id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l
        );
      }
      return [...prev, { product: p, cantidad: 1 }];
    });
    setQuery('');
    inputRef.current?.focus();
  };

  // Permite cantidades negativas (devoluciones) y cero
  const cambiarCantidad = (id: string, delta: number) =>
    setLineas((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, cantidad: l.cantidad + delta } : l))
    );

  const fijarCantidad = (id: string, valor: string) => {
    // Permite escribir el signo "-" a mitad; si no es un número válido, no cambia
    if (valor === '' || valor === '-') return;
    const n = parseInt(valor, 10);
    if (isNaN(n)) return;
    setLineas((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, cantidad: n } : l))
    );
  };

  const quitar = (id: string) =>
    setLineas((prev) => prev.filter((l) => l.product.id !== id));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && resultados.length > 0) {
      e.preventDefault();
      anadir(resultados[0]);
    }
  };

  const totalUnidades = lineas.reduce((s, l) => s + l.cantidad, 0);
  const total = lineas.reduce((s, l) => s + (Number(l.product.pvp) || 0) * l.cantidad, 0);

  const cerrarModal = () => {
    if (cobrando) return;
    setMetodoModal(false);
    setPagoEfectivo(false);
    setEntregado('');
    setPagoVale(false);
    setCodigoVale('');
  };

  const cobrar = async (
    metodo: { key: string; label: string },
    infoEfectivo?: { entregado: number; cambio: number },
    refVale?: string
  ) => {
    if (lineas.length === 0) return;
    setCobrando(true);
    setMensaje('');
    try {
      const ahora = new Date();
      const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(
        ahora.getDate()
      ).padStart(2, '0')}`;
      const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
      const ticket = `T${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(
        ahora.getDate()
      ).padStart(2, '0')}-${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(
        2,
        '0'
      )}${String(ahora.getSeconds()).padStart(2, '0')}`;

      // Filas base (columnas que siempre existen)
      const baseRows = lineas.map((l) => ({
        store_id: l.product.store_id,
        fecha,
        hora,
        numero_ticket: ticket,
        ean: l.product.ean,
        unidades_vendidas: l.cantidad,
        pvp: Number(l.product.pvp) || 0,
      }));
      // Filas con método de pago, referencia y vendedor (columnas nuevas)
      const rows = baseRows.map((r) => ({
        ...r,
        metodo_pago: metodo.key,
        ref_pago: refVale || null,
        empleado_id: vendedor || null,
      }));

      let sinColumnas = false;
      let { error: insertError } = await supabase.from('sales').insert(rows);
      if (
        insertError &&
        /metodo_pago|ref_pago|empleado_id|schema cache|PGRST204|42703/i.test(
          `${insertError.message} ${(insertError as any).code || ''}`
        )
      ) {
        // Las columnas nuevas aún no existen: registrar la venta sin ellas
        const retry = await supabase.from('sales').insert(baseRows);
        insertError = retry.error;
        sinColumnas = !insertError;
      }
      if (insertError) throw insertError;

      const extra = infoEfectivo
        ? ` · Entregado ${formatEUR(infoEfectivo.entregado)} · Cambio ${formatEUR(infoEfectivo.cambio)}`
        : refVale
          ? ` · Vale ${refVale}`
          : '';
      const aviso = sinColumnas
        ? ' ⚠️ (falta ejecutar el SQL para guardar el método de pago)'
        : '';
      setMensaje(
        `✓ Cobro registrado · ${metodo.label} · Ticket ${ticket} · ${formatEUR(total)}${extra}${aviso}`
      );
      setLineas([]);
      setMetodoModal(false);
      setPagoEfectivo(false);
      setEntregado('');
      setPagoVale(false);
      setCodigoVale('');
      inputRef.current?.focus();
    } catch (err: any) {
      setMensaje(err?.message || 'Error al registrar el cobro');
    } finally {
      setCobrando(false);
    }
  };

  // Caja cerrada: no se puede cobrar
  if (cajaAbierta === false) {
    return (
      <main className="min-h-screen bg-cartistry-bg">
        <header className="bg-cartistry-surface border-b border-cartistry-border">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <Link href="/dashboard/ventas" className="text-cartistry-accent hover:underline text-sm">
              ← Volver
            </Link>
            <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">Ventas · Caja</h1>
          </div>
        </header>

        <div className="max-w-md mx-auto px-6 py-20 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-cartistry-bg-secondary flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
          <div className="w-full py-3 rounded font-medium text-base bg-cartistry-bg-secondary text-cartistry-text-secondary border border-cartistry-border">
            Caja cerrada · Ábrela para poder cobrar
          </div>
          <Link
            href="/dashboard/ventas/apertura-cierre"
            className="block w-full py-3 rounded font-medium text-base bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition"
          >
            Ir a Apertura/Cierre
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/dashboard/ventas" className="text-cartistry-accent hover:underline text-sm">
              ← Volver
            </Link>
            <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">Ventas · Caja</h1>
          </div>
          <div className="flex items-center gap-3">
            {empleados.length > 0 && (
              <select
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                className="px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                title="Vendedor"
              >
                <option value="">Vendedor…</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {[e.nombre, e.apellidos].filter(Boolean).join(' ') || 'Empleado'}
                  </option>
                ))}
              </select>
            )}
            {lineas.length > 0 && (
              <button
                onClick={() => setLineas([])}
                className="px-3 py-2 rounded text-sm font-medium border border-cartistry-border text-cartistry-accent hover:bg-cartistry-bg transition"
              >
                Vaciar caja
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Buscador */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar producto por código, EAN, nombre, color, tipo…"
            className="w-full px-4 py-3 bg-cartistry-surface border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
            autoFocus
          />

          {query.trim() && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-cartistry-surface border border-cartistry-border rounded shadow-lg max-h-80 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-3 text-sm text-cartistry-text-secondary">Cargando productos…</p>
              ) : resultados.length === 0 ? (
                <p className="px-4 py-3 text-sm text-cartistry-text-secondary">
                  Sin resultados para “{query}”.
                </p>
              ) : (
                resultados.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => anadir(p)}
                    className="w-full text-left px-4 py-2.5 border-b border-cartistry-border/50 last:border-b-0 hover:bg-cartistry-bg transition flex items-center justify-between gap-4"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm text-cartistry-text truncate">{p.nombre || '—'}</span>
                      <span className="block text-xs text-cartistry-text-secondary font-mono">
                        {p.codigo || '—'} · {p.ean || '—'}
                      </span>
                    </span>
                    <span className="text-sm text-cartistry-text whitespace-nowrap">
                      {formatEUR(Number(p.pvp) || 0)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Productos cobrados */}
        <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
          <div className="grid grid-cols-[110px_1fr_120px_100px_40px] gap-3 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
            <span>Unidades</span>
            <span>Producto</span>
            <span className="text-right">Código</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>

          {lineas.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-cartistry-text-secondary">
              Busca productos arriba para añadirlos a la caja.
            </div>
          ) : (
            lineas.map((l) => {
              const subtotal = (Number(l.product.pvp) || 0) * l.cantidad;
              return (
                <div
                  key={l.product.id}
                  className="grid grid-cols-[110px_1fr_120px_100px_40px] gap-3 px-4 py-3 items-center border-b border-cartistry-border/50 last:border-b-0 text-sm"
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cambiarCantidad(l.product.id, -1)}
                      className="w-6 h-6 rounded border border-cartistry-border text-cartistry-text hover:bg-cartistry-bg"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={l.cantidad}
                      onChange={(e) => fijarCantidad(l.product.id, e.target.value)}
                      className={`w-12 px-1 py-1 text-center bg-cartistry-bg border border-cartistry-border rounded focus:outline-none focus:border-cartistry-accent ${
                        l.cantidad < 0 ? 'text-red-600' : 'text-cartistry-text'
                      }`}
                    />
                    <button
                      onClick={() => cambiarCantidad(l.product.id, 1)}
                      className="w-6 h-6 rounded border border-cartistry-border text-cartistry-text hover:bg-cartistry-bg"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-cartistry-text truncate" title={l.product.nombre || ''}>
                    {l.product.nombre || '—'}
                  </span>
                  <span className="text-right font-mono text-xs text-cartistry-text-secondary">
                    {l.product.codigo || '—'}
                  </span>
                  <span
                    className={`text-right font-medium ${
                      subtotal < 0 ? 'text-red-600' : 'text-cartistry-text'
                    }`}
                  >
                    {formatEUR(subtotal)}
                  </span>
                  <button
                    onClick={() => quitar(l.product.id)}
                    className="text-cartistry-text-secondary hover:text-red-600 text-lg leading-none justify-self-end"
                    aria-label="Quitar"
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}

          {/* Total */}
          <div className="grid grid-cols-[110px_1fr_120px_100px_40px] gap-3 px-4 py-4 items-center bg-cartistry-bg-secondary text-sm font-medium">
            <span className="text-cartistry-text">{totalUnidades} ud.</span>
            <span className="text-cartistry-text uppercase tracking-wide text-xs">Total</span>
            <span />
            <span className="text-right text-lg font-serif font-bold text-cartistry-text">
              {formatEUR(total)}
            </span>
            <span />
          </div>
        </div>

        {/* Cobrar */}
        <div>
          <button
            onClick={() => {
              setMensaje('');
              setMetodoModal(true);
            }}
            disabled={lineas.length === 0 || cobrando}
            className="w-full py-3 rounded font-medium text-base bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition disabled:opacity-50"
          >
            {`Cobrar ${formatEUR(total)}`}
          </button>
          {mensaje && (
            <div
              className={`mt-3 p-3 rounded text-sm border ${
                mensaje.startsWith('✓')
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {mensaje}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
        )}
      </div>

      {/* Modal tipo de cobro */}
      {metodoModal && (() => {
        const entregadoNum = parseFloat(entregado) || 0;
        const cambio = entregadoNum - total;
        const efectivoOk = total <= 0 || entregadoNum >= total;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={cerrarModal}
          >
            <div
              className="bg-cartistry-surface rounded-lg border border-cartistry-border w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-cartistry-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(pagoEfectivo || pagoVale) && (
                    <button
                      onClick={() => {
                        if (cobrando) return;
                        setPagoEfectivo(false);
                        setPagoVale(false);
                      }}
                      className="text-cartistry-accent hover:underline text-sm"
                    >
                      ←
                    </button>
                  )}
                  <div>
                    <h2 className="text-lg font-serif font-bold text-cartistry-text">
                      {pagoEfectivo ? 'Cobro en efectivo' : pagoVale ? 'Cobro con vale' : 'Tipo de cobro'}
                    </h2>
                    <p className="text-sm text-cartistry-text-secondary mt-0.5">
                      Total a cobrar:{' '}
                      <span className="font-medium text-cartistry-text">{formatEUR(total)}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={cerrarModal}
                  className="text-cartistry-text-secondary hover:text-cartistry-text text-xl leading-none"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              {!pagoEfectivo && !pagoVale ? (
                <div className="p-6 grid grid-cols-2 gap-3">
                  {METODOS_PAGO.map((m) => {
                    const Icon = m.icon;
                    const onClick =
                      m.key === 'moneda'
                        ? () => setPagoEfectivo(true)
                        : m.key === 'vale'
                          ? () => setPagoVale(true)
                          : () => cobrar(m);
                    return (
                      <button
                        key={m.key}
                        onClick={onClick}
                        disabled={cobrando}
                        className="flex flex-col items-center justify-center gap-2 py-6 rounded border border-cartistry-border text-cartistry-text hover:border-cartistry-accent hover:bg-cartistry-bg transition disabled:opacity-50"
                      >
                        <Icon size={28} className="text-cartistry-accent" />
                        <span className="text-sm font-medium">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : pagoEfectivo ? (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cartistry-text mb-1">
                      Entregado por el cliente (€)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      autoFocus
                      value={entregado}
                      onChange={(e) => setEntregado(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-cartistry-bg border border-cartistry-border rounded text-lg text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                    />
                  </div>

                  {/* Importes rápidos */}
                  <div className="flex flex-wrap gap-2">
                    {[total, 20, 50, 100].map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEntregado((Math.round(v * 100) / 100).toFixed(2))}
                        className="px-3 py-1.5 rounded border border-cartistry-border text-sm text-cartistry-text hover:bg-cartistry-bg transition"
                      >
                        {i === 0 ? 'Exacto' : formatEUR(v)}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between px-4 py-3 rounded bg-cartistry-bg-secondary">
                    <span className="text-sm font-medium text-cartistry-text">Cambio a devolver</span>
                    <span
                      className={`text-xl font-serif font-bold ${
                        cambio < 0 ? 'text-red-600' : 'text-cartistry-text'
                      }`}
                    >
                      {formatEUR(cambio)}
                    </span>
                  </div>

                  {!efectivoOk && (
                    <p className="text-xs text-red-700">
                      El importe entregado es menor que el total.
                    </p>
                  )}

                  <button
                    onClick={() => cobrar({ key: 'moneda', label: 'Moneda' }, { entregado: entregadoNum, cambio })}
                    disabled={cobrando || !efectivoOk}
                    className="w-full py-3 rounded font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition disabled:opacity-50"
                  >
                    {cobrando ? 'Cobrando...' : 'Confirmar cobro'}
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cartistry-text mb-1">
                      Código del vale <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={codigoVale}
                      onChange={(e) => setCodigoVale(e.target.value)}
                      placeholder="Ej. VALE-000123"
                      className="w-full px-4 py-3 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                    />
                    <p className="text-xs text-cartistry-text-secondary mt-1">
                      Obligatorio para cobrar con vale.
                    </p>
                  </div>

                  <button
                    onClick={() => cobrar({ key: 'vale', label: 'Vale' }, undefined, codigoVale.trim())}
                    disabled={cobrando || codigoVale.trim() === ''}
                    className="w-full py-3 rounded font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition disabled:opacity-50"
                  >
                    {cobrando ? 'Cobrando...' : 'Confirmar cobro'}
                  </button>
                </div>
              )}

              {cobrando && !pagoEfectivo && !pagoVale && (
                <p className="px-6 pb-5 text-sm text-cartistry-text-secondary text-center">
                  Registrando cobro...
                </p>
              )}
            </div>
          </div>
        );
      })()}
    </main>
  );
}
