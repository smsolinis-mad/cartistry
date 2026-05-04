// Tipos para el planograma generado

export type Objective = 'promocion' | 'liquidacion' | 'aumentar_ventas' | 'aumentar_margen' | 'nueva_coleccion';

export interface PlanogramPosition {
  id: string;
  balda_id: string;
  product_id: string;
  ean: string;
  posicion_en_balda: number; // orden dentro de la balda
  razon: string; // por qué se asignó aquí (para debug)
}

export interface Planogram {
  id: string;
  store_id: string;
  objetivo: Objective;
  generado_at: string; // ISO 8601
  positions: PlanogramPosition[];
  datos_json?: Record<string, any>;
  pdf_url?: string;
}

export interface RuleResult {
  rule_code: string;
  rule_name: string;
  priority: number;
  assignments: Array<{
    product_ean: string;
    balda_id: string;
    razon: string;
  }>;
}
