# คู่มือการติดตั้งและตั้งค่าระบบ Bot Google Chat + Jira + Dashboard

เอกสารนี้เป็นคู่มือฉบับละเอียดสำหรับติดตั้งระบบ bot ตั้งแต่เริ่มต้นจนใช้งานจริง ครอบคลุมการหา API key และค่าต่าง ๆ, การใส่ค่าในไฟล์ `.env` และ Vercel, การ push code ขึ้น GitHub, การ deploy, การตั้ง Google Chat App, การตั้ง Jira webhook และการทดสอบระบบหลัง deploy

ระบบนี้ประกอบด้วย 2 ส่วนหลัก

- Google Chat Bot: ให้ผู้ใช้พิมพ์คำสั่งภาษาพูด เช่น สร้างงาน แก้งาน ปิดงาน หรือดูงานค้าง แล้วระบบส่งคำสั่งไปทำงานบน Jira
- Web Dashboard: ใช้ดูภาพรวมงาน Jira, ตารางงาน, activity logs, team members, admin panel และรายละเอียด ticket

> ข้อควรระวังสำคัญ: ห้ามส่งต่อหรือ commit ค่า API key, token, `.env`, `.env.local`, database URL หรือ webhook URL ลง GitHub เด็ดขาด เพราะค่าเหล่านี้ใช้เข้าถึงระบบจริงได้

---

## สารบัญ

1. ภาพรวมสิ่งที่ต้องเตรียม
2. ตาราง Environment Variables ทั้งหมด
3. เตรียม Supabase และหา `DATABASE_URL`
4. เตรียม Jira Cloud และหา `JIRA_DOMAIN`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`
5. เตรียม Google Gemini API Key
6. เตรียม Google Chat Incoming Webhook สำหรับส่งข้อความเข้าห้อง
7. เตรียม Google Chat App สำหรับรับคำสั่งจากผู้ใช้
8. เตรียม Jira Webhook สำหรับ sync ข้อมูลกลับเข้า dashboard
9. สร้างไฟล์ `.env` สำหรับเครื่อง local
10. ทดสอบระบบบนเครื่อง local
11. เตรียม Git และ push code ขึ้น GitHub
12. Deploy ขึ้น Vercel
13. ตั้ง Environment Variables บน Vercel
14. ตั้ง URL หลัง deploy
15. Sync tickets ครั้งแรก
16. ตั้งค่า cron และรายงานประจำวัน
17. ทดสอบระบบหลัง deploy
18. คำสั่ง bot ที่ใช้บ่อย
19. การแก้ปัญหาที่พบบ่อย
20. Checklist ก่อนส่งมอบงาน

---

## 1. ภาพรวมสิ่งที่ต้องเตรียม

| ลำดับ | บริการ | ค่าที่ต้องได้ | ใช้ทำอะไร |
| --- | --- | --- | --- |
| 1 | Supabase/Postgres | `DATABASE_URL` | เก็บ users, tickets cache, activity logs, team members |
| 2 | Jira Cloud | `JIRA_DOMAIN` | ระบุ Jira site เช่น `company.atlassian.net` |
| 3 | Jira Cloud | `JIRA_EMAIL` | อีเมล Atlassian account ที่ใช้คู่กับ token |
| 4 | Jira Cloud | `JIRA_API_TOKEN` | ให้ระบบเรียก Jira REST API |
| 5 | Jira Cloud | `JIRA_PROJECT_KEY` | ระบุ project เช่น `TES`, `DEV`, `KAN` |
| 6 | Google AI Studio | `GEMINI_API_KEY` | ให้ AI ช่วย parse คำสั่งภาษาไทย/อังกฤษ |
| 7 | Google Chat Space | `GOOGLE_CHAT_WEBHOOK_URL` | ส่งแจ้งเตือนและ daily summary เข้าห้อง Chat |
| 8 | Google Cloud Console | Chat App endpoint | ให้ผู้ใช้ mention bot แล้วเรียก `/api/webhook` |
| 9 | Vercel | Project deployment | host web, API routes และ cron |
| 10 | GitHub | Repository | เก็บ code และเชื่อม auto deploy |

ไฟล์สำคัญในโปรเจกต์นี้

| ไฟล์ | หน้าที่ |
| --- | --- |
| `setup.js` | wizard ช่วยกรอกค่า config และสร้าง `.env` |
| `lib/db.js` | เชื่อม database และสร้างตารางอัตโนมัติ |
| `lib/jira.js` | ติดต่อ Jira API |
| `lib/ai.js` | ติดต่อ Gemini/OpenAI/Groq เพื่อ parse ข้อความ |
| `app/api/webhook/route.js` | endpoint รับข้อความจาก Google Chat App |
| `app/api/jira/webhook/route.js` | endpoint รับ event จาก Jira |
| `app/api/cron/sync-tickets/route.js` | sync tickets จาก Jira เข้า database |
| `app/api/cron/daily-summary/route.js` | ส่งรายงานประจำวันเข้า Google Chat |
| `app/api/health/route.js` | ตรวจสถานะ env, database, Jira, webhook |
| `vercel.json` | ตั้ง cron บน Vercel |

---

## 2. ตาราง Environment Variables ทั้งหมด

| ชื่อตัวแปร | ตัวอย่างค่า | จำเป็นไหม | หมายเหตุ |
| --- | --- | --- | --- |
| `DATABASE_URL` | `postgres://...` | จำเป็น | แนะนำใช้ Supabase pooler transaction mode สำหรับ Vercel |
| `JIRA_DOMAIN` | `company.atlassian.net` | จำเป็น | ไม่ต้องใส่ `https://` |
| `JIRA_EMAIL` | `admin@company.com` | จำเป็น | ต้องเป็น account ที่สร้าง Jira API token |
| `JIRA_API_TOKEN` | `ATATT...` | จำเป็น | copy ได้ครั้งเดียว ควรเก็บใน password manager |
| `JIRA_PROJECT_KEY` | `TES` | จำเป็น | ตัวหน้าเลข ticket เช่น `TES-14` |
| `GOOGLE_CHAT_WEBHOOK_URL` | `https://chat.googleapis.com/...` | จำเป็น | ใช้ส่งข้อความออกไปยังห้อง Chat |
| `LLM_PROVIDER` | `gemini` | แนะนำ | ระบบนี้ตั้งใจใช้ Gemini เป็นหลัก |
| `GEMINI_API_KEY` | `AIza...` | จำเป็นถ้าใช้ Gemini | สร้างจาก Google AI Studio |
| `GEMINI_MODEL` | `gemini-3.5-flash` | แนะนำ | ถ้าไม่ใส่ ระบบมีค่า default ใน code |
| `BOT_NAME` | `sekloso` หรือ `taskyapp` | แนะนำ | ชื่อที่ใช้ในข้อความคู่มือและ response |
| `SESSION_SECRET` | random hex 64 ตัว | จำเป็น | ใช้เซ็น session dashboard |
| `CRON_SECRET` | random hex 32 ตัว | จำเป็น | ใช้ป้องกัน endpoint sync/cron |

