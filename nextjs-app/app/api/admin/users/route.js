import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseSessionToken } from '@/lib/auth';
import { query, initDb } from '@/lib/db';

// Helper: authenticate and authorize admin only
async function requireAdmin(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  const user = parseSessionToken(token);
  if (!user || user.role !== 'Admin') return null;
  return user;
}

// GET /api/admin/users — list all users (pending + active)
export async function GET(request) {
  await initDb();

  const admin = await requireAdmin(request);
  if (!admin) {
    console.log('[API/ADMIN/USERS] 403 Forbidden - Not Admin');
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  console.log('[API/ADMIN/USERS] GET request by admin:', admin.username);

  const result = await query(
    `SELECT id, username, name, role, is_approved, jira_display_name, jira_account_id, created_at
     FROM users
     WHERE username != 'admin'
     ORDER BY is_approved ASC, created_at DESC`
  );

  console.log('[API/ADMIN/USERS] Found users count:', result.rows.length);
  console.log('[API/ADMIN/USERS] Found users:', JSON.stringify(result.rows));

  return NextResponse.json(result.rows);
}

// POST /api/admin/users — approve/update role OR reject/delete user
export async function POST(request) {
  await initDb();

  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json();
  const { action, userId, role } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
  }

  if (action === 'approve') {
    if (!role) {
      return NextResponse.json({ error: 'กรุณาเลือกบทบาทสำหรับผู้ใช้' }, { status: 400 });
    }

    const validRoles = ['Manager', 'Developer', 'Sales', 'Deployment', 'IT_Sub', 'CEO'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'บทบาทไม่ถูกต้อง' }, { status: 400 });
    }

    await query(
      `UPDATE users SET role = $1, is_approved = true WHERE id = $2`,
      [role, userId]
    );

    return NextResponse.json({ success: true, message: 'อนุมัติผู้ใช้สำเร็จ' });
  }

  if (action === 'reject') {
    await query('DELETE FROM users WHERE id = $1', [userId]);
    return NextResponse.json({ success: true, message: 'ปฏิเสธและลบบัญชีผู้ใช้แล้ว' });
  }

  if (action === 'update_role') {
    if (!role) {
      return NextResponse.json({ error: 'กรุณาเลือกบทบาทใหม่' }, { status: 400 });
    }
    await query(
      `UPDATE users SET role = $1 WHERE id = $2`,
      [role, userId]
    );
    return NextResponse.json({ success: true, message: 'อัปเดตบทบาทสำเร็จ' });
  }

  if (action === 'revoke') {
    await query(
      `UPDATE users SET is_approved = false, role = 'Pending' WHERE id = $1`,
      [userId]
    );
    return NextResponse.json({ success: true, message: 'ถอนสิทธิ์ผู้ใช้สำเร็จ' });
  }

  return NextResponse.json({ error: 'action ไม่ถูกต้อง' }, { status: 400 });
}
