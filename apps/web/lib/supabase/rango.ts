/**
 * Acota una consulta de ventas al rango que se está mirando.
 *
 * Sin esto, las páginas de analítica se traían el histórico entero de ventas
 * y descartaban en el navegador todo lo que caía fuera del periodo.
 */
export function rangoDeFechas<
  Q extends { gte(columna: string, valor: string): Q; lte(columna: string, valor: string): Q },
>(consulta: Q, desde?: string, hasta?: string): Q {
  let q = consulta;
  if (desde) q = q.gte('fecha', desde);
  if (hasta) q = q.lte('fecha', hasta);
  return q;
}
