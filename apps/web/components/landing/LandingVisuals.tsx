'use client';

import Link from 'next/link';

// Pequeño mapa de calor (4 columnas × 4 filas) que reproduce visualmente la
// salida del planograma real: borde de color por rendimiento + banda dorada
// en eye-level. Mismo color-coding que el informe PDF.
export function PlanogramHeatmap() {
  // Cada celda: [borderColor, bg, style] · 'g'=goldenshelf marker
  const cells: Array<{
    border: string;
    bg: string;
    dashed?: boolean;
    arrow?: boolean;
  }> = [
    { border: '#c9b48d', bg: '#faf8f4' },
    { border: '#c9b48d', bg: '#faf8f4' },
    { border: '#c9b48d', bg: '#faf8f4' },
    { border: '#3f7d5a', bg: '#eef4ef' },
    // golden row
    { border: '#3f7d5a', bg: '#eef4ef' },
    { border: '#3f7d5a', bg: '#eef4ef' },
    { border: '#c9892f', bg: '#faf3e6', dashed: true },
    { border: '#c9b48d', bg: '#faf8f4' },
    // bottom rows
    { border: '#9a7b4f', bg: '#f5efe4' },
    { border: '#3f7d5a', bg: '#eef4ef' },
    { border: '#b0413e', bg: '#f6e3e1' },
    { border: '#b0413e', bg: '#f6e3e1' },
  ];

  // Insertamos la fila dorada como banner entre celdas índice 4 y 5
  return (
    <div className="bg-white rounded-lg border border-cartistry-border p-4 shadow-sm">
      <div className="flex justify-between items-center text-[10px] tracking-wider text-cartistry-text-secondary mb-2.5">
        <span className="font-semibold">MAPA DE CALOR / GÓNDOLA 1</span>
        <span style={{ color: '#9a7b4f' }} className="font-medium">aumentar ventas</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {/* Fila superior */}
        {cells.slice(0, 4).map((c, i) => (
          <div
            key={`top-${i}`}
            style={{
              borderColor: c.border,
              background: c.bg,
              borderStyle: c.dashed ? 'dashed' : 'solid',
              aspectRatio: '1.2 / 1',
            }}
            className="border-2 rounded"
          />
        ))}
        <div
          className="col-span-4 text-center text-[8px] italic font-medium py-1 border-y border-dashed"
          style={{ color: '#3f7d5a', borderColor: '#cdbfa9' }}
        >
          ★ ZONA DORADA · eye-level
        </div>
        {cells.slice(4, 8).map((c, i) => (
          <div
            key={`mid-${i}`}
            style={{
              borderColor: c.border,
              background: c.bg,
              borderStyle: c.dashed ? 'dashed' : 'solid',
              aspectRatio: '1.2 / 1',
            }}
            className="border-2 rounded"
          />
        ))}
        {cells.slice(8).map((c, i) => (
          <div
            key={`bot-${i}`}
            style={{
              borderColor: c.border,
              background: c.bg,
              borderStyle: c.dashed ? 'dashed' : 'solid',
              aspectRatio: '1.2 / 1',
            }}
            className="border-2 rounded"
          />
        ))}
      </div>
      <div className="flex justify-between border-t border-cartistry-border mt-2.5 pt-2.5">
        <div>
          <div className="font-serif font-bold text-base text-cartistry-text leading-none">€5.331</div>
          <div className="text-[8px] mt-0.5" style={{ color: '#3f7d5a' }}>venta</div>
        </div>
        <div>
          <div className="font-serif font-bold text-base text-cartistry-text leading-none">17%</div>
          <div className="text-[8px] mt-0.5" style={{ color: '#b0413e' }}>sell-through</div>
        </div>
        <div>
          <div className="font-serif font-bold text-base text-cartistry-text leading-none">€17.653</div>
          <div className="text-[8px] mt-0.5" style={{ color: '#9a7b4f' }}>liberable</div>
        </div>
      </div>
    </div>
  );
}

