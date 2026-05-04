'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function RegistroPage() {
  const [invitationCode, setInvitationCode] = useState('');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'code' | 'details'>('code');

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!invitationCode.trim()) {
      setError('El código de invitación es obligatorio');
      return;
    }
    // TODO: Validar código contra Supabase
    setStep('details');
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    // TODO: Crear usuario con Supabase
    console.log('Register:', { invitationCode, email, storeName, password });
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
            Crear cuenta
          </h1>

          {step === 'code' ? (
            <form onSubmit={handleSubmitCode} className="space-y-4">
              <p className="text-sm text-cartistry-text-secondary mb-6">
                Cartistry solo está disponible con código de invitación.
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-cartistry-text mb-2">
                  Código de invitación
                </label>
                <input
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text placeholder-cartistry-text-secondary focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  placeholder="XXXXXXXX"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition"
              >
                Continuar
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitDetails} className="space-y-4">
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
                  Nombre de la tienda
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text placeholder-cartistry-text-secondary focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  placeholder="Mi tienda"
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

              <div>
                <label className="block text-sm font-medium text-cartistry-text mb-2">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text placeholder-cartistry-text-secondary focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition"
              >
                Crear cuenta
              </button>

              <button
                type="button"
                onClick={() => setStep('code')}
                className="w-full py-2 border border-cartistry-border text-cartistry-accent rounded font-medium hover:bg-cartistry-bg transition"
              >
                ← Volver
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-cartistry-text-secondary">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-cartistry-accent font-medium hover:underline">
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
