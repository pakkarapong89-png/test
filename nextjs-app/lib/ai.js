import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Load rules-jira.md from data/ folder
let jiraRules = '';
try {
  const rulesPath = path.join(process.cwd(), 'data', 'rules-jira.md');
  if (fs.existsSync(rulesPath)) {
    jiraRules = fs.readFileSync(rulesPath, 'utf8');
  }
} catch (err) {
  console.error('Error reading rules-jira.md:', err.message);
}

/**
 * Build the system instruction for the LLM
 */
export function buildSystemInstruction() {
  const today = new Date().toISOString().split('T')[0];
  return `You are a helpful project manager assistant. Today's date is ${today}. Your job is to parse unstructured messages from chat and extract details to create, update, or transition JIRA issues.
Analyze the message content (which could be in Thai, English, or mixed) and output a JSON object with the following schema:
{
  "intent": "create | update | transition | chat",
  "isCommandValid": "Boolean. True if we can act on the command (or if it is a simple chat greeting). Set to false only if they are missing critical information that cannot be defaulted.",
  "replyMessage": "A friendly Thai message. For 'chat' intent, write your conversational reply here. For 'create', 'update', or 'transition' intents, you can keep this empty, OR write a friendly confirmation or explanation.",
  "issues": [
    {
      "summary": "For 'create': Extract ONLY the pure, core title of the task. Strip conversational filler words such as 'เพิ่ม', 'สร้าง', 'ช่วยสร้าง', 'ให้หน่อย'. For 'update': Extract the new title/summary ONLY if the user explicitly wants to rename or change the name of the task (e.g. 'แก้ไขชื่อหัวข้อเป็น...'). Otherwise, you MUST set this field to an empty string.",
      "description": "For 'create': Detailed description of the task, containing requirements and context. Do NOT put parent references (like 'ใน...', 'ภายใต้...'), assignee mentions, or due dates (like 'ส่ง...', 'ส่ง พน') into this field. Those must be strictly extracted to parentKey/parentSummary, assigneeName, and dueDate respectively.",
      "priority": "High, Medium, Low, or Lowest based on urgency. Default to 'Medium' if not specified.",
      "issuetype": "Epic or Task. Default to 'Epic' unless it matches the Level 2 Task rules or has a parent specified.",
      "parentKey": "Extract a JIRA ticket key like TES-12 if the user explicitly linked it. Leave empty if they refer to it by name instead.",
      "parentSummary": "If they link a parent by name (e.g. 'ในงาน [parent]', 'ภายใต้ [parent]', 'ใน [parent]', 'ของ [parent]'), extract the name of the parent task here. Otherwise leave empty.",
      "targetKey": "For 'update' or 'transition': Extract the key of the issue being modified. Otherwise leave empty.",
      "targetSummary": "For 'update' or 'transition': If the user specifies the target issue by name/summary, extract that name here. Otherwise leave empty.",
      "targetStatus": "For 'transition': Extract the target status name in English (e.g., 'Done', 'In Progress', 'To Do'). Otherwise leave empty.",
      "dueDate": "If a deadline or due date is mentioned, calculate the exact date in 'YYYY-MM-DD' based on today's date (${today}). Buddhist Era year: subtract 543 from BE year to get AD year (e.g. 69 BE -> 2569 BE -> 2026 AD). Otherwise leave empty.",
      "assigneeName": "The name or nickname of the person to be assigned. Do NOT extract relative dates, deadlines, or time-slangs (e.g. 'พน', 'พรุ่งนี้', 'วันนี้', 'มะรืนนี้', 'ส่ง พน', 'ส่ง พรุ่งนี้') here; those must go into 'dueDate'. Leave empty if no actual person name is specified."
    }
  ]
}

CRITICAL RULES FOR BATCH PROCESSING:
- If the user commands actions on multiple targets in a single message, split them and output multiple issue objects inside the "issues" array.

CRITICAL RULES FOR ASSIGNEE EXTRACTION:
- Do NOT extract date/time indicators or relative date words (such as 'พน', 'พรุ่งนี้', 'มะรืนนี้', 'วันนี้', 'ส่ง พน', 'ส่ง พรุ่งนี้') as the "assigneeName". These words belong strictly to the "dueDate" extraction.
- The "assigneeName" must only be a person's name or nickname (e.g., 'แป๊ก', 'ตะวัน', 'ภัครพงษ์'). If no person name is specified, leave "assigneeName" empty.

CRITICAL DATE PARSING RULES (BUDDHIST ERA YEAR CONVERSION):
- In Thai, users often write years in Buddhist Era (BE), either 4 digits (e.g., "2569") or 2 digits (e.g., "69").
- Jira Cloud strictly requires Christian Era (AD) dates. Subtract 543 from BE year to get AD (e.g., 2569 BE - 543 = 2026 AD).
- Therefore, "10/06/69" must be parsed as "2026-06-10".

CRITICAL RULES FOR INTENT:
- 'chat': Just talking, greeting, or asking general questions.
- 'update': Edit, change, assign, or update fields of existing tickets.
- 'transition': Change the status/workflow of tickets.
- 'create': Create new Epic or Task issues.

CRITICAL MAPPING CONSTRAINTS FOR ISSUETYPE:
1. Map "issuetype" to "Task" if user uses Level 2 keywords ("job", "จ๊อบ", "งานย่อย") OR links to a parent Epic/Task (e.g. "ใน [parent]", "ในงาน [parent]").
2. Default to "Epic" if no Level 2 keywords and no parent specified.
3. Even if the user says "task", default to "Epic" unless a parent is specified.

EXAMPLES FOR PARENT AND ISSUETYPE PARSING:
Example 1:
Input: "เพิ่ม ออกแบบ ux ui ใน tasky ส่งอีก 1 เดือน"
Output:
{
  "intent": "create",
  "isCommandValid": true,
  "replyMessage": "",
  "issues": [
    {
      "summary": "ออกแบบ ux ui",
      "description": "",
      "priority": "Medium",
      "issuetype": "Task",
      "parentKey": "",
      "parentSummary": "tasky",
      "targetKey": "",
      "targetSummary": "",
      "targetStatus": "",
      "dueDate": "2026-07-23",
      "assigneeName": ""
    }
  ]
}

Example 2:
Input: "สร้าง job เขียน api ในงาน TES-14"
Output:
{
  "intent": "create",
  "isCommandValid": true,
  "replyMessage": "",
  "issues": [
    {
      "summary": "เขียน api",
      "description": "",
      "priority": "Medium",
      "issuetype": "Task",
      "parentKey": "TES-14",
      "parentSummary": "",
      "targetKey": "",
      "targetSummary": "",
      "targetStatus": "",
      "dueDate": "",
      "assigneeName": ""
    }
  ]
}

Here are specific rules and terminologies defined for our project. You MUST respect and follow them at all times:
${jiraRules}

Make sure your response contains ONLY the valid JSON block without any markdown formatting wrappers.`;
}