ตัวอย่างไฟล์ `.env`

```env
DATABASE_URL="postgres://postgres.xxxxx:PASSWORD@aws-region.pooler.supabase.com:6543/postgres"

JIRA_DOMAIN="company.atlassian.net"
JIRA_EMAIL="admin@company.com"
JIRA_API_TOKEN="ใส่-token-จาก-Atlassian"
JIRA_PROJECT_KEY="TES"

GOOGLE_CHAT_WEBHOOK_URL="https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=..."

LLM_PROVIDER="gemini"
GEMINI_API_KEY="ใส่-key-จาก-Google-AI-Studio"
GEMINI_MODEL="gemini-3.5-flash"
BOT_NAME="sekloso"

SESSION_SECRET="สุ่มค่าใหม่"
CRON_SECRET="สุ่มค่าใหม่"
```

---

## 3. เตรียม Supabase และหา `DATABASE_URL`

Supabase คือฐานข้อมูล PostgreSQL บน cloud ที่ระบบนี้ใช้เก็บข้อมูลสำคัญ เช่น ticket cache, user, role, activity log, team member และข้อมูลช่วยจับว่า action มาจาก bot, Jira หรือ dashboard

### 3.1 สร้าง Supabase project

1. เข้าเว็บไซต์ `https://supabase.com`
2. Login หรือสมัครบัญชีใหม่
3. กด `New project`
4. เลือก organization
5. ตั้งชื่อ project เช่น `jira-bot-production`
6. ตั้ง Database Password ให้แข็งแรง
7. เลือก region ใกล้ผู้ใช้ เช่น Singapore ถ้าทีมอยู่ไทย
8. กด Create project แล้วรอจน project พร้อมใช้งาน

สิ่งที่ต้องจดไว้ทันที

- Database password
- Project ref หรือชื่อ project
- Region

### 3.2 หา connection string

1. เข้า Supabase project dashboard
2. กดปุ่ม `Connect`
3. เลือก Postgres connection string
4. สำหรับ Vercel/serverless แนะนำใช้ `Transaction pooler` เพราะเหมาะกับ request สั้น ๆ และ connection จำนวนมาก
5. Copy URI ที่ขึ้นต้นด้วย `postgres://` หรือ `postgresql://`
6. แทน `[YOUR-PASSWORD]` ด้วย database password ที่ตั้งไว้

ตัวอย่าง

