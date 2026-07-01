import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateJiraIssue, fetchJiraTicketByKey } from '@/lib/jira';
import { parseSessionToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PUT(request, { params }) {
  const { key } = await params;
  try {
    const body = await request.json();
    const { actorName, ...jiraUpdateFields } = body;
    
    // Get logged-in user from session
    let userName = actorName || 'ผู้ใช้งานผ่านแดชบอร์ด';
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('session')?.value;
      if (token) {
        const user = parseSessionToken(token);
        if (user) {
          userName = user.name || user.username;
        }
      }
    } catch (cookieErr) {
      console.warn('[Cache Update] Failed to parse session cookies:', cookieErr.message);
    }

    // Record action source
    try {
      await query(
        `INSERT INTO action_sources (ticket_key, source, actor)
         VALUES ($1, $2, $3)
         ON CONFLICT (ticket_key) DO UPDATE SET source = EXCLUDED.source, actor = EXCLUDED.actor, created_at = CURRENT_TIMESTAMP`,
        [key, 'เว็บ Dashboard', userName]
      );
    } catch (dbErr) {
      console.error('[Cache Update] Failed to record action source:', dbErr.message);
    }

    const result = await updateJiraIssue(key, jiraUpdateFields);

    try {
      const t = await fetchJiraTicketByKey(key);
      await query(
        `INSERT INTO tickets (key, summary, status, issuetype, priority, assignee, reporter, created, duedate, resolved, parent, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (key) DO UPDATE SET
           summary = EXCLUDED.summary,
           status = EXCLUDED.status,
           issuetype = EXCLUDED.issuetype,
           priority = EXCLUDED.priority,
           assignee = EXCLUDED.assignee,
           reporter = EXCLUDED.reporter,
           duedate = EXCLUDED.duedate,
           resolved = EXCLUDED.resolved,
           parent = EXCLUDED.parent,
           description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP`,
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
      console.log(`[Cache Update] Successfully updated cache for ticket ${key}`);
    } catch (cacheErr) {
      console.error(`[Cache Update] Failed to update cache for ticket ${key}:`, cacheErr.message);
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error(`Error updating ticket ${key}:`, error.message);
    if (error.response) {
      return NextResponse.json({ error: error.response.data }, { status: error.response.status });
    }
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

