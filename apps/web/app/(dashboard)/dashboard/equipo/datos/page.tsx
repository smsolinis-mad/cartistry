'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { PageHeader } from '@/components/ui';

interface Store {
  id: string;
  nombre: string;
}

interface Empleado {
  id: string;
  store_id: string | null;
  nombre: string | null;
  apellidos: string | null;
  documento_identidad: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  cp: string | null;
  ciudad: string | null;
  pais: string | null;
  cargo: string | null;
  telefono_privado: string | null;
  telefono_empresa: string | null;
  email_privado: string | null;
  email_empresa: string | null;
  num_seguridad_social: string | null;
  num_cuenta_banco: string | null;
  inicio_relacion_laboral: string | null;
  periodo_prueba: string | null;
  tipo_contrato: string | null;
  foto_url: string | null;
}

interface Documento {
  id: string;
  tipo: string;
  nombre: string | null;
  path: string;
  url: string | null;
}

const TIPOS_DOC = [
  { key: 'cv', label: 'CV' },
  { key: 'contrato', label: 'Contrato firmado' },
  { key: 'certificado', label: 'Certificados de cursos' },
  { key: 'nomina', label: 'Nóminas' },
];

const TIPOS_CONTRATO = [
  'Indefinido',
  'Temporal',
  'Prácticas',
  'Formación',
  'Fijo discontinuo',
  'Obra y servicio',
];

const FORM_VACIO = {
  store_id: '',
  nombre: '',
  apellidos: '',
  documento_identidad: '',
  fecha_nacimiento: '',
  direccion: '',
  cp: '',
  ciudad: '',
  pais: 'España',
  cargo: '',
  telefono_privado: '',
  telefono_empresa: '',
  email_privado: '',
  email_empresa: '',
  num_seguridad_social: '',
  num_cuenta_banco: '',
  inicio_relacion_laboral: '',
  periodo_prueba: '',
  tipo_contrato: 'Indefinido',
  foto_url: '',
};

type FormState = typeof FORM_VACIO;

