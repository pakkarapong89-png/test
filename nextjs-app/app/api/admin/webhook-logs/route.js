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

export async function GET(request) {
  await initDb();

  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  try {
    const result = await query(
      `SELECT id, timestamp, endpoint, status, details, error
       FROM webhook_logs
       ORDER BY timestamp DESC
       LIMIT 100`
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('[API/ADMIN/WEBHOOK-LOGS] Error:', err.message);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}
