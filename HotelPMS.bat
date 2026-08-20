@echo off
title Hotel PMS
echo.
echo  ==========================================
echo   Hotel PMS - Starting...
echo  ==========================================
echo.

REM -- Check Node.js --------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found!
    echo.
    echo  Please install Node.js from: https://nodejs.org
    echo  Download the LTS version, install it, then run this again.
    echo.
    pause
    exit /b 1
)

REM -- Move into the project folder ------------------------------------------
cd /d "%~dp0"

REM -- Install dependencies if node_modules is missing ------------------------
if not exist "node_modules\" (
    echo  First run - installing packages, this takes about a minute...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  ERROR: npm install failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
    echo.
)

REM -- Check for .env.local ----------------------------------------------------
if not exist ".env.local" (
    echo  WARNING: No .env.local found!
    echo.
    echo  Copy .env.example to .env.local and fill in your Supabase credentials:
    echo    VITE_SUPABASE_URL=https://your-project.supabase.co
    echo    VITE_SUPABASE_ANON_KEY=your-anon-key-here
    echo.
    echo  Get these from: supabase.com - your project - Settings - API
    echo.
    pause
    exit /b 1
)

REM -- Start the dev server (Vite opens your browser automatically) ----------
echo  Starting Hotel PMS...
echo  Will open at: http://localhost:5173
echo.
echo  Keep this window open while using the app.
echo  Press Ctrl+C to stop.
echo  ==========================================
echo.

call npm run dev

echo.
echo  Hotel PMS has stopped. If that was unexpected, scroll up to see the error above.
pause
