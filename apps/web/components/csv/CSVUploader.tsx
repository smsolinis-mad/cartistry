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
    <div className="space-y-4">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-cartistry-border rounded-lg p-8 text-center cursor-pointer hover:border-cartistry-accent hover:bg-cartistry-surface transition"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-cartistry-text">
            Arrastra tu archivo aquí o haz click para seleccionar
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-cartistry-text-secondary">
          Cargando archivo...
        </div>
      )}
    </div>
  );
}
