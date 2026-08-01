import pkg from 'pg';
const { Client } = pkg;

const PROJECT_REF = 'pfsdufsokjpgacfmwexw';

// Lista de contraseñas a probar (la del repo + variantes habituales)
const PASSWORDS = process.argv.slice(2);
if (PASSWORDS.length === 0) {
  console.error('Uso: node _add_mueble_flags.mjs <password>');
  process.exit(1);
}

const SQL = `
  ALTER TABLE muebles
    ADD COLUMN IF NOT EXISTS es_zona_caja boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS es_escaparate boolean DEFAULT false;
`;

async function tryConnect(password) {
  const client = new Client({
    host: 'aws-1-eu-central-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  await client.query(SQL);
  await client.query("NOTIFY pgrst, 'reload schema';");
  await client.end();
  return true;
}

(async () => {
  for (const pwd of PASSWORDS) {
    try {
      console.log(`Probando contraseña...`);
      await tryConnect(pwd);
      console.log('✅ Columnas es_zona_caja y es_escaparate añadidas a muebles.');
      process.exit(0);
    } catch (err) {
      console.log('  ✗', err.message);
    }
  }
  console.log('❌ Ninguna contraseña funcionó.');
  process.exit(1);
})();
