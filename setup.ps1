# Bug Bounty Tracker — Windows Setup Script
# Run this in PowerShell from d:\Automated-Tool\

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Bug Bounty Tracker — Setup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Python
Write-Host "[1/4] Checking Python installation..." -ForegroundColor Yellow
try {
    $pyVer = & winget install --id Python.Python.3.12 --source winget --accept-source-agreements --accept-package-agreements 2>&1
    Write-Host "Python installed via winget." -ForegroundColor Green
} catch {
    Write-Host "Please install Python 3.11+ from https://python.org and re-run this script." -ForegroundColor Red
    exit 1
}

# Step 2: Install Python dependencies
Write-Host ""
Write-Host "[2/4] Installing Python backend dependencies..." -ForegroundColor Yellow
Set-Location backend
python -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install Python dependencies." -ForegroundColor Red
    exit 1
}
Write-Host "Backend dependencies installed." -ForegroundColor Green

# Step 3: Install Node dependencies
Write-Host ""
Write-Host "[3/4] Installing Node.js frontend dependencies..." -ForegroundColor Yellow
Set-Location ..\frontend
npm install
Write-Host "Frontend dependencies installed." -ForegroundColor Green

# Step 4: Done
Write-Host ""
Write-Host "[4/4] Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Terminal 1 (Backend):" -ForegroundColor White
Write-Host "    cd d:\Automated-Tool\backend" -ForegroundColor Gray
Write-Host "    python run.py" -ForegroundColor Gray
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor White
Write-Host "    cd d:\Automated-Tool\frontend" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Dashboard: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  Login:     admin / BugTracker2024!" -ForegroundColor Yellow
Write-Host ""
