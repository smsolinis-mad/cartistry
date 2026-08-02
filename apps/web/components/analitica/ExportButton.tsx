'use client';

import { Download } from 'lucide-react';
import { downloadExcel, timestamp, type ExcelRow } from '@/lib/excel-export';
import { Button } from '@/components/ui';

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
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={disabled || empty}
      title={empty ? 'No hay nada que exportar todavía' : 'Descargar en CSV, compatible con Excel'}
    >
      <Download size={14} strokeWidth={1.75} />
      Exportar
    </Button>
  );
}
