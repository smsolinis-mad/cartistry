// Bloque 4b — Simulación de escenarios A/B/C.
//
// Corre el motor varias veces con distintos objetivos y devuelve el
// ganador según una métrica configurable. El ganador es el que el usuario
// verá como planograma final; los otros se devuelven como "alternativas"
// para que la UI pueda mostrarlas si lo solicita.

import { Objective } from '@cartistry/types';
import { generatePlanogram, EngineInput, EngineOutput } from './engine';

export interface ScenarioResult {
  label: string;
  objective: Objective;
  output: EngineOutput;
  metrics: ScenarioMetrics;
}

export interface ScenarioMetrics {
  positionsAsignadas: number;
  posicionesSinAsignar: number;
  alertasWarn: number;
  alertasError: number;
  /** Ingresos estimados de los productos colocados (suma de pvp). */
  ingresoEstimado: number;
  /** Margen estimado (suma pvp - precio_compra). */
  margenEstimado: number;
}

export interface ScenariosOutput {
  winner: ScenarioResult;
  alternatives: ScenarioResult[];
}

function computeMetrics(input: EngineInput, output: EngineOutput): ScenarioMetrics {
  const productByEan = new Map(input.products.map((p) => [p.ean, p]));
  let ingreso = 0;
  let margen = 0;
  for (const pos of output.planogram.positions) {
    const prod = productByEan.get(pos.ean);
    if (!prod) continue;
    ingreso += Number(prod.pvp) || 0;
    margen += (Number(prod.pvp) || 0) - (Number(prod.precio_compra) || 0);
  }
  const alerts = output.alerts || [];
  return {
    positionsAsignadas: output.planogram.positions.length,
    posicionesSinAsignar: output.posiciones_sin_asignar.length,
    alertasWarn: alerts.filter((a) => a.severity === 'warn').length,
    alertasError: alerts.filter((a) => a.severity === 'error').length,
    ingresoEstimado: ingreso,
    margenEstimado: margen,
  };
}

/**
 * Corre 3 escenarios:
 *   A — `aumentar_ventas` (maximiza ingresos esperados)
 *   B — `aumentar_margen` (maximiza margen)
 *   C — el objetivo activo del usuario
 *
 * Si el objetivo activo coincide con A o B, se corre sólo el conjunto sin
 * duplicar. El ganador es el escenario que mejor cumple el OBJETIVO ACTIVO
 * según la métrica natural de ese objetivo:
 *   - aumentar_ventas → mayor ingresoEstimado
 *   - aumentar_margen → mayor margenEstimado
 *   - liquidacion → mayor positionsAsignadas (vaciar stock parado)
 *   - promocion / nueva_coleccion → mayor positionsAsignadas
 */
export function runScenarios(baseInput: EngineInput): ScenariosOutput {
  const objetivosBase: Objective[] = ['aumentar_ventas', 'aumentar_margen'];
  const objetivosACorrer: Array<{ label: string; objective: Objective }> = [
    { label: 'A — máximas ventas', objective: 'aumentar_ventas' },
    { label: 'B — máximo margen', objective: 'aumentar_margen' },
  ];
  if (!objetivosBase.includes(baseInput.objective)) {
    objetivosACorrer.push({
      label: `C — objetivo activo (${baseInput.objective})`,
      objective: baseInput.objective,
    });
  }

  const results: ScenarioResult[] = objetivosACorrer.map(({ label, objective }) => {
    const out = generatePlanogram({ ...baseInput, objective });
    return {
      label,
      objective,
      output: out,
      metrics: computeMetrics(baseInput, out),
    };
  });

  // Métrica de selección según el objetivo ACTIVO del usuario.
  const objetivoActivo = baseInput.objective;
  const sortBy = (m: ScenarioMetrics): number => {
    switch (objetivoActivo) {
      case 'aumentar_ventas':
        return m.ingresoEstimado;
      case 'aumentar_margen':
        return m.margenEstimado;
      case 'liquidacion':
      case 'promocion':
      case 'nueva_coleccion':
      default:
        return m.positionsAsignadas;
    }
  };

  const ranked = results.slice().sort((a, b) => sortBy(b.metrics) - sortBy(a.metrics));
  return {
    winner: ranked[0],
    alternatives: ranked.slice(1),
  };
}
