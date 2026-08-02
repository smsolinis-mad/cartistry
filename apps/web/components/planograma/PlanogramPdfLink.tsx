'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { PlanogramReport, type ReportData } from './PlanogramReport';

/**
 * Enlace de descarga del informe en PDF.
 *
 * Vive en su propio módulo para que `@react-pdf/renderer` (~550 kB) quede en
 * un chunk aparte: las páginas lo cargan con `next/dynamic` y el motor de PDF
 * solo llega al navegador cuando alguien va a descargar de verdad.
 */
export default function PlanogramPdfLink({
  data,
  fileName,
  label = 'Descargar informe',
  className,
}: {
  data: ReportData;
  fileName: string;
  label?: string;
  className?: string;
}) {
  return (
    <PDFDownloadLink
      document={<PlanogramReport data={data} />}
      fileName={fileName}
      className={
        className ??
        'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors'
      }
    >
      {({ loading }) => (loading ? 'Preparando…' : label)}
    </PDFDownloadLink>
  );
}
