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
  return `You are a project manager assistant. Today is ${today}. Parse the message into JSON:
{
  "intent": "create | update | transition | chat",
  "isCommandValid": true,
  "replyMessage": "Thai greeting if intent==chat",
  "issues": [
    {
      "summary": "Core title only (strip filler like เพิ่ม, สร้าง). For update: empty unless renaming.",
      "description": "",
      "priority": "High | Medium | Low",
      "issuetype": "Task if 'job'/'จ๊อบ'/'งานย่อย' or parent specified; otherwise Epic",
      "parentKey": "Jira key like TES-12 if explicitly provided",
      "parentSummary": "Parent issue name if linked (e.g. ใน..., ในงาน...)",
      "targetKey": "Issue key for update/transition",
      "targetSummary": "Issue name for update/transition",
      "targetStatus": "Target status in English (Done, In Progress, To Do)",
      "dueDate": "YYYY-MM-DD. Convert BE year to AD (BE - 543)",
      "assigneeName": "Person name/nickname only. Do NOT put dates (like พน, พรุ่งนี้) here."
    }
  ]
}
RULES:
1. Split multiple actions into multiple issue objects in "issues" array.
2. Buddhist Era year (BE) to AD: subtract 543 (e.g., 69 BE -> 2026 AD).
3. Do NOT put relative date words (พน, พรุ่งนี้) as assigneeName.
4. Output JSON ONLY without markdown wrappers.`;
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
