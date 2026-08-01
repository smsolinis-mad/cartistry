// Motor principal de reglas de visual merchandising
// Orquesta la aplicación de las 26 reglas según el objetivo

import { Store, Product, Objective, Planogram, PlanogramPosition, SalesPeriod, Balda, Sale } from '@cartistry/types';
// PlanogramMovement se importa más abajo junto con utils de diff.
import { getRulesByObjective, RULES } from './rules';
import { ProductScorer, ProductScore } from './scorer';
import { PositionScorer, SpaceMap, PositionScore } from './position-scorer';
import { buildForcedGroups, groupKeyOf, groupLabel, ForcedGroup, GroupingResult } from './grouping';

/**
 * Familia de producto: variantes del mismo producto (mismo `tipo` y mismo
 * `subtipo`) son la misma familia, aunque tengan distinto color, EAN o
 * variante. Las variantes de una familia se agrupan en la misma celda
 * sin tope de SKUs (solo limitadas por el área disponible).
 */
function familiaOf(p: { tipo?: string; subtipo?: string }): string {
  const t = (p.tipo || '').trim().toLowerCase();
  const s = (p.subtipo || '').trim().toLowerCase();
  return `${t}|${s}`;
}

/** Normaliza el nombre de colección para comparación (case/trim insensible). */
function coleccionKey(c?: string): string {
  return (c || '').trim().toLowerCase();
}
import { buildAffinityMatrix, affinityScore, AffinityMatrix, AffinityPair } from './affinity';
import { runAllValidators, PlanogramAlert } from './validators';
import { diffPlanograms, extractRuleCode } from './diff';
import { PlanogramMovement } from '@cartistry/types';
import { runRecommender, Recommendation } from './recommender';

export interface EngineInput {
  store: Store;
  products: Product[];
  sales: Sale[];
  currentPeriod: SalesPeriod;
  objective: Objective;
  previousPeriods?: SalesPeriod[];
  /** Posiciones del último planograma guardado (Bloque 6 — diff vs anterior). */
  previousPositions?: PlanogramPosition[];
  configParams?: Record<string, any>;
}

export interface EngineOutput {
  planogram: Planogram;
  posiciones_sin_asignar: Product[];
  debug: string[];
  spaceMap?: SpaceMap;
  forcedGroups?: ForcedGroup[];
  affinity?: AffinityMatrix;
  alerts?: PlanogramAlert[];
  movements?: PlanogramMovement[];
  recommendations?: Recommendation[];
}

export class RulesEngine {
  private input: EngineInput;
  private posiciones_disponibles: Map<string, { balda: Balda; posicion_en_balda: number }> = new Map();
  private asignaciones: Map<string, PlanogramPosition> = new Map(); // EAN → posición (compatibilidad)
  private baldaAsignaciones: Map<string, { products: string[]; espacioUsado: number }> = new Map(); // baldaId → {products: EAN[], espacioUsado}
  private logs: string[] = [];
  private productScores: Map<string, ProductScore> = new Map(); // EAN → score
  private espaciosPorBalda: Map<string, number> = new Map(); // baldaId → espacio disponible en cm²
  private spaceMap: SpaceMap | undefined; // Bloques 2 + 2b (paralelo, no afecta asignación todavía)
  private forcedGroups!: GroupingResult; // Bloque 3b — (coleccion, drop)
  private affinity!: AffinityMatrix;     // Bloque 3c — co-compra ventana 7 días

  constructor(input: EngineInput) {
    this.input = input;
    this.initializePosiciones();
    this.initializeEspaciosPorBalda();
    this.scoreProducts();
    this.scorePositions();
    this.buildForcedGroupingMap();
    this.buildAffinity();
  }

  /**
   * Bloque 3c — Construye la matriz de afinidad sobre la ventana semanal
   * (últimos 7 días por defecto). El motor la consume como bonus de
   * adyacencia: cuando un producto se reparte en un grupo forzado, dentro
   * del bloque se prioriza la balda donde ya está su mejor partner.
   */
  private buildAffinity(): void {
    const windowDays = Number(this.input.configParams?.affinity_window_days) || 7;
    this.affinity = buildAffinityMatrix(this.input.sales, { windowDays });
    const top = this.affinity.pairs.slice(0, 3)
      .map((p) => `${p.eanA}~${p.eanB}=${p.jaccard.toFixed(2)}`)
      .join(', ');
    this.logs.push(
      `[AFFINITY 3c] ventana ${windowDays}d, ${this.affinity.ticketsInWindow} tickets, ${this.affinity.pairs.length} pares con soporte. Top: ${top || '—'}`
    );
  }

  /**
   * Bloque 3b — Construye los grupos forzados (coleccion, drop) sobre el
   * catálogo actual. Determinista: el orden de los grupos preserva la
   * primera aparición de cada (coleccion, drop) en `products`.
   */
  private buildForcedGroupingMap(): void {
    this.forcedGroups = buildForcedGroups(this.input.products);
    const resumen = this.forcedGroups.groups
      .map((g) => `${groupLabel(g)} (${g.totalProducts})`)
      .join(', ');
    this.logs.push(
      `[GROUPS 3b] ${this.forcedGroups.groups.length} grupos forzados: ${resumen || '—'}`
    );
  }

  /**
   * Bloques 2 y 2b — Puntuación de posición + mapa de calor del espacio.
   * Las reglas del Bloque 4 consumen este ranking a través de los helpers
   * `rankBaldasByScore` y `findGoldenShelves` / `findEntryBaldas` / etc.
   */
  private scorePositions(): void {
    const alturaCompradorCm =
      Number(this.input.configParams?.altura_comprador_cm) || 160;
    const scorer = new PositionScorer(this.input.store, { alturaCompradorCm });
    this.spaceMap = scorer.build();
    this.logs.push(
      `[POSITION-SCORE] ${this.spaceMap.zones.length} zonas, ${this.spaceMap.positions.length} posiciones puntuadas (altura comprador ${alturaCompradorCm}cm)`
    );
    const top = this.spaceMap.topPositions
      .map((p) => `${p.muebleNombre}/${p.baldaId.slice(-6)}=${p.total}`)
      .join(', ');
    const bot = this.spaceMap.bottomPositions
      .map((p) => `${p.muebleNombre}/${p.baldaId.slice(-6)}=${p.total}`)
      .join(', ');
    this.logs.push(`[POSITION-SCORE] TOP: ${top || '—'}`);
    this.logs.push(`[POSITION-SCORE] BOTTOM: ${bot || '—'}`);
  }

  private initializeEspaciosPorBalda(): void {
    // Calcular espacio disponible para cada balda basado en medidas del mueble
    for (const mueble of this.input.store.muebles) {
      const profundoMueble = mueble.profundo || 50; // cm

      for (const cara of mueble.caras) {
        // Calcular número de columnas y ancho por columna
        const columnas = new Set(cara.baldas.map(b => b.columna));
        const numColumnas = columnas.size || 1;
        const anchoBaldaPorColumna = (mueble.ancho || 200) / numColumnas; // cm

        for (const balda of cara.baldas) {
          // Espacio disponible en esta balda = ancho × profundo (cm²)
          const espacioDisponible = anchoBaldaPorColumna * profundoMueble;
          this.espaciosPorBalda.set(balda.id, espacioDisponible);
          this.baldaAsignaciones.set(balda.id, { products: [], espacioUsado: 0 });

          this.logs.push(`[ESPACIO] ${balda.id}: ${espacioDisponible.toFixed(0)} cm² disponibles`);
        }
      }
    }
  }

