// Definición de las 26 reglas de visual merchandising con sus prioridades

import { Objective } from '@cartistry/types';

export type RuleCode =
  | 'ZV-01' | 'ZV-02' | 'ZV-03' | 'ZV-04' | 'ZV-05' | 'ZV-06' | 'ZV-07' | 'ZV-08' | 'ZV-09' | 'ZV-10'
  | 'TV-01' | 'TV-02' | 'TV-03' | 'TV-04' | 'TV-05'
  | 'PR-01' | 'PR-02' | 'PR-03' | 'PR-04' | 'PR-05' | 'PR-06' | 'PR-07' | 'PR-08' | 'PR-09';

export interface Rule {
  code: RuleCode;
  name: string;
  group: 'ZV' | 'TV' | 'PR';
  description: string;
  priorities: {
    promocion: number;
    liquidacion: number;
    aumentar_ventas: number;
    aumentar_margen: number;
    nueva_coleccion: number;
  };
  configurable?: boolean;
  defaultParams?: Record<string, any>;
}

// Mapeo de objetivo a clave de prioridades
const objectiveMap: Record<Objective, keyof Rule['priorities']> = {
  promocion: 'promocion',
  liquidacion: 'liquidacion',
  aumentar_ventas: 'aumentar_ventas',
  aumentar_margen: 'aumentar_margen',
  nueva_coleccion: 'nueva_coleccion',
};

