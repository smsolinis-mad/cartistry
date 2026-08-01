// Tipos para la configuración de la tienda y muebles

export type StoreType = 'gondola' | 'corner';

/** 'mueble' = display normal · 'caja' = mostrador / punto de pago. */
export type MuebleType = 'mueble' | 'caja';

/** Qué caras de un mueble pueden tener producto colocado. */
export interface MuebleCaraFlags {
  cara_superior: boolean;
  cara_frontal: boolean;
  cara_trasera: boolean;
  cara_izquierda: boolean;
  cara_derecha: boolean;
}

export type FaceOrientation = 'entrada' | 'fondo' | 'izquierda' | 'derecha' | 'superior';

export type Visibility = 'alta' | 'media' | 'baja';

export type ShelfType = 'balda' | 'cajon' | 'barra';

export type Restriction = {
  sexo?: 'mujer' | 'hombre' | 'unisex';
  categoria?: string;
};

export interface Balda {
  id: string;
  columna: number;
  numero: number;
  altura_suelo: number; // cm
  tipo: ShelfType;
  restriccion?: Restriction;
  capacidad: number;
  tamaños_admitidos: string[]; // ['XXG', 'XG', 'G', 'M', 'P', 'Mini']
}

export interface Cara {
  id: string;
  orientacion: FaceOrientation;
  visibilidad: Visibility;
  es_pasillo_principal: boolean;
  es_escaparate?: boolean;
  baldas: Balda[];
}

export interface BaldaConfig {
  alto_cm: number;
}

export type CaraName = 'superior' | 'frontal' | 'trasera' | 'izquierda' | 'derecha';

/**
 * Configuración del grid de baldas de UNA cara concreta del mueble.
 * Cada cara puede tener distinto número de columnas/filas. La suma de
 * `filas_config[].alto_cm` debe aproximarse al `alto` del mueble.
 */
export interface CaraGridConfig {
  cols: number;
  filas: number;
  filas_config?: BaldaConfig[];
}

export interface Mueble {
  id: string;
  nombre: string;
  tipo: MuebleType;
  alto: number;
  ancho: number;
  profundo: number;
  pared?: string;
  posicion_cuadricula?: string; // p.ej. 'C3' o 'A1:C2'
  es_zona_caja?: boolean;       // derivado de tipo='caja'
  es_escaparate?: boolean;
  // Público objetivo del mueble. Constraint duro: solo entran productos
  // cuyo `sexo` coincide ('femenino'↔'mujer', 'masculino'↔'hombre',
  // 'unisex'↔'unisex'). 'indiferente' o undefined = sin restricción.
  sexo_target?: 'femenino' | 'masculino' | 'unisex' | 'indiferente';
  // Caras del bloque — qué lados del mueble tienen producto.
  cara_superior?: boolean;
  cara_frontal?: boolean;
  cara_trasera?: boolean;
  cara_izquierda?: boolean;
  cara_derecha?: boolean;
  // Grid de baldas por cara (cols/filas/alturas). Solo deben existir
  // entradas para las caras habilitadas. El motor lee de aquí; los campos
  // num_columnas/num_filas/filas_config a nivel mueble actúan como
  // fallback histórico para muebles aún no migrados.
  caras_config?: Partial<Record<CaraName, CaraGridConfig>>;
  caras: Cara[]; // expandidas por la API a partir de los flags
}

export interface PasilloCell {
  col: number; // 0-indexed
  row: number; // 0-indexed
}

export interface Store {
  id: string;
  user_id: string;
  nombre: string;
  direccion: string;
  tipo: StoreType;
  metros2: number;
  fecha_apertura: string; // DD/MM/YYYY
  entrada_orientacion: FaceOrientation;
  pasillos?: PasilloCell[];
  muebles: Mueble[];
}
