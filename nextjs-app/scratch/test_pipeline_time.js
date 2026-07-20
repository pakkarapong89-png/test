import 'dotenv/config';
import { parseMessageWithLLM } from '../lib/ai.js';
import { createJiraIssue } from '../lib/jira.js';
import { query } from '../lib/db.js';

async function test() {
  const t0 = Date.now();
  console.log('1. Starting LLM parse...');
  const structuredData = await parseMessageWithLLM('เพิ่ม จัสตินบีเบอร์18 ใน วัดซับแมน', 'Pakkarapong GULSUWAN');
  console.log(`   LLM finished in ${Date.now() - t0} ms`);

  const issue = structuredData.issues[0];
  const t1 = Date.now();
  const dbFound = await query('SELECT "key" FROM tickets WHERE summary ILIKE $1 ORDER BY "key" DESC LIMIT 1', ['%' + issue.parentSummary + '%']);
  if (dbFound.rows.length > 0) {
    issue.parentKey = dbFound.rows[0].key;
  }
  console.log(`2. DB Parent lookup finished in ${Date.now() - t1} ms (Parent: ${issue.parentKey})`);

  const t2 = Date.now();
  const jiraRes = await createJiraIssue(issue);
  console.log(`3. Jira issue creation finished in ${Date.now() - t2} ms (Key: ${jiraRes.key})`);
  console.log(`⚡ TOTAL END-TO-END TIME: ${Date.now() - t0} ms`);
}

test().catch(console.error);
