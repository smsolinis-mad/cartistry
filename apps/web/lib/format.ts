/**
 * Formato de cifras. Fuente única: antes cada página redefinía estas tres
 * funciones y el porcentaje ya había divergido (unas redondeaban, otras daban
 * un decimal).
 */

/** Importe en euros, convención española: 1.284,00 € */
export function formatEUR(n: number): string {
  return (
    (Number(n) || 0).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'
  );
}

/** Importe redondeado, sin céntimos: 1.284 € */
export function formatEURShort(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString('es-ES') + ' €';
}

/** Entero con separador de miles: 1.284 */
export function formatInt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString('es-ES');
}

/** Porcentaje con un decimal: 38,4 % */
export function formatPct(n: number, decimals = 1): string {
  return (
    (Number(n) || 0).toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + ' %'
  );
}
