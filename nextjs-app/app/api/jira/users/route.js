import { NextResponse } from 'next/server';
import axios from 'axios';

function getCredentials() {
  const { JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  const credentials = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  return { JIRA_DOMAIN, credentials };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';

  try {
    const { JIRA_DOMAIN, credentials } = getCredentials();
    
    // Use user search API endpoint
    const url = `https://${JIRA_DOMAIN}/rest/api/3/user/search?query=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: { 
        Authorization: `Basic ${credentials}`, 
        Accept: 'application/json' 
      },
    });

    // Filter only active real Atlassian users (ignore Jira bots, integrations, etc.)
    const users = response.data.filter(u => u.active && u.accountType === 'atlassian');

    const mappedUsers = users.map(u => ({
      accountId: u.accountId,
      displayName: u.displayName,
      emailAddress: u.emailAddress || '',
      avatarUrl: u.avatarUrls ? u.avatarUrls['32x32'] : null
    }));

    return NextResponse.json(mappedUsers);
  } catch (err) {
    console.error('Failed to search Jira users:', err.message);
    return NextResponse.json({ error: 'Failed to search Jira users' }, { status: 500 });
  }
}
