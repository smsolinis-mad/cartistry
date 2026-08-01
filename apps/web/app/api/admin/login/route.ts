import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin';
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET } from '@/lib/admin-server';

export async function POST(request: Request) {
  let email = '';
  let password = '';
  try {
    const body = await request.json();
    email = (body.email || '').trim();
    password = body.password || '';
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, ADMIN_SESSION_SECRET, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 h
  });
  return res;
}
