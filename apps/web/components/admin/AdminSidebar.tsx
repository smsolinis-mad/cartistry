'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Gauge, Users, Building2, Receipt, BarChart3, Settings, LogOut, type LucideIcon } from 'lucide-react';
import { Wordmark } from '@/components/landing/Wordmark';

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  hint?: string;
}

const MENU: MenuItem[] = [
  { label: 'Resumen', href: '/admin', icon: Gauge },
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
    <aside className="fixed top-0 left-0 h-screen w-56 bg-ink flex flex-col z-30">
      <div className="px-4 pt-4 pb-5">
        <Link href="/admin">
          <Wordmark tone="inverse" />
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 mt-2 pl-[26px]">
          Administración
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {MENU.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-[2px] text-[13px] transition-colors ${
                active
                  ? 'text-surface bg-white/[0.08] font-medium'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {active ? (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-surface rounded-[1px]"
                  aria-hidden
                />
              ) : null}
              <Icon size={15} className="shrink-0" strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              {item.hint ? (
                <span className="font-mono text-[10px] text-white/35">{item.hint}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[2px] text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <LogOut size={15} className="shrink-0" strokeWidth={1.75} />
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
    tone === 'green' ? 'text-positive' : tone === 'red' ? 'text-danger' : 'text-ink';
  return (
    <div className="bg-surface rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)] p-4">
      <p className="eyebrow">{label}</p>
      <p className={`metric text-[26px] mt-2.5 ${valueColor}`}>{value}</p>
      {sub ? <p className="font-mono text-[11px] text-ink-3 mt-2">{sub}</p> : null}
    </div>
  );
}
