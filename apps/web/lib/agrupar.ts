/**
 * Índice por clave en un solo recorrido.
 *
 * Sustituye al patrón `lista.filter(x => x.campo === y)` dentro de un `.map`,
 * que recorre la lista entera una vez por elemento del otro conjunto.
 */
export function agruparPor<T, K>(items: T[], clave: (item: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>();
  for (const item of items) {
    const k = clave(item);
    const grupo = mapa.get(k);
    if (grupo) grupo.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
}
