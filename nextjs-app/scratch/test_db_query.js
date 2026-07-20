import 'dotenv/config';
import { query } from '../lib/db.js';

async function test() {
  const t0 = Date.now();
  const res = await query('SELECT "key" FROM tickets WHERE summary ILIKE $1 ORDER BY "key" DESC LIMIT 1', ['%วัดซับแมน%']);
  console.log(`FOUND PARENT IN ${Date.now() - t0} ms:`, res.rows);
}

test().catch(console.error);
