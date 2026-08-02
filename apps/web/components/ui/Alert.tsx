import type { ReactNode } from 'react';
import { cx } from './cx';

type Tone = 'danger' | 'signal' | 'positive' | 'neutral';

const TONES: Record<Tone, string> = {
  danger: 'shadow-[inset_0_0_0_1px_#C2402F] bg-[#fbecea] text-[#7d251b]',
  signal: 'shadow-[inset_0_0_0_1px_#E0A03C] bg-[#fdf4e4] text-[#7a5410]',
  positive: 'shadow-[inset_0_0_0_1px_#2F6F5E] bg-[#e9f2ef] text-[#1d463c]',
  neutral: 'shadow-[inset_0_0_0_1px_var(--line)] bg-surface text-ink-2',
};

/**
 * Mensaje del sistema. Dice qué ha pasado y qué hacer; no pide disculpas.
 */
export function Alert({
  tone = 'danger',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('px-3 py-2.5 rounded-[2px] text-sm', TONES[tone], className)}
    >
      {children}
    </div>
  );
}
