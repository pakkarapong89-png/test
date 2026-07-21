import { NextResponse } from 'next/server';
import { parseMessageWithLLM } from '@/lib/ai';
import {
  createJiraIssue,
  updateJiraIssue,
  getIssueTransitions,
  transitionIssue,
  searchJiraIssueBySummary,
  getJiraIssueType,
  fetchPendingJiraTasks,
  getJiraIssueSummary,
} from '@/lib/jira';
import { addActivityLog } from '@/lib/logs';
import { readSpacesMap, writeSpacesMap } from '@/lib/team';
import { query } from '@/lib/db';


const JIRA_DOMAIN = process.env.JIRA_DOMAIN;

function getGuideText() {
  const botName = process.env.BOT_NAME || 'taskyapp';
  return `💡 *คู่มือการสั่งงาน ${botName}* 💡\n\n` +
    `📣 *วิธีเรียกใช้บอท:*\n` +
    `• *ในห้องกลุ่ม (Space)* → ต้องพิมพ์ *@${botName}* นำหน้าทุกครั้ง\n` +
    `• *คุยส่วนตัว (DM)* → พิมพ์คำสั่งได้เลย ไม่ต้อง @\n\n` +
    `คุณสามารถพิมพ์สั่งงานด้วยภาษาพูดปกติได้เลยครับ บอทจะใช้ AI แยกแยะข้อมูลให้เอง!\n\n` +
    `*📌 1. การสร้างงาน (Epic / Task)*\n` +
    `• *Epic (งานหลัก)* ➡️ พิมพ์สั่งสร้างลอยๆ หรือระบุคำว่า "epic"\n` +
    `  └ _ตัวอย่าง:_ "@${botName} ช่วยสร้างระบบลงทะเบียนสมัครสมาชิก"\n` +
    `• *Task (งานย่อย/จ๊อบ)* ➡️ ต้องมีคำว่า *job*, *จ๊อบ* หรือ *งานย่อย*\n` +
    `  └ _ตัวอย่าง:_ "@${botName} สร้าง job เขียนโค้ดเชื่อมต่อระบบ ในงาน KAN-1"\n\n` +
    `*📌 2. การแก้ไขข้อมูลงาน (Update)*\n` +
    `  └ _ตัวอย่าง:_ "@${botName} แก้ไขวันกำหนดส่งของ KAN-1 เป็น 31/07/69"\n\n` +
    `*📌 3. การเปลี่ยนสถานะงาน (Transition)*\n` +
    `  └ _ตัวอย่าง:_ "@${botName} ปิดงาน KAN-1"\n\n` +
    `*📌 4. การดูรายการงานค้าง (List)*\n` +
    `  └ _ตัวอย่าง:_ "@${botName} ดูงานค้างทั้งหมด"\n\n` +
    `*📌 5. คำสั่งทดสอบ (Ping)*\n` +
    `• พิมพ์ *@${botName} ping* เพื่อเช็คการเชื่อมต่อ\n\n` +
    `ลองพิมพ์สั่งงานมาได้เลยครับ! 🚀`;
}

async function logWebhookCall(endpoint, status, details, error = null) {
  try {
    await query(
      `INSERT INTO webhook_logs (endpoint, status, details, error)
       VALUES ($1, $2, $3, $4)`,
      [endpoint, status, details, error]
    );
  } catch (err) {
    console.error('[logWebhookCall] Failed to insert log:', err.message);
  }
}

function buildChatResponse(text) {
  return NextResponse.json({ text });
}

