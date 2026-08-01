// Estado de la caja (abierta/cerrada). De momento persistido en el navegador.
// La caja debe estar abierta para poder cobrar en /dashboard/ventas/caja.

const KEY = 'caja_abierta';

export function isCajaAbierta(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEY) === '1';
}

export function abrirCaja() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, '1');
}

export function cerrarCaja() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
