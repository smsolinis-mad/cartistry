import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cx } from './cx';

/**
 * Tabla de datos. Sin cebra ni bordes verticales: solo el canto de balda
 * entre filas. Las cifras van en mono y alineadas a la derecha.
 */
export function DataTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'bg-surface rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] overflow-x-auto',
        className
      )}
    >
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

export function Th({
  children,
  numeric,
  className,
  ...rest
}: { children?: ReactNode; numeric?: boolean } & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cx(
        'eyebrow text-left font-normal px-4 py-2.5 border-b border-line whitespace-nowrap bg-surface',
        numeric && 'text-right',
        className
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numeric,
  className,
  ...rest
}: { children?: ReactNode; numeric?: boolean } & TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cx(
        'px-4 py-2.5 border-b border-line text-ink align-middle',
        numeric && 'text-right font-mono tabular-nums',
        className
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cx('hover:bg-paper/60 transition-colors', className)}>
      {children}
    </tr>
  );
}
