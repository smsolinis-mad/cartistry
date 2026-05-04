'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };
  const phases = [
    {
      id: 1,
      title: 'Configurar tienda',
      description: 'Define el layout de tu espacio de venta',
      href: '/dashboard/tienda',
      status: 'pending' as const,
    },
    {
      id: 2,
      title: 'Subir catálogo de productos',
      description: 'Carga el CSV con tu inventario',
      href: '/dashboard/productos',
      status: 'pending' as const,
    },
    {
      id: 3,
      title: 'Subir datos de ventas',
      description: 'Carga el histórico semanal de ventas',
      href: '/dashboard/ventas',
      status: 'pending' as const,
    },
    {
      id: 4,
      title: 'Generar planograma',
      description: 'Optimiza el visual merchandising',
      href: '/dashboard/planograma',
      status: 'pending' as const,
    },
  ];

  return (
    <main className="min-h-screen bg-cartistry-bg">
      {/* Header */}
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-serif font-bold text-cartistry-text">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-cartistry-accent hover:bg-cartistry-border rounded transition"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-serif font-bold text-cartistry-text mb-2">
            Tu tienda: Mi tienda
          </h2>
          <p className="text-cartistry-text-secondary">
            Completa los pasos para generar tu planograma optimizado
          </p>
        </div>

        {/* Phases */}
        <div className="space-y-4">
          {phases.map((phase, index) => (
            <Link
              key={phase.id}
              href={phase.href}
              className="block p-6 bg-cartistry-surface rounded border border-cartistry-border hover:border-cartistry-accent transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 rounded-full bg-cartistry-accent text-cartistry-surface flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-serif font-bold text-cartistry-text">
                      {phase.title}
                    </h3>
                  </div>
                  <p className="text-cartistry-text-secondary">{phase.description}</p>
                </div>
                <span className="text-2xl text-cartistry-border">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Settings */}
        <div className="mt-12 pt-12 border-t border-cartistry-border">
          <h3 className="text-lg font-serif font-bold text-cartistry-text mb-4">
            Configuración
          </h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/settings"
              className="block p-4 bg-cartistry-surface rounded border border-cartistry-border hover:border-cartistry-accent transition text-cartistry-accent"
            >
              Datos de la tienda
            </Link>
            <Link
              href="/dashboard/historial"
              className="block p-4 bg-cartistry-surface rounded border border-cartistry-border hover:border-cartistry-accent transition text-cartistry-accent"
            >
              Historial de planogramas
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
