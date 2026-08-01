'use client';

import { useEffect, useState } from 'react';
import { v5 as uuidv5 } from 'uuid';
import { createClient } from '@/lib/supabase/client';
import { PLANES, type PlanKey, planInfo } from '@/lib/admin';
import { loadBrands, tiendasDe, importeDe, formatEUR, type Brand } from '@/lib/admin-data';
import { MetricCard } from '@/components/admin/AdminSidebar';

// Mismo namespace que el login de marcas, para que el user_id sea consistente
// si esa marca luego inicia sesión con el mismo email.
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const FORM_VACIO = {
  email: '',
  nombre_empresa: '',
  cif: '',
  direccion_facturacion: '',
  codigo_postal: '',
  ciudad: '',
  provincia: '',
  pais: 'España',
  plan: 'estandar' as PlanKey,
  telefono_general: '',
  fact_nombre: '',
  fact_apellido: '',
  fact_cargo: '',
  fact_movil: '',
  fact_email: '',
};

export default function EmpresasPage() {
  const supabase = createClient();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ ...FORM_VACIO });
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { brands, storeCounts } = await loadBrands();
        setBrands(brands);
        setStoreCounts(storeCounts);
      } catch (err: any) {
        setError(err?.message || 'Error cargando empresas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cambiarPlan = async (b: Brand, plan: PlanKey) => {
    setBrands((prev) => prev.map((x) => (x.id === b.id ? { ...x, plan } : x)));
    const { error: err } = await supabase.from('company_settings').update({ plan }).eq('id', b.id);
    if (err) setError(`No se pudo cambiar el plan: ${err.message}`);
  };

  const abrirModal = () => {
    setForm({ ...FORM_VACIO });
    setFormError('');
    setModalAbierto(true);
  };

  const setCampo = (campo: keyof typeof FORM_VACIO, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const crearCliente = async () => {
    setFormError('');
    if (!form.email.trim()) {
      setFormError('El email es obligatorio (identifica a la marca para facturar).');
      return;
    }
    if (!form.nombre_empresa.trim()) {
      setFormError('El nombre de la empresa es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const user_id = uuidv5(form.email.trim().toLowerCase(), UUID_NAMESPACE);
      const row = {
        user_id,
        nombre_empresa: form.nombre_empresa.trim(),
        cif: form.cif.trim() || null,
        direccion_facturacion: form.direccion_facturacion.trim() || null,
        codigo_postal: form.codigo_postal.trim() || null,
        ciudad: form.ciudad.trim() || null,
        provincia: form.provincia.trim() || null,
        pais: form.pais.trim() || null,
        plan: form.plan,
        telefono_general: form.telefono_general.trim() || null,
        fact_nombre: form.fact_nombre.trim() || null,
        fact_apellido: form.fact_apellido.trim() || null,
        fact_cargo: form.fact_cargo.trim() || null,
        fact_movil: form.fact_movil.trim() || null,
        fact_email: form.fact_email.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error: err } = await supabase
        .from('company_settings')
        .upsert(row, { onConflict: 'user_id' });
      if (err) throw err;

      const { brands, storeCounts } = await loadBrands();
      setBrands(brands);
      setStoreCounts(storeCounts);
      setModalAbierto(false);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear el cliente');
    } finally {
      setGuardando(false);
    }
  };

  const mrr = brands.reduce((s, b) => s + importeDe(b, storeCounts), 0);

  return (
    <main>
      <header className="bg-cartistry-surface border-b border-cartistry-border px-8 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-cartistry-text">Empresas</h1>
          <p className="text-sm text-cartistry-text-secondary mt-1">
            Marcas registradas, sus datos fiscales y el plan contratado.
          </p>
        </div>
        <button
          onClick={abrirModal}
          className="px-4 py-2 rounded text-sm font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition"
        >
          + Crear cliente
        </button>
      </header>

      <div className="px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label="Marcas" value={String(brands.length)} />
          <MetricCard label="Facturación potencial / mes" value={formatEUR(mrr)} />
          <MetricCard
            label="Tiendas totales"
            value={String(Object.values(storeCounts).reduce((s, n) => s + n, 0))}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
        )}

        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando empresas...</p>
        ) : brands.length === 0 ? (
          <div className="bg-cartistry-surface border border-cartistry-border rounded p-8 text-center">
            <p className="text-cartistry-text-secondary text-sm">
              No hay marcas con datos fiscales registrados todavía.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {brands.map((b) => {
              const tiendas = tiendasDe(b, storeCounts);
              const info = planInfo(b.plan);
              return (
                <div key={b.id} className="bg-cartistry-surface border border-cartistry-border rounded p-5">
                  <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
                    <div>
                      <h3 className="font-serif font-bold text-cartistry-text text-lg">
                        {b.nombre_empresa || 'Marca sin nombre'}
                      </h3>
                      <dl className="mt-2 space-y-1 text-sm">
                        <div className="flex gap-2">
                          <dt className="text-cartistry-text-secondary w-20 shrink-0">CIF</dt>
                          <dd className="text-cartistry-text">{b.cif || '—'}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-cartistry-text-secondary w-20 shrink-0">Dirección</dt>
                          <dd className="text-cartistry-text">
                            {[b.direccion_facturacion, b.codigo_postal, b.ciudad, b.provincia, b.pais]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="lg:border-l lg:border-cartistry-border lg:pl-6">
                      <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-1">
                        Plan contratado
                      </p>
                      <select
                        value={(b.plan as PlanKey) || 'estandar'}
                        onChange={(e) => cambiarPlan(b, e.target.value as PlanKey)}
                        className="w-full px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                      >
                        {(Object.keys(PLANES) as PlanKey[]).map((k) => (
                          <option key={k} value={k}>
                            {PLANES[k].label} — {PLANES[k].producto}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-cartistry-text-secondary mt-2">
                        {formatEUR(info.precio)}/mes · {tiendas} tienda{tiendas > 1 ? 's' : ''} ={' '}
                        <span className="font-medium text-cartistry-text">
                          {formatEUR(importeDe(b, storeCounts))}/mes
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal crear cliente */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => !guardando && setModalAbierto(false)}
        >
          <div
            className="bg-cartistry-surface rounded-lg border border-cartistry-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-cartistry-border">
              <div>
                <h2 className="text-lg font-serif font-bold text-cartistry-text">Crear cliente</h2>
                <p className="text-xs text-cartistry-text-secondary mt-0.5">
                  Datos fiscales para facturación y plan contratado.
                </p>
              </div>
              <button
                onClick={() => !guardando && setModalAbierto(false)}
                className="text-cartistry-text-secondary hover:text-cartistry-text text-xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">
                    Email de la marca <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setCampo('email', e.target.value)}
                    placeholder="marca@email.com"
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                  <p className="text-[11px] text-cartistry-text-secondary mt-1">
                    Identifica a la marca (si luego entra con este email verá sus datos).
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">
                    Nombre de la empresa <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nombre_empresa}
                    onChange={(e) => setCampo('nombre_empresa', e.target.value)}
                    placeholder="Mi Marca S.L."
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">CIF</label>
                  <input
                    type="text"
                    value={form.cif}
                    onChange={(e) => setCampo('cif', e.target.value)}
                    placeholder="B12345678"
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">Plan</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setCampo('plan', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  >
                    {(Object.keys(PLANES) as PlanKey[]).map((k) => (
                      <option key={k} value={k}>
                        {PLANES[k].label} — {PLANES[k].producto} ({formatEUR(PLANES[k].precio)}/mes·tienda)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-cartistry-text mb-1">
                  Dirección de facturación
                </label>
                <input
                  type="text"
                  value={form.direccion_facturacion}
                  onChange={(e) => setCampo('direccion_facturacion', e.target.value)}
                  placeholder="C/ Mayor 12, 3º A"
                  className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                />
              </div>

              <div className="grid sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">C. postal</label>
                  <input
                    type="text"
                    value={form.codigo_postal}
                    onChange={(e) => setCampo('codigo_postal', e.target.value)}
                    placeholder="28013"
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-cartistry-text mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={(e) => setCampo('ciudad', e.target.value)}
                    placeholder="Madrid"
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">Provincia</label>
                  <input
                    type="text"
                    value={form.provincia}
                    onChange={(e) => setCampo('provincia', e.target.value)}
                    placeholder="Madrid"
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-cartistry-text mb-1">País</label>
                  <input
                    type="text"
                    value={form.pais}
                    onChange={(e) => setCampo('pais', e.target.value)}
                    placeholder="España"
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
              </div>

              {/* Contacto general */}
              <div className="pt-2 border-t border-cartistry-border">
                <p className="text-sm font-medium text-cartistry-text mb-3 mt-2">Contacto general</p>
                <div className="sm:w-1/2">
                  <label className="block text-xs font-medium text-cartistry-text mb-1">
                    Teléfono de contacto general
                  </label>
                  <input
                    type="tel"
                    value={form.telefono_general}
                    onChange={(e) => setCampo('telefono_general', e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  />
                </div>
              </div>

              {/* Persona de facturación */}
              <div className="pt-2 border-t border-cartistry-border">
                <p className="text-sm font-medium text-cartistry-text mb-3 mt-2">
                  Contacto de facturación
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-cartistry-text mb-1">Nombre</label>
                    <input
                      type="text"
                      value={form.fact_nombre}
                      onChange={(e) => setCampo('fact_nombre', e.target.value)}
                      placeholder="Nombre"
                      className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-cartistry-text mb-1">Apellido</label>
                    <input
                      type="text"
                      value={form.fact_apellido}
                      onChange={(e) => setCampo('fact_apellido', e.target.value)}
                      placeholder="Apellido"
                      className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-cartistry-text mb-1">Cargo</label>
                    <input
                      type="text"
                      value={form.fact_cargo}
                      onChange={(e) => setCampo('fact_cargo', e.target.value)}
                      placeholder="Responsable de facturación"
                      className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-cartistry-text mb-1">Móvil</label>
                    <input
                      type="tel"
                      value={form.fact_movil}
                      onChange={(e) => setCampo('fact_movil', e.target.value)}
                      placeholder="+34 600 000 000"
                      className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-cartistry-text mb-1">Email</label>
                    <input
                      type="email"
                      value={form.fact_email}
                      onChange={(e) => setCampo('fact_email', e.target.value)}
                      placeholder="facturacion@marca.com"
                      className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-cartistry-border">
              <button
                onClick={() => setModalAbierto(false)}
                disabled={guardando}
                className="px-4 py-2 rounded text-sm font-medium border border-cartistry-border text-cartistry-accent hover:bg-cartistry-bg transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={crearCliente}
                disabled={guardando}
                className="px-4 py-2 rounded text-sm font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition disabled:opacity-50"
              >
                {guardando ? 'Creando...' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
