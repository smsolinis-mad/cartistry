'use client';

import { useEffect, useMemo, useState } from 'react';
import { isCajaAbierta, abrirCaja, cerrarCaja } from '@/lib/caja-estado';
import { PageHeader } from '@/components/ui';

// Denominaciones en céntimos para evitar errores de coma flotante
const DENOMINACIONES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
// Columna izquierda: €0,01 a €2 · Columna derecha: €5 a €500
const DENOM_IZQ = DENOMINACIONES.filter((d) => d <= 200);
const DENOM_DER = DENOMINACIONES.filter((d) => d > 200);

function formatEUR(cents: number): string {
  return `€${(cents / 100).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDenom(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface MovimientoCaja {
  hora: string;
  usuario: string;
  importe: number; // céntimos
  motivo: string;
}

// Datos de ejemplo de la caja (en un caso real vendrían de la BD)
const CAJA = {
  tienda: 'Claudio Coello',
  registro: 'Caja 2',
  cierreNum: '1225',
  apertura: 'Vie 27 feb 2026, 10:16',
};

const MOVIMIENTOS_BASE: MovimientoCaja[] = [
  { hora: '10:16', usuario: 'Usuario', importe: 20000, motivo: 'Fondo de apertura' },
];

// Importes esperados por tipo de pago (en céntimos)
const ESPERADO_BASE = {
  efectivo: 20000,
  loyalty: 0,
  tarjeta: 64040,
  transferencia: 0,
};

export default function AperturaCierrePage() {
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [importePersonalizado, setImportePersonalizado] = useState('');
  const [tarjetaContada, setTarjetaContada] = useState('');
  const [transferenciaContada, setTransferenciaContada] = useState('');
  const [loyaltyContada, setLoyaltyContada] = useState('');
  const [nota, setNota] = useState('');
  const [abierta, setAbierta] = useState<boolean | null>(null);

  useEffect(() => {
    setAbierta(isCajaAbierta());
  }, []);

  const handleAbrir = () => {
    abrirCaja();
    setAbierta(true);
  };

  const handleCerrar = () => {
    cerrarCaja();
    setAbierta(false);
  };

  const efectivoTotal = useMemo(() => {
    const porDenom = DENOMINACIONES.reduce(
      (sum, denom) => sum + denom * (cantidades[denom] || 0),
      0
    );
    const extra = Math.round((parseFloat(importePersonalizado) || 0) * 100);
    return porDenom + extra;
  }, [cantidades, importePersonalizado]);

  const setCantidad = (denom: number, valor: string) => {
    const n = parseInt(valor, 10);
    setCantidades((prev) => ({ ...prev, [denom]: isNaN(n) || n < 0 ? 0 : n }));
  };

  const eurToCents = (v: string) => Math.round((parseFloat(v) || 0) * 100);

  const contado = {
    efectivo: efectivoTotal,
    loyalty: eurToCents(loyaltyContada),
    tarjeta: eurToCents(tarjetaContada),
    transferencia: eurToCents(transferenciaContada),
  };

  // Si la caja está cerrada, no hay sesión: importes esperados y movimientos a cero
  const esperado = abierta
    ? ESPERADO_BASE
    : { efectivo: 0, loyalty: 0, tarjeta: 0, transferencia: 0 };
  const movimientos = abierta ? MOVIMIENTOS_BASE : [];

  const totalEsperado =
    esperado.efectivo + esperado.loyalty + esperado.tarjeta + esperado.transferencia;
  const totalContado =
    contado.efectivo + contado.loyalty + contado.tarjeta + contado.transferencia;
  const totalDiferencia = totalContado - totalEsperado;

  const diffClass = (d: number) =>
    d === 0
      ? 'text-cartistry-text-secondary'
      : d > 0
        ? 'text-green-700'
        : 'text-red-700';

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader
          label="Ventas"
          title="Cierre de caja"
          description="Cierra la caja para cuadrar los pagos y las ventas del día. Una vez cerrada no podrás editar los importes."
        />
        {/* Estado de la caja */}
        <div
          className={`flex flex-wrap items-center justify-between gap-4 rounded border px-4 py-3 ${
            abierta
              ? 'bg-green-50 border-green-200'
              : 'bg-cartistry-bg-secondary border-cartistry-border'
          }`}
        >
          <span className="text-sm font-medium text-cartistry-text flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${abierta ? 'bg-green-600' : 'bg-cartistry-text-secondary'}`}
            />
            {abierta === null ? 'Comprobando estado…' : abierta ? 'Caja abierta' : 'Caja cerrada'}
          </span>
          {abierta === false && (
            <button
              onClick={handleAbrir}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Abrir caja
            </button>
          )}
          {abierta && (
            <span className="text-xs text-cartistry-text-secondary">
              Ya puedes cobrar en el apartado Caja.
            </span>
          )}
        </div>

        {/* Detalles de la caja */}
        <section className="border-b border-cartistry-border pb-6">
          <h2 className="text-base font-serif font-bold text-cartistry-text mb-3">Detalles de la caja</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-6 text-sm">
            <div>
              <dt className="text-cartistry-text-secondary text-xs">Tienda</dt>
              <dd className="text-cartistry-text">{CAJA.tienda}</dd>
            </div>
            <div>
              <dt className="text-cartistry-text-secondary text-xs">Registro</dt>
              <dd className="text-cartistry-text">{CAJA.registro}</dd>
            </div>
            <div>
              <dt className="text-cartistry-text-secondary text-xs">Cierre n.º</dt>
              <dd className="text-cartistry-text">{CAJA.cierreNum}</dd>
            </div>
            <div>
              <dt className="text-cartistry-text-secondary text-xs">Hora de apertura</dt>
              <dd className="text-cartistry-text">{CAJA.apertura}</dd>
            </div>
          </dl>
        </section>

        {/* Efectivo (izquierda) · Resumen de pagos + cierre (derecha) */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Contar efectivo */}
        <section>
          <div className="mb-3">
            <h2 className="text-base font-serif font-bold text-cartistry-text">Contar efectivo</h2>
            <p className="text-sm text-cartistry-text-secondary mt-1">
              Introduce las cantidades que hay en el cajón.
            </p>
          </div>

          <div className="bg-cartistry-surface rounded border border-cartistry-border overflow-hidden">
            {/* Dos columnas de denominaciones: €0,01–€2 y €5–€500 */}
            <div className="grid md:grid-cols-2 md:divide-x divide-cartistry-border">
              {[DENOM_IZQ, DENOM_DER].map((grupo, gi) => (
                <div key={gi}>
                  <div className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
                    <span>Denominación</span>
                    <span className="text-center">Cantidad</span>
                    <span className="text-right">Importe</span>
                  </div>
                  {grupo.map((denom) => (
                    <div
                      key={denom}
                      className="grid grid-cols-3 gap-4 px-4 py-2 items-center border-b border-cartistry-border/50 text-sm"
                    >
                      <span className="text-cartistry-text">€{formatDenom(denom)}</span>
                      <div className="flex justify-center">
                        <input
                          type="number"
                          min={0}
                          value={cantidades[denom] ?? ''}
                          onChange={(e) => setCantidad(denom, e.target.value)}
                          placeholder="0"
                          className="w-20 px-2 py-1 text-center bg-cartistry-bg border border-cartistry-border rounded text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                        />
                      </div>
                      <span className="text-right text-cartistry-text">
                        {formatEUR(denom * (cantidades[denom] || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Importe personalizado */}
            <div className="grid grid-cols-3 gap-4 px-4 py-2 items-center border-b border-cartistry-border/50 text-sm">
              <span className="text-cartistry-text-secondary">Importe personalizado</span>
              <span />
              <div className="flex justify-end">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={importePersonalizado}
                  onChange={(e) => setImportePersonalizado(e.target.value)}
                  placeholder="0.00"
                  className="w-24 px-2 py-1 text-right bg-cartistry-bg border border-cartistry-border rounded text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                />
              </div>
            </div>

            {/* Total */}
            <div className="grid grid-cols-3 gap-4 px-4 py-3 items-center bg-cartistry-bg-secondary text-sm font-medium">
              <span className="text-cartistry-text uppercase tracking-wide text-xs">Efectivo total</span>
              <span />
              <span className="text-right text-cartistry-text">{formatEUR(efectivoTotal)}</span>
            </div>
          </div>
        </section>

        {/* Columna derecha: resumen de pagos + cierre */}
        <div className="space-y-8">
        {/* Resumen de pagos */}
        <section>
          <div className="mb-3">
            <h2 className="text-base font-serif font-bold text-cartistry-text">Resumen de pagos</h2>
            <p className="text-sm text-cartistry-text-secondary mt-1">
              Cuadra la caja introduciendo el importe contado de cada método de pago.
            </p>
          </div>

          <div className="space-y-6">
            {/* Tabla principal */}
            <div className="bg-cartistry-surface rounded border border-cartistry-border overflow-hidden">
              <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-cartistry-border text-xs font-medium text-cartistry-text-secondary">
                <span>Método de pago</span>
                <span className="text-right">Esperado (€)</span>
                <span className="text-right">Contado (€)</span>
                <span className="text-right">Diferencia (€)</span>
              </div>

              {/* Efectivo */}
              <div className="grid grid-cols-4 gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 text-sm">
                <span className="text-cartistry-text">Efectivo</span>
                <span className="text-right text-cartistry-text-secondary">{formatEUR(esperado.efectivo)}</span>
                <span className="text-right text-cartistry-text">{formatEUR(contado.efectivo)}</span>
                <span className={`text-right ${diffClass(contado.efectivo - esperado.efectivo)}`}>
                  {formatEUR(contado.efectivo - esperado.efectivo)}
                </span>
              </div>

              {/* Movimientos de efectivo */}
              <div className="px-4 py-3 border-b border-cartistry-border/50 bg-cartistry-bg/40">
                <p className="text-xs font-medium text-cartistry-text-secondary mb-2">
                  Movimientos de efectivo
                </p>
                <div className="grid grid-cols-4 gap-4 text-xs text-cartistry-text-secondary mb-1">
                  <span>Hora</span>
                  <span>Usuario</span>
                  <span className="text-right">Importe</span>
                  <span>Motivo</span>
                </div>
                {movimientos.map((m, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 text-xs text-cartistry-text py-0.5">
                    <span>{m.hora}</span>
                    <span>{m.usuario}</span>
                    <span className="text-right">{formatEUR(m.importe)}</span>
                    <span>{m.motivo}</span>
                  </div>
                ))}
              </div>

              {/* Loyalty */}
              <div className="grid grid-cols-4 gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 text-sm">
                <span className="text-cartistry-text">Vale/Tarjeta regalo</span>
                <span className="text-right text-cartistry-text-secondary">{formatEUR(esperado.loyalty)}</span>
                <div className="flex justify-end">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={loyaltyContada}
                    onChange={(e) => setLoyaltyContada(e.target.value)}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 text-right bg-cartistry-bg border border-cartistry-border rounded text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                  />
                </div>
                <span className={`text-right ${diffClass(contado.loyalty - esperado.loyalty)}`}>
                  {formatEUR(contado.loyalty - esperado.loyalty)}
                </span>
              </div>

              {/* Tarjeta de crédito */}
              <div className="grid grid-cols-4 gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 text-sm">
                <span className="text-cartistry-text">Tarjeta de crédito</span>
                <span className="text-right text-cartistry-text-secondary">{formatEUR(esperado.tarjeta)}</span>
                <div className="flex justify-end">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={tarjetaContada}
                    onChange={(e) => setTarjetaContada(e.target.value)}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 text-right bg-cartistry-bg border border-cartistry-border rounded text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                  />
                </div>
                <span className={`text-right ${diffClass(contado.tarjeta - esperado.tarjeta)}`}>
                  {formatEUR(contado.tarjeta - esperado.tarjeta)}
                </span>
              </div>

              {/* Transferencia bancaria */}
              <div className="grid grid-cols-4 gap-4 px-4 py-3 items-center border-b border-cartistry-border/50 text-sm">
                <span className="text-cartistry-text">Transferencia bancaria</span>
                <span className="text-right text-cartistry-text-secondary">{formatEUR(esperado.transferencia)}</span>
                <div className="flex justify-end">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={transferenciaContada}
                    onChange={(e) => setTransferenciaContada(e.target.value)}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 text-right bg-cartistry-bg border border-cartistry-border rounded text-cartistry-text focus:outline-none focus:border-cartistry-accent"
                  />
                </div>
                <span className={`text-right ${diffClass(contado.transferencia - esperado.transferencia)}`}>
                  {formatEUR(contado.transferencia - esperado.transferencia)}
                </span>
              </div>

              {/* Totales */}
              <div className="grid grid-cols-4 gap-4 px-4 py-3 items-center bg-cartistry-bg-secondary text-sm font-medium">
                <span className="text-cartistry-text">Totales</span>
                <span className="text-right text-cartistry-text">{formatEUR(totalEsperado)}</span>
                <span className="text-right text-cartistry-text">{formatEUR(totalContado)}</span>
                <span className={`text-right ${diffClass(totalDiferencia)}`}>
                  {formatEUR(totalDiferencia)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Resumen de cierre */}
        <section className="border-t border-cartistry-border pt-6">
          <h2 className="text-base font-serif font-bold text-cartistry-text mb-3">Resumen de cierre</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-cartistry-text-secondary mb-2">Nota</label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={4}
                placeholder="Escribe una nota sobre el cierre de caja"
                className="w-full px-3 py-2 bg-cartistry-surface border border-cartistry-border rounded text-sm text-cartistry-text focus:outline-none focus:border-cartistry-accent resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleCerrar}
              disabled={!abierta}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none w-full"
            >
              {abierta ? 'Cerrar caja' : 'Caja ya cerrada'}
            </button>
          </div>
        </section>
        </div>
        </div>
      </div>
    </main>
  );
}
