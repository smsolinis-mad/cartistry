'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';

export interface CSVData {
  headers: string[];
  descriptions: string[];
  required: string[];
  rows: Record<string, string>[];
}

interface CSVUploaderProps {
  onDataLoaded: (data: CSVData) => void;
  accept?: string;
}

export function CSVUploader({ onDataLoaded, accept = '.csv' }: CSVUploaderProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setLoading(true);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as string[][];

          if (rows.length < 2) {
            throw new Error('El CSV debe tener al menos 2 filas (1 de cabecera + 1 de datos)');
          }

          const headers = rows[0];

          // Detectar si el CSV usa el formato extendido (3 filas de cabecera) o
          // el simple (1 fila de cabecera). Se considera extendido si la tercera
          // fila contiene marcadores "obligatorio"/"opcional".
          const thirdRow = rows[2] || [];
          const hasExtendedHeader =
            rows.length >= 4 &&
            thirdRow.some(
              (cell) => cell?.toLowerCase().trim() === 'obligatorio' || cell?.toLowerCase().trim() === 'opcional'
            );

          const descriptions = hasExtendedHeader ? rows[1] : headers.map(() => '');
          const required = hasExtendedHeader ? rows[2] : headers.map(() => 'opcional');
          const dataRows = hasExtendedHeader ? rows.slice(3) : rows.slice(1);

          // Convertir datos a objeto
          const parsedRows = dataRows.map((row) => {
            const obj: Record<string, string> = {};
            headers.forEach((header, i) => {
              obj[header] = row[i] || '';
            });
            return obj;
          });

          onDataLoaded({
            headers,
            descriptions,
            required,
            rows: parsedRows,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al parsear el CSV');
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        setError(`Error al leer el archivo: ${error.message}`);
        setLoading(false);
      },
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="grid-paper w-full rounded-[2px] px-6 py-10 text-center cursor-pointer
                   shadow-[inset_0_0_0_1px_var(--line-strong)]
                   hover:shadow-[inset_0_0_0_2px_var(--ink)] transition-shadow
                   disabled:opacity-50 disabled:pointer-events-none"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
        />
        <p className="text-sm font-medium text-ink">
          Arrastra tu CSV aquí o selecciónalo
        </p>
        <p className="font-mono text-[11px] text-ink-3 mt-1.5">
          Una fila por producto, con EAN, precio y stock
        </p>
      </button>

      {error ? (
        <div
          role="alert"
          className="px-3 py-2.5 rounded-[2px] text-sm shadow-[inset_0_0_0_1px_#C2402F] bg-[#fbecea] text-[#7d251b]"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="eyebrow text-center" role="status">
          Leyendo el archivo
        </p>
      ) : null}
    </div>
  );
}
