'use client';

import { EmptyState, PageHeader } from '@/components/ui';

export default function FacturasPage() {
  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          label="Ventas"
          title="Facturas"
          description="Todas las facturas emitidas desde la caja, con su serie y su estado de cobro."
        />

        <EmptyState
          title="Aún no has emitido ninguna factura"
          description="Las facturas que emitas desde la caja aparecerán aquí, ordenadas por fecha."
        />
      </div>
    </main>
  );
}
