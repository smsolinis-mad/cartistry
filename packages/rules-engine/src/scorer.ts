// Cálculo de métricas de productos para la toma de decisiones del motor

import { Product, ProductMetrics, Sale, SalesPeriod } from '@cartistry/types';

export interface ProductScore {
  ean: string;
  nombre: string;
  margen_unitario: number;
  total_unidades_vendidas: number;
  rotacion_reciente: number;
  tasa_conversion: number;
  tendencia: 'creciendo' | 'cayendo' | 'estable' | 'sin_ventas';
  periodos_sin_ventas: number;
  es_best_seller: boolean;
  posicion_ranking: number; // rank entre todos los productos
}

export class ProductScorer {
  constructor(
    private products: Product[],
    private sales: Sale[],
    private currentPeriod: SalesPeriod,
    private previousPeriods?: SalesPeriod[]
  ) {}

  scoreAll(): ProductScore[] {
    const scores: ProductScore[] = [];

    for (const product of this.products) {
      scores.push(this.scoreProduct(product));
    }

    // Calcular ranking
    const sortedByVentas = [...scores].sort((a, b) => b.total_unidades_vendidas - a.total_unidades_vendidas);
    scores.forEach(score => {
      score.posicion_ranking = sortedByVentas.findIndex(s => s.ean === score.ean) + 1;
      score.es_best_seller = score.posicion_ranking === 1;
    });

    return scores;
  }

  scoreProduct(product: Product): ProductScore {
    const ventasProducto = this.sales.filter(s => s.ean === product.ean);
    const ventasActuales = this.currentPeriod.sales.filter(s => s.ean === product.ean);

    const totalUnidades = ventasProducto.reduce((sum, v) => sum + v.unidades_vendidas, 0);
    const rotacionReciente = ventasActuales.reduce((sum, v) => sum + v.unidades_vendidas, 0);
    const tasaConversion = product.unidades > 0 ? rotacionReciente / product.unidades : 0;
    const margenUnitario = product.pvp - product.precio_compra;

    const tendencia = this.calculateTendencia(product.ean);
    const periodossinVentas = this.calculatePeriodosSinVentas(product.ean);

    return {
      ean: product.ean,
      nombre: product.nombre,
      margen_unitario: margenUnitario,
      total_unidades_vendidas: totalUnidades,
      rotacion_reciente: rotacionReciente,
      tasa_conversion: tasaConversion,
      tendencia,
      periodos_sin_ventas: periodossinVentas,
      es_best_seller: false, // se calcula después
      posicion_ranking: 0, // se calcula después
    };
  }

  private calculateTendencia(ean: string): 'creciendo' | 'cayendo' | 'estable' | 'sin_ventas' {
    const periodos = [
      this.currentPeriod,
      ...(this.previousPeriods || []),
    ];

    if (periodos.length < 2) {
      return 'estable';
    }

    const ventasActuales = periodos[0].sales.filter(s => s.ean === ean).reduce((sum, s) => sum + s.unidades_vendidas, 0);
    const ventasAnterior = periodos[1].sales.filter(s => s.ean === ean).reduce((sum, s) => sum + s.unidades_vendidas, 0);

    if (ventasActuales === 0 && ventasAnterior === 0) {
      return 'sin_ventas';
    }

    if (ventasActuales === 0) {
      return 'cayendo';
    }

    if (ventasAnterior === 0) {
      return 'creciendo';
    }

    const cambio = ((ventasActuales - ventasAnterior) / ventasAnterior) * 100;
    if (cambio > 10) return 'creciendo';
    if (cambio < -10) return 'cayendo';
    return 'estable';
  }

  private calculatePeriodosSinVentas(ean: string): number {
    const periodos = [
      this.currentPeriod,
      ...(this.previousPeriods || []),
    ];

    let contador = 0;
    for (const periodo of periodos) {
      const ventas = periodo.sales.filter(s => s.ean === ean);
      if (ventas.length === 0 || ventas.every(s => s.unidades_vendidas === 0)) {
        contador++;
      } else {
        break;
      }
    }

    return contador;
  }
}
