import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseSessionToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = parseSessionToken(token);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, user });
  } catch (err) {
    console.error('[Auth/Session] Error:', err);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
