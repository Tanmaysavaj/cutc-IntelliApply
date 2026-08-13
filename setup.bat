@echo off
REM IntelliApply - Quick Setup Script for Windows
REM This script sets up both backend and frontend with job processing functionality

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║         IntelliApply - Setup with Job Processing       ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Check prerequisites
echo Checking prerequisites...

python --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Python not found. Please install Python 3.8+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✓ Python found: %PYTHON_VERSION%

node --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Node.js not found. Please install Node.js 16+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js found: %NODE_VERSION%

npm --version >nul 2>&1
if errorlevel 1 (
    echo ✗ npm not found. Please install npm
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm found: %NPM_VERSION%

echo.
echo Setting up Backend...

REM Backend setup
cd backend

REM Check if venv exists
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    echo ✓ Virtual environment created
) else (
    echo ✓ Virtual environment already exists
)

REM Activate virtual environment
call venv\Scripts\activate.bat
echo ✓ Virtual environment activated

REM Install requirements
echo Installing backend dependencies...
python -m pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
echo ✓ Backend dependencies installed

REM Check .env file
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo ✓ .env file created from .env.example
    )
) else (
    echo ✓ .env file already exists
)

cd ..

echo.
echo Setting up Frontend...

REM Frontend setup
cd ui_frontend

REM Install dependencies
echo Installing frontend dependencies...
call npm install --silent
echo ✓ Frontend dependencies installed

REM Check .env.local file
if not exist ".env.local" (
    if exist ".env.example" (
        copy .env.example .env.local >nul
        echo ✓ .env.local file created
    ) else (
        REM Create default .env.local
        (
            echo NEXT_PUBLIC_API_URL=http://localhost:8000
        ) > .env.local
        echo ✓ .env.local created with default settings
    )
) else (
    echo ✓ .env.local file already exists
)

cd ..

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║           ✓ Setup Complete!                           ║
echo ╚════════════════════════════════════════════════════════╝

echo.
echo 📋 Next Steps:
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   venv\Scripts\activate.bat
echo   python -m uvicorn app.main:app --reload --port 8000
echo.
echo Terminal 2 - Frontend:
echo   cd ui_frontend
echo   npm run dev
echo.
echo 📍 Access URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo 🧪 Testing:
echo   npm test                          # Run all tests
echo   npm test job-processing.test.ts   # Run job processing tests
echo.
echo ✓ Ready to go! 🚀
echo.
pause
