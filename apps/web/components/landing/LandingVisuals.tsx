'use client';

import { HEAT_HEX, HeatLegend, type Heat } from '@/components/ui';

/* ==========================================================================
   Piezas de la landing.

   Todas dibujan la misma figura que el producto: la rejilla de facings. Lo
   que se ve aquí es el planograma real reducido, no una ilustración.
   ========================================================================== */

/** Una balda del alzado: sus posiciones y su altura desde el suelo. */
interface Balda {
  alturaCm: number;
  posiciones: Heat[];
  /** Balda a la altura de los ojos. La regla ZV-07 la trata aparte. */
  oro?: boolean;
}

const GONDOLA: Balda[] = [
  { alturaCm: 160, posiciones: [1, 1, 0, 2, 1, 0] },
  { alturaCm: 130, posiciones: [4, 4, 3, 4, 2, 3], oro: true },
  { alturaCm: 80, posiciones: [2, 3, 4, 2, 3, 4] },
  { alturaCm: 30, posiciones: [0, 0, 1, 0, 0, 1] },
];

/**
 * Tesis de la portada: el alzado de una góndola con cada posición coloreada
 * por lo que vende. Se rellena en diagonal al cargar, como se repone un lineal.
 */
export function HeroPlanograma() {
  return (
    <figure className="bg-surface rounded-[3px] shadow-[inset_0_0_0_1px_var(--line)] overflow-hidden">
      <figcaption className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line">
        <span className="eyebrow">Góndola 01 · Castellana</span>
        <span className="eyebrow text-ink">26 reglas aplicadas</span>
      </figcaption>

      <div className="px-4 pt-5 pb-4">
        {GONDOLA.map((balda, r) => (
          <div key={balda.alturaCm} className="mb-4 last:mb-0">
            <div className="flex items-end gap-4">
              <div className="grid flex-1 grid-cols-6 gap-[3px]">
                {balda.posiciones.map((heat, c) => (
                  <span
                    key={c}
                    className="facing animate-facing-in aspect-[5/4]"
                    data-heat={heat}
                    style={{ animationDelay: `${(r * 2 + c) * 55 + 150}ms` }}
                  />
                ))}
              </div>
              {/* Cota, apoyada en el canto de la balda. */}
              <span className="w-[76px] shrink-0 text-right font-mono text-[11px] text-ink-2 tabular-nums leading-none pb-[3px]">
                {balda.alturaCm} cm
              </span>
            </div>

            {/* Canto de la balda. El de la zona de oro va en tinta. */}
            <div
              className="h-px mt-1.5 mr-[92px]"
              style={{ background: balda.oro ? 'var(--ink)' : 'var(--line)' }}
            />
            {balda.oro ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink mt-1.5 mr-[92px] text-right">
                ◆ Zona de oro
                <span className="hidden sm:inline"> · altura de los ojos</span>
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 border-t border-line divide-x divide-line">
        <Lectura etiqueta="Venta · 14 días" valor="5.331" unidad="€" />
        <Lectura etiqueta="Sell-through" valor="17" unidad="%" />
        <Lectura etiqueta="Capital parado" valor="17.653" unidad="€" />
      </div>

      <div className="px-4 py-3 border-t border-line">
        <HeatLegend />
      </div>
    </figure>
  );
}

function Lectura({
  etiqueta,
  valor,
  unidad,
}: {
  etiqueta: string;
  valor: string;
  unidad: string;
}) {
  return (
    <div className="px-4 py-3">
      <p className="eyebrow">{etiqueta}</p>
      <p className="metric text-[22px] text-ink mt-1.5">
        {valor}
        <span className="font-mono text-[12px] font-normal text-ink-3 ml-1 tracking-normal">
          {unidad}
        </span>
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Detalle del planograma: la misma rejilla con la ficha de una posición
 * abierta, tal y como se exporta al PDF de tienda.
 */
export function PlanogramaDetalle() {
  const filas: Heat[][] = [
    [1, 0, 2, 1, 0, 1],
    [4, 3, 4, 2, 3, 4],
    [2, 4, 3, 4, 2, 3],
    [0, 1, 0, 1, 0, 0],
  ];

  return (
    <figure className="bg-surface rounded-[3px] shadow-[inset_0_0_0_1px_var(--line)] overflow-hidden">
      <figcaption className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line">
        <span className="eyebrow">Planograma · exportable a PDF</span>
        <span className="eyebrow">24 posiciones</span>
      </figcaption>
      <div className="grid-paper p-4">
        <div className="grid grid-cols-6 gap-[3px]">
          {filas.flatMap((fila, r) =>
            fila.map((heat, c) => (
              <span key={`${r}-${c}`} className="facing aspect-[5/4]" data-heat={heat} />
            ))
          )}
        </div>
      </div>
      <dl className="border-t border-line divide-y divide-line">
        <FilaFicha termino="Posición" definicion="B3 · C2" />
        <FilaFicha termino="EAN" definicion="8412345678903" />
        <FilaFicha termino="Regla aplicada" definicion="ZV-07 · zona de oro" />
        <FilaFicha termino="Facings" definicion="3" />
      </dl>
    </figure>
  );
}

function FilaFicha({ termino, definicion }: { termino: string; definicion: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2">
      <dt className="eyebrow">{termino}</dt>
      <dd className="font-mono text-[12px] text-ink tabular-nums">{definicion}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** Panel de analítica: lecturas y reparto por categoría en escala de calor. */
export function PanelAnalitica() {
  const categorias = [
    { nombre: 'FASHION', pct: 54, valor: '8.185 €' },
    { nombre: 'WORK', pct: 29, valor: '4.470 €' },
    { nombre: 'PARTY', pct: 16, valor: '2.360 €' },
    { nombre: 'HOME', pct: 1, valor: '189 €' },
  ];

  return (
    <figure className="bg-surface rounded-[3px] shadow-[inset_0_0_0_1px_var(--line)] overflow-hidden">
      <figcaption className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line">
        <span className="eyebrow">Analítica · últimos 30 días</span>
        <span className="eyebrow">Castellana</span>
      </figcaption>

      <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
        <Lectura etiqueta="Sell-through" valor="17" unidad="%" />
        <Lectura etiqueta="Venta total" valor="5.331" unidad="€" />
        <Lectura etiqueta="Margen bruto" valor="15.204" unidad="€" />
      </div>

      <div className="p-4">
        <p className="eyebrow mb-3">Margen por categoría</p>
        <div className="space-y-2.5">
          {categorias.map((c) => (
            <div key={c.nombre} className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-ink-2 w-[68px] shrink-0">
                {c.nombre}
              </span>
              <div className="flex-1 h-2.5 bg-sunk rounded-[1px] overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.max(c.pct, 2)}%`,
                    background:
                      c.pct >= 50
                        ? HEAT_HEX[4]
                        : c.pct >= 25
                          ? HEAT_HEX[3]
                          : c.pct >= 10
                            ? HEAT_HEX[2]
                            : HEAT_HEX[0],
                  }}
                />
              </div>
              <span className="font-mono text-[11px] text-ink tabular-nums w-[64px] text-right shrink-0">
                {c.valor}
              </span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */

/** Factura: cierra el ciclo que empieza en la balda. */
export function PanelFactura() {
  const lineas = [
    { d: 'BACKPACK 13" Biscuit', q: 1, p: 150 },
    { d: 'NOTEBOOK A5 Black Red', q: 2, p: 58 },
    { d: 'PENCASE Medium Brown', q: 1, p: 42 },
  ];
  const subtotal = lineas.reduce((s, l) => s + l.q * l.p, 0);
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  return (
    <figure className="bg-surface rounded-[3px] shadow-[inset_0_0_0_1px_var(--line)] overflow-hidden">
      <figcaption className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line">
        <span className="eyebrow">Factura F-2026-0142</span>
        <span className="eyebrow">21/05/2026</span>
      </figcaption>

      <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
        <div className="px-4 py-3">
          <p className="eyebrow">Emisor</p>
          <p className="text-[13px] text-ink mt-1.5">Mi Marca S.L.</p>
          <p className="font-mono text-[11px] text-ink-3">CIF B12345678</p>
        </div>
        <div className="px-4 py-3">
          <p className="eyebrow">Cliente</p>
          <p className="text-[13px] text-ink mt-1.5">Cliente Boutique</p>
          <p className="font-mono text-[11px] text-ink-3">28013 · Madrid</p>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th className="eyebrow text-left font-normal px-4 py-2 border-b border-line">
              Producto
            </th>
            <th className="eyebrow text-right font-normal px-2 py-2 border-b border-line">
              Uds
            </th>
            <th className="eyebrow text-right font-normal px-4 py-2 border-b border-line">
              Importe
            </th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l) => (
            <tr key={l.d}>
              <td className="px-4 py-1.5 text-[12px] text-ink border-b border-line">{l.d}</td>
              <td className="px-2 py-1.5 text-[12px] text-right font-mono tabular-nums text-ink-2 border-b border-line">
                {l.q}
              </td>
              <td className="px-4 py-1.5 text-[12px] text-right font-mono tabular-nums text-ink border-b border-line">
                {(l.q * l.p).toFixed(2)} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="px-4 py-3 space-y-1 text-right">
        <p className="font-mono text-[11px] text-ink-3 tabular-nums">
          Subtotal {subtotal.toFixed(2)} €
        </p>
        <p className="font-mono text-[11px] text-ink-3 tabular-nums">
          IVA 21% {iva.toFixed(2)} €
        </p>
        <p className="metric text-[20px] text-ink pt-1">{total.toFixed(2)} €</p>
      </div>
    </figure>
  );
}
