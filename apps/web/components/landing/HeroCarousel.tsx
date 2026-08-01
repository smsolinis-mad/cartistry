'use client';

import { useState, useEffect } from 'react';

const SLIDE_DURATION_MS = 5000;
const TOTAL_SLIDES = 3;

const KPIS: Array<{
  flag: string;
  label: string;
  value: string;
  unit?: string;
  tag: string;
  tagColor: string;
  ctx: string;
}> = [
  {
    flag: '#B0413E',
    label: 'SELL-THROUGH',
    value: '17',
    unit: '%',
    tag: 'Mejorable',
    tagColor: 'bg-orange-100 text-orange-700',
    ctx: '74 de 435 uds vendidas.',
  },
  {
    flag: '#B0413E',
    label: 'COBERTURA DE STOCK',
    value: '11,8',
    unit: ' sem',
    tag: 'Sobre-stock',
    tagColor: 'bg-red-100 text-red-700',
    ctx: 'Planograma activo: 2 semanas.',
  },
  {
    flag: '#3F7D5A',
    label: 'ROTACIÓN',
    value: '1,00',
    unit: '×',
    tag: 'Buena',
    tagColor: 'bg-green-100 text-green-700',
    ctx: 'Se vende un 100% del valor expuesto.',
  },
  {
    flag: '#3F7D5A',
    label: 'VENTA TOTAL PERIODO',
    value: '€5.331',
    tag: '36 tickets',
    tagColor: 'bg-green-100 text-green-700',
    ctx: 'Ticket medio €148 · 2,06 uds/ticket.',
  },
  {
    flag: '#3F7D5A',
    label: 'PVP MEDIO / UNIDAD',
    value: '€72',
    tag: 'boutique',
    tagColor: 'bg-green-100 text-green-700',
    ctx: 'Stock valorado €28.315.',
  },
  {
    flag: '#9A7B4F',
    label: 'MARGEN BRUTO PERIODO',
    value: '€15.204',
    tag: '4 categorías',
    tagColor: 'bg-amber-100 text-amber-700',
    ctx: 'FASHION concentra el 54% del margen.',
  },
];

const CATEGORIAS: Array<{ nombre: string; color: string; bar: number; valor: string; pct: string }> = [
  { nombre: 'FASHION', color: '#9A7B4F', bar: 100, valor: '€8185', pct: '54%' },
  { nombre: 'WORK', color: '#5A6D7D', bar: 54, valor: '€4470', pct: '29%' },
  { nombre: 'PARTY', color: '#9C5A6E', bar: 30, valor: '€2360', pct: '16%' },
  { nombre: 'HOME', color: '#7D8A5A', bar: 4, valor: '€189', pct: '1%' },
];