// Versión grande del heatmap con producto en cada celda (placeholder visual de
// pantalla real del planograma con imágenes). Se usa en la sección 01 · Visual.
export function PlanogramSection() {
  const cells: Array<{ border: string; bg: string; dashed?: boolean }> = [
    { border: '#c9b48d', bg: '#faf8f4' },
    { border: '#c9b48d', bg: '#faf8f4' },
    { border: '#c9b48d', bg: '#faf8f4' },
    { border: '#3f7d5a', bg: '#eef4ef' },
    { border: '#3f7d5a', bg: '#eef4ef' },
    { border: '#3f7d5a', bg: '#eef4ef' },
    { border: '#c9892f', bg: '#faf3e6', dashed: true },
    { border: '#c9b48d', bg: '#faf8f4' },
    { border: '#9a7b4f', bg: '#f5efe4' },
    { border: '#3f7d5a', bg: '#eef4ef' },
    { border: '#b0413e', bg: '#f6e3e1' },
    { border: '#b0413e', bg: '#f6e3e1' },
  ];
  return (
    <div className="bg-white rounded-lg border border-cartistry-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-cartistry-border bg-cartistry-bg flex justify-between text-[10px] tracking-wider">
        <span className="font-bold text-cartistry-text-secondary">PLANOGRAMA · CASTELLANA / GÓNDOLA 1</span>
        <span style={{ color: '#9a7b4f' }} className="font-medium">26 reglas aplicadas</span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-4 gap-2">
          {cells.slice(0, 4).map((c, i) => (
            <div
              key={`r1-${i}`}
              style={{ borderColor: c.border, background: c.bg, borderStyle: c.dashed ? 'dashed' : 'solid', aspectRatio: '1.25 / 1' }}
              className="border-2 rounded flex items-center justify-center"
            >
              <div className="w-3/5 h-3/5 rounded bg-white/70" />
            </div>
          ))}
          <div className="col-span-4 text-center text-[9px] italic font-medium py-1.5 border-y border-dashed" style={{ color: '#3f7d5a', borderColor: '#cdbfa9' }}>
            ★ ZONA DORADA · eye-level
          </div>
          {cells.slice(4, 8).map((c, i) => (
            <div
              key={`r2-${i}`}
              style={{ borderColor: c.border, background: c.bg, borderStyle: c.dashed ? 'dashed' : 'solid', aspectRatio: '1.25 / 1' }}
              className="border-2 rounded flex items-center justify-center"
            >
              <div className="w-3/5 h-3/5 rounded bg-white/70" />
            </div>
          ))}
          {cells.slice(8).map((c, i) => (
            <div
              key={`r3-${i}`}
              style={{ borderColor: c.border, background: c.bg, borderStyle: c.dashed ? 'dashed' : 'solid', aspectRatio: '1.25 / 1' }}
              className="border-2 rounded flex items-center justify-center"
            >
              <div className="w-3/5 h-3/5 rounded bg-white/70" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-3 text-[9px] text-cartistry-text-secondary justify-center">
          <span><span className="inline-block w-2 h-2 rounded-sm align-middle mr-1" style={{ background: '#3f7d5a' }} />Estrella</span>
          <span><span className="inline-block w-2 h-2 rounded-sm align-middle mr-1" style={{ background: '#9a7b4f' }} />Margen alto</span>
          <span><span className="inline-block w-2 h-2 rounded-sm align-middle mr-1" style={{ background: '#c9892f' }} />Gancho</span>
          <span><span className="inline-block w-2 h-2 rounded-sm align-middle mr-1" style={{ background: '#c9b48d' }} />Media</span>
          <span><span className="inline-block w-2 h-2 rounded-sm align-middle mr-1" style={{ background: '#b0413e' }} />Baja</span>
        </div>
      </div>
    </div>
  );
}

// Sección 02 · Analítica: render fiel del dashboard real (KPI cards + barras).
export function AnaliticaSection() {
  const kpis = [
    { flag: '#B0413E', label: 'SELL-THROUGH', value: '17', unit: '%', tag: 'Mejorable', tagColor: '#C9892F' },
    { flag: '#3F7D5A', label: 'VENTA TOTAL', value: '€5.331', unit: '', tag: '36 tickets', tagColor: '#3F7D5A' },
    { flag: '#9A7B4F', label: 'MARGEN BRUTO', value: '€15.204', unit: '', tag: '4 cat.', tagColor: '#9A7B4F' },
  ];
  const cats = [
    { nombre: 'FASHION', color: '#9A7B4F', bar: 100, valor: '€8.185', pct: '54%' },
    { nombre: 'WORK', color: '#5A6D7D', bar: 54, valor: '€4.470', pct: '29%' },
    { nombre: 'PARTY', color: '#9C5A6E', bar: 30, valor: '€2.360', pct: '16%' },
    { nombre: 'HOME', color: '#7D8A5A', bar: 4, valor: '€189', pct: '1%' },
  ];
  return (
    <div className="bg-white rounded-lg border border-cartistry-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-cartistry-border bg-cartistry-bg flex justify-between text-[10px] tracking-wider">
        <span className="font-bold text-cartistry-text-secondary">ANALÍTICA · DASHBOARD</span>
        <span style={{ color: '#9a7b4f' }} className="font-medium">últimos 30 días</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="border border-cartistry-border rounded p-2"
              style={{ borderLeftWidth: 4, borderLeftColor: k.flag }}
            >
              <div className="text-[8px] font-bold tracking-wider text-cartistry-text-secondary uppercase">
                {k.label}
              </div>
              <div className="font-serif font-bold text-lg text-cartistry-text mt-0.5">
                {k.value}
                {k.unit && <span className="text-xs text-cartistry-text-secondary font-normal">{k.unit}</span>}
              </div>
              <span
                className="inline-block text-[8px] font-semibold px-1.5 py-0.5 rounded-full mt-1"
                style={{ color: k.tagColor, background: '#f5f0eb' }}
              >
                {k.tag}
              </span>
            </div>
          ))}
        </div>

        <div className="border border-cartistry-border rounded p-3">
          <div className="text-[9px] font-bold tracking-wider text-cartistry-text-secondary uppercase mb-2">
            Margen por categoría
          </div>
          {cats.map((c) => (
            <div key={c.nombre} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <div className="flex items-center gap-1.5 w-20">
                <span className="w-2 h-2 rounded-sm" style={{ background: c.color }} />
                <span className="text-[9px] font-bold text-cartistry-text">{c.nombre}</span>
              </div>
              <div className="flex-1 h-2 rounded overflow-hidden" style={{ background: '#f5f0eb' }}>
                <div className="h-full rounded" style={{ width: `${c.bar}%`, background: c.color }} />
              </div>
              <div className="text-[9px] text-cartistry-text-secondary whitespace-nowrap">
                <span className="font-bold text-cartistry-text">{c.valor}</span> · {c.pct}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Sección 03 · Suite (Facturación): mock de factura.
export function FacturacionSection() {
  const lineas = [
    { d: 'BACKPACK 13" Biscuit', q: 1, p: 150 },
    { d: 'NOTEBOOK A5 Black Red', q: 2, p: 58 },
    { d: 'PENCASE Medium Brown', q: 1, p: 42 },
  ];
  const subtotal = lineas.reduce((s, l) => s + l.q * l.p, 0);
  const iva = subtotal * 0.21;
  const total = subtotal + iva;
  return (
    <div className="bg-white rounded-lg border border-cartistry-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-cartistry-border bg-cartistry-bg flex justify-between text-[10px] tracking-wider">
        <span className="font-bold text-cartistry-text-secondary">FACTURA · F-2026-0142</span>
        <span style={{ color: '#9a7b4f' }} className="font-medium">21/05/2026</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-3 text-[10px]">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-cartistry-text-secondary">Emisor</p>
            <p className="font-bold text-cartistry-text mt-0.5">Mi Marca S.L.</p>
            <p className="text-cartistry-text-secondary">CIF B12345678</p>
            <p className="text-cartistry-text-secondary">C/ Mayor 12, Madrid</p>
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-cartistry-text-secondary">Cliente</p>
            <p className="font-bold text-cartistry-text mt-0.5">Cliente Boutique</p>
            <p className="text-cartistry-text-secondary">28013 · Madrid</p>
          </div>
        </div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-cartistry-text text-[8px] uppercase tracking-wider text-cartistry-text-secondary">
              <th className="text-left py-1.5">Producto</th>
              <th className="text-right py-1.5">Uds</th>
              <th className="text-right py-1.5">PVP</th>
              <th className="text-right py-1.5">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i} className="border-b border-cartistry-border">
                <td className="py-1 text-cartistry-text">{l.d}</td>
                <td className="py-1 text-right text-cartistry-text-secondary">{l.q}</td>
                <td className="py-1 text-right text-cartistry-text-secondary">€{l.p}</td>
                <td className="py-1 text-right font-medium text-cartistry-text">€{l.q * l.p}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-3 text-[10px]">
          <div className="text-right space-y-0.5">
            <div className="text-cartistry-text-secondary">
              Subtotal: <span className="text-cartistry-text font-medium">€{subtotal.toFixed(2)}</span>
            </div>
            <div className="text-cartistry-text-secondary">
              IVA 21%: <span className="text-cartistry-text font-medium">€{iva.toFixed(2)}</span>
            </div>
            <div className="font-serif font-bold text-base text-cartistry-text mt-1 border-t border-cartistry-border pt-1">
              Total: €{total.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