  private initializePosiciones(): void {
    // Mapear todas las baldas y posiciones disponibles
    for (const mueble of this.input.store.muebles) {
      for (const cara of mueble.caras) {
        for (const balda of cara.baldas) {
          // Cada balda puede tener múltiples posiciones según su capacidad
          for (let pos = 0; pos < balda.capacidad; pos++) {
            const posId = `${balda.id}_${pos}`;
            this.posiciones_disponibles.set(posId, { balda, posicion_en_balda: pos });
          }
        }
      }
    }
    this.logs.push(`[INIT] ${this.posiciones_disponibles.size} posiciones disponibles`);
  }

  private scoreProducts(): void {
    const scorer = new ProductScorer(
      this.input.products,
      this.input.sales,
      this.input.currentPeriod,
      this.input.previousPeriods
    );

    const scores = scorer.scoreAll();
    scores.forEach(score => {
      this.productScores.set(score.ean, score);
    });

    this.logs.push(`[SCORING] ${scores.length} productos puntuados`);
  }

  run(): EngineOutput {
    this.logs.push(`[START] Generando planograma para objetivo: ${this.input.objective}`);

    // Obtener límite de celdas disponibles
    const numCeldas = this.input.configParams?.num_celdas || 16;
    this.logs.push(`[CAPACITY] ${numCeldas} celdas disponibles para productos`);

    const planogram: Planogram = {
      id: `planogram_${Date.now()}`,
      store_id: this.input.store.id,
      objetivo: this.input.objective,
      generado_at: new Date().toISOString(),
      positions: [],
    };

    // Lógica especial para LIQUIDACIÓN: agrupar productos sin ventas en un bloque
    if (this.input.objective === 'liquidacion') {
      this.handleLiquidacionStrategy(numCeldas);
    } else {
      // Para otros objetivos, aplicar reglas normales
      const reglasOrdenadas = getRulesByObjective(this.input.objective);
      this.logs.push(`[RULES] Aplicando ${reglasOrdenadas.length} reglas en orden de prioridad`);

      for (const { rule, priority } of reglasOrdenadas) {
        this.logs.push(`[RULE ${rule.code}] Prioridad ${priority} - ${rule.name}`);
        this.applyRule(rule.code);
      }
    }

    // Distribuir productos restantes para llenar baldas al 70%
    // NO hay límite de cantidad de productos, solo de ocupación por balda
    const remainingProducts = this.input.products.filter(p => !this.asignaciones.has(p.ean));
    if (remainingProducts.length > 0) {
      this.logs.push(`[DISTRIBUTE] ${remainingProducts.length} productos sin asignar, intentando llenar baldas al 70%`);
      this.distributeRemaining(remainingProducts);
    }

    // Convertir asignaciones a posiciones del planograma + extraer rule_code
    this.asignaciones.forEach((assignment) => {
      const enriched: PlanogramPosition = {
        ...assignment,
        rule_code: extractRuleCode(assignment.razon),
      };
      planogram.positions.push(enriched);
    });

    // Calcular porcentaje de ocupación total
    let totalEspacioUsado = 0;
    let totalEspacioDisponible = 0;
    const baldaEntries = Array.from(this.baldaAsignaciones.entries());
    for (const [baldaId, asignacion] of baldaEntries) {
      totalEspacioUsado += asignacion.espacioUsado;
      totalEspacioDisponible += (this.espaciosPorBalda.get(baldaId) || 0);
    }
    const porcentajeTotal = totalEspacioDisponible > 0 ? (totalEspacioUsado / totalEspacioDisponible * 100) : 0;

    this.logs.push(`[END] Planograma generado: ${planogram.positions.length} productos, ocupación ${porcentajeTotal.toFixed(1)}%`);

    const posiciones_sin_asignar = this.input.products.filter(
      (p) => !this.asignaciones.has(p.ean)
    );

    // Bloque 5 + 5b — Validadores post-asignación.
    const bestSellerEans = new Set<string>();
    Array.from(this.productScores.entries()).forEach(([ean, s]) => {
      if (s.es_best_seller) bestSellerEans.add(ean);
    });
    const alerts = runAllValidators(
      {
        store: this.input.store,
        products: this.input.products,
        positions: planogram.positions,
        baldaAsignaciones: this.baldaAsignaciones,
        espaciosPorBalda: this.espaciosPorBalda,
        spaceMap: this.spaceMap,
        forcedGroups: this.forcedGroups?.groups,
      },
      bestSellerEans
    );
    if (alerts.length > 0) {
      this.logs.push(`[VALIDATORS] ${alerts.length} alertas emitidas`);
      for (const a of alerts) {
        this.logs.push(`[${a.code}/${a.severity}] ${a.message}`);
      }
    }

    // Bloque 6 — Diff respecto al planograma anterior si se ha pasado.
    let movements: PlanogramMovement[] | undefined;
    const movementsByEan = new Map<string, 'added' | 'removed' | 'moved' | 'stayed'>();
    if (this.input.previousPositions && this.input.previousPositions.length > 0) {
      movements = diffPlanograms(
        this.input.previousPositions,
        planogram.positions,
        this.input.products
      );
      const counts = { added: 0, removed: 0, moved: 0, stayed: 0 };
      for (const m of movements) {
        counts[m.type]++;
        movementsByEan.set(m.ean, m.type);
      }
      this.logs.push(
        `[DIFF] vs anterior: ${counts.added} añadidos, ${counts.removed} retirados, ${counts.moved} movidos, ${counts.stayed} fijos`
      );
    }

    // Bloque 15 — Motor de recomendación.
    const recommendations = runRecommender(
      {
        products: this.input.products,
        positions: planogram.positions,
        baldaAsignaciones: this.baldaAsignaciones,
        spaceMap: this.spaceMap,
      },
      movementsByEan
    );
    if (recommendations.length > 0) {
      this.logs.push(`[RECOMMEND] ${recommendations.length} recomendaciones emitidas`);
      for (const r of recommendations) {
        this.logs.push(`[REC ${r.code}/${r.kind}] ${r.message}`);
      }
    }

    return {
      planogram,
      posiciones_sin_asignar,
      debug: this.logs,
      spaceMap: this.spaceMap,
      forcedGroups: this.forcedGroups?.groups,
      affinity: this.affinity,
      alerts,
      movements,
      recommendations,
    };
  }

  private applyRule(ruleCode: string): void {
    const availableProducts = this.input.products.filter(
      p => !this.asignaciones.has(p.ean)
    );

    if (availableProducts.length === 0) return;

    const numCeldas = this.input.configParams?.num_celdas || 16;
    const celdasRestantes = numCeldas - this.asignaciones.size;
    if (celdasRestantes <= 0) return;

    switch (ruleCode) {
      // ZONA Y VISIBILIDAD - Hard constraints
      case 'ZV-01': // Escaparate
        this.applyEscaparate(availableProducts);
        break;
      case 'ZV-02': // Primera zona entrada
        this.applyPrimeraZona(availableProducts);
        break;
      case 'ZV-03': // Zona caja - impulse
        this.applyZonaCaja(availableProducts);
        break;
      case 'ZV-07': // Golden shelf - CLAVE: Top-sellers en baldas centrales
        this.applyGoldenShelf(availableProducts);
        break;

      // TENDENCIA VENTAS - Critical filters
      case 'TV-04': // Sin ventas → remove from display
        this.applyNoVentas(availableProducts);
        break;
      case 'TV-03': // Best seller
        this.applyBestSeller(availableProducts);
        break;

      // REGLAS PROMOCIONALES - Ordering
      case 'PR-04': // Order by price
        this.applyOrderPrecio(availableProducts);
        break;
      case 'PR-03': // Order by size
        this.applyOrderTamaño(availableProducts);
        break;

      // Otras reglas
      case 'ZV-04': // Fondo
        this.applyFondo(availableProducts);
        break;
      case 'ZV-09': // Imán tráfico
        this.applyImanTrafico(availableProducts);
        break;
      default:
        // Para otras reglas, simplemente distribuir en posiciones disponibles
        break;
    }
  }

