// Tipos para el catálogo de productos

export type SizeCategory = 'XXG' | 'XG' | 'G' | 'M' | 'P' | 'Mini';

export interface Product {
  id: string;
  store_id: string;
  ean: string; // 13 dígitos
  codigo?: string;
  nombre: string;
  coleccion?: string;
  drop?: string;
  sexo: 'mujer' | 'hombre' | 'unisex';
  division?: string;
  tipo?: string;
  subtipo?: string;
  color_principal?: string;
  color_principal_detalle?: string;
  subcolor?: string;
  medida_alto?: number; // cm
  medida_largo?: number; // cm
  medida_profundo?: number; // cm
  precio_compra: number;
  pvp: number;
  unidades: number;
  // Calculados
  tamaño_fisico?: SizeCategory;
  margen_unitario?: number; // PVP - precio_compra
}

export interface ProductMetrics {
  product_id: string;
  ean: string;
  nombre: string;
  margen_unitario: number;
  total_unidades_vendidas: number;
  tendencia: 'creciendo' | 'cayendo' | 'estable' | 'sin_ventas';
  periodos_sin_ventas: number;
  rotacion_reciente: number; // unidades en período actual
  tasa_conversion: number; // rotación / stock_total
  es_best_seller: boolean;
  es_nuevo: boolean; // sin histórico
}
