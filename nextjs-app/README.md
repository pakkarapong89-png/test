# 🤖 taskyapp — Google Chat Bot สำหรับจัดการงาน Jira

แชทบอทเชื่อมต่อ Google Chat กับ Jira Cloud  
ผู้ใช้พิมพ์คำสั่งภาษาไทยในแชท → บอทสร้าง/อัปเดต/ดูงานใน Jira อัตโนมัติ

---

## 📋 สิ่งที่ต้องเตรียมก่อน Deploy

| สิ่ง | ที่ไหน | หมายเหตุ |
|---|---|---|
| GitHub Account | github.com | ฟรี |
| Vercel Account | vercel.com | ฟรี (Hobby Plan) |
| Supabase Project | supabase.com | ฟรี |
| Jira Cloud + API Token | atlassian.net | ต้องเป็น Admin |
| Google Cloud Project | console.cloud.google.com | ฟรี |
| Google Gemini API Key | aistudio.google.com | ฟรี |

---

## 🚀 ขั้นตอน Deploy (ทำครั้งเดียว)

### 1. Import โปรเจกต์เข้า Vercel
1. เข้า [vercel.com](https://vercel.com) → **Add New Project**
2. เลือก **Import Git Repository** → เลือก Repo นี้
3. ตั้ง **Root Directory** = `nextjs-app` ⚠️ สำคัญมาก
4. **ยังไม่ต้องกด Deploy** — ไปตั้งค่า Environment Variables ก่อน

### 2. ตั้งค่า Environment Variables ใน Vercel
ไปที่ **Settings → Environment Variables** แล้วเพิ่มตัวแปรทั้งหมดนี้:

```
DATABASE_URL          = postgresql://... (จาก Supabase → Settings → Database)
JIRA_DOMAIN           = your-company.atlassian.net
JIRA_EMAIL            = อีเมลที่ใช้ใน Jira
JIRA_API_TOKEN        = (สร้างที่ id.atlassian.com → Security → API tokens)
JIRA_PROJECT_KEY      = ตัวย่อโครงการ เช่น KAN หรือ TES
GOOGLE_CHAT_WEBHOOK_URL = https://chat.googleapis.com/...
LLM_PROVIDER          = gemini
GEMINI_API_KEY        = (สร้างที่ aistudio.google.com)
GEMINI_MODEL          = gemini-1.5-flash
BOT_NAME              = taskyapp
SESSION_SECRET        = (สุ่มตัวอักษร 32 ตัว)
CRON_SECRET           = (สุ่มตัวอักษร 16 ตัว)
```

> 💡 ดูรายละเอียดวิธีหาค่าแต่ละตัวได้ใน **complete_setup_guide.pdf**

### 3. Deploy
กดปุ่ม **Deploy** — รอประมาณ 2 นาที

### 4. ตรวจสอบระบบ
เปิด URL นี้เพื่อตรวจว่าตั้งค่าถูกต้อง:
```
https://[your-vercel-url]/api/health
```
ระบบจะแจ้งเป็นภาษาไทยว่าผ่านหรือยังมีส่วนใดผิดพลาด

### 5. ซิงค์ข้อมูลจาก Jira ครั้งแรก
```
https://[your-vercel-url]/api/cron/sync-tickets?secret=[CRON_SECRET]
```

### 6. ตั้งค่า Jira Webhook
Jira → Settings → System → Webhooks → Create:
- URL: `https://[your-vercel-url]/api/jira/webhook`
- Events: `Issue created`, `Issue updated`

### 7. ตั้งค่า Google Chat API
ดูรายละเอียดใน **complete_setup_guide.pdf** → เฟสที่ 4

---

## 💬 วิธีใช้งาน Bot

**ในห้องกลุ่ม (Space)** — ต้องพิมพ์ `@taskyapp` นำหน้าเสมอ:
```
@taskyapp สร้าง epic ระบบ Login พนักงาน
@taskyapp สร้าง job เขียนหน้า Login ในงาน KAN-1
@taskyapp แก้ไขวันกำหนดส่งของ KAN-1 เป็น 31/07/69
@taskyapp ปิดงาน KAN-1
@taskyapp ดูงานค้างทั้งหมด
@taskyapp ping
```

**คุยส่วนตัวกับบอท (DM)** — พิมพ์ได้เลยไม่ต้อง @:
```
ดูงานค้างทั้งหมด
```

---

## 📁 โครงสร้างโปรเจกต์

```
nextjs-app/
├── app/
│   ├── api/
│   │   ├── webhook/       ← รับ event จาก Google Chat
│   │   ├── jira/webhook/  ← รับ event จาก Jira
│   │   ├── health/        ← ตรวจสุขภาพระบบ
│   │   └── cron/          ← งาน scheduled (sync, summary)
│   ├── dashboard/         ← หน้า Dashboard
│   └── page.js            ← หน้า Login
├── components/
│   └── Dashboard.jsx      ← UI หลักของ Dashboard
├── lib/
│   ├── jira.js            ← Logic เชื่อมต่อ Jira API
│   ├── db.js              ← เชื่อมต่อ Supabase
│   ├── logs.js            ← Activity Logs
│   └── llm.js             ← AI (Gemini)
├── .env.example           ← Template ตัวแปรระบบ
└── vercel.json            ← Config Vercel (Cron jobs)
```

---

## 🔧 การเปลี่ยนชื่อบอทในอนาคต

1. **Google Cloud Console** → Google Chat API → Configuration → **App name** = ชื่อใหม่
2. **Vercel** → Settings → Environment Variables → **BOT_NAME** = ชื่อใหม่ → Redeploy

---

## 📄 เอกสารประกอบ

- **complete_setup_guide.pdf** — คู่มือตั้งค่าละเอียดทุกขั้นตอน (ภาษาไทย)