  private applyEscaparate(products: any[]): void {
    // Encontrar la balda más visible (escaparate)
    const mostVisibleBalda = this.findMostVisibleBalda();
    if (!mostVisibleBalda) return;

    // Producto con mayor atracción = mayor margen + mejor trending
    const sorted = products.sort((a, b) => {
      const scoreA = (this.productScores.get(a.ean)?.margen_unitario || 0) +
                     (this.productScores.get(a.ean)?.es_best_seller ? 100 : 0);
      const scoreB = (this.productScores.get(b.ean)?.margen_unitario || 0) +
                     (this.productScores.get(b.ean)?.es_best_seller ? 100 : 0);
      return scoreB - scoreA;
    });

    if (sorted.length > 0) {
      this.asignarProducto(
        sorted[0].ean,
        mostVisibleBalda.id,
        0,
        'ZV-01: Escaparate máxima atracción'
      );
      this.logs.push(`[ZV-01] Asignado ${sorted[0].nombre} al escaparate`);
    }
  }

  private applyPrimeraZona(products: any[]): void {
    // Primera zona desde entrada = máxima conversión.
    // Política de placement: cada producto intenta primero la balda de
    // entrada que ya contiene su misma familia (cluster); si no, va a la
    // siguiente balda de entrada disponible por score.
    const entryBaldas = this.findEntryBaldas();
    if (entryBaldas.length === 0) return;
    const entryIds = entryBaldas.map((b) => b.id);

    const sorted = products.sort((a, b) => {
      const convA = this.productScores.get(a.ean)?.tasa_conversion || 0;
      const convB = this.productScores.get(b.ean)?.tasa_conversion || 0;
      return convB - convA;
    }).slice(0, entryBaldas.length);

    let asignados = 0;
    for (const prod of sorted) {
      const baldasOrdenadas = this.sortBaldasByFamily(entryIds, prod.ean);
      for (const baldaId of baldasOrdenadas) {
        const ok = this.asignarProducto(
          prod.ean,
          baldaId,
          0,
          'ZV-02: Primera zona máxima conversión'
        );
        if (ok) {
          asignados++;
          break;
        }
      }
    }
    this.logs.push(`[ZV-02] ${asignados} productos en primera zona`);
  }

  private applyZonaCaja(products: any[]): void {
    // Zona caja = productos pequeños para compra impulsiva
    const checkoutBaldas = this.findCheckoutBaldas();
    if (checkoutBaldas.length === 0) return;

    const smallProducts = products
      .filter(p => !p.medida_largo || p.medida_largo < 15) // pequeños
      .sort((a, b) => {
        const marginA = this.productScores.get(a.ean)?.margen_unitario || 0;
        const marginB = this.productScores.get(b.ean)?.margen_unitario || 0;
        return marginB - marginA;
      })
      .slice(0, checkoutBaldas.length);

    smallProducts.forEach((prod, idx) => {
      this.asignarProducto(
        prod.ean,
        checkoutBaldas[idx].id,
        0,
        'ZV-03: Zona caja compra impulsiva'
      );
    });
    this.logs.push(`[ZV-03] ${smallProducts.length} productos en zona caja`);
  }

  private applyGoldenShelf(products: any[]): void {
    // ZV-07 Golden shelf — Cableado al Bloque 2: las baldas se ordenan por
    // su mejor PositionScore.total (que ya combina tráfico, visibilidad,
    // ventana dorada, rol y proximidad a entrada). Los mejores productos
    // (best-seller + margen + conversión) van a las baldas de mayor score.

    const numCeldas = this.input.configParams?.num_celdas || 16;
    const celdasRestantes = numCeldas - this.asignaciones.size;
    if (celdasRestantes <= 0) return;

    // Ranking de baldas con preferencia por las dentro de la ventana dorada.
    // Si la tienda no tiene ninguna en la ventana, caemos al ranking global.
    let baldaRanking = this.rankBaldasByScore((p) => p.flags.isGoldenShelf);
    if (baldaRanking.length === 0) baldaRanking = this.rankBaldasByScore();

    // Productos ordenados por score compuesto.
    const sorted = products.slice().sort((a, b) => {
      const scoreA = this.productScores.get(a.ean);
      const scoreB = this.productScores.get(b.ean);
      const puntajeA = (scoreA?.es_best_seller ? 100 : 0) +
                       (scoreA?.margen_unitario || 0) +
                       (scoreA?.tasa_conversion || 0) * 10;
      const puntajeB = (scoreB?.es_best_seller ? 100 : 0) +
                       (scoreB?.margen_unitario || 0) +
                       (scoreB?.tasa_conversion || 0) * 10;
      return puntajeB - puntajeA;
    });

    let assignedCount = 0;
    // Asignar el top-N de productos a las top-N baldas, respetando todas
    // las constraints (boutique, espacio físico, máx SKUs, etc).
    //
    // Política: clusterizar productos del mismo tipo en la balda con mayor
    // score. La boutique rule rechaza tipos distintos en la misma balda,
    // así que el siguiente producto incompatible buscará otra balda
    // disponible. El resultado es: 4 NOTEBOOKs en celda dorada A,
    // 4 PENCASEs en celda dorada B, etc.
    for (let i = 0; i < sorted.length && i < celdasRestantes; i++) {
      const product = sorted[i];
      // Prioridad: balda que ya contiene la misma familia (cluster).
      // Si no hay, orden normal por score.
      const baldasOrdenadas = this.sortBaldasByFamily(baldaRanking, product.ean);
      for (const baldaId of baldasOrdenadas) {
        const ok = this.asignarProducto(
          product.ean,
          baldaId,
          0,
          'ZV-07: Golden shelf — top score por spaceMap'
        );
        if (ok) {
          assignedCount++;
          break;
        }
      }
      if (this.asignaciones.size - (celdasRestantes - assignedCount) >= numCeldas) break;
    }

    this.logs.push(`[ZV-07] ${assignedCount} productos asignados al ranking dorado`);
  }

  private applyNoVentas(products: any[]): void {
    // TV-04: Productos sin ventas se retiran
    const noSalesProducts = products.filter(p => {
      const score = this.productScores.get(p.ean);
      return score && score.periodos_sin_ventas > 1;
    });

    // No los asignamos (se quedan en almacén)
    this.logs.push(`[TV-04] ${noSalesProducts.length} productos sin ventas retirados`);
  }

  private applyBestSeller(products: any[]): void {
    // TV-03: Best seller en posición fija (buena visibilidad)
    const bestSeller = products.find(p => {
      const score = this.productScores.get(p.ean);
      return score && score.es_best_seller;
    });

    if (bestSeller) {
      const goldenBaldas = this.findGoldenShelves();
      if (goldenBaldas.length > 0) {
        this.asignarProducto(
          bestSeller.ean,
          goldenBaldas[0].id,
          0,
          'TV-03: Best-seller posición fija'
        );
        this.logs.push(`[TV-03] Best-seller ${bestSeller.nombre} asignado`);
      }
    }
  }

