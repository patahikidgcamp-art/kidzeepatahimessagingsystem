@echo off
title Kidzee School Suite - Parent Reporting & WhatsApp Gateway
color 0A

echo ===============================================================================
echo                KIDZEE SCHOOL SUITE - LAUNCHER
echo ===============================================================================
echo.
echo Starting local full-stack server on http://localhost:3000...
echo.

:: Wait 2 seconds in background then open browser
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: Start the Express + Vite server daemon
npm start

if %errorlevel% neq 0 (
    echo.
    echo [NOTE] Trying development server mode...
    npm run dev
)

echo.
echo Server stopped.
pause
