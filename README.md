# Bug Bounty Tracker

A real-time, enterprise-grade automated bug bounty vulnerability tracking platform.

## Quick Start

### Prerequisites
- Python 3.11+ — https://python.org
- Node.js 18+ — https://nodejs.org

### 1. Install Backend Dependencies
```powershell
cd d:\Automated-Tool\backend
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```powershell
cd d:\Automated-Tool\frontend
npm install
```

### 3. Start the Backend
```powershell
cd d:\Automated-Tool\backend
python run.py
```
Backend starts at: http://localhost:8000  
API Docs: http://localhost:8000/docs

### 4. Start the Frontend (new terminal)
```powershell
cd d:\Automated-Tool\frontend
npm run dev
```
Dashboard at: http://localhost:5173

### Default Login
- **Username:** `admin`
- **Password:** `BugTracker2024!`

> Change your password after first login!

---

## Features

| Feature | Details |
|---------|---------|
| **SSL/TLS Analysis** | Cert expiry, self-signed, weak protocols/ciphers |
| **Security Headers** | HSTS, CSP, X-Frame-Options, server version disclosure |
| **Tech Fingerprinting** | Detect CMS, frameworks, outdated libraries |
| **Port Scanning** | Detect exposed database/service ports |
| **Directory Enumeration** | Check for exposed .env, .git, admin panels, API docs |
| **DNS Checks** | SPF, DMARC, zone transfer |
| **Diff Tracking** | Detect response changes between scans |
| **Real-time Dashboard** | WebSocket-powered live updates |
| **Notifications** | In-app alerts for new findings, scan completions |
| **Reports** | Markdown + JSON bug bounty reports |
| **Manual Targets** | Separate tab for weekend manual testing targets |
| **Scan Scheduling** | Auto-scan every 3h (configurable per target) |

---

## Project Structure

```
d:\Automated-Tool\
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app
│   │   ├── models.py         # Database models
│   │   ├── scanner/          # 7 scan modules
│   │   ├── triage/           # Rule-based scoring
│   │   └── routers/          # API endpoints
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/            # Dashboard, Findings, Reports, etc.
│       └── components/       # Sidebar, TopBar, Notifications
├── config/
│   └── targets.json          # Default target config
└── setup.ps1                 # First-run setup script
```

---

## Legal Notice

> This tool must ONLY be used against targets you own or have **written authorization** to test.  
> Unauthorized scanning is illegal. Use responsibly.
