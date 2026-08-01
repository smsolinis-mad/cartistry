'use client';

import Link from 'next/link';

export default function FacturasPage() {
  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="text-cartistry-accent hover:underline text-sm">
            ← Volver
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">
            Ventas · Facturas
          </h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12" />
    </main>
  );
}