export async function POST(request) {
  const startTime = Date.now();

  try {
    // Webhook secret token validation for security
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const expectedSecret = process.env.CHAT_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.warn('⚠️ CHAT_WEBHOOK_SECRET is not set in environment variables. Webhook is running in insecure mode.');
    } else if (secret && expectedSecret && secret !== expectedSecret) {
      console.warn('[Webhook Google Chat] Secret mismatch warning:', secret);
    }

    const event = await request.json();
    console.log('Incoming Request Body:', JSON.stringify(event, null, 2));

    // Bot added to space
    if (event.chat?.addedToSpacePayload || event.type === 'ADDED_TO_SPACE') {
      const botName = process.env.BOT_NAME || 'taskyapp';
      const welcomeText = `👋 *สวัสดีครับทุกคน! ผมคือ ${botName} ยินดีที่ได้เข้าร่วมห้องนี้ครับ*\n\n` + getGuideText();
      return buildChatResponse(welcomeText);
    }

    // Bot removed from space
    if (event.chat?.removedFromSpacePayload || event.type === 'REMOVED_FROM_SPACE') {
      return NextResponse.json({});
    }

    let userMessage =
      event.chat?.messagePayload?.message?.argumentText?.trim() ||
      event.chat?.messagePayload?.message?.text?.trim() ||
      event.message?.argumentText?.trim() ||
      event.message?.text?.trim();

    if (userMessage) {
      userMessage = userMessage.replace(/^(?:@\S+|<users\/\S+?>)\s*/gi, '').trim();
    }

    const senderName =
      event.user?.displayName ||
      event.chat?.user?.displayName ||
      event.chat?.messagePayload?.message?.sender?.displayName ||
      event.message?.sender?.displayName ||
      'User';

    const senderEmail =
      event.chat?.user?.email ||
      event.chat?.messagePayload?.message?.sender?.email ||
      event.message?.sender?.email;

    const spaceName =
      event.chat?.messagePayload?.space?.name || event.message?.space?.name;

    const spaceType =
      event.chat?.messagePayload?.space?.type ||
      event.chat?.messagePayload?.space?.spaceType ||
      event.message?.space?.type ||
      event.message?.space?.spaceType;

    // Cache DM space ID
    if ((spaceType === 'DM' || spaceType === 'DIRECT_MESSAGE') && senderEmail && spaceName) {
      const spacesMap = await readSpacesMap();
      spacesMap[senderEmail.toLowerCase()] = spaceName;
      await writeSpacesMap(spacesMap);
    }

    const isHelpCommand =
      userMessage &&
      (userMessage.toLowerCase().includes('help') ||
        userMessage.includes('แนะนำ') ||
        userMessage.includes('วิธีใช้') ||
        userMessage.includes('ช่วยด้วย'));

    if (!userMessage || userMessage === '' || isHelpCommand) {
      return buildChatResponse(getGuideText());
    }

    if (userMessage.toLowerCase().includes('ping')) {
      return buildChatResponse('🏓 Pong! ระบบ Chat Bot ทำงานปกติครับ');
    }

    // List command handling
    const hasCreateOrUpdateWord =
      userMessage.includes('สร้าง') ||
      userMessage.includes('เพิ่ม') ||
      userMessage.includes('เปิด') ||
      userMessage.includes('ทำ') ||
      userMessage.includes('แก้ไข') ||
      userMessage.includes('เปลี่ยน') ||
      userMessage.includes('แก้') ||
      userMessage.includes('เป็น') ||
      userMessage.includes('คือ') ||
      userMessage.includes('เท่ากับ') ||
      userMessage.includes('=') ||
      userMessage.includes('ให้');

    const isListCommand =
      !hasCreateOrUpdateWord &&
      (userMessage.includes('ดูงาน') ||
        userMessage.includes('เหลืองาน') ||
        userMessage.includes('งานที่ยังไม่เสร็จ') ||
        userMessage.includes('สรุปงาน') ||
        userMessage.includes('งานค้าง') ||
        userMessage.includes('วันส่งงาน') ||
        userMessage.includes('กำหนดส่ง') ||
        userMessage.toLowerCase().includes('ดูepic') ||
        userMessage.toLowerCase().includes('ดู epic') ||
        userMessage.toLowerCase().includes('ดูtask') ||
        userMessage.toLowerCase().includes('ดู task') ||
        userMessage.toLowerCase().includes('ดูทาสก์') ||
        userMessage.toLowerCase().includes('ดูjob') ||
        userMessage.toLowerCase().includes('ดู job'));

    if (isListCommand) {
      let requestedType = null;
      let displayTypeName = 'งานทั้งหมด';
      const lowerMsg = userMessage.toLowerCase();

      if (lowerMsg.includes('project') || lowerMsg.includes('โครงการ')) {
        requestedType = 'Project';
        displayTypeName = 'Project (โครงการ)';
      } else if (lowerMsg.includes('epic') || lowerMsg.includes('งานหลัก')) {
        requestedType = 'Epic';
        displayTypeName = 'Epic (งานหลัก)';
      } else if (lowerMsg.includes('job') || lowerMsg.includes('จ๊อบ') || lowerMsg.includes('งานย่อย') || lowerMsg.includes('task') || lowerMsg.includes('ทาสก์')) {
        requestedType = 'Task';
        displayTypeName = 'Task (งานย่อย)';
      }

      try {
        const tasksText = await fetchPendingJiraTasks(requestedType, displayTypeName);
        return buildChatResponse(tasksText);
      } catch (err) {
        return buildChatResponse('❌ ไม่สามารถดึงข้อมูลงานจาก Jira ได้: ' + err.message);
      }
    }

    // Async background task processing for 100% guaranteed zero timeouts
    const processTaskInBackground = async () => {
      try {
        const structuredData = await parseMessageWithLLM(userMessage, senderName);
        console.log('LLM Parsed Data:', structuredData);

        const cleanAssigneeName = (name) => {
          if (!name) return '';
          const clean = name.trim();
          const lower = clean.toLowerCase();
          const dateIndicators = [
            'พน', 'พน.', 'พรุ่งนี้', 'วันนี้', 'มะรืน', 'มะรืนนี้', 
            'ส่ง พน', 'ส่ง พรุ่งนี้', 'ส่งวันนี้', 'ส่งมะรืนนี้', 'ส่ง พน.',
            'วันพรุ่งนี้', 'วันมะรืน', 'วันมะรืนนี้', 'ส่งงาน', 'ส่งงาน พน',
            'ส่งงาน พรุ่งนี้', 'ส่งงานวันนี้', 'ส่งงานมะรืนนี้', 'ส่งงาน พน.'
          ];
          if (dateIndicators.includes(lower)) return '';
          if (lower.startsWith('ส่ง ') || lower.startsWith('ส่งงาน ')) {
            const suffix = lower.replace(/^(ส่ง|ส่งงาน)\s+/, '');
            if (dateIndicators.includes(suffix) || dateIndicators.includes(suffix + 'นี้')) return '';
          }
          return clean;
        };

        if (structuredData.issues && Array.isArray(structuredData.issues)) {
          structuredData.issues.forEach(iss => {
            if (iss.assigneeName) iss.assigneeName = cleanAssigneeName(iss.assigneeName);
          });
        }
        if (structuredData.assigneeName) {
          structuredData.assigneeName = cleanAssigneeName(structuredData.assigneeName);
        }

        if (structuredData.isCommandValid === false) {
          const errMsg = `⚠️ *คำสั่งไม่สมบูรณ์:*\n${structuredData.replyMessage || 'กรุณาลองระบุรายละเอียดเพิ่มเติมครับ'}`;
          if (process.env.GOOGLE_CHAT_WEBHOOK_URL) {
            await axios.post(process.env.GOOGLE_CHAT_WEBHOOK_URL, { text: errMsg }).catch(() => {});
          }
          return;
        }

        if (structuredData.intent === 'chat') {
          const chatReply = structuredData.replyMessage || 'สวัสดีครับ มีอะไรให้ผมช่วยเหลือเกี่ยวกับ Jira ไหมครับ?';
          if (process.env.GOOGLE_CHAT_WEBHOOK_URL) {
            await axios.post(process.env.GOOGLE_CHAT_WEBHOOK_URL, { text: chatReply }).catch(() => {});
          }
          return;
        }

        // Handle update intent
        if (structuredData.intent === 'update') {
          const issuesToUpdate = Array.isArray(structuredData.issues) && structuredData.issues.length > 0 ? structuredData.issues : [structuredData];
          let responseText = `🔄 *อัปเดตงานสำเร็จเรียบร้อยครับ!* 🎉 (จำนวน ${issuesToUpdate.length} งาน)\n\n`;

          for (const issue of issuesToUpdate) {
            const targetKey = issue.targetKey ? issue.targetKey.trim().toUpperCase() : null;
            if (!targetKey) {
              responseText += `❌ **ไม่พบรหัสงานที่ต้องการอัปเดต**\n\n`;
              continue;
            }
            try {
              await updateJiraIssue(targetKey, issue);
              query(
                `INSERT INTO action_sources (ticket_key, source, actor)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (ticket_key) DO UPDATE SET source = EXCLUDED.source, actor = EXCLUDED.actor, created_at = CURRENT_TIMESTAMP`,
                [targetKey, process.env.BOT_NAME || 'taskyapp', senderName]
              ).catch(() => {});
              addActivityLog(senderName, 'Chatbot', 'update', targetKey, `อัปเดตข้อมูลงานผ่าน Chatbot`).catch(() => {});
              responseText += `📌 *[${targetKey}] อัปเดตข้อมูลสำเร็จ*\n` +
                              `• 👤 *ผู้ดำเนินการ:* *${senderName}*\n` +
                              `• 🌐 *ดำเนินการจาก:* *${process.env.BOT_NAME || 'taskyapp'}*\n` +
                              `• 🔗 *ลิงก์งาน:* https://${JIRA_DOMAIN}/browse/${targetKey}\n\n`;
            } catch (err) {
              responseText += `❌ **เกิดข้อผิดพลาดในการอัปเดต ${targetKey}:** ${err.message}\n\n`;
            }
          }
          if (process.env.GOOGLE_CHAT_WEBHOOK_URL) {
            await axios.post(process.env.GOOGLE_CHAT_WEBHOOK_URL, { text: responseText }).catch(() => {});
          }
          return;
        }

        // Handle transition intent
        if (structuredData.intent === 'transition') {
          const issuesToTransition = Array.isArray(structuredData.issues) && structuredData.issues.length > 0 ? structuredData.issues : [structuredData];
          let responseText = `🔄 *เปลี่ยนสถานะตั๋วสำเร็จเรียบร้อยครับ!* 🎉\n\n`;

          for (const issue of issuesToTransition) {
            const targetKey = issue.targetKey ? issue.targetKey.trim().toUpperCase() : null;
            const statusName = issue.targetStatus || 'Done';
            if (!targetKey) {
              responseText += `❌ **ไม่พบรหัสงานที่ต้องการเปลี่ยนสถานะ**\n\n`;
              continue;
            }
            try {
              const transitions = await getIssueTransitions(targetKey);
              if (!transitions || transitions.length === 0) {
                responseText += `❌ **ตั๋ว ${targetKey}: ไม่สามารถดึงข้อมูลรายการสถานะที่เป็นไปได้**\n\n`;
                continue;
              }
              let match = transitions.find((t) => t.name.toLowerCase() === statusName.toLowerCase());
              if (!match) {
                if (statusName.toLowerCase() === 'done' || statusName.includes('เสร็จ') || statusName.includes('ปิด')) {
                  match = transitions.find((t) => t.name.toLowerCase() === 'done' || t.name.toLowerCase() === 'closed');
                } else if (statusName.toLowerCase() === 'in progress' || statusName.includes('ทำ')) {
                  match = transitions.find((t) => t.name.toLowerCase() === 'in progress' || t.name.toLowerCase().includes('progress'));
                }
              }
              if (!match) {
                responseText += `⚠️ **ตั๋ว ${targetKey}: ไม่พบสถานะ "${statusName}" ที่ย้ายไปได้**\n\n`;
                continue;
              }
              await transitionIssue(targetKey, match.id);
              responseText += `🔄 *[${targetKey}] เปลี่ยนสถานะเป็น ${match.name} สำเร็จ*\n` +
                              `• 👤 *ผู้ดำเนินการ:* *${senderName}*\n` +
                              `• 🔗 *ลิงก์งาน:* https://${JIRA_DOMAIN}/browse/${targetKey}\n\n`;
            } catch (err) {
              responseText += `❌ **เกิดข้อผิดพลาดในการเปลี่ยนสถานะ ${targetKey}:** ${err.message}\n\n`;
            }
          }
          if (process.env.GOOGLE_CHAT_WEBHOOK_URL) {
            await axios.post(process.env.GOOGLE_CHAT_WEBHOOK_URL, { text: responseText }).catch(() => {});
          }
          return;
        }

        // Default: create intent
        const issuesToCreate = Array.isArray(structuredData.issues) && structuredData.issues.length > 0 ? structuredData.issues : [structuredData];
        let responseText = `✅ *สร้างงานสำเร็จเรียบร้อยครับ!* 🎉 (จำนวน ${issuesToCreate.length} งาน)\n\n`;

        for (const issue of issuesToCreate) {
          if (issue.parentKey || issue.parentSummary) {
            let resolvedParentKey = issue.parentKey ? issue.parentKey.trim().toUpperCase() : null;
            let parentType = null;
            try {
              const dbTickets = await query('SELECT key, summary, issuetype FROM tickets');
              if (dbTickets.rows && dbTickets.rows.length > 0) {
                if (!resolvedParentKey && issue.parentSummary) {
                  const targetLower = issue.parentSummary.trim().toLowerCase();
                  const found = dbTickets.rows.find(t => t.summary && t.summary.trim().toLowerCase() === targetLower);
                  if (found) {
                    resolvedParentKey = found.key;
                    parentType = found.issuetype;
                  }
                }
              }
            } catch (dbErr) {
              console.warn('[Webhook Parent Search Local] DB query failed:', dbErr.message);
            }

            if (!resolvedParentKey && issue.parentSummary) {
              const found = await searchJiraIssueBySummary(issue.parentSummary);
              if (found) resolvedParentKey = found.key;
              else issue.parentUnresolved = true;
            }

            if (resolvedParentKey) {
              issue.parentKey = resolvedParentKey;
              if (!parentType) parentType = 'Epic';
              if (parentType === 'Epic') issue.issuetype = 'Task';
              else if (parentType === 'Project') issue.issuetype = 'Epic';
            }
          }

          try {
            const jiraResult = await createJiraIssue(issue);
            if (jiraResult && jiraResult.key) {
              query(
                `INSERT INTO action_sources (ticket_key, source, actor)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (ticket_key) DO UPDATE SET source = EXCLUDED.source, actor = EXCLUDED.actor, created_at = CURRENT_TIMESTAMP`,
                [jiraResult.key, process.env.BOT_NAME || 'taskyapp', senderName]
              ).catch(() => {});
            }

            addActivityLog(senderName, 'Chatbot', 'create', jiraResult.key, `สร้างงานใหม่ผ่าน Chatbot: "${issue.summary}" (${issue.issuetype})`).catch(() => {});

            responseText += `📌 *[${jiraResult.key}] สร้างงานใหม่สำเร็จ*\n` +
                            `• 📝 *หัวข้องาน:* *${issue.summary}*\n` +
                            `• 🏷️ *ประเภท:* *${issue.issuetype}*\n` +
                            `• 👤 *ผู้รับผิดชอบ:* *${issue.assigneeName || 'ยังไม่มีผู้รับผิดชอบ'}*\n`;
            
            if (issue.parentKey) {
              responseText += `• 🔗 *เชื่อมโยงงานแม่:* *${issue.parentKey}*\n`;
            }
            
            if (issue.dueDate) responseText += `• 📅 *กำหนดส่ง:* *${issue.dueDate}*\n`;
            
            responseText += `• ✍️ *ผู้สร้าง:* *${senderName}*\n` +
                            `• 🌐 *ดำเนินการจาก:* *${process.env.BOT_NAME || 'taskyapp'}*\n` +
                            `• 🔗 *ลิงก์งาน:* https://${JIRA_DOMAIN}/browse/${jiraResult.key}\n\n`;
          } catch (createErr) {
            responseText += `❌ **เกิดข้อผิดพลาดในการสร้างงาน "${issue.summary || 'ไม่ระบุชื่อ'}":** ${createErr.message}\n\n`;
          }
        }

        const duration = Date.now() - startTime;
        console.log(`[${duration}ms] Async processing completed successfully.`);
        logWebhookCall('/api/webhook', 200, `Async Success (${duration}ms) - Sender: ${senderName}, Message: "${userMessage ? userMessage.substring(0, 50) : ''}"`).catch(() => {});

        if (process.env.GOOGLE_CHAT_WEBHOOK_URL) {
          await axios.post(process.env.GOOGLE_CHAT_WEBHOOK_URL, { text: responseText }).catch(() => {});
        }
      } catch (err) {
        console.error('Async processing error:', err.message);
      }
    };

    // Trigger async processing in background
    processTaskInBackground();

    // Return instant acknowledgment to Google Chat in < 10ms
    const ackText = `⏳ *รับคำสั่งเรียบร้อยแล้วครับ!* กำลังสร้างงานในระบบ Jira...`;
    return buildChatResponse(ackText);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`[${duration}ms] Error handling webhook:`, errorDetails);

    logWebhookCall('/api/webhook', 500, `Error (${duration}ms): ${error.message}`, errorDetails).catch(() => {});
    return buildChatResponse(`❌ เกิดข้อผิดพลาดในการประมวลผล:\n\`\`\`${errorDetails}\`\`\``);
  }
}

// Also handle POST on root path for compatibility with Google Chat App routing
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active. Use POST to send messages.' });
}
