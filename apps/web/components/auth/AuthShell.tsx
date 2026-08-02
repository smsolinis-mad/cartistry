import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/landing/Wordmark';
import type { Heat } from '@/components/ui';

/** Alzado en reposo: el mismo motivo del producto, en negativo. */
const MURO: Heat[][] = [
  [1, 0, 2, 1, 0, 1, 2, 0],
  [4, 3, 4, 2, 3, 4, 3, 2],
  [2, 4, 3, 4, 2, 3, 4, 3],
  [0, 1, 0, 1, 0, 0, 1, 0],
];

/**
 * Marco de las pantallas de acceso: el formulario a la izquierda sobre papel,
 * el lineal a la derecha sobre tinta. Es el único momento oscuro del producto.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm mx-auto">
          <Link href="/" className="inline-block">
            <Wordmark />
          </Link>

          <h1 className="font-display font-bold text-[30px] leading-[1.05] tracking-tightest mt-10">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-ink-2 mt-2.5 text-pretty">{description}</p>
          ) : null}

          <div className="shelf-rule my-7" />

          {children}

          <div className="mt-8 text-[13px] text-ink-2">{footer}</div>
        </div>
      </div>

      <aside className="hidden lg:flex flex-col justify-between bg-ink p-12 overflow-hidden">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
          Góndola 01 · Castellana
        </p>

        <div className="my-10">
          <div className="grid grid-cols-8 gap-[3px] max-w-md">
            {MURO.flatMap((fila, r) =>
              fila.map((heat, c) => (
                <span
                  key={`${r}-${c}`}
                  className="facing aspect-[5/4] animate-facing-in"
                  data-heat={heat}
                  style={{ animationDelay: `${(r + c) * 45}ms` }}
                />
              ))
            )}
          </div>
          <p className="font-display font-semibold text-[26px] leading-[1.15] tracking-tighter text-surface mt-10 max-w-sm">
            Cada posición del lineal tiene un color y una razón.
          </p>
          <p className="text-sm text-white/55 mt-3 max-w-sm">
            Azul es capital parado. Rojo es lo que se vende solo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
            Parado
          </span>
          <div className="flex gap-[2px]" aria-hidden>
            {['#1F4E79', '#5B93B5', '#D9D3BC', '#E0A03C', '#C2402F'].map((c) => (
              <span key={c} className="h-2.5 w-5 rounded-[1px]" style={{ background: c }} />
            ))}
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
            Best seller
          </span>
        </div>
      </aside>
    </main>
  );
}
