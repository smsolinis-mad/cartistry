'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { BlankGridPdf } from './BlankGridPdf';

/**
 * Descarga de la plantilla de cuadrícula en blanco. Aislada en su módulo por
 * el mismo motivo que `PlanogramPdfLink`: mantener el motor de PDF fuera del
 * bundle inicial de la página de tienda.
 */
export default function BlankGridPdfLink({
  storeName,
  cols,
  rows,
  fileName,
}: {
  storeName: string;
  cols: number;
  rows: number;
  fileName: string;
}) {
  return (
    <PDFDownloadLink
      document={<BlankGridPdf storeName={storeName} cols={cols} rows={rows} />}
      fileName={fileName}
      className="inline-flex items-center h-8 px-3 rounded-[2px] text-[13px] font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors"
    >
      {({ loading }) => (loading ? 'Generando…' : 'Plantilla en PDF')}
    </PDFDownloadLink>
  );
}
