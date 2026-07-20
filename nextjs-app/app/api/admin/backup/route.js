import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseSessionToken } from '@/lib/auth';
import { query, initDb } from '@/lib/db';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  const user = parseSessionToken(token);
  if (!user || user.role !== 'Admin') return null;
  return user;
}

// Helper to escape CSV values
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request) {
  await initDb();

  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  try {
    let csvContent = '';

    // 1. Export Users
    const usersRes = await query('SELECT id, username, name, role, is_approved, jira_display_name, created_at FROM users ORDER BY id ASC');
    csvContent += '--- TABLE: users ---\n';
    csvContent += 'id,username,name,role,is_approved,jira_display_name,created_at\n';
    usersRes.rows.forEach(row => {
      csvContent += `${escapeCSV(row.id)},${escapeCSV(row.username)},${escapeCSV(row.name)},${escapeCSV(row.role)},${escapeCSV(row.is_approved)},${escapeCSV(row.jira_display_name)},${escapeCSV(row.created_at)}\n`;
    });
    csvContent += '\n';

    // 2. Export Team Members
    const teamRes = await query('SELECT id, nickname, jira_display_name, email, webhook_url FROM team_members ORDER BY id ASC');
    csvContent += '--- TABLE: team_members ---\n';
    csvContent += 'id,nickname,jira_display_name,email,webhook_url\n';
    teamRes.rows.forEach(row => {
      csvContent += `${escapeCSV(row.id)},${escapeCSV(row.nickname)},${escapeCSV(row.jira_display_name)},${escapeCSV(row.email)},${escapeCSV(row.webhook_url)}\n`;
    });
    csvContent += '\n';

    // 3. Export Tickets Cache
    const ticketsRes = await query('SELECT key, summary, status, issuetype, priority, assignee, reporter, duedate, parent FROM tickets ORDER BY key ASC');
    csvContent += '--- TABLE: tickets ---\n';
    csvContent += 'key,summary,status,issuetype,priority,assignee,reporter,duedate,parent\n';
    ticketsRes.rows.forEach(row => {
      csvContent += `${escapeCSV(row.key)},${escapeCSV(row.summary)},${escapeCSV(row.status)},${escapeCSV(row.issuetype)},${escapeCSV(row.priority)},${escapeCSV(row.assignee)},${escapeCSV(row.reporter)},${escapeCSV(row.duedate)},${escapeCSV(row.parent)}\n`;
    });
    csvContent += '\n';

    // 4. Export Activity Logs
    const logsRes = await query('SELECT id, timestamp, username, role, action, ticket_key, details FROM activity_logs ORDER BY timestamp DESC');
    csvContent += '--- TABLE: activity_logs ---\n';
    csvContent += 'id,timestamp,username,role,action,ticket_key,details\n';
    logsRes.rows.forEach(row => {
      csvContent += `${escapeCSV(row.id)},${escapeCSV(row.timestamp)},${escapeCSV(row.username)},${escapeCSV(row.role)},${escapeCSV(row.action)},${escapeCSV(row.ticket_key)},${escapeCSV(row.details)}\n`;
    });
    csvContent += '\n';

    // 5. Export Webhook Logs
    const webhookLogsRes = await query('SELECT id, timestamp, endpoint, status, details, error FROM webhook_logs ORDER BY timestamp DESC');
    csvContent += '--- TABLE: webhook_logs ---\n';
    csvContent += 'id,timestamp,endpoint,status,details,error\n';
    webhookLogsRes.rows.forEach(row => {
      csvContent += `${escapeCSV(row.id)},${escapeCSV(row.timestamp)},${escapeCSV(row.endpoint)},${escapeCSV(row.status)},${escapeCSV(row.details)},${escapeCSV(row.error)}\n`;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `taskyapp_database_backup_${todayStr}.txt`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[API/ADMIN/BACKUP] Error:', err.message);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสำรองข้อมูล' }, { status: 500 });
  }
}
