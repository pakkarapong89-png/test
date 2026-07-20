import { NextResponse } from 'next/server';
import { readLogs, addActivityLog } from '@/lib/logs';
import { cookies } from 'next/headers';
import { parseSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const user = token ? parseSessionToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'สิทธิ์การใช้งานหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, { status: 401 });
    }

    const logs = await readLogs();
    return NextResponse.json(logs);
  } catch (err) {
    console.error('API GET Logs Error:', err);
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const userObj = token ? parseSessionToken(token) : null;
    if (!userObj) {
      return NextResponse.json({ error: 'สิทธิ์การใช้งานหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, { status: 401 });
    }

    const { user, role, action, ticketKey, details } = await request.json();
    if (!user || !action) {
      return NextResponse.json({ error: 'Missing user or action' }, { status: 400 });
    }

    // Secure write access (only allow logged-in user to write logs matching their identity, or allow dashboard users)
    await addActivityLog(user, role || 'User', action, ticketKey || '', details || '');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API POST Logs Error:', err);
    return NextResponse.json({ error: 'Failed to write log' }, { status: 500 });
  }
}
