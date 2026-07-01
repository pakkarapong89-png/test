import { NextResponse } from 'next/server';
import { readTeam, writeTeam } from '@/lib/team';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const team = await readTeam();
    return NextResponse.json(team);
  } catch (err) {
    console.error('API GET Team Error:', err);
    return NextResponse.json({ error: 'Failed to read team members' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
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
