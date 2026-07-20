import { NextResponse } from 'next/server';
import { readTeam, writeTeam } from '@/lib/team';
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

    const team = await readTeam();
    return NextResponse.json(team);
  } catch (err) {
    console.error('API GET Team Error:', err);
    return NextResponse.json({ error: 'Failed to read team members' }, { status: 500 });
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

    // Only Admin or Manager can manage team members
    if (!['Admin', 'Manager'].includes(user.role)) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ในการจัดการสมาชิกทีม' }, { status: 403 });
    }

    const team = await request.json();
    if (!Array.isArray(team)) {
      return NextResponse.json({ error: 'Payload must be an array of team members' }, { status: 400 });
    }
    await writeTeam(team);
    return NextResponse.json({ success: true, count: team.length });
  } catch (err) {
    console.error('API POST Team Error:', err);
    return NextResponse.json({ error: 'Failed to write team members' }, { status: 500 });
  }
}
