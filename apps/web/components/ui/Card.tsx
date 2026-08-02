import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * Superficie del sistema: blanco de balda con filete, sin sombra difusa.
 */
export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag
      className={cx(
        'bg-surface rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)]',
        className
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Cabecera de panel: etiqueta en mono a la izquierda, controles a la derecha,
 * separada del contenido por el canto de balda.
 */
export function CardHeader({
  label,
  title,
  actions,
  className,
}: {
  label?: string;
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex items-baseline justify-between gap-4 px-4 py-3 border-b border-line',
        className
      )}
    >
      <div className="min-w-0">
        {label ? <p className="eyebrow">{label}</p> : null}
        {title ? (
          <h3 className="font-display font-semibold text-[15px] text-ink mt-1 truncate">
            {title}
          </h3>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