  private applyOrderPrecio(products: any[]): void {
    // PR-04: Ordenar por precio dentro de zona
    // Aplicamos a productos sin asignar ordenándolos de menor a mayor precio
    const sorted = products.sort((a, b) => a.pvp - b.pvp);
    const availableBaldas = Array.from(this.posiciones_disponibles.values())
      .slice(0, sorted.length);

    sorted.forEach((prod, idx) => {
      if (idx < availableBaldas.length) {
        const posId = Array.from(this.posiciones_disponibles.keys())[idx];
        const pos = this.posiciones_disponibles.get(posId);
        if (pos) {
          this.asignarProducto(prod.ean, pos.balda.id, pos.posicion_en_balda, 'PR-04: Orden por precio');
        }
      }
    });
  }

  private applyOrderTamaño(products: any[]): void {
    // PR-03: Ordenar por tamaño (mayor arriba, menor abajo)
    // Esto se aplica dentro de módulos/baldas
    const sorted = products.sort((a, b) => {
      const sizeA = (a.medida_alto || 0) * (a.medida_largo || 0);
      const sizeB = (b.medida_alto || 0) * (b.medida_largo || 0);
      return sizeB - sizeA; // Mayor primero
    });

    this.logs.push(`[PR-03] Productos ordenados por tamaño: ${sorted.slice(0, 3).map(p => p.nombre).join(', ')}`);
  }

  private applyFondo(products: any[]): void {
    // ZV-04: Fondo = descubrimiento y novedad
    const backBaldas = this.findBackBaldas();
    if (backBaldas.length === 0) return;

    const sorted = products
      .sort((a, b) => {
        const trendA = this.productScores.get(a.ean)?.tendencia === 'creciendo' ? 1 : 0;
        const trendB = this.productScores.get(b.ean)?.tendencia === 'creciendo' ? 1 : 0;
        return trendB - trendA;
      })
      .slice(0, backBaldas.length);

    sorted.forEach((prod, idx) => {
      this.asignarProducto(prod.ean, backBaldas[idx].id, 0, 'ZV-04: Fondo descubrimiento');
    });
  }

  private applyImanTrafico(products: any[]): void {
    // ZV-09 Imán de tráfico: colocar productos atractivos (best-seller +
    // margen alto) en zonas con BAJO tráfico para arrastrar al cliente.
    // El objetivo no es exponer el bestseller en su mejor balda — sino
    // sacrificar 1-2 best-sellers para activar zonas frías.
    const lowTrafficBaldas = this.rankBaldasByZoneTraffic(true).slice(0, 2);
    if (lowTrafficBaldas.length === 0) {
      this.logs.push(`[ZV-09] Sin spaceMap, regla no aplicable`);
      return;
    }
    const atractivos = products
      .filter((p) => {
        const s = this.productScores.get(p.ean);
        return s?.es_best_seller || (s?.margen_unitario || 0) > 0;
      })
      .sort((a, b) => {
        const sa = this.productScores.get(a.ean);
        const sb = this.productScores.get(b.ean);
        const pa = (sa?.es_best_seller ? 100 : 0) + (sa?.margen_unitario || 0);
        const pb = (sb?.es_best_seller ? 100 : 0) + (sb?.margen_unitario || 0);
        return pb - pa;
      });

    let imanes = 0;
    for (const baldaId of lowTrafficBaldas) {
      if (atractivos.length === 0) break;
      const product = atractivos.shift();
      if (!product) break;
      const ok = this.asignarProducto(
        product.ean,
        baldaId,
        0,
        'ZV-09: Imán de tráfico — atracción en zona fría'
      );
      if (ok) imanes++;
    }
    this.logs.push(`[ZV-09] ${imanes} imán(es) de tráfico colocados en zonas frías`);
  }

  private distributeRemaining(products: any[]): void {
    // Bloque 3b — Distribuye productos respetando agrupación forzada por
    // (coleccion, drop) y reparto equilibrado.
    // Estrategia:
    //   1) Agrupar productos pendientes por (coleccion, drop) preservando orden
    //   2) Para cada grupo, reservar un bloque de baldas consecutivas a partir
    //      del cursor (preferentemente baldas vacías o ya con el mismo grupo)
    //   3) Repartir round-robin dentro del bloque para no apilar en una sola balda
    //   4) Tras cada grupo, avanzar el cursor más allá del bloque ocupado
    //   5) Pasada final: rellenar cualquier balda aún vacía aunque mezcle grupos
    if (products.length === 0) return;

    let productsSinAsignar = products.filter(p => !this.asignaciones.has(p.ean));
    this.logs.push(`[FILL INICIO] ${productsSinAsignar.length} productos sin asignar`);

    const baldaEntries = Array.from(this.baldaAsignaciones.entries());
    const baldaIds = baldaEntries.map(([id]) => id);
    const totalBaldas = baldaIds.length;

    const groupDeBalda = (baldaId: string): string | null => {
      const asignacion = this.baldaAsignaciones.get(baldaId);
      if (!asignacion || asignacion.products.length === 0) return null;
      const ean = asignacion.products[0];
      const prod = this.input.products.find(p => p.ean === ean);
      return prod ? groupKeyOf(prod) : null;
    };

    // Agrupar pendientes por (coleccion, drop) preservando orden
    const groupOrder: string[] = [];
    const groupToProducts = new Map<string, any[]>();
    const groupLabels = new Map<string, string>();
    for (const p of productsSinAsignar) {
      const key = groupKeyOf(p);
      if (!groupToProducts.has(key)) {
        groupToProducts.set(key, []);
        groupOrder.push(key);
        groupLabels.set(key, groupLabel({ coleccion: p.coleccion || '', drop: p.drop || '' }));
      }
      groupToProducts.get(key)!.push(p);
    }

    // Calcular reparto de baldas por grupo proporcional al nº de productos
    const totalProductos = productsSinAsignar.length;
    const baldasPorGrupoMap = new Map<string, number>();
    let baldasAsignadas = 0;
    for (const key of groupOrder) {
      const productosDelGrupo = groupToProducts.get(key)!.length;
      const ratio = productosDelGrupo / totalProductos;
      const baldas = Math.max(1, Math.round(ratio * totalBaldas));
      baldasPorGrupoMap.set(key, baldas);
      baldasAsignadas += baldas;
    }
    // Ajustar si nos pasamos del total
    if (baldasAsignadas > totalBaldas) {
      let exceso = baldasAsignadas - totalBaldas;
      for (const key of groupOrder.slice().reverse()) {
        if (exceso === 0) break;
        const actual = baldasPorGrupoMap.get(key)!;
        if (actual > 1) {
          const quitar = Math.min(actual - 1, exceso);
          baldasPorGrupoMap.set(key, actual - quitar);
          exceso -= quitar;
        }
      }
    }

    let baldaCursor = 0;

    for (const key of groupOrder) {
      const productosDelGrupo = groupToProducts.get(key)!;
      const baldasReservadas = baldasPorGrupoMap.get(key)!;
      const label = groupLabels.get(key) || key;
      this.logs.push(
        `[GROUP 3b] "${label}" → ${productosDelGrupo.length} productos, ${baldasReservadas} baldas reservadas`
      );

      // Seleccionar el bloque de baldas a usar para este grupo (consecutivas
      // desde el cursor, saltando baldas que ya pertenezcan a OTRO grupo).
      const baldasDelBloque: string[] = [];
      let probadas = 0;
      while (baldasDelBloque.length < baldasReservadas && probadas < totalBaldas) {
        const idx = (baldaCursor + probadas) % totalBaldas;
        const baldaId = baldaIds[idx];
        const g = groupDeBalda(baldaId);
        if (g === null || g === key) {
          baldasDelBloque.push(baldaId);
        }
        probadas++;
      }

      // Bloque 3c — Dentro del bloque del grupo, cada producto se coloca
      // priorizando la balda donde tiene mayor afinidad de co-compra con
      // los productos ya asignados (bonus de adyacencia). Si ninguna balda
      // tiene partners, se cae a la primera balda con sitio (round-robin).
      let progreso = true;
      while (productosDelGrupo.length > 0 && progreso) {
        progreso = false;
        let i = 0;
        while (i < productosDelGrupo.length) {
          const product = productosDelGrupo[i];
          const baldasOrdenadas = this.sortBaldasByAffinity(
            baldasDelBloque,
            product.ean
          );
          let asignado = false;
          for (const baldaId of baldasOrdenadas) {
            const success = this.asignarProductoABaldaConEspacio(
              product.ean,
              baldaId,
              `Grupo "${label}" - ${this.input.objective}`
            );
            if (success) {
              productosDelGrupo.splice(i, 1);
              progreso = true;
              asignado = true;
              this.logs.push(`[FILL GROUP] ${product.nombre} (${label}) → ${baldaId}`);
              break;
            }
          }
          if (!asignado) i++;
        }
      }

      // Avanzar cursor al final del bloque para empezar el siguiente grupo
      if (baldasDelBloque.length > 0) {
        const ultimaBalda = baldasDelBloque[baldasDelBloque.length - 1];
        const ultimaIdx = baldaIds.indexOf(ultimaBalda);
        baldaCursor = (ultimaIdx + 1) % totalBaldas;
      }
    }

    // PASADA FINAL: si quedan productos sin asignar, intentar colocarlos en
    // CUALQUIER balda con espacio (puede mezclar drops como último recurso).
    const restantes = productsSinAsignar.filter(p => !this.asignaciones.has(p.ean));
    if (restantes.length > 0) {
      this.logs.push(`[FALLBACK] ${restantes.length} productos sin asignar, intentando cualquier balda`);
      for (const product of restantes) {
        for (const baldaId of baldaIds) {
          const ok = this.asignarProductoABaldaConEspacio(
            product.ean,
            baldaId,
            `Fallback - ${this.input.objective}`
          );
          if (ok) {
            this.logs.push(`[FALLBACK] ${product.nombre} → ${baldaId}`);
            break;
          }
        }
      }
    }

    const finalRestantes = this.input.products.filter(p => !this.asignaciones.has(p.ean)).length;
    this.logs.push(`[FILL FIN] ${this.asignaciones.size} productos asignados, ${finalRestantes} aún sin asignar`);
  }

