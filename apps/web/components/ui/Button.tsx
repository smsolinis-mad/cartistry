import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[2px] font-medium ' +
  'transition-colors duration-150 whitespace-nowrap ' +
  'disabled:opacity-40 disabled:pointer-events-none';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-surface hover:bg-[#282c33]',
  secondary:
    'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk',
  ghost: 'text-ink-2 hover:text-ink hover:bg-sunk',
  danger: 'bg-danger text-white hover:bg-[#a83527]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cx(BASE, VARIANTS[variant], SIZES[size], className)}
    >
      {children}
    </Link>
  );
}
