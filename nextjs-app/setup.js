const readline = require('readline');
const crypto = require('crypto');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function openUrl(url) {
  const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${start} ${url}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to parse existing environment variables
function loadExistingEnv() {
  const envVars = {};
  const paths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '.env.local')
  ];

  for (const envPath of paths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          envVars[key] = val;
        }
      } catch (err) {}
    }
  }
  return envVars;
}

const existingEnv = loadExistingEnv();

function getMaskedDisplay(val) {
  if (!val) return '';
  if (val.length <= 25) return val;
  return `${val.substring(0, 8)}...${val.substring(val.length - 6)}`;
}

function ask(question, envKey, defaultValue = '') {
  return new Promise((resolve) => {
    const activeDefault = existingEnv[envKey] || defaultValue;
    let displayDefault = activeDefault;
    if (activeDefault && activeDefault.length > 25) {
      displayDefault = getMaskedDisplay(activeDefault);
    }

    const formattedQuestion = displayDefault 
      ? `   👉 ${question}\n      [กด Enter เพื่อใช้ค่าเดิม: ${displayDefault}]: ` 
      : `   👉 ${question}: `;

    rl.question(formattedQuestion, (answer) => {
      resolve(answer.trim() || activeDefault);
    });
  });
}

function generateSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

async function main() {
  console.log('\n=============================================================');
  console.log('       ⚙️  โปรแกรมตั้งค่าระบบ taskyapp Bot & Dashboard             ');
  console.log('=============================================================');
  console.log(' * สคริปต์นี้จะช่วยตั้งค่าและเตรียมฐานข้อมูลของคุณให้อัตโนมัติ');
  console.log(' * หากมีข้อมูลเดิมอยู่แล้ว สามารถกด [Enter] เพื่อผ่านไปข้อถัดไปได้เลย');
  console.log('=============================================================\n');

  // ---------------------------------------------------------
  // ส่วนที่ 1: ตั้งค่าฐานข้อมูล
  // ---------------------------------------------------------
  console.log('┌───────────────────────────────────────────────────────────┐');
  console.log('│  1. ตั้งค่าฐานข้อมูล Supabase (Database Configuration)     │');
  console.log('└───────────────────────────────────────────────────────────┘');
  console.log('   🔄 ระบบกำลังเปิดหน้าเว็บ Supabase Dashboard ให้โดยอัตโนมัติ...');
  console.log('   📌 วิธีเอาค่า:');
  console.log('     1. กดสร้างโปรเจกต์ใหม่ หรือคลิกเข้าโปรเจกต์เดิมของคุณ');
  console.log('     2. ไปที่เมนู Settings (รูปฟันเฟืองซ้ายล่าง) -> เลือกหัวข้อ Database');
  console.log('     3. เลื่อนลงมาหาหัวข้อ Connection string -> เลือกแท็บ URI');
  console.log('     4. คัดลอกลิงก์ที่ขึ้นต้นด้วย postgres://... แล้วนำมาวางด้านล่าง');
  console.log('     *(อย่าลืมแทนที่ [YOUR-PASSWORD] ด้วยรหัสผ่านจริงของคุณนะครับ)*\n');
  openUrl('https://supabase.com/dashboard/projects');
  
  const databaseUrl = await ask('ลิงก์ Supabase URI (DATABASE_URL)', 'DATABASE_URL');
  if (!databaseUrl) {
    console.log('\n❌ ข้อผิดพลาด: จำเป็นต้องกรอก DATABASE_URL เพื่อเชื่อมต่อระบบฐานข้อมูล\n');
    process.exit(1);
  }

  // ทดสอบการเชื่อมต่อ
  console.log('\n   🔄 กำลังทดสอบเชื่อมต่อฐานข้อมูล Supabase...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('   ✅ เชื่อมต่อฐานข้อมูลสำเร็จ!');
    console.log('   🔄 กำลังสร้างตารางเก็บข้อมูลระบบ (ถ้ายังไม่มี)...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        nickname VARCHAR(100) UNIQUE NOT NULL,
        jira_display_name VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        webhook_url TEXT
      );
      
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        username VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        ticket_key VARCHAR(100),
        details TEXT
      );
      
      CREATE TABLE IF NOT EXISTS ticket_status_cache (
        ticket_key VARCHAR(100) PRIMARY KEY,
        status VARCHAR(100) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS user_spaces_map (
        nickname VARCHAR(100) PRIMARY KEY,
        space_name TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt VARCHAR(200) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(100) NOT NULL DEFAULT 'Pending',
        is_approved BOOLEAN NOT NULL DEFAULT FALSE,
        jira_display_name VARCHAR(255),
        jira_account_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS tickets (
        key VARCHAR(100) PRIMARY KEY,
        summary VARCHAR(255) NOT NULL,
        status VARCHAR(100) NOT NULL,
        issuetype VARCHAR(100) NOT NULL,
        priority VARCHAR(100) NOT NULL,
        assignee VARCHAR(255),
        reporter VARCHAR(255),
        created TIMESTAMP WITH TIME ZONE,
        duedate DATE,
        resolved TIMESTAMP WITH TIME ZONE,
        parent VARCHAR(100),
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS action_sources (
        ticket_key VARCHAR(100) PRIMARY KEY,
        source VARCHAR(100) NOT NULL,
        actor VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ ตรวจเช็คและอัปเดตตารางข้อมูลเรียบร้อย!');

    // ตรวจสอบ Admin
    const checkUsers = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(checkUsers.rows[0].count) === 0) {
      console.log('\n   🔒 ตั้งค่าบัญชีผู้ดูแลระบบหลัก (Admin Console)');
      const adminUser = await ask('ชื่อเข้าใช้งานแอดมิน (Username)', 'ADMIN_USER', 'admin');
      const adminPass = await ask('รหัสผ่านเข้าใช้งาน (Password)', 'ADMIN_PASS', 'admin123');
      
      const { hash, salt } = hashPassword(adminPass);
      await client.query(
        `INSERT INTO users (username, password_hash, salt, name, role, is_approved, jira_display_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [adminUser, hash, salt, 'ผู้ดูแลระบบ', 'Admin', true, 'ผู้ดูแลระบบ']
      );
      console.log(`   ✅ ลงทะเบียนแอดมินคนแรกสำเร็จ! (ชื่อเข้าใช้: ${adminUser})`);
    }

    await client.end();
  } catch (err) {
    console.error('   ❌ ไม่สามารถเชื่อมต่อ Supabase ได้:', err.message);
    console.log('   ⚠️ ระบบจะเซฟคีย์ใส่ไฟล์ .env ให้ แต่คุณต้องเข้าไปเช็คการเชื่อมต่อภายหลัง');
    try { await client.end(); } catch (e) {}
  }

  // ---------------------------------------------------------
  // ส่วนที่ 2: ตั้งค่าบัญชี Jira
  // ---------------------------------------------------------
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  2. ตั้งค่าการเชื่อมต่อกับ Jira Cloud                       │');
  console.log('└───────────────────────────────────────────────────────────┘');
  
  const jiraDomain = await ask('โดเมนหลัก Jira ของบริษัท (เช่น mycompany.atlassian.net)', 'JIRA_DOMAIN');
  const jiraEmail = await ask('อีเมลของแอดมินที่ผูกคีย์สิทธิ์', 'JIRA_EMAIL');
  
  console.log('\n   🔄 ระบบกำลังเปิดหน้าเว็บ Atlassian Security ให้โดยอัตโนมัติ...');
  console.log('   📌 วิธีเอาค่า:');
  console.log('     1. คลิกปุ่ม "Create API token"');
  console.log('     2. ตั้งชื่อป้ายกำกับ (เช่น Jira-Bot) แล้วกด Create');
  console.log('     3. กด Copy รหัสผ่าน Token ที่ขึ้นต้นด้วย ATATT... มาวางด้านล่าง');
  console.log('     *(คำเตือน: รหัสจะแสดงแค่ครั้งเดียวเท่านั้น ควรจดบันทึกไว้ด้วยครับ)*\n');
  openUrl('https://id.atlassian.com/manage-profile/security/api-tokens');
  
  const jiraApiToken = await ask('รหัส Jira API Token ของคุณ', 'JIRA_API_TOKEN');
  const jiraProjectKey = await ask('คีย์โครงการ Jira ย่อ (เช่น DEV, TES)', 'JIRA_PROJECT_KEY');

  // ---------------------------------------------------------
  // ส่วนที่ 3: ตั้งค่าสัญญาณ Google Chat
  // ---------------------------------------------------------
  console.log('┌───────────────────────────────────────────────────────────┐');
  console.log('│  3. ตั้งค่าการส่งสัญญาณแจ้งเตือนเข้า Google Chat            │');
  console.log('└───────────────────────────────────────────────────────────┘');
  console.log('   📌 วิธีเอาค่า:');
  console.log('     1. เปิด Google Chat และเข้าไปในห้องแชท (Space) ของทีม');
  console.log('     2. คลิกที่ชื่อห้องแชทด้านบนสุด -> เลือก Apps & integrations -> เลือก Webhooks');
  console.log('     3. กด Add webhook ตั้งชื่อตามต้องการ แล้วกด Save');
  console.log('     4. คัดลอกลิงก์ที่ขึ้นต้นด้วย https://chat.googleapis.com/... มาวางด้านล่าง\n');
  
  const chatWebhook = await ask('ลิงก์ Google Chat Webhook URL (ลิงก์ส่งสัญญาณเข้าห้องกลุ่ม)', 'GOOGLE_CHAT_WEBHOOK_URL');

  // ---------------------------------------------------------
  // ส่วนที่ 4: ตั้งค่า AI (Gemini)
  // ---------------------------------------------------------
  console.log('┌───────────────────────────────────────────────────────────┐');
  console.log('│  4. ตั้งค่าสมองกลปัญญาประดิษฐ์ AI (Google Gemini)           │');
  console.log('└───────────────────────────────────────────────────────────┘');
  console.log('   🔄 ระบบกำลังเปิดหน้าเว็บ Google AI Studio ให้โดยอัตโนมัติ...');
  console.log('   📌 วิธีเอาค่า:');
  console.log('     1. คลิกปุ่ม "Get API key" (ไอคอนรูปกุญแจด้านซ้ายบน)');
  console.log('     2. คลิกปุ่ม "Create API key" สีน้ำเงิน');
  console.log('     3. เลือกโปรเจกต์ หรือสร้างในโปรเจกต์ใหม่ แล้วกดสร้างคีย์');
  console.log('     4. คัดลอกรหัส API Key ที่ขึ้นต้นด้วย AQ. หรือ AL. มาวางด้านล่าง\n');
  openUrl('https://aistudio.google.com/');
  
  const geminiKey = await ask('รหัส Google Gemini API Key', 'GEMINI_API_KEY');
  const geminiModel = await ask('รหัสรุ่นโมเดลหลัก (แนะนำ: gemini-3.5-flash)', 'GEMINI_MODEL', 'gemini-3.5-flash');
  const botName = await ask('ชื่อแสดงผลของบอทใน Google Chat (เช่น taskyapp)', 'BOT_NAME', 'taskyapp');

  // ---------------------------------------------------------
  // ส่วนที่ 5: บันทึกการตั้งค่า
  // ---------------------------------------------------------
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  5. บันทึกข้อมูลและสร้างไฟล์ตั้งค่าของโครงการ               │');
  console.log('└───────────────────────────────────────────────────────────┘');
  
  const sessionSecret = existingEnv['SESSION_SECRET'] || generateSecret(32);
  const cronSecret = existingEnv['CRON_SECRET'] || generateSecret(16);

  const envContent = `# ----------------------------------------------------
# ไฟล์กำหนดค่าระบบอัตโนมัติ (สร้างขึ้นโดยสคริปต์ setup.js)
# ----------------------------------------------------

DATABASE_URL="${databaseUrl}"

JIRA_DOMAIN="${jiraDomain}"
JIRA_EMAIL="${jiraEmail}"
JIRA_API_TOKEN="${jiraApiToken}"
JIRA_PROJECT_KEY="${jiraProjectKey}"

GOOGLE_CHAT_WEBHOOK_URL="${chatWebhook}"

LLM_PROVIDER="gemini"
GEMINI_API_KEY="${geminiKey}"
GEMINI_MODEL="${geminiModel}"
BOT_NAME="${botName}"

SESSION_SECRET="${sessionSecret}"
CRON_SECRET="${cronSecret}"
`;

  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, envContent, 'utf-8');
  
  console.log('   ✅ สุ่มคีย์ความปลอดภัย SESSION_SECRET และ CRON_SECRET เรียบร้อย!');
  console.log(`   ✅ บันทึกไฟล์ตั้งค่าเสร็จสิ้นที่: ${envPath}`);

  console.log('\n🎉 =============================================================');
  console.log('🎉         ติดตั้งระบบและเขียนค่าตัวแปรทั้งหมดเรียบร้อยแล้ว!         ');
  console.log('=============================================================');
  console.log(' คำแนะนำถัดไปสำหรับการนำไปตั้งค่าจริง:');
  console.log('-------------------------------------------------------------');
  console.log(' 1. รันระบบจำลองในเครื่องพิมพ์: npm run dev');
  console.log(' 2. ในการนำไปเปิดใช้งานบนระบบจริง (Vercel Production) ให้คัดลอก');
  console.log('    ตัวแปรด้านล่างนี้ไปใส่ในช่อง Environment Variables:');
  console.log('-------------------------------------------------------------');
  console.log(` DATABASE_URL            = ${databaseUrl}`);
  console.log(` JIRA_DOMAIN             = ${jiraDomain}`);
  console.log(` JIRA_EMAIL              = ${jiraEmail}`);
  console.log(` JIRA_API_TOKEN          = ${jiraApiToken}`);
  console.log(` JIRA_PROJECT_KEY        = ${jiraProjectKey}`);
  console.log(` GOOGLE_CHAT_WEBHOOK_URL = ${chatWebhook}`);
  console.log(` LLM_PROVIDER            = gemini`);
  console.log(` GEMINI_API_KEY          = ${geminiKey}`);
  console.log(` GEMINI_MODEL            = ${geminiModel}`);
  console.log(` BOT_NAME                = ${botName}`);
  console.log(` SESSION_SECRET          = ${sessionSecret}`);
  console.log(` CRON_SECRET             = ${cronSecret}`);
  console.log('=============================================================\n');
  
  rl.close();
}

main().catch(err => {
  console.error('❌ เกิดข้อผิดพลาดร้ายแรง:', err);
  rl.close();
});
