'use client';

import { useState } from 'react';
import Link from 'next/link';

type PlanKey = 'basico' | 'estandar' | 'avanzado';

interface PlanInfo {
  key: PlanKey;
  label: string;
  product: string;
  tagline: string;
  badge?: string;
  audience: string;
  intro: string;
  bulletsTitle: string;
  bullets: string[];
  outcome: string;
  price: string;
}

const PLANS: PlanInfo[] = [
  {
    key: 'basico',
    label: 'Básico',
    product: 'Cartistry Visual',
    tagline: 'El arte de colocar, convertido en ciencia.',
    audience:
      'Tiendas y cadenas que quieren que cada lineal venda más, sin depender de la intuición.',
    intro:
      'Sube tu surtido y deja que los datos coloquen tu tienda. Cartistry Visual transforma tu catálogo en un planograma accionable: cada producto en su sitio, según 26 reglas de visual merchandising probadas.',
    bulletsTitle: 'Incluye:',
    bullets: [
      'Planogramas optimizados por góndola, mueble y escaparate',
      'Mapa de calor visual: ve de un vistazo qué posición vende y cuál desaprovecha espacio premium',
      'Asignación automática de la zona dorada (eye-level) a tus productos clave',
      'Exportación a PDF con códigos EAN, posición y réplica para enviar directo a tienda',
      'Recomendaciones de distribución según el objetivo de cada planograma',
    ],
    outcome:
      'Dejas de adivinar dónde va cada cosa. Tu tienda se monta en minutos, no en reuniones.',
    price: '39 €/mes por tienda',
  },
  {
    key: 'estandar',
    label: 'Estándar',
    product: 'Cartistry Visual + Analítica',
    tagline: 'Tus decisiones, basadas en tus ventas. No en corazonadas.',
    badge: '★ El más elegido',
    audience:
      'Responsables de retail que quieren que cada colocación tenga una razón medible detrás.',
    intro:
      'Todo lo de Cartistry Visual, y además el cerebro analítico que convierte tus ventas en estrategia. El planograma deja de ser una recomendación estética para construirse sobre tus datos reales: lo que vende, lo que rota y lo que te da margen.',
    bulletsTitle: 'Suma a Visual:',
    bullets: [
      'Dashboard de analítica: ventas por periodo, producto, categoría y tienda',
      'Sell-through, rotación y cobertura de stock por referencia',
      'Margen real por producto: descubre qué vende mucho pero deja poco, y al revés',
      'Análisis de rentabilidad y ranking de productos (matriz margen × rotación)',
      'Forecast de objetivos de ventas y comparativa de temporadas',
      'Mapa de calor alimentado por venta real, no por estimación',
    ],
    outcome:
      'Sabes exactamente qué reforzar, qué liquidar y cuánto capital tienes parado. El planograma y los números, por fin, hablan el mismo idioma.',
    price: '89 €/mes por tienda',
  },
  {
    key: 'avanzado',
    label: 'Avanzado',
    product: 'Cartistry Suite',
    tagline: 'Del lineal a la caja. Todo el ciclo de venta, en un solo lugar.',
    audience:
      'Negocios que quieren gestionar toda su operación —colocar, analizar y cobrar— sin saltar entre cinco herramientas.',
    intro:
      'Todo lo de Visual + Analítica, y además la capa operativa que cierra el círculo. Coloca el producto, entiende cómo vende y emite la factura y el cobro desde la misma plataforma. Una sola herramienta, de la estantería al ingreso.',
    bulletsTitle: 'Suma a Visual + Analítica:',
    bullets: [
      'Emisión de facturas integrada, conforme a la normativa española vigente',
      'Gestión de cobros desde la plataforma',
      'Trazabilidad completa: cada venta conecta con su producto, su posición en el lineal y su factura',
      'Visión unificada del ciclo: qué colocaste, qué vendió y qué facturaste',
    ],
    outcome:
      'Dejas de reconciliar datos entre tu planograma, tu ERP y tu facturación. Todo vive en Cartistry, y todo cuadra.',
    price: '179 €/mes por tienda',
  },
];

export default function PlanPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="text-cartistry-accent hover:underline text-sm">
            ← Volver
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">
            Configuración
          </h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
        <h2 className="text-xl font-serif font-bold text-cartistry-text">
          Elige tu Plan
        </h2>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => {
            const active = selectedPlan === plan.key;
            return (
              <div
                key={plan.key}
                className={`bg-cartistry-surface rounded border-2 p-6 transition flex flex-col gap-4 relative ${
                  active
                    ? 'border-cartistry-accent bg-cartistry-bg'
                    : 'border-cartistry-border'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 right-4 bg-cartistry-cta text-cartistry-cta-text text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <p className="text-xs font-bold tracking-wider uppercase text-cartistry-text-secondary mb-1">
                    Plan · {plan.label}
                  </p>
                  <h3 className="font-serif font-bold text-cartistry-text text-xl">
                    {plan.product}
                  </h3>
                  <p className="font-serif italic text-cartistry-accent text-sm mt-1">
                    {plan.tagline}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-cartistry-text-secondary uppercase tracking-wider font-bold mb-1">
                    Para quién es
                  </p>
                  <p className="text-sm text-cartistry-text leading-snug">
                    {plan.audience}
                  </p>
                </div>

                <p className="text-sm text-cartistry-text leading-relaxed">
                  {plan.intro}
                </p>

                <div>
                  <p className="text-xs text-cartistry-text-secondary uppercase tracking-wider font-bold mb-2">
                    {plan.bulletsTitle}
                  </p>
                  <ul className="space-y-1.5">
                    {plan.bullets.map((b, idx) => (
                      <li key={idx} className="text-sm text-cartistry-text flex gap-2 leading-snug">
                        <span className="text-cartistry-accent flex-shrink-0">●</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-4 border-t border-cartistry-border">
                  <p className="text-xs text-cartistry-text-secondary uppercase tracking-wider font-bold mb-1">
                    El resultado
                  </p>
                  <p className="text-sm text-cartistry-text leading-snug italic mb-3">
                    {plan.outcome}
                  </p>
                  <p className="text-sm font-bold text-cartistry-text mb-4">
                    {plan.price}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`w-full px-4 py-2 rounded font-medium text-sm transition ${
                      active
                        ? 'bg-cartistry-text text-cartistry-bg'
                        : 'bg-cartistry-cta text-cartistry-cta-text hover:opacity-90'
                    }`}
                  >
                    {active ? '✓ Seleccionado' : 'Seleccionar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
