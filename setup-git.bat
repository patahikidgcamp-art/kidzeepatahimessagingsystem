@echo off
setlocal enabledelayedexpansion

title Kidzee School - GitHub Repository Setup & Push
color 0B

echo ===============================================================================
echo                KIDZEE SCHOOL - GITHUB REPOSITORY UPLOADER
echo ===============================================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Git is not installed on this machine!
    echo Please install Git for Windows from https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking local Git repository...
if not exist ".git" (
    echo  -- Initializing new Git repository...
    git init
    git branch -M main
) else (
    echo  -- Existing Git repository detected.
)
echo.

echo [2/4] Staging all files...
git add .
echo.

echo [3/4] Creating commit...
git commit -m "Upload: Kidzee School Parent Reporting & WhatsApp Gateway"
echo.

echo [4/4] GitHub Remote Configuration:
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/USERNAME/REPO.git): "

if not "!REPO_URL!"=="" (
    git remote remove origin 2>nul
    git remote add origin !REPO_URL!
    echo.
    echo Pushing code to !REPO_URL! on branch main...
    git push -u origin main
    if %errorlevel% equ 0 (
        color 0A
        echo.
        echo ===============================================================================
        echo             SUCCESSFULLY UPLOADED TO GITHUB!
        echo ===============================================================================
    ) else (
        color 0C
        echo.
        echo [NOTE] Push failed. Make sure you are authenticated with GitHub:
        echo   1. Check if the repository exists on github.com
        echo   2. You can generate a Personal Access Token on GitHub Settings
        echo   3. Or run: gh auth login
    )
) else (
    echo.
    echo No repository URL entered. You can link manually anytime using:
    echo   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
    echo   git push -u origin main
)

echo.
pause
