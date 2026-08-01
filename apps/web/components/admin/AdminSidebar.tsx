'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Building2, Receipt, BarChart3, Settings, LogOut, type LucideIcon } from 'lucide-react';

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  hint?: string;
}

const MENU: MenuItem[] = [
  { label: 'Home', href: '/admin', icon: Home, hint: 'Principales ratios' },
  { label: 'Equipo', href: '/admin/equipo', icon: Users },
  { label: 'Empresas', href: '/admin/empresas', icon: Building2 },
  { label: 'Facturación', href: '/admin/facturacion', icon: Receipt },
  { label: 'Ratios', href: '/admin/ratios', icon: BarChart3 },
  { label: 'Configuración', href: '/admin/configuracion', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname() || '';
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const isActive = (item: MenuItem) =>
    item.href === '/admin'
      ? pathname === '/admin'
      : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-[#1f1d1a] text-[#e8ddd3] flex flex-col py-6 px-3 z-30">
      <div className="px-3 mb-8">
        <Link href="/admin" className="text-2xl font-serif font-bold text-[#f5f0eb]">
          Cartistry
        </Link>
        <p className="text-[10px] uppercase tracking-widest text-[#b8a896] mt-1">Administración</p>
      </div>

      <nav className="flex-1 space-y-1">
        {MENU.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                active
                  ? 'bg-[#2d2a26] text-[#f5f0eb] font-medium'
                  : 'text-[#b8a896] hover:text-[#f5f0eb] hover:bg-[#2d2a26]/50'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.hint && (
                <span className="text-[10px] text-[#8a7a68] font-normal">{item.hint}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 mt-2 border-t border-[#2d2a26]">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[#b8a896] hover:text-[#f5f0eb] hover:bg-[#2d2a26]/50 transition"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

export function MetricCard({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: 'green' | 'red';
  sub?: string;
}) {
  const valueColor =
    tone === 'green' ? 'text-green-700' : tone === 'red' ? 'text-red-700' : 'text-cartistry-text';
  return (
    <div className="bg-cartistry-surface border border-cartistry-border rounded p-4">
      <p className="text-xs uppercase tracking-wider font-bold text-cartistry-text-secondary mb-1">
        {label}
      </p>
      <p className={`text-xl font-serif font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-cartistry-text-secondary mt-1">{sub}</p>}
    </div>
  );
}
