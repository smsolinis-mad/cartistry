// Helper para exportar tablas a CSV con BOM UTF-8 (Excel lo abre como hoja
// de cálculo nativamente, con tildes y eñes correctas).

export type ExcelCell = string | number | null | undefined;
export type ExcelRow = ExcelCell[];

function escapeCell(value: ExcelCell): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'number' ? String(value) : String(value);
  // Si contiene separador, comillas o salto, encerrar en comillas y escapar.
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadExcel(
  filename: string,
  headers: string[],
  rows: ExcelRow[]
) {
  const headerLine = headers.map(escapeCell).join(';');
  const bodyLines = rows.map((r) => r.map(escapeCell).join(';'));
  const csv = [headerLine, ...bodyLines].join('\n');
  // BOM UTF-8 para que Excel reconozca tildes/€/ñ correctamente.
  const blob = new Blob(['﻿' + csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function timestamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}-${mi}`;
}
