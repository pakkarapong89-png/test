# คู่มือติดตั้ง ตั้งค่า API Key Push Git และ Deploy Bot Jira

คู่มือนี้เป็นคู่มือสำหรับผู้ดูแลระบบของ bot ตัวนี้ ใช้คู่กับคู่มือผู้ใช้งานทั่วไป `BOT_USER_MANUAL_TH.md` โดยเอกสารนี้จะเน้นตั้งแต่การหา key ต่าง ๆ การเอาค่าไปใส่ใน `.env` และ Vercel การ push code ขึ้น GitHub และการ deploy ให้ใช้งานจริง

> สำคัญ: ห้าม commit หรือส่งต่อค่า API key, token, `.env`, `.env.local` หรือ webhook URL ลง Git เด็ดขาด เพราะค่าเหล่านี้ใช้เข้าถึง Jira, AI, ฐานข้อมูล และห้อง Google Chat ได้

## 1. ภาพรวมระบบที่ต้องเตรียม

ระบบนี้เป็น Next.js app ที่เชื่อมต่อบริการหลักดังนี้

- Supabase/Postgres: เก็บ tickets cache, users, activity logs, team members และ action sources
- Jira Cloud: สร้าง แก้ไข เปลี่ยนสถานะ และดึงข้อมูลงาน
- Google Gemini API: แปลงข้อความภาษาคนใน Google Chat เป็นคำสั่ง Jira
- Google Chat Incoming Webhook: ส่งแจ้งเตือนและ daily summary เข้าห้องแชท
- Google Chat App endpoint: ให้ผู้ใช้ mention bot แล้วเรียก `/api/webhook`
- Vercel: host web app, API routes และ cron job
- GitHub: เก็บ source code และเชื่อม deploy อัตโนมัติกับ Vercel

ไฟล์สำคัญในโปรเจกต์นี้:

- `setup.js`: wizard สำหรับกรอกค่า config และสร้าง `.env`
- `.env` หรือ `.env.local`: เก็บค่าลับสำหรับ local development
- `app/api/webhook/route.js`: endpoint หลักของ Google Chat bot
- `app/api/jira/webhook/route.js`: endpoint รับ webhook จาก Jira
- `app/api/cron/sync-tickets/route.js`: sync tickets จาก Jira เข้า database
- `app/api/cron/daily-summary/route.js`: ส่งสรุปงานประจำวันเข้า Google Chat
- `app/api/health/route.js`: ตรวจสอบ env, database, Jira และ Google Chat config
- `vercel.json`: ตั้ง cron ของ Vercel ให้ยิง daily summary วันทำงาน

## 2. รายการค่าที่ต้องมี

| ตัวแปร | เอามาจากไหน | ใช้ทำอะไร |
| --- | --- | --- |
| `DATABASE_URL` | Supabase Project Dashboard | เชื่อมต่อ Postgres database |
| `JIRA_DOMAIN` | URL Jira Cloud ของบริษัท | ระบุ host Jira เช่น `company.atlassian.net` |
| `JIRA_EMAIL` | อีเมล Atlassian/Jira ของบัญชีที่ใช้ token | ใช้คู่กับ Jira API token |
| `JIRA_API_TOKEN` | Atlassian Account Security | เรียก Jira REST API |
| `JIRA_PROJECT_KEY` | Jira Project | ระบุ project เช่น `TES`, `DEV` |
| `GOOGLE_CHAT_WEBHOOK_URL` | Google Chat Space webhook | ส่งข้อความแจ้งเตือนเข้าห้อง |
| `LLM_PROVIDER` | กำหนดเอง | โปรเจกต์นี้ใช้ `gemini` เป็นหลัก |
| `GEMINI_API_KEY` | Google AI Studio | ให้ AI parse ข้อความผู้ใช้ |
| `GEMINI_MODEL` | Google AI Studio / docs | รุ่นโมเดล เช่น `gemini-3.5-flash` |
| `BOT_NAME` | กำหนดเอง | ชื่อที่ผู้ใช้ mention เช่น `taskyapp` |
| `SESSION_SECRET` | สุ่มเอง | เซ็น session token ของ dashboard |
| `CRON_SECRET` | สุ่มเอง | ป้องกัน endpoint cron/sync |

## 3. เตรียม Supabase และหา `DATABASE_URL`

