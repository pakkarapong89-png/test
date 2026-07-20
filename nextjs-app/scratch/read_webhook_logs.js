import pkg from 'pg';
const { Pool } = pkg;

const connectionString = "postgresql://postgres.zfpxogqpwkezgkrtgdga:pakkarapong2547@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('--- webhook_logs ---');
    const res1 = await pool.query('SELECT * FROM webhook_logs ORDER BY id DESC LIMIT 5');
    console.log(JSON.stringify(res1.rows, null, 2));

    console.log('--- activity_logs ---');
    const res2 = await pool.query('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 5');
    console.log(JSON.stringify(res2.rows, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    await pool.end();
  }
}

main();
