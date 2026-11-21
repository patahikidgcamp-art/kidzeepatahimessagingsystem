# Kidzee School Suite — Installation & Deployment Guide

This guide covers everything needed to download, install, and run **Kidzee School Suite** on your local machine (Windows, macOS, Linux) or deploy to cloud hosting (Docker, Render, Railway).

---

## 🚀 Quick Start (Under 2 Minutes)

### Option 1: Windows (1-Click Automated)
1. Download the repository ZIP file (via the in-app **"Download Installer"** button or GitHub).
2. Extract the ZIP to your chosen folder (e.g. `C:\KidzeeSchool`).
3. Double-click **`install.bat`**.
   - It automatically checks Node.js, configures environment files, creates `.data`, and runs `npm install`.
4. When installation finishes, double-click **`start.bat`** to run the app.
   - Your browser will automatically open: **`http://localhost:3000`**

### Option 2: macOS & Linux (1-Click Automated)
1. Extract the project archive or clone via Git.
2. Open terminal in the project directory:
   ```bash
   chmod +x install.sh start.sh
   ./install.sh
   ```
3. Run anytime with:
   ```bash
   ./start.sh
   ```

### Option 3: Manual Terminal Setup
```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env

# 3. Start full-stack server
npm start
```
Open **`http://localhost:3000`** in Chrome, Edge, or Safari.

---

## 📦 What's Included in the Installation Package

| File | Purpose |
|---|---|
| `install.bat` | 1-Click Windows installer: checks Node, installs dependencies, sets up `.env` & `.data` |
| `start.bat` | 1-Click Windows launcher: starts server on Port 3000 & opens browser automatically |
| `install.sh` | 1-Click macOS/Linux installer script |
| `start.sh` | 1-Click macOS/Linux launcher script |
| `setup-git.bat` | Windows GitHub repository uploader |
| `setup-git.sh` | macOS/Linux GitHub repository uploader |
| `server.ts` | Node.js Express full-stack daemon & WhatsApp Web Gateway |
| `Dockerfile` | Production container configuration |
| `docker-compose.yml` | Multi-container Docker deployment |

---

## 📱 Progressive Web App (PWA) Desktop / Mobile Installation
You can also install Kidzee School directly in your browser without any terminal:
1. In Google Chrome or Microsoft Edge, look at the right side of the address bar.
2. Click the **Install** icon (desktop monitor with arrow down) or click the in-app **"Install Web App"** button.
3. Kidzee School will be installed as a standalone desktop application with its own window, taskbar icon, and offline capabilities!

---

## 🌐 Deploy to Cloud (Free & Easy)

### Docker
```bash
docker build -t kidzee-school .
docker run -p 3000:3000 kidzee-school
```

### GitHub Upload & Render / Railway Deployment
1. Run `./setup-git.sh https://github.com/YOUR_USERNAME/YOUR_REPO.git` (or double-click `setup-git.bat` on Windows).
2. Connect your GitHub repository to **Render** or **Railway**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Port: `3000`
