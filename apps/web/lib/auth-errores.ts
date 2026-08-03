/**
 * Traduce los errores de Supabase Auth a mensajes que digan qué ha pasado y
 * qué hacer. Nunca revelan si un email está registrado o no.
 */
export function mensajeDeError(mensaje: string | undefined): string {
  const m = (mensaje || '').toLowerCase();

  if (m.includes('invalid login credentials')) {
    return 'El email o la contraseña no son correctos.';
  }
  if (m.includes('email not confirmed')) {
    return 'Confirma tu email antes de entrar. Te enviamos un enlace al registrarte.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Ese email ya tiene cuenta. Inicia sesión o recupera la contraseña.';
  }
  if (m.includes('password should be at least')) {
    return 'La contraseña necesita al menos 8 caracteres.';
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  }
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return 'El registro está cerrado en este proyecto de Supabase.';
  }
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'No hay conexión con el servidor. Revisa tu red y vuelve a probar.';
  }
  return 'No se ha podido completar la operación. Vuelve a intentarlo.';
}
