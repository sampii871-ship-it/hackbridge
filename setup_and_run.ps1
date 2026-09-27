# HackBridge local setup script
# Run this in PowerShell from c:\Users\sampa\Desktop\hackbridge

$PYTHON = "C:\Users\sampa\Desktop\hackbridge\backend\venv\Scripts\python.exe"
$PIP    = "C:\Users\sampa\Desktop\hackbridge\backend\venv\Scripts\pip.exe"
$UVICORN = "C:\Users\sampa\Desktop\hackbridge\backend\venv\Scripts\uvicorn.exe"

Write-Host "=== Step 1: Install backend dependencies ===" -ForegroundColor Cyan
& $PIP install "fastapi>=0.115,<1.0" "uvicorn[standard]>=0.30,<1.0" "sqlalchemy[asyncio]>=2.0,<3.0" "alembic>=1.13,<2.0" "aiosqlite>=0.19" "pydantic-settings>=2.5,<3.0" "email-validator>=2.2,<3.0" "passlib[bcrypt]>=1.7.4,<2.0" "bcrypt>=4.0,<4.1" "PyJWT>=2.9,<3.0"

Write-Host "=== Step 2: Run migrations ===" -ForegroundColor Cyan
Set-Location "C:\Users\sampa\Desktop\hackbridge\backend"
& $PYTHON -m alembic upgrade head

Write-Host "=== Step 3: Start backend (port 8000) ===" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\sampa\Desktop\hackbridge\backend'; & '$UVICORN' app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "=== Step 4: Install frontend deps ===" -ForegroundColor Cyan
Set-Location "C:\Users\sampa\Desktop\hackbridge\frontend"
npm install

Write-Host "=== Step 5: Start frontend (port 5173) ===" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\sampa\Desktop\hackbridge\frontend'; npm run dev"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host " HackBridge is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host " Frontend  ->  http://localhost:5173" -ForegroundColor Yellow
Write-Host " Backend   ->  http://localhost:8000" -ForegroundColor Yellow
Write-Host " API Docs  ->  http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host " Health    ->  http://localhost:8000/health" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green
