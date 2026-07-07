@echo off
chcp 65001 > nul
title TaskyBot Setup Assistant
echo =======================================================
echo TaskyBot - Step-by-Step Setup Assistant
echo =======================================================
echo.
echo Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js first from: https://nodejs.org/
    pause
    exit /b 1
)
echo [✓] Node.js is installed.
echo.

cd nextjs-app
if not exist node_modules (
    echo Installing required packages...
    call npm install
    echo.
)

echo Starting configuration wizard...
echo.
node setup.js

echo.
echo =======================================================
echo Setup finished successfully!
echo =======================================================
pause
