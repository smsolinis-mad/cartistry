import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'pfsdufsokjpgacfmwexw.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Cartistry2025!',
  ssl: { rejectUnauthorized: false }
});

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
  try {
    console.log('🔄 Conectando a Supabase...');
    await client.connect();
    console.log('✅ Conectado\n');

    console.log('🔄 Creando tablas...\n');
    
    for (let i = 0; i < sqls.length; i++) {
      const sql = sqls[i];
      try {
        await client.query(sql);
        
        if (sql.includes("CREATE TABLE")) {
          const match = sql.match(/CREATE TABLE.*?public\.(\w+)/);
          const tableName = match ? match[1] : 'tabla';
          console.log(`✅ Tabla creada: ${tableName}`);
        } else if (sql.includes("CREATE INDEX")) {
          const match = sql.match(/idx_(\w+)/);
          const indexName = match ? match[1] : 'índice';
          console.log(`✅ Índice creado: idx_${indexName}`);
        }
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⏭️  Ya existe (saltado)`);
        } else {
          console.log(`❌ Error: ${err.message}`);
        }
      }
    }
    
    console.log('\n✨ ¡Tablas creadas exitosamente!');
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  } finally {
    await client.end();
  }
}

createTables();
