import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cx } from './cx';

const CONTROL =
  'w-full h-10 px-3 bg-surface text-ink text-sm rounded-[2px] ' +
  'shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-ink-3 ' +
  'focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)] ' +
  'transition-shadow duration-150 disabled:bg-sunk disabled:text-ink-3';

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="eyebrow block text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(CONTROL, 'pr-8', className)} {...rest}>
      {children}
    </select>
  );
}