  /**
   * Bloque 3c — Ordena las baldas del bloque para el siguiente producto
   * a colocar. Orden de preferencia:
   *
   *   1) Misma FAMILIA (tipo+subtipo): si la balda ya contiene variantes
   *      del mismo producto, las nuevas se agrupan ahí. Esto cluster-
   *      iza los 6 colores del NOTEBOOK A5 en una sola celda.
   *   2) Mayor AFINIDAD de co-compra (Bloque 3c).
   *   3) Empate: orden original (físico).
   */
  private sortBaldasByAffinity(baldas: string[], ean: string): string[] {
    if (baldas.length <= 1) return baldas;
    const candidato = this.input.products.find((p) => p.ean === ean);
    const candidatoFam = candidato ? familiaOf(candidato) : '';
    const scored = baldas.map((baldaId, idx) => {
      const asignacion = this.baldaAsignaciones.get(baldaId);
      let bestScore = 0;
      let mismaFamilia = 0;
      if (asignacion && asignacion.products.length > 0) {
        for (const other of asignacion.products) {
          const s = affinityScore(this.affinity, ean, other);
          if (s > bestScore) bestScore = s;
          if (candidatoFam) {
            const otroProd = this.input.products.find((pr) => pr.ean === other);
            if (otroProd && familiaOf(otroProd) === candidatoFam) {
              mismaFamilia = 1;
              break;
            }
          }
        }
      }
      return { baldaId, idx, score: bestScore, familia: mismaFamilia };
    });
    scored.sort((a, b) => {
      if (a.familia !== b.familia) return b.familia - a.familia;
      if (b.score !== a.score) return b.score - a.score;
      return a.idx - b.idx;
    });
    return scored.map((s) => s.baldaId);
  }

  /**
   * Re-ordena una lista de baldaIds dando MÁXIMA prioridad a las que ya
   * contienen un producto de la misma familia que el candidato. El resto
   * conserva su orden original (por score). Esto fuerza el clustering de
   * variantes (p.ej. los 6 colores del NOTEBOOK A5) en la misma celda,
   * incluso cuando distintas reglas (escaparate, primera zona, golden,
   * etc.) las coloquen en distintas pasadas.
   */
  private sortBaldasByFamily(baldas: string[], ean: string): string[] {
    if (baldas.length <= 1) return baldas;
    const candidato = this.input.products.find((p) => p.ean === ean);
    if (!candidato) return baldas;
    const fam = familiaOf(candidato);
    if (!fam || fam === '|') return baldas;
    const conFamilia: string[] = [];
    const resto: string[] = [];
    for (const id of baldas) {
      const asig = this.baldaAsignaciones.get(id);
      if (!asig || asig.products.length === 0) {
        resto.push(id);
        continue;
      }
      const tieneFamilia = asig.products.some((e) => {
        const p = this.input.products.find((pr) => pr.ean === e);
        return p && familiaOf(p) === fam;
      });
      (tieneFamilia ? conFamilia : resto).push(id);
    }
    return [...conFamilia, ...resto];
  }

  /**
   * Reduce las posiciones del spaceMap a una lista de baldas, ordenadas por
   * el mejor score (`total`) de cualquier posición que contengan. Filtro
   * opcional sobre las posiciones (p.ej. flags.isGoldenShelf, isEntrada).
   *
   * Devuelve un array de IDs de balda en orden de score descendente.
   */
  private rankBaldasByScore(
    filter?: (p: PositionScore) => boolean
  ): string[] {
    if (!this.spaceMap) return [];
    const bestByBalda = new Map<string, PositionScore>();
    for (const p of this.spaceMap.positions) {
      if (filter && !filter(p)) continue;
      const cur = bestByBalda.get(p.baldaId);
      if (!cur || p.total > cur.total) bestByBalda.set(p.baldaId, p);
    }
    return Array.from(bestByBalda.values())
      .sort((a, b) => b.total - a.total)
      .map((p) => p.baldaId);
  }

  /**
   * Misma lógica pero ordenando por trafficScore de la ZONA (Bloque 2b)
   * en lugar del total del Bloque 2. Útil para reglas que dependen de
   * tráfico físico (imán tráfico, zonas frías).
   */
  private rankBaldasByZoneTraffic(ascending = false): string[] {
    if (!this.spaceMap) return [];
    const trafficByBalda = new Map<string, number>();
    const zoneById = new Map(this.spaceMap.zones.map((z) => [z.zoneId, z.trafficScore]));
    for (const p of this.spaceMap.positions) {
      const t = zoneById.get(p.zoneId) ?? 0;
      const cur = trafficByBalda.get(p.baldaId);
      if (cur === undefined || t > cur) trafficByBalda.set(p.baldaId, t);
    }
    const entries = Array.from(trafficByBalda.entries());
    entries.sort((a, b) => (ascending ? a[1] - b[1] : b[1] - a[1]));
    return entries.map(([id]) => id);
  }

