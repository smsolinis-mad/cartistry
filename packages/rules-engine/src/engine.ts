// Motor principal de reglas de visual merchandising
// Orquesta la aplicación de las 23 reglas según el objetivo

import { Store, Mueble, Cara, Balda } from '@cartistry/types';
import { Product, ProductMetrics, Objective, Planogram, PlanogramPosition } from '@cartistry/types';

export interface EngineInput {
  store: Store;
  products: Product[];
  metrics: ProductMetrics[];
  objective: Objective;
  altura_comprador?: number; // para ZV-07
}

export interface EngineOutput {
  planogram: Planogram;
  posiciones_sin_asignar: Product[];
  debug: string[];
}

export class RulesEngine {
  private input: EngineInput;
  private posiciones_disponibles: Map<string, Balda> = new Map();
  private productos_asignados: Set<string> = new Set();
  private logs: string[] = [];

  constructor(input: EngineInput) {
    this.input = input;
    this.initializePosiciones();
  }

  private initializePosiciones(): void {
    // Recorrer muebles → caras → baldas y mapear disponibilidad
    for (const mueble of this.input.store.muebles) {
      for (const cara of mueble.caras) {
        for (const balda of cara.baldas) {
          this.posiciones_disponibles.set(balda.id, balda);
        }
      }
    }
  }

  run(): EngineOutput {
    this.logs.push(`[START] Generando planograma para objetivo: ${this.input.objective}`);

    const planogram: Planogram = {
      id: `planogram_${Date.now()}`,
      store_id: this.input.store.id,
      objetivo: this.input.objective,
      generado_at: new Date().toISOString(),
      positions: [],
    };

    // TODO: Implementar aplicación de reglas en orden de prioridad
    // 1. Filtros duros (TV-04, ZV-06)
    // 2. Asignaciones fijas (TV-03)
    // 3. Asignaciones por zona (ZV-01..ZV-10)
    // 4. Ordenación (PR-03, PR-04, PR-07)

    this.logs.push(`[END] Planograma generado con ${planogram.positions.length} posiciones asignadas`);

    const posiciones_sin_asignar = this.input.products.filter(
      (p) => !this.productos_asignados.has(p.ean)
    );

    return {
      planogram,
      posiciones_sin_asignar,
      debug: this.logs,
    };
  }
}

export function generatePlanogram(input: EngineInput): EngineOutput {
  const engine = new RulesEngine(input);
  return engine.run();
}