```text
postgres://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

หลังแทน password แล้วจะเป็น

```env
DATABASE_URL="postgres://postgres.xxxxx:MyStrongPassword@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

### 3.3 เรื่อง SSL และ port

โปรเจกต์นี้ใช้ `pg` และตั้ง SSL ใน `lib/db.js` แล้ว ดังนั้นไม่ต้องเพิ่ม SSL certificate เอง

พอร์ตที่พบบ่อย

- `5432`: direct connection หรือ session pooler
- `6543`: transaction pooler เหมาะกับ serverless เช่น Vercel

### 3.4 ตารางที่จะถูกสร้างอัตโนมัติ

เมื่อระบบเริ่มทำงานหรือรัน `npm run setup` ระบบจะสร้างตารางเหล่านี้ถ้ายังไม่มี

- `team_members`
- `activity_logs`
- `ticket_status_cache`
- `user_spaces_map`
- `users`
- `tickets`
- `action_sources`

ไม่จำเป็นต้องสร้างตารางเองใน Supabase SQL editor ยกเว้นต้องการตรวจสอบหรือ debug

---

## 4. เตรียม Jira Cloud และหา `JIRA_*`

ระบบนี้ใช้ Jira API เพื่อดึง ticket, สร้าง issue, แก้ issue, assign user, เปลี่ยน status และอ่าน changelog

### 4.1 หา `JIRA_DOMAIN`

1. เปิด Jira ของบริษัท
2. ดู URL เช่น

```text
https://company.atlassian.net/jira/software/projects/TES/boards/1
```

ค่าที่ต้องใช้คือเฉพาะ domain

```env
JIRA_DOMAIN="company.atlassian.net"
```

ห้ามใส่ `https://` และห้ามใส่ path ต่อท้าย

### 4.2 หา `JIRA_PROJECT_KEY`

วิธีที่ 1: ดูจาก ticket key

ถ้า ticket ใน project มีชื่อ `TES-14` ค่า project key คือ `TES`

```env
JIRA_PROJECT_KEY="TES"
```

วิธีที่ 2: ดูจาก Project settings

1. เปิด Jira project
2. ไปที่ `Project settings`
3. เข้า `Details`
4. ดูช่อง `Key`

### 4.3 เตรียม account สำหรับ `JIRA_EMAIL`

ใช้ email ของ Atlassian account ที่จะสร้าง API token เช่น

```env
JIRA_EMAIL="jira.bot@company.com"
```

แนะนำให้ใช้ service account แยก เช่น `jira.bot@company.com` แทน account ส่วนตัว ถ้านโยบายบริษัทอนุญาต

สิทธิ์ที่ account ควรมีใน Jira project

- Browse project
- Create issue
- Edit issue
- Assign issue
- Transition issue
- View users หรือ browse users สำหรับค้นหา assignee
- View changelog หรือ permission ที่เกี่ยวข้องกับ issue history

### 4.4 สร้าง `JIRA_API_TOKEN`

1. เข้า `https://id.atlassian.com/manage-profile/security/api-tokens`
2. Login ด้วย Atlassian account ที่จะใช้เป็น `JIRA_EMAIL`
3. กด `Create API token` หรือ `Create API token with scopes`
4. ตั้งชื่อ เช่น `sekloso-bot-production`
5. ตั้งวันหมดอายุ ตาม policy บริษัท
6. กด Create
7. Copy token ทันที
8. เก็บ token ใน password manager

```env
JIRA_API_TOKEN="ATATT..."
```

ข้อควรระวัง

- Token ดูซ้ำไม่ได้หลังปิดหน้าจอ
- Token ใหม่ของ Atlassian มีอายุหมดอายุได้ ควรตั้ง reminder ก่อนหมดอายุ
- ถ้า token หลุด ให้ revoke แล้วสร้างใหม่ทันที

### 4.5 ทดสอบค่า Jira แบบง่าย

หลังใส่ค่า env และรันระบบแล้ว เปิด

```text
https://your-app.vercel.app/api/health
```

ถ้า Jira ถูกต้อง ควรเห็น `checks.jira.status` เป็น `ok`

ถ้าขึ้น 401 มักเกิดจาก email/token ผิด

ถ้าขึ้น 404 มักเกิดจาก project key ผิด หรือ account ไม่มีสิทธิ์เห็น project

---

## 5. เตรียม Google Gemini API Key

Gemini ใช้เป็น AI สำหรับอ่านข้อความใน Google Chat แล้วแปลงเป็น JSON เพื่อสั่ง Jira เช่น แยกว่าเป็น create, update, transition หรือ chat

### 5.1 สร้าง API key

1. เข้า `https://aistudio.google.com/apikey`
2. Login ด้วย Google account
3. เลือก Google Cloud project หรือสร้าง project ใหม่
4. กด `Create API key`
5. Copy key ที่ได้
6. ใส่ใน env เป็น `GEMINI_API_KEY`

