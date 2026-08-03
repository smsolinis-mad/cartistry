import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Comprueba un código de invitación en el servidor.
 *
 * Antes la lista de códigos válidos estaba escrita en el componente de
 * registro, es decir, en el bundle que descarga cualquiera.
 *
 * Prefiere la función `validar_invitacion` de Postgres (SECURITY DEFINER, ver
 * supabase/rls.sql) para no necesitar acceso directo a la tabla. Si esa función
 * todavía no existe, consulta la tabla — que es lo que ocurre mientras RLS siga
 * desactivado.
 */
export async function POST(request: Request) {
  let codigo = '';
  try {
    const body = await request.json();
    codigo = String(body?.codigo ?? '').trim().toUpperCase();
  } catch {
    return Response.json({ ok: false, motivo: 'invalido' }, { status: 400 });
  }

  if (!codigo) {
    return Response.json({ ok: false, motivo: 'vacio' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc('validar_invitacion', {
    p_code: codigo,
  });

  if (!rpcError) {
    return Response.json({ ok: rpcData === true, motivo: rpcData ? null : 'invalido' });
  }

  // La función aún no está instalada: se comprueba contra la tabla.
  const { data, error } = await supabase
    .from('invitations')
    .select('code, used, expires_at')
    .eq('code', codigo)
    .maybeSingle();

  if (error) {
    return Response.json({ ok: false, motivo: 'error' }, { status: 500 });
  }
  if (!data) {
    return Response.json({ ok: false, motivo: 'inexistente' });
  }
  if (data.used) {
    return Response.json({ ok: false, motivo: 'usado' });
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return Response.json({ ok: false, motivo: 'caducado' });
  }

  return Response.json({ ok: true, motivo: null });
}
