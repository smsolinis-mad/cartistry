'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v5 as uuidv5 } from 'uuid';
import { setUserCookie } from '@/lib/auth';
import { AuthShell } from '@/components/auth/AuthShell';
import { Alert, Button, Field, Input } from '@/components/ui';

export default function RegistroPage() {
  const [invitationCode, setInvitationCode] = useState('');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'code' | 'details'>('code');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!invitationCode.trim()) {
      setError('Escribe el código que has recibido en tu invitación.');
      setLoading(false);
      return;
    }

    // Validación simple: aceptar códigos predefinidos
    const validCodes = ['DEMO123', 'TEST123', 'BETA001'];
    if (!validCodes.includes(invitationCode.toUpperCase())) {
      setError('Ese código no es válido. Revisa el email de invitación.');
      setLoading(false);
      return;
    }

    try {
      setStep('details');
    } catch (err) {
      setError('No se ha podido validar el código. Inténtalo otra vez.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Las dos contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // Generar ID consistente basado en email
      const userId = uuidv5(email, '6ba7b810-9dad-11d1-80b4-00c04fd430c8');

      // Guardar usuario en cookie (TODO: conectar a Supabase cuando auth funcione)
      setUserCookie({
        id: userId,
        email,
        storeName,
        invitationCode,
        loggedIn: true,
      });

      // Pequeño delay para que la cookie se escriba
      await new Promise((resolve) => setTimeout(resolve, 100));

      router.push('/dashboard');
    } catch (err) {
      setError('No se ha podido crear la cuenta. Inténtalo otra vez.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={step === 'code' ? 'Empieza por tu código.' : 'Crea tu cuenta.'}
      description={
        step === 'code'
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
      {/* Paso actual del alta. Son dos, y se ven. */}
      <div className="flex items-center gap-2 mb-6" aria-hidden>
        <span className="h-1 flex-1 rounded-[1px] bg-ink" />
        <span
          className={`h-1 flex-1 rounded-[1px] ${step === 'details' ? 'bg-ink' : 'bg-line'}`}
        />
        <span className="font-mono text-[11px] text-ink-3 ml-1">
          {step === 'code' ? '1 / 2' : '2 / 2'}
        </span>
      </div>

      {step === 'code' ? (
        <form onSubmit={handleSubmitCode} className="space-y-5">
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
            {loading ? 'Validando…' : 'Continuar'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmitDetails} className="space-y-5">
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
              onClick={() => setStep('code')}
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
