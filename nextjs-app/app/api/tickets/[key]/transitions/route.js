import { NextResponse } from 'next/server';
import { getIssueTransitions } from '@/lib/jira';

export async function GET(request, { params }) {
  const { key } = await params;
  try {
    const transitions = await getIssueTransitions(key);
    if (!transitions) {
      return NextResponse.json({ error: "Transitions not found or issue doesn't exist" }, { status: 404 });
    }
    return NextResponse.json(transitions);
  } catch (error) {
    console.error(`Error fetching transitions for ${key}:`, error.message);
    return NextResponse.json({ error: 'Failed to fetch transitions' }, { status: 500 });
  }
}
