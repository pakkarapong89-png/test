import { NextResponse } from 'next/server';
import axios from 'axios';
import { fetchDailyDueTasks } from '@/lib/jira';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  // Secure this endpoint in production
  if (process.env.NODE_ENV === 'production') {
    const cronSecret = process.env.CRON_SECRET;
    const isSecretMatch = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isSecretMatch && !isVercelCron) {
      if (cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      } else {
        console.warn('[CRON] Warning: CRON_SECRET is not configured in environment variables. Allowing execution via fallback.');
      }
    }
  }

  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[CRON] GOOGLE_CHAT_WEBHOOK_URL is missing in environment variables.');
    return NextResponse.json(
      { error: 'GOOGLE_CHAT_WEBHOOK_URL is not configured' },
      { status: 500 }
    );
  }

  try {
    console.log('[CRON] Fetching daily morning tasks summary from Jira...');
    const summaryText = await fetchDailyDueTasks();

    console.log('[CRON] Posting summary to Google Chat space...');
    await axios.post(webhookUrl, { text: summaryText });

    return NextResponse.json({
      success: true,
      message: 'Daily morning summary posted successfully.',
    });
  } catch (err) {
    console.error('[CRON] Error posting daily summary:', err.message);
    return NextResponse.json(
      { error: 'Failed to post daily summary', details: err.message },
      { status: 500 }
    );
  }
}
