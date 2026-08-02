'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import { MESES_LARGO as MESES } from '@/lib/dates';

interface Store {
  id: string;
  nombre: string;
}
interface Empleado {
  id: string;
  store_id: string | null;
  nombre: string | null;
  apellidos: string | null;
  cargo: string | null;
}

// Colores por cargo (en línea, para no depender del escaneo de Tailwind)
interface Color {
  bg: string;
  text: string;
  border: string;
}
const PALETA_CARGOS: Color[] = [
  { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' }, // azul
  { bg: '#dcfce7', text: '#166534', border: '#4ade80' }, // verde
  { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' }, // morado
  { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' }, // ámbar
  { bg: '#fce7f3', text: '#9d174d', border: '#f472b6' }, // rosa
  { bg: '#ccfbf1', text: '#115e59', border: '#2dd4bf' }, // teal
  { bg: '#ffedd5', text: '#9a3412', border: '#fb923c' }, // naranja
  { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' }, // índigo
];
const COLOR_SIN_CARGO: Color = { bg: '#e8ddd3', text: '#2c1f14', border: '#d4c4b5' };

const estilo = (c: Color) => ({ backgroundColor: c.bg, color: c.text, borderColor: c.border });
interface Shift {
  id: string;
  store_id: string;
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
interface Tarea {
  id: string;
  store_id: string;
  empleado_id: string | null;
  fecha: string;
  descripcion: string;
  hecha: boolean;
}

// getDay(): 0=domingo … 6=sábado. Orden de visualización: lunes primero.
const DIAS_SEMANA = [
  { g: 1, label: 'Lunes', corto: 'Lun' },
  { g: 2, label: 'Martes', corto: 'Mar' },
  { g: 3, label: 'Miércoles', corto: 'Mié' },
  { g: 4, label: 'Jueves', corto: 'Jue' },
  { g: 5, label: 'Viernes', corto: 'Vie' },
  { g: 6, label: 'Sábado', corto: 'Sáb' },
  { g: 0, label: 'Domingo', corto: 'Dom' },
];

const DEF_DIA: DiaConfig = { abierto: false, inicio: '10:00', fin: '20:00' };

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addDays(isoStr: string, n: number) {
  const d = new Date(isoStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
}

function mondayISO(date: Date) {
  const d = new Date(date);
  const off = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - off);
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function HorariosPage() {
  const supabase = createClient();
  const hoy = new Date();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [config, setConfig] = useState<Record<string, DiaConfig>>({});
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [vista, setVista] = useState<'mes' | 'semana'>('mes');
  const [semanaAncla, setSemanaAncla] = useState(() => mondayISO(hoy));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [configAbierta, setConfigAbierta] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [empSel, setEmpSel] = useState('');
  const [inicio, setInicio] = useState('10:00');
  const [fin, setFin] = useState('20:00');
  const [guardandoTurno, setGuardandoTurno] = useState(false);

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [tareaDesc, setTareaDesc] = useState('');
  const [tareaEmp, setTareaEmp] = useState('');
  const [guardandoTarea, setGuardandoTarea] = useState(false);

  const empById = useMemo(() => {
    const m: Record<string, Empleado> = {};
    empleados.forEach((e) => (m[e.id] = e));
    return m;
  }, [empleados]);

  const nombreEmp = (id: string) => {
    const e = empById[id];
    return e ? [e.nombre, e.apellidos].filter(Boolean).join(' ') || 'Empleado' : 'Empleado';
  };

  // Un color por cada cargo distinto
  const coloresCargo = useMemo(() => {
    const distintos = Array.from(
      new Set(empleados.map((e) => e.cargo).filter((c): c is string => !!c))
    ).sort();
    const map: Record<string, Color> = {};
    distintos.forEach((c, i) => (map[c] = PALETA_CARGOS[i % PALETA_CARGOS.length]));
    return map;
  }, [empleados]);

  const colorDe = (empId: string): Color => {
    const cargo = empById[empId]?.cargo;
    return (cargo && coloresCargo[cargo]) || COLOR_SIN_CARGO;
  };

  const empleadosTienda = useMemo(
    () => empleados.filter((e) => e.store_id === storeId),
    [empleados, storeId]
  );

  // Carga inicial: tiendas + empleados
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
        supabase.from('empleados').select('id, store_id, nombre, apellidos, cargo').eq('user_id', userId),
      ]);
      const list = (storesRes.data as Store[]) || [];
      setStores(list);
      setEmpleados((empRes.data as Empleado[]) || []);
      if (list.length > 0) {
        const active = typeof window !== 'undefined' ? localStorage.getItem('current_store_id') : null;
        setStoreId(list.find((s) => s.id === active)?.id || list[0].id);
      } else {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Config de apertura al cambiar de tienda
  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const { data } = await supabase.from('store_horarios').select('dias').eq('store_id', storeId).maybeSingle();
      const dias = (data?.dias as Record<string, DiaConfig>) || {};
      const full: Record<string, DiaConfig> = {};
      DIAS_SEMANA.forEach((d) => {
        full[d.g] = { ...DEF_DIA, ...(dias[d.g] || {}) };
      });
      setConfig(full);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // Rango de días visible según la vista (mes o semana)
  const rango = useMemo(() => {
    if (vista === 'semana') {
      const dias = Array.from({ length: 7 }, (_, i) => addDays(semanaAncla, i));
      return { desde: dias[0], hasta: dias[6], dias };
    }
    const diasMes = new Date(anio, mes + 1, 0).getDate();
    const dias = Array.from({ length: diasMes }, (_, i) => iso(anio, mes, i + 1));
    return { desde: dias[0], hasta: dias[dias.length - 1], dias };
  }, [vista, semanaAncla, anio, mes]);

  // Turnos del rango visible
  useEffect(() => {
    if (!storeId) return;
    cargarShifts(rango.desde, rango.hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, rango.desde, rango.hasta]);

  const cargarShifts = async (desde: string, hasta: string) => {
    setLoading(true);
    setError('');
    const [shiftsRes, tareasRes] = await Promise.all([
      supabase.from('shifts').select('*').eq('store_id', storeId).gte('fecha', desde).lte('fecha', hasta),
      supabase.from('tareas').select('*').eq('store_id', storeId).gte('fecha', desde).lte('fecha', hasta),
    ]);
    if (shiftsRes.error) setError(shiftsRes.error.message);
    else setShifts((shiftsRes.data as Shift[]) || []);
    if (!tareasRes.error) setTareas((tareasRes.data as Tarea[]) || []);
    setLoading(false);
  };

  const tareasDe = (fecha: string) => tareas.filter((t) => t.fecha === fecha);

  const anadirTarea = async () => {
    if (!diaSel || !tareaDesc.trim()) return;
    setGuardandoTarea(true);
    const { error: err } = await supabase.from('tareas').insert({
      store_id: storeId,
      empleado_id: tareaEmp || null,
      fecha: diaSel,
      descripcion: tareaDesc.trim(),
      hecha: false,
    });
    if (err) setError(err.message);
    else {
      setTareaDesc('');
      setTareaEmp('');
      await cargarShifts(rango.desde, rango.hasta);
    }
    setGuardandoTarea(false);
  };

  const toggleTarea = async (t: Tarea) => {
    setTareas((prev) => prev.map((x) => (x.id === t.id ? { ...x, hecha: !x.hecha } : x)));
    await supabase.from('tareas').update({ hecha: !t.hecha }).eq('id', t.id);
  };

  const quitarTarea = async (id: string) => {
    setTareas((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('tareas').delete().eq('id', id);
  };

  const guardarConfig = async () => {
    setGuardandoConfig(true);
    const { error: err } = await supabase
      .from('store_horarios')
      .upsert({ store_id: storeId, dias: config, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
    if (err) setError(err.message);
    setGuardandoConfig(false);
    setConfigAbierta(false);
    cargarShifts(rango.desde, rango.hasta);
  };

  const shiftsDe = (fecha: string) => shifts.filter((s) => s.fecha === fecha);

  const abrirDia = (fecha: string) => {
    setDiaSel(fecha);
    setEmpSel(empleadosTienda[0]?.id || '');
    const cfg = config[new Date(fecha + 'T00:00:00').getDay()];
    setInicio(cfg?.inicio || '10:00');
    setFin(cfg?.fin || '20:00');
    setTareaDesc('');
    setTareaEmp('');
  };

  const asignarTurno = async () => {
    if (!empSel || !diaSel) return;
    setGuardandoTurno(true);
    const { error: err } = await supabase.from('shifts').insert({
      store_id: storeId,
      empleado_id: empSel,
      fecha: diaSel,
      hora_inicio: inicio,
      hora_fin: fin,
    });
    if (err) setError(err.message);
    else await cargarShifts(rango.desde, rango.hasta);
    setGuardandoTurno(false);
  };

  const quitarTurno = async (id: string) => {
    const { error: err } = await supabase.from('shifts').delete().eq('id', id);
    if (err) setError(err.message);
    else setShifts((prev) => prev.filter((s) => s.id !== id));
  };

  // Construir la cuadrícula del mes (lunes primero)
  const semanas = useMemo(() => {
    const primerDia = new Date(anio, mes, 1).getDay(); // 0..6
    const offset = (primerDia + 6) % 7; // lunes = 0
    const diasMes = new Date(anio, mes + 1, 0).getDate();
    const celdas: (number | null)[] = [];
    for (let i = 0; i < offset; i++) celdas.push(null);
    for (let d = 1; d <= diasMes; d++) celdas.push(d);
    while (celdas.length % 7 !== 0) celdas.push(null);
    const filas: (number | null)[][] = [];
    for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7));
    return filas;
  }, [anio, mes]);

  const diasSinCubrir = useMemo(() => {
    let n = 0;
    for (const fecha of rango.dias) {
      const g = new Date(fecha + 'T00:00:00').getDay();
      if (config[g]?.abierto && shiftsDe(fecha).length === 0) n++;
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rango, config, shifts]);

  const cambiarMes = (delta: number) => {
    const nd = new Date(anio, mes + delta, 1);
    setAnio(nd.getFullYear());
    setMes(nd.getMonth());
  };

  const cambiarSemana = (delta: number) => setSemanaAncla((prev) => addDays(prev, delta * 7));

  const labelSemana = () => {
    const ini = new Date(rango.desde + 'T00:00:00');
    const fin = new Date(rango.hasta + 'T00:00:00');
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `${fmt(ini)} – ${fmt(fin)} ${fin.getFullYear()}`;
  };

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">
      <style>{`
        @media print {
          aside { display: none !important; }
          .ml-56 { margin-left: 0 !important; }
          .no-print { display: none !important; }
          main { background: #fff !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-4">
        <PageHeader
          label="Equipo"
          title="Horarios"
          actions={<><div className="flex flex-wrap items-center gap-3 no-print">
            {stores.length > 0 && (
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
            )}
            <div className="flex rounded border border-cartistry-border overflow-hidden">
              <button
                onClick={() => setVista('mes')}
                className={`px-3 py-2 text-sm font-medium transition ${
                  vista === 'mes'
                    ? 'bg-cartistry-cta text-cartistry-cta-text'
                    : 'text-cartistry-accent hover:bg-cartistry-bg'
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setVista('semana')}
                className={`px-3 py-2 text-sm font-medium transition border-l border-cartistry-border ${
                  vista === 'semana'
                    ? 'bg-cartistry-cta text-cartistry-cta-text'
                    : 'text-cartistry-accent hover:bg-cartistry-bg'
                }`}
              >
                Semana
              </button>
            </div>
            <button
              onClick={() => setConfigAbierta((v) => !v)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Horario de apertura
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              🖨️ Imprimir
            </button>
          </div></>}
        />

        {stores.length === 0 && !loading ? (
          <p className="text-cartistry-text-secondary text-sm">No tienes tiendas configuradas todavía.</p>
        ) : (
          <>
            {/* Config de apertura */}
            {configAbierta && (
              <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <h3 className="text-sm font-medium text-cartistry-text mb-3">
                  Horario de apertura de la tienda
                </h3>
                <div className="space-y-2">
                  {DIAS_SEMANA.map((d) => {
                    const c = config[d.g] || DEF_DIA;
                    return (
                      <div key={d.g} className="grid grid-cols-[110px_90px_1fr_1fr] gap-3 items-center">
                        <label className="flex items-center gap-2 text-sm text-cartistry-text">
                          <input
                            type="checkbox"
                            checked={c.abierto}
                            onChange={(e) =>
                              setConfig((prev) => ({ ...prev, [d.g]: { ...c, abierto: e.target.checked } }))
                            }
                            className="accent-cartistry-accent"
                          />
                          {d.label}
                        </label>
                        <span className="text-xs text-cartistry-text-secondary">
                          {c.abierto ? 'Abierto' : 'Cerrado'}
                        </span>
                        <input
                          type="time"
                          value={c.inicio}
                          disabled={!c.abierto}
                          onChange={(e) => setConfig((prev) => ({ ...prev, [d.g]: { ...c, inicio: e.target.value } }))}
                          className="px-2 py-1 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text disabled:opacity-40"
                        />
                        <input
                          type="time"
                          value={c.fin}
                          disabled={!c.abierto}
                          onChange={(e) => setConfig((prev) => ({ ...prev, [d.g]: { ...c, fin: e.target.value } }))}
                          className="px-2 py-1 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text disabled:opacity-40"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={guardarConfig}
                    disabled={guardandoConfig}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {guardandoConfig ? 'Guardando...' : 'Guardar horario'}
                  </button>
                </div>
              </div>
            )}

            {/* Navegación de mes + aviso */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => (vista === 'mes' ? cambiarMes(-1) : cambiarSemana(-1))}
                  className="w-8 h-8 rounded border border-cartistry-border text-cartistry-text hover:bg-cartistry-bg no-print"
                >
                  ‹
                </button>
                <span className="text-lg font-serif font-bold text-cartistry-text min-w-[11rem] text-center">
                  {vista === 'mes' ? `${MESES[mes]} ${anio}` : labelSemana()}
                </span>
                <button
                  onClick={() => (vista === 'mes' ? cambiarMes(1) : cambiarSemana(1))}
                  className="w-8 h-8 rounded border border-cartistry-border text-cartistry-text hover:bg-cartistry-bg no-print"
                >
                  ›
                </button>
              </div>
              {diasSinCubrir > 0 ? (
                <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-red-800 text-sm font-medium">
                  {diasSinCubrir} día{diasSinCubrir > 1 ? 's' : ''} sin cubrir este mes
                </div>
              ) : (
                <div className="px-3 py-2 rounded bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
                  ✓ Todos los días de apertura están cubiertos
                </div>
              )}
            </div>

            {/* Leyenda de colores por cargo */}
            {Object.keys(coloresCargo).length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-cartistry-text-secondary">Cargos:</span>
                {Object.entries(coloresCargo).map(([cargo, c]) => (
                  <span key={cargo} style={estilo(c)} className="px-2 py-0.5 rounded-full border">
                    {cargo}
                  </span>
                ))}
                <span style={estilo(COLOR_SIN_CARGO)} className="px-2 py-0.5 rounded-full border">
                  Sin cargo
                </span>
              </div>
            )}

            {empleadosTienda.length === 0 && (
              <p className="text-xs text-cartistry-text-secondary">
                No hay empleados asignados a esta tienda. Asígnalos en Equipo · Datos para poder planificar.
              </p>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
            )}

            {/* Calendario mensual */}
            {vista === 'mes' && (
            <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
              <div className="grid grid-cols-7 border-b border-cartistry-border">
                {DIAS_SEMANA.map((d) => (
                  <div
                    key={d.g}
                    className="px-2 py-2 text-xs font-medium text-cartistry-text-secondary text-center"
                  >
                    {d.corto}
                  </div>
                ))}
              </div>
              {semanas.map((fila, i) => (
                <div key={i} className="grid grid-cols-7">
                  {fila.map((d, j) => {
                    if (d === null)
                      return <div key={j} className="min-h-[92px] border-b border-r border-cartistry-border/50 bg-cartistry-bg/30" />;
                    const fecha = iso(anio, mes, d);
                    const g = new Date(fecha + 'T00:00:00').getDay();
                    const abierto = config[g]?.abierto;
                    const delDia = shiftsDe(fecha);
                    const sinCubrir = abierto && delDia.length === 0;
                    return (
                      <button
                        key={j}
                        onClick={() => abrirDia(fecha)}
                        className={`min-h-[92px] border-b border-r border-cartistry-border/50 p-1.5 text-left align-top hover:bg-cartistry-bg transition ${
                          sinCubrir ? 'bg-red-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-cartistry-text">{d}</span>
                          {sinCubrir && <span className="text-[10px] text-red-700 font-medium">Sin cubrir</span>}
                          {!abierto && <span className="text-[10px] text-cartistry-text-secondary">Cerrado</span>}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {delDia.slice(0, 3).map((s) => (
                            <div
                              key={s.id}
                              style={estilo(colorDe(s.empleado_id))}
                              className="text-[10px] px-1 py-0.5 rounded border truncate"
                            >
                              {nombreEmp(s.empleado_id)} · {s.hora_inicio}-{s.hora_fin}
                            </div>
                          ))}
                          {delDia.length > 3 && (
                            <div className="text-[10px] text-cartistry-text-secondary">+{delDia.length - 3} más</div>
                          )}
                          {tareasDe(fecha).length > 0 && (
                            <div className="text-[10px] text-cartistry-accent font-medium">
                              ✓ {tareasDe(fecha).length} tarea{tareasDe(fecha).length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            )}

            {/* Vista semanal */}
            {vista === 'semana' && (
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                {rango.dias.map((fecha, idx) => {
                  const dObj = new Date(fecha + 'T00:00:00');
                  const g = dObj.getDay();
                  const abierto = config[g]?.abierto;
                  const delDia = shiftsDe(fecha);
                  const sinCubrir = abierto && delDia.length === 0;
                  return (
                    <button
                      key={fecha}
                      onClick={() => abrirDia(fecha)}
                      className={`min-h-[180px] rounded border p-2 text-left align-top transition hover:bg-cartistry-bg ${
                        sinCubrir
                          ? 'bg-red-50 border-red-200'
                          : 'bg-cartistry-surface border-cartistry-border'
                      }`}
                    >
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs font-medium text-cartistry-text">
                          {DIAS_SEMANA[idx].corto} {dObj.getDate()}
                        </span>
                        {sinCubrir ? (
                          <span className="text-[10px] text-red-700 font-medium">Sin cubrir</span>
                        ) : !abierto ? (
                          <span className="text-[10px] text-cartistry-text-secondary">Cerrado</span>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        {delDia.map((s) => (
                          <div
                            key={s.id}
                            style={estilo(colorDe(s.empleado_id))}
                            className="text-[11px] px-1.5 py-1 rounded border"
                          >
                            <div className="truncate font-medium">{nombreEmp(s.empleado_id)}</div>
                            <div className="opacity-70">
                              {s.hora_inicio}–{s.hora_fin}
                            </div>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de día */}
      {diaSel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setDiaSel(null)}
        >
          <div
            className="bg-cartistry-surface rounded-lg border border-cartistry-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-cartistry-border">
              <h2 className="text-lg font-serif font-bold text-cartistry-text">
                {new Date(diaSel + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h2>
              <button
                onClick={() => setDiaSel(null)}
                className="text-cartistry-text-secondary hover:text-cartistry-text text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Turnos existentes */}
              <div className="space-y-2">
                {shiftsDe(diaSel).length === 0 ? (
                  <p className="text-sm text-cartistry-text-secondary">No hay turnos asignados este día.</p>
                ) : (
                  shiftsDe(diaSel).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-3 py-2 rounded border border-cartistry-border text-sm"
                    >
                      <span className="text-cartistry-text">
                        {nombreEmp(s.empleado_id)}{' '}
                        <span className="text-cartistry-text-secondary">
                          {s.hora_inicio}–{s.hora_fin}
                        </span>
                      </span>
                      <button
                        onClick={() => quitarTurno(s.id)}
                        className="text-xs font-medium text-red-700 hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Asignar turno */}
              <div className="pt-3 border-t border-cartistry-border">
                <p className="text-xs font-medium text-cartistry-text mb-2">Asignar turno</p>
                {empleadosTienda.length === 0 ? (
                  <p className="text-sm text-cartistry-text-secondary">
                    No hay empleados asignados a esta tienda.
                  </p>
                ) : (
                  <div className="grid grid-cols-[1fr_90px_90px_auto] gap-2 items-end">
                    <div>
                      <label className="block text-[11px] text-cartistry-text-secondary mb-1">Empleado</label>
                      <select
                        value={empSel}
                        onChange={(e) => setEmpSel(e.target.value)}
                        className="w-full px-2 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                      >
                        {empleadosTienda.map((e) => (
                          <option key={e.id} value={e.id}>
                            {[e.nombre, e.apellidos].filter(Boolean).join(' ') || 'Empleado'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-cartistry-text-secondary mb-1">Inicio</label>
                      <input
                        type="time"
                        value={inicio}
                        onChange={(e) => setInicio(e.target.value)}
                        className="w-full px-2 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-cartistry-text-secondary mb-1">Fin</label>
                      <input
                        type="time"
                        value={fin}
                        onChange={(e) => setFin(e.target.value)}
                        className="w-full px-2 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text"
                      />
                    </div>
                    <button
                      onClick={asignarTurno}
                      disabled={guardandoTurno}
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {guardandoTurno ? '...' : 'Añadir'}
                    </button>
                  </div>
                )}
              </div>

              {/* Tareas */}
              <div className="pt-3 border-t border-cartistry-border">
                <p className="text-xs font-medium text-cartistry-text mb-2">Tareas del día</p>
                <div className="space-y-1.5 mb-3">
                  {tareasDe(diaSel).length === 0 ? (
                    <p className="text-sm text-cartistry-text-secondary">No hay tareas asignadas.</p>
                  ) : (
                    tareasDe(diaSel).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-2 rounded border border-cartistry-border text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={t.hecha}
                          onChange={() => toggleTarea(t)}
                          className="accent-cartistry-accent"
                        />
                        <span
                          className={`flex-1 ${
                            t.hecha ? 'line-through text-cartistry-text-secondary' : 'text-cartistry-text'
                          }`}
                        >
                          {t.descripcion}
                          {t.empleado_id && (
                            <span className="text-cartistry-text-secondary"> · {nombreEmp(t.empleado_id)}</span>
                          )}
                        </span>
                        <button
                          onClick={() => quitarTarea(t.id)}
                          className="text-xs text-red-700 hover:underline flex-shrink-0"
                        >
                          Quitar
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <label className="block text-[11px] text-cartistry-text-secondary mb-1">Tarea</label>
                    <input
                      type="text"
                      value={tareaDesc}
                      onChange={(e) => setTareaDesc(e.target.value)}
                      placeholder="Descripción de la tarea"
                      className="w-full px-2 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-cartistry-text-secondary mb-1">
                      Asignar a (opcional)
                    </label>
                    <select
                      value={tareaEmp}
                      onChange={(e) => setTareaEmp(e.target.value)}
                      className="w-full px-2 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                    >
                      <option value="">Todos</option>
                      {empleadosTienda.map((e) => (
                        <option key={e.id} value={e.id}>
                          {[e.nombre, e.apellidos].filter(Boolean).join(' ') || 'Empleado'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={anadirTarea}
                    disabled={guardandoTarea || !tareaDesc.trim()}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {guardandoTarea ? '...' : 'Añadir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
