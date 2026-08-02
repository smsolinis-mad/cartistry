'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { PageHeader } from '@/components/ui';

export default function FacturacionPage() {
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [direccionFacturacion, setDireccionFacturacion] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [pais, setPais] = useState('');
  const [cif, setCif] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('company_settings')
        .select('nombre_empresa, direccion_facturacion, codigo_postal, ciudad, provincia, pais, cif')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        setError(`Error cargando configuración: ${fetchError.message}`);
        return;
      }

      if (data) {
        setNombreEmpresa(data.nombre_empresa || '');
        setDireccionFacturacion(data.direccion_facturacion || '');
        setCodigoPostal(data.codigo_postal || '');
        setCiudad(data.ciudad || '');
        setProvincia(data.provincia || '');
        setPais(data.pais || '');
        setCif(data.cif || '');
      }
    } catch {
      setError('Error cargando configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const userId = getUserId();
      if (!userId) {
        setError('Usuario no autenticado');
        return;
      }

      const { error: upsertError } = await supabase
        .from('company_settings')
        .upsert(
          {
            user_id: userId,
            nombre_empresa: nombreEmpresa || null,
            direccion_facturacion: direccionFacturacion || null,
            codigo_postal: codigoPostal || null,
            ciudad: ciudad || null,
            provincia: provincia || null,
            pais: pais || null,
            cif: cif || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        setError(`Error guardando: ${upsertError.message}`);
        return;
      }

      setSuccess('✓ Configuración guardada correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader title="Configuración" />

        <h2 className="text-xl font-serif font-bold text-cartistry-text">
          Datos de facturación
        </h2>

        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-cartistry-surface border border-cartistry-border rounded p-6 space-y-5">
              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Nombre de la empresa
                </label>
                <input
                  type="text"
                  value={nombreEmpresa}
                  onChange={(e) => setNombreEmpresa(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="Mi Marca S.L."
                />
              </div>

              <div className="pt-2">
                <p className="text-sm font-medium text-cartistry-text mb-3">
                  Dirección de facturación
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="eyebrow block mb-1.5">
                      Calle y número
                    </label>
                    <input
                      type="text"
                      value={direccionFacturacion}
                      onChange={(e) => setDireccionFacturacion(e.target.value)}
                      className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                      placeholder="C/ Mayor 12, 3º A"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="eyebrow block mb-1.5">
                        Código postal
                      </label>
                      <input
                        type="text"
                        value={codigoPostal}
                        onChange={(e) => setCodigoPostal(e.target.value)}
                        className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                        placeholder="28013"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="eyebrow block mb-1.5">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        value={ciudad}
                        onChange={(e) => setCiudad(e.target.value)}
                        className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                        placeholder="Madrid"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="eyebrow block mb-1.5">
                        Provincia
                      </label>
                      <input
                        type="text"
                        value={provincia}
                        onChange={(e) => setProvincia(e.target.value)}
                        className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                        placeholder="Madrid"
                      />
                    </div>
                    <div>
                      <label className="eyebrow block mb-1.5">
                        País
                      </label>
                      <input
                        type="text"
                        value={pais}
                        onChange={(e) => setPais(e.target.value)}
                        className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                        placeholder="España"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  CIF
                </label>
                <input
                  type="text"
                  value={cif}
                  onChange={(e) => setCif(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="B12345678"
                />
              </div>

              <div className="pt-4 mt-2 border-t border-cartistry-border">
                <p className="text-sm font-medium text-cartistry-text mb-3">
                  Suscripción activa
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-cartistry-bg rounded border border-cartistry-border p-3">
                    <p className="text-xs text-cartistry-text-secondary uppercase tracking-wider font-bold mb-1">
                      Plan contratado
                    </p>
                    <p className="text-base font-serif font-bold text-cartistry-text">
                      Plan Suite
                    </p>
                  </div>
                  <div className="bg-cartistry-bg rounded border border-cartistry-border p-3">
                    <p className="text-xs text-cartistry-text-secondary uppercase tracking-wider font-bold mb-1">
                      Tipo de pago
                    </p>
                    <p className="text-base font-serif font-bold text-cartistry-text">
                      Mensual
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">{success}</div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
