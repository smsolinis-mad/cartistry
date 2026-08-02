'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v5 as uuidv5 } from 'uuid';
import { setUserCookie } from '@/lib/auth';
import { AuthShell } from '@/components/auth/AuthShell';
import { Alert, Button, Field, Input } from '@/components/ui';

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
        setError('Escribe tu email y tu contraseña para entrar.');
        return;
      }

      // Generar ID consistente basado en email
      const userId = uuidv5(email, '6ba7b810-9dad-11d1-80b4-00c04fd430c8');

      // Guardar sesión en cookie
      setUserCookie({ id: userId, email, loggedIn: true });

      // Pequeño delay para que la cookie se escriba
      await new Promise((resolve) => setTimeout(resolve, 100));

      router.push('/dashboard');
    } catch (err) {
      setError('No se ha podido iniciar sesión. Inténtalo otra vez.');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
