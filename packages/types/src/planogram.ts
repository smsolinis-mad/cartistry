// Tipos para el planograma generado

export type Objective = 'promocion' | 'liquidacion' | 'aumentar_ventas' | 'aumentar_margen' | 'nueva_coleccion';

export interface PlanogramPosition {
  id: string;
  balda_id: string;
  product_id: string;
  ean: string;
  posicion_en_balda: number; // orden dentro de la balda
  razon: string; // por qué se asignó aquí (texto humano)
  rule_code?: string; // código de la regla que disparó la asignación (p.ej. 'ZV-07')
}

export type MovementType = 'added' | 'removed' | 'moved' | 'stayed';

export interface PlanogramMovement {
  ean: string;
  product_id?: string;
  type: MovementType;
  from_balda_id?: string;
  to_balda_id?: string;
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
