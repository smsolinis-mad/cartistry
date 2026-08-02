import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * Cabecera de página del dashboard. La etiqueta en mono dice dónde estás
 * dentro del producto; el título dice qué es esta pantalla.
 */
export function PageHeader({
  label,
  title,
  description,
  actions,
  className,
}: {
  label?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx('mb-8', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {label ? <p className="eyebrow mb-2">{label}</p> : null}
          <h1 className="font-display font-bold text-[28px] leading-[1.05] tracking-tightest text-ink">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-ink-2 mt-2 max-w-xl text-pretty">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>
      <div className="shelf-rule mt-5" />
    </header>
  );
}
