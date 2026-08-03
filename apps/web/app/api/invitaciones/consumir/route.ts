import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Marca una invitación como usada. Se llama después de que Supabase haya
 * creado la cuenta, para que un registro fallido no quemase el código.
 */
export async function POST(request: Request) {
  let codigo = '';
  let email = '';
  try {
    const body = await request.json();
    codigo = String(body?.codigo ?? '').trim().toUpperCase();
    email = String(body?.email ?? '').trim().toLowerCase();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  if (!codigo) return Response.json({ ok: false }, { status: 400 });

  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc('consumir_invitacion', {
    p_code: codigo,
    p_email: email,
  });

  if (!rpcError) return Response.json({ ok: true });

  const { error } = await supabase
    .from('invitations')
    .update({ used: true, email: email || null })
    .eq('code', codigo);

  // Si esto falla, la cuenta ya está creada: no se bloquea al usuario por no
  // haber podido marcar el código.
  return Response.json({ ok: !error });
}
