// Secciones de la web (bloques y sub-bloques) a las que un cargo puede acceder.
export interface AccesoHijo {
  key: string;
  label: string;
}
export interface AccesoBloque {
  key: string;
  label: string;
  hijos?: AccesoHijo[];
}

export const ACCESOS: AccesoBloque[] = [
  { key: 'resumen', label: 'Resumen' },
  {
    key: 'ventas',
    label: 'Ventas',
    hijos: [
      { key: 'ventas.apertura-cierre', label: 'Apertura/Cierre' },
      { key: 'ventas.caja', label: 'Caja' },
      { key: 'ventas.ventas', label: 'Ventas' },
      { key: 'ventas.facturas', label: 'Facturas' },
      { key: 'ventas.petty-cash', label: 'Petty-cash' },
      { key: 'ventas.ingresos', label: 'Ingresos' },
    ],
  },
  { key: 'tiendas', label: 'Tiendas' },
  { key: 'catalogo', label: 'Catálogo' },
  {
    key: 'planogramas',
    label: 'Planogramas',
    hijos: [
      { key: 'planogramas.generar', label: 'Generar planograma' },
      { key: 'planogramas.historial', label: 'Historial' },
      { key: 'planogramas.especificaciones', label: 'Especificaciones' },
    ],
  },
  {
    key: 'equipo',
    label: 'Equipo',
    hijos: [
      { key: 'equipo.datos', label: 'Datos' },
      { key: 'equipo.cargos', label: 'Cargos' },
      { key: 'equipo.horarios', label: 'Horarios' },
      { key: 'equipo.peticiones', label: 'Peticiones' },
    ],
  },
  {
    key: 'analitica',
    label: 'Analítica',
    hijos: [
      { key: 'analitica.forecast', label: 'Forecast' },
      { key: 'analitica.ventas', label: 'Ventas' },
      { key: 'analitica.productos', label: 'Productos' },
      { key: 'analitica.drop', label: 'Drop' },
      { key: 'analitica.coleccion', label: 'Colección' },
      { key: 'analitica.sexo', label: 'Sexo' },
      { key: 'analitica.division', label: 'División' },
      { key: 'analitica.tipo', label: 'Tipo' },
      { key: 'analitica.subtipo', label: 'Subtipo' },
      { key: 'analitica.color', label: 'Color principal' },
      { key: 'analitica.margen', label: 'Margen' },
      { key: 'analitica.sell-through', label: 'Sell-through' },
      { key: 'analitica.rotacion', label: 'Rotación' },
      { key: 'analitica.abc', label: 'Análisis ABC / Pareto' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    hijos: [
      { key: 'configuracion.facturacion', label: 'Datos de facturación' },
      { key: 'configuracion.plan', label: 'Elige tu Plan' },
    ],
  },
];

const LABELS: Record<string, string> = {};
ACCESOS.forEach((b) => {
  LABELS[b.key] = b.label;
  (b.hijos || []).forEach((h) => (LABELS[h.key] = h.label));
});

export const accesoLabel = (key: string) => LABELS[key] || key;
export const childKeys = (b: AccesoBloque) => (b.hijos || []).map((h) => h.key);

// Resumen legible de los accesos seleccionados (para las etiquetas del listado).
export function resumenAccesos(sel: string[]): string[] {
  const out: string[] = [];
  for (const b of ACCESOS) {
    if (b.hijos && b.hijos.length) {
      const marcados = b.hijos.filter((h) => sel.includes(h.key));
      if (marcados.length === 0) continue;
      if (marcados.length === b.hijos.length) out.push(b.label);
      else out.push(`${b.label}: ${marcados.map((h) => h.label).join(', ')}`);
    } else if (sel.includes(b.key)) {
      out.push(b.label);
    }
  }
  return out;
}
