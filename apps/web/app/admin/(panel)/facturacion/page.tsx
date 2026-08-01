'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { planInfo, type PlanKey } from '@/lib/admin';
import {
  loadBrands,
  loadInvoices,
  loadAdminSettings,
  tiendasDe,
  formatEUR,
  currentPeriod,
  periodLabel,
  periodOptions,
  type Brand,
  type Invoice,
  type AdminSettings,
} from '@/lib/admin-data';
import { MetricCard } from '@/components/admin/AdminSidebar';

export default function FacturacionPage() {
  const supabase = createClient();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  const [invoices, setInvoices] = useState<Record<string, Invoice>>({});
  const [period, setPeriod] = useState(currentPeriod());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [facturaAbierta, setFacturaAbierta] = useState<Invoice | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ brands, storeCounts }, ajustes] = await Promise.all([
          loadBrands(),
          loadAdminSettings(),
        ]);
        setBrands(brands);
        setStoreCounts(storeCounts);
        setSettings(ajustes);
      } catch (err: any) {
        setError(err?.message || 'Error cargando datos');
      }
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    loadInvoices(period)
      .then(setInvoices)
      .catch((err) => setError(err?.message || 'Error cargando facturas'))
      .finally(() => setLoading(false));
  }, [period]);

  const generarFacturas = async () => {
    setGenerating(true);
    setError('');
    try {
      const compact = period.replace('-', '');
      const rows = brands.map((b, idx) => {
        const existente = invoices[b.user_id];
        const info = planInfo(b.plan);
        const tiendas = tiendasDe(b, storeCounts);
        return {
          id: existente?.id,
          user_id: b.user_id,
          numero: existente?.numero || `CART-${compact}-${String(idx + 1).padStart(4, '0')}`,
          periodo: period,
          plan: (b.plan as PlanKey) || 'estandar',
          concepto: `${info.producto} · ${periodLabel(period)} · ${tiendas} tienda${tiendas > 1 ? 's' : ''}`,
          num_tiendas: tiendas,
          importe: info.precio * tiendas,
          estado: existente?.estado || 'pendiente',
          cobrada_el: existente?.cobrada_el || null,
        };
      });
      if (rows.length === 0) return;
      const { error: err } = await supabase.from('invoices').upsert(rows, { onConflict: 'user_id,periodo' });
      if (err) throw err;
      setInvoices(await loadInvoices(period));
    } catch (err: any) {
      setError(err?.message || 'Error generando facturas');
    } finally {
      setGenerating(false);
    }
  };

  const toggleCobro = async (inv: Invoice) => {
    const nuevoEstado = inv.estado === 'cobrada' ? 'pendiente' : 'cobrada';
    const cobrada_el = nuevoEstado === 'cobrada' ? new Date().toISOString() : null;
    setInvoices((prev) => ({ ...prev, [inv.user_id]: { ...inv, estado: nuevoEstado, cobrada_el } }));
    const { error: err } = await supabase
      .from('invoices')
      .update({ estado: nuevoEstado, cobrada_el })
      .eq('id', inv.id);
    if (err) {
      setError(`No se pudo actualizar el cobro: ${err.message}`);
      setInvoices(await loadInvoices(period));
    }
  };

  const metrics = useMemo(() => {
    const list = Object.values(invoices);
    const cobrado = list.filter((i) => i.estado === 'cobrada').reduce((s, i) => s + Number(i.importe), 0);
    const pendiente = list.filter((i) => i.estado !== 'cobrada').reduce((s, i) => s + Number(i.importe), 0);
    return { cobrado, pendiente, emitidas: list.length };
  }, [invoices]);

  const brandById = useMemo(() => {
    const m: Record<string, Brand> = {};
    brands.forEach((b) => (m[b.user_id] = b));
    return m;
  }, [brands]);

  return (
    <main>
      <header className="bg-cartistry-surface border-b border-cartistry-border px-8 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-cartistry-text">Facturación</h1>
          <p className="text-sm text-cartistry-text-secondary mt-1">
            Genera las facturas mensuales por plan y controla los cobros.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 bg-cartistry-bg border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent"
          >
            {periodOptions().map((p) => (
              <option key={p} value={p}>
                {periodLabel(p)}
              </option>
            ))}
          </select>
          <button
            onClick={generarFacturas}
            disabled={generating || brands.length === 0}
            className="px-4 py-2 rounded text-sm font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition disabled:opacity-50"
          >
            {generating ? 'Generando...' : 'Generar facturas del mes'}
          </button>
        </div>
      </header>

      <div className="px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Facturas emitidas" value={String(metrics.emitidas)} />
          <MetricCard label="Cobrado" value={formatEUR(metrics.cobrado)} tone="green" />
          <MetricCard label="Pendiente" value={formatEUR(metrics.pendiente)} tone="red" />
          <MetricCard
            label="Total facturado"
            value={formatEUR(metrics.cobrado + metrics.pendiente)}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
        )}

        <div className="bg-cartistry-surface border border-cartistry-border rounded overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1fr_1.3fr_1fr_1.2fr] gap-4 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
            <span>Marca</span>
            <span>Nº factura</span>
            <span>Concepto</span>
            <span className="text-right">Importe</span>
            <span className="text-right">Estado</span>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-cartistry-text-secondary">Cargando...</div>
          ) : Object.values(invoices).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-cartistry-text-secondary">
              No hay facturas para {periodLabel(period)}. Pulsa «Generar facturas del mes».
            </div>
          ) : (
            Object.values(invoices).map((inv) => {
              const b = brandById[inv.user_id];
              return (
                <div
                  key={inv.id}
                  className="grid grid-cols-[1.4fr_1fr_1.3fr_1fr_1.2fr] gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 text-sm last:border-b-0"
                >
                  <span className="text-cartistry-text font-medium">
                    {b?.nombre_empresa || 'Marca sin nombre'}
                  </span>
                  <span className="font-mono text-xs text-cartistry-text-secondary">{inv.numero}</span>
                  <span className="text-cartistry-text-secondary text-xs">{inv.concepto}</span>
                  <span className="text-right text-cartistry-text font-medium">
                    {formatEUR(Number(inv.importe))}
                  </span>
                  <span className="flex items-center justify-end gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                        inv.estado === 'cobrada'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          inv.estado === 'cobrada' ? 'bg-green-600' : 'bg-amber-500'
                        }`}
                      />
                      {inv.estado === 'cobrada' ? 'Cobrada' : 'Pendiente'}
                    </span>
                    <button
                      onClick={() => setFacturaAbierta(inv)}
                      className="text-xs font-medium text-cartistry-accent hover:underline whitespace-nowrap"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => toggleCobro(inv)}
                      className="text-xs font-medium text-cartistry-accent hover:underline whitespace-nowrap"
                    >
                      {inv.estado === 'cobrada' ? 'Marcar pendiente' : 'Marcar cobrada'}
                    </button>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Vista de factura */}
      {facturaAbierta && (() => {
        const inv = facturaAbierta;
        const cliente = brandById[inv.user_id];
        const base = Number(inv.importe) || 0;
        const iva = base * 0.21;
        const total = base + iva;
        const emisorDir = settings
          ? [settings.direccion, settings.codigo_postal, settings.ciudad, settings.provincia, settings.pais]
              .filter(Boolean)
              .join(', ')
          : '';
        const clienteDir = cliente
          ? [cliente.direccion_facturacion, cliente.codigo_postal, cliente.ciudad, cliente.provincia, cliente.pais]
              .filter(Boolean)
              .join(', ')
          : '';
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setFacturaAbierta(null)}
          >
            <div
              className="bg-white rounded-lg border border-cartistry-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabecera */}
              <div className="flex items-start justify-between px-8 py-6 border-b border-cartistry-border">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-cartistry-text">Factura</h2>
                  <p className="text-sm text-cartistry-text-secondary mt-1 font-mono">{inv.numero}</p>
                  <p className="text-sm text-cartistry-text-secondary">{periodLabel(inv.periodo)}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                    inv.estado === 'cobrada' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {inv.estado === 'cobrada' ? 'Cobrada' : 'Pendiente'}
                </span>
              </div>

              {/* Emisor / Cliente */}
              <div className="grid sm:grid-cols-2 gap-6 px-8 py-6 border-b border-cartistry-border">
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-2">
                    Emisor
                  </p>
                  {settings && (settings.nombre_empresa || settings.cif) ? (
                    <div className="text-sm text-cartistry-text space-y-0.5">
                      <p className="font-medium">{settings.nombre_empresa || '—'}</p>
                      {settings.cif && <p>CIF: {settings.cif}</p>}
                      {emisorDir && <p className="text-cartistry-text-secondary">{emisorDir}</p>}
                      {settings.email && <p className="text-cartistry-text-secondary">{settings.email}</p>}
                      {settings.telefono && <p className="text-cartistry-text-secondary">{settings.telefono}</p>}
                      {settings.iban && <p className="text-cartistry-text-secondary">IBAN: {settings.iban}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700">
                      Configura los datos de facturación en Configuración para que aparezcan aquí.
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-2">
                    Cliente
                  </p>
                  <div className="text-sm text-cartistry-text space-y-0.5">
                    <p className="font-medium">{cliente?.nombre_empresa || 'Marca sin nombre'}</p>
                    {cliente?.cif && <p>CIF: {cliente.cif}</p>}
                    {clienteDir && <p className="text-cartistry-text-secondary">{clienteDir}</p>}
                  </div>
                </div>
              </div>

              {/* Detalle */}
              <div className="px-8 py-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-cartistry-text-secondary border-b border-cartistry-border">
                      <th className="text-left font-medium py-2">Concepto</th>
                      <th className="text-right font-medium py-2">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-cartistry-border/50">
                      <td className="py-3 text-cartistry-text">{inv.concepto}</td>
                      <td className="py-3 text-right text-cartistry-text">{formatEUR(base)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-end mt-4">
                  <div className="w-56 space-y-1 text-sm">
                    <div className="flex justify-between text-cartistry-text-secondary">
                      <span>Base imponible</span>
                      <span>{formatEUR(base)}</span>
                    </div>
                    <div className="flex justify-between text-cartistry-text-secondary">
                      <span>IVA (21%)</span>
                      <span>{formatEUR(iva)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-cartistry-text border-t border-cartistry-border pt-1 mt-1">
                      <span>Total</span>
                      <span>{formatEUR(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end px-8 py-4 border-t border-cartistry-border">
                <button
                  onClick={() => setFacturaAbierta(null)}
                  className="px-4 py-2 rounded text-sm font-medium bg-cartistry-cta text-cartistry-cta-text hover:opacity-90 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