```env
LLM_PROVIDER="gemini"
GEMINI_API_KEY="AIza..."
GEMINI_MODEL="gemini-3.5-flash"
```

### 5.2 ถ้าปุ่ม Create API key ใช้ไม่ได้

สาเหตุที่พบบ่อย

- บัญชีไม่มี permission ใน Google Cloud project
- organization policy ไม่อนุญาตสร้าง key
- ยังไม่ได้ enable service ที่เกี่ยวข้อง

ให้ติดต่อ Google Cloud admin เพื่อให้สิทธิ์สร้าง API key หรือสร้าง project ที่มีสิทธิ์เอง

### 5.3 คำแนะนำเรื่อง quota และ billing

- ตรวจ quota ใน Google AI Studio/Google Cloud
- ตั้ง budget alert ถ้าเปิด billing
- ไม่ใส่ API key ใน frontend code
- ไม่ commit key ลง GitHub
- หาก key หลุด ให้ rotate key ทันที

---

## 6. เตรียม Google Chat Incoming Webhook URL

ส่วนนี้ใช้สำหรับ “ส่งข้อความจากระบบเข้าห้อง Google Chat” เช่น daily summary และ notification จาก Jira webhook

> จุดที่มักสับสน: Incoming webhook ไม่ใช่ตัวรับคำสั่งจากผู้ใช้ ถ้าต้องการให้ผู้ใช้พิมพ์ `@sekloso ping` ต้องตั้ง Google Chat App ในขั้นตอนที่ 7 เพิ่มด้วย

### 6.1 สร้าง incoming webhook

1. เปิด `https://chat.google.com`
2. เข้า Space ที่ต้องการรับแจ้งเตือน
3. กดชื่อ Space ด้านบน
4. เลือก `Apps & integrations`
5. กด `Add webhooks`
6. ตั้งชื่อ เช่น `Jira Bot Notification`
7. ใส่ Avatar URL ถ้าต้องการ
8. กด Save
9. Copy webhook URL

นำค่าไปใส่

```env
GOOGLE_CHAT_WEBHOOK_URL="https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=..."
```

### 6.2 ข้อควรระวัง

- URL นี้เป็น secret เพราะใครมี URL ก็ส่งข้อความเข้าห้องได้
- ถ้า URL หลุด ให้ลบ webhook เดิมแล้วสร้างใหม่
- Workspace บางองค์กรต้องให้ admin เปิดสิทธิ์ incoming webhook ก่อน

---

## 7. เตรียม Google Chat App สำหรับรับคำสั่งจากผู้ใช้

ส่วนนี้คือสิ่งที่ทำให้ผู้ใช้พิมพ์ `@sekloso สร้างงาน...` แล้วระบบยิงมาที่ `/api/webhook`

### 7.1 เตรียม endpoint

หลัง deploy บน Vercel แล้ว endpoint จะเป็น

```text
https://YOUR-APP.vercel.app/api/webhook
```

ถ้ายังไม่ deploy และต้องทดสอบ local ต้องใช้ tunnel เช่น ngrok หรือ cloudflared ให้ได้ HTTPS URL ที่ชี้เข้า local server

ตัวอย่าง local tunnel

```text
https://xxxx.ngrok-free.app/api/webhook
```

### 7.2 ตั้งค่าใน Google Cloud Console

1. เข้า Google Cloud Console
2. สร้างหรือเลือก project สำหรับ bot
3. ค้นหาและเปิดใช้งาน `Google Chat API`
4. เข้าเมนู configuration ของ Google Chat API
5. ตั้ง App name เช่น `sekloso`
6. ตั้ง Avatar และ description ตามต้องการ
7. เลือก Interactive features หรือ App URL ตามหน้าจอ Google Cloud เวอร์ชันปัจจุบัน
8. ใส่ HTTP endpoint เป็น

```text
https://YOUR-APP.vercel.app/api/webhook
```

9. กำหนด visibility ว่าใช้เฉพาะในองค์กรหรือเฉพาะบางคน
10. Save
11. เพิ่ม app เข้า Space
12. ทดสอบด้วยคำสั่ง

```text
@sekloso ping
```

### 7.3 ความแตกต่างของ 2 URL ใน Google Chat

| ค่า | ใช้ทำอะไร | ตัวอย่าง |
| --- | --- | --- |
| `GOOGLE_CHAT_WEBHOOK_URL` | ระบบส่งข้อความเข้าห้อง | `https://chat.googleapis.com/v1/spaces/...` |
| Chat App endpoint | ผู้ใช้ส่งคำสั่งเข้า bot | `https://your-app.vercel.app/api/webhook` |

