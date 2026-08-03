'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { mensajeDeError } from '@/lib/auth-errores';
import { AuthShell } from '@/components/auth/AuthShell';
import { Alert, Button, Field, Input } from '@/components/ui';

type Paso = 'codigo' | 'datos' | 'confirmar-email';

const MOTIVOS: Record<string, string> = {
  inexistente: 'Ese código no existe. Revisa el email de invitación.',
  usado: 'Ese código ya se ha usado para crear una cuenta.',
  caducado: 'Ese código ha caducado. Pide uno nuevo.',
  vacio: 'Escribe el código que has recibido en tu invitación.',
  error: 'No se ha podido comprobar el código. Vuelve a intentarlo.',
  invalido: 'Ese código no es válido.',
};

export default function RegistroPage() {
  const [invitationCode, setInvitationCode] = useState('');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [paso, setPaso] = useState<Paso>('codigo');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const validarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/invitaciones/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: invitationCode }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(MOTIVOS[data.motivo] ?? MOTIVOS.invalido);
        return;
      }
      setPaso('datos');
    } catch {
      setError('No se ha podido comprobar el código. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const crearCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.');
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Queda en el perfil del usuario para crear su primer espacio de venta.
        data: { store_name: storeName.trim(), invitation_code: invitationCode },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (authError) {
      setError(mensajeDeError(authError.message));
      setLoading(false);
      return;
    }

    // La cuenta existe: ya se puede quemar el código.
    await fetch('/api/invitaciones/consumir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: invitationCode, email: email.trim() }),
    }).catch(() => {});

    // Si el proyecto exige confirmar el email, signUp no devuelve sesión.
    if (!data.session) {
      setPaso('confirmar-email');
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  };

  if (paso === 'confirmar-email') {
    return (
      <AuthShell
        title="Confirma tu email."
        description={`Hemos enviado un enlace a ${email.trim()}. Ábrelo y podrás entrar con tu contraseña.`}
        footer={
          <>
            ¿Ya lo has confirmado?{' '}
            <Link href="/login" className="text-ink underline underline-offset-4">
              Iniciar sesión
            </Link>
          </>
        }
      >
        <Alert tone="positive">
          Tu cuenta está creada. Solo falta que confirmes el email para poder entrar.
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={paso === 'codigo' ? 'Empieza por tu código.' : 'Crea tu cuenta.'}
      description={
        paso === 'codigo'
          ? 'Cartistry está en acceso por invitación mientras afinamos las reglas con las primeras tiendas.'
          : 'Con estos datos creamos tu primer espacio de venta.'
      }
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-ink underline underline-offset-4">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <div className="flex items-center gap-2 mb-6" aria-hidden>
        <span className="h-1 flex-1 rounded-[1px] bg-ink" />
        <span
          className={`h-1 flex-1 rounded-[1px] ${paso === 'datos' ? 'bg-ink' : 'bg-line'}`}
        />
        <span className="font-mono text-[11px] text-ink-3 ml-1">
          {paso === 'codigo' ? '1 / 2' : '2 / 2'}
        </span>
      </div>

      {paso === 'codigo' ? (
        <form onSubmit={validarCodigo} className="space-y-5">
          {error ? <Alert>{error}</Alert> : null}

          <Field label="Código de invitación" htmlFor="code">
            <Input
              id="code"
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
              className="font-mono tracking-[0.2em]"
              placeholder="XXXXXXXX"
              required
            />
          </Field>

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? 'Comprobando…' : 'Continuar'}
          </Button>
        </form>
      ) : (
        <form onSubmit={crearCuenta} className="space-y-5">
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

          <Field label="Nombre de la tienda" htmlFor="store">
            <Input
              id="store"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Castellana"
              required
            />
          </Field>

          <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres.">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          <Field label="Repite la contraseña" htmlFor="confirm">
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setPaso('codigo')}
              disabled={loading}
            >
              Volver
            </Button>
            <Button type="submit" size="lg" disabled={loading} className="flex-1">
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
