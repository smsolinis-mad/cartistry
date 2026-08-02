'use client';

import { useState } from 'react';
import { getRulesByObjective } from '@cartistry/rules-engine';
import type { Objective } from '@cartistry/types';
import { PageHeader } from '@/components/ui';

const OBJECTIVES: Array<{ value: Objective; label: string; description: string }> = [
  { value: 'nueva_coleccion', label: 'Nueva colección', description: 'Entrada de nueva colección al punto de venta' },
  { value: 'promocion', label: 'Promoción', description: 'Ejecutar una campaña o acción promocional' },
  { value: 'aumentar_ventas', label: 'Aumentar ventas', description: 'Maximizar unidades vendidas en el período' },
  { value: 'liquidacion', label: 'Liquidación', description: 'Reducir stock y dar salida a producto parado' },
  { value: 'aumentar_margen', label: 'Aumentar margen', description: 'Maximizar el margen neto de la tienda' },
];

const GROUP_LABEL: Record<string, string> = {
  ZV: 'Zona y Visibilidad',
  TV: 'Tendencia de Ventas',
  PR: 'Reglas Promocionales',
};

const GROUP_BADGE_COLOR: Record<string, string> = {
  ZV: 'bg-blue-50 text-blue-700 border-blue-200',
  TV: 'bg-purple-50 text-purple-700 border-purple-200',
  PR: 'bg-amber-50 text-amber-700 border-amber-200',
};

function priorityBadgeColor(priority: number) {
  if (priority <= 2) return 'bg-green-50 text-green-700 border-green-200';
  if (priority <= 4) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

export default function EspecificacionesPage() {
  const [selectedObjective, setSelectedObjective] = useState<Objective>('aumentar_ventas');
  const rules = getRulesByObjective(selectedObjective);

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader title="Especificaciones" />

        <div className="border border-cartistry-border rounded p-8 bg-cartistry-surface">
          <h3 className="font-serif font-bold text-cartistry-text mb-2 text-lg">
            Selecciona el objetivo del planograma
          </h3>
          <p className="text-sm text-cartistry-text-secondary mb-6">
            Las reglas se ordenan según su prioridad para el objetivo seleccionado (1 = máxima prioridad).
          </p>
          <div className="grid md:grid-cols-2 gap-4 items-start">
            {(() => {
              const leftValues: Objective[] = ['nueva_coleccion', 'aumentar_ventas', 'aumentar_margen'];
              const rightValues: Objective[] = ['promocion', 'liquidacion'];
              const renderOption = (value: Objective) => {
                const obj = OBJECTIVES.find((o) => o.value === value)!;
                return (
                  <label
                    key={obj.value}
                    className={`p-4 rounded border-2 cursor-pointer transition block ${
                      selectedObjective === obj.value
                        ? 'border-cartistry-accent bg-cartistry-bg'
                        : 'border-cartistry-border hover:border-cartistry-accent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="objective"
                        value={obj.value}
                        checked={selectedObjective === obj.value}
                        onChange={(e) => setSelectedObjective(e.target.value as Objective)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-bold text-cartistry-text">
                          {obj.label}
                        </div>
                        <div className="text-sm text-cartistry-text-secondary">
                          {obj.description}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              };
              return (
                <>
                  <div className="space-y-4">{leftValues.map(renderOption)}</div>
                  <div className="space-y-4">{rightValues.map(renderOption)}</div>
                </>
              );
            })()}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-serif font-bold text-cartistry-text mb-4">
            Reglas aplicadas — {OBJECTIVES.find((o) => o.value === selectedObjective)?.label} ({rules.length})
          </h2>

          <div className="space-y-3">
            {rules.map(({ rule, priority }) => (
              <div
                key={rule.code}
                className="bg-cartistry-surface border border-cartistry-border rounded p-4"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-full border font-bold text-sm flex-shrink-0 ${priorityBadgeColor(priority)}`}
                    title="Prioridad"
                  >
                    {priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="font-mono text-xs text-cartistry-text-secondary">
                        {rule.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${GROUP_BADGE_COLOR[rule.group]}`}
                      >
                        {GROUP_LABEL[rule.group]}
                      </span>
                      {rule.configurable && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium border bg-cartistry-bg text-cartistry-text-secondary border-cartistry-border">
                          Configurable
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-cartistry-text mb-1">{rule.name}</div>
                    <div className="text-sm text-cartistry-text-secondary">
                      {rule.description}
                    </div>
                    {rule.defaultParams && Object.keys(rule.defaultParams).length > 0 && (
                      <div className="mt-2 text-xs text-cartistry-text-secondary">
                        <span className="font-medium">Parámetros por defecto:</span>{' '}
                        {Object.entries(rule.defaultParams).map(([k, v]) => (
                          <code key={k} className="ml-1 px-1.5 py-0.5 rounded bg-cartistry-bg font-mono">
                            {k}={String(v)}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
