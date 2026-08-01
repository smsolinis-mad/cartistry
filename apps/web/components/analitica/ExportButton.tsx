'use client';

import { downloadExcel, timestamp, type ExcelRow } from '@/lib/excel-export';

interface ExportButtonProps {
  filenameBase: string;
  headers: string[];
  rows: ExcelRow[];
  disabled?: boolean;
}

export function ExportButton({ filenameBase, headers, rows, disabled }: ExportButtonProps) {
  const handleClick = () => {
    const filename = `${filenameBase}_${timestamp()}.csv`;
    downloadExcel(filename, headers, rows);
  };

  const empty = !rows || rows.length === 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || empty}
      className="px-4 py-2 bg-cartistry-cta text-cartistry-cta-text rounded text-sm font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
      title={empty ? 'No hay datos para exportar' : 'Descargar como Excel (.csv compatible)'}
    >
      📥 Exportar Excel
    </button>
  );
}
