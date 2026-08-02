'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No se pudo iniciar sesión');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-cartistry-bg">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <span className="text-2xl font-serif font-bold text-cartistry-text">Cartistry</span>
          <span className="text-xs uppercase tracking-widest text-cartistry-text-secondary mt-1">
            Administración
          </span>
        </div>

        <div className="bg-cartistry-surface rounded border border-cartistry-border p-8">
          <h1 className="text-2xl font-serif font-bold text-cartistry-text text-center mb-6">
            Acceso administrador
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="eyebrow block mb-1.5 text-ink-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 bg-surface text-ink text-sm rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-ink-3 focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)] transition-shadow"
                placeholder="admin@cartistry.com"
                required
              />
            </div>

            <div>
              <label className="eyebrow block mb-1.5 text-ink-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 bg-surface text-ink text-sm rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-ink-3 focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)] transition-shadow"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none w-full"
            >
              {loading ? 'Accediendo...' : 'Acceder al panel'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
