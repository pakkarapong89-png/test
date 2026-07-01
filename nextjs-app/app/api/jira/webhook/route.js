import { NextResponse } from 'next/server';
import { fetchJiraTicketByKey } from '@/lib/jira';
import { query } from '@/lib/db';
import { addActivityLog } from '@/lib/logs';
import axios from 'axios';

export async function POST(request) {
  try {
    const payload = await request.json();
    const event = payload.webhookEvent;
    
    // Extract ticket key and summary
    const issueKey = payload.issue ? payload.issue.key : null;
    const issueSummary = payload.issue?.fields?.summary || 'ไม่มีชื่อหัวข้องาน';
    const authorName = payload.user?.displayName || 'ผู้ใช้ Jira';
    
    console.log(`[Jira Webhook] Received event "${event}" for issue "${issueKey}"`);

    if (!issueKey) {
      return NextResponse.json({ success: false, message: 'No issue key found in payload' }, { status: 400 });
    }

    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;

    // Detect execution source and actor
    let source = 'Jira Cloud';
    let actor = authorName;

    try {
      // Delete stale records older than 20 seconds to prevent false-positives from old aborted/failed UAT transitions
      await query("DELETE FROM action_sources WHERE created_at < NOW() - INTERVAL '20 seconds'");

      const sourceRes = await query(
        'SELECT source, actor, created_at FROM action_sources WHERE ticket_key = $1',
        [issueKey]
      );
      if (sourceRes.rows.length > 0) {
        const row = sourceRes.rows[0];
        const ageMs = Date.now() - new Date(row.created_at).getTime();
        // Allow up to 20 seconds of network delay/skew (webhooks are typically instant: 1-3 seconds)
        if (ageMs < 20000) {
          source = row.source;
          actor = row.actor;
        }
        // Consume the record
        await query('DELETE FROM action_sources WHERE ticket_key = $1', [issueKey]);
      }
    } catch (dbErr) {
      console.warn('[Jira Webhook Source Check] Failed to lookup action source:', dbErr.message);
    }

    // 1. Handle Deletion Event
    if (event === 'jira:issue_deleted') {
      console.log(`[Jira Webhook] Deleting ticket ${issueKey} from database cache...`);
      await query('DELETE FROM tickets WHERE key = $1', [issueKey]);

      if (source === 'Jira Cloud') {
        try {
          await addActivityLog(
            actor,
            'Jira User',
            'delete',
            issueKey,
            `ลบตั๋วงาน: "${issueSummary}"`
          );
        } catch (logErr) {
          console.error('[Jira Webhook Log] Failed to log delete event:', logErr.message);
        }
      }

      if (webhookUrl) {
        const deleteText = `🗑️ *[${issueKey}] ลบงานสำเร็จ*\n` +
                           `• 📝 หัวข้องาน: **${issueSummary}**\n` +
                           `• 👤 ผู้ดำเนินการ: **${actor}**\n` +
                           `• 🌐 ดำเนินการจาก: **${source}**`;
        try {
          await axios.post(webhookUrl, { text: deleteText });
        } catch (err) {
          console.error('[Jira Webhook Notification] Failed to post delete event to Google Chat:', err.message);
        }
      }

      return NextResponse.json({ success: true, action: 'deleted', key: issueKey });
    }


    // 2. Handle Creation and Update Events
    if (event === 'jira:issue_created' || event === 'jira:issue_updated' || event.includes('issue_')) {
      console.log(`[Jira Webhook] Syncing ticket ${issueKey} to database cache...`);
      try {
        const t = await fetchJiraTicketByKey(issueKey);
        await query(
          `INSERT INTO tickets (key, summary, status, issuetype, priority, assignee, reporter, created, duedate, resolved, parent, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (key) DO UPDATE SET
             summary = EXCLUDED.summary,
             status = EXCLUDED.status,
             issuetype = EXCLUDED.issuetype,
             priority = EXCLUDED.priority,
             assignee = EXCLUDED.assignee,
             reporter = EXCLUDED.reporter,
             duedate = EXCLUDED.duedate,
             resolved = EXCLUDED.resolved,
             parent = EXCLUDED.parent,
             description = EXCLUDED.description,
             updated_at = CURRENT_TIMESTAMP`,
          [
            t.key,
            t.summary,
            t.status,
            t.issuetype,
            t.priority,
            t.assignee === 'Unassigned' ? null : t.assignee,
            t.reporter || null,
            t.created,
            t.duedate || null,
            t.resolved || null,
            t.parent || null,
            t.description || ''
          ]
        );
        console.log(`[Jira Webhook] Successfully synchronized ticket ${issueKey} in DB.`);

        // Log actions done on Jira Cloud directly (since they bypass Dashboard APIs)
        if (source === 'Jira Cloud') {
          try {
            if (event === 'jira:issue_created') {
              const issueType = payload.issue?.fields?.issuetype?.name || 'Task';
              await addActivityLog(
                actor,
                'Jira User',
                'create',
                issueKey,
                `สร้างงานใหม่: "${issueSummary}" (${issueType})`
              );
            } else if (event === 'jira:issue_updated') {
              const changelogItems = payload.changelog?.items || [];
              for (const item of changelogItems) {
                const fieldName = item.field;
                let fromVal = (item.fromString || 'ไม่ระบุ').replace(/[\r\n]+/g, ' ').trim();
                let toVal = (item.toString || 'ไม่ระบุ').replace(/[\r\n]+/g, ' ').trim();

                if (fromVal.length > 60) fromVal = fromVal.substring(0, 57) + '...';
                if (toVal.length > 60) toVal = toVal.substring(0, 57) + '...';

                let fieldLabel = fieldName;
                let actionType = 'update';
                if (fieldName === 'status') {
                  fieldLabel = 'สถานะ';
                  actionType = 'transition';
                } else if (fieldName === 'assignee') {
                  fieldLabel = 'ผู้รับผิดชอบ';
                } else if (fieldName === 'summary') {
                  fieldLabel = 'หัวข้องาน';
                } else if (fieldName === 'description') {
                  fieldLabel = 'รายละเอียด';
                } else if (fieldName === 'duedate') {
                  fieldLabel = 'กำหนดส่ง';
                } else if (fieldName === 'priority') {
                  fieldLabel = 'ความสำคัญ';
                }

                let logDetails = '';
                if (fieldName === 'status') {
                  logDetails = `เปลี่ยนสถานะจาก "${fromVal}" เป็น "${toVal}"`;
                } else {
                  logDetails = `แก้ไข "${fieldLabel}" จาก "${fromVal}" เป็น "${toVal}"`;
                }

                await addActivityLog(
                  actor,
                  'Jira User',
                  actionType,
                  issueKey,
                  logDetails
                );
              }
            }
          } catch (logErr) {
            console.error('[Jira Webhook Log] Failed to write activity log:', logErr.message);
          }
        }

        // Send Google Chat notification for Jira Cloud and Web Dashboard actions
        // (For the Chatbot, it handles its own direct replies in the chat room, so we filter it out to prevent duplicates)
        const botName = process.env.BOT_NAME || 'taskyapp';
        if (webhookUrl && source.toLowerCase() !== botName.toLowerCase() && source !== 'Chatbot' && source !== 'Sekloso Bot') {
          let notificationText = '';
          const jiraDomain = process.env.JIRA_DOMAIN || 'ku-team-pa0al2cy.atlassian.net';
          const issueLink = `https://${jiraDomain}/browse/${issueKey}`;

          if (event === 'jira:issue_created') {
            const issueType = payload.issue?.fields?.issuetype?.name || 'Task';
            const assigneeName = payload.issue?.fields?.assignee?.displayName || 'ยังไม่มีผู้รับผิดชอบ';
            notificationText = `📌 *[${issueKey}] สร้างงานใหม่สำเร็จ*\n` +
                               `• 📝 *หัวข้องาน:* *${issueSummary}*\n` +
                               `• 🏷️ *ประเภท:* *${issueType}*\n` +
                               `• 👤 *ผู้รับผิดชอบ:* *${assigneeName}*\n` +
                               `• ✍️ *ผู้สร้าง:* *${actor}*\n` +
                               `• 🌐 *ดำเนินการจาก:* *${source}*\n` +
                               `• 🔗 *ลิงก์งาน:* ${issueLink}`;
          } else if (event === 'jira:issue_updated') {
            const changelogItems = payload.changelog?.items || [];
            if (changelogItems.length > 0) {
              let changeDetails = '';

              changelogItems.forEach(item => {
                const fieldName = item.field;
                let fromVal = (item.fromString || 'ไม่ระบุ').replace(/[\r\n]+/g, ' ').trim();
                let toVal = (item.toString || 'ไม่ระบุ').replace(/[\r\n]+/g, ' ').trim();

                // Truncate to keep the chat notification tidy
                if (fromVal.length > 60) fromVal = fromVal.substring(0, 57) + '...';
                if (toVal.length > 60) toVal = toVal.substring(0, 57) + '...';

                let fieldLabel = fieldName;
                if (fieldName === 'status') fieldLabel = 'สถานะ';
                else if (fieldName === 'assignee') fieldLabel = 'ผู้รับผิดชอบ';
                else if (fieldName === 'summary') fieldLabel = 'หัวข้องาน';
                else if (fieldName === 'description') fieldLabel = 'รายละเอียด';
                else if (fieldName === 'duedate') fieldLabel = 'กำหนดส่ง';
                else if (fieldName === 'priority') fieldLabel = 'ความสำคัญ';
                else if (fieldName === 'labels') fieldLabel = 'ป้ายกำกับ';

                changeDetails += `  • *${fieldLabel}:* ${fromVal} ➡️ *${toVal}*\n`;
              });

              if (changeDetails) {
                notificationText = `🔄 *[${issueKey}] อัปเดตงานสำเร็จ*\n` +
                                   `• 📝 *หัวข้องาน:* *${issueSummary}*\n` +
                                   `• 🔄 *การเปลี่ยนแปลง:*\n${changeDetails}` +
                                   `• 👤 *ผู้ดำเนินการ:* *${actor}*\n` +
                                   `• 🌐 *ดำเนินการจาก:* *${source}*\n` +
                                   `• 🔗 *ลิงก์งาน:* ${issueLink}`;
              }
            }
          }

          if (notificationText) {
            try {
              await axios.post(webhookUrl, { text: notificationText });
              console.log(`[Jira Webhook Notification] Sent notification to Google Chat for ${issueKey}`);
            } catch (webhookErr) {
              console.error('[Jira Webhook Notification] Failed to send to Google Chat:', webhookErr.message);
            }
          }
        }

        return NextResponse.json({ success: true, action: 'synced', key: issueKey });
      } catch (syncErr) {
        console.error(`[Jira Webhook] Failed to fetch and sync issue ${issueKey}:`, syncErr.message);
        return NextResponse.json({ success: false, error: syncErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: `Event "${event}" ignored` });
  } catch (err) {
    console.error('[Jira Webhook] Error processing webhook:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


export async function GET() {
  return NextResponse.json({ status: 'Jira webhook endpoint active. Configure this path in Jira System Webhooks.' });
}
