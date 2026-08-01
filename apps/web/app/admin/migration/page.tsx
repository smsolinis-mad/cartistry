'use client';

import { useState } from 'react';

export default function MigrationPage() {
  const [copied, setCopied] = useState(false);

  const sql = `ALTER TABLE stores ADD COLUMN IF NOT EXISTS categoria_venta text DEFAULT 'boutique';`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-cartistry-bg p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif font-bold text-cartistry-text mb-6">
          Migración: Agregar Categoría de Venta
        </h1>

        <div className="bg-cartistry-surface border border-cartistry-border rounded p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-cartistry-text mb-3">
              Instrucciones:
            </h2>
            <ol className="space-y-2 text-sm text-cartistry-text-secondary list-decimal list-inside">
              <li>Ve a tu dashboard de <strong>Supabase</strong></li>
              <li>Abre la sección <strong>SQL Editor</strong></li>
              <li>Crea una nueva query</li>
              <li>Copia el SQL de abajo</li>
              <li>Ejecuta la query</li>
            </ol>
          </div>

          <div className="bg-gray-100 p-4 rounded border border-gray-300">
            <code className="text-sm font-mono text-gray-800 break-all">
              {sql}
            </code>
          </div>

          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition"
          >
            {copied ? '✓ Copiado al portapapeles' : '📋 Copiar SQL'}
          </button>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">
            <p className="font-medium mb-2">✓ Una vez ejecutado:</p>
            <p>La columna <code className="bg-blue-100 px-1 rounded">categoria_venta</code> se agregará a la tabla <code className="bg-blue-100 px-1 rounded">stores</code> con el valor por defecto <code className="bg-blue-100 px-1 rounded">boutique</code></p>
          </div>
        </div>
      </div>
    </main>
  );
}
