'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_SETTINGS_COLS, type AdminSettings } from '@/lib/admin-data';

const VACIO: AdminSettings = {
  nombre_empresa: '',
  cif: '',
  direccion: '',
  codigo_postal: '',
  ciudad: '',
  provincia: '',
  pais: 'España',
  email: '',
  telefono: '',
  iban: '',
};

export default function ConfiguracionPage() {
  const supabase = createClient();
  const [form, setForm] = useState<AdminSettings>({ ...VACIO });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select(ADMIN_SETTINGS_COLS)
        .eq('id', 1)
        .maybeSingle();
      if (!error && data) setForm({ ...VACIO, ...(data as AdminSettings) });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (campo: keyof AdminSettings, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const { error } = await supabase.from('admin_settings').upsert(
        { id: 1, ...form, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
      if (error) throw error;
      setMsg('✓ Datos de facturación guardados');
    } catch (err: any) {
      setMsg(err?.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const input = (campo: keyof AdminSettings, label: string, placeholder = '', type = 'text') => (
    <div>
      <label className="block text-xs font-medium text-cartistry-text mb-1">{label}</label>
      <input
        type={type}
        value={form[campo] || ''}
        onChange={(e) => set(campo, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
      />
    </div>
  );

  return (
    <main>
      <header className="bg-cartistry-surface border-b border-cartistry-border px-8 py-5">
        <h1 className="text-2xl font-serif font-bold text-cartistry-text">Configuración</h1>
        <p className="text-sm text-cartistry-text-secondary mt-1">
          Datos de facturación de tu empresa · aparecen en las facturas como emisor.
        </p>
      </header>

      <div className="px-8 py-8 max-w-3xl">
        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando...</p>
        ) : (
          <form onSubmit={guardar} className="space-y-6">
            <div className="bg-cartistry-surface border border-cartistry-border rounded p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {input('nombre_empresa', 'Nombre / Razón social', 'Cartistry S.L.')}
                {input('cif', 'CIF / NIF', 'B12345678')}
              </div>

              {input('direccion', 'Dirección', 'C/ Mayor 12, 3º A')}

              <div className="grid sm:grid-cols-4 gap-4">
                {input('codigo_postal', 'C. postal', '28013')}
                {input('ciudad', 'Ciudad', 'Madrid')}
                {input('provincia', 'Provincia', 'Madrid')}
                {input('pais', 'País', 'España')}
              </div>

              <div className="pt-2 border-t border-cartistry-border">
                <p className="text-sm font-medium text-cartistry-text mb-3 mt-3">Contacto y cobro</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {input('email', 'Email', 'facturacion@cartistry.com', 'email')}
                  {input('telefono', 'Teléfono', '+34 600 000 000')}
                </div>
                <div className="mt-4">{input('iban', 'IBAN', 'ES00 0000 0000 0000 0000 0000')}</div>
              </div>
            </div>

            {msg && (
              <div
                className={`p-3 rounded text-sm border ${
                  msg.startsWith('✓')
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {msg}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {saving ? 'Guardando...' : 'Guardar datos'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
