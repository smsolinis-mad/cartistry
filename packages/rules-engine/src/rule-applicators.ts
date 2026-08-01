// Aplicadores específicos para cada grupo de reglas
// Estos métodos implementan la lógica de cada una de las 26 reglas

import { Balda, Product } from '@cartistry/types';
import { ProductScore } from './scorer';

export class RuleApplicator {
  static applyZVRules(
    scores: ProductScore[],
    baldas: Balda[],
    objetivo: string
  ): Map<string, Balda> {
    const asignaciones = new Map<string, Balda>();

    // ZV-01: Escaparate = Producto de Mayor Atracción
    // Seleccionar el producto con mejor puntuación visual
    const bestVisual = scores.sort((a, b) => {
      const scoreA = (a.margen_unitario * 0.5) + (a.tasa_conversion * 0.5);
      const scoreB = (b.margen_unitario * 0.5) + (b.tasa_conversion * 0.5);
      return scoreB - scoreA;
    })[0];

    if (bestVisual && baldas.length > 0) {
      // Buscar balda de escaparate (primera de entrada, máxima visibilidad)
      const escaparateBalda = baldas.find(b => b.orientacion === 'entrada');
      if (escaparateBalda) {
        asignaciones.set(bestVisual.ean, escaparateBalda);
      }
    }

    return asignaciones;
  }

  static applyTVRules(
    scores: ProductScore[],
    baldas: Balda[]
  ): Map<string, Balda> {
    const asignaciones = new Map<string, Balda>();

    // TV-03: Best-Seller Activo = Posición Fija
    const bestSeller = scores.find(s => s.es_best_seller);
    if (bestSeller && baldas.length > 0) {
      // Asignar a una posición prominente
      asignaciones.set(bestSeller.ean, baldas[0]);
    }

    // TV-04: Producto Sin Ventas en N Períodos → Salida de Exposición
    // Estos NO se asignan (quedan en almacén)
    const conSinVentas = scores.filter(s => s.periodos_sin_ventas > 1);
    // No asignar estos productos

    return asignaciones;
  }

  static applyPRRules(
    scores: ProductScore[],
    baldas: Balda[],
    products: Map<string, Product>
  ): Map<string, Balda> {
    const asignaciones = new Map<string, Balda>();

    // PR-04: Ordenación por Precio dentro de la Zona
    const porPrecio = [...scores].sort((a, b) => {
      const prodA = products.get(a.ean);
      const prodB = products.get(b.ean);
      if (!prodA || !prodB) return 0;
      return prodA.pvp - prodB.pvp;
    });

    // PR-03: Orden Visual por Tamaño
    porPrecio.sort((a, b) => {
      const prodA = products.get(a.ean);
      const prodB = products.get(b.ean);
      if (!prodA || !prodB) return 0;
      // Productos más grandes primero
      const sizeA = (prodA.medida_alto || 0) * (prodA.medida_largo || 0) * (prodA.medida_profundo || 0);
      const sizeB = (prodB.medida_alto || 0) * (prodB.medida_largo || 0) * (prodB.medida_profundo || 0);
      return sizeB - sizeA;
    });

    return asignaciones;
  }

  static scoreProductByObjective(
    score: ProductScore,
    objective: string
  ): number {
    let puntuacion = 0;

    switch (objective) {
      case 'promocion':
        // Productos con margen alto y rotación buena
        puntuacion = score.margen_unitario * 0.6 + score.rotacion_reciente * 0.4;
        break;

      case 'liquidacion':
        // Productos sin ventas recientes (los que queremos liquidar)
        puntuacion = score.periodos_sin_ventas > 0 ? 100 : score.total_unidades_vendidas * 0.5;
        break;

      case 'aumentar_ventas':
        // Productos con mejor tasa de conversión
        puntuacion = score.tasa_conversion * 100 + score.rotacion_reciente * 0.5;
        break;

      case 'aumentar_margen':
        // Productos con mayor margen unitario
        puntuacion = score.margen_unitario * 1.5;
        break;

      case 'nueva_coleccion':
        // Productos nuevos sin histórico
        puntuacion = score.periodos_sin_ventas > 2 ? 100 : 0;
        break;
    }

    return puntuacion;
  }
}
