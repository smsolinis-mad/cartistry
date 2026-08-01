// Secretos del panel de administración. SOLO servidor (API routes / middleware).
// No importar desde componentes cliente: filtraría las credenciales al bundle.

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cartistry.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cartistry-admin';

// Valor que se guarda en la cookie de sesión admin y que valida el middleware.
export const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || 'cartistry-admin-session';
