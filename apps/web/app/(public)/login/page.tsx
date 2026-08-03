'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { mensajeDeError } from '@/lib/auth-errores';
import { AuthShell } from '@/components/auth/AuthShell';
import { Alert, Button, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Escribe tu email y tu contraseña para entrar.');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(mensajeDeError(authError.message));
      setLoading(false);
      return;
    }

    // `refresh` obliga al middleware a releer la cookie de sesión recién puesta.
    router.replace('/dashboard');
    router.refresh();
  };

  return (
    <AuthShell
      title="Entra a tus lineales."
      description="Tus planogramas, tus ventas y tus tiendas, donde los dejaste."
      footer={
        <>
          ¿Todavía no tienes cuenta?{' '}
          <Link href="/registro" className="text-ink underline underline-offset-4">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? <Alert>{error}</Alert> : null}

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
        </Field>

        <Field label="Contraseña" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </Button>
      </form>
    </AuthShell>
  );
}
