import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * Etiqueta de estado. Neutro es el estado por defecto: el sistema solo se
 * enciende cuando hay algo que atender.
 */
type Tone = 'neutral' | 'signal' | 'danger' | 'positive' | 'cold';

const TONES: Record<Tone, string> = {
  neutral: 'text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] bg-surface',
  signal: 'text-[#8a5f11] shadow-[inset_0_0_0_1px_#E0A03C] bg-[#fdf4e4]',
  danger: 'text-[#8f2b1f] shadow-[inset_0_0_0_1px_#C2402F] bg-[#fbecea]',
  positive: 'text-[#215045] shadow-[inset_0_0_0_1px_#2F6F5E] bg-[#e9f2ef]',
  cold: 'text-[#1F4E79] shadow-[inset_0_0_0_1px_#5B93B5] bg-[#eaf1f7]',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center h-[22px] px-2 rounded-[2px] font-mono text-[11px] uppercase tracking-[0.08em]',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
