#!/usr/bin/env node

/**
 * Script para añadir la columna imagen_url a la tabla products en Supabase
 *
 * Uso:
 * 1. Abre https://app.supabase.com/project/pfsdufsokjpgacfmwexw/sql
 * 2. Copia y pega el SQL de abajo
 * 3. Haz click en "Run"
 */

const SQL = `
-- Añadir columna imagen_url a la tabla products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS imagen_url text;

-- Crear índice para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_products_imagen_url ON products(imagen_url);

-- Verificar que se creó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'imagen_url';
`;

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Script para añadir columna imagen_url a Supabase           ║
╚══════════════════════════════════════════════════════════════╝

INSTRUCCIONES:
1. Ve a: https://app.supabase.com/project/pfsdufsokjpgacfmwexw/sql
2. Haz click en "New Query"
3. Copia y pega el siguiente SQL:

${SQL}

4. Haz click en "Run"
5. Si ves el resultado con los datos de la columna, ¡está listo!

ALTERNATIVA (Si lo anterior no funciona):
1. Ve a: https://app.supabase.com/project/pfsdufsokjpgacfmwexw/editor/products
2. Haz click en el botón "+" en la tabla
3. Crea una nueva columna:
   - Column name: imagen_url
   - Type: text
   - Default value: (dejar vacío)
   - Save

═══════════════════════════════════════════════════════════════
`);
