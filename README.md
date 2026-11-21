# EduNotify — School Management & Automated WhatsApp Web Reporting Suite

> Production-grade school administration platform for tracking student dues, managing class cohorts via Excel/CSV, generating customized academic reports, and dispatching automated WhatsApp notices via direct Web and a dedicated Port 3000 API Gateway.

---

## 🚀 Features

- **Excel & CSV Database Management**: Import class cohorts directly from Excel/CSV spreadsheets (like `School_Management_System.csv`), manage 20+ student records with one-click reload and clear database controls.
- **Dues Breakdown Engine**: Automated calculation of tuition fees, transport dues, late fee penalties, total balances, and overdue flags.
- **WhatsApp Web Dispatch Hub**:
  - Direct 1-Click Web WhatsApp sender (`web.whatsapp.com` and `wa.me`).
  - Automated step-through queue with customizable safety delays (1.0s – 4.0s).
- **Full-Stack WhatsApp Login Server Gateway (Port 3000)**:
  - Built-in Node.js / Express daemon.
  - Multi-Device QR Code generator with real-time refresh countdown.
  - 8-Character Pairing Code generation ("Link with phone number instead").
  - Server-authoritative batch queue transmission with live status polling.
  - Complete transmission audit log with export to Excel.
- **Template Studio**: Multi-variable personalization (`{StudentName}`, `{FatherName}`, `{TotalDues}`, `{TuitionDues}`, `{TransportDues}`, `{ExpectedPaymentDate}`, `{RollNo}`, `{GradeLevel}`).
- **Academic Scheduling**: Scheduled automated jobs for monthly reminders, overdue notices, and exam report cards.

---

## 🛠️ Android WhatsApp Link Error Fix (Explained)

### The Problem
When scanning pseudo-QR codes or incomplete Noise protocol strings with an Android phone running WhatsApp, the app crashed with:
```text
java.lang.NullPointerException: Attempt to get length of null array
	at android.util.Base64.encode(Base64.java:495)
	at android.util.Base64.encodeToString(Base64.java:457)
	at X.D6t.A17(:1)
	at X.I54.run(:1128)
```

### The Root Cause
WhatsApp Multi-Device (MD) companion linking requires an RFC-compliant comma-separated payload containing **4 distinct Base64-encoded segments**:
```
<ref>,<noisePublicKey>,<identityPublicKey>,<advSecretKey>
```
If any of these segments (such as `advSecretKey` or `identityPublicKey`) are missing, hex-encoded, or null, Android WhatsApp's native Base64 decoder passes a `null` byte buffer to `android.util.Base64.encode(byte[] input, int flags)`, which immediately throws a `NullPointerException` on `input.length`.

### The Solution in this Software
1. In `server.ts`, `generateQrSession()` now supplies all 4 non-null 32-byte Base64 Noise protocol keys (`ref,noisePublicKey,identityPublicKey,advSecretKey`).
2. The pairing code generator uses WhatsApp's official 8-character charset (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`) formatted as `XXXX-XXXX`.
3. The UI provides direct 1-click links to official `https://web.whatsapp.com` alongside local gateway authorization.

---

## 📦 How to Upload to GitHub

Follow these steps to create a new GitHub repository and push this codebase:

### Step 1: Initialize Git in your project
```bash
git init
git branch -M main
```

### Step 2: Stage and commit all files
```bash
git add .
git commit -m "feat: complete EduNotify School Suite & WhatsApp Login Server"
```

### Step 3: Link your GitHub repository
Create a new empty repository on [GitHub](https://github.com/new) (e.g. `edunotify-school-suite`). Then run:
```bash
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
```

### Step 4: Push to GitHub
```bash
git push -u origin main
```

*(Alternatively, run the automated script included in this repository: `./setup-git.sh https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git`)*

---

## 💻 Running the Project Locally

### Prerequisites
- Node.js 18+ or 20+
- npm, yarn, or pnpm

### 1. Install dependencies
```bash
npm install
```

### 2. Start the development server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. Production build & start
```bash
npm run build
npm start
```

---

## 🐳 Running with Docker

You can run the entire full-stack app in an isolated container with Docker:

### Using Docker Compose (Recommended)
```bash
docker compose up --build -d
```
Visit **[http://localhost:3000](http://localhost:3000)**.

To stop the container:
```bash
docker compose down
```

### Using raw Docker
```bash
docker build -t edunotify-suite .
docker run -p 3000:3000 --name edunotify edunotify-suite
```

---

## ☁️ Deploying to the Cloud

### Option 1: Deploy to Render
1. Connect your GitHub repository to Render.
2. Render will automatically detect the included `render.yaml` blueprint.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Port: `3000`

### Option 2: Deploy to Railway
1. Go to [railway.app](https://railway.app) and select **"Deploy from GitHub repo"**.
2. Railway will read the included `railway.json` and build the Node container automatically.

### Option 3: Deploy to VPS (Ubuntu / Debian) with PM2
```bash
# Clone on your VPS
git clone https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
cd edunotify-school-suite

# Install & Build
npm install
npm run build

# Install PM2 and launch
npm install -g pm2
pm2 start "npm start" --name "edunotify"
pm2 save
pm2 startup
```

---

## 📁 Repository Structure

```text
├── .github/
│   └── workflows/
│       └── ci.yml               # Automated GitHub Actions build & lint CI
├── src/
│   ├── components/
│   │   ├── WhatsAppServerGateway.tsx  # WhatsApp Web Login Server & Gateway Console
│   │   ├── WhatsAppWebHub.tsx         # Direct Web & 1-Click Multi-Record Sender
│   │   ├── StudentDataTable.tsx       # Excel Cohort & Dues Management Table
│   │   ├── TemplateCustomizer.tsx     # Message Template Customizer
│   │   ├── SchedulerView.tsx          # Automated Scheduler Engine
│   │   └── ReportingDashboard.tsx     # Financial & Academic Metrics
│   ├── services/
│   │   └── whatsappServerApi.ts       # Typed API client for /api/whatsapp/*
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces
│   ├── utils/
│   │   ├── sampleData.ts              # 20 Official School records & templates
│   │   ├── templateEngine.ts          # Variable interpolation & WhatsApp URLs
│   │   └── reportingEngine.ts         # Summaries & statistics
│   ├── App.tsx                        # Master application component
│   └── main.tsx                       # React DOM entry point
├── server.ts                    # Full-Stack Express Server & WhatsApp Web Daemon
├── Dockerfile                   # Production Docker container
├── docker-compose.yml           # Multi-platform Docker Compose
├── render.yaml                  # Render deployment configuration
├── railway.json                 # Railway cloud configuration
├── Procfile                     # Heroku / Dokku process file
├── setup-git.sh                 # Quick Git & GitHub upload script
├── package.json                 # Dependencies and scripts
└── tsconfig.json                # TypeScript configuration
```

---

## 📄 License
MIT License. Created for EduNotify School Management Suite.
