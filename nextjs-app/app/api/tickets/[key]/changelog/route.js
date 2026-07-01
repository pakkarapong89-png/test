import { NextResponse } from 'next/server';
import { getIssueChangelog } from '@/lib/jira';

export async function GET(request, { params }) {
  const { key } = await params;
  try {
    const statusChanges = await getIssueChangelog(key);
    return NextResponse.json(statusChanges);
  } catch (error) {
    console.error(`Error fetching changelog for ${key}:`, error.message);
    return NextResponse.json({ error: 'Failed to fetch issue changelog' }, { status: 500 });
  }
}
