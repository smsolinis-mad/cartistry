'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { ACCESOS, childKeys, resumenAccesos } from '@/lib/accesos';

interface Cargo {
  id: string;
  nombre: string;
  accesos: string[] | null;
}

export default function CargosPage() {
  const supabase = createClient();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [accesos, setAccesos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState('');

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
    const { data, error: err } = await supabase
      .from('cargos')
      .select('*')
      .eq('user_id', userId)
      .order('nombre', { ascending: true });
    if (err) setError(err.message);
    else setCargos((data as Cargo[]) || []);
    setLoading(false);
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    setNombre('');
    setAccesos([]);
    setFormError('');
    setModalAbierto(true);
  };

  const abrirEdicion = (c: Cargo) => {
    setEditandoId(c.id);
    setNombre(c.nombre);
    setAccesos(c.accesos || []);
    setFormError('');
    setModalAbierto(true);
  };

  const toggleAcceso = (key: string) =>
    setAccesos((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const toggleBloque = (keys: string[]) =>
    setAccesos((prev) => {
      const todos = keys.every((k) => prev.includes(k));
      if (todos) return prev.filter((k) => !keys.includes(k));
      const set = new Set(prev);
      keys.forEach((k) => set.add(k));
      return Array.from(set);
    });

  const guardar = async () => {
    setFormError('');
    if (!nombre.trim()) {
      setFormError('El nombre del cargo es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const userId = getUserId();
      const row = {
        user_id: userId,
        nombre: nombre.trim(),
        accesos,
        updated_at: new Date().toISOString(),
      };
      const { error: err } = editandoId
        ? await supabase.from('cargos').update(row).eq('id', editandoId)
        : await supabase.from('cargos').insert(row);
      if (err) throw err;
      setModalAbierto(false);
      await cargar();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo guardar el cargo');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!editandoId) return;
    if (!confirm('¿Eliminar este cargo?')) return;
    setGuardando(true);
    const { error: err } = await supabase.from('cargos').delete().eq('id', editandoId);
    if (err) setFormError(err.message);
    else {
      setModalAbierto(false);
      await cargar();
    }
    setGuardando(false);
  };

  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/dashboard/equipo/datos" className="text-cartistry-accent hover:underline text-sm">
              ← Volver
            </Link>
            <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">Equipo · Cargos</h1>
          </div>
          <button
            onClick={abrirNuevo}
            className="px-4 py-2 rounded text-sm font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition"
          >
            + Añadir cargo
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
        )}

        {loading ? (
          <p className="text-cartistry-text-secondary text-sm">Cargando...</p>
        ) : cargos.length === 0 ? (
          <div className="bg-cartistry-surface border border-cartistry-border rounded p-10 text-center">
            <p className="text-cartistry-text-secondary text-sm">
              No hay cargos definidos. Pulsa «Añadir cargo» para crear el primero.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cargos.map((c) => (
              <div
                key={c.id}
                className="bg-cartistry-surface border border-cartistry-border rounded p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <h3 className="font-serif font-bold text-cartistry-text">{c.nombre}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {resumenAccesos(c.accesos || []).length === 0 ? (
                      <span className="text-xs text-cartistry-text-secondary">Sin accesos asignados</span>
                    ) : (
                      resumenAccesos(c.accesos || []).map((label) => (
                        <span
                          key={label}
                          className="text-xs px-2 py-0.5 rounded-full bg-cartistry-bg-secondary text-cartistry-text"
                        >
                          {label}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <button
                  onClick={() => abrirEdicion(c)}
                  className="text-xs font-medium text-cartistry-accent hover:underline whitespace-nowrap"
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal alta/edición */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => !guardando && setModalAbierto(false)}
        >
          <div
            className="bg-cartistry-surface rounded-lg border border-cartistry-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-cartistry-border">
              <h2 className="text-lg font-serif font-bold text-cartistry-text">
                {editandoId ? 'Editar cargo' : 'Nuevo cargo'}
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
              <div>
                <label className="block text-xs font-medium text-cartistry-text mb-1">
                  Nombre del cargo <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Encargado, Dependiente, Manager…"
                  className="w-full px-3 py-2 bg-white border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-cartistry-text mb-2">Accesos en la web</p>
                <div className="space-y-2">
                  {ACCESOS.map((b) => {
                    // Bloque sin sub-bloques → una sola casilla
                    if (!b.hijos || b.hijos.length === 0) {
                      return (
                        <label
                          key={b.key}
                          className="flex items-center gap-2 px-3 py-2 rounded border border-cartistry-border cursor-pointer hover:bg-cartistry-bg transition"
                        >
                          <input
                            type="checkbox"
                            checked={accesos.includes(b.key)}
                            onChange={() => toggleAcceso(b.key)}
                            className="accent-cartistry-accent"
                          />
                          <span className="text-sm font-medium text-cartistry-text">{b.label}</span>
                        </label>
                      );
                    }
                    const ck = childKeys(b);
                    const allSel = ck.every((k) => accesos.includes(k));
                    const someSel = ck.some((k) => accesos.includes(k));
                    return (
                      <div key={b.key} className="border border-cartistry-border rounded p-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSel}
                            ref={(el) => {
                              if (el) el.indeterminate = someSel && !allSel;
                            }}
                            onChange={() => toggleBloque(ck)}
                            className="accent-cartistry-accent"
                          />
                          <span className="text-sm font-medium text-cartistry-text">{b.label}</span>
                          <span className="text-xs text-cartistry-text-secondary">(bloque completo)</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 mt-2 pl-6">
                          {b.hijos.map((h) => (
                            <label key={h.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={accesos.includes(h.key)}
                                onChange={() => toggleAcceso(h.key)}
                                className="accent-cartistry-accent"
                              />
                              <span className="text-sm text-cartistry-text">{h.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                  className="px-4 py-2 rounded text-sm font-medium border border-cartistry-border text-cartistry-accent hover:bg-cartistry-bg transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className="px-4 py-2 rounded text-sm font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear cargo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
