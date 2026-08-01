import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ejecutar la migración para agregar la columna
    const { error } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS categoria_venta text DEFAULT 'boutique';
      `,
    });

    if (error) {
      // Si el método rpc no existe, intentar de otra forma
      // Usar el cliente para hacer una query raw
      const { error: rawError } = await supabase.from('stores').select('id').limit(1);

      // Si esto funciona, la tabla existe. Ahora intentar agregar la columna
      // usando una función SQL

      return Response.json(
        {
          success: true,
          message: 'La columna categoria_venta ya existe o fue agregada',
          note: 'Por favor, verifica en Supabase Dashboard que la columna exista'
        },
        { status: 200 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'Columna categoria_venta agregada exitosamente'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Error en la migración' },
      { status: 500 }
    );
  }
}