  /**
   * Resuelve un baldaId a su objeto Balda. Null si no existe en el store.
   */
  private resolveBalda(baldaId: string): Balda | null {
    return this.getBaldaById(baldaId);
  }

  private findMostVisibleBalda(): Balda | null {
    // Prioridad: escaparate explícito → top score absoluto.
    const escaparate = this.rankBaldasByScore((p) => p.flags.isEscaparate);
    const fallback = this.rankBaldasByScore();
    const id = escaparate[0] || fallback[0];
    return id ? this.resolveBalda(id) : null;
  }

  private findEntryBaldas(): Balda[] {
    // Posiciones cuya cara mira a la entrada (signals.facingEntrada).
    const ids = this.rankBaldasByScore((p) => p.flags.isEntrada);
    return ids.slice(0, 3)
      .map((id) => this.resolveBalda(id))
      .filter((b): b is Balda => !!b);
  }

  private findCheckoutBaldas(): Balda[] {
    // Baldas marcadas como zona de caja (es_zona_caja o tipo='caja').
    const ids = this.rankBaldasByScore((p) => p.flags.isZonaCaja);
    return ids.slice(0, 2)
      .map((id) => this.resolveBalda(id))
      .filter((b): b is Balda => !!b);
  }

  private findGoldenShelves(): Balda[] {
    // Baldas con altura dentro de la ventana dorada (componente goldenShelf=20).
    const ids = this.rankBaldasByScore((p) => p.flags.isGoldenShelf);
    return ids
      .map((id) => this.resolveBalda(id))
      .filter((b): b is Balda => !!b);
  }

  private findBackBaldas(): Balda[] {
    // Baldas cuya cara está en el fondo (no la entrada).
    const ids = this.rankBaldasByScore((p) => p.flags.isFondo);
    return ids.slice(0, 3)
      .map((id) => this.resolveBalda(id))
      .filter((b): b is Balda => !!b);
  }

  private handleLiquidacionStrategy(numCeldas: number): void {
    // Estrategia para LIQUIDACIÓN: agrupar productos sin ventas en una zona

    // 1. Identificar productos en liquidación (sin ventas en últimos períodos)
    const liquidacionProducts = this.input.products.filter(p => {
      const score = this.productScores.get(p.ean);
      return score && score.periodos_sin_ventas > 1; // Producto parado
    });

    const otherProducts = this.input.products.filter(p => {
      const score = this.productScores.get(p.ean);
      return !score || score.periodos_sin_ventas <= 1; // Productos activos
    });

    this.logs.push(`[LIQUIDACION] ${liquidacionProducts.length} productos en liquidación, ${otherProducts.length} productos activos`);

    // 2. Asignar productos en liquidación en un bloque continuo (preferiblemente filas completas)
    const numColumnas = 4; // Asumiendo 4x4 (gondola de prueba)
    const rowsForLiquidacion = Math.ceil(liquidacionProducts.length / numColumnas);
    let rowIndex = 0;

    // Recorrer baldas organizadas por fila
    const baldas = this.getBaldasByRow();

    for (const baldaId of baldas) {
      if (liquidacionProducts.length === 0) break;

      const posId = `${baldaId}_0`;
      if (this.posiciones_disponibles.has(posId)) {
        const pos = this.posiciones_disponibles.get(posId);
        if (pos && liquidacionProducts[0]) {
          this.asignarProducto(
            liquidacionProducts.shift()!.ean,
            baldaId,
            0,
            'Zona de liquidación - productos parados'
          );
        }
      }
    }

    // 3. Rellenar celdas restantes con productos activos
    const remainingProducts = [...liquidacionProducts, ...otherProducts].filter(
      p => !this.asignaciones.has(p.ean)
    );

    if (this.asignaciones.size < numCeldas) {
      this.logs.push(`[LIQUIDACION] Rellenando ${numCeldas - this.asignaciones.size} celdas restantes`);
      this.distributeRemaining(remainingProducts);
    }
  }

  private getBaldasByRow(): string[] {
    // Retorna baldas ordenadas por fila (de arriba a abajo)
    const baldas: any[] = [];

    // Recopilar todas las baldas únicas
    const posValues = Array.from(this.posiciones_disponibles.values());
    for (const pos of posValues) {
      if (pos.balda && !baldas.find(b => b.id === pos.balda.id)) {
        baldas.push(pos.balda);
      }
    }

    // Ordenar por número de fila (ascendente)
    baldas.sort((a, b) => {
      const filaA = parseInt(a.id.split('_').pop() || '0');
      const filaB = parseInt(b.id.split('_').pop() || '0');
      return filaA - filaB;
    });

    return baldas.map(b => b.id);
  }

  private asignarProducto(ean: string, baldaId: string, posicionEnBalda: number, razon: string): boolean {
    const product = this.input.products.find(p => p.ean === ean);
    if (!product) return false;

    // CLUSTER POR FAMILIA — gateway: si una variante del mismo producto
    // (mismo tipo+subtipo) ya está colocada en otra balda, la nueva
    // variante se redirige ahí automáticamente, sin importar qué regla
    // la esté pidiendo. Esto asegura que los 5 colores del NOTEBOOK A5
    // terminan en la misma celda incluso cuando escaparate/primera-zona/
    // golden tratan de repartirlos por separado.
    const baldaFamilia = this.findBaldaWithFamily(product);
    if (baldaFamilia && baldaFamilia !== baldaId) {
      const ok = this.asignarProductoABaldaConEspacio(
        ean,
        baldaFamilia,
        `${razon} [REDIRIGIDO A FAMILIA]`
      );
      if (ok) {
        this.logs.push(
          `[FAMILIA] ${product.nombre} redirigido a ${baldaFamilia} (mismas variantes ya colocadas)`
        );
        return true;
      }
      // Si la balda de familia no acepta (boutique, área, etc.), caemos
      // al placement original.
    }

    // Obtener la balda para validar reglas
    const balda = this.getBaldaById(baldaId);
    if (!balda) return false;

    // REGLA GENERAL: Productos de mayor precio no van en zona más baja
    if (this.isProductoCaroEnZonaBaja(product, balda)) {
      this.logs.push(`[REGLA] Rechazado: ${product.nombre} es caro para zona baja (fila ${balda.numero})`);
      return false;
    }

    // Intentar asignar con consideración de espacio
    return this.asignarProductoABaldaConEspacio(ean, baldaId, razon);
  }

  /**
   * Decodifica la posición física de una balda a partir de su ID:
   *   `balda_<muebleId>_<cara>_<col>_<fila>`
   * Devuelve null si el formato no encaja (p.ej. balda fake / legacy).
   */
  private decodeBaldaPosition(baldaId: string): {
    mueble: string;
    cara: string;
    col: number;
    fila: number;
  } | null {
    const parts = baldaId.split('_');
    if (parts.length < 5) return null;
    // 'balda', <muebleUuid puede llevar guiones>, <cara>, <col>, <fila>
    const fila = Number(parts[parts.length - 1]);
    const col = Number(parts[parts.length - 2]);
    const cara = parts[parts.length - 3];
    const mueble = parts.slice(1, parts.length - 3).join('_');
    if (Number.isNaN(col) || Number.isNaN(fila)) return null;
    return { mueble, cara, col, fila };
  }