export default function EquipoDatosPage() {
  const supabase = createClient();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [cargos, setCargos] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...FORM_VACIO });
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [subiendoDoc, setSubiendoDoc] = useState<string | null>(null);

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
    const [empRes, storesRes, cargosRes] = await Promise.all([
      supabase.from('empleados').select('*').eq('user_id', userId).order('apellidos', { ascending: true }),
      supabase.from('stores').select('id, nombre').eq('user_id', userId).order('nombre', { ascending: true }),
      supabase.from('cargos').select('id, nombre').eq('user_id', userId).order('nombre', { ascending: true }),
    ]);
    if (empRes.error) setError(empRes.error.message);
    else setEmpleados((empRes.data as Empleado[]) || []);
    setStores((storesRes.data as Store[]) || []);
    setCargos((cargosRes.data as { id: string; nombre: string }[]) || []);
    setLoading(false);
  };

  const storeNombre = (id: string | null) => stores.find((s) => s.id === id)?.nombre || '—';

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm({ ...FORM_VACIO });
    setFormError('');
    setDocumentos([]);
    setModalAbierto(true);
  };

  const abrirEdicion = (e: Empleado) => {
    setEditandoId(e.id);
    setForm({
      store_id: e.store_id || '',
      nombre: e.nombre || '',
      apellidos: e.apellidos || '',
      documento_identidad: e.documento_identidad || '',
      fecha_nacimiento: e.fecha_nacimiento || '',
      direccion: e.direccion || '',
      cp: e.cp || '',
      ciudad: e.ciudad || '',
      pais: e.pais || '',
      cargo: e.cargo || '',
      telefono_privado: e.telefono_privado || '',
      telefono_empresa: e.telefono_empresa || '',
      email_privado: e.email_privado || '',
      email_empresa: e.email_empresa || '',
      num_seguridad_social: e.num_seguridad_social || '',
      num_cuenta_banco: e.num_cuenta_banco || '',
      inicio_relacion_laboral: e.inicio_relacion_laboral || '',
      periodo_prueba: e.periodo_prueba || '',
      tipo_contrato: e.tipo_contrato || 'Indefinido',
      foto_url: e.foto_url || '',
    });
    setFormError('');
    setDocumentos([]);
    cargarDocs(e.id);
    setModalAbierto(true);
  };

  const cargarDocs = async (empleadoId: string) => {
    const { data } = await supabase
      .from('empleado_documentos')
      .select('id, tipo, nombre, path, url')
      .eq('empleado_id', empleadoId)
      .order('created_at', { ascending: false });
    setDocumentos((data as Documento[]) || []);
  };

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_');

  const subirFoto = async (file: File) => {
    setSubiendoFoto(true);
    setFormError('');
    try {
      const path = `fotos/${editandoId || 'nuevo'}-${Date.now()}-${sanitize(file.name)}`;
      const { error: err } = await supabase.storage.from('empleados').upload(path, file, { upsert: true });
      if (err) throw err;
      const { data } = supabase.storage.from('empleados').getPublicUrl(path);
      setForm((prev) => ({ ...prev, foto_url: data.publicUrl }));
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo subir la foto');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const subirDoc = async (tipo: string, file: File) => {
    if (!editandoId) return;
    setSubiendoDoc(tipo);
    setFormError('');
    try {
      const path = `docs/${editandoId}/${tipo}/${Date.now()}-${sanitize(file.name)}`;
      const { error: upErr } = await supabase.storage.from('empleados').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('empleados').getPublicUrl(path);
      const { error: insErr } = await supabase.from('empleado_documentos').insert({
        empleado_id: editandoId,
        user_id: getUserId(),
        tipo,
        nombre: file.name,
        path,
        url: data.publicUrl,
      });
      if (insErr) throw insErr;
      await cargarDocs(editandoId);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo subir el documento');
    } finally {
      setSubiendoDoc(null);
    }
  };

  const eliminarDoc = async (doc: Documento) => {
    await supabase.storage.from('empleados').remove([doc.path]);
    await supabase.from('empleado_documentos').delete().eq('id', doc.id);
    setDocumentos((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const set = (campo: keyof FormState, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async () => {
    setFormError('');
    if (!form.nombre.trim() && !form.apellidos.trim()) {
      setFormError('Indica al menos el nombre o los apellidos.');
      return;
    }
    setGuardando(true);
    try {
      const userId = getUserId();
      const row = {
        user_id: userId,
        store_id: form.store_id || null,
        nombre: form.nombre.trim() || null,
        apellidos: form.apellidos.trim() || null,
        documento_identidad: form.documento_identidad.trim() || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        direccion: form.direccion.trim() || null,
        cp: form.cp.trim() || null,
        ciudad: form.ciudad.trim() || null,
        pais: form.pais.trim() || null,
        cargo: form.cargo.trim() || null,
        telefono_privado: form.telefono_privado.trim() || null,
        telefono_empresa: form.telefono_empresa.trim() || null,
        email_privado: form.email_privado.trim() || null,
        email_empresa: form.email_empresa.trim() || null,
        num_seguridad_social: form.num_seguridad_social.trim() || null,
        num_cuenta_banco: form.num_cuenta_banco.trim() || null,
        inicio_relacion_laboral: form.inicio_relacion_laboral || null,
        periodo_prueba: form.periodo_prueba.trim() || null,
        tipo_contrato: form.tipo_contrato || null,
        foto_url: form.foto_url || null,
        updated_at: new Date().toISOString(),
      };
      const { error: err } = editandoId
        ? await supabase.from('empleados').update(row).eq('id', editandoId)
        : await supabase.from('empleados').insert(row);
      if (err) throw err;
      setModalAbierto(false);
      await cargar();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo guardar el empleado');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!editandoId) return;
    if (!confirm('¿Eliminar este empleado?')) return;
    setGuardando(true);
    const { error: err } = await supabase.from('empleados').delete().eq('id', editandoId);
    if (err) setFormError(err.message);
    else {
      setModalAbierto(false);
      await cargar();
    }
    setGuardando(false);
  };

  const input = (campo: keyof FormState, label: string, placeholder = '', type = 'text') => (
    <div>
      <label className="block text-xs font-medium text-cartistry-text mb-1">{label}</label>
      <input
        type={type}
        value={form[campo]}
        onChange={(e) => set(campo, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
      />
    </div>
  );

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-6xl mx-auto space-y-4">
        <PageHeader
          label="Equipo"
          title="Datos"
          actions={<><button
            onClick={abrirNuevo}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            + Añadir empleado
          </button></>}
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
        )}

        <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr_0.9fr_70px] gap-4 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
            <span>Nombre y apellidos</span>
            <span>Cargo</span>
            <span>Tienda</span>
            <span>Documento</span>
            <span>Email empresa</span>
            <span>Contrato</span>
            <span />
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-cartistry-text-secondary">Cargando...</div>
          ) : empleados.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-cartistry-text-secondary">
              No hay empleados registrados. Pulsa «Añadir empleado».
            </div>
          ) : (
            empleados.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr_0.9fr_70px] gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 last:border-b-0 text-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-full overflow-hidden bg-cartistry-bg-secondary flex items-center justify-center flex-shrink-0 text-xs text-cartistry-text-secondary">
                    {e.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (e.nombre || e.apellidos || '?').charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="text-cartistry-text font-medium truncate">
                    {[e.nombre, e.apellidos].filter(Boolean).join(' ') || '—'}
                  </span>
                </span>
                <span className="text-cartistry-text-secondary truncate">{e.cargo || '—'}</span>
                <span className="text-cartistry-text-secondary truncate">{storeNombre(e.store_id)}</span>
                <span className="text-cartistry-text-secondary font-mono text-xs">
                  {e.documento_identidad || '—'}
                </span>
                <span className="text-cartistry-text-secondary truncate">{e.email_empresa || '—'}</span>
                <span className="text-cartistry-text-secondary">{e.tipo_contrato || '—'}</span>
                <button
                  onClick={() => abrirEdicion(e)}
                  className="text-xs font-medium text-cartistry-accent hover:underline text-right"
                >
                  Editar
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal alta/edición */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => !guardando && setModalAbierto(false)}
        >
          <div
            className="bg-cartistry-surface rounded-lg border border-cartistry-border w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-cartistry-border">
              <h2 className="text-lg font-serif font-bold text-cartistry-text">
                {editandoId ? 'Editar empleado' : 'Nuevo empleado'}
              </h2>
              <button
                onClick={() => !guardando && setModalAbierto(false)}
                className="text-cartistry-text-secondary hover:text-cartistry-text text-xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Foto */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-cartistry-bg-secondary flex items-center justify-center flex-shrink-0">
                  {form.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-cartistry-text-secondary">
                      {(form.nombre || form.apellidos || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none">
                    {subiendoFoto ? 'Subiendo...' : form.foto_url ? 'Cambiar foto' : 'Subir foto'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={subiendoFoto}
                      onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])}
                    />
                  </label>
                  {form.foto_url && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, foto_url: '' }))}
                      className="ml-2 text-xs text-red-700 hover:underline"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              {/* Datos personales */}
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-3">
                  Datos personales
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {input('nombre', 'Nombre', 'Nombre')}
                  {input('apellidos', 'Apellidos', 'Apellidos')}
                  {input('documento_identidad', 'Documento de identidad', 'DNI / NIE / Pasaporte')}
                  {input('fecha_nacimiento', 'Fecha de nacimiento', '', 'date')}
                  <div>
                    <label className="block text-xs font-medium text-cartistry-text mb-1">Cargo</label>
                    <select
                      value={form.cargo}
                      onChange={(e) => set('cargo', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                    >
                      <option value="">— Sin cargo —</option>
                      {cargos.map((c) => (
                        <option key={c.id} value={c.nombre}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    {cargos.length === 0 && (
                      <p className="text-[11px] text-cartistry-text-secondary mt-1">
                        Crea cargos en Equipo · Cargos para poder asignarlos.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dirección */}
              <div className="pt-2 border-t border-cartistry-border">
                <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-3 mt-3">
                  Dirección
                </p>
                <div className="space-y-4">
                  {input('direccion', 'Dirección', 'Calle y número')}
                  <div className="grid sm:grid-cols-3 gap-4">
                    {input('cp', 'Código postal', '28013')}
                    {input('ciudad', 'Ciudad', 'Madrid')}
                    {input('pais', 'País', 'España')}
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div className="pt-2 border-t border-cartistry-border">
                <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-3 mt-3">
                  Contacto
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {input('telefono_privado', 'Teléfono privado', '+34 600 000 000', 'tel')}
                  {input('telefono_empresa', 'Teléfono de empresa', '+34 600 000 000', 'tel')}
                  {input('email_privado', 'Email privado', 'personal@email.com', 'email')}
                  {input('email_empresa', 'Email de empresa', 'nombre@empresa.com', 'email')}
                </div>
              </div>

              {/* Datos laborales */}
              <div className="pt-2 border-t border-cartistry-border">
                <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-3 mt-3">
                  Datos laborales
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-cartistry-text mb-1">
                      Tienda asignada
                    </label>
                    <select
                      value={form.store_id}
                      onChange={(e) => set('store_id', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                    >
                      <option value="">— Sin asignar —</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  {input('num_seguridad_social', 'Nº Seguridad Social', '281234567890')}
                  {input('num_cuenta_banco', 'Nº cuenta bancaria (IBAN)', 'ES00 0000 0000 0000 0000 0000')}
                  {input('inicio_relacion_laboral', 'Inicio relación laboral', '', 'date')}
                  {input('periodo_prueba', 'Periodo de prueba', 'Ej. 2 meses')}
                  <div>
                    <label className="block text-xs font-medium text-cartistry-text mb-1">
                      Tipo de contrato
                    </label>
                    <select
                      value={form.tipo_contrato}
                      onChange={(e) => set('tipo_contrato', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                    >
                      {TIPOS_CONTRATO.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Documentos */}
              <div className="pt-2 border-t border-cartistry-border">
                <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-3 mt-3">
                  Documentación
                </p>
                {!editandoId ? (
                  <p className="text-sm text-cartistry-text-secondary">
                    Crea el empleado primero (Crear empleado) y luego edítalo para adjuntar documentos.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {TIPOS_DOC.map((t) => {
                      const docs = documentos.filter((d) => d.tipo === t.key);
                      return (
                        <div key={t.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-cartistry-text">{t.label}</span>
                            <label className="text-xs font-medium text-cartistry-accent hover:underline cursor-pointer">
                              {subiendoDoc === t.key ? 'Subiendo...' : '+ Adjuntar'}
                              <input
                                type="file"
                                className="hidden"
                                disabled={subiendoDoc === t.key}
                                onChange={(e) => e.target.files?.[0] && subirDoc(t.key, e.target.files[0])}
                              />
                            </label>
                          </div>
                          {docs.length === 0 ? (
                            <p className="text-xs text-cartistry-text-secondary">Sin archivos.</p>
                          ) : (
                            <ul className="space-y-1">
                              {docs.map((d) => (
                                <li
                                  key={d.id}
                                  className="flex items-center justify-between gap-2 px-3 py-1.5 rounded border border-cartistry-border text-sm"
                                >
                                  <a
                                    href={d.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cartistry-accent hover:underline truncate"
                                  >
                                    {d.nombre || 'Archivo'}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => eliminarDoc(d)}
                                    className="text-xs text-red-700 hover:underline flex-shrink-0"
                                  >
                                    Eliminar
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-cartistry-border">
              <div>
                {editandoId && (
                  <button
                    onClick={eliminar}
                    disabled={guardando}
                    className="px-4 py-2 rounded text-sm font-medium text-red-700 hover:bg-red-50 transition disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setModalAbierto(false)}
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
                  {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear empleado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
