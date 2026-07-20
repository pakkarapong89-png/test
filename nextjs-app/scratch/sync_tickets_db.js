import 'dotenv/config';
import { fetchJiraTickets } from '../lib/jira.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Fetching tickets from Jira...');
  const tickets = await fetchJiraTickets();
  console.log(`Fetched ${tickets.length} tickets from Jira.`);

  await pool.query('TRUNCATE TABLE tickets;');
  
  for (const t of tickets) {
    await pool.query(
      `INSERT INTO tickets ("key", "summary", "status", "issuetype", "priority", "assignee", "reporter", "created", "duedate", "resolved", "parent", "description")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        t.key,
        t.summary,
        t.status,
        t.issuetype,
        t.priority,
        t.assignee === 'Unassigned' ? null : t.assignee,
        t.reporter || null,
        t.created ? new Date(t.created) : null,
        t.duedate || null,
        t.resolved ? new Date(t.resolved) : null,
        t.parent || null,
        t.description || ''
      ]
    );
  }

  console.log(`✅ Successfully populated ${tickets.length} tickets into Supabase PostgreSQL DB!`);
  await pool.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
