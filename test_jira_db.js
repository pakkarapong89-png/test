const { Client } = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Manually parse env files, preferring .env.local
const envLocalPath = path.join(__dirname, '.env.local');
const envDefaultPath = path.join(__dirname, '.env');
const envPath = fs.existsSync(envLocalPath) ? envLocalPath : envDefaultPath;
console.log('Loading env from:', envPath);
const envContent = fs.readFileSync(envPath, 'utf8');
const processEnv = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) return;
  const key = trimmed.substring(0, eqIdx).trim();
  let val = trimmed.substring(eqIdx + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
  processEnv[key] = val;
});

const DATABASE_URL = processEnv.DATABASE_URL;
const JIRA_DOMAIN = processEnv.JIRA_DOMAIN;
const JIRA_EMAIL = processEnv.JIRA_EMAIL;
const JIRA_API_TOKEN = processEnv.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = processEnv.JIRA_PROJECT_KEY;

async function testAll() {
  console.log('--- 📋 TESTING CONFIGURATION ---');
  console.log('Jira Domain:', JIRA_DOMAIN);
  console.log('Jira Email:', JIRA_EMAIL);
  console.log('Jira Project Key:', JIRA_PROJECT_KEY);
  
  // 1. Test Supabase Database Connection
  console.log('\n--- 1. Supabase Connection Test ---');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Supabase connected successfully!');
    const res = await client.query('SELECT COUNT(*) FROM tickets');
    console.log('Current ticket count in DB:', res.rows[0].count);
    await client.end();
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
  }
  
  // 2. Test Jira API Connection
  console.log('\n--- 2. Jira API Test ---');
  const url = `https://${JIRA_DOMAIN}/rest/api/3/search/jql`;
  const credentials = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  
  const payload = {
    jql: `project = ${JIRA_PROJECT_KEY} AND summary !~ "__ACTIVITY_LOGS__" ORDER BY created DESC`,
    maxResults: 100,
    fields: ['summary', 'status', 'issuetype', 'assignee', 'reporter', 'priority', 'created', 'duedate', 'parent', 'description'],
  };
  
  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    console.log('✅ Jira connected successfully!');
    const issues = response.data.issues || [];
    console.log(`Fetched ${issues.length} issues from Jira.`);
    issues.forEach(iss => {
      console.log(`- [${iss.key}] ${iss.fields.summary} (Status: ${iss.fields.status.name})`);
    });
  } catch (err) {
    console.error('❌ Jira API call failed!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data));
    } else {
      console.error('Message:', err.message);
    }
  }
}

testAll();
