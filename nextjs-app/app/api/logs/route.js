import { NextResponse } from 'next/server';
import { readLogs, addActivityLog } from '@/lib/logs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await readLogs();
    return NextResponse.json(logs);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, role, action, ticketKey, details } = await request.json();
    if (!user || !action) {
      return NextResponse.json({ error: 'Missing user or action' }, { status: 400 });
    }
    await addActivityLog(user, role || 'User', action, ticketKey || '', details || '');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to write log' }, { status: 500 });
  }
}
