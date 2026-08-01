import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pfsdufsokjpgacfmwexw.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmc2R1ZnNva2pwZ2FjZm13ZXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkwMzMwMywiZXhwIjoyMDkzNDc5MzAzfQ.WdYrM6TwpKKtmYy05gsaU-G3v9afUvjOvNwlGY918ME";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sqls = [
  `CREATE TABLE IF NOT EXISTS public.muebles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('gondola', 'corner')),
    nombre TEXT NOT NULL,
    pared INTEGER,
    posicion_cuadricula TEXT,
    alto NUMERIC NOT NULL,
    ancho NUMERIC NOT NULL,
    profundo NUMERIC NOT NULL,
    num_columnas INTEGER DEFAULT 1,
    num_filas INTEGER DEFAULT 1,
    da_pasillo_principal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    ean TEXT NOT NULL,
    codigo TEXT,
    nombre TEXT NOT NULL,
    coleccion TEXT,
    drop TEXT,
    sexo TEXT,
    division TEXT,
    tipo TEXT,
    subtipo TEXT,
    color_principal TEXT,
    medida_alto NUMERIC,
    medida_largo NUMERIC,
    medida_profundo NUMERIC,
    precio_compra NUMERIC NOT NULL,
    pvp NUMERIC NOT NULL,
    unidades INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora TEXT,
    numero_ticket TEXT,
    ean TEXT NOT NULL,
    unidades_vendidas INTEGER NOT NULL DEFAULT 1,
    pvp NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS public.planograms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    objetivo TEXT NOT NULL,
    generado_at TIMESTAMP NOT NULL,
    datos_json JSONB,
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS public.planogram_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planogram_id UUID NOT NULL REFERENCES public.planograms(id) ON DELETE CASCADE,
    balda_id TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    posicion_en_balda INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_muebles_store_id ON public.muebles(store_id);`,
  `CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sales_store_id ON public.sales(store_id);`,
  `CREATE INDEX IF NOT EXISTS idx_planograms_store_id ON public.planograms(store_id);`
];

async function createTables() {
  console.log("🔄 Creando tablas en Supabase...\n");
  
  for (let i = 0; i < sqls.length; i++) {
    const sql = sqls[i];
    const { error } = await supabase.rpc("execute_sql", { sql });
    
    if (error) {
      console.log(`❌ Error en query ${i + 1}:`, error.message);
    } else {
      if (sql.includes("CREATE TABLE")) {
        console.log(`✅ Tabla creada: ${sql.match(/CREATE TABLE.*?public\.(\w+)/)[1]}`);
      } else if (sql.includes("CREATE INDEX")) {
        console.log(`✅ Índice creado`);
      }
    }
  }
  
  console.log("\n✨ ¡Proceso completado!");
}

createTables().catch(err => console.error("Error fatal:", err));
