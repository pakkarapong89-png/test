# 📋 คู่มือการตั้งค่าระบบบอตด้วยตนเอง (Manual Setup & Configuration Guide)
> [!NOTE]
> คู่มือฉบับนี้อธิบายขั้นตอนการติดตั้งระบบบอต Jira + แดชบอร์ดตามวิธีปกติทีละขั้นตอนโดยตรง (ไม่ผ่านสคริปต์อัตโนมัติ) เพื่อให้คุณควบคุมกระบวนการตั้งค่าฐานข้อมูล คีย์ระบบ และไฟล์ `.env` ได้อย่างแม่นยำ

---

## 🧭 ลำดับขั้นตอนการติดตั้ง (Workflow Overview)
การติดตั้งระบบแบบปกติแบ่งออกเป็น 5 สเต็ปหลักดังนี้ครับ:
1. **การขอข้อมูลและคีย์ API สำคัญ** (Credentials Gathering)
2. **การเตรียมฐานข้อมูลและการรันคำสั่ง SQL** (Supabase Database Initialization)
3. **การเขียนไฟล์ค่ากำหนดสภาพแวดล้อม** (Local `.env` Configuration)
4. **การ Deploy ขึ้นระบบเว็บจริงบน Vercel** (Cloud Deployment)
5. **การเชื่อมระบบ Webhooks** (Jira & Google Chat Integrations)

---

## 🔑 สเต็ปที่ 1: การขอข้อมูลและคีย์ API สำคัญ
ให้สมัครใช้งาน ล็อกอิน และเก็บค่าตัวแปรเหล่านี้ลงในแผ่นจดบันทึก (Notepad) ครับ:

### 1.1 ลิงก์เชื่อมฐานข้อมูล Supabase (`DATABASE_URL`)
1. เข้าเว็บ **[Supabase.com](https://supabase.com/)** สร้างโปรเจกต์ใหม่ (**New Project**) และตั้ง Database Password
2. คลิกปุ่มสีเขียว **"Connect"** ที่แถบเมนูด้านบนสุดของโปรเจกต์
3. ในหน้าต่างที่เด้งขึ้นมา เลือกแท็บ **"Direct"** ด้านบนสุด
4. สังเกตหัวข้อ **Connection Method** เลือกเป็น **"Transaction pooler"**
5. เลือกช่อง **Type** ด้านล่างให้เป็น **"URI"**
6. กดปุ่มคัดลอก (Copy) ลิงก์ที่ขึ้นต้นด้วย `postgres://...`
7. นำคำว่า `[YOUR-PASSWORD]` ในลิงก์ออกแล้วพิมพ์**รหัสผ่านจริง**ของคุณใส่แทน 
   *(ตัวอย่าง: `postgres://postgres.abc:Password123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`)*

### 1.2 ข้อมูลฝั่ง Jira Cloud
1. **JIRA_DOMAIN:** ชื่อโดเมนของบอร์ดหลัก เช่น `mycompany.atlassian.net` (ห้ามมี https:// หรือตัวอักษรต่อท้าย)
2. **JIRA_EMAIL:** อีเมลที่คุณใช้เข้าใช้งานระบบ Jira
3. **JIRA_API_TOKEN:** 
   * เปิดหน้าเว็บ Atlassian: **[Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)**
   * คลิก **"Create API token"** ตั้งชื่อกำกับ -> กดปุ่มสร้างแล้วกด **Copy** รหัสที่ขึ้นต้นด้วย **`ATATT...`**
4. **JIRA_PROJECT_KEY:** รหัสย่อโครงการใน Jira ของทีมคุณ เช่น ตัวเลขตั๋วงานขึ้นต้นด้วย `TES-12` ให้ก๊อปปี้มาเฉพาะ **`TES`** (พิมพ์ตัวพิมพ์ใหญ่)

### 1.3 ลิงก์ห้องแชท Google Chat Webhook URL
1. เปิดแอป **Google Chat** ในคอมพิวเตอร์ของคุณ
2. เข้าไปใน Space กลุ่มงานของทีม -> คลิกชื่อห้องด้านบนสุด -> เลือก **Apps & integrations** -> เลือก **Webhooks**
3. คลิกปุ่ม **"Add webhook"** ตั้งชื่อบอต เช่น `Jira Alert Bot` -> กด Save
4. คัดลอกลิงก์ Webhook ที่ระบบสร้างมาให้เก็บไว้ (ขึ้นต้นด้วย `https://chat.googleapis.com/...`)

### 1.4 รหัส Gemini API Key
1. เปิดเว็บ **[Google AI Studio](https://aistudio.google.com/)** -> ล็อกอินด้วยบัญชี Google ของท่าน
2. คลิก **"Get API key"** ที่แถบเครื่องมือซ้ายบน -> คลิกปุ่มสีน้ำเงิน **"Create API key"**
3. คัดลอกรหัสคีย์ที่ได้รับ (รหัสจะขึ้นต้นด้วยตัวย่อ **`AQ.`** หรือ **`AL.`**)

---

## 🗄️ สเต็ปที่ 2: การสร้างตารางฐานข้อมูลใน Supabase (Database Setup)
เนื่องจากเราทำรายการแบบปกติ เราจะสร้างตารางจัดเก็บข้อมูลโดยใช้การรันคำสั่ง SQL ผ่านหน้าจอเว็บโดยตรงครับ:

1. เปิดหน้าโครงการของคุณใน **[Supabase.com](https://supabase.com/)**
2. มองหาแถบเครื่องมือเมนูด้านซ้าย คลิกเลือกที่เมนู **"SQL Editor"** (ไอคอนรูปกล่องคำสั่ง SQL `>_`)
3. คลิกปุ่ม **"New Query"** เพื่อสร้างหน้าเอกสารเปล่าใหม่
4. คัดลอกคำสั่งสร้างตาราง SQL ด้านล่างนี้ไปวางลงในช่องพิมพ์ข้อความ:

```sql
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
  role VARCHAR(100) NOT NULL DEFAULT 'Admin',
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
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
```

5. คลิกปุ่มสีเขียว **"Run"** ที่มุมล่างขวาเพื่อประมวลผลคำสั่ง เมื่อขึ้นข้อความสำเร็จ ตารางทั้งหมดจะถูกสร้างขึ้นมารอใช้งานทันทีครับ
6. **สร้างบัญชีผู้ดูแลระบบ (Admin User):**
   * หากต้องการสร้างผู้ใช้งานเพื่อเข้าใช้งานระบบ Dashboard สามารถไปที่แถบเมนูด้านซ้าย เลือก **Table Editor** -> คลิกตาราง **users** -> คลิกปุ่ม **Insert row** กรอกข้อมูลชื่อผู้ใช้งานและบัญชีผู้ใช้นำระบบได้โดยตรง

---

## 📝 สเต็ปที่ 3: การเขียนไฟล์ค่ากำหนดสภาพแวดล้อม (Local Configuration)
เมื่อเตรียมระบบหลังบ้านเสร็จแล้ว ต่อมาเราจะผูกค่าตัวแปรไว้ใช้รันงานในเครื่องคอมพิวเตอร์ครับ:

1. เปิดโฟลเดอร์โปรเจกต์ของคุณขึ้นมา
2. ค้นหาไฟล์ตัวอย่างที่ชื่อ `.env.example`
3. คัดลอกและสร้างใหม่พร้อมตั้งชื่อไฟล์ว่า **`.env`** (ห้ามมีนามสกุลไฟล์ต่อท้าย)
4. เปิดไฟล์ `.env` ด้วยโปรแกรม Notepad หรือโปรแกรมแก้ไขโค้ด แล้วใส่ค่าลงไปทีละบรรทัดดังนี้:

```env
# ฐานข้อมูล Supabase
DATABASE_URL="ใส่ลิงก์ URI ที่มีรหัสผ่านแล้วจากสเต็ป 1.1"

# ข้อมูลการซิงก์ Jira
JIRA_DOMAIN="ชื่อโดเมนจากสเต็ป 1.2"
JIRA_EMAIL="อีเมลผู้ดูแล Jira"
JIRA_API_TOKEN="รหัสคีย์ API Token ขึ้นต้นด้วย ATATT..."
JIRA_PROJECT_KEY="คีย์ย่อของโครงการ Jira เช่น DEV"

# การส่งข้อมูลห้องแชท
GOOGLE_CHAT_WEBHOOK_URL="ลิงก์ webhook ที่ได้จากข้อ 1.3"

# สมองวิเคราะห์ AI
LLM_PROVIDER="gemini"
GEMINI_API_KEY="คีย์ขึ้นต้นด้วย AQ. หรือ AL. ที่ได้จากข้อ 1.4"
GEMINI_MODEL="gemini-3.5-flash"

# รหัสตั้งค่าระบบความปลอดภัย (สุ่มตัวอักษรและตัวเลขความยาว 32 ตัวอักษรขึ้นไป)
SESSION_SECRET="สุ่มตัวอักษรและตัวเลขความยาวเพื่อความปลอดภัยล็อกอิน"
CRON_SECRET="สุ่มตัวอักษรและตัวเลขสำหรับใช้เป็นรหัสยิง Sync"

# ข้อมูลบอต
BOT_NAME="TaskyBot"
```

---

## 🚀 สเต็ปที่ 4: การ Deploy ขึ้นระบบเว็บจริงบน Vercel (Production Deployment)
1. นำไฟล์ซอร์สโค้ดโปรเจกต์ทั้งหมดอัปโหลดขึ้น GitHub Repository ส่วนตัว (Private Repository) ของคุณ
2. ล็อกอินเข้าเว็บ **Vercel.com** -> คลิกปุ่ม **"Add New"** -> เลือก **"Project"**
3. คลิกปุ่ม **"Import"** หน้าตัว Repository โปรเจกต์ดังกล่าว
4. เลื่อนหน้าจอลงมาหาหัวข้อ **Environment Variables**
5. ก๊อปปี้ชื่อตัวแปรและข้อมูลจากไฟล์ `.env` ที่เราเพิ่งเขียนในข้อที่ 3 มาเพิ่มลงไปทีละคู่จนครบถ้วน
6. คลิกปุ่มสีน้ำเงินคำว่า **"Deploy"**
7. รอการประมวลผลประมาณ 1-2 นาที คุณจะได้ลิงก์หน้าเว็บหลักระบบบอตมา (ตัวอย่างลิงก์: `https://my-jira-bot.vercel.app`) ให้ก๊อปปี้ไว้ใช้ผูกเว็บฮุคในสเต็ปถัดไปครับ

---

## 🔌 สเต็ปที่ 5: การเชื่อมระบบ Webhooks
ขั้นตอนนี้จะทำให้ฝั่ง Jira และ Google Chat ยิงข่าวสารตอบสนองกลับมาหาตัวแอป Vercel ของเราได้ครับ:

### 5.1 ตั้งค่าเว็บฮุคฝั่ง Jira Cloud (เพื่อให้ตั๋วซิงก์เข้าแดชบอร์ดอัตโนมัติ)
1. เปิดหน้าเว็บ Jira ล็อกอินในฐานะผู้ดูแล
2. ไปที่หน้าเมนู: **Settings (ฟันเฟืองขวาบน)** -> **System** -> เลื่อนเมนูด้านซ้ายล่างสุด คลิกเลือก **Webhooks**
3. คลิกปุ่มสีน้ำเงินคำว่า **"Create a Webhook"**
4. กรอกข้อมูลตั้งค่าดังนี้:
   * **Name:** พิมพ์ตั้งชื่อบอต `Sync to Dashboard`
   * **Status:** ติ๊กเลือก `Enabled`
   * **URL:** วางลิงก์เว็บ Vercel ของคุณ และพิมพ์คำว่า `/api/jira/webhook` ต่อท้าย (เช่น `https://my-jira-bot.vercel.app/api/jira/webhook`)
   * **JQL Filter:** พิมพ์สูตรกรองดังนี้ `project = "รหัสย่อโครงการของคุณ"` (เช่น `project = "DEV"`) เพื่อระบุดึงงานเฉพาะโปรเจกต์นี้
   * **Events:** เลื่อนลงไปหาหมวดหมู่ที่ชื่อ **Issue** ติ๊กถูกในช่อง **Created**, **Updated**, และ **Deleted**
5. เลื่อนลงไปด้านล่างสุด แล้วคลิกปุ่ม **"Create"**

### 5.2 ตั้งค่าเว็บฮุคฝั่ง Google Chat App (เวลาคนพิมพ์ตอบรับบอต)
1. เปิดเข้าหน้าเว็บ **[Google Cloud Console](https://console.cloud.google.com/)** เลือกโปรเจกต์ของงานคุณ
2. ค้นหาเปิดบริการที่ชื่อ **"Google Chat API"** แล้วคลิกเปิดใช้งาน (**Enable**)
3. คลิกเมนูการกำหนดค่า **"Configuration"** ด้านซ้ายมือ กรอกชื่อบอตและรูปภาพโปรไฟล์ตามชอบ
4. เลื่อนลงมาหาหัวข้อตั้งค่า **Connection settings** ติ๊กเลือกที่หัวข้อ **"Webhook URL"**
5. นำลิงก์แอป Vercel ของคุณมากรอก และพิมพ์คำว่า `/api/webhook` ต่อท้าย (เช่น `https://my-jira-bot.vercel.app/api/webhook`)
6. คลิกปุ่ม **"Save" (บันทึก)** ด้านล่างสุด

---

## 🏁 สเต็ปที่ 6: การเริ่มระบบดึงประวัติครั้งแรก (First Sync)
1. เปิดเบราว์เซอร์ใหม่ขึ้นมา
2. เรียกใช้ URL คำสั่งซิงก์ข้อมูลดังนี้:
   `https://[ลิงก์_Vercel_ของคุณ]/api/cron/sync-tickets?secret=[รหัส_CRON_SECRET_ที่คุณตั้งไว้ในข้อ_3]`
   *(ตัวอย่าง: `https://my-jira-bot.vercel.app/api/cron/sync-tickets?secret=my_custom_secret_123`)*
3. เมื่อขึ้นข้อความระบุว่า `sync success` บนหน้าจอ แปลว่าการซิงก์ดึงตั๋วงานเริ่มต้นขึ้นสมบูรณ์แบบ แดชบอร์ดพร้อมทำงานตอบกลับได้เรียบร้อยครับ! 🎉