function PlanogramSlide() {
  return (
    <div className="flex flex-col h-full gap-2.5">
      <div className="flex justify-between items-center text-[11px] text-cartistry-text-secondary flex-shrink-0">
        <span className="font-medium">CARTISTRY / PLANOGRAMA / SEPT</span>
        <div className="flex gap-2 items-center">
          <button className="w-5 h-5 rounded-full bg-cartistry-text text-white flex items-center justify-center text-[10px] font-bold">
            ◀
          </button>
          <span className="font-medium">NEXT</span>
          <span className="bg-cartistry-text text-white px-1.5 py-0.5 rounded text-[10px]">10</span>
        </div>
      </div>

      <div className="bg-cartistry-bg rounded p-2.5 flex-1 flex flex-col justify-between gap-1.5 min-h-0">
        {[...Array(4)].map((_, row) => {
          const rowLabel = ['SUPERIOR', 'MEDIA-ALTA', 'MEDIA-BAJA', 'INFERIOR'][row];
          return (
            <div key={row} className="flex gap-2 items-center flex-1 min-h-0">
              <span className="text-[9px] font-semibold text-cartistry-text-secondary w-16 text-right flex-shrink-0">{rowLabel}</span>
              <div className="flex gap-1 flex-1 h-full">
                {[...Array(6)].map((_, col) => {
                  const isHotSpot = (row === 1 || row === 2) && (col === 2 || col === 3);
                  const browns = [
                    '#F5EDDC', '#E8D9B8', '#D4B98C',
                    '#B89968', '#9A7B4F', '#7A5D38',
                    '#EFE0C9', '#DBC8A4', '#C0A47A',
                  ];
                  const colorIndex = (row * 6 + col) % browns.length;
                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`flex-1 h-full rounded relative border border-cartistry-border ${
                        isHotSpot ? 'ring-2 ring-[#7A5D38] shadow-lg' : ''
                      }`}
                      style={{ backgroundColor: browns[colorIndex] }}
                    >
                      {isHotSpot && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-pulse"
                            style={{ backgroundColor: '#7A5D38' }}
                          >
                            ↑
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 justify-center text-[10px] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-cartistry-border" style={{ backgroundColor: '#B89968' }} />
          <span className="text-cartistry-text-secondary">Productos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 bg-white border-2 rounded flex items-center justify-center"
            style={{ borderColor: '#7A5D38' }}
          >
            <span className="text-[9px]" style={{ color: '#7A5D38' }}>↑</span>
          </div>
          <span className="text-cartistry-text-secondary">Mayor venta</span>
        </div>
      </div>

      <div className="border-t border-cartistry-border pt-2 flex-shrink-0">
        <div className="grid grid-cols-3 gap-4 text-[10px]">
          <div>
            <p className="font-bold text-cartistry-text text-base leading-tight">€842</p>
            <p className="text-cartistry-accent">+ 31,4%</p>
          </div>
          <div>
            <p className="font-bold text-cartistry-text text-base leading-tight">5.8k</p>
            <p className="text-cartistry-accent">+ 5,3</p>
          </div>
          <div>
            <p className="font-bold text-cartistry-text text-base leading-tight">58%</p>
            <p className="text-cartistry-accent">+ 1,2%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPISlide() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {KPIS.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-white border border-cartistry-border rounded p-3 relative overflow-hidden"
          style={{ borderLeftWidth: 4, borderLeftColor: kpi.flag }}
        >
          <div className="text-[9px] font-bold tracking-wider text-cartistry-text-secondary uppercase">
            {kpi.label}
          </div>
          <div className="font-serif font-bold text-cartistry-text text-2xl mt-1">
            {kpi.value}
            {kpi.unit && (
              <span className="text-sm text-cartistry-text-secondary font-normal">{kpi.unit}</span>
            )}
          </div>
          <span
            className={`inline-block ${kpi.tagColor} text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1`}
          >
            {kpi.tag}
          </span>
          <p className="text-[10px] text-cartistry-text-secondary mt-2 leading-tight">{kpi.ctx}</p>
        </div>
      ))}
    </div>
  );
}

function InventorySlide() {
  return (
    <div className="space-y-3">
      <div className="text-[10px] tracking-widest text-amber-700 font-bold uppercase border-b border-cartistry-border pb-2">
        INVENTARIO · 19/05/2026 · CIERRE DE PERIODO
      </div>
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-2 space-y-2">
          <div className="bg-white border border-cartistry-border rounded p-2.5 border-l-[3px] border-l-amber-700">
            <div className="text-[9px] tracking-wider text-cartistry-text-secondary font-bold uppercase">
              Unidades en stock
            </div>
            <div className="font-serif font-bold text-cartistry-text text-xl mt-0.5">435</div>
            <p className="text-[10px] text-cartistry-text-secondary">50 referencias expuestas</p>
          </div>
          <div className="bg-white border border-cartistry-border rounded p-2.5 border-l-[3px] border-l-amber-700">
            <div className="text-[9px] tracking-wider text-cartistry-text-secondary font-bold uppercase">
              Valor de la mercancía
            </div>
            <div className="font-serif font-bold text-cartistry-text text-xl mt-0.5">€28.315</div>
            <p className="text-[10px] text-cartistry-text-secondary">A PVP · 62 referencias en ficha</p>
          </div>
          <div className="bg-white border border-cartistry-border rounded p-2.5 border-l-[3px] border-l-amber-700">
            <div className="text-[9px] tracking-wider text-cartistry-text-secondary font-bold uppercase">
              % Stock expuesto
            </div>
            <div className="font-serif font-bold text-cartistry-text text-xl mt-0.5">81%</div>
            <p className="text-[10px] text-cartistry-text-secondary">Diferencia catálogo vs exposición</p>
          </div>
        </div>

        <div className="col-span-3 bg-white border border-cartistry-border rounded p-3">
          <div className="grid grid-cols-[80px_1fr_70px] gap-2 text-[9px] tracking-wider text-cartistry-text-secondary font-bold uppercase border-b border-cartistry-text pb-1.5 mb-2">
            <span>Categoría</span>
            <span>Margen</span>
            <span>% Del total</span>
          </div>
          {CATEGORIAS.map((c) => (
            <div key={c.nombre} className="grid grid-cols-[80px_1fr_70px] gap-2 items-center mb-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="text-[10px] font-bold text-cartistry-text">{c.nombre}</span>
              </div>
              <div className="h-2.5 bg-amber-50 rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{ width: `${c.bar}%`, backgroundColor: c.color }}
                />
              </div>
              <div className="text-[10px] text-cartistry-text-secondary">
                <span className="font-bold text-cartistry-text">{c.valor}</span> · {c.pct}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 text-[10px] text-cartistry-text-secondary pt-2">
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-green-600 mr-1" />
          Saludable
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />A vigilar
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-1" />
          Acción requerida
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-amber-700 mr-1" />
          Informativo
        </span>
      </div>
    </div>
  );
}

export function HeroCarousel() {
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSlideIdx((idx) => (idx + 1) % TOTAL_SLIDES);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  const slides = [<PlanogramSlide key="p" />, <KPISlide key="k" />, <InventorySlide key="i" />];

  return (
    <div className="bg-white rounded border border-cartistry-border p-6 shadow-lg relative h-full min-h-[420px] overflow-hidden">
      {slides.map((slide, idx) => (
        <div
          key={idx}
          className={`absolute inset-6 transition-opacity duration-700 ease-in-out overflow-hidden flex flex-col ${
            idx === slideIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {slide}
        </div>
      ))}

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
        {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSlideIdx(idx)}
            className={`h-1.5 rounded-full transition-all ${
              idx === slideIdx ? 'w-6 bg-cartistry-text' : 'w-1.5 bg-cartistry-border'
            }`}
            aria-label={`Ver vista ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
