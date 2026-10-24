@echo off
title PQC Secure Communication Platform Server
echo.
echo  ==================================================================
echo     STARTING POST-QUANTUM SECURE COMMUNICATION PLATFORM          
echo  ==================================================================
echo.
echo   [!] Note: Mobile devices can connect via your LAN/Wi-Fi IP.
echo.
cd /d "%~dp0"
python run.py
echo.
echo  Server stopped. Press any key to close...
pause
