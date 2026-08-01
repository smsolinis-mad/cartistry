'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Store, LayoutGrid, BarChart3, Package, TrendingUp, Settings, Users, LogOut, type LucideIcon } from 'lucide-react';
import { clearUserCookie } from '@/lib/auth';

interface SubItem {
  label: string;
  href: string;
}

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPaths?: string[];
  children?: SubItem[];
}

const MENU: MenuItem[] = [
  { label: 'Resumen', href: '/dashboard', icon: Home, matchPaths: ['/dashboard'] },
  {
    label: 'Ventas',
    href: '/dashboard/ventas',
    icon: TrendingUp,
    matchPaths: ['/dashboard/ventas'],
    children: [
      { label: 'Apertura/Cierre', href: '/dashboard/ventas/apertura-cierre' },
      { label: 'Caja', href: '/dashboard/ventas/caja' },
      { label: 'Ventas', href: '/dashboard/ventas' },
      { label: 'Facturas', href: '/dashboard/ventas/facturas' },
      { label: 'Pettite-cash', href: '/dashboard/ventas/petty-cash' },
      { label: 'Ingresos', href: '/dashboard/ventas/ingresos' },
    ],
  },
  { label: 'Tiendas', href: '/dashboard/tienda', icon: Store },
  { label: 'Catálogo', href: '/dashboard/productos', icon: Package },
  {
    label: 'Planogramas',
    href: '/dashboard/planograma',
    icon: LayoutGrid,
    matchPaths: ['/dashboard/planograma', '/dashboard/historial'],
    children: [
      { label: 'Generar planograma', href: '/dashboard/planograma' },
      { label: 'Historial de planogramas', href: '/dashboard/historial' },
      { label: 'Especificaciones', href: '/dashboard/planograma/especificaciones' },
    ],
  },
  {
    label: 'Equipo',
    href: '/dashboard/equipo/datos',
    icon: Users,
    matchPaths: ['/dashboard/equipo'],
    children: [
      { label: 'Datos', href: '/dashboard/equipo/datos' },
      { label: 'Cargos', href: '/dashboard/equipo/cargos' },
      { label: 'Horarios', href: '/dashboard/equipo/horarios' },
      { label: 'Peticiones', href: '/dashboard/equipo/peticiones' },
    ],
  },
  {
    label: 'Analítica',
    href: '/dashboard/analitica/forecast',
    icon: BarChart3,
    matchPaths: ['/dashboard/analitica'],
    children: [
      { label: 'Forecast', href: '/dashboard/analitica/forecast' },
      { label: 'Ventas', href: '/dashboard/analitica/ventas' },
      { label: 'Productos', href: '/dashboard/analitica/productos' },
      { label: 'Drop', href: '/dashboard/analitica/drop' },
      { label: 'Colección', href: '/dashboard/analitica/coleccion' },
      { label: 'Sexo', href: '/dashboard/analitica/sexo' },
      { label: 'División de producto', href: '/dashboard/analitica/division' },
      { label: 'Tipo', href: '/dashboard/analitica/tipo' },
      { label: 'Subtipo', href: '/dashboard/analitica/subtipo' },
      { label: 'Color principal', href: '/dashboard/analitica/color' },
      { label: 'Margen', href: '/dashboard/analitica/margen' },
      { label: 'Sell-through', href: '/dashboard/analitica/sell-through' },
      { label: 'Rotación', href: '/dashboard/analitica/rotacion' },
      { label: 'Análisis ABC / Pareto', href: '/dashboard/analitica/abc' },
      { label: 'Equipo', href: '/dashboard/analitica/equipo' },
    ],
  },
  {
    label: 'Configuración',
    href: '/dashboard/configuracion/facturacion',
    icon: Settings,
    matchPaths: ['/dashboard/configuracion'],
    children: [
      { label: 'Datos de facturación', href: '/dashboard/configuracion/facturacion' },
      { label: 'Elige tu Plan', href: '/dashboard/configuracion/plan' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname() || '';
  const router = useRouter();

  const handleLogout = async () => {
    clearUserCookie();
    await new Promise((resolve) => setTimeout(resolve, 100));
    router.push('/');
  };

  const isActive = (item: MenuItem) => {
    if (item.matchPaths && item.matchPaths.length > 0) {
      return item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
    }
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-[#1f1d1a] text-[#e8ddd3] flex flex-col py-6 px-3 z-30">
      <div className="px-3 mb-8">
        <Link href="/dashboard" className="text-2xl font-serif font-bold text-[#f5f0eb]">
          Cartistry
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        {MENU.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <div key={item.label}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                  active
                    ? 'bg-[#2d2a26] text-[#f5f0eb] font-medium'
                    : 'text-[#b8a896] hover:text-[#f5f0eb] hover:bg-[#2d2a26]/50'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
              {item.children && active && (
                <div className="mt-1 ml-8 space-y-1">
                  {(() => {
                    const children = item.children!;
                    const sortedChildren = [...children].sort(
                      (a, b) => b.href.length - a.href.length
                    );
                    const matchedHref = sortedChildren.find(
                      (c) => pathname === c.href || pathname.startsWith(c.href + '/')
                    )?.href;
                    return children.map((child) => {
                      const childActive = child.href === matchedHref;
                      return (
                        <Link
                          key={child.label}
                          href={child.href}
                          className={`block px-3 py-1.5 rounded-md text-xs transition ${
                            childActive
                              ? 'bg-[#2d2a26] text-[#f5f0eb] font-medium'
                              : 'text-[#b8a896] hover:text-[#f5f0eb] hover:bg-[#2d2a26]/50'
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
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
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );
}
