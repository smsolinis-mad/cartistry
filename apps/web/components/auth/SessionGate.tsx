'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clearSesion, setSesion } from '@/lib/auth';
import { LoadingBlock } from '@/components/ui';

/**
 * Resuelve la sesión antes de montar el dashboard.
 *
 * Las páginas piden el id de la marca de forma sincrónica con `getUserId()`.
 * Esta puerta no renderiza a sus hijos hasta que Supabase ha confirmado quién
 * es el usuario, así que cuando cualquier página arranca su carga de datos el
 * id ya está resuelto y verificado.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<'comprobando' | 'con-sesion' | 'sin-sesion'>(
    'comprobando'
  );

  useEffect(() => {
    let vigente = true;

    const aplicar = (email: string | null | undefined) => {
      if (!vigente) return;
      if (email) {
        setSesion(email);
        setEstado('con-sesion');
      } else {
        clearSesion();
        setEstado('sin-sesion');
      }
    };

    // getUser() valida el token contra Supabase; getSession() se limita a leer
    // la cookie, que es justamente lo que no queremos volver a hacer.
    supabase.auth.getUser().then(({ data }) => aplicar(data.user?.email));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) =>
      aplicar(session?.user?.email)
    );

    return () => {
      vigente = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (estado === 'sin-sesion') router.replace('/login');
  }, [estado, router]);

  if (estado !== 'con-sesion') {
    return (
      <main className="px-6 py-10 lg:px-10 lg:py-12">
        <div className="max-w-6xl mx-auto">
          <LoadingBlock
            label={estado === 'comprobando' ? 'Comprobando tu sesión' : 'Llevándote al acceso'}
            rows={4}
          />
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
