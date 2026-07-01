#!/bin/bash

# taskyapp Bot & Dashboard Setup Tool for macOS / Linux
echo "======================================================"
echo "🚀 taskyapp Bot & Dashboard - One-Click Production Setup"
echo "======================================================"
echo ""

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please download and install Node.js from: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "[*] Found Node.js version: $(node -v)"
echo ""

# Navigate to nextjs-app and install dependencies
echo "[*] Step 1: Installing dependencies..."
cd nextjs-app || { echo "[ERROR] Directory nextjs-app not found!"; exit 1; }
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies!"
    echo ""
    exit 1
fi

echo ""
echo "[*] Step 2: Running interactive configuration..."
node setup.js

echo ""
echo "======================================================"
echo "🌟 Installation script finished."
echo "======================================================"
