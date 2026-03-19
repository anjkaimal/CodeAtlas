@echo off
rem ── CodeAtlas — Windows startup script ───────────────────────────────────
rem Starts the FastAPI backend (port 8000) and Vite frontend (port 5000).
rem Run from the repo root:  start.bat
rem Prerequisites:
rem   pip install -r backend\requirements.txt
rem   cd frontend && npm install && cd ..
rem   Copy .env.example to .env and set SESSION_SECRET

setlocal

rem Resolve the repo root from the script's own location.
set REPO_ROOT=%~dp0
if "%REPO_ROOT:~-1%"=="\" set REPO_ROOT=%REPO_ROOT:~0,-1%

rem Load .env variables if the file exists.
if exist "%REPO_ROOT%\.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%REPO_ROOT%\.env") do (
        rem Skip blank lines and comment lines starting with #
        if not "%%A"=="" (
            set "first=%%A"
            if not "!first:~0,1!"=="#" set "%%A=%%B"
        )
    )
)

rem ── Start backend in a new window ────────────────────────────────────────
echo [1/2] Starting backend on http://localhost:8000 ...
start "CodeAtlas Backend" cmd /k ^
    "cd /d "%REPO_ROOT%\backend" && ^
     (uvicorn app.main:app --host 0.0.0.0 --port 8000 2>nul || ^
      python -m uvicorn app.main:app --host 0.0.0.0 --port 8000)"

rem Give uvicorn time to bind the port before Vite starts proxying.
timeout /t 2 /nobreak > nul

rem ── Start frontend in this window ────────────────────────────────────────
echo [2/2] Starting frontend on http://localhost:5000 ...
cd /d "%REPO_ROOT%\frontend"
npm run dev
