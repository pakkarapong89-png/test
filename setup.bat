@echo off
title taskyapp Bot & Dashboard Setup Tool
echo ======================================================
echo 🚀 taskyapp Bot & Dashboard - One-Click Production Setup
echo ======================================================
echo.

:: Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [*] Found Node.js version:
node -v
echo.

:: Navigate to nextjs-app and install dependencies
echo [*] Step 1: Installing dependencies...
cd nextjs-app
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies!
    echo.
    pause
    exit /b 1
)

echo.
echo [*] Step 2: Running interactive configuration...
node setup.js

echo.
echo ======================================================
echo 🌟 Installation script finished.
echo ======================================================
pause
