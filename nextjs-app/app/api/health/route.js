import { NextResponse } from 'next/server';
import { query, isDbConnected } from '@/lib/db';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = {};

  // 1. Check environment variables
  const requiredEnvVars = [
    'DATABASE_URL', 'JIRA_DOMAIN', 'JIRA_EMAIL',
    'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY',
    'GOOGLE_CHAT_WEBHOOK_URL', 'GEMINI_API_KEY', 'SESSION_SECRET', 'CRON_SECRET'
  ];
  const missingVars = requiredEnvVars.filter(k => !process.env[k]);
  results.env = {
    status: missingVars.length === 0 ? 'ok' : 'missing',
    missing: missingVars,
    BOT_NAME: process.env.BOT_NAME || 'taskyapp (default)',
    JIRA_DOMAIN: process.env.JIRA_DOMAIN,
    JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY,
    LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
  };

  // 2. Check database connection
  try {
    const res = await query('SELECT COUNT(*) as count FROM tickets');
    results.database = {
      status: 'ok',
      ticket_count: parseInt(res.rows[0].count),
      message: parseInt(res.rows[0].count) === 0
        ? '⚠️ ยังไม่มีข้อมูลตั๋วงาน - กรุณาเรียก /api/cron/sync-tickets?secret=[CRON_SECRET] เพื่อซิงค์ครั้งแรก'
        : `✅ พบ ${res.rows[0].count} ตั๋วงานในฐานข้อมูล`
    };
  } catch (err) {
    results.database = { status: 'error', message: err.message };
  }

  // 3. Check Jira connection
  const jiraDomain = process.env.JIRA_DOMAIN;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  const jiraProject = process.env.JIRA_PROJECT_KEY;

  if (jiraDomain && jiraEmail && jiraToken && jiraProject) {
    try {
      const credentials = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
      const url = `https://${jiraDomain}/rest/api/3/project/${jiraProject}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
        timeout: 8000,
      });
      results.jira = {
        status: 'ok',
        project_name: res.data.name,
        project_key: res.data.key,
        message: `✅ เชื่อมต่อ Jira สำเร็จ - โครงการ "${res.data.name}" (${res.data.key})`
      };
    } catch (err) {
      results.jira = {
        status: 'error',
        message: `❌ เชื่อมต่อ Jira ไม่ได้: ${err.response?.status === 401 ? 'API Token ไม่ถูกต้อง' : err.response?.status === 404 ? 'ไม่พบ Project Key นี้ใน Jira' : err.message}`
      };
    }
  } else {
    results.jira = { status: 'skipped', message: 'ไม่ได้กำหนดค่า Jira ครบถ้วน' };
  }

  // 4. Check Google Chat Webhook
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (webhookUrl) {
    results.google_chat = {
      status: 'configured',
      message: '✅ Google Chat Webhook URL ตั้งค่าแล้ว'
    };
  } else {
    results.google_chat = { status: 'missing', message: '❌ ยังไม่ได้กำหนด GOOGLE_CHAT_WEBHOOK_URL' };
  }

  // Summary
  const allOk = results.database.status === 'ok' && results.jira.status === 'ok';
  const overallStatus = allOk ? 'ready' : 'needs_attention';

  return NextResponse.json({
    overall: overallStatus,
    message: allOk
      ? '🎉 ระบบพร้อมใช้งานครบทุกส่วนแล้ว!'
      : '⚠️ ระบบมีบางส่วนที่ต้องตั้งค่าเพิ่มเติม กรุณาดูรายละเอียดด้านล่าง',
    checks: results,
    sync_url_hint: `เรียก /api/cron/sync-tickets?secret=${process.env.CRON_SECRET || '[CRON_SECRET]'} เพื่อซิงค์ข้อมูลตั๋วงานครั้งแรก`,
  }, { status: 200 });
}
