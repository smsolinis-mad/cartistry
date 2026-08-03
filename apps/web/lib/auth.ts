import { v5 as uuidv5 } from 'uuid';

/**
 * Sesión de marca.
 *
 * La identidad la prueba Supabase Auth: la contraseña se verifica en el
 * servidor y la sesión vive en cookies firmadas que el middleware valida en
 * cada petición. Este módulo solo guarda, en memoria, el usuario ya verificado
 * para que las páginas puedan pedir su id sin volverse asíncronas.
 *
 * El id de aplicación se sigue derivando del email (uuidv5), que es la clave
 * con la que están guardadas las tiendas y los empleados existentes. Es
 * estable, no la elige el cliente y se calcula a partir del email que Supabase
 * ha verificado, no de uno escrito a mano.
 */

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/** Normaliza el email igual que lo hace Supabase, para que el id no baile. */
function normalizar(email: string): string {
  return email.trim().toLowerCase();
}

/** Id de aplicación a partir de un email verificado. */
export function appUserId(email: string): string {
  return uuidv5(normalizar(email), NAMESPACE);
}

interface Sesion {
  userId: string;
  email: string;
}

// Caché de proceso. La rellena SessionGate antes de montar el dashboard.
let sesion: Sesion | null = null;

/** Registra el usuario verificado. Solo debe llamarlo SessionGate. */
export function setSesion(email: string): Sesion {
  sesion = { email: normalizar(email), userId: appUserId(email) };
  return sesion;
}

export function clearSesion(): void {
  sesion = null;
}

/**
 * Id de la marca en sesión, o null si todavía no se ha verificado.
 * Es sincrónico a propósito: lo usan ~30 páginas dentro de sus efectos de
 * carga, y SessionGate garantiza que ya está resuelto cuando montan.
 */
export function getUserId(): string | null {
  return sesion?.userId ?? null;
}

export function getUserEmail(): string | null {
  return sesion?.email ?? null;
}
