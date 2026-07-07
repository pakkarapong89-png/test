# 🤖 คู่มือติดตั้งและตั้งค่าระบบ Bot Google Chat + Jira + Dashboard
> **จัดทำโดย:** `Antigravity AI` (พัฒนาโดยทีมงาน Google DeepMind)  
> *คู่มือฉบับปรับปรุงพิเศษ: เน้นความง่าย กระชับ แบ่งเป็นขั้นตอนที่ชัดเจน และมีข้อควรระวังสำคัญสำหรับทุกคน*

---

## 🧭 ภาพรวมการเชื่อมต่อระบบ
ก่อนเริ่มตั้งค่า มาทำความเข้าใจกันก่อนว่าแต่ละส่วนเชื่อมต่อกันอย่างไร:

```text
  [ สมาชิกทีมใน Google Chat ]
            │
            ▼ (สั่งผ่านการพิมพ์ @sekloso ...)
     [ Google Chat App ] 
            │
            ▼ (ส่งคำสั่งไปที่ URL ปลายทาง)
     [ Vercel Server (API) ] ◄───► [ Gemini AI ] (ช่วยวิเคราะห์ภาษาไทย/อังกฤษ)
            │
            ├───► [ Supabase DB ] (เก็บข้อมูลประวัติ/รายชื่อทีม/Cache)
            │
            ▼ (ยิง API ไปจัดการการทำงาน)
       [ Jira Cloud ]
            │
            ▼ (เมื่อตั๋วขยับ จะส่งสัญญาณกลับมาบอก)
    [ Jira Webhook ] ───► [ Dashboard บน Vercel ]
```

---

## 📋 เช็คลิสต์ 6 สิ่งที่ต้องเตรียม (เตรียมเสร็จ รันบอทได้ทันที!)