1. เข้า [Supabase](https://supabase.com/) แล้วสร้าง Project ใหม่
2. ตั้งรหัสผ่าน database ให้แข็งแรง และเก็บไว้ใน password manager
3. เข้า Project Dashboard
4. กดปุ่ม `Connect` ในหน้า project
5. เลือก connection string สำหรับ Postgres
6. สำหรับ deploy บน Vercel แนะนำใช้ pooler/transaction mode เพราะเป็น serverless environment
7. คัดลอก connection string แล้วแทน `[YOUR-PASSWORD]` ด้วย database password จริง
8. นำค่าทั้งบรรทัดไปใส่ `DATABASE_URL`

ตัวอย่างรูปแบบค่า:

```env
DATABASE_URL="postgres://postgres.xxxxx:YOUR_PASSWORD@aws-region.pooler.supabase.com:6543/postgres"
```

หมายเหตุ:

- Supabase ระบุว่า connection string อยู่ใน Dashboard โดยกด `Connect`
- Direct connection มักใช้กับ server ถาวร ส่วน serverless/edge functions ควรใช้ transaction pooler
- โปรเจกต์นี้ใช้ไลบรารี `pg` และเปิด SSL ไว้ใน `lib/db.js`

## 4. เตรียม Jira Cloud และหา `JIRA_*`

### 4.1 หา `JIRA_DOMAIN`

เปิด Jira ใน browser แล้วดู URL เช่น

```text
https://company.atlassian.net/jira/software/projects/TES/boards/1
```

ค่าที่ต้องใช้คือ domain เท่านั้น ไม่ต้องมี `https://`

```env
JIRA_DOMAIN="company.atlassian.net"
```

### 4.2 หา `JIRA_PROJECT_KEY`

วิธีที่ง่ายที่สุด:

1. เปิด Jira project ที่ต้องการให้ bot ใช้งาน
2. ดูรหัสงานตัวอย่าง เช่น `TES-14`
3. ส่วนหน้าเครื่องหมาย `-` คือ project key

ตัวอย่าง:

```env
JIRA_PROJECT_KEY="TES"
```

### 4.3 หา `JIRA_EMAIL`

ใช้ email ของ Atlassian account ที่สร้าง API token และมีสิทธิ์ใน project นั้น เช่น

```env
JIRA_EMAIL="pm@company.com"
```

บัญชีนี้ควรมีสิทธิ์อย่างน้อย:

- Browse projects
- Create issues
- Edit issues
- Assign issues
- Transition issues
- ดู users เพื่อค้นหา assignee

### 4.4 สร้าง `JIRA_API_TOKEN`

1. เข้า [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. กด `Create API token` หรือ `Create API token with scopes`
3. ตั้งชื่อ เช่น `taskyapp-jira-bot-production`
4. ตั้งวันหมดอายุ ตามนโยบายบริษัท
5. ถ้าเลือกแบบ scopes ให้เลือกสิทธิ์ Jira ที่ต้องใช้ เช่น read/write issue และ user search ตามนโยบายองค์กร
6. กด Create
7. Copy token ทันที และเก็บใน password manager

ตัวอย่าง:

```env
JIRA_API_TOKEN="ใส่-token-ที่-copy-มา"
```

ข้อควรจำ:

- Atlassian ระบุว่า token ใหม่มีวันหมดอายุ และหลัง copy แล้วจะดู token เดิมซ้ำไม่ได้
- หาก token หลุด ให้ revoke แล้วสร้างใหม่ทันที

## 5. เตรียม Google Gemini API Key

1. เข้า [Google AI Studio API Keys](https://aistudio.google.com/apikey)
2. Login ด้วยบัญชี Google ที่ต้องการใช้
3. เลือก project หรือ import Google Cloud project ที่มีอยู่
4. กด `Create API key`
5. Copy key ที่ได้
6. นำไปใส่ `GEMINI_API_KEY`

ตัวอย่าง:

```env
LLM_PROVIDER="gemini"
GEMINI_API_KEY="ใส่-key-จาก-Google-AI-Studio"
GEMINI_MODEL="gemini-3.5-flash"
```

ข้อแนะนำด้านความปลอดภัย:

- ตั้ง billing/quota/usage alert ใน Google Cloud ถ้าเปิด billing
- จำกัดสิทธิ์ key ตามที่ Google แนะนำเมื่อเหมาะสม
- ห้ามใส่ key ใน frontend code หรือ commit ลง Git
- หากสงสัยว่า key หลุด ให้สร้าง key ใหม่ อัปเดต Vercel env แล้วลบ key เก่า

## 6. เตรียม Google Chat Webhook URL

ค่านี้ใช้ส่งข้อความจากระบบเข้าห้อง Google Chat เช่น daily summary และ notification จาก Jira

1. เปิด [Google Chat](https://chat.google.com/) ผ่าน browser
2. เข้า Space ที่ต้องการให้ bot ส่งข้อความเข้าไป
3. กดลูกศรข้างชื่อ Space
4. เลือก `Apps & integrations`
5. กด `Add webhooks`
6. ตั้งชื่อ เช่น `taskyapp notification`
7. ใส่ Avatar URL ถ้าต้องการ
8. กด Save
9. กดเมนูของ webhook แล้ว Copy link
10. นำ link ไปใส่ `GOOGLE_CHAT_WEBHOOK_URL`

ตัวอย่าง:

```env
GOOGLE_CHAT_WEBHOOK_URL="https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=..."
```

ข้อควรระวัง:

- Webhook URL มี `key` และ `token` ต้องถือว่าเป็น secret
- ถ้าคนอื่นได้ URL นี้ เขาสามารถส่งข้อความเข้าห้องได้
- ห้ามเผยแพร่ URL ลง GitHub หรือเอกสารสาธารณะ

## 7. เตรียม Google Chat App สำหรับรับคำสั่งจากผู้ใช้

Webhook URL ด้านบนใช้สำหรับ “ส่งข้อความออก” ไปยังห้อง แต่การให้ผู้ใช้พิมพ์ `@taskyapp สร้างงาน...` ต้องตั้ง Google Chat App ให้ยิง endpoint ของระบบนี้

หลัง deploy แล้ว endpoint จะเป็น:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/webhook
```

ขั้นตอนโดยรวม:

1. เข้า Google Cloud Console
2. สร้างหรือเลือก project สำหรับ bot
3. เปิดใช้งาน Google Chat API
4. เข้าเมนู Google Chat API configuration
5. ตั้ง App name ให้ตรงกับ `BOT_NAME` เช่น `taskyapp`
6. ตั้ง interaction endpoint เป็น URL `/api/webhook` ของ Vercel
7. เลือกให้ bot ใช้งานใน Workspace/Space ตามนโยบายองค์กร
8. Save configuration
9. เพิ่ม app เข้า Space แล้วลองพิมพ์ `@taskyapp ping`

ถ้าอยู่ในช่วง local development และต้องทดสอบ Google Chat App ก่อน deploy ต้องใช้ tunnel เช่น ngrok/cloudflared ให้ได้ HTTPS URL แล้วชี้ endpoint มาที่ `/api/webhook`

## 8. เตรียม Jira Webhook

Jira webhook ใช้ให้ระบบรู้ว่ามีการสร้าง/แก้ไข/ลบ/เปลี่ยนสถานะใน Jira แล้ว sync เข้า database และแจ้ง Google Chat

หลัง deploy แล้ว endpoint จะเป็น:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/jira/webhook
```

ขั้นตอนโดยรวม:

1. เข้า Jira ด้วยบัญชี admin
2. ไปที่ Jira settings หรือ System
3. เข้า Webhooks
4. สร้าง webhook ใหม่
5. ใส่ URL เป็น `/api/jira/webhook` ของ Vercel
6. เลือก event ที่ต้องการ เช่น issue created, issue updated, issue deleted
7. จำกัด JQL ให้ตรง project เช่น `project = TES` ถ้าต้องการ
8. Save
9. ลองแก้ ticket ใน Jira แล้วดู Activity Logs หรือ Google Chat notification

## 9. สร้างไฟล์ `.env` สำหรับเครื่อง local

โปรเจกต์นี้มีคำสั่ง wizard:

```bash
npm run setup
```

คำสั่งนี้จะถามค่าเหล่านี้:

- `DATABASE_URL`
- `JIRA_DOMAIN`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`
- `GOOGLE_CHAT_WEBHOOK_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `BOT_NAME`

และจะสุ่มค่า:

- `SESSION_SECRET`
- `CRON_SECRET`

หลังรันเสร็จจะได้ไฟล์ `.env`

ตัวอย่าง `.env`:

```env
DATABASE_URL="postgres://..."

JIRA_DOMAIN="company.atlassian.net"
JIRA_EMAIL="pm@company.com"
JIRA_API_TOKEN="xxxxx"
JIRA_PROJECT_KEY="TES"

GOOGLE_CHAT_WEBHOOK_URL="https://chat.googleapis.com/..."

LLM_PROVIDER="gemini"
GEMINI_API_KEY="xxxxx"
GEMINI_MODEL="gemini-3.5-flash"
BOT_NAME="taskyapp"

SESSION_SECRET="สุ่มยาวๆ"
CRON_SECRET="สุ่มยาวๆ"
```

## 10. ทดสอบบนเครื่องก่อน push

ติดตั้ง dependencies:

```bash
npm install
```

รัน local dev:

```bash
npm run dev
```

เปิด browser:

```text
http://localhost:3000
```

ตรวจ health:

```text
http://localhost:3000/api/health
```

ถ้า database มี ticket count เป็น 0 ให้ sync ครั้งแรก:

```text
http://localhost:3000/api/cron/sync-tickets?secret=ค่า_CRON_SECRET
```

ทดสอบ build:

```bash
npm run build
```

## 11. เตรียม Git และ push code ขึ้น GitHub

ตรวจไฟล์ที่ไม่ควร push:

- `.env`
- `.env.local`
- token/key ทุกชนิด
- ไฟล์ backup ที่มี secret

ตรวจ `.gitignore` ว่ามี `.env*` หรือไม่ ถ้าไม่มีให้เพิ่มก่อน commit

คำสั่งมาตรฐาน:

```bash
git status
git add .
git commit -m "Add Jira bot setup and dashboard"
git branch -M main
git remote add origin https://github.com/ORG_OR_USER/REPO_NAME.git
git push -u origin main
```

ถ้า remote มีอยู่แล้ว:

```bash
git remote -v
git push origin main
```

ข้อแนะนำ:

- อย่าใช้ `git add .` ถ้าไม่แน่ใจว่าไม่มีไฟล์ secret ปะปน ให้เลือก add เป็นไฟล์ ๆ
- ถ้าเผลอ push secret ไปแล้ว ให้ถือว่า secret รั่วทันที ต้อง revoke/rotate key ทั้งหมดที่เกี่ยวข้อง

## 12. Deploy บน Vercel

### 12.1 Import GitHub repository

1. เข้า [Vercel Dashboard](https://vercel.com/dashboard)
2. กด `Add New` > `Project`
3. เลือก GitHub repository ที่ push ไว้
4. Framework Preset ควรเป็น Next.js
5. Build command ใช้ค่า default หรือ `npm run build`
6. Output directory ใช้ค่า default ของ Next.js

### 12.2 ใส่ Environment Variables ใน Vercel

ในหน้า Project Settings > Environment Variables ให้เพิ่มค่าทั้งหมดนี้:

```env
DATABASE_URL=...
JIRA_DOMAIN=...
JIRA_EMAIL=...
JIRA_API_TOKEN=...
JIRA_PROJECT_KEY=...
GOOGLE_CHAT_WEBHOOK_URL=...
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
BOT_NAME=taskyapp
SESSION_SECRET=...
CRON_SECRET=...
```

เลือก environment:

- Production: สำหรับเว็บจริง
- Preview: สำหรับ branch อื่นหรือ pull request
- Development: สำหรับ `vercel dev` ถ้าใช้ Vercel CLI

Vercel ระบุว่า Production env จะใช้กับ production deployment และ Preview env จะใช้กับ deployment จาก branch ที่ไม่ใช่ production branch

### 12.3 Deploy

กด `Deploy` แล้วรอ build เสร็จ จากนั้นจะได้ URL เช่น:

```text
https://your-project.vercel.app
```

## 13. ตั้งค่า URL หลัง deploy

หลังได้ Vercel URL แล้ว ต้องกลับไปตั้งค่าระบบภายนอก:

Google Chat App endpoint:

```text
https://your-project.vercel.app/api/webhook
```

Jira webhook endpoint:

```text
https://your-project.vercel.app/api/jira/webhook
```

Health check:

```text
https://your-project.vercel.app/api/health
```

Sync tickets ครั้งแรก:

```text
https://your-project.vercel.app/api/cron/sync-tickets?secret=CRON_SECRET
```

Daily summary endpoint:

```text
https://your-project.vercel.app/api/cron/daily-summary
```

## 14. Cron บน Vercel

โปรเจกต์นี้มี `vercel.json`:

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

ความหมาย:

- ยิง `/api/cron/daily-summary`
- วันจันทร์ถึงศุกร์
- เวลา `01:00 UTC`
- เทียบเป็นเวลาไทยประมาณ `08:00 Asia/Bangkok`

ถ้าต้องการเปลี่ยนเวลา ให้แก้ cron expression ใน `vercel.json` แล้ว commit/push ใหม่

## 15. ตรวจระบบหลัง deploy

ลำดับตรวจสอบที่แนะนำ:

1. เปิด `/api/health`
2. ตรวจว่า env ไม่ missing
3. ตรวจ database status เป็น ok
4. ตรวจ Jira status เป็น ok
5. เปิด `/api/cron/sync-tickets?secret=CRON_SECRET`
6. เปิด dashboard แล้วดูว่ามี ticket หรือไม่
7. พิมพ์ใน Google Chat: `@taskyapp ping`
8. สั่งงานตัวอย่าง เช่น `@taskyapp ดูงานค้างทั้งหมด`
9. แก้ ticket ใน Jira แล้วดูว่า webhook sync และ Activity Logs ทำงานหรือไม่

## 16. ปัญหาที่พบบ่อยตอนติดตั้ง

`/api/health` แจ้ง missing env:

- ยังไม่ได้ใส่ env ใน Vercel หรือใส่ผิด environment
- หลังเพิ่ม env ต้อง redeploy ใหม่

Jira 401:

- `JIRA_EMAIL` ไม่ตรงกับเจ้าของ token
- `JIRA_API_TOKEN` ผิด หมดอายุ หรือถูก revoke

Jira 404 project:

- `JIRA_PROJECT_KEY` ผิด
- บัญชี token ไม่มีสิทธิ์เห็น project

Database connection error:

- `DATABASE_URL` ผิด หรือยังไม่ได้แทน password
- ใช้ direct connection ใน environment ที่รองรับ IPv4 เท่านั้นไม่ได้ ให้ลอง pooler
- Supabase project paused หรือ password เปลี่ยน

Google Chat webhook ไม่ส่งข้อความ:

- `GOOGLE_CHAT_WEBHOOK_URL` ผิดหรือถูก revoke
- Space ไม่อนุญาต incoming webhook
- URL หลุดแล้วถูกปิด ต้องสร้างใหม่

Mention bot แล้วไม่ตอบ:

- Google Chat App endpoint ไม่ใช่ `/api/webhook`
- ยังไม่ได้ redeploy หลังตั้ง env
- App ยังไม่ได้เพิ่มเข้า Space
- ถ้าอยู่ในห้องกลุ่ม ต้อง mention bot ด้วย `@BOT_NAME`

Daily summary ไม่มา:

- ตรวจ `vercel.json`
- ตรวจ cron logs ใน Vercel
- ตรวจ `GOOGLE_CHAT_WEBHOOK_URL`
- endpoint production อาจไม่ผ่าน auth ถ้าตั้ง `CRON_SECRET` ผิด แต่ Vercel Cron จะส่ง header `x-vercel-cron`

## 17. Checklist ก่อนส่งมอบงาน

- [ ] สร้าง Supabase project แล้ว
- [ ] ได้ `DATABASE_URL` แล้ว
- [ ] สร้าง Jira API token แล้ว
- [ ] ได้ `JIRA_DOMAIN`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` แล้ว
- [ ] สร้าง Gemini API key แล้ว
- [ ] สร้าง Google Chat incoming webhook แล้ว
- [ ] ตั้ง Google Chat App endpoint เป็น `/api/webhook` แล้ว
- [ ] ตั้ง Jira webhook endpoint เป็น `/api/jira/webhook` แล้ว
- [ ] ใส่ Environment Variables ใน Vercel ครบแล้ว
- [ ] Deploy สำเร็จแล้ว
- [ ] `/api/health` ผ่านแล้ว
- [ ] Sync tickets ครั้งแรกแล้ว
- [ ] ทดสอบ `@taskyapp ping` ผ่านแล้ว
- [ ] ทดสอบสร้าง/แก้ไข/ดูงานค้างผ่าน Google Chat แล้ว
- [ ] ตรวจว่าไม่มี `.env` หรือ secret ถูก push ขึ้น GitHub

## แหล่งอ้างอิงหลัก

- Atlassian API token: https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/
- Supabase connection string: https://supabase.com/docs/guides/database/connecting-to-postgres
- Gemini API key: https://ai.google.dev/gemini-api/docs/api-key
- Google Chat incoming webhook: https://developers.google.com/workspace/chat/quickstart/webhooks
- Jira webhooks: https://support.atlassian.com/jira-cloud-administration/docs/manage-webhooks/
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel Git deployment: https://vercel.com/docs/git
- GitHub repository quickstart: https://docs.github.com/en/repositories/creating-and-managing-repositories/quickstart-for-repositories
