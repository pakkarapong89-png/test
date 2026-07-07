@echo off
title TaskyBot Setup Assistant
echo =========================================
echo TaskyBot - One-Click Setup Assistant
echo =========================================
echo.
echo Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js first from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js is installed.
echo.

cd nextjs-app
if not exist node_modules (
    echo Installing packages...
    call npm install
)

node setup.js
pause