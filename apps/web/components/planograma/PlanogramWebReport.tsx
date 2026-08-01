'use client';

import type { ReportData } from './PlanogramReport';

const eur = (n: number) => '€' + Math.round(n || 0).toLocaleString('es-ES');
const num = (n: number) => Math.round(n || 0).toLocaleString('es-ES');

function proxy(url?: string) {
  if (!url) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/api/image-proxy?url=${encodeURIComponent(url.trim())}`;
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
      <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-1">{label}</p>
      <p className="text-xl font-serif font-bold text-cartistry-text">{value}</p>
      {sub && <p className="text-xs text-cartistry-text-secondary mt-1">{sub}</p>}
    </div>
  );
}

export function PlanogramWebReport({ data }: { data: ReportData }) {
  const store = data.store;
  const m = data.metricasDuracion;
  const vis = data.infoGlobalVisual;

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <div className="bg-cartistry-cta text-cartistry-cta-text rounded p-6">
        <p className="text-xs uppercase tracking-widest opacity-80">Planograma · Diagnóstico de lineal</p>
        <h2 className="text-2xl font-serif font-bold mt-1">{store?.nombre || 'Tienda'}</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm opacity-90">
          {store?.direccion && <span>{store.direccion}</span>}
          {store?.metros2 ? <span>{store.metros2} m²</span> : null}
          {store?.categoria_venta && <span>{store.categoria_venta}</span>}
          {data.objetivo && <span>Objetivo: <b>{data.objetivo}</b></span>}
          {data.duracion && <span>Periodo: <b>{data.duracion}</b></span>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Referencias" value={num(data.productCount)} sub={vis ? `${num(vis.numRefExpuestas)} expuestas` : undefined} />
        {m && <KPI label="Ventas del periodo" value={eur(m.ventasTotales)} sub={`${num(m.unidadesVendidasTotales)} uds.`} />}
        {m && <KPI label="Ticket medio" value={eur(m.ticketMedioValorado)} sub={`${m.unidadesMediasPorTicket?.toFixed?.(1) ?? '—'} uds./ticket`} />}
        {data.stockTotalValorado != null && (
          <KPI label="Stock valorado" value={eur(data.stockTotalValorado)} sub={data.coberturaStock ? `Cobertura ${data.coberturaStock}` : undefined} />
        )}
      </div>

      {/* Alertas */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a, i) => (
            <div
              key={i}
              className={`p-3 rounded border text-sm ${
                a.severity === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : a.severity === 'warn'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-cartistry-bg-secondary border-cartistry-border text-cartistry-text'
              }`}
            >
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Enfoque de venta */}
      {vis && (vis.productoMasRentable || (vis.productosEnfoqueVenta?.length ?? 0) > 0) && (
        <div className="bg-cartistry-surface border border-cartistry-border rounded p-5">
          <h3 className="font-serif font-bold text-cartistry-text mb-3">Enfoque comercial</h3>
          {vis.productoMasRentable && (
            <p className="text-sm text-cartistry-text mb-2">
              Producto más rentable: <b>{vis.productoMasRentable.nombre}</b> ({eur(vis.productoMasRentable.margenUnitario)}/ud. de margen)
            </p>
          )}
          {(vis.productosEnfoqueVenta?.length ?? 0) > 0 && (
            <ul className="space-y-1 text-sm">
              {vis.productosEnfoqueVenta.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-cartistry-accent">●</span>
                  <span className="text-cartistry-text">
                    <b>{p.nombre}</b> — <span className="text-cartistry-text-secondary">{p.razon}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Muebles: mapa de calor del lineal */}
      {data.muebles && data.muebles.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-serif font-bold text-cartistry-text">Mapa del lineal</h3>
          {data.muebles.map((mueble) => {
            const asigs = mueble.assignmentsDelMueble || [];
            const goldenRow = Math.floor(mueble.num_filas / 2);
            return (
              <div key={mueble.id} className="bg-cartistry-surface border border-cartistry-border rounded p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h4 className="font-serif font-bold text-cartistry-text">{mueble.nombre}</h4>
                  <span className="text-xs text-cartistry-text-secondary">
                    {mueble.num_filas} baldas × {mueble.num_columnas} huecos · {mueble.alto}×{mueble.ancho}×{mueble.profundo} cm · {asigs.length} refs
                  </span>
                </div>

                <div className="space-y-2">
                  {Array.from({ length: mueble.num_filas }).map((_, filaIdx) => {
                    const fila = mueble.num_filas - 1 - filaIdx;
                    const isGolden = fila === goldenRow;
                    return (
                      <div key={filaIdx}>
                        <p className={`text-[10px] uppercase tracking-wide mb-1 ${isGolden ? 'text-amber-700 font-bold' : 'text-cartistry-text-secondary'}`}>
                          {isGolden
                            ? 'Zona dorada (eye-level)'
                            : fila > goldenRow
                              ? 'Fila superior · visibilidad media'
                              : fila === 0
                                ? 'Fila inferior · zona fría'
                                : 'Fila media-baja'}
                        </p>
                        <div
                          className="grid gap-1"
                          style={{ gridTemplateColumns: `repeat(${mueble.num_columnas}, minmax(0, 1fr))` }}
                        >
                          {Array.from({ length: mueble.num_columnas }).map((_, colIdx) => {
                            const productos = asigs.filter((p) => {
                              const parts = p.position?.split('_') || [];
                              return (
                                parts[parts.length - 1] === String(fila) &&
                                parts[parts.length - 2] === String(colIdx)
                              );
                            });
                            return (
                              <div
                                key={colIdx}
                                className={`min-h-[70px] rounded border p-1 flex flex-col items-center justify-center gap-1 ${
                                  productos.length === 0
                                    ? 'border-dashed border-cartistry-border bg-cartistry-bg/40'
                                    : isGolden
                                      ? 'border-amber-300 bg-amber-50'
                                      : 'border-cartistry-border bg-cartistry-bg'
                                }`}
                              >
                                {productos.length === 0 ? (
                                  <span className="text-cartistry-text-secondary text-xs">—</span>
                                ) : (
                                  productos.map((p, i) => (
                                    <div key={i} className="w-full text-center" title={p.razon}>
                                      {p.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={proxy(p.imageUrl)}
                                          alt={p.productName}
                                          className="w-8 h-8 object-contain mx-auto"
                                        />
                                      ) : null}
                                      <p className="text-[9px] leading-tight text-cartistry-text truncate">
                                        {p.productName}
                                      </p>
                                      {p.isLiquidation && (
                                        <span className="text-[8px] text-red-700 font-bold">LIQ.</span>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de colocación */}
      {data.assignments && data.assignments.length > 0 && (
        <div>
          <h3 className="text-lg font-serif font-bold text-cartistry-text mb-3">
            Colocación por producto ({data.assignments.length})
          </h3>
          <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
            <div className="grid grid-cols-[1.6fr_1fr_2fr] gap-4 px-4 py-2 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
              <span>Producto</span>
              <span>Posición</span>
              <span>Motivo</span>
            </div>
            {data.assignments.map((a, i) => (
              <div
                key={i}
                className="grid grid-cols-[1.6fr_1fr_2fr] gap-4 px-4 py-2 items-center border-b border-cartistry-border/50 last:border-b-0 text-sm"
              >
                <span className="text-cartistry-text truncate">
                  {a.productName}
                  {a.isLiquidation && <span className="ml-1 text-[10px] text-red-700 font-bold">LIQ.</span>}
                  <span className="block text-[10px] font-mono text-cartistry-text-secondary">{a.ean}</span>
                </span>
                <span className="text-cartistry-text-secondary font-mono text-xs">{a.position}</span>
                <span className="text-cartistry-text-secondary text-xs">{a.razon}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reglas aplicadas */}
      {data.topRules && data.topRules.length > 0 && (
        <div>
          <h3 className="text-lg font-serif font-bold text-cartistry-text mb-3">Reglas de merchandising aplicadas</h3>
          <div className="space-y-1.5">
            {data.topRules.map((r, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-xs px-2 py-0.5 rounded-full bg-cartistry-bg-secondary text-cartistry-text whitespace-nowrap">
                  ×{r.count}
                </span>
                <span className="text-cartistry-text">
                  <b>{r.rule}</b> — <span className="text-cartistry-text-secondary">{r.description}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top productos */}
      {data.analisisProductos && data.analisisProductos.top10Productos.length > 0 && (
        <div>
          <h3 className="text-lg font-serif font-bold text-cartistry-text mb-3">Top productos por ventas</h3>
          <div className="space-y-3">
            {data.analisisProductos.top10Productos.map((p, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <span className="text-cartistry-text break-words">{p.nombre}</span>
                  <span className="text-cartistry-text font-medium whitespace-nowrap">
                    {num(p.unidadesVendidas)} uds.
                  </span>
                </div>
                <div className="h-2 rounded-full bg-cartistry-bg-secondary overflow-hidden">
                  <div className="h-full bg-cartistry-accent rounded-full" style={{ width: `${p.porcentajeMax}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
