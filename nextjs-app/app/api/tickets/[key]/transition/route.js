import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIssueTransitions, transitionIssue, getJiraIssueSummary } from '@/lib/jira';
import { parseSessionToken } from '@/lib/auth';
import { query } from '@/lib/db';
import axios from 'axios';


export async function POST(request, { params }) {
  const { key } = await params;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const user = token ? parseSessionToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'สิทธิ์การใช้งานหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, { status: 401 });
    }

    // Check for read-only roles
    if (['Sales', 'Deployment', 'CEO'].includes(user.role)) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ในการเปลี่ยนสถานะงาน (Read-only Role)' }, { status: 403 });
    }

    const { transitionId, transitionName } = await request.json();

    let targetId = transitionId;
    let matchName = transitionName;

    // Fetch transitions to resolve names and IDs
    const transitions = await getIssueTransitions(key);
    
    if (!targetId && transitionName && transitions) {
      const match = transitions.find((t) => t.name.toLowerCase() === transitionName.toLowerCase());
      if (match) targetId = match.id;
    }

    if (targetId && !matchName && transitions) {
      const match = transitions.find((t) => t.id === targetId);
      if (match) matchName = match.name;
    }

    if (!targetId) {
      return NextResponse.json({ error: 'Invalid transition ID or Name' }, { status: 400 });
    }

    let userName = user.name || user.username;
    let userRole = user.role;

    // Fetch ticket summary first to enrich the message
    const summary = await getJiraIssueSummary(key) || 'ไม่สามารถดึงชื่อหัวข้องานได้';

    try {
      await query(
        `INSERT INTO action_sources (ticket_key, source, actor)
         VALUES ($1, $2, $3)
         ON CONFLICT (ticket_key) DO UPDATE SET source = EXCLUDED.source, actor = EXCLUDED.actor, created_at = CURRENT_TIMESTAMP`,
        [key, 'เว็บ Dashboard', `${userName} (${userRole})`]
      );
    } catch (dbErr) {
      console.error('[Transition Cache] Failed to record action source:', dbErr.message);
    }

    // Execute the Jira status transition
    const result = await transitionIssue(key, targetId);

    // Update Supabase cache status immediately
    if (matchName) {
      try {
        await query(
          'UPDATE tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
          [matchName, key]
        );
        console.log(`[Cache Update] Successfully updated status to "${matchName}" for ticket ${key} in DB.`);
      } catch (cacheErr) {
        console.error(`[Cache Update] Failed to update status cache for ticket ${key} in DB:`, cacheErr.message);
      }
    }



    return NextResponse.json({ success: true, result });



  } catch (error) {
    console.error(`Error transitioning ticket ${key}:`, error.message);
    if (error.response) {
      return NextResponse.json({ error: error.response.data }, { status: error.response.status });
    }
    return NextResponse.json({ error: 'Failed to transition ticket' }, { status: 500 });
  }
}

