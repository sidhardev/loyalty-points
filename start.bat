@echo off
rem Double-click to run Regularhood on http://localhost:4000
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages, first run only...
  call npm install || goto :error
)
call npm start || goto :error
goto :eof

:error
echo.
echo Something went wrong. Make sure Node.js 22.16 or newer is installed.
pause
