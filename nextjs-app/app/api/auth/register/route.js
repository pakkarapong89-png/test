import { NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { findJiraUser } from '@/lib/jira';

export async function POST(request) {
  try {
    await initDb();

    const body = await request.json();
    const { username, password, email, name } = body;

    if (!username || !password || !email || !name) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (trimmedUsername.length < 3) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    // Check if username already exists in local DB
    const existing = await query('SELECT id FROM users WHERE username = $1', [trimmedUsername]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น' }, { status: 409 });
    }

    // Check if email already exists in local DB
    const existingEmail = await query('SELECT id FROM users WHERE email = $1', [trimmedEmail]);
    if (existingEmail.rows.length > 0) {
      return NextResponse.json({ error: 'อีเมลนี้ถูกใช้งานแล้วในระบบ กรุณาใช้อีเมลอื่น' }, { status: 409 });
    }

    // 🔍 Check if the email exists in Jira Cloud (optional for non-devs)
    const jiraUser = await findJiraUser(trimmedEmail);

    // Hash password
    const { hash, salt } = hashPassword(password);

    if (jiraUser) {
      // Insert new user with Pending status and linked Jira details
      await query(
        `INSERT INTO users (username, password_hash, salt, name, email, role, is_approved, jira_display_name, jira_account_id)
         VALUES ($1, $2, $3, $4, $5, 'Pending', false, $6, $7)`,
        [trimmedUsername, hash, salt, trimmedName, trimmedEmail, jiraUser.displayName, jiraUser.accountId]
      );

      return NextResponse.json({
        success: true,
        message: `สมัครสมาชิกสำเร็จ! บัญชีของคุณเชื่อมโยงกับผู้ใช้ Jira: "${jiraUser.displayName}" เรียบร้อยแล้ว กรุณารอผู้ดูแลระบบอนุมัติบัญชีของคุณ`
      });
    } else {
      // Insert new user with Pending status and no Jira details
      await query(
        `INSERT INTO users (username, password_hash, salt, name, email, role, is_approved, jira_display_name, jira_account_id)
         VALUES ($1, $2, $3, $4, $5, 'Pending', false, NULL, NULL)`,
        [trimmedUsername, hash, salt, trimmedName, trimmedEmail]
      );

      return NextResponse.json({
        success: true,
        message: `สมัครสมาชิกสำเร็จ! บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบอนุมัติเข้าระบบ`
      });
    }
  } catch (err) {
    console.error('[Auth/Register] Error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
