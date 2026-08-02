'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

// El motor de PDF pesa ~550 kB: se carga al pulsar, no al abrir la página.
const BlankGridPdfLink = dynamic(() => import('./BlankGridPdfLink'), {
  ssr: false,
  loading: () => (
    <span className="inline-flex items-center h-8 px-3 rounded-[2px] text-[13px] font-medium bg-sunk text-ink-3">
      Generando…
    </span>
  ),
});
import {
  columnLetter,
  parseRange,
  buildRangeString,
  rangeCells,
  type GridRange,
} from '@/lib/grid-pos';

export interface StoreGridMueble {
  id: string;
  nombre: string;
  posicion_cuadricula?: string | null;
  tipo?: 'gondola' | 'corner' | 'mostrador' | string;
  es_escaparate?: boolean;
  es_zona_caja?: boolean;
  da_pasillo_principal?: boolean;
}

export interface StoreGridLayoutProps {
  storeName: string;
  cols: number;
  rows: number;
  muebles: StoreGridMueble[];
  editingMuebleId?: string | null;
  pendingPosicion?: string | null;
  /** Lista de celdas marcadas como pasillo. */
  pasillos?: Array<{ col: number; row: number }>;
  /** Click normal = celda única. Shift+click = extender rango desde origen actual. */
  onCellClick?: (pos: string, opts: { shift: boolean }) => void;
  onSizeChange?: (cols: number, rows: number) => void;
  /** Llamado cuando el usuario alterna una celda como pasillo (modo dibujar). */
  onTogglePasillo?: (cell: { col: number; row: number }) => void;
}

const MAX_COLS = 12;
const MAX_ROWS = 12;

function tipoChipColor(tipo?: string): { bg: string; fg: string; border: string } {
  if (tipo === 'mostrador') return { bg: '#F6E3E1', fg: '#7A1F1C', border: '#B0413E' };
  if (tipo === 'corner') return { bg: '#EFE0C9', fg: '#7A5D38', border: '#9A7B4F' };
  return { bg: '#EEF4EF', fg: '#1F3D2D', border: '#3F7D5A' };
}

interface PlacedMueble {
  mueble: StoreGridMueble;
  range: GridRange;
  isEditing: boolean;
  overlapping: boolean;
}

