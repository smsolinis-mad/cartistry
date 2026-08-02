import type { ReactNode } from 'react';
import { cx } from './cx';
import { FacingGrid, type Heat } from './Facings';

/** Un lineal sin surtido: todas las posiciones existen, ninguna está ocupada. */
const VACIO: Heat[][] = Array.from({ length: 3 }, () =>
  Array.from({ length: 8 }, () => 'empty' as Heat)
);

/**
 * Pantalla vacía. No se disculpa ni explica el vacío: dice qué hacer ahora.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'bg-surface rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] px-6 py-12 text-center',
        className
      )}
    >
      <FacingGrid rows={VACIO} cell={16} className="justify-center mx-auto w-fit" />
      <h3 className="font-display font-semibold text-lg text-ink mt-6">{title}</h3>
      {description ? (
        <p className="text-sm text-ink-2 mt-1.5 max-w-sm mx-auto text-pretty">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Estado de carga: las posiciones se van rellenando. */
export function LoadingBlock({
  label = 'Cargando',
  rows = 4,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cx('space-y-2', className)} role="status" aria-live="polite">
      <p className="eyebrow">{label}</p>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-10 rounded-[2px]" />
      ))}
    </div>
  );
}
