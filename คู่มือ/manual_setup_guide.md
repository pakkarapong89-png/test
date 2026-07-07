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

## 🔑 สเต็ปที่ 1: การขอข้อมูลและคีย์ API สำคัญ (ทีละขั้นตอนอย่างละเอียด)
ให้เปิดล็อกอิน (Login) บัญชีผู้ใช้งานค้างไว้ในเว็บเบราว์เซอร์ และคัดลอกค่ารหัสต่างๆ ด้านล่างนี้ไปจดลงในโปรแกรม Notepad บนเครื่องคอมพิวเตอร์ของคุณเตรียมไว้ครับ:

### 1.1 ลิงก์เชื่อมฐานข้อมูล Supabase (`DATABASE_URL`)
*จุดประสงค์: ใช้เพื่อให้บอตสามารถเชื่อมต่อและเก็บบันทึกประวัติตั๋วงานทั้งหมดได้*
1. เข้าเว็บไซต์ **[Supabase.com](https://supabase.com/)** -> คลิกปุ่มสีเขียว **"Start your project"** หรือสมัครสมาชิกผ่านบัญชี GitHub ให้เรียบร้อย
2. เมื่อเข้ามาหน้าแรก ให้คลิกปุ่มสีเขียว **"New Project" (สร้างโครงการใหม่)** -> เลือกชื่อองค์กรของคุณ
3. กรอกรายละเอียดดังนี้:
   * **Name (ชื่อโปรเจกต์):** พิมพ์ตั้งชื่อตามชอบ เช่น `Tasky-Jira-Bot`
   * **Database Password:** **⚠️ สำคัญมาก:** ตั้งรหัสผ่านฐานข้อมูลที่มีความปลอดภัย แล้วก๊อปปี้รหัสผ่านจริงตัวนี้จดแยกใส่ Notepad เก็บไว้ทันที (เพราะระบบจะไม่แสดงรหัสนี้ให้เห็นอีก และต้องนำไปใช้งานต่อในข้อ 6)
   * **Region:** เลือกเป็น `Singapore (ap-southeast-1)` (เพื่อให้เซิร์ฟเวอร์อยู่ใกล้ไทยและทำงานได้ไวที่สุด)
   * **Pricing Plan:** เลือกเป็น `Free`
4. คลิกปุ่มสีเขียว **"Create new project"** -> รอระบบเตรียมการประมาณ 1-2 นาที (สังเกตไอคอนวงกลมหมุนๆ จนกระทั่งฐานข้อมูลสร้างเสร็จสมบูรณ์)
5. เมื่อเข้ามาที่หน้าแรกของโครงการแล้ว มองไปที่แถบสีดำด้านบนสุดขวามือ คลิกปุ่มสีเขียวคำว่า **"Connect"** (อยู่ข้างชื่อโครงการของคุณ)
6. ในป๊อปอัปสี่เหลี่ยมที่เด้งขึ้นมา ให้คลิกเลือกแท็บคำว่า **"Direct"** ที่อยู่ด้านบน
7. ในหน้าจอของแท็บ Direct ให้กรอกตั้งค่า 2 ข้อดังนี้:
   * **Connection Method:** ติ๊กเลือกที่หัวข้อ **"Transaction pooler"**
   * **Type:** คลิกเลือกที่คำว่า **"URI"**
8. สังเกตกล่องสีดำที่มีลิงก์ขึ้นต้นด้วย `postgres://...` ให้คลิกปุ่ม **"Copy"** ที่อยู่มุมขวาของกล่องนั้นเพื่อคัดลอกลิงก์
9. เอาลิงก์มาวางใน Notepad แล้วสังเกตตัวหนังสือคำว่า **`[YOUR-PASSWORD]`** ให้ลบคำนี้ออก (รวมทั้งวงเล็บเหลี่ยมด้วย) แล้วนำ **รหัสผ่านจริง** ที่คุณตั้งไว้ในข้อ 3 มาพิมพ์ใส่แทนที่ตรงจุดนั้นเป๊ะๆ 
   * *ตัวอย่างค่าที่ได้:* `postgres://postgres.abc:MyRealPassword123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`


### 1.2 ข้อมูลการล็อกอินและเชื่อมต่อกับ Jira Cloud
1. **JIRA_DOMAIN (โดเมนของบริษัท):** เปิดหน้าเบราว์เซอร์ใช้งาน Jira บอร์ดหลักปกติ สังเกตแถบที่อยู่เว็บด้านบน (URL) ก๊อปปี้เอาเฉพาะท่อนโดเมน เช่น `mycompany.atlassian.net` (ห้ามพิมพ์ `https://` หรือเครื่องหมายขีดทับ `/` ต่อท้ายเด็ดขาด)
2. **JIRA_EMAIL:** กรอกที่อยู่อีเมลที่คุณใช้เข้าใช้งานระบบ Jira ของที่ทำงานปกติ
3. **JIRA_API_TOKEN (รหัสผ่านเชื่อมโยงข้อมูล):**
   * เข้าหน้าจัดการของ Atlassian: **[Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)**
   * คลิกปุ่มสีน้ำเงิน **"Create API token"**
   * ระบบจะให้ตั้งชื่อป้ายกำกับ ให้ตั้งว่า `Jira-GoogleChat-Bot` แล้วกด **Create**
   * หน้าต่างจะแสดงรหัสคีย์ที่ขึ้นต้นด้วย **`ATATT...`** ให้กดปุ่ม **"Copy"** เก็บเข้า Notepad ทันที 
     *(⚠️ คำเตือน: รหัสนี้จะแสดงครั้งเดียวตอนกดสร้าง หากปิดหน้าจอไปแล้วจะไม่สามารถกดดูใหม่ได้ ต้องกดสร้างใหม่เท่านั้นครับ)*
4. **JIRA_PROJECT_KEY (คีย์ย่อโครงการ):** สังเกตชื่อรหัสตั๋วงานใน Jira ของคุณ เช่น ตั๋วงานมีชื่อรหัสว่า `DEV-120` หรือ `TES-99` ให้เอาเฉพาะส่วนหน้าขีดคือ **`DEV`** หรือ **`TES`** (พิมพ์ตัวพิมพ์ใหญ่ทั้งหมด)

### 1.3 ลิงก์ห้องแชท Google Chat Webhook URL
*จุดประสงค์: เป็นท่อปลายทางเพื่อให้บอตสามารถส่งข้อความไปหาคนในทีมได้*
1. เปิดหน้าแอป **Google Chat** ในคอมพิวเตอร์ของคุณ
2. เอาเมาส์ไปชี้ที่ชื่อห้องกลุ่ม (Space) ของทีมคุณ -> คลิกที่เครื่องหมายสามจุด `...` (หรือคลิกที่ชื่อกลุ่มด้านบนสุดของหน้าจอแชท) -> เลือกเมนู **"Apps & integrations" (แอปและการบูรณาการ)** 
3. คลิกเลือกเมนูย่อย **"Webhooks"**
4. คลิกปุ่ม **"Add webhook"** (หรือกดปุ่มเพิ่ม) -> ตั้งชื่อโปรไฟล์ของบอตตามใจชอบ เช่น `Tasky Alert Bot` -> คลิกปุ่ม **Save (บันทึก)**
5. กดปุ่ม **"Copy"** ลิงก์ที่เด้งขึ้นมาเก็บไว้ (ขึ้นต้นด้วย `https://chat.googleapis.com/v1/spaces/...`)

### 1.4 รหัส Gemini API Key (คีย์สมองบอต AI)
*จุดประสงค์: เพื่อใช้ปัญญาประดิษฐ์มาสรุปแจกแจงงานด่วนและวิเคราะห์ทีมงาน*
1. เปิดหน้าเว็บ **[Google AI Studio](https://aistudio.google.com/)** แล้วล็อกอินด้วยบัญชี Gmail/Google ทั่วไป
2. มองหาแท็บเมนูด้านซ้ายบนสุด คลิกที่เมนูรูปไอคอนกุญแจเขียนว่า **"Get API key"**
3. คลิกปุ่มสีน้ำเงินคำว่า **"Create API key"**
4. หน้าต่างย่อยจะเด้งขึ้นมา ให้เลือกสร้างคีย์ในโปรเจกต์ใหม่ หรือเลือกโปรเจกต์เดิมที่มีอยู่ แล้วคลิกยืนยันสร้าง
5. คลิกปุ่ม **"Copy"** รหัสคีย์ยาวๆ ที่ระบบสรุปให้มา (รหัสจะขึ้นต้นด้วยตัวอักษรย่อ **`AQ.`** หรือ **`AL.`** เสมอ) ก๊อปปี้ไปวางรอไว้ใน Notepad ครับ

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

5. คลิกปุ่มสีเขียว **"Run"** ที่มุมล่างขวา (หรือกดปุ่ม `Ctrl + Enter` บนคีย์บอร์ด) เพื่อประมวลผลคำสั่งสร้างตารางทั้งหมด
6. **สร้างบัญชีผู้ดูแลระบบหลัก (Admin User):**
   * ลบโค้ดเก่าในกล่อง SQL Editor ออกทั้งหมด
   * คัดลอกคำสั่ง SQL สำหรับป้อนข้อมูลผู้ใช้งานแอดมินเริ่มต้นด้านล่างนี้ลงไป:
     ```sql
     -- คำสั่งเพิ่มผู้ใช้ Admin เข้าสู่ตาราง เพื่อนำไปใช้ล็อกอินหน้า Dashboard
     -- (โดยบัญชีนี้จะมีชื่อล็อกอินว่า: admin และรหัสผ่านคือ: admin123)
     INSERT INTO users (username, password_hash, salt, name, email, role, is_approved)
     VALUES (
       'admin', 
       '457bd77b738e4a9e52541db8b5df40d7c3dbb9fa54a19b8ee49195d5279b908b9826f4974917540788102a90da3d1796c9c614b8a4f9104b2b467651048b26ef', 
       '73238596645391a3c617c72957bdc026', 
       'Administrator', 
       'admin@example.com', 
       'Admin', 
       true
     );
     ```
   * *💡 ข้อแนะนำ:* คุณสามารถเปลี่ยนคำว่า `'admin'` ในบรรทัดแรกให้เป็นชื่ออื่น และเปลี่ยนอีเมลตามต้องการได้ครับ ส่วนรหัสผ่านจะถูกตั้งต้นเป็น `admin123` ซึ่งเมื่อหน้าเว็บ Dashboard ของคุณรันออนไลน์เรียบร้อยแล้ว ค่อยล็อกอินเข้าไปกดเปลี่ยนรหัสผ่านใหม่จากหน้าเว็บได้ทันทีครับ
   * คลิกปุ่มสีเขียว **"Run"** อีกครั้ง เพื่อเปิดการทำงานบัญชี

---

## 📝 สเต็ปที่ 3: การเขียนไฟล์ค่ากำหนดสภาพแวดล้อม (Local Configuration)
เมื่อจัดแจงข้อมูลส่วนหลังบ้านเสร็จแล้ว ต่อมาเราจะนำค่าทั้งหมดมาผูกลงในไฟล์ตั้งค่าของโปรเจกต์ครับ:

1. เปิดโฟลเดอร์หลักของโปรเจกต์คุณขึ้นมาในคอมพิวเตอร์
2. **เปิดการแสดงผลนามสกุลไฟล์บนระบบ Windows (สำคัญมาก):**
   * หากใช้ Windows 11: คลิกที่เมนู **View** ด้านบนสุด -> ชี้ไปที่ **Show** -> ติ๊กเลือก **"File name extensions" (นามสกุลไฟล์)**
   * หากใช้ Windows 10: คลิกที่แท็บ **View** ด้านบนสุดของหน้าต่าง -> ติ๊กถูกที่ช่อง **"File name extensions" (นามสกุลไฟล์)**
   * *⚠️ หากไม่ทำข้อนี้ เวลาเปลี่ยนชื่อไฟล์อาจจะกลายเป็น `.env.txt` ซึ่งโปรแกรมจะไม่ยอมรับและรันไม่ผ่านครับ*
3. ค้นหาไฟล์ตัวอย่างที่ชื่อ `.env.example` -> คลิกขวาเลือก **Copy (คัดลอก)** และกด **Paste (วาง)** ในโฟลเดอร์เดิม
4. ทำการเปลี่ยนชื่อไฟล์ที่เพิ่งสร้างใหม่นี้ให้เหลือแค่ **`.env`** (ลบตัวหนังสือ `.example` ออกให้หมด เหลือเพียงจุดทศนิยมและคำว่า env)
5. คลิกขวาที่ไฟล์ `.env` เลือกเปิดด้วยโปรแกรม **Notepad** (หรือโปรแกรมเขียนโค้ดอื่นๆ เช่น VS Code) แล้วพิมพ์ใส่ข้อมูลแทนที่ลงไปทีละคู่ดังนี้ครับ:

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
