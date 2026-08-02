import { cx } from '@/components/ui';

/**
 * Marca: tres posiciones de un lineal, una de ellas caliente. Es la unidad
 * mínima del motivo que recorre toda la aplicación.
 */
export function Wordmark({
  className,
  tone = 'ink',
}: {
  className?: string;
  tone?: 'ink' | 'inverse';
}) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <span className="grid grid-cols-3 gap-[2px]" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="h-[7px] w-[7px] rounded-[1px]"
            style={{
              background:
                i === 4
                  ? '#C2402F'
                  : tone === 'inverse'
                    ? 'rgb(255 255 255 / 0.32)'
                    : 'rgb(21 23 26 / 0.22)',
            }}
          />
        ))}
      </span>
      <span
        className={cx(
          'font-display font-bold text-[17px] tracking-tighter',
          tone === 'inverse' ? 'text-surface' : 'text-ink'
        )}
      >
        Cartistry
      </span>
    </span>
  );
}
