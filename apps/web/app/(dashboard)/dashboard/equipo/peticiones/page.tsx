'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { PageHeader } from '@/components/ui';

interface Empleado {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  foto_url?: string | null;
}
interface Peticion {
  id: string;
  empleado_id: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
  estado: string;
  created_at: string;
}

const TIPOS: Record<string, string> = {
  vacaciones: 'Vacaciones',
  dia_libre: 'Día libre',
};
const ESTADOS: Record<string, { label: string; cls: string; dot: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  aprobada: { label: 'Aprobada', cls: 'bg-green-100 text-green-800', dot: 'bg-green-600' },
  rechazada: { label: 'Rechazada', cls: 'bg-red-100 text-red-800', dot: 'bg-red-600' },
};

function fmtFecha(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
function dias(ini: string, fin: string) {
  const a = new Date(ini + 'T00:00:00').getTime();
  const b = new Date(fin + 'T00:00:00').getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PeticionesPage() {
  const supabase = createClient();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEmpleado, setFiltroEmpleado] = useState('');

  const [modal, setModal] = useState(false);
  const [fEmp, setFEmp] = useState('');
  const [fTipo, setFTipo] = useState('vacaciones');
  const [fIni, setFIni] = useState(hoyISO());
  const [fFin, setFFin] = useState(hoyISO());
  const [fMotivo, setFMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const empById = useMemo(() => {
    const m: Record<string, Empleado> = {};
    empleados.forEach((e) => (m[e.id] = e));
    return m;
  }, [empleados]);
  const nombreEmp = (id: string) => {
    const e = empById[id];
    return e ? [e.nombre, e.apellidos].filter(Boolean).join(' ') || 'Empleado' : 'Empleado';
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargar = async () => {
    setLoading(true);
    setError('');
    const userId = getUserId();
    if (!userId) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }
    const [empRes, petRes] = await Promise.all([
      supabase.from('empleados').select('id, nombre, apellidos, foto_url').eq('user_id', userId),
      supabase.from('peticiones').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);
    setEmpleados((empRes.data as Empleado[]) || []);
    if (petRes.error) setError(petRes.error.message);
    else setPeticiones((petRes.data as Peticion[]) || []);
    setLoading(false);
  };

  const filtradas = useMemo(
    () =>
      peticiones.filter(
        (p) =>
          (!filtroEstado || p.estado === filtroEstado) &&
          (!filtroEmpleado || p.empleado_id === filtroEmpleado)
      ),
    [peticiones, filtroEstado, filtroEmpleado]
  );

  const pendientes = peticiones.filter((p) => p.estado === 'pendiente').length;

  const resolver = async (p: Peticion, estado: 'aprobada' | 'rechazada') => {
    setPeticiones((prev) => prev.map((x) => (x.id === p.id ? { ...x, estado } : x)));
    const { error: err } = await supabase
      .from('peticiones')
      .update({ estado, resuelta_at: new Date().toISOString() })
      .eq('id', p.id);
    if (err) {
      setError(err.message);
      cargar();
    }
  };

  const crear = async () => {
    if (!fEmp) {
      setError('Selecciona un empleado');
      return;
    }
    setGuardando(true);
    setError('');
    const { error: err } = await supabase.from('peticiones').insert({
      user_id: getUserId(),
      empleado_id: fEmp,
      tipo: fTipo,
      fecha_inicio: fIni,
      fecha_fin: fFin < fIni ? fIni : fFin,
      motivo: fMotivo.trim() || null,
      estado: 'pendiente',
    });
    if (err) setError(err.message);
    else {
      setModal(false);
      setFEmp('');
      setFMotivo('');
      setFTipo('vacaciones');
      setFIni(hoyISO());
      setFFin(hoyISO());
      await cargar();
    }
    setGuardando(false);
  };

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-5xl mx-auto space-y-5">
        <PageHeader
          label="Equipo"
          title="Peticiones"
          actions={<><button
            onClick={() => setModal(true)}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            + Nueva petición
          </button></>}
        />

        {/* Filtros + resumen */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 bg-cartistry-surface border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="aprobada">Aprobadas</option>
              <option value="rechazada">Rechazadas</option>
            </select>
            <select
              value={filtroEmpleado}
              onChange={(e) => setFiltroEmpleado(e.target.value)}
              className="px-3 py-2 bg-cartistry-surface border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
            >
              <option value="">Todos los empleados</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {[e.nombre, e.apellidos].filter(Boolean).join(' ') || 'Empleado'}
                </option>
              ))}
            </select>
          </div>
          {pendientes > 0 && (
            <span className="px-3 py-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
              {pendientes} pendiente{pendientes > 1 ? 's' : ''} de revisar
            </span>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
        )}

        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando...</p>
        ) : filtradas.length === 0 ? (
          <div className="bg-cartistry-surface border border-cartistry-border rounded p-10 text-center">
            <p className="text-cartistry-text-secondary text-sm">No hay peticiones que mostrar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map((p) => {
              const est = ESTADOS[p.estado] || ESTADOS.pendiente;
              const emp = empById[p.empleado_id];
              return (
                <div
                  key={p.id}
                  className="bg-cartistry-surface border border-cartistry-border rounded p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full overflow-hidden bg-cartistry-bg-secondary flex items-center justify-center flex-shrink-0 text-sm text-cartistry-text-secondary">
                      {emp?.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={emp.foto_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        nombreEmp(p.empleado_id).charAt(0).toUpperCase()
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-cartistry-text truncate">{nombreEmp(p.empleado_id)}</p>
                      <p className="text-sm text-cartistry-text-secondary">
                        {TIPOS[p.tipo] || p.tipo} · {fmtFecha(p.fecha_inicio)}
                        {p.fecha_fin !== p.fecha_inicio && ` – ${fmtFecha(p.fecha_fin)}`}{' '}
                        <span className="text-cartistry-text-secondary">({dias(p.fecha_inicio, p.fecha_fin)} día{dias(p.fecha_inicio, p.fecha_fin) > 1 ? 's' : ''})</span>
                      </p>
                      {p.motivo && <p className="text-xs text-cartistry-text-secondary mt-0.5 truncate">{p.motivo}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${est.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
                      {est.label}
                    </span>
                    {p.estado === 'pendiente' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolver(p, 'aprobada')}
                          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => resolver(p, 'rechazada')}
                          className="px-3 py-1.5 rounded text-xs font-medium border border-red-300 text-red-700 hover:bg-red-50 transition"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nueva petición */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => !guardando && setModal(false)}
        >
          <div
            className="bg-cartistry-surface rounded-lg border border-cartistry-border w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-cartistry-border">
              <h2 className="text-lg font-serif font-bold text-cartistry-text">Nueva petición</h2>
              <button
                onClick={() => !guardando && setModal(false)}
                className="text-cartistry-text-secondary hover:text-cartistry-text text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">Empleado</label>
                  <select
                    value={fEmp}
                    onChange={(e) => setFEmp(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  >
                    <option value="">Selecciona…</option>
                    {empleados.map((e) => (
                      <option key={e.id} value={e.id}>
                        {[e.nombre, e.apellidos].filter(Boolean).join(' ') || 'Empleado'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">Tipo</label>
                  <select
                    value={fTipo}
                    onChange={(e) => setFTipo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  >
                    <option value="vacaciones">Vacaciones</option>
                    <option value="dia_libre">Día libre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">Desde</label>
                  <input
                    type="date"
                    value={fIni}
                    onChange={(e) => setFIni(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">Hasta</label>
                  <input
                    type="date"
                    value={fFin}
                    onChange={(e) => setFFin(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-cartistry-text mb-1">Motivo (opcional)</label>
                <input
                  type="text"
                  value={fMotivo}
                  onChange={(e) => setFMotivo(e.target.value)}
                  placeholder="Motivo de la petición"
                  className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-cartistry-border">
              <button
                onClick={() => setModal(false)}
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Cancelar
              </button>
              <button
                onClick={crear}
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {guardando ? 'Guardando...' : 'Crear petición'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
