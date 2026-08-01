'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v5 as uuidv5 } from 'uuid';
import { setUserCookie } from '@/lib/auth';

export default function LoginPage() {
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
      // Validación simple (TODO: conectar a Supabase cuando auth funcione)
      if (!email || !password) {
        setError('Email y contraseña son obligatorios');
        return;
      }

      // Generar ID consistente basado en email
      const userId = uuidv5(email, '6ba7b810-9dad-11d1-80b4-00c04fd430c8');

      // Guardar sesión en cookie
      setUserCookie({ id: userId, email, loggedIn: true });

      // Pequeño delay para que la cookie se escriba
      await new Promise(resolve => setTimeout(resolve, 100));

      router.push('/dashboard');
    } catch (err) {
      setError('Error al iniciar sesión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-cartistry-bg">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex justify-center mb-8">
          <span className="text-2xl font-serif font-bold text-cartistry-text">Cartistry</span>
        </Link>

        {/* Form */}
        <div className="bg-cartistry-surface rounded border border-cartistry-border p-8">
          <h1 className="text-2xl font-serif font-bold text-cartistry-text text-center mb-6">
            Iniciar sesión
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-cartistry-text mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text placeholder-cartistry-text-secondary focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cartistry-text mb-2">
                Contraseña
              </label>
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
              {loading ? 'Iniciando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-cartistry-text-secondary">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="text-cartistry-accent font-medium hover:underline">
              Registrarse
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
