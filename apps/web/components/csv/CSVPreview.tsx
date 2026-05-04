'use client';

interface CSVPreviewProps {
  headers: string[];
  descriptions: string[];
  required: string[];
  rows: Record<string, string>[];
}

export function CSVPreview({ headers, descriptions, required, rows }: CSVPreviewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-cartistry-text mb-3">Vista previa de columnas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-cartistry-border">
                <th className="text-left px-3 py-2 text-cartistry-accent font-medium">Campo</th>
                <th className="text-left px-3 py-2 text-cartistry-accent font-medium">Descripción</th>
                <th className="text-left px-3 py-2 text-cartistry-accent font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((header, i) => (
                <tr key={i} className="border-b border-cartistry-border hover:bg-cartistry-surface">
                  <td className="px-3 py-2 font-medium text-cartistry-text">{header}</td>
                  <td className="px-3 py-2 text-cartistry-text-secondary">{descriptions[i]}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        required[i] === 'obligatorio'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {required[i] === 'obligatorio' ? 'Obligatorio' : 'Opcional'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-cartistry-text mb-3">
          Primeras {Math.min(5, rows.length)} filas de datos
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-cartistry-border bg-cartistry-surface">
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="text-left px-3 py-2 text-cartistry-accent font-medium whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-b border-cartistry-border hover:bg-cartistry-surface">
                  {headers.map((header, j) => (
                    <td key={j} className="px-3 py-2 text-cartistry-text truncate max-w-xs">
                      {row[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-cartistry-text-secondary mt-2">
          Total de productos: <strong>{rows.length}</strong>
        </p>
      </div>
    </div>
  );
}
