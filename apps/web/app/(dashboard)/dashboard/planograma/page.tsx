'use client';

import Link from 'next/link';

export default function PlanogramaPage() {
  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="text-cartistry-accent hover:underline text-sm">
            ← Volver
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">
            Fase 4: Generar planograma
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-cartistry-surface rounded border border-cartistry-border p-6">
          <p className="text-cartistry-text-secondary">
            Esta fase está en desarrollo. Aquí seleccionarás el objetivo y generarás el planograma optimizado.
          </p>
        </div>
      </div>
    </main>
  );
}
