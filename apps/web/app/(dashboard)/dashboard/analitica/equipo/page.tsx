'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';

interface Store {
  id: string;
  nombre: string;
}
interface Empleado {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  cargo: string | null;
}
interface Sale {
  empleado_id: string | null;
  numero_ticket: string | null;
  unidades_vendidas: number | null;
  pvp: number | null;
  metodo_pago: string | null;
  fecha: string;
}
interface Shift {
  empleado_id: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
}
interface DiaConfig {
  abierto: boolean;
  inicio: string;
  fin: string;
}

const METODOS = ['moneda', 'tarjeta', 'vale', 'transferencia'];

function eur(n: number) {
  return `€${(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function minutos(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}
function horas(min: number) {
  return (min / 60).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
// Minutos de apertura cubiertos por al menos una persona (unión de turnos ∩ apertura)
function cubiertos(oi: number, of: number, turnos: [number, number][]): number {
  const clipped = turnos
    .map(([a, b]) => [Math.max(a, oi), Math.min(b, of)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let total = 0;
  let curIni = -1;
  let curFin = -1;
  for (const [a, b] of clipped) {
    if (a > curFin) {
      if (curFin > curIni) total += curFin - curIni;
      curIni = a;
      curFin = b;
    } else {
      curFin = Math.max(curFin, b);
    }
  }
  if (curFin > curIni) total += curFin - curIni;
  return total;
}

export default function AnaliticaEquipoPage() {
  const supabase = createClient();
  const hoy = new Date();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [config, setConfig] = useState<Record<string, DiaConfig>>({});
  const [desde, setDesde] = useState(iso(hoy.getFullYear(), hoy.getMonth(), 1));
  const [hasta, setHasta] = useState(iso(hoy.getFullYear(), hoy.getMonth(), new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()));
  const [metodo, setMetodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const empById = useMemo(() => {
    const m: Record<string, Empleado> = {};
    empleados.forEach((e) => (m[e.id] = e));
    return m;
  }, [empleados]);
  const nombreEmp = (id: string | null) => {
    if (!id) return 'Sin asignar';
    const e = empById[id];
    return e ? [e.nombre, e.apellidos].filter(Boolean).join(' ') || 'Empleado' : 'Empleado';
  };

  useEffect(() => {
    (async () => {
      const userId = getUserId();
      if (!userId) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }
      const [storesRes, empRes] = await Promise.all([
        supabase.from('stores').select('id, nombre').eq('user_id', userId).order('nombre'),
        supabase.from('empleados').select('id, nombre, apellidos, cargo').eq('user_id', userId),
      ]);
      const list = (storesRes.data as Store[]) || [];
      setStores(list);
      setEmpleados((empRes.data as Empleado[]) || []);
      if (list.length > 0) {
        const active = typeof window !== 'undefined' ? localStorage.getItem('current_store_id') : null;
        setStoreId(list.find((s) => s.id === active)?.id || list[0].id);
      } else setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!storeId) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, desde, hasta]);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const [salesRes, shiftsRes, horRes] = await Promise.all([
        supabase
          .from('sales')
          .select('empleado_id, numero_ticket, unidades_vendidas, pvp, metodo_pago, fecha')
          .eq('store_id', storeId)
          .gte('fecha', desde)
          .lte('fecha', hasta),
        supabase.from('shifts').select('empleado_id, fecha, hora_inicio, hora_fin').eq('store_id', storeId).gte('fecha', desde).lte('fecha', hasta),
        supabase.from('store_horarios').select('dias').eq('store_id', storeId).maybeSingle(),
      ]);
      if (salesRes.error) throw salesRes.error;
      setSales((salesRes.data as Sale[]) || []);
      setShifts((shiftsRes.data as Shift[]) || []);
      setConfig((horRes.data?.dias as Record<string, DiaConfig>) || {});
    } catch (err: any) {
      setError(err?.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  // Tabla 1: ventas por usuario
  const ventasPorUsuario = useMemo(() => {
    const filtradas = sales.filter((s) => !metodo || s.metodo_pago === metodo);
    const map: Record<string, { importe: number; unidades: number; tickets: Set<string> }> = {};
    for (const s of filtradas) {
      const k = s.empleado_id || '__none__';
      if (!map[k]) map[k] = { importe: 0, unidades: 0, tickets: new Set() };
      map[k].importe += (Number(s.pvp) || 0) * (Number(s.unidades_vendidas) || 0);
      map[k].unidades += Number(s.unidades_vendidas) || 0;
      if (s.numero_ticket) map[k].tickets.add(s.numero_ticket);
    }
    return Object.entries(map)
      .map(([k, v]) => ({
        id: k === '__none__' ? null : k,
        nombre: nombreEmp(k === '__none__' ? null : k),
        cargo: k === '__none__' ? '' : empById[k]?.cargo || '',
        importe: v.importe,
        unidades: v.unidades,
        tickets: v.tickets.size,
      }))
      .sort((a, b) => b.importe - a.importe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, metodo, empById]);

  const totalVentas = ventasPorUsuario.reduce((s, r) => s + r.importe, 0);

  // Tabla 2: apertura vs cubiertas + personas por día
  const cobertura = useMemo(() => {
    const dIni = new Date(desde + 'T00:00:00');
    const dFin = new Date(hasta + 'T00:00:00');
    const filas: {
      fecha: string;
      apertura: string;
      horasApertura: number;
      horasCubiertas: number;
      personas: number;
    }[] = [];
    for (let d = new Date(dIni); d <= dFin; d.setDate(d.getDate() + 1)) {
      const fecha = iso(d.getFullYear(), d.getMonth(), d.getDate());
      const g = d.getDay();
      const cfg = config[g];
      if (!cfg?.abierto) continue;
      const oi = minutos(cfg.inicio) ?? 0;
      const of = minutos(cfg.fin) ?? 0;
      const turnosDia = shifts.filter((s) => s.fecha === fecha);
      const intervalos: [number, number][] = turnosDia
        .map((s) => [minutos(s.hora_inicio) ?? oi, minutos(s.hora_fin) ?? of] as [number, number])
        .filter(([a, b]) => b > a);
      const cub = cubiertos(oi, of, intervalos);
      const personas = new Set(turnosDia.map((s) => s.empleado_id)).size;
      filas.push({
        fecha,
        apertura: `${cfg.inicio}–${cfg.fin}`,
        horasApertura: of - oi,
        horasCubiertas: cub,
        personas,
      });
    }
    return filas;
  }, [desde, hasta, config, shifts]);

  const totApertura = cobertura.reduce((s, r) => s + r.horasApertura, 0);
  const totCubiertas = cobertura.reduce((s, r) => s + r.horasCubiertas, 0);
  const mediaPersonas =
    cobertura.length > 0 ? cobertura.reduce((s, r) => s + r.personas, 0) / cobertura.length : 0;

  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/dashboard/analitica" className="text-cartistry-accent hover:underline text-sm">
            ← Volver
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">Analítica · Equipo</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-4 bg-cartistry-surface border border-cartistry-border rounded p-4">
          {stores.length > 0 && (
            <div>
              <label className="block text-xs text-cartistry-text-secondary mb-1">Tienda</label>
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
            </div>
          )}
          <div>
            <label className="block text-xs text-cartistry-text-secondary mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-cartistry-text-secondary mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-cartistry-text-secondary mb-1">Método de pago</label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent capitalize"
            >
              <option value="">Todos</option>
              {METODOS.map((m) => (
                <option key={m} value={m} className="capitalize">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
        )}

        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando...</p>
        ) : (
          <>
            {/* Tabla 1: ventas por usuario */}
            <section>
              <h2 className="text-lg font-serif font-bold text-cartistry-text mb-3">Ventas por usuario</h2>
              <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
                <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_1fr] gap-4 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
                  <span>Usuario</span>
                  <span>Cargo</span>
                  <span className="text-right">Tickets</span>
                  <span className="text-right">Unidades</span>
                  <span className="text-right">Importe</span>
                </div>
                {ventasPorUsuario.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-cartistry-text-secondary">
                    No hay ventas en este periodo.
                  </div>
                ) : (
                  ventasPorUsuario.map((r) => (
                    <div
                      key={r.id || 'none'}
                      className="grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_1fr] gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 last:border-b-0 text-sm"
                    >
                      <span className="text-cartistry-text font-medium">{r.nombre}</span>
                      <span className="text-cartistry-text-secondary">{r.cargo || '—'}</span>
                      <span className="text-right text-cartistry-text">{r.tickets}</span>
                      <span className="text-right text-cartistry-text">{r.unidades}</span>
                      <span className="text-right text-cartistry-text font-medium">{eur(r.importe)}</span>
                    </div>
                  ))
                )}
                {ventasPorUsuario.length > 0 && (
                  <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_1fr] gap-4 px-4 py-3 items-center bg-cartistry-bg-secondary text-sm font-medium">
                    <span className="text-cartistry-text">Total</span>
                    <span />
                    <span />
                    <span />
                    <span className="text-right text-cartistry-text">{eur(totalVentas)}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Tabla 2: apertura vs cubiertas */}
            <section>
              <h2 className="text-lg font-serif font-bold text-cartistry-text mb-3">
                Horas de apertura vs. cubiertas
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                  <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-1">
                    Horas apertura
                  </p>
                  <p className="text-xl font-serif font-bold text-cartistry-text">{horas(totApertura)} h</p>
                </div>
                <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                  <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-1">
                    Horas cubiertas
                  </p>
                  <p className="text-xl font-serif font-bold text-cartistry-text">
                    {horas(totCubiertas)} h
                    <span className="text-sm text-cartistry-text-secondary ml-2">
                      {totApertura > 0 ? Math.round((totCubiertas / totApertura) * 100) : 0}%
                    </span>
                  </p>
                </div>
                <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                  <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-1">
                    Personas por turno (media)
                  </p>
                  <p className="text-xl font-serif font-bold text-cartistry-text">{mediaPersonas.toFixed(1)}</p>
                </div>
              </div>

              <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-4 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
                  <span>Fecha</span>
                  <span>Apertura</span>
                  <span className="text-right">H. apertura</span>
                  <span className="text-right">H. cubiertas</span>
                  <span className="text-right">Cobertura</span>
                  <span className="text-right">Personas</span>
                </div>
                {cobertura.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-cartistry-text-secondary">
                    No hay días de apertura configurados en este periodo. Define el horario en Equipo · Horarios.
                  </div>
                ) : (
                  cobertura.map((r) => {
                    const pct = r.horasApertura > 0 ? Math.round((r.horasCubiertas / r.horasApertura) * 100) : 0;
                    return (
                      <div
                        key={r.fecha}
                        className="grid grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-4 px-4 py-2.5 items-center border-b border-cartistry-border/50 last:border-b-0 text-sm"
                      >
                        <span className="text-cartistry-text-secondary">{r.fecha}</span>
                        <span className="text-cartistry-text-secondary">{r.apertura}</span>
                        <span className="text-right text-cartistry-text">{horas(r.horasApertura)} h</span>
                        <span className="text-right text-cartistry-text">{horas(r.horasCubiertas)} h</span>
                        <span
                          className={`text-right font-medium ${
                            pct >= 100 ? 'text-green-700' : pct === 0 ? 'text-red-700' : 'text-amber-700'
                          }`}
                        >
                          {pct}%
                        </span>
                        <span className="text-right text-cartistry-text">{r.personas}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
