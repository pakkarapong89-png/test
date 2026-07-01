import { NextResponse } from 'next/server';
import { fetchJiraTickets } from '@/lib/jira';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');

  // Secure this endpoint in production
  if (process.env.NODE_ENV === 'production') {
    const cronSecret = process.env.CRON_SECRET;
    const isSecretMatch = cronSecret && (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret);

    if (!isSecretMatch && !isVercelCron) {
      if (cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      } else {
        console.warn('[Sync-Tickets] Warning: CRON_SECRET is not configured in environment variables.');
      }
    }
  }

  try {
    console.log('[Sync-Tickets] Fetching active tickets from Jira...');
    const tickets = await fetchJiraTickets();
    console.log(`[Sync-Tickets] Fetched ${tickets.length} tickets from Jira. Saving to Supabase cache...`);

    // We can clear and reload all tickets to ensure cache integrity
    await query('BEGIN');
    
    // Clear existing tickets
    await query('TRUNCATE TABLE tickets;');

    // Insert all tickets
    for (const t of tickets) {
      await query(
        `INSERT INTO tickets (key, summary, status, issuetype, priority, assignee, reporter, created, duedate, resolved, parent, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          t.key,
          t.summary,
          t.status,
          t.issuetype,
          t.priority,
          t.assignee === 'Unassigned' ? null : t.assignee,
          t.reporter || null,
          t.created,
          t.duedate || null,
          t.resolved || null,
          t.parent || null,
          t.description || ''
        ]
      );
    }

    await query('COMMIT');
    console.log(`[Sync-Tickets] Successfully synchronized ${tickets.length} tickets with Supabase database.`);

    return NextResponse.json({
      success: true,
      message: `Synchronized ${tickets.length} tickets successfully.`,
      count: tickets.length
    });
  } catch (err) {
    try {
      await query('ROLLBACK');
    } catch (rbErr) {
      // Ignore rollback errors
    }
    console.error('[Sync-Tickets] Error synchronizing tickets:', err.message);
    return NextResponse.json(
      { error: 'Failed to synchronize tickets', details: err.message },
      { status: 500 }
    );
  }
}
