import pkg from 'pg';
const { Client } = pkg;

const PROJECT_REF = 'pfsdufsokjpgacfmwexw';
const PASSWORD = process.argv[2] || 'Cartistry2025!';

const SQL = `
  ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS cuadricula_cols int DEFAULT 5,
    ADD COLUMN IF NOT EXISTS cuadricula_rows int DEFAULT 5;
`;

async function tryConnect(host, port) {
  const client = new Client({
    host,
    port,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  await client.query(SQL);
  await client.query("NOTIFY pgrst, 'reload schema';");
  await client.end();
}

(async () => {
  // Sabemos por experiencia previa que el pooler EU-central tiene el tenant.
  const candidates = [
    ['aws-1-eu-central-1.pooler.supabase.com', 6543],
    ['aws-1-eu-central-1.pooler.supabase.com', 5432],
  ];
  for (const [host, port] of candidates) {
    try {
      console.log(`Probando ${host}:${port}...`);
      await tryConnect(host, port);
      console.log('✅ cuadricula_cols / cuadricula_rows añadidas a stores.');
      process.exit(0);
    } catch (err) {
      console.log('  ✗', err.message);
    }
  }
  console.log('❌ No conectado.');
  process.exit(1);
})();
