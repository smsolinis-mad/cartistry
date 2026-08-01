'use client';

import { useState } from 'react';
import { ADMIN_EMAIL_PUBLIC } from '@/lib/admin';

interface Miembro {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

const INICIALES: Miembro[] = [
  { id: 1, nombre: 'Administrador', email: ADMIN_EMAIL_PUBLIC, rol: 'Superadmin' },
];

const ROLES = ['Superadmin', 'Facturación', 'Soporte', 'Solo lectura'];

export default function EquipoPage() {
  const [miembros, setMiembros] = useState<Miembro[]>(INICIALES);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState(ROLES[1]);
  const [mostrarForm, setMostrarForm] = useState(false);

  const anadir = () => {
    if (!email.trim()) return;
    setMiembros((prev) => [
      ...prev,
      { id: Date.now(), nombre: nombre.trim() || '—', email: email.trim(), rol },
    ]);
    setNombre('');
    setEmail('');
    setRol(ROLES[1]);
    setMostrarForm(false);
  };

  const eliminar = (id: number) => setMiembros((prev) => prev.filter((m) => m.id !== id));

  return (
    <main>
      <header className="bg-cartistry-surface border-b border-cartistry-border px-8 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-cartistry-text">Equipo</h1>
          <p className="text-sm text-cartistry-text-secondary mt-1">
            Personas con acceso al panel de administración.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="px-4 py-2 rounded text-sm font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition"
        >
          {mostrarForm ? 'Cancelar' : 'Añadir miembro'}
        </button>
      </header>

      <div className="px-8 py-8 space-y-6">
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs">
          Nota: la gestión de equipo aún no se guarda en la base de datos. Los cambios son
          temporales (solo en esta sesión) hasta que conectemos una tabla de usuarios admin.
        </div>

        {mostrarForm && (
          <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
            <div className="grid sm:grid-cols-[1fr_1.4fr_1fr_auto] gap-4 items-end">
              <div>
                <label className="block text-xs text-cartistry-text-secondary mb-1">Nombre</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre"
                  className="w-full px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-cartistry-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="persona@cartistry.com"
                  className="w-full px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-cartistry-text-secondary mb-1">Rol</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={anadir}
                className="px-4 py-2 rounded text-sm font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
          <div className="grid grid-cols-[1.2fr_1.6fr_1fr_auto] gap-4 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
            <span>Nombre</span>
            <span>Email</span>
            <span>Rol</span>
            <span className="text-right">Acciones</span>
          </div>
          {miembros.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-[1.2fr_1.6fr_1fr_auto] gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 text-sm last:border-b-0"
            >
              <span className="flex items-center gap-2">
                <span className="w-7 h-7 rounded flex items-center justify-center bg-cartistry-accent text-cartistry-cta-text text-xs font-medium">
                  {(m.nombre || m.email).charAt(0).toUpperCase()}
                </span>
                <span className="text-cartistry-text">{m.nombre}</span>
              </span>
              <span className="text-cartistry-text-secondary">{m.email}</span>
              <span>
                <span className="inline-block text-xs font-medium px-2 py-1 rounded-full bg-cartistry-bg-secondary text-cartistry-text">
                  {m.rol}
                </span>
              </span>
              <span className="text-right">
                {m.rol === 'Superadmin' ? (
                  <span className="text-xs text-cartistry-text-secondary">—</span>
                ) : (
                  <button
                    onClick={() => eliminar(m.id)}
                    className="text-xs font-medium text-red-700 hover:underline"
                  >
                    Eliminar
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