| สิ่งที่ต้องเตรียม | ค่าที่ต้องได้ | ใช้ทำอะไร? | แหล่งที่มา |
| :--- | :--- | :--- | :--- |
| **1. Supabase Connection** | `DATABASE_URL` | ใช้เก็บข้อมูลและแสดง Dashboard | [Supabase.com](https://supabase.com) |
| **2. Jira Domain** | `JIRA_DOMAIN` | ระบุหน้าเว็บ Jira ของทีม | หน้าเว็บ Jira ของคุณ |
| **3. Jira Account & Token** | `JIRA_EMAIL` & `JIRA_API_TOKEN` | สิทธิ์สั่งการสร้าง/แก้งานใน Jira | [Atlassian ID](https://id.atlassian.com) |
| **4. Jira Project Key** | `JIRA_PROJECT_KEY` | รหัสย่อโปรเจกต์ เช่น `KAN`, `TES` | หน้าบอร์ด Jira |
| **5. Gemini API Key** | `GEMINI_API_KEY` | สมองกลของบอท | [Google AI Studio](https://aistudio.google.com) |
| **6. Google Chat Webhook** | `GOOGLE_CHAT_WEBHOOK_URL` | ยิงแจ้งเตือนและส่งรายงานรายวัน | ในห้องแชท Google Chat |

---

## 🛠️ ขั้นตอนการทำแบบทีละสเต็ป (Step-by-Step)

### 1️⃣ การตั้งค่าฐานข้อมูล Supabase (`DATABASE_URL`)
1. เข้าเว็บ [Supabase.com](https://supabase.com) และสร้างโปรเจกต์ใหม่
2. ตั้งชื่อโปรเจกต์และ **บันทึกรหัสผ่านฐานข้อมูล (Database Password)** ไว้ให้ดี
3. ไปที่เมนู **Connect** (ปุ่มมุมขวาบน) ➔ เลือกแท็บ **ORMs / Connection Pooler**
4. เลือกโหมด **Transaction** (แนะนำสำหรับ Vercel เพราะประหยัด Connection)
5. Copy ลิงก์ที่ขึ้นต้นด้วย `postgresql://...`
6. **แก้ไขคำว่า `[YOUR-PASSWORD]`** เป็นรหัสผ่านจริงที่คุณตั้งไว้ในขั้นตอนแรก

> [!WARNING]
> ห้ามลืมเปลี่ยนรหัสผ่านในลิงก์เด็ดขาด! พอร์ตมาตรฐานสำหรับโหมด Transaction คือ `6543`

---

### 2️⃣ การตั้งค่าเชื่อมต่อ Jira Cloud
*   **JIRA_DOMAIN:** ชื่อโดเมนหน้า Jira ของคุณ (ตัด `https://` และ path ข้างหลังออก) เช่น `mycompany.atlassian.net`
*   **JIRA_PROJECT_KEY:** รหัสย่อโปรเจกต์ เช่น ตั๋วงานชื่อ `TES-12` คีย์โครงการคือ `TES`
*   **JIRA_EMAIL:** อีเมลของบัญชี Jira ที่จะใช้สั่งบอท
*   **JIRA_API_TOKEN:** 
    1. เข้าไปที่ [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
    2. กด **Create API token**
    3. ตั้งชื่อบอท แล้วคัดลอกรหัสยาวๆ เก็บไว้ (รหัสจะแสดงแค่ครั้งเดียว)

---

### 3️⃣ การตั้งค่าสมองกล Google Gemini API Key
1. เข้าไปที่ [Google AI Studio](https://aistudio.google.com/app/apikey)
2. กดปุ่ม **Create API Key**
3. คัดลอก Key ที่ได้มา

> [!IMPORTANT]
> **ข้อสังเกตเกี่ยวกับ API Key ของ Google:**
> *   Key ของ Gemini API จริง **ต้องขึ้นต้นด้วย `AIzaSy...` เท่านั้น**
> *   หาก Key ที่คุณได้ขึ้นต้นด้วย `AQ...` หรือรูปแบบอื่น นั่นคือ **Jira API Token** อย่าสับสนกันนะครับ!

---

### 4️⃣ การตั้งค่าระบบแจ้งเตือนเข้า Google Chat Webhook
1. เปิดห้องแชทกลุ่มใน **Google Chat** ที่คุณต้องการให้บอทแจ้งเตือน
2. คลิกที่ชื่อห้องด้านบน ➔ เลือก **Apps & integrations** ➔ คลิก **Add webhooks**
3. ตั้งชื่อบอท เช่น `Jira Alert` จากนั้นกดบันทึก
4. คัดลอกลิงก์ Webhook URL ที่ได้มาเก็บไว้สำหรับตัวแปร `GOOGLE_CHAT_WEBHOOK_URL`

---

### 5️⃣ เปิดตัวบอทในระบบ Google Chat (Google Chat App)
ขั้นตอนนี้ใช้สำหรับการทำให้บอทสามารถรับคำสั่งจากการพิมพ์ `@sekloso` ได้:
1. เข้า [Google Cloud Console](https://console.cloud.google.com)
2. เปิดใช้งาน (Enable) บริการ **Google Chat API**
3. ไปที่แถบ **Configuration** ของ Chat API แล้วตั้งค่าดังนี้:
   *   **App name:** ชื่อบอท เช่น `sekloso`
   *   **Interactive features:** ติ๊กเลือก `Receive 1:1 messages` และ `Join spaces`
   *   **Connection settings:** เลือก **App URL** แล้วกรอก URL บอทจาก Vercel:
       `https://YOUR_APP_NAME.vercel.app/api/webhook`
4. กดบันทึก

---

### 6️⃣ การตั้งค่าเพื่อดึงข้อมูลจาก Jira กลับมาอัปเดต (Jira Webhook)
เพื่อให้ตารางหน้า Dashboard อัปเดตสถานะแบบ Real-time เมื่อมีคนขยับตั๋วบน Jira:
1. ใน Jira ไปที่ **Settings (รูปเฟือง) ➔ System ➔ Webhooks**
2. กด **Create a WebHook**
3. ตั้งค่าชื่อและใส่ URL ปลายทางของเว็บคุณ:
   `https://YOUR_APP_NAME.vercel.app/api/jira/webhook`
4. ในส่วน **JQL** (ค้นหาจำกัดโครงการ) ใส่: `project = JIRA_PROJECT_KEY_ของคุณ` (เช่น `project = TES`)
5. ในส่วน **Issue events** ให้ติ๊กเลือก:
   *   `created` (เมื่อสร้างตั๋ว)
   *   `updated` (เมื่อแก้งาน/ย้ายตู้)
   *   `deleted` (เมื่อลบตั๋ว)
6. กดบันทึก (Save) ด้านล่างสุด

---

## 📝 การบันทึกค่าและ Deploy ขึ้น Vercel

### 📂 การทดสอบบนเครื่องคอมพิวเตอร์ของคุณ (Local)
1. เปิด Terminal ในโฟลเดอร์โปรเจกต์ `nextjs-app`
2. รันคำสั่ง `npm run setup` ระบบจะมีโปรแกรมพิมพ์โต้ตอบเพื่อช่วยคุณสร้างไฟล์ `.env` อัตโนมัติ
3. เมื่อเสร็จแล้ว รันบอทจำลองในเครื่องด้วยคำสั่ง:
   ```bash
   npm run dev
   ```
4. เปิดเบราว์เซอร์ไปที่ `http://localhost:3000/api/health` หากขึ้นว่า `"overall": "ready"` แสดงว่าระบบพร้อมใช้งาน!

### ☁️ การนำขึ้นระบบจริง (Vercel)
1. Push โค้ดโปรเจกต์ขึ้นคลัง **GitHub** (ตรวจสอบให้แน่ใจว่าไฟล์ `.env` ไม่หลุดขึ้นไปด้วย)
2. ที่หน้าเว็บ **Vercel** นำเข้าโปรเจกต์ (Import) จาก GitHub ของคุณ
3. ไปที่ **Project Settings ➔ Environment Variables** และกรอกค่าทั้ง 6 รายการที่เตรียมไว้ด้านบนลงไป
4. สุ่มสร้างคีย์ความปลอดภัยระบบเพิ่มเติมอีก 2 ตัว:
   *   `SESSION_SECRET`: คีย์ความปลอดภัยสำหรับหน้าเว็บ Dashboard
   *   `CRON_SECRET`: รหัสลับสำหรับป้องกันคนนอกเข้ามายิงระบบแจ้งเตือนสรุปรายวัน
5. กด **Deploy** แล้วระบบจะเริ่มทำงานทันที!

---

## 🎛️ สรุปคำสั่งสั่งการบอท (ภาษาพูดเข้าใจง่าย)

พิมพ์คุยกับบอทใน Google Chat โดยพิมพ์ชื่อบอทนำหน้าทุกครั้ง:

*   **ทดสอบระบบ:** `@sekloso ping`
*   **สร้างงานใหญ่ (Epic):** `@sekloso เพิ่มงาน ระบบชำระเงิน`
*   **สร้างงานย่อย (Task):** `@sekloso สร้าง job เขียน API ในงาน TES-5` *(อ้างอิงรหัส Epic แม่ทุกครั้ง)*
*   **เปลี่ยนสถานะตั๋ว:** `@sekloso ปิดงาน TES-5` หรือ `@sekloso ย้าย TES-5 ไปกำลังทำ`
*   **ตรวจสอบงานคงเหลือ:** `@sekloso ดูงานค้างทั้งหมด`

---

## 🔧 ไขปัญหาที่พบบ่อย (Troubleshooting)

#### ❌ บอทขึ้นเตือน "บอทไม่ตอบสนอง" หลังส่งข้อความ
*   **สาเหตุที่ 1:** API Key ของ Gemini ผิดพลาด ตรวจสอบว่าคีย์ขึ้นต้นด้วย `AIzaSy` หรือไม่ (หากเป็น `AQ` จะกลายเป็น Jira Token ซึ่งจะทำให้ระบบค้างและทำงานผิดพลาด)
*   **สาเหตุที่ 2:** URL ใน Google Chat API Configuration (ขั้นตอนที่ 5) ใส่ไม่ถูกต้อง หรือลืมพิมพ์ `/api/webhook` ต่อท้าย URL หลัก

#### ❌ ข้อมูลใน Dashboard ไม่ยอมอัปเดตเมื่อแก้ตั๋วใน Jira
*   **วิธีแก้:** ตรวจสอบการตั้งค่า Jira Webhook ในขั้นตอนที่ 6 ว่าใส่ URL ปลายทางถูกต้องและติ๊กเลือก Event ครบถ้วนแล้วหรือไม่

#### ❌ หน้าเว็บ Dashboard ขึ้นหน้าจอโล่งๆ หรือเข้าใช้งานไม่ได้
*   **วิธีแก้:** รันการทำงานดึงข้อมูลครั้งแรก (Initial Sync) โดยการเรียก URL:  
    `https://YOUR_APP_NAME.vercel.app/api/cron/sync-tickets?secret=CRON_SECRET_ของคุณ`

---
> **คู่มือนี้เขียนและเรียบเรียงโครงสร้างโดย:** `Antigravity AI (Google DeepMind)`  
> *ขอให้สนุกกับการพัฒนาบอทตัวช่วยดูแลบอร์ดงานของทีมครับ!*
