// Tipos para datos de ventas

export interface Sale {
  id: string;
  store_id: string;
  fecha: string; // DD/MM/YYYY
  hora: string; // HH:MM
  numero_ticket: string;
  ean: string;
  unidades_vendidas: number;
  pvp: number;
}

export interface SalesPeriod {
  start_date: string; // ISO 8601
  end_date: string; // ISO 8601
  sales: Sale[];
}
