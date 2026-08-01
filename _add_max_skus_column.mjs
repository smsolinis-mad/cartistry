import pkg from 'pg';
const { Client } = pkg;

const PROJECT_REF = 'pfsdufsokjpgacfmwexw';
const PASSWORD = 'Cartistry2025!';

const POOLERS = [
  'aws-1-eu-west-1.pooler.supabase.com',
  'aws-1-eu-central-1.pooler.supabase.com',
  'aws-1-us-east-1.pooler.supabase.com',
  'aws-1-us-east-2.pooler.supabase.com',
  'aws-1-us-west-1.pooler.supabase.com',
  'aws-1-ap-southeast-1.pooler.supabase.com',
  'aws-1-ap-south-1.pooler.supabase.com',
  'aws-1-ap-northeast-1.pooler.supabase.com',
  'aws-1-sa-east-1.pooler.supabase.com',
  'aws-1-ca-central-1.pooler.supabase.com',
  'aws-1-eu-west-2.pooler.supabase.com',
  'aws-1-eu-west-3.pooler.supabase.com',
];

const SQL = `ALTER TABLE stores ADD COLUMN IF NOT EXISTS max_skus_por_hueco int DEFAULT 4;`;

async function tryHost(host, port) {
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
  for (const host of POOLERS) {
    for (const port of [6543, 5432]) {
      try {
        console.log(`Probando ${host}:${port}...`);
        await tryHost(host, port);
        console.log(`✅ OK con ${host}:${port}`);
        process.exit(0);
      } catch (err) {
        console.log(`  ✗ ${err.message}`);
      }
    }
  }
  console.log('❌ Ningún pooler conectó.');
  process.exit(1);
})();
