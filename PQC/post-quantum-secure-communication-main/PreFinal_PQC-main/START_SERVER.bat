@echo off
title PQC Secure Communication Platform Server
echo.
echo  ==================================================================
echo     STARTING POST-QUANTUM SECURE COMMUNICATION PLATFORM          
echo  ==================================================================
echo.
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1
echo   [+] Port 5000 is ready.
echo   [!] Note: Mobile devices can connect via your LAN/Wi-Fi IP.
echo.
cd /d "%~dp0"
python run.py
echo.
echo  Server stopped. Press any key to close...
pause
