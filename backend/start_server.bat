@echo off
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies. Please check if Node.js is installed.
    pause
    exit /b %errorlevel%
)

echo Starting Backend Server...
node server.js
pause
