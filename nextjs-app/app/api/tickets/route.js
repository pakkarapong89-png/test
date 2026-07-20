import { NextResponse } from 'next/server';
import { fetchJiraTickets, createJiraIssue, fetchJiraTicketByKey } from '@/lib/jira';
import { addActivityLog, readStatusCache, writeStatusCache } from '@/lib/logs';
import { getRecentTransitionAuthor } from '@/lib/jira';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { parseSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


async function detectStatusChangesAndLog(newTickets) {
  try {
    const cachedStatuses = await readStatusCache();
    const cacheExists = Object.keys(cachedStatuses).length > 0;

    for (const ticket of newTickets) {
      const oldStatus = cachedStatuses[ticket.key];

      if (cacheExists && !oldStatus) {
        // ตั๋วใหม่ที่ไม่เคยอยู่ใน cache → บันทึก Log "สร้างงาน"
        const creatorName = ticket.reporter || 'Jira User';
        await addActivityLog(
          creatorName,
          'Jira User',
          'create',
          ticket.key,
          `สร้างงานใหม่: "${ticket.summary}" (${ticket.issuetype})`
        );
      } else if (cacheExists && oldStatus && oldStatus !== ticket.status) {
        // สถานะเปลี่ยน → บันทึก Log "เปลี่ยนสถานะ"
        let authorName = await getRecentTransitionAuthor(ticket.key, ticket.status);
        let userRole = 'Jira User';
        if (!authorName) {
          authorName = 'Jira System';
          userRole = 'Jira';
        }
        await addActivityLog(
          authorName,
          userRole,
          'transition',
          ticket.key,
          `เปลี่ยนสถานะจาก "${oldStatus}" เป็น "${ticket.status}"`
        );
      }

      cachedStatuses[ticket.key] = ticket.status;
    }

    await writeStatusCache(cachedStatuses);
  } catch (err) {
    console.error('Failed in status change detection:', err.message);
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const user = token ? parseSessionToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'สิทธิ์การใช้งานหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, { status: 401 });
    }

    const res = await query('SELECT * FROM tickets ORDER BY created DESC');
    const tickets = res.rows.map(t => ({
      key: t.key,
      summary: t.summary,
      status: t.status,
      issuetype: t.issuetype,
      priority: t.priority,
      assignee: t.assignee || 'Unassigned',
      reporter: t.reporter || null,
      created: t.created ? new Date(t.created).toISOString() : null,
      duedate: t.duedate || null,
      resolved: t.resolved ? new Date(t.resolved).toISOString() : null,
      parent: t.parent || null,
      description: t.description || ''
    }));

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets from cache:', error.message);
    return NextResponse.json({ error: 'Failed to fetch tickets from cache database' }, { status: 500 });
  }
}


export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const user = token ? parseSessionToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'สิทธิ์การใช้งานหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, { status: 401 });
    }

    // Check for read-only roles
    if (['Sales', 'Deployment', 'CEO'].includes(user.role)) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ในการสร้างงาน (Read-only Role)' }, { status: 403 });
    }

    const body = await request.json();
    const result = await createJiraIssue(body);

    if (result && result.key) {
      try {
        const t = await fetchJiraTicketByKey(result.key);
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
        console.log(`[Cache] Successfully cached new ticket ${result.key}`);
      } catch (cacheErr) {
        console.error(`[Cache] Failed to cache new ticket ${result.key}:`, cacheErr.message);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating ticket:', error.message);
    if (error.response) {
      return NextResponse.json({ error: error.response.data }, { status: error.response.status });
    }
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
