import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Verificar si el usuario está logueado usando cookies (localStorage no funciona en middleware)
  const userCookie = request.cookies.get('user')?.value;
  const isLoggedIn = userCookie ? JSON.parse(userCookie).loggedIn : false;

  // Proteger rutas /dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirigir a dashboard si está logueado e intenta ir a login/registro
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/registro') && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next({ request });
}
