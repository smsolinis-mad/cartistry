// Helpers de datos para el panel de administración (cliente).
import { createClient } from '@/lib/supabase/client';
import { planInfo } from '@/lib/admin';

export interface Brand {
  id: string;
  user_id: string;
  nombre_empresa: string | null;
  direccion_facturacion: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  cif: string | null;
  plan: string | null;
}

export interface Invoice {
  id: string;
  user_id: string;
  numero: string | null;
  periodo: string;
  plan: string | null;
  concepto: string | null;
  num_tiendas: number | null;
  importe: number;
  estado: string;
  cobrada_el: string | null;
}

const BRAND_COLS =
  'id, user_id, nombre_empresa, direccion_facturacion, codigo_postal, ciudad, provincia, pais, cif, plan';

export async function loadBrands(): Promise<{
  brands: Brand[];
  storeCounts: Record<string, number>;
}> {
  const supabase = createClient();
  const [brandsRes, storesRes] = await Promise.all([
    supabase.from('company_settings').select(BRAND_COLS),
    supabase.from('stores').select('user_id'),
  ]);
  if (brandsRes.error) throw brandsRes.error;

  const storeCounts: Record<string, number> = {};
  (storesRes.data || []).forEach((s: any) => {
    storeCounts[s.user_id] = (storeCounts[s.user_id] || 0) + 1;
  });

  return { brands: (brandsRes.data as Brand[]) || [], storeCounts };
}

export async function loadInvoices(period: string): Promise<Record<string, Invoice>> {
  const supabase = createClient();
  const { data, error } = await supabase.from('invoices').select('*').eq('periodo', period);
  if (error) throw error;
  const map: Record<string, Invoice> = {};
  (data || []).forEach((inv: any) => {
    map[inv.user_id] = inv;
  });
  return map;
}

// Datos fiscales de la empresa emisora (Cartistry) que aparecen en las facturas.
export interface AdminSettings {
  nombre_empresa: string | null;
  cif: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  email: string | null;
  telefono: string | null;
  iban: string | null;
}

export const ADMIN_SETTINGS_COLS =
  'nombre_empresa, cif, direccion, codigo_postal, ciudad, provincia, pais, email, telefono, iban';

export async function loadAdminSettings(): Promise<AdminSettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('admin_settings')
    .select(ADMIN_SETTINGS_COLS)
    .eq('id', 1)
    .maybeSingle();
  if (error) return null;
  return (data as AdminSettings) || null;
}

export const tiendasDe = (b: Brand, storeCounts: Record<string, number>) =>
  Math.max(1, storeCounts[b.user_id] || 0);

export const importeDe = (b: Brand, storeCounts: Record<string, number>) =>
  planInfo(b.plan).precio * tiendasDe(b, storeCounts);

export function formatEUR(n: number): string {
  return `€${(n || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function periodLabel(period: string): string {
  const [y, m] = period.split('-');
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${meses[parseInt(m, 10) - 1]} ${y}`;
}

export function periodOptions(count = 12): string[] {
  const opts: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(d.getFullYear(), d.getMonth() - i, 1);
    opts.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return opts;
}