/**
 * Parse unstructured message using Gemini API
 */
export async function parseMessageWithGemini(messageText, senderName) {
  const apiKey = process.env.GEMINI_API_KEY;
  let modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  if (!modelName || modelName.includes('1.5')) {
    modelName = 'gemini-3.5-flash';
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const generationConfig = {
    responseMimeType: 'application/json',
    temperature: 0.0,
    maxOutputTokens: 250,
  };
  if (modelName.includes('3.5') || modelName.includes('thinking') || modelName.includes('reasoning')) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const payload = {
    contents: [{ role: 'user', parts: [{ text: `Sender: ${senderName}\nMessage: ${messageText}` }] }],
    systemInstruction: { parts: [{ text: buildSystemInstruction() }] },
    generationConfig,
  };

  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 5000,
  });
  const jsonText = response.data.candidates[0].content.parts[0].text;
  return JSON.parse(jsonText.trim());
}

/**
 * Parse unstructured message using OpenAI API
 */
export async function parseMessageWithOpenAI(messageText, senderName) {
  const apiKey = process.env.OPENAI_API_KEY;
  const url = `https://api.openai.com/v1/chat/completions`;

  const payload = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: buildSystemInstruction() },
      { role: 'user', content: `Sender: ${senderName}\nMessage: ${messageText}` },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  };

  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    timeout: 3000,
  });

  return JSON.parse(response.data.choices[0].message.content.trim());
}

/**
 * Parse unstructured message using Groq API
 */
export async function parseMessageWithGroq(messageText, senderName) {
  const apiKey = process.env.GROQ_API_KEY;
  const url = `https://api.groq.com/openai/v1/chat/completions`;

  const payload = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: buildSystemInstruction() },
      { role: 'user', content: `Sender: ${senderName}\nMessage: ${messageText}` },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  };

  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    timeout: 3000,
  });

  return JSON.parse(response.data.choices[0].message.content.trim());
}

/**
 * Parse a message using the configured LLM provider, with automatic fallback
 */
export async function parseMessageWithLLM(messageText, senderName) {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

  const tryParse = async (p) => {
    if (p === 'openai') return await parseMessageWithOpenAI(messageText, senderName);
    if (p === 'groq') return await parseMessageWithGroq(messageText, senderName);
    return await parseMessageWithGemini(messageText, senderName);
  };

  try {
    return await tryParse(provider);
  } catch (primaryError) {
    console.warn(`⚠️ Primary provider (${provider}) failed: ${primaryError.message}. Trying fallback...`);
    const fallbackProvider = provider === 'groq' ? 'gemini' : 'groq';
    try {
      return await tryParse(fallbackProvider);
    } catch (fallbackError) {
      throw new Error(`AI Providers Failed. Primary: ${primaryError.message}. Fallback: ${fallbackError.message}`);
    }
  }
}
