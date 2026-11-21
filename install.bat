@echo off
setlocal enabledelayedexpansion

title Kidzee School - Automated 1-Click Installer
color 0B

echo ===============================================================================
echo                KIDZEE SCHOOL - AUTOMATED APPLICATION INSTALLER
echo        Parent Reporting, Dues Tracking, WhatsApp Web & Server Gateway
echo ===============================================================================
echo.

:: 1. Check for Node.js installation
echo [1/5] Checking Node.js runtime environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Node.js is NOT installed on your computer!
    echo Node.js 18.x, 20.x, or 22.x LTS is required to run Kidzee School Suite.
    echo.
    echo Opening https://nodejs.org in your browser to download Node.js LTS...
    start https://nodejs.org
    echo.
    echo After downloading and installing Node.js, please run install.bat again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VERSION=%%v
echo  -- Found Node.js version: %NODE_VERSION%
echo  -- Found npm version:     %NPM_VERSION%
echo  -- Node.js environment verified successfully!
echo.

:: 2. Set up environment configuration (.env)
echo [2/5] Configuring environment settings...
if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
        echo  -- Created new .env configuration from .env.example
    ) else (
        echo PORT=3000> ".env"
        echo  -- Created default .env (PORT=3000)
    )
) else (
    echo  -- Existing .env configuration preserved.
)
echo.

:: 3. Create persistent storage directory
echo [3/5] Setting up persistent local storage...
if not exist ".data" (
    mkdir ".data"
    echo  -- Created local .data directory for student records and WhatsApp session
) else (
    echo  -- Persistent storage folder verified (.data)
)
echo.

:: 4. Install all npm project dependencies
echo [4/5] Installing application packages (this may take 1-2 minutes)...
echo  -- Running: npm install
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] npm install encountered an issue.
    echo Please verify your internet connection and try running: npm install
    echo.
    pause
    exit /b 1
)
echo  -- All dependencies installed successfully!
echo.

:: 5. Create Desktop / Quick Launcher shortcut helper
echo [5/5] Finalizing installation setup...
if not exist "start.bat" (
    echo @echo off > start.bat
    echo title Kidzee School Suite Server >> start.bat
    echo echo Starting Kidzee School Suite on http://localhost:3000... >> start.bat
    echo start "" "http://localhost:3000" >> start.bat
    echo npm start >> start.bat
    echo pause >> start.bat
)
echo  -- Quick launcher verified: start.bat
echo.

color 0A
echo ===============================================================================
echo                INSTALLATION COMPLETED SUCCESSFULLY!
echo ===============================================================================
echo.
echo Application is ready to run on Port 3000.
echo.
echo Would you like to launch Kidzee School Suite now? (Y/N)
set /p LAUNCH_CHOICE="Enter choice [Y/N, default Y]: "
if /i "!LAUNCH_CHOICE!"=="" set LAUNCH_CHOICE=Y
if /i "!LAUNCH_CHOICE!"=="Y" (
    echo.
    echo Starting server and opening http://localhost:3000 in your browser...
    start "" "http://localhost:3000"
    call npm start
) else (
    echo.
    echo You can start Kidzee School anytime by double-clicking: start.bat
    echo.
    pause
)
