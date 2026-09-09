@echo off
setlocal
cd /d "%~dp0"
set "PORT=8765"
where py >nul 2>&1
if %errorlevel%==0 goto launch
where python >nul 2>&1
if %errorlevel%==0 goto launch
echo.
echo VIDIK needs Python 3 to launch locally.
echo Install Python 3, then double-click START-VIDIK.bat again.
pause
exit /b 1
:launch
start "VIDIK server" /min cmd /c "py -m http.server %PORT% --bind 127.0.0.1"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:%PORT%/index.html"
endlocal
