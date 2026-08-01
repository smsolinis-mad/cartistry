import { createClient } from '@/lib/supabase/client';
import { generatePlanogram } from '@cartistry/rules-engine';
import { Objective, Sale, SalesPeriod, Balda } from '@cartistry/types';
import { caraTocaPasillo, caraToOrientation, type CaraName } from '@/lib/aisle-adjacency';

// Extraer las top 5 reglas usadas del debug log
function extractTopRules(debugLogs: string[]): Array<{ rule: string; count: number; description: string }> {
  const ruleDescriptions: Record<string, string> = {
    'ZV-01': 'Escaparate - Máxima visibilidad',
    'ZV-02': 'Primera zona entrada - Productos destacados',
    'ZV-03': 'Zona caja - Impulse buying',
    'ZV-04': 'Fondo - Descubrimiento y novedad',
    'ZV-05': 'Zona media - Visibilidad óptima',
    'ZV-06': 'Límite de drops - Diversidad visual',
    'ZV-07': 'Golden shelf - Top-sellers en posición óptima',
    'ZV-08': 'Estacionalidad - Productos por temporada',
    'ZV-09': 'Promociones - Visibilidad de ofertas',
    'ZV-10': 'Complementarios - Venta cruzada',
    'TV-01': 'Trending up - Productos en crecimiento',
    'TV-02': 'Caída de ventas - Reubicación',
    'TV-03': 'Best-seller - Posición fija',
    'TV-04': 'Sin ventas - Almacén',
    'TV-05': 'Histórico - Análisis temporal',
    'PR-01': 'Promoción principal',
    'PR-02': 'Promoción secundaria',
    'PR-03': 'Orden por tamaño - Mejor presentación',
    'PR-04': 'Orden por precio - Estrategia de margen',
    'PR-05': 'Orden por color - Estética',
    'PR-06': 'Orden por género',
    'PR-07': 'Ancla de margen',
    'PR-08': 'Bundle - Productos relacionados',
    'PR-09': 'Impulse buying - Artículos complementarios',
    'BOUTIQUE': 'Regla Boutique - 40% visibilidad',
    'LIQUIDACION': 'Liquidación - Agrupación de productos',
    'FILL': 'Distribución inteligente - Ocupación equilibrada',
  };

  const ruleCounts: Record<string, number> = {};

  // Extraer TODAS las reglas mencionadas en los logs (sin filtro restrictivo)
  for (const log of debugLogs) {
    // Buscar códigos de regla en formato [CODIGO]
    const ruleMatches = log.match(/\[(.*?)\]/g);
    if (ruleMatches) {
      for (const match of ruleMatches) {
        const rule = match.replace(/[\[\]]/g, '');
        // Contar si contiene códigos de regla válidos
        if (rule.startsWith('ZV-') || rule.startsWith('TV-') || rule.startsWith('PR-') ||
            rule === 'BOUTIQUE' || rule === 'LIQUIDACION' || rule === 'FILL') {
          ruleCounts[rule] = (ruleCounts[rule] || 0) + 1;
        }
      }
    }
  }

  // Ordenar por count descendente y tomar top 5 para mostrar en el PDF
  const sortedRules = Object.entries(ruleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rule, count]) => ({
      rule,
      count,
      description: ruleDescriptions[rule] || rule,
    }));

  return sortedRules;
}

interface MuebleData {
  id: string;
  nombre: string;
  tipo?: 'mueble' | 'caja';
  alto: number;
  num_filas: number;
  num_columnas: number;
  es_zona_caja?: boolean;
  es_escaparate?: boolean;
  posicion_cuadricula?: string;
  cara_superior?: boolean;
  cara_frontal?: boolean;
  cara_trasera?: boolean;
  cara_izquierda?: boolean;
  cara_derecha?: boolean;
  // Compat histórica: altura por fila a nivel mueble (todas las caras igual).
  filas_config?: Array<{ alto_cm?: number }>;
  // Nuevo: grid de baldas por cara. Cuando existe, sustituye a los campos
  // num_columnas/num_filas/filas_config para esa cara.
  caras_config?: Record<string, {
    cols?: number;
    filas?: number;
    filas_config?: Array<{ alto_cm?: number }>;
  }>;
}

interface ProductData {
  id: string;
  ean: string;
  nombre: string;
  precio_compra: number;
  pvp: number;
  unidades: number;
}