ต้องมีทั้ง 2 อย่างถ้าต้องการให้ bot รับคำสั่งและส่งแจ้งเตือนได้ครบ

---

## 8. เตรียม Jira Webhook สำหรับ sync ข้อมูลกลับเข้า dashboard

Jira webhook ใช้เมื่อมีคนแก้ ticket โดยตรงบน Jira แล้วระบบจะ sync ข้อมูลเข้า database และ activity logs

### 8.1 URL ที่ต้องใช้

หลัง deploy แล้ว URL คือ

```text
https://YOUR-APP.vercel.app/api/jira/webhook
```

### 8.2 ตั้งค่าใน Jira

1. Login Jira ด้วย admin account
2. ไปที่ Jira settings หรือ System
3. เข้า Webhooks
4. กด Create webhook
5. ตั้งชื่อ เช่น `sekloso-jira-sync`
6. ใส่ URL เป็น `/api/jira/webhook` ของ Vercel
7. ตั้ง status เป็น Active
8. ถ้ามีช่อง JQL ให้ใส่เพื่อจำกัด project เช่น

```jql
project = TES
```

9. เลือก issue events อย่างน้อย

- Issue created
- Issue updated
- Issue deleted

10. Save

### 8.3 ทดสอบ Jira webhook

1. เปิด ticket ใน Jira
2. แก้ summary หรือเปลี่ยน status
3. เปิด dashboard ดู Activity Logs
4. ตรวจว่าข้อมูล ticket ถูก sync เข้า dashboard
5. ถ้าตั้ง Google Chat webhook ไว้ ควรมี notification เข้า Space

---

## 9. สร้างไฟล์ `.env` สำหรับเครื่อง local

### 9.1 ใช้ setup wizard

ในโฟลเดอร์โปรเจกต์ `nextjs-app` ให้รัน

```bash
npm install
npm run setup
```

ระบบจะถามค่าทีละตัว แล้วสร้างไฟล์ `.env` ให้

ค่าที่ wizard ถาม

- `DATABASE_URL`
- `JIRA_DOMAIN`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`
- `GOOGLE_CHAT_WEBHOOK_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `BOT_NAME`

ค่าที่ wizard สุ่มให้

- `SESSION_SECRET`
- `CRON_SECRET`

### 9.2 เขียน `.env` เอง

ถ้าไม่ใช้ wizard ให้สร้างไฟล์ `.env` ใน root ของ `nextjs-app` แล้วใส่ค่าตามตัวอย่างในหัวข้อ 2

### 9.3 ตรวจว่า `.env` ไม่ถูก push

ก่อน push code ตรวจว่า `.gitignore` มีบรรทัดเหล่านี้

```gitignore
.env
.env.local
.env.*.local
```

ถ้าไม่มี ให้เพิ่มก่อน commit

---

## 10. ทดสอบระบบบนเครื่อง local

ติดตั้ง dependency

```bash
npm install
```

รัน dev server

```bash
npm run dev
```

เปิดเว็บ

```text
http://localhost:3000
```

ตรวจ health

```text
http://localhost:3000/api/health
```

sync tickets ครั้งแรก

```text
http://localhost:3000/api/cron/sync-tickets?secret=YOUR_CRON_SECRET
```

ทดสอบ build ก่อน deploy

```bash
npm run build
```

ถ้า `npm run build` ผ่าน ค่อย push และ deploy

---

## 11. เตรียม Git และ push code ขึ้น GitHub

### 11.1 สร้าง repository บน GitHub

1. เข้า `https://github.com`
2. กด `New repository`
3. ตั้งชื่อ repository เช่น `jira-chat-bot`
4. เลือก Private ถ้าเป็นระบบภายในบริษัท
5. ไม่จำเป็นต้องสร้าง README ถ้า project มีไฟล์อยู่แล้ว
6. กด Create repository

### 11.2 ตรวจไฟล์ก่อน commit

ใช้คำสั่ง

```bash
git status
```

ห้ามมีไฟล์เหล่านี้อยู่ในรายการที่จะ commit

- `.env`
- `.env.local`
- ไฟล์ที่มี token หรือ password
- ไฟล์ backup ที่ copy ค่า secret ไว้

### 11.3 push ขึ้น GitHub ครั้งแรก

ถ้า project ยังไม่เคย init git

