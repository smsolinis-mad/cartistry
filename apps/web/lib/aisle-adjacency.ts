// Utilidades de adyacencia entre muebles y pasillos dibujados.
// Mapea las "caras" semánticas del mueble (frontal/trasera/izquierda/derecha)
// a direcciones físicas (N/S/E/W) según la orientación de la entrada de la
// tienda, y comprueba si la cara está adyacente a una celda de pasillo.

import { parseRange, rangeCells } from './grid-pos';

export type FaceOrientation = 'entrada' | 'fondo' | 'izquierda' | 'derecha' | 'superior';
export type CaraName = 'frontal' | 'trasera' | 'izquierda' | 'derecha' | 'superior';

export interface Cell {
  col: number;
  row: number;
}

type Dir = 'N' | 'S' | 'E' | 'W';

/**
 * Convención de planos:
 * - Vista cenital con norte arriba.
 * - "entrada"/"superior": cliente entra por el sur del plano → frontal=S.
 * - "fondo": cliente entra por el norte del plano → frontal=N.
 * - "derecha": cliente entra por el este → frontal=E.
 * - "izquierda": cliente entra por el oeste → frontal=W.
 *
 * "izquierda" y "derecha" de la mueble son desde la perspectiva del cliente
 * que entra (su izquierda y derecha).
 */
function caraToDirection(cara: CaraName, entrada: FaceOrientation): Dir | null {
  if (cara === 'superior') return null;
  const tables: Record<FaceOrientation, Record<Exclude<CaraName, 'superior'>, Dir>> = {
    entrada:    { frontal: 'S', trasera: 'N', izquierda: 'W', derecha: 'E' },
    superior:   { frontal: 'S', trasera: 'N', izquierda: 'W', derecha: 'E' },
    fondo:      { frontal: 'N', trasera: 'S', izquierda: 'E', derecha: 'W' },
    derecha:    { frontal: 'E', trasera: 'W', izquierda: 'N', derecha: 'S' },
    izquierda:  { frontal: 'W', trasera: 'E', izquierda: 'S', derecha: 'N' },
  };
  return tables[entrada][cara];
}

/**
 * Mapea una cara semántica del mueble a una orientación absoluta (la que
 * usa el motor para hablar de visibilidad y posición). Útil para construir
 * el array `caras` que recibe el PositionScorer.
 */
export function caraToOrientation(cara: CaraName, entrada: FaceOrientation): FaceOrientation {
  if (cara === 'superior') return 'superior';
  const dir = caraToDirection(cara, entrada);
  if (!dir) return entrada;
  // Mapeo Dir → FaceOrientation absoluta del plano (siempre desde el cliente).
  const dirToOrient: Record<FaceOrientation, Record<Dir, FaceOrientation>> = {
    entrada:    { N: 'fondo', S: 'entrada', E: 'derecha', W: 'izquierda' },
    superior:   { N: 'fondo', S: 'entrada', E: 'derecha', W: 'izquierda' },
    fondo:      { N: 'entrada', S: 'fondo', E: 'izquierda', W: 'derecha' },
    derecha:    { N: 'izquierda', S: 'derecha', E: 'entrada', W: 'fondo' },
    izquierda:  { N: 'derecha', S: 'izquierda', E: 'fondo', W: 'entrada' },
  };
  return dirToOrient[entrada][dir];
}

/**
 * Devuelve true si la cara `cara` de un mueble con rango `rangoPos` está
 * adyacente a alguna celda de pasillo.
 */
export function caraTocaPasillo(
  rangoPos: string | null | undefined,
  cara: CaraName,
  pasillos: Cell[],
  entradaOrientacion: FaceOrientation
): boolean {
  if (cara === 'superior') return false; // el techo no se considera adyacente a pasillo
  const range = parseRange(rangoPos || undefined);
  if (!range) return false;
  const dir = caraToDirection(cara, entradaOrientacion);
  if (!dir) return false;

  const ocupadas = new Set(rangeCells(range).map((c) => `${c.col},${c.row}`));
  const pasilloSet = new Set(pasillos.map((c) => `${c.col},${c.row}`));

  for (const cell of rangeCells(range)) {
    const neighbor = neighborOf(cell, dir);
    const key = `${neighbor.col},${neighbor.row}`;
    if (pasilloSet.has(key) && !ocupadas.has(key)) return true;
  }
  return false;
}

function neighborOf(c: Cell, dir: Dir): Cell {
  if (dir === 'N') return { col: c.col, row: c.row - 1 };
  if (dir === 'S') return { col: c.col, row: c.row + 1 };
  if (dir === 'E') return { col: c.col + 1, row: c.row };
  return { col: c.col - 1, row: c.row };
}
