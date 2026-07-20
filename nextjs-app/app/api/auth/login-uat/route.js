import { NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { role, name } = await request.json();

    if (!role || !name) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // ใน Production จะอนุญาตให้เข้าผ่าน UAT ได้ก็ต่อเมื่อกำหนด NEXT_PUBLIC_UAT_MODE='true' เท่านั้น
    const isProd = process.env.NODE_ENV === 'production';
    const uatEnabled = process.env.NEXT_PUBLIC_UAT_MODE === 'true';
    if (isProd && !uatEnabled) {
      return NextResponse.json({ error: 'UAT Login ถูกปิดใช้งานใน Production' }, { status: 403 });
    }

    const mockUser = {
      id: 999,
      username: role.toLowerCase(),
      name: name,
      role: role,
      jiraDisplayName: name,
      jiraAccountId: 'mock-uat-id',
      is_approved: true
    };

    const token = createSessionToken(mockUser);
    const response = NextResponse.json({
      success: true,
      user: mockUser
    });

    // กำหนดเซสชัน Cookie (7 วัน)
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;
  } catch (err) {
    console.error('[Auth/Login-UAT] Error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล UAT' }, { status: 500 });
  }
}