// Resuelve el grid efectivo (cols/filas/alturas) de una cara concreta.
// Prioridad: caras_config[cara] > mueble.num_columnas/num_filas/filas_config.
function resolveCaraGrid(mueble: MuebleData, cara: string): {
  cols: number;
  filas: number;
  filas_config: Array<{ alto_cm?: number }>;
} {
  const perCara = mueble.caras_config?.[cara];
  const cols = Number(perCara?.cols) || mueble.num_columnas || 1;
  const filas = Number(perCara?.filas) || mueble.num_filas || 4;
  const filasConfig = Array.isArray(perCara?.filas_config)
    ? perCara!.filas_config!
    : Array.isArray(mueble.filas_config)
      ? mueble.filas_config
      : [];
  return { cols, filas, filas_config: filasConfig };
}

// Genera la estructura de baldas para una cara concreta del mueble.
// Cada cara abierta tiene su propio grid (filas × cols). La altura por
// fila usa `filas_config` cuando coincide en longitud con `filas`; si no,
// reparto uniforme `alto / filas`.
//
// Caso especial — cara 'superior': es una superficie horizontal (como una
// mesa), no una pila de baldas. Todas las posiciones quedan a la altura
// del mueble (`alto`) y no hay tope físico para el producto que se ponga
// encima ("altura libre hasta el cielo"). Por eso se ignora `filas_config`.
function generateBaldas(mueble: MuebleData, cara: string = 'frontal'): Balda[] {
  const baldas: Balda[] = [];
  const { cols: numColumnas, filas: numFilas, filas_config: filasConfig } =
    resolveCaraGrid(mueble, cara);
  const alturaTotal = mueble.alto || 200;

  // Pre-calcular altura_suelo por fila.
  const alturasSuelo: number[] = [];
  if (cara === 'superior') {
    for (let fila = 0; fila < numFilas; fila++) {
      alturasSuelo.push(alturaTotal);
    }
  } else {
    const alturaUniforme = alturaTotal / numFilas;
    const usaConfig = filasConfig.length === numFilas;
    let acumulado = 0;
    for (let fila = 0; fila < numFilas; fila++) {
      alturasSuelo.push(acumulado);
      const alturaEstaFila = usaConfig
        ? Number(filasConfig[fila]?.alto_cm) || alturaUniforme
        : alturaUniforme;
      acumulado += alturaEstaFila;
    }
  }

  for (let fila = 0; fila < numFilas; fila++) {
    for (let col = 0; col < numColumnas; col++) {
      baldas.push({
        id: `balda_${mueble.id}_${cara}_${col}_${fila}`,
        columna: col,
        numero: fila,
        altura_suelo: alturasSuelo[fila],
        tipo: 'balda',
        capacidad: 1,
        tamaños_admitidos: ['XXG', 'XG', 'G', 'M', 'P', 'Mini'],
      });
    }
  }

  return baldas;
}

