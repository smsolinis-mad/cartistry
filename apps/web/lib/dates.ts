/**
 * Fechas. Las ventas llegan como 'YYYY-MM-DD' y hay que leerlas en hora local:
 * `new Date('2026-03-07')` se interpreta como UTC y en España desplaza el día.
 * Antes siete ficheros repetían este parseo a mano.
 */

export const MESES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

export const MESES_LARGO = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

/** Convierte 'YYYY-MM-DD' en una fecha local. Devuelve null si no es válida. */
export function parseISODate(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  const [yy, mm, dd] = String(fecha).split('-').map((v) => parseInt(v, 10));
  if (!yy || !mm || !dd) return null;
  return new Date(yy, mm - 1, dd);
}

/** Convierte una fecha local en 'YYYY-MM-DD', sin pasar por UTC. */
export function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Medianoche de hoy, en hora local. */
export function hoyLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Resta días a una fecha sin mutarla. */
export function restarDias(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - dias);
  return r;
}