export function StoreGridLayout({
  storeName,
  cols,
  rows,
  muebles,
  editingMuebleId,
  pendingPosicion,
  pasillos = [],
  onCellClick,
  onSizeChange,
  onTogglePasillo,
}: StoreGridLayoutProps) {
  const [drawMode, setDrawMode] = useState(false);

  // Set rápida de celdas de pasillo y detección de conflictos pasillo↔mueble.
  const pasilloSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of pasillos) s.add(`${c.col},${c.row}`);
    return s;
  }, [pasillos]);
  // 1) Calcular el rango efectivo de cada mueble (BD o pendingPosicion si está editando).
  const placed: PlacedMueble[] = useMemo(() => {
    return muebles
      .map((m) => {
        const effectivePos =
          m.id === editingMuebleId && pendingPosicion !== undefined
            ? pendingPosicion
            : m.posicion_cuadricula;
        const range = parseRange(effectivePos || undefined);
        if (!range) return null;
        // Clamp dentro de los límites del grid actual.
        if (range.start.col >= cols || range.start.row >= rows) return null;
        const clamped: GridRange = {
          start: range.start,
          end: {
            col: Math.min(range.end.col, cols - 1),
            row: Math.min(range.end.row, rows - 1),
          },
          isRange: range.isRange,
        };
        return {
          mueble: m,
          range: clamped,
          isEditing: m.id === editingMuebleId,
          overlapping: false,
        };
      })
      .filter((x): x is PlacedMueble => x !== null);
  }, [muebles, editingMuebleId, pendingPosicion, cols, rows]);

  // 2) Detectar solapamientos celda a celda.
  const overlapCells = useMemo(() => {
    const cov = new Map<string, string[]>(); // cellKey → muebleIds
    const overlaps = new Set<string>();
    for (const p of placed) {
      for (const cell of rangeCells(p.range)) {
        const key = `${cell.col},${cell.row}`;
        const list = cov.get(key) || [];
        list.push(p.mueble.id);
        cov.set(key, list);
        if (list.length > 1) overlaps.add(key);
      }
    }
    return overlaps;
  }, [placed]);

  const hasOverlaps = overlapCells.size > 0;

  // 3) Mapa de orígenes: cellKey → PlacedMueble (solo en la esquina superior-izquierda).
  const originByCell = useMemo(() => {
    const m = new Map<string, PlacedMueble>();
    for (const p of placed) {
      const key = `${p.range.start.col},${p.range.start.row}`;
      m.set(key, {
        ...p,
        overlapping: rangeCells(p.range).some((c) =>
          overlapCells.has(`${c.col},${c.row}`)
        ),
      });
    }
    return m;
  }, [placed, overlapCells]);

  // 4) Celdas "absorbidas" por un mueble (no origen) — no renderizamos celda vacía ahí.
  const absorbed = useMemo(() => {
    const set = new Set<string>();
    for (const p of placed) {
      for (const cell of rangeCells(p.range)) {
        const key = `${cell.col},${cell.row}`;
        if (key !== `${p.range.start.col},${p.range.start.row}`) set.add(key);
      }
    }
    return set;
  }, [placed]);

  const fileName = `cuadricula_${(storeName || 'tienda').replace(/\s+/g, '_')}_${cols}x${rows}.pdf`;

  // CSS Grid: 1 columna extra a la izquierda para números, 1 fila extra arriba para letras.
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `36px repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `28px repeat(${rows}, minmax(60px, 1fr))`,
    gap: '4px',
  };

  return (
    <div className="bg-cartistry-bg border border-cartistry-border rounded p-4">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h4 className="font-serif font-bold text-cartistry-text">
            Cuadrícula de tienda
          </h4>
          <p className="text-xs text-cartistry-text-secondary">
            {drawMode
              ? '✏️ Modo dibujar pasillo: haz click en una celda para marcarla / desmarcarla.'
              : editingMuebleId
                ? '📍 Haz click en una celda para fijar la esquina. Shift+click para extender el rango (p. ej. A1:C2).'
                : 'Edita un mueble para asignar su posición con un click.'}
          </p>
          <div className="mt-2 inline-flex gap-1 rounded border border-cartistry-border bg-white p-0.5">
            <button
              type="button"
              onClick={() => setDrawMode(false)}
              className={`px-2 py-0.5 text-[11px] rounded transition ${
                !drawMode
                  ? 'bg-cartistry-text text-cartistry-bg'
                  : 'text-cartistry-text-secondary hover:text-cartistry-text'
              }`}
            >
              Muebles
            </button>
            <button
              type="button"
              onClick={() => setDrawMode(true)}
              className={`px-2 py-0.5 text-[11px] rounded transition ${
                drawMode
                  ? 'bg-cartistry-text text-cartistry-bg'
                  : 'text-cartistry-text-secondary hover:text-cartistry-text'
              }`}
            >
              ✏️ Pasillo
            </button>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-[10px] text-cartistry-text-secondary uppercase tracking-wider">
              Columnas
            </label>
            <input
              type="number"
              min={1}
              max={MAX_COLS}
              value={cols}
              onChange={(e) => {
                const v = Math.min(MAX_COLS, Math.max(1, parseInt(e.target.value || '1')));
                onSizeChange?.(v, rows);
              }}
              className="w-16 px-2 py-1 border border-cartistry-border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] text-cartistry-text-secondary uppercase tracking-wider">
              Filas
            </label>
            <input
              type="number"
              min={1}
              max={MAX_ROWS}
              value={rows}
              onChange={(e) => {
                const v = Math.min(MAX_ROWS, Math.max(1, parseInt(e.target.value || '1')));
                onSizeChange?.(cols, v);
              }}
              className="w-16 px-2 py-1 border border-cartistry-border rounded text-sm"
            />
          </div>
          <BlankGridPdfLink
            storeName={storeName}
            cols={cols}
            rows={rows}
            fileName={fileName}
          />
        </div>
      </div>

      {hasOverlaps && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-300 rounded text-xs text-red-800">
          Hay celdas con dos o más muebles solapados. Reasigna alguna posición para evitar conflictos.
        </div>
      )}

      <div style={gridStyle} className="select-none">
        {/* Esquina (1,1) */}
        <div style={{ gridColumn: 1, gridRow: 1 }} />

        {/* Cabecera columnas */}
        {Array.from({ length: cols }).map((_, c) => (
          <div
            key={`hc-${c}`}
            style={{ gridColumn: c + 2, gridRow: 1 }}
            className="text-center text-xs font-bold text-cartistry-text-secondary py-1"
          >
            {columnLetter(c)}
          </div>
        ))}

        {/* Cabecera filas */}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={`hr-${r}`}
            style={{ gridColumn: 1, gridRow: r + 2 }}
            className="text-center text-xs font-bold text-cartistry-text-secondary self-center"
          >
            {r + 1}
          </div>
        ))}

        {/* Celdas vacías (las no absorbidas y no origen de un mueble) */}
        {(() => {
          const empties: React.ReactNode[] = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const key = `${c},${r}`;
              if (originByCell.has(key)) continue;
              if (absorbed.has(key)) continue;
              const pos = `${columnLetter(c)}${r + 1}`;
              const isPasillo = pasilloSet.has(key);
              const isPendingHover = pendingPosicion && pendingPosicion.toUpperCase() === pos;

              const clickable = drawMode || !!editingMuebleId;

              const baseBg = isPasillo
                ? 'repeating-linear-gradient(45deg, #d9d0c2 0 4px, #ece4d4 4px 8px)'
                : 'white';

              empties.push(
                <button
                  type="button"
                  key={`e-${c}-${r}`}
                  style={{
                    gridColumn: c + 2,
                    gridRow: r + 2,
                    background: baseBg,
                    borderColor: isPasillo ? '#9A8F7D' : '#DDD4C5',
                  }}
                  className={`border rounded text-[10px] transition ${
                    isPasillo ? 'text-[#6b6256]' : 'text-cartistry-text-secondary/50'
                  } ${
                    clickable
                      ? 'cursor-pointer hover:ring-2 hover:ring-cartistry-accent'
                      : 'cursor-default'
                  } ${isPendingHover ? 'ring-2 ring-cartistry-accent' : ''}`}
                  onClick={(e) => {
                    if (drawMode) {
                      onTogglePasillo?.({ col: c, row: r });
                    } else {
                      onCellClick?.(pos, { shift: e.shiftKey });
                    }
                  }}
                  disabled={!clickable}
                  title={isPasillo ? `${pos} · pasillo` : pos}
                >
                  {isPasillo ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="font-bold text-[9px]">PSLO</span>
                      <span className="text-[8px] opacity-70">{pos}</span>
                    </div>
                  ) : (
                    pos
                  )}
                </button>
              );
            }
          }
          return empties;
        })()}

        {/* Muebles (orígenes) con span */}
        {Array.from(originByCell.entries()).map(([, p]) => {
          const colors = tipoChipColor(p.mueble.tipo);
          const startC = p.range.start.col + 2;
          const startR = p.range.start.row + 2;
          const spanC = p.range.end.col - p.range.start.col + 1;
          const spanR = p.range.end.row - p.range.start.row + 1;
          const pos = buildRangeString(p.range.start, p.range.end);
          const isClickable = !!editingMuebleId;
          return (
            <button
              type="button"
              key={`m-${p.mueble.id}`}
              onClick={(e) =>
                onCellClick?.(
                  `${columnLetter(p.range.start.col)}${p.range.start.row + 1}`,
                  { shift: e.shiftKey }
                )
              }
              disabled={!isClickable && !p.isEditing}
              style={{
                gridColumn: `${startC} / span ${spanC}`,
                gridRow: `${startR} / span ${spanR}`,
                background: colors.bg,
                color: colors.fg,
                borderColor: p.overlapping ? '#B0413E' : colors.border,
                borderWidth: p.overlapping ? 2 : 1,
                borderStyle: p.overlapping ? 'dashed' : 'solid',
              }}
              className={`rounded text-[11px] leading-tight p-2 text-left transition ${
                isClickable ? 'cursor-pointer hover:ring-2 hover:ring-cartistry-accent' : ''
              } ${p.isEditing ? 'ring-2 ring-cartistry-accent ring-offset-1' : ''}`}
              title={`${p.mueble.nombre} · ${pos}${p.overlapping ? ' (solapado)' : ''}`}
            >
              <div className="font-bold truncate">{p.mueble.nombre}</div>
              <div className="text-[9px] opacity-70 font-mono">{pos}</div>
              {p.mueble.es_escaparate && (
                <div className="text-[8px] mt-0.5">escaparate</div>
              )}
              {p.mueble.es_zona_caja && (
                <div className="text-[8px] mt-0.5">caja</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 mt-3 text-[10px] text-cartistry-text-secondary flex-wrap">
        <span>
          <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: '#EEF4EF', border: '1px solid #3F7D5A' }} />
          Góndola
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: '#EFE0C9', border: '1px solid #9A7B4F' }} />
          Corner
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: '#F6E3E1', border: '1px solid #B0413E' }} />
          Mostrador / Caja
        </span>
        <span>
          <span
            className="inline-block w-3 h-3 rounded-sm align-middle mr-1"
            style={{
              background:
                'repeating-linear-gradient(45deg, #d9d0c2 0 2px, #ece4d4 2px 4px)',
              border: '1px solid #9A8F7D',
            }}
          />
          Pasillo
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1 border-2 border-dashed" style={{ borderColor: '#B0413E', background: 'white' }} />
          Solapamiento
        </span>
      </div>
    </div>
  );
}