export async function POST(request: Request) {
  try {
    const { storeId, objective, maxSkusPorHueco: maxSkusBody } = await request.json();

    if (!storeId || !objective) {
      return Response.json(
        { error: 'storeId y objective son requeridos' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Obtener tienda
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !storeData) {
      return Response.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      );
    }

    // Obtener productos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId);

    if (productsError) {
      return Response.json(
        { error: 'Error al obtener productos' },
        { status: 500 }
      );
    }

    // Obtener ventas
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('store_id', storeId)
      .order('fecha', { ascending: false });

    if (salesError) {
      return Response.json(
        { error: 'Error al obtener ventas' },
        { status: 500 }
      );
    }

    if (!products || products.length === 0 || !sales || sales.length === 0) {
      return Response.json(
        { error: 'Se requieren productos y ventas para generar planograma' },
        { status: 400 }
      );
    }

    // Calcular períodos de venta (semanas)
    const salesTyped = sales as unknown as Sale[];
    const currentPeriodEnd = new Date();
    const currentPeriodStart = new Date(currentPeriodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    const currentPeriodSales = salesTyped.filter(s => {
      const saleDate = new Date(s.fecha);
      return saleDate >= currentPeriodStart && saleDate <= currentPeriodEnd;
    });

    const currentPeriod: SalesPeriod = {
      start_date: currentPeriodStart.toISOString(),
      end_date: currentPeriodEnd.toISOString(),
      sales: currentPeriodSales.length > 0 ? currentPeriodSales : salesTyped.slice(0, 100), // usar últimas 100 si no hay de esta semana
    };

    // Obtener muebles de la tienda
    const { data: muesData, error: muesError } = await supabase
      .from('muebles')
      .select('*')
      .eq('store_id', storeId);

    if (muesError) {
      console.error('Error al obtener muebles:', muesError);
    }

    // Pasillos dibujados en el grid de la tienda. Se usan para derivar qué
    // caras de cada mueble dan a pasillo principal, fusionando con los flags
    // explícitos (OR lógico).
    const pasillosArr: Array<{ col: number; row: number }> = Array.isArray(
      (storeData as any).pasillos
    )
      ? (storeData as any).pasillos
          .filter(
            (c: any) =>
              c &&
              Number.isFinite(Number(c.col)) &&
              Number.isFinite(Number(c.row))
          )
          .map((c: any) => ({ col: Number(c.col), row: Number(c.row) }))
      : [];

    // Transformar muebles al modelo del motor.
    // - El usuario marca qué caras (superior/frontal/trasera/izquierda/derecha)
    //   contienen producto. Cada cara abierta genera una Cara con su propio
    //   set de baldas (misma cuadrícula num_filas × num_columnas por cara).
    // - La adyacencia con pasillos dibujados determina `es_pasillo_principal`
    //   por cara.
    // - tipo='caja' implica `es_zona_caja=true` por definición.
    const muebles = (muesData || []).map((mueble: MuebleData) => {
      const esCaja = mueble.tipo === 'caja';
      const esZonaCaja = !!mueble.es_zona_caja || esCaja;
      const esEscaparate = !!mueble.es_escaparate;
      const entrada = (storeData.entrada_orientacion || 'entrada') as
        'entrada' | 'fondo' | 'izquierda' | 'derecha' | 'superior';

      const flags: Record<CaraName, boolean> = {
        frontal: !!mueble.cara_frontal,
        trasera: !!mueble.cara_trasera,
        izquierda: !!mueble.cara_izquierda,
        derecha: !!mueble.cara_derecha,
        superior: !!mueble.cara_superior,
      };

      const carasNames: CaraName[] = (Object.keys(flags) as CaraName[]).filter(
        (k) => flags[k]
      );

      // Si no hay ninguna cara abierta, dejamos por defecto la frontal para
      // que el motor no se quede sin baldas (legacy/seguridad).
      const efectivasNames: CaraName[] = carasNames.length > 0 ? carasNames : ['frontal'];

      const caras = efectivasNames.map((caraName) => {
        const orientacion = caraToOrientation(caraName, entrada);
        const tocaPasillo = caraTocaPasillo(
          mueble.posicion_cuadricula,
          caraName,
          pasillosArr,
          entrada
        );
        return {
          id: `cara_${mueble.id}_${caraName}`,
          orientacion,
          visibilidad: (tocaPasillo ? 'alta' : 'media') as 'alta' | 'media' | 'baja',
          es_pasillo_principal: tocaPasillo,
          // El flag de escaparate solo se aplica a la cara frontal del mueble.
          es_escaparate: caraName === 'frontal' && esEscaparate,
          // Cada cara abierta tiene su propio grid de baldas. Identificamos las
          // baldas con el nombre de la cara para evitar colisiones.
          baldas: generateBaldas(mueble, caraName),
        };
      });

      return {
        ...mueble,
        es_zona_caja: esZonaCaja,
        es_escaparate: esEscaparate,
        posicion_cuadricula: mueble.posicion_cuadricula || undefined,
        caras,
      };
    });

    const storeWithMuebles = {
      ...storeData,
      muebles,
    };

    // Calcular número de celdas disponibles a partir de las baldas
    // efectivamente generadas (suma por cara de cada mueble).
    const firstMueble = muebles[0];
    const numCeldas =
      muebles.reduce(
        (acc, m) => acc + m.caras.reduce((s, c) => s + c.baldas.length, 0),
        0
      ) || 16; // Default 4x4

    // Bloque 6 — Cargar el último planograma guardado para esta tienda
    // (sirve para calcular el diff "qué ha cambiado esta semana").
    // Defensivo: si la consulta falla por cualquier motivo (RLS, columna
    // ausente, etc.) seguimos sin diff en lugar de tirar todo abajo.
    let previousPositions: any[] = [];
    try {
      const { data: lastPlano, error: lastPlanoErr } = await supabase
        .from('planograms')
        .select('datos_json, generado_at')
        .eq('store_id', storeId)
        .order('generado_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastPlanoErr) {
        console.warn('[planograma] No se pudo cargar el último planograma:', lastPlanoErr.message);
      } else if (Array.isArray((lastPlano?.datos_json as any)?.positions)) {
        previousPositions = (lastPlano!.datos_json as any).positions as any[];
      }
    } catch (e) {
      console.warn('[planograma] Excepción cargando último planograma:', e);
    }

    // Generar planograma usando el motor de reglas
    const result = generatePlanogram({
      store: storeWithMuebles as any,
      products: products as any,
      sales: salesTyped,
      currentPeriod,
      objective: objective as Objective,
      previousPositions,
      configParams: {
        altura_comprador_cm: 160,
        max_drops: 2,
        num_celdas: numCeldas, // Pasar el número de celdas a llenar
        categoria_venta: storeData.categoria_venta || 'boutique', // Categoría de venta para aplicar reglas
        max_skus_por_hueco:
          Number((storeData as any).max_skus_por_hueco) ||
          Number(maxSkusBody) ||
          4, // Tope de SKUs distintos por hueco (BD → body → default 4)
      },
    });

    // Para MVP: si no hay asignaciones, generar ejemplo con top productos
    if (result.planogram.positions.length === 0 && products && products.length > 0) {
      const topProducts = [...products].sort((a: ProductData, b: ProductData) => b.pvp - a.pvp).slice(0, 5);
      result.planogram.positions = topProducts.map((prod: ProductData, idx: number) => ({
        id: `pos_${prod.id}_${idx}`,
        balda_id: `balda_ejemplo_${idx}`,
        product_id: prod.id,
        ean: prod.ean,
        posicion_en_balda: idx,
        razon: `Producto seleccionado por objetivo: ${objective}`,
      }));
    }

    // Obtener primer mueble (su primera cara) para estructura visual.
    // Con grids por cara, deducimos cols/filas de las baldas generadas.
    const firstCara = firstMueble?.caras?.[0];
    const estructuraGrid = firstCara && firstCara.baldas.length > 0
      ? {
          num_columnas: firstCara.baldas.reduce(
            (m: number, b: { columna: number }) => Math.max(m, b.columna),
            0
          ) + 1,
          num_filas: firstCara.baldas.reduce(
            (m: number, b: { numero: number }) => Math.max(m, b.numero),
            0
          ) + 1,
        }
      : { num_columnas: 1, num_filas: 4 };

    // No se guarda automáticamente: el planograma solo se persiste en el
    // historial cuando el usuario pulsa "Guarda tu diseño" en la interfaz.

    // Extraer las top 3 reglas usadas del debug log
    const topRules = extractTopRules(result.debug || []);

    // Marcar productos de liquidación si el objetivo es liquidación
    if (objective === 'liquidacion') {
      // Identificar productos sin ventas recientes (últimos 30 días)
      const treintaDiasAtras = new Date();
      treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

      const productosConVentasRecientes = new Set(
        sales
          .filter((s: any) => new Date(s.fecha) >= treintaDiasAtras)
          .map((s: any) => s.ean)
      );

      // Marcar posiciones con productos sin ventas recientes
      result.planogram.positions = result.planogram.positions.map((pos: any) => {
        const tienVentasRecientes = productosConVentasRecientes.has(pos.ean);
        if (!tienVentasRecientes) {
          pos.razon = (pos.razon || '') + ' [LIQUIDACION]';
        }
        return pos;
      });
    }

    return Response.json({
      success: true,
      planogram: result.planogram,
      unassignedProducts: result.posiciones_sin_asignar.length,
      savedId: undefined,
      topRules,
      debug: process.env.NODE_ENV === 'development' ? result.debug : undefined,
      spaceMap: result.spaceMap,
      alerts: result.alerts || [],
      movements: result.movements || [],
      recommendations: result.recommendations || [],
    });
  } catch (error) {
    console.error('Error generating planogram:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Error generando planograma',
      },
      { status: 500 }
    );
  }
}
