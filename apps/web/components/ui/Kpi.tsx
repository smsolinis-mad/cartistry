import type { ReactNode } from 'react';
import { cx } from './cx';
import { Sparkbars } from './Facings';

/**
 * Lectura de instrumento: etiqueta pequeña arriba, cifra grande, y a la
 * derecha la evidencia (serie o variación). Sin iconos decorativos.
 */
export function Kpi({
  label,
  value,
  unit,
  delta,
  series,
  note,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  /** Variación en % respecto al periodo anterior. */
  delta?: number | null;
  series?: number[];
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'bg-surface rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] p-4',
        className
      )}
    >
      <p className="eyebrow">{label}</p>
      <div className="flex items-end justify-between gap-3 mt-3">
        <p className="metric text-[30px] text-ink">
          {value}
          {unit ? (
            <span className="font-mono text-[13px] font-normal text-ink-3 ml-1 tracking-normal">
              {unit}
            </span>
          ) : null}
        </p>
        {series && series.length > 1 ? <Sparkbars values={series} /> : null}
      </div>
      {delta !== undefined && delta !== null ? (
        <p
          className={cx(
            'font-mono text-[12px] mt-2 tabular-nums',
            delta > 0 ? 'text-positive' : delta < 0 ? 'text-danger' : 'text-ink-3'
          )}
        >
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta).toFixed(1)}%
          <span className="text-ink-3"> vs. periodo anterior</span>
        </p>
      ) : note ? (
        <p className="font-mono text-[12px] mt-2 text-ink-3">{note}</p>
      ) : null}
    </div>
  );
}

/** Fila de lecturas, separadas por filete en lugar de por hueco. */
export function KpiRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx('grid grid-cols-2 lg:grid-cols-4 gap-px bg-line', className)}
    >
      {children}
    </div>
  );
}