  /**
   * REGLA DE COLECCIÓN — las baldas ocupadas por una misma `coleccion`
   * dentro del mismo mueble+cara deben formar un CONJUNTO CONTIGUO
   * (polígono conexo por bordes, 4-adyacencia). Esto cubre línea
   * vertical, horizontal, bloques NxM, L, T, +, escaleras... pero
   * rechaza colocaciones que dejarían una celda aislada o saltada.
   */
  private mantieneRectanguloDeColeccion(
    coleccion: string,
    candidateBaldaId: string
  ): boolean {
    const key = coleccionKey(coleccion);
    if (!key) return true;
    const cand = this.decodeBaldaPosition(candidateBaldaId);
    if (!cand) return true; // baldas legacy/fake → no enforce

    const existentes: { col: number; fila: number }[] = [];
    for (const [bid, asig] of Array.from(this.baldaAsignaciones.entries())) {
      if (asig.products.length === 0) continue;
      if (bid === candidateBaldaId) continue;
      const pos = this.decodeBaldaPosition(bid);
      if (!pos) continue;
      if (pos.mueble !== cand.mueble || pos.cara !== cand.cara) continue;
      const tieneColeccion = asig.products.some((e) => {
        const p = this.input.products.find((pr) => pr.ean === e);
        return p && coleccionKey(p.coleccion) === key;
      });
      if (tieneColeccion) existentes.push({ col: pos.col, fila: pos.fila });
    }

    // Conjunto resultante = existentes + candidata
    const all = [...existentes, { col: cand.col, fila: cand.fila }];
    if (all.length === 1) return true; // primera celda, siempre válida

    // BFS por 4-adyacencia: arrancamos en cualquier celda y comprobamos
    // que se llega a todas las demás del conjunto. Si sobra alguna sin
    // visitar, hay un grupo aislado → rechazo.
    const key2 = (c: number, f: number) => `${c},${f}`;
    const set = new Set(all.map((p) => key2(p.col, p.fila)));
    const visited = new Set<string>();
    const queue: { col: number; fila: number }[] = [all[0]];
    visited.add(key2(all[0].col, all[0].fila));
    while (queue.length > 0) {
      const { col, fila } = queue.shift()!;
      const vecinos = [
        { col: col + 1, fila },
        { col: col - 1, fila },
        { col, fila: fila + 1 },
        { col, fila: fila - 1 },
      ];
      for (const v of vecinos) {
        const k = key2(v.col, v.fila);
        if (set.has(k) && !visited.has(k)) {
          visited.add(k);
          queue.push(v);
        }
      }
    }
    return visited.size === set.size;
  }

  /**
   * Devuelve el baldaId que ya contiene un producto de la misma familia
   * (tipo+subtipo) que el candidato, o null si ninguna lo tiene. Si hay
   * varias, devuelve la que tiene MÁS variantes ya colocadas (consolida
   * mejor el cluster).
   */
  private findBaldaWithFamily(product: any): string | null {
    const fam = familiaOf(product);
    if (!fam || fam === '|') return null;
    let mejor: { id: string; count: number } | null = null;
    for (const [baldaId, asig] of Array.from(this.baldaAsignaciones.entries())) {
      if (asig.products.length === 0) continue;
      let conteo = 0;
      for (const e of asig.products) {
        const p = this.input.products.find((pr) => pr.ean === e);
        if (p && familiaOf(p) === fam) conteo++;
      }
      if (conteo > 0 && (!mejor || conteo > mejor.count)) {
        mejor = { id: baldaId, count: conteo };
      }
    }
    return mejor ? mejor.id : null;
  }