```bash
git init
git branch -M main
git add .
git commit -m "Initial deployable Jira chat bot"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

ถ้า project มี git อยู่แล้ว

```bash
git status
git add .
git commit -m "Update setup guide and deployment config"
git push origin main
```

### 11.4 ถ้าเผลอ push secret ไปแล้ว

ให้ทำทันที

1. Revoke Jira API token
2. Rotate Gemini API key
3. ลบ Google Chat webhook เดิมแล้วสร้างใหม่
4. เปลี่ยน `SESSION_SECRET` และ `CRON_SECRET`
5. เปลี่ยน database password ถ้า `DATABASE_URL` หลุด
6. อัปเดตค่าใหม่ใน Vercel
7. Redeploy

การลบ commit อย่างเดียวไม่พอ เพราะ secret อาจถูกดึงไปแล้ว

---

## 12. Deploy ขึ้น Vercel

### 12.1 Import GitHub repository

1. เข้า `https://vercel.com/dashboard`
2. กด `Add New` > `Project`
3. เลือก GitHub repository ที่ push ไว้
4. Framework Preset เลือก `Next.js`
5. Root Directory ให้เลือกโฟลเดอร์ที่มี `package.json` ของ app
6. Build command ใช้ default หรือ `npm run build`
7. Install command ใช้ default หรือ `npm install`
8. อย่าเพิ่ง deploy ถ้ายังไม่ได้ใส่ Environment Variables

### 12.2 Root Directory สำคัญมาก

ถ้า repository มีหลายโฟลเดอร์ ต้องตั้ง Root Directory ให้ตรงกับ `nextjs-app`

ถูกต้องถ้าใน root นั้นมีไฟล์เหล่านี้

- `package.json`
- `next.config.mjs`
- `app/`
- `components/`
- `lib/`

ถ้าเลือก root ผิด build จะหา `package.json` ไม่เจอ หรือ deploy app ผิดตัว

---

## 13. ตั้ง Environment Variables บน Vercel

ไปที่

```text
Vercel Project > Settings > Environment Variables
```

เพิ่มค่าทั้งหมดจากหัวข้อ 2

เลือก environment ให้ครบตามต้องการ

- Production: ใช้กับเว็บจริง
- Preview: ใช้กับ branch หรือ pull request
- Development: ใช้กับ `vercel dev`

แนะนำให้ใส่ Production และ Preview อย่างน้อย

หลังเพิ่มหรือแก้ env ต้อง redeploy ใหม่ ไม่อย่างนั้น deployment เก่าจะยังใช้ค่าเดิม

---

## 14. ตั้ง URL หลัง deploy

เมื่อ Vercel deploy สำเร็จ จะได้ URL เช่น

```text
https://jira-chat-bot.vercel.app
```

นำ URL นี้ไปตั้ง 2 จุด

### 14.1 Google Chat App endpoint

```text
https://jira-chat-bot.vercel.app/api/webhook
```

### 14.2 Jira webhook endpoint

```text
https://jira-chat-bot.vercel.app/api/jira/webhook
```

### 14.3 URL สำหรับตรวจระบบ

```text
https://jira-chat-bot.vercel.app/api/health
```

---

## 15. Sync tickets ครั้งแรก

หลัง deploy และใส่ env แล้ว ให้ sync งานจาก Jira เข้า database ครั้งแรก

เปิด URL นี้ใน browser

```text
https://jira-chat-bot.vercel.app/api/cron/sync-tickets?secret=YOUR_CRON_SECRET
```

ถ้าสำเร็จควรได้ response ประมาณ

```json
{
  "success": true,
  "message": "Synchronized ... tickets successfully.",
  "count": 10
}
```

จากนั้นเปิด dashboard แล้วตรวจว่ามี tickets แสดงหรือไม่

---

## 16. ตั้งค่า cron และรายงานประจำวัน

