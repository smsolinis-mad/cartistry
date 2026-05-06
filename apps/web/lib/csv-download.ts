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
obligatorio,opcional,obligatorio,opcional,opcional,obligatorio,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,obligatorio,obligatorio,obligatorio
5901234123456,PROD001,Camiseta Básica Blanca,Essentials,Drop 1,Unisex,Ropa,Camiseta,Manga corta,Blanco,Blanco puro,N/A,65,50,3,5.00,15.00,100
5901234123457,PROD002,Pantalón Denim Azul,Denim,Drop 1,Mujer,Ropa,Pantalón,Largo,Azul,Azul oscuro,N/A,110,40,5,12.00,40.00,50
5901234123458,PROD003,Abrigo Lana Gris,Invierno,Drop 2,Mujer,Ropa,Abrigo,Largo,Gris,Gris carbón,N/A,130,60,8,35.00,120.00,25`;