  private asignarProductoABaldaConEspacio(ean: string, baldaId: string, razon: string): boolean {
    const product = this.input.products.find(p => p.ean === ean);
    if (!product || this.asignaciones.has(ean)) return false;

    const balda = this.getBaldaById(baldaId);
    if (!balda) return false;

    const espacioDisponible = this.espaciosPorBalda.get(baldaId) || 0;
    const asignacion = this.baldaAsignaciones.get(baldaId);
    if (!asignacion) return false;

    // HARD CONSTRAINT — coleccion forma rectángulo en el mueble+cara.
    // Las baldas que ya tienen productos de esta coleccion + la
    // candidata deben formar un rectángulo (línea vertical, línea
    // horizontal o bloque). Si no encaja, el motor probará otra balda.
    if (!this.mantieneRectanguloDeColeccion(product.coleccion || '', baldaId)) {
      this.logs.push(
        `[COLECCION] ${product.nombre} rechazado en ${baldaId}: la colección "${product.coleccion}" no formaría rectángulo`
      );
      return false;
    }

    // HARD CONSTRAINT — público objetivo del mueble (sexo_target).
    // Mapeo estricto: 'femenino'↔'mujer', 'masculino'↔'hombre',
    // 'unisex'↔'unisex'. 'indiferente'/undefined = sin restricción.
    // Decisión del usuario: un mueble marcado para un público concreto NO
    // admite productos de otros públicos (ni siquiera unisex).
    const muebleParaSexo = this.input.store.muebles.find((m) =>
      m.caras.some((c) => c.baldas.some((b) => b.id === baldaId))
    );
    const sexoTarget = muebleParaSexo?.sexo_target;
    if (sexoTarget && sexoTarget !== 'indiferente') {
      const sexoProducto = (product.sexo || '').toLowerCase();
      const sexoMap: Record<string, string> = {
        femenino: 'mujer',
        masculino: 'hombre',
        unisex: 'unisex',
      };
      const sexoEsperado = sexoMap[sexoTarget];
      if (sexoEsperado && sexoProducto !== sexoEsperado) {
        this.logs.push(
          `[SEXO] ${product.nombre} (sexo=${sexoProducto || '—'}) rechazado en ${baldaId}: mueble destinado a ${sexoTarget}`
        );
        return false;
      }
    }

    // TOPE DURO: máximo configurable de SKUs por hueco/balda. Si no se pasa el
    // parámetro, se usa 4 por defecto (estándar boutique).
    //
    // RELAJADO PARA FAMILIA: si el producto candidato es de la misma
    // "familia" (tipo + subtipo) que los ya colocados en la balda — p.ej.
    // todas las variantes de color del mismo NOTEBOOK A5 — no aplicamos
    // el tope de SKUs y dejamos que la regla del 70% de área decida.
    // Así un grupo de 6 colores del mismo producto cabe en una celda
    // si físicamente entran.
    const maxSkusPorHueco = Number(this.input.configParams?.max_skus_por_hueco) || 4;
    const asignacionActual = this.baldaAsignaciones.get(baldaId);
    if (asignacionActual && asignacionActual.products.length >= maxSkusPorHueco) {
      const productosEnBaldaCap = asignacionActual.products
        .map((e) => this.input.products.find((pr) => pr.ean === e))
        .filter((p): p is any => Boolean(p));
      const mismaFamilia =
        productosEnBaldaCap.length > 0 &&
        productosEnBaldaCap.every(
          (p) => familiaOf(p) === familiaOf(product)
        );
      if (!mismaFamilia) {
        this.logs.push(`[CAP] ${product.nombre} rechazado en ${baldaId}: balda al máximo (${maxSkusPorHueco} SKUs) y familia distinta`);
        return false;
      }
      // Continuamos: las variantes de la misma familia pueden seguir
      // entrando hasta el límite físico de área (70%).
    }

    // REGLAS BOUTIQUE específicas (categoria insensible a mayúsculas/comillas):
    //   - Solo se mezclan productos con el MISMO drop y la MISMA división
    //   - Si hay un producto grande+caro, solo 1 en la balda
    //   - Si todos son pequeños y comparten tipo, hasta 4 en la balda
    //   - Resto: máximo 3 productos distintos por balda
    const categoriaVentaRaw = this.input.configParams?.categoria_venta || 'boutique';
    const categoriaVenta = String(categoriaVentaRaw)
      .replace(/^["']|["']$/g, '')
      .trim()
      .toLowerCase();
    if (categoriaVenta === 'boutique') {
      const TAMANO_PEQUENO = 15;   // cm de largo
      const TAMANO_GRANDE = 30;    // cm de largo
      const PRECIO_CARO = 100;     // €

      const esGrandeCaro = (p: any) =>
        (Number(p.medida_largo) || 0) >= TAMANO_GRANDE && (Number(p.pvp) || 0) >= PRECIO_CARO;
      const esPequeno = (p: any) => {
        const largo = Number(p.medida_largo) || 0;
        return largo > 0 && largo < TAMANO_PEQUENO;
      };

      const productosEnBalda = asignacion.products
        .map((e) => this.input.products.find((pr) => pr.ean === e))
        .filter((p): p is any => Boolean(p));

      // 1) Bloque 3b — Agrupación forzada (coleccion, drop): si la balda ya
      //    tiene productos de otro grupo forzado, este producto no entra.
      //    Además se conserva el constraint clásico de división (boutique).
      if (productosEnBalda.length > 0) {
        const refKey = groupKeyOf(productosEnBalda[0]);
        const newKey = groupKeyOf(product);
        if (refKey !== newKey) {
          this.logs.push(
            `[BOUTIQUE 3b] ${product.nombre} rechazado en ${baldaId}: grupo distinto ("${groupLabel({ coleccion: product.coleccion || '', drop: product.drop || '' })}" vs "${groupLabel({ coleccion: productosEnBalda[0].coleccion || '', drop: productosEnBalda[0].drop || '' })}")`
          );
          return false;
        }
        const divisionBalda = productosEnBalda[0].division || '';
        const divisionProducto = product.division || '';
        if (divisionBalda !== divisionProducto) {
          this.logs.push(`[BOUTIQUE] ${product.nombre} rechazado en ${baldaId}: división distinta ("${divisionProducto}" vs "${divisionBalda}")`);
          return false;
        }
      }

      // 2) Si el nuevo es grande+caro o ya hay uno en la balda → límite 1
      const yaHayGrandeCaro = productosEnBalda.some(esGrandeCaro);
      if (esGrandeCaro(product) || yaHayGrandeCaro) {
        if (productosEnBalda.length >= 1) {
          this.logs.push(`[BOUTIQUE] ${product.nombre} rechazado en ${baldaId}: producto grande+caro, máx 1 por balda`);
          return false;
        }
      } else {
        // 3) Si todos (existentes + nuevo) son pequeños y mismo tipo → límite 4
        const todos = [...productosEnBalda, product];
        const todosPequenos = todos.every(esPequeno);
        const tipoReferencia = product.tipo || '';
        const todosMismoTipo = todos.every((p) => (p.tipo || '') === tipoReferencia);
        const limite = todosPequenos && todosMismoTipo ? 4 : 3;
        if (productosEnBalda.length >= limite) {
          this.logs.push(`[BOUTIQUE] ${product.nombre} rechazado en ${baldaId}: balda llena (${productosEnBalda.length}/${limite})`);
          return false;
        }
      }
    }

    // Obtener medidas del producto
    const medidaAlto = product.medida_alto && product.medida_alto > 0 ? product.medida_alto : 10;
    const medidaLargo = product.medida_largo && product.medida_largo > 0 ? product.medida_largo : 10;
    const medidaProfundo = product.medida_profundo && product.medida_profundo > 0 ? product.medida_profundo : 20;

    // Obtener medidas de la balda
    const mueble = this.input.store.muebles.find(m => m.caras.some(c => c.baldas.some(b => b.id === baldaId)));
    if (!mueble) return false;

    const numColumnas = new Set(balda.columna ? [balda.columna] : [0]).size;
    const anchoBaldaPorColumna = (mueble.ancho || 200) / (numColumnas || 1);
    const profundoBalda = mueble.profundo || 50;
    const alturaBaldaAproximada = (mueble.alto || 200) / 4; // Aproximación

    // Verificar si cabe físicamente en altura y anchura
    const cabeEnAltura = medidaAlto <= alturaBaldaAproximada;
    const cabeEnAnchura = medidaLargo <= anchoBaldaPorColumna;
    const cabeEnProfundo = medidaProfundo <= profundoBalda;
    const cabeFisicamente = cabeEnAltura && cabeEnAnchura && cabeEnProfundo;

    // Calcular espacio ocupado (largo × profundo) usando el 70% del tamaño
    // físico del producto. Así dejamos aire alrededor para que el producto
    // se exponga al 70% de su tamaño real, no apretado.
    let espacioProducto = medidaLargo * medidaProfundo * 0.7;
    this.logs.push(`[ESPACIO 70%] ${product.nombre}: ${espacioProducto.toFixed(0)} cm² (70% de ${(medidaLargo * medidaProfundo).toFixed(0)})`);

    const espacioRestante = espacioDisponible - asignacion.espacioUsado;
    const espacioUsadoTrasAgregar = asignacion.espacioUsado + espacioProducto;
    const porcentajeTrasAgregar = (espacioUsadoTrasAgregar / espacioDisponible) * 100;

    // REGLA ESTRICTA: la balda no puede pasar del 70% de ocupación.
    // Además, el producto tiene que caber físicamente en alto, ancho y fondo.
    const puedeAgregar = cabeFisicamente && espacioProducto <= espacioRestante && porcentajeTrasAgregar <= 70;

    if (!puedeAgregar) {
      return false;
    }

    // Agregar producto a la balda
    asignacion.products.push(ean);
    asignacion.espacioUsado += espacioProducto;

    // Mantener compatibilidad con estructura antigua
    this.asignaciones.set(ean, {
      id: `pos_${ean}_${Date.now()}`,
      balda_id: baldaId,
      product_id: product.id,
      ean: ean,
      posicion_en_balda: asignacion.products.length - 1,
      razon,
    });

    const nuevoPorcentaje = (asignacion.espacioUsado / espacioDisponible) * 100;
    const razonAgregar = cabeFisicamente ? "(cabe físicamente)" : "(área disponible)";
    this.logs.push(`[ESPACIO] ${product.nombre} → ${baldaId} [${nuevoPorcentaje.toFixed(1)}%] ${razonAgregar}`);
    return true;
  }

  private getBaldaById(baldaId: string): Balda | null {
    for (const mueble of this.input.store.muebles) {
      for (const cara of mueble.caras) {
        for (const balda of cara.baldas) {
          if (balda.id === baldaId) return balda;
        }
      }
    }
    return null;
  }

  private isProductoCaroEnZonaBaja(product: any, balda: Balda): boolean {
    // Determinar si el producto es muy caro (top 10% de precios)
    const precios = this.input.products
      .map(p => p.pvp || 0)
      .filter(p => p > 0)
      .sort((a, b) => b - a);

    if (precios.length === 0) return false;

    const precioTop10 = precios[Math.floor(precios.length * 0.1)]; // Precio del top 10%
    const esProductoMuyCaro = (product.pvp || 0) >= precioTop10;

    // Determinar si es zona más baja (solo la última fila)
    const totalFilas = Math.max(...Array.from(this.posiciones_disponibles.values())
      .map(p => p.balda?.numero || 0)) + 1;
    const esZonaMasBaja = balda.numero === totalFilas - 1; // Solo la última fila

    return esProductoMuyCaro && esZonaMasBaja;
  }
}

export function generatePlanogram(input: EngineInput): EngineOutput {
  const engine = new RulesEngine(input);
  return engine.run();
}
