export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const PLANTILLA_PRODUCTOS_CSV = `Código EAN,Código de producto,Nombre de producto,Colección,Drop,Sexo,División de producto,Tipo,Subtipo,Color principal,Color principal detalle,Subcolor,Medida alto,Medida largo,Medida profundo,Precio de compra,PVP,Unidades
13 dígitos numéricos,Alfanumérico máx 20 car.,Alfanumérico máx 100 car.,Alfanumérico máx 100 car.,Alfanumérico máx 100 car.,"Mujer / Hombre / Unisex",Alfanumérico máx 100 car.,Alfanumérico máx 100 car.,Alfanumérico máx 100 car.,Alfanumérico máx 100 car.,Alfanumérico máx 100 car.,Alfanumérico máx 100 car.,Cifra (cm),Cifra (cm),Cifra (cm),Cifra,Cifra,Entero sin decimales
obligatorio,opcional,obligatorio,opcional,opcional,obligatorio,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,obligatorio,obligatorio,obligatorio`;

export const PLANTILLA_VENTAS_CSV = `Fecha,Hora,Número de ticket,EAN,Unidades vendidas,PVP
DD/MM/AAAA,HH:MM,Alfanumérico (puede incluir símbolos),13 dígitos numéricos,Entero sin decimales,Cifra
obligatorio,obligatorio,obligatorio,obligatorio,obligatorio,obligatorio`;
