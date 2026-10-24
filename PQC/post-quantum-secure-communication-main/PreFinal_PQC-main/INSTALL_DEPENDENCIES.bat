@echo off
setlocal
cd /d "%~dp0"
title PQC Platform - Automated Setup and Dependency Installer
color 0B

echo.
echo  ==================================================================
echo     POST-QUANTUM CRYPTOGRAPHY PLATFORM - DEPENDENCY SETUP          
echo  ==================================================================
echo.

:: 1. Check if Python is installed
echo  [1/3] Checking for Python installation...
python --version >nul 2>&1
if errorlevel 1 goto :no_python

for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo  [+] Detected: %%i (OK)
echo.

:: 2. Upgrade PIP
echo  [2/3] Checking and updating pip package manager...
python -m pip install --upgrade pip --quiet
echo  [+] pip is ready.
echo.

:: 3. Install Requirements
echo  [3/3] Checking and installing required Python libraries...
echo      (If already installed, pip will verify and skip downloading)
echo.

if exist "%~dp0requirements.txt" (
    python -m pip install -r "%~dp0requirements.txt"
) else (
    echo  [*] requirements.txt not found in folder, installing core packages directly...
    python -m pip install "flask>=3.0.0" "flask-socketio>=5.3.0" "flask-sqlalchemy>=3.1.0" "cryptography>=41.0.0" "liboqs-python>=0.16.0" "bcrypt>=4.0.0" "python-dotenv>=1.0.0" "eventlet>=0.33.0" "zstandard>=0.21.0"
)

if errorlevel 1 goto :install_error

echo.
echo  ==================================================================
echo     [+] ALL DEPENDENCIES VERIFIED AND SUCCESSFULLY INSTALLED!         
echo  ==================================================================
echo.
echo   You can now start the platform anytime by running:
echo   --^> Double click 'START_SERVER.bat'
echo.
pause
exit /b 0

:no_python
echo.
echo  [X] ERROR: Python is not found on this system or not added to PATH!
echo  [!] Please download and install Python 3.10, 3.11, 3.12 or 3.13 from python.org
echo  [!] IMPORTANT: Check the box "Add Python to PATH" during installation.
echo.
pause
exit /b 1

:install_error
echo.
echo  [X] ERROR: Failed to install one or more dependencies.
echo  [!] Please check your internet connection and try running again.
echo.
pause
exit /b 1
