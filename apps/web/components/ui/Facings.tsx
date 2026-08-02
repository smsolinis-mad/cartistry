import { cx } from './cx';

/**
 * Motivo firma del producto: la rejilla de facings.
 *
 * Es la misma figura en toda la aplicación — el planograma en la landing, el
 * indicador de un KPI, la ilustración de una pantalla vacía y el estado de
 * carga. Cada celda es una posición del lineal y su color es su rendimiento.
 */

export type Heat = 0 | 1 | 2 | 3 | 4 | 'empty';

export const HEAT_HEX: Record<Exclude<Heat, 'empty'>, string> = {
  0: '#1F4E79',
  1: '#5B93B5',
  2: '#D9D3BC',
  3: '#E0A03C',
  4: '#C2402F',
};

/** Traduce un porcentaje 0–100 a un peldaño de la escala. */
export function heatFrom(pct: number): Exclude<Heat, 'empty'> {
  if (pct >= 80) return 4;
  if (pct >= 60) return 3;
  if (pct >= 40) return 2;
  if (pct >= 20) return 1;
  return 0;
}

export function Facing({
  heat,
  className,
  title,
}: {
  heat: Heat;
  className?: string;
  title?: string;
}) {
  return <span className={cx('facing', className)} data-heat={heat} title={title} />;
}

/**
 * Rejilla de posiciones. `rows` es una matriz de peldaños de calor; cada fila
 * es una balda y se dibuja de arriba abajo tal cual se pasa.
 */
export function FacingGrid({
  rows,
  cell = 18,
  className,
  animate = false,
}: {
  rows: Heat[][];
  cell?: number;
  className?: string;
  animate?: boolean;
}) {
  const cols = rows[0]?.length ?? 0;
  return (
    <div
      className={cx('facing-grid', className)}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
        gridAutoRows: `${cell}px`,
      }}
      aria-hidden
    >
      {rows.flatMap((row, r) =>
        row.map((heat, c) => (
          <span
            key={`${r}-${c}`}
            className={cx('facing', animate && 'animate-facing-in')}
            data-heat={heat}
            /* La rejilla se rellena en diagonal, como se repone un lineal. */
            style={animate ? { animationDelay: `${(r + c) * 45}ms` } : undefined}
          />
        ))
      )}
    </div>
  );
}

/** Leyenda de la escala. Se muestra siempre que se muestre calor. */
export function HeatLegend({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <span className="eyebrow">Parado</span>
      <div className="flex gap-[2px]" aria-hidden>
        {([0, 1, 2, 3, 4] as const).map((h) => (
          <span
            key={h}
            className="h-2.5 w-5 rounded-[1px]"
            style={{ background: HEAT_HEX[h] }}
          />
        ))}
      </div>
      <span className="eyebrow">Best seller</span>
    </div>
  );
}

/**
 * Micro-serie para KPIs: barras verticales en la escala de calor.
 * Los valores se normalizan contra el máximo de la serie.
 */
export function Sparkbars({
  values,
  className,
  height = 20,
}: {
  values: number[];
  className?: string;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  return (
    <div
      className={cx('flex items-end gap-[2px]', className)}
      style={{ height }}
      aria-hidden
    >
      {values.map((v, i) => {
        const pct = (v / max) * 100;
        return (
          <span
            key={i}
            className="w-[3px] rounded-[1px]"
            style={{
              height: `${Math.max(pct, 6)}%`,
              background: HEAT_HEX[heatFrom(pct)],
            }}
          />
        );
      })}
    </div>
  );
}
