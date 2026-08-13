# Bug Bounty Tracker — Build Complete ✅

## Both servers are running

| Service | URL | Status |
|---------|-----|--------|
| Frontend (React) | http://localhost:5173 | ✅ Running |
| Backend (FastAPI) | http://localhost:8000 | ✅ Running |
| API Docs | http://localhost:8000/docs | ✅ Available |

**Login:** `admin` / `BugTracker2024!`

---

## Login Page
![Login Page](C:\Users\saik2\.gemini\antigravity-ide\brain\6551efa4-e0ea-4164-84dc-15ce24c5e9c1\login_page_1786649066032.png)

## Dashboard after Login
![Dashboard](C:\Users\saik2\.gemini\antigravity-ide\brain\6551efa4-e0ea-4164-84dc-15ce24c5e9c1\dashboard_after_login_1786649536543.png)

---

## What Was Built

### Backend (FastAPI + SQLite)
- **7 Scanner Modules**: SSL/cert, security headers, tech fingerprinting, port scan, directory enumeration, DNS checks, response diff tracking
- **Rule-based Triage**: CVSS-style scoring, auto-categorization, deduplication fingerprinting
- **Scheduler**: APScheduler — auto-scans every 3 hours per target (configurable)
- **Notifications**: Real-time WebSocket broadcast for new findings, scan events, reports
- **Report Generator**: Markdown + JSON bug bounty reports with evidence and remediation
- **JWT Auth**: Single admin login with bcrypt password hashing
- **REST API**: Full CRUD for targets, findings, scans, reports, notifications, dashboard stats

### Frontend (React + Vite)
| Page | Description |
|------|-------------|
| **Dashboard** | Stats cards, 14-day trend chart, severity breakdown, recent findings |
| **Automated Findings** | Filter by severity/category/status, quick review/FP actions |
| **Manual Targets** | Card grid for weekend testing targets with scope details |
| **Scan History** | All past scans with duration and finding counts |
| **Reports** | Generate, preview, download Markdown/JSON reports |
| **Target Config** | Add/edit/delete targets, trigger manual scans |
| **Finding Detail** | Full evidence, CVSS, reproduction steps, remediation |
| **Notifications** | Real-time slide-out panel with mark-read |

---

## How to restart in future sessions

**Terminal 1 — Backend:**
```powershell
cd d:\Automated-Tool\backend
$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User')
python run.py
```

**Terminal 2 — Frontend:**
```powershell
cd d:\Automated-Tool\frontend
npm run dev
```

> [!TIP]
> Add `d:\Automated-Tool\backend` to your PATH permanently via System Properties → Environment Variables so you can just run `python run.py` directly.

> [!IMPORTANT]
> Change your default password at first login! Go to the login page, use `admin / BugTracker2024!`, then update via the API at `http://localhost:8000/docs#/auth/change_password`.
