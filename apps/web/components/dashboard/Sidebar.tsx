'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Gauge,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Settings,
  Store,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { clearUserCookie, getUserCookie } from '@/lib/auth';
import { Wordmark } from '@/components/landing/Wordmark';
import { cx } from '@/components/ui';

interface SubItem {
  label: string;
  href: string;
}

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPaths?: string[];
  /** Solo se marca en su propia ruta, sin heredar las rutas hijas. */
  exact?: boolean;
  children?: SubItem[];
}

/**
 * La navegación sigue el recorrido del dato: primero el espacio y el surtido,
 * después la colocación, después lo que se vende, y al final la cuenta.
 */
interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const GRUPOS: MenuGroup[] = [
  {
    label: 'Tienda',
    items: [
      { label: 'Resumen', href: '/dashboard', icon: Gauge, exact: true },
      { label: 'Tiendas', href: '/dashboard/tienda', icon: Store },
      { label: 'Catálogo', href: '/dashboard/productos', icon: Package },
    ],
  },
  {
    label: 'Lineal',
    items: [
      {
        label: 'Planogramas',
        href: '/dashboard/planograma',
        icon: LayoutGrid,
        matchPaths: ['/dashboard/planograma', '/dashboard/historial'],
        children: [
          { label: 'Generar planograma', href: '/dashboard/planograma' },
          { label: 'Historial', href: '/dashboard/historial' },
          { label: 'Especificaciones', href: '/dashboard/planograma/especificaciones' },
        ],
      },
    ],
  },
  {
    label: 'Datos',
    items: [
      {
        label: 'Ventas',
        href: '/dashboard/ventas',
        icon: TrendingUp,
        matchPaths: ['/dashboard/ventas'],
        children: [
          { label: 'Ventas', href: '/dashboard/ventas' },
          { label: 'Apertura y cierre', href: '/dashboard/ventas/apertura-cierre' },
          { label: 'Caja', href: '/dashboard/ventas/caja' },
          { label: 'Facturas', href: '/dashboard/ventas/facturas' },
          { label: 'Caja chica', href: '/dashboard/ventas/petty-cash' },
          { label: 'Ingresos', href: '/dashboard/ventas/ingresos' },
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
          { label: 'ABC / Pareto', href: '/dashboard/analitica/abc' },
          { label: 'Equipo', href: '/dashboard/analitica/equipo' },
        ],
      },
    ],
  },
  {
    label: 'Cuenta',
    items: [
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
        label: 'Configuración',
        href: '/dashboard/configuracion/facturacion',
        icon: Settings,
        matchPaths: ['/dashboard/configuracion'],
        children: [
          { label: 'Datos de facturación', href: '/dashboard/configuracion/facturacion' },
          { label: 'Plan', href: '/dashboard/configuracion/plan' },
        ],
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(getUserCookie()?.email ?? null);
  }, []);

  // Al navegar, el panel móvil se cierra solo.
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  const handleLogout = async () => {
    clearUserCookie();
    await new Promise((resolve) => setTimeout(resolve, 100));
    router.push('/');
  };

  const isActive = (item: MenuItem) => {
    if (item.exact) return pathname === item.href;
    if (item.matchPaths && item.matchPaths.length > 0) {
      return item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
    }
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <>
      {/* Barra móvil */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-ink">
        <Link href="/dashboard">
          <Wordmark tone="inverse" />
        </Link>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="h-9 w-9 grid place-items-center text-white/70 hover:text-white rounded-[2px]"
          aria-label={abierto ? 'Cerrar navegación' : 'Abrir navegación'}
          aria-expanded={abierto}
        >
          {abierto ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <aside
        className={cx(
          'fixed top-0 left-0 h-screen w-60 bg-ink flex flex-col z-40',
          'transition-transform duration-200 lg:translate-x-0',
          abierto ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-14 flex items-center px-4 shrink-0">
          <Link href="/dashboard">
            <Wordmark tone="inverse" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {GRUPOS.map((grupo) => (
            <div key={grupo.label} className="mb-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 px-3 mb-1.5">
                {grupo.label}
              </p>
              {grupo.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <div key={item.label}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cx(
                        'relative flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-[2px] text-[13px] transition-colors',
                        active
                          ? 'text-surface bg-white/[0.08] font-medium'
                          : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      )}
                    >
                      {active ? (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-surface rounded-[1px]"
                          aria-hidden
                        />
                      ) : null}
                      <Icon size={15} className="shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{item.label}</span>
                    </Link>

                    {item.children && active ? (
                      <div className="mt-0.5 mb-2 ml-[26px] pl-3 border-l border-white/12 space-y-px">
                        {(() => {
                          const children = item.children!;
                          const sorted = [...children].sort(
                            (a, b) => b.href.length - a.href.length
                          );
                          const matched = sorted.find(
                            (c) => pathname === c.href || pathname.startsWith(c.href + '/')
                          )?.href;
                          return children.map((child) => {
                            const childActive = child.href === matched;
                            return (
                              <Link
                                key={child.label}
                                href={child.href}
                                aria-current={childActive ? 'page' : undefined}
                                className={cx(
                                  'block px-2 py-1.5 rounded-[2px] text-[12.5px] transition-colors',
                                  childActive
                                    ? 'text-surface bg-white/[0.08] font-medium'
                                    : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                                )}
                              >
                                {child.label}
                              </Link>
                            );
                          });
                        })()}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-2">
          {email ? (
            <p
              className="font-mono text-[11px] text-white/40 px-3 py-1.5 truncate"
              title={email}
            >
              {email}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[2px] text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <LogOut size={15} className="shrink-0" strokeWidth={1.75} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Telón del panel móvil */}
      {abierto ? (
        <button
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setAbierto(false)}
          className="lg:hidden fixed inset-0 z-30 bg-ink/40"
        />
      ) : null}
    </>
  );
}