โปรเจกต์นี้มี `vercel.json` ดังนี้

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 1 * * 1-5"
    }
  ]
}
```

ความหมาย

- `0 1 * * 1-5` คือเวลา 01:00 UTC วันจันทร์ถึงศุกร์
- เวลาไทยคือประมาณ 08:00 น. วันจันทร์ถึงศุกร์
- endpoint ที่ถูกเรียกคือ `/api/cron/daily-summary`
- endpoint นี้จะดึงงาน overdue/due today จาก Jira แล้วส่งเข้า `GOOGLE_CHAT_WEBHOOK_URL`

ถ้าต้องการเปลี่ยนเป็น 06:00 เวลาไทย ต้องใช้ 23:00 UTC ของวันก่อนหน้า

```json
{
  "path": "/api/cron/daily-summary",
  "schedule": "0 23 * * 0-4"
}
```

หลังแก้ `vercel.json` ต้อง commit และ push เพื่อให้ Vercel deploy ใหม่

---

## 17. ทดสอบระบบหลัง deploy

### 17.1 Health check

เปิด

```text
https://jira-chat-bot.vercel.app/api/health
```

ควรเห็น

- `overall`: `ready`
- `checks.env.status`: `ok`
- `checks.database.status`: `ok`
- `checks.jira.status`: `ok`
- `checks.google_chat.status`: `configured`

ถ้าไม่ ready ให้อ่าน message ใน response ก่อน เพราะ endpoint นี้บอกค่อนข้างชัดว่าขาดอะไร

### 17.2 ทดสอบ Google Chat Bot

ในห้อง Google Chat ที่เพิ่ม app แล้ว พิมพ์

```text
@sekloso ping
```

ควรตอบประมาณ

```text
Pong! ระบบ Chat Bot ทำงานปกติครับ
```

ทดสอบดูงานค้าง

```text
@sekloso ดูงานค้างทั้งหมด
```

ทดสอบสร้างงาน

```text
@sekloso สร้างงาน ทดสอบระบบ bot ส่งพรุ่งนี้ priority low
```

หลังทดสอบเสร็จจะไปลบ ticket ใน Jira ก็ได้

### 17.3 ทดสอบ Dashboard

เปิด

```text
https://jira-chat-bot.vercel.app/dashboard
```

ใน code ปัจจุบัน หน้าแรกเป็น UAT role selection ให้เลือก role เพื่อเข้า dashboard หากเปลี่ยนกลับไปใช้ระบบ login จริง ให้ใช้ user/admin ตามที่ตั้งไว้ใน database

### 17.4 ทดสอบ Jira webhook

1. เปิด ticket ใน Jira
2. เปลี่ยน status หรือแก้ summary
3. รอไม่กี่วินาที
4. เปิด dashboard activity logs
5. ตรวจว่ามี log จาก Jira Cloud หรือไม่

---

## 18. คำสั่ง bot ที่ใช้บ่อย

| งานที่ต้องการ | ตัวอย่างคำสั่ง |
| --- | --- |
| ทดสอบ bot | `@sekloso ping` |
| ขอวิธีใช้ | `@sekloso help` |
| สร้าง Epic | `@sekloso สร้างงาน ระบบลงทะเบียนสมาชิก ส่ง 31/07/69` |
| สร้าง Task ใต้งานแม่ | `@sekloso สร้าง job เขียน API login ในงาน TES-14 ให้แพ็ก ส่งพรุ่งนี้` |
| แก้กำหนดส่ง | `@sekloso แก้ไขวันส่ง TES-14 เป็น 31/07/69` |
| เปลี่ยนผู้รับผิดชอบ | `@sekloso มอบหมาย TES-14 ให้แพ็ก` |
| เปลี่ยนสถานะ | `@sekloso ย้าย TES-14 เป็น In Progress` |
| ปิดงาน | `@sekloso ปิดงาน TES-14` |
| ดูงานค้างทั้งหมด | `@sekloso ดูงานค้างทั้งหมด` |
| ดูเฉพาะ Epic | `@sekloso ดู epic` |
| ดูเฉพาะ Task/job | `@sekloso ดู job` |

---

## 19. การแก้ปัญหาที่พบบ่อย

### 19.1 `/api/health` แจ้ง env missing

สาเหตุ

- ลืมใส่ Environment Variables ใน Vercel
- ใส่เฉพาะ Preview แต่ deploy เป็น Production
- ใส่ชื่อ key ผิด เช่น `JIRA_TOKEN` แทน `JIRA_API_TOKEN`
- เพิ่ม env แล้วแต่ยังไม่ได้ redeploy

วิธีแก้

1. ไปที่ Vercel Project Settings > Environment Variables
2. ตรวจชื่อ key ทีละตัว
3. เลือก environment ให้ถูก
4. Redeploy

### 19.2 Jira ขึ้น 401

สาเหตุที่พบบ่อย

- `JIRA_EMAIL` ไม่ใช่บัญชีที่สร้าง token
- `JIRA_API_TOKEN` copy ผิด หรือหมดอายุ
- token ถูก revoke

วิธีแก้

- สร้าง Jira API token ใหม่
- อัปเดต `JIRA_API_TOKEN` ใน Vercel
- Redeploy

### 19.3 Jira ขึ้น 404

สาเหตุที่พบบ่อย

- `JIRA_PROJECT_KEY` ผิด
- account ไม่มีสิทธิ์เข้าถึง project
- `JIRA_DOMAIN` ใส่ path เกินมา เช่น `/jira/software/...`

วิธีแก้

- ตรวจ project key จาก ticket จริง เช่น `TES-14`
- ตรวจ permission ของ account
- ใส่ domain แค่ `company.atlassian.net`

### 19.4 Database ต่อไม่ได้

สาเหตุที่พบบ่อย

- `DATABASE_URL` ยังมี `[YOUR-PASSWORD]`
- password มีอักขระพิเศษแต่ไม่ได้ encode
- Supabase project ถูก paused
- ใช้ direct connection แต่ network/serverless ต่อไม่ได้

วิธีแก้

- copy transaction pooler string ใหม่
- reset database password หากจำไม่ได้
- restore Supabase project ถ้าถูก pause
- ตรวจว่า URL ใช้ port `6543` ถ้าใช้ pooler transaction

### 19.5 Google Chat Bot ไม่ตอบ

สาเหตุที่พบบ่อย

- Google Chat App endpoint ผิด
- App ยังไม่ได้เพิ่มเข้า Space
- ในห้องกลุ่มไม่ได้ mention bot
- Vercel function error เพราะ env missing
- Gemini API key ใช้ไม่ได้

วิธีแก้

1. เปิด `/api/health`
2. ตรวจ Vercel Logs ของ `/api/webhook`
3. ตรวจ Google Chat API configuration ว่า URL เป็น `/api/webhook`
4. ลอง `@sekloso ping`

### 19.6 Notification ไม่เข้า Google Chat

สาเหตุที่พบบ่อย

- `GOOGLE_CHAT_WEBHOOK_URL` ผิด
- webhook ถูกลบจาก Space
- Workspace ปิด incoming webhook

วิธีแก้

- สร้าง incoming webhook ใหม่
- อัปเดตค่าใน Vercel
- Redeploy
- ทดสอบ daily summary หรือแก้ ticket ใน Jira

### 19.7 Daily summary ไม่มาตามเวลา

โปรเจกต์ปัจจุบันตั้งเวลาไว้ที่ `0 1 * * 1-5` หรือประมาณ 08:00 เวลาไทย

ถ้าอยากได้ 06:00 เวลาไทย ให้เปลี่ยนเป็น

```json
"schedule": "0 23 * * 0-4"
```

ตรวจเพิ่ม

- Vercel plan รองรับ cron หรือไม่
- มี deployment ล่าสุดที่มี `vercel.json` หรือไม่
- `GOOGLE_CHAT_WEBHOOK_URL` ถูกต้องหรือไม่
- ดู Vercel Logs ของ `/api/cron/daily-summary`

### 19.8 เผลอ push `.env` ขึ้น GitHub

ให้ถือว่า key ทั้งหมดรั่วทันที

ต้องทำ

1. Revoke Jira API token
2. Rotate Gemini API key
3. ลบและสร้าง Google Chat webhook ใหม่
4. เปลี่ยน database password หรือ connection string
5. สุ่ม `SESSION_SECRET` และ `CRON_SECRET` ใหม่
6. อัปเดต Vercel Environment Variables
7. Redeploy
8. ลบ secret ออกจาก Git history หากจำเป็น แต่ยังต้อง rotate key อยู่ดี

---

## 20. Checklist ก่อนส่งมอบงาน

- [ ] สร้าง Supabase project แล้ว
- [ ] ได้ `DATABASE_URL` แล้ว และใช้ pooler ที่เหมาะกับ Vercel
- [ ] สร้าง Jira API token แล้ว
- [ ] ได้ `JIRA_DOMAIN`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` แล้ว
- [ ] สร้าง Gemini API key แล้ว
- [ ] สร้าง Google Chat Incoming Webhook แล้ว
- [ ] ตั้ง Google Chat App endpoint เป็น `/api/webhook` แล้ว
- [ ] ตั้ง Jira webhook endpoint เป็น `/api/jira/webhook` แล้ว
- [ ] สร้าง `.env` สำหรับ local แล้ว
- [ ] ตรวจว่า `.env` ไม่ถูก commit
- [ ] `npm install` ผ่าน
- [ ] `npm run build` ผ่าน
- [ ] push code ขึ้น GitHub แล้ว
- [ ] import project เข้า Vercel แล้ว
- [ ] ใส่ Environment Variables บน Vercel ครบแล้ว
- [ ] deploy สำเร็จแล้ว
- [ ] `/api/health` เป็น ready แล้ว
- [ ] sync tickets ครั้งแรกแล้ว
- [ ] ทดสอบ `@sekloso ping` ผ่านแล้ว
- [ ] ทดสอบคำสั่งสร้าง/แก้ไข/ดูงานค้างแล้ว
- [ ] ทดสอบ Jira webhook แล้ว
- [ ] ตรวจ Vercel cron แล้ว

---

## แหล่งอ้างอิง

- Atlassian API token: https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/
- Jira webhooks: https://support.atlassian.com/jira-cloud-administration/docs/manage-webhooks/
- Supabase database connection: https://supabase.com/docs/guides/database/connecting-to-postgres
- Gemini API key: https://ai.google.dev/gemini-api/docs/api-key
- Google Chat incoming webhook: https://developers.google.com/workspace/chat/quickstart/webhooks
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel Git deployments: https://vercel.com/docs/git
- GitHub repository quickstart: https://docs.github.com/en/repositories/creating-and-managing-repositories/quickstart-for-repositories

---

อัปเดตล่าสุด: กรกฎาคม 2569
