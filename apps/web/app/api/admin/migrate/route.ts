import { createClient } from '@supabase/supabase-js';

// Solo para desarrollo/administración
// Requiere que las variables de entorno estén correctamente configuradas

export async function POST(request: Request) {
  try {
    // Verificar que es una solicitud de admin (simple verificación)
    const auth = request.headers.get('authorization');
    if (!auth?.includes('admin-key')) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: 'Variables de entorno de Supabase no configuradas',
          hint: 'Necesitas SUPABASE_SERVICE_ROLE_KEY en .env.local'
        }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ejecutar SQL para añadir la columna
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS imagen_url TEXT
      `
    });

    if (error && !error.message.includes('already exists')) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Columna imagen_url añadida a la tabla products'
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error en migración:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error desconocido',
        hint: 'Intenta crear la columna manualmente en el dashboard de Supabase'
      }),
      { status: 500 }
    );
  }
}
