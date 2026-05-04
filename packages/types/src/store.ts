// Tipos para la configuración de la tienda y muebles

export type StoreType = 'gondola' | 'corner';

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
  baldas: Balda[];
}

export interface Mueble {
  id: string;
  nombre: string;
  tipo: 'gondola' | 'corner';
  alto: number;
  ancho: number;
  profundo: number;
  pared?: string; // solo para corner
  posicion_cuadricula?: string; // ej: 'C3'
  da_pasillo_principal: boolean;
  caras: Cara[];
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
  muebles: Mueble[];
}
