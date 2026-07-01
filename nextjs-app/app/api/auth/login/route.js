import { NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { verifyPassword, createSessionToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await initDb();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    // Look up user in database by email or username
    const result = await query(
      'SELECT id, username, password_hash, salt, name, role, is_approved, jira_display_name, jira_account_id FROM users WHERE email = $1 OR username = $1',
      [username.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const user = result.rows[0];

    // Verify password
    const valid = verifyPassword(password, user.password_hash, user.salt);
    if (!valid) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // Check if user is approved
    if (!user.is_approved) {
      return NextResponse.json(
        { error: 'pending', message: 'บัญชีของคุณยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ กรุณารอการยืนยัน' },
        { status: 403 }
      );
    }

    // Create session token
    const token = createSessionToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      jiraDisplayName: user.jira_display_name,
      jiraAccountId: user.jira_account_id
    });

    const response = NextResponse.json({
      success: true,
      user: { 
        id: user.id, 
        username: user.username, 
        name: user.name, 
        role: user.role,
        jiraDisplayName: user.jira_display_name,
        jiraAccountId: user.jira_account_id
      }
    });

    // Set HTTP-only session cookie (7 days)
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;
  } catch (err) {
    console.error('[Auth/Login] Error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
