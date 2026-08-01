// Configuración del panel de administración (segura para cliente).
// Los secretos (email/contraseña/secreto de sesión) viven en lib/admin-server.ts.

export const ADMIN_COOKIE = 'admin_session';

// Email del admin solo para mostrar en la UI (no es un secreto).
// El email real que valida el login vive en lib/admin-server.ts.
export const ADMIN_EMAIL_PUBLIC = 'admin@cartistry.com';

// Planes y precio mensual por tienda (€)
export type PlanKey = 'basico' | 'estandar' | 'avanzado';

export const PLANES: Record<PlanKey, { label: string; producto: string; precio: number }> = {
  basico: { label: 'Básico', producto: 'Cartistry Visual', precio: 39 },
  estandar: { label: 'Estándar', producto: 'Cartistry Visual + Analítica', precio: 89 },
  avanzado: { label: 'Avanzado', producto: 'Cartistry Suite', precio: 179 },
};

export function planInfo(plan: string | null | undefined) {
  const key = (plan || 'estandar') as PlanKey;
  return PLANES[key] || PLANES.estandar;
}
