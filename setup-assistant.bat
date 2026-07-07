@echo off
title TaskyBot Setup Assistant
echo =========================================
echo TaskyBot - One-Click Setup Assistant
echo =========================================
echo.
echo This script will open the browser tabs to get your API keys.
echo.
echo Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js first.
    pause
    exit /b 1
)
echo Node.js is installed.
echo.

set /p choice="Do you want to open all API Key pages in your browser now (Y/N): "

if /i "%choice%"=="Y" (
    echo Opening browser tabs...
    start https://aistudio.google.com/
    start https://id.atlassian.com/manage-profile/security/api-tokens
    start https://supabase.com/dashboard/projects
    start https://console.cloud.google.com/
    echo.
    echo Webpages opened in your browser!
    echo.
    echo Please get your keys, then return here.
    pause
)

cd nextjs-app
if not exist node_modules (
    echo Installing required packages...
    call npm install
    echo.
)

echo Starting setup wizard...
node setup.js

echo Setup assistant finished successfully!
pause
