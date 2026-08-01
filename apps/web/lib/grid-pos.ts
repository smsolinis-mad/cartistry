// Utilidades para parsear y validar la posición de un mueble en la cuadrícula.
// Acepta tanto celda única (`A1`) como rango (`A1:C2`).

export interface CellCoord {
  col: number; // 0-indexed
  row: number; // 0-indexed
}

export interface GridRange {
  start: CellCoord;
  end: CellCoord;
  isRange: boolean;
}

const POS_REGEX = /^[A-Z]+\d+(:[A-Z]+\d+)?$/;

export function isValidPosition(pos: string): boolean {
  if (!pos) return true; // vacío es válido (sin asignar)
  const trimmed = pos.trim().toUpperCase();
  if (!POS_REGEX.test(trimmed)) return false;
  const r = parseRange(trimmed);
  if (!r) return false;
  return r.start.col <= r.end.col && r.start.row <= r.end.row;
}

export function letterToCol(letters: string): number {
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return col - 1; // 0-indexed
}

export function columnLetter(i: number): string {
  let n = i;
  let s = '';
  while (true) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return s;
}

export function parseCell(token: string): CellCoord | null {
  const m = token.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  const col = letterToCol(m[1]);
  const row = parseInt(m[2], 10) - 1;
  if (col < 0 || row < 0) return null;
  return { col, row };
}

export function parseRange(pos: string | null | undefined): GridRange | null {
  if (!pos) return null;
  const trimmed = String(pos).trim().toUpperCase();
  if (!POS_REGEX.test(trimmed)) return null;
  const [startStr, endStr] = trimmed.split(':');
  const start = parseCell(startStr);
  if (!start) return null;
  if (!endStr) {
    return { start, end: start, isRange: false };
  }
  const end = parseCell(endStr);
  if (!end) return null;
  return { start, end, isRange: true };
}

export function buildRangeString(start: CellCoord, end: CellCoord): string {
  // Normaliza para que `start` siempre quede arriba-izquierda.
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const s = `${columnLetter(minCol)}${minRow + 1}`;
  const e = `${columnLetter(maxCol)}${maxRow + 1}`;
  return minCol === maxCol && minRow === maxRow ? s : `${s}:${e}`;
}

export function rangeCells(r: GridRange): CellCoord[] {
  const out: CellCoord[] = [];
  for (let row = r.start.row; row <= r.end.row; row++) {
    for (let col = r.start.col; col <= r.end.col; col++) {
      out.push({ col, row });
    }
  }
  return out;
}
