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
              <label className="block text-sm font-medium text-cartistry-text mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text placeholder-cartistry-text-secondary focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                placeholder="admin@cartistry.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cartistry-text mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text placeholder-cartistry-text-secondary focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Accediendo...' : 'Acceder al panel'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
