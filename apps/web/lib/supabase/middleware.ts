import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin';
import { ADMIN_SESSION_SECRET } from '@/lib/admin-server';

/**
 * Verifica la sesión en cada petición y refresca sus cookies.
 *
 * Antes se leía una cookie `user` en JSON escrita por el propio navegador, que
 * cualquiera podía fabricar desde la consola. Ahora la sesión la valida
 * Supabase —`auth.getUser()` comprueba el token contra el servidor de auth—,
 * así que una cookie inventada no sirve de nada.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const haySesion = !!user;

  const { pathname } = request.nextUrl;

  /** Redirige conservando las cookies de sesión recién refrescadas. */
  const redirigirA = (destino: string) => {
    const redireccion = NextResponse.redirect(new URL(destino, request.url));
    response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
    return redireccion;
  };

  // --- Panel de administración (independiente del acceso de marcas) ---
  const isAdmin = request.cookies.get(ADMIN_COOKIE)?.value === ADMIN_SESSION_SECRET;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!isAdmin) return redirigirA('/admin/login');
    return response;
  }

  if (pathname === '/admin/login' && isAdmin) {
    return redirigirA('/admin');
  }

  // --- Acceso de marcas ---
  if (pathname.startsWith('/dashboard') && !haySesion) {
    return redirigirA('/login');
  }

  if ((pathname === '/login' || pathname === '/registro') && haySesion) {
    return redirigirA('/dashboard');
  }

  return response;
}
