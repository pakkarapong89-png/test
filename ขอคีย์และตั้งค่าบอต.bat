@echo off
chcp 65001 > nul
title โปรแกรมช่วยขอคีย์ API และตั้งค่าระบบบอตอัตโนมัติ

echo ==============================================================
echo       🤖 โปรแกรมช่วยขอคีย์ API และตั้งค่าระบบบอต (One-Click Setup)
echo ==============================================================
echo.
echo สวัสดีครับ! โปรแกรมนี้จะช่วยทุ่นแรงให้คุณผู้ใช้เปิดลิงก์สำหรับขอค่า API ต่างๆ 
echo บนเว็บเบราว์เซอร์โดยอัตโนมัติ และจะพาท่านเข้าสู่ขั้นตอนการตั้งค่าต่อทันทีครับ
echo.
echo --------------------------------------------------------------
echo [*] กำลังตรวจเช็คความพร้อมของ Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบการติดตั้ง Node.js ในเครื่องนี้!
    echo กรุณาดาวน์โหลดและติดตั้ง Node.js ก่อนรันสคริปต์นี้: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [✓] ตรวจพบ Node.js เรียบร้อยแล้ว
echo.

set /p user_choice="👉 คุณต้องการเปิดเว็บเบราว์เซอร์ไปยังหน้าขอ API Key ต่างๆ ทั้งหมดพร้อมกันเลยไหม? (Y/N): "

if /i "%user_choice%"=="Y" (
    echo.
    echo [*] กำลังเปิดเว็บเบราว์เซอร์ไปที่ผู้ให้บริการต่างๆ...
    
    :: 1. เปิด Google AI Studio
    start https://aistudio.google.com/
    
    :: 2. เปิด Atlassian API Token
    start https://id.atlassian.com/manage-profile/security/api-tokens
    
    :: 3. เปิด Supabase Projects
    start https://supabase.com/dashboard/projects
    
    :: 4. เปิด Google Cloud Console
    start https://console.cloud.google.com/
    
    echo.
    echo [✓] เปิดหน้าเว็บให้เรียบร้อยแล้วใน Browser หลักของคุณ!
    echo.
    echo --------------------------------------------------------------
    echo 📌 คำแนะนำในการทำตามคู่มือบนหน้าเว็บ:
    echo   1. หน้า Google AI Studio: กดปุ่ม "Get API Key" -> สร้างและก๊อปปี้รหัส (ขึ้นต้นด้วย AQ.)
    echo   2. หน้า Atlassian: กดปุ่ม "Create API token" -> ก๊อปปี้คีย์ (ขึ้นต้นด้วย ATATT...)
    echo   3. หน้า Supabase: สร้างโปรเจกต์ใหม่ -> ไปที่ Settings -> Database -> ก๊อปปี้ลิงก์ URI
    echo --------------------------------------------------------------
    echo.
    echo เมื่อก๊อปปี้คีย์และลิงก์ข้างต้นพร้อมแล้ว...
    pause
) else (
    echo.
    echo [*] ข้ามขั้นตอนการเปิดเว็บลิงก์อัตโนมัติ เข้าสู่ตัวช่วยกรอกข้อมูล...
    echo.
)

:: ไปที่โฟลเดอร์ nextjs-app
cd nextjs-app

:: ตรวจเช็ค node_modules และลงโปรแกรมหากไม่มี
if not exist node_modules (
    echo [*] กำลังดาวน์โหลดไลบรารีระบบเสริม (Installing dependencies)...
    call npm install
    echo.
)

:: รันตัวช่วยติดตั้ง
echo.
echo --------------------------------------------------------------
echo [*] เริ่มต้นโปรแกรมการตั้งค่า (Interactive Configuration)
echo --------------------------------------------------------------
node setup.js

echo.
echo ==============================================================
echo 🌟 ตัวช่วยติดตั้งรันจบการทำงานเรียบร้อยแล้วครับ
echo ==============================================================
pause
