import { type NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin';
import { ADMIN_SESSION_SECRET } from '@/lib/admin-server';

export async function updateSession(request: NextRequest) {
  // Verificar si el usuario está logueado usando cookies (localStorage no funciona en middleware)
  const userCookie = request.cookies.get('user')?.value;
  const isLoggedIn = userCookie ? JSON.parse(userCookie).loggedIn : false;

  const { pathname } = request.nextUrl;

  // --- Panel de administración (independiente del login de marcas) ---
  const isAdmin = request.cookies.get(ADMIN_COOKIE)?.value === ADMIN_SESSION_SECRET;

  // Proteger /admin salvo la propia pantalla de login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next({ request });
  }

  // Si ya es admin e intenta ir al login admin, llevarlo al panel
  if (pathname === '/admin/login' && isAdmin) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Proteger rutas /dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirigir a dashboard si está logueado e intenta ir a login/registro
  if ((pathname === '/login' || pathname === '/registro') && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next({ request });
}