export const RULES: Record<RuleCode, Rule> = {
  // GRUPO ZV — ZONA Y VISIBILIDAD (10 reglas)
  'ZV-01': {
    code: 'ZV-01',
    name: 'Escaparate = Producto de Mayor Atracción',
    group: 'ZV',
    description: 'El escaparate se reserva para el producto con mayor poder de atracción visual',
    priorities: { promocion: 1, liquidacion: 3, aumentar_ventas: 1, aumentar_margen: 2, nueva_coleccion: 2 },
  },
  'ZV-02': {
    code: 'ZV-02',
    name: 'Primera Zona de Entrada = Máxima Conversión',
    group: 'ZV',
    description: 'Los primeros metros desde la puerta reciben los productos con mayor tasa de conversión reciente',
    priorities: { promocion: 2, liquidacion: 1, aumentar_ventas: 2, aumentar_margen: 3, nueva_coleccion: 4 },
  },
  'ZV-03': {
    code: 'ZV-03',
    name: 'Zona de Caja = Compra Impulsiva y Cross-Sell',
    group: 'ZV',
    description: 'El espacio adyacente al punto de pago se destina a producto de tamaño pequeño o mini',
    priorities: { promocion: 3, liquidacion: 4, aumentar_ventas: 3, aumentar_margen: 1, nueva_coleccion: 5 },
  },
  'ZV-04': {
    code: 'ZV-04',
    name: 'Fondo de Tienda = Descubrimiento y Fidelización',
    group: 'ZV',
    description: 'El espacio más alejado de la entrada recibe producto de novedad, colección especial',
    priorities: { promocion: 6, liquidacion: 6, aumentar_ventas: 5, aumentar_margen: 4, nueva_coleccion: 3 },
  },
  'ZV-05': {
    code: 'ZV-05',
    name: 'Densidad Decreciente desde Entrada hacia Fondo',
    group: 'ZV',
    description: 'Las zonas de alta visibilidad se trabajan con menor densidad para maximizar impacto visual',
    priorities: { promocion: 4, liquidacion: 5, aumentar_ventas: 4, aumentar_margen: 3, nueva_coleccion: 6 },
  },
  'ZV-06': {
    code: 'ZV-06',
    name: 'Límite Máximo de Drops Simultáneos en Exposición',
    group: 'ZV',
    description: 'No pueden coexistir más de N drops activos simultáneamente',
    priorities: { promocion: 2, liquidacion: 7, aumentar_ventas: 3, aumentar_margen: 2, nueva_coleccion: 1 },
    configurable: true,
    defaultParams: { max_drops: 2 },
  },
  'ZV-07': {
    code: 'ZV-07',
    name: 'Golden Shelf Calibrado por Perfil de Comprador',
    group: 'ZV',
    description: 'La balda de máxima atención visual se determina según la altura media del comprador',
    priorities: { promocion: 2, liquidacion: 3, aumentar_ventas: 2, aumentar_margen: 1, nueva_coleccion: 3 },
    configurable: true,
    defaultParams: { altura_comprador_cm: 160 },
  },
  'ZV-08': {
    code: 'ZV-08',
    name: 'Segmentación del Espacio por Perfil de Comprador',
    group: 'ZV',
    description: 'Se asignan zonas distintas del espacio a distintos perfiles de comprador',
    priorities: { promocion: 7, liquidacion: 7, aumentar_ventas: 2, aumentar_margen: 2, nueva_coleccion: 7 },
    configurable: true,
  },
  'ZV-09': {
    code: 'ZV-09',
    name: 'Imán de Tráfico / Product Journey Guiado',
    group: 'ZV',
    description: 'Se diseña un recorrido interior intencionado mediante productos de alta atracción',
    priorities: { promocion: 3, liquidacion: 4, aumentar_ventas: 1, aumentar_margen: 3, nueva_coleccion: 4 },
    configurable: true,
  },
  'ZV-10': {
    code: 'ZV-10',
    name: 'Zona Premium = Colección de Precio Más Alto',
    group: 'ZV',
    description: 'Los productos de precio más alto se agrupan en una zona exclusiva interior',
    priorities: { promocion: 3, liquidacion: 6, aumentar_ventas: 4, aumentar_margen: 1, nueva_coleccion: 3 },
    configurable: true,
    defaultParams: { umbral_incremento_ventas: 200 },
  },

  // GRUPO TV — TENDENCIA DE VENTAS (5 reglas)
  'TV-01': {
    code: 'TV-01',
    name: 'Producto en Caída Sostenida → Retirar de Posición Premium',
    group: 'TV',
    description: 'Si un producto muestra descenso sostenido durante 2+ períodos, se retira de posiciones premium',
    priorities: { promocion: 4, liquidacion: 1, aumentar_ventas: 4, aumentar_margen: 5, nueva_coleccion: 2 },
    configurable: true,
    defaultParams: { periodos: 2 },
  },
  'TV-02': {
    code: 'TV-02',
    name: 'Producto con Aceleración de Ventas → Ascender de Zona',
    group: 'TV',
    description: 'Si un producto acumula crecimiento durante 2+ períodos, asciende a posición de mayor tráfico',
    priorities: { promocion: 5, liquidacion: 4, aumentar_ventas: 2, aumentar_margen: 3, nueva_coleccion: 8 },
    configurable: true,
    defaultParams: { periodos: 2 },
  },
  'TV-03': {
    code: 'TV-03',
    name: 'Best-Seller Activo = Posición Fija',
    group: 'TV',
    description: 'El producto con mayor volumen de ventas no se reubica salvo conflicto de prioridad superior',
    priorities: { promocion: 7, liquidacion: 5, aumentar_ventas: 1, aumentar_margen: 2, nueva_coleccion: 9 },
  },
  'TV-04': {
    code: 'TV-04',
    name: 'Producto Sin Ventas en N Períodos → Salida de Exposición',
    group: 'TV',
    description: 'Si un producto acumula N períodos sin venta, sale del espacio expositivo',
    priorities: { promocion: 6, liquidacion: 1, aumentar_ventas: 6, aumentar_margen: 7, nueva_coleccion: 3 },
    configurable: true,
    defaultParams: { periodos_sin_venta: 1 },
  },
  'TV-05': {
    code: 'TV-05',
    name: 'Rotación Programada por Tiempo de Exposición',
    group: 'TV',
    description: 'Ningún producto permanece en la misma posición más de 1 semana para evitar ceguera',
    priorities: { promocion: 5, liquidacion: 6, aumentar_ventas: 3, aumentar_margen: 4, nueva_coleccion: 6 },
  },

  // GRUPO PR — REGLAS PROMOCIONALES (9 reglas)
  'PR-01': {
    code: 'PR-01',
    name: 'Producto en Promoción → Altura de Ojos y Señalización',
    group: 'PR',
    description: 'Todo producto con descuento activo ocupa baldas a altura de ojos',
    priorities: { promocion: 1, liquidacion: 2, aumentar_ventas: 3, aumentar_margen: 6, nueva_coleccion: 7 },
  },
  'PR-02': {
    code: 'PR-02',
    name: 'Coherencia de Colección en el Lineal',
    group: 'PR',
    description: 'Las referencias de una misma colección se agrupan en un mismo espacio continuo',
    priorities: { promocion: 3, liquidacion: 5, aumentar_ventas: 4, aumentar_margen: 4, nueva_coleccion: 2 },
  },
  'PR-03': {
    code: 'PR-03',
    name: 'Orden Visual por Tamaño: Mayor Arriba, Menor Abajo',
    group: 'PR',
    description: 'Dentro de cada módulo, productos mayores en baldas superiores y menores en inferiores',
    priorities: { promocion: 4, liquidacion: 6, aumentar_ventas: 5, aumentar_margen: 5, nueva_coleccion: 5 },
  },
  'PR-04': {
    code: 'PR-04',
    name: 'Ordenación por Precio dentro de la Zona',
    group: 'PR',
    description: 'Dentro de una misma zona, productos ordenados de menor a mayor precio',
    priorities: { promocion: 5, liquidacion: 3, aumentar_ventas: 4, aumentar_margen: 2, nueva_coleccion: 6 },
  },
  'PR-05': {
    code: 'PR-05',
    name: 'Novedad = Señalización Diferenciada Obligatoria',
    group: 'PR',
    description: 'Todo producto nuevo lleva señalización propia',
    priorities: { promocion: 2, liquidacion: 7, aumentar_ventas: 2, aumentar_margen: 3, nueva_coleccion: 1 },
    configurable: true,
  },
  'PR-06': {
    code: 'PR-06',
    name: 'Diversidad de Tipo de Producto dentro de Cada Drop',
    group: 'PR',
    description: 'Cada drop activo debe presentar al menos N tipos de producto distintos',
    priorities: { promocion: 1, liquidacion: 7, aumentar_ventas: 2, aumentar_margen: 1, nueva_coleccion: 1 },
    configurable: true,
    defaultParams: { min_tipos: 2 },
  },
  'PR-07': {
    code: 'PR-07',
    name: 'Producto Ancla / Efecto Goldilocks',
    group: 'PR',
    description: 'Se coloca intencionalmente un producto caro junto a uno de precio medio-alto',
    priorities: { promocion: 6, liquidacion: 7, aumentar_ventas: 4, aumentar_margen: 1, nueva_coleccion: 4 },
    configurable: true,
    defaultParams: { diferencial_minimo: 30 },
  },
  'PR-08': {
    code: 'PR-08',
    name: 'Producto Sacrificio como Atractor de Tráfico Interior',
    group: 'PR',
    description: 'Producto de bajo margen con rebaja agresiva para generar tráfico hacia interior',
    priorities: { promocion: 2, liquidacion: 1, aumentar_ventas: 5, aumentar_margen: 7, nueva_coleccion: 9 },
    configurable: true,
    defaultParams: { descuento_minimo: 50 },
  },
  'PR-09': {
    code: 'PR-09',
    name: 'Color de Tendencia → Escaparate y Zona de Máxima Conversión',
    group: 'PR',
    description: 'Productos nuevos con color de tendencia se posicionan en escaparate con prioridad máxima',
    priorities: { promocion: 5, liquidacion: 8, aumentar_ventas: 1, aumentar_margen: 2, nueva_coleccion: 1 },
    configurable: true,
  },
};

export function getRulesByObjective(objective: Objective): Array<{ rule: Rule; priority: number }> {
  const objectiveKey = objectiveMap[objective];

  return Object.values(RULES)
    .map(rule => ({
      rule,
      priority: rule.priorities[objectiveKey],
    }))
    .sort((a, b) => {
      // Ordenar por prioridad (número menor = más prioritario)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Si tienen la misma prioridad, ordenar por código dentro del grupo (ZV-01 antes que ZV-02)
      return a.rule.code.localeCompare(b.rule.code);
    });
}

export function getRuleByCode(code: RuleCode): Rule | undefined {
  return RULES[code];
}
