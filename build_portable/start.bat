@echo off
setlocal
title DSP Core Surface - APK Builder

:: Zoek Python op in vaste locaties + PATH
set "PY="

:: 1. Python naast dit script (meest portable)
if exist "%~dp0python\python.exe"   set "PY=%~dp0python\python.exe"

:: 2. Embedded Python in radio-project
if not defined PY if exist "K:\RADIO\python311-embed\python.exe"  set "PY=K:\RADIO\python311-embed\python.exe"
if not defined PY if exist "I:\RADIO\python311-embed\python.exe"  set "PY=I:\RADIO\python311-embed\python.exe"

:: 3. DSP Core venv
if not defined PY if exist "%~dp0..\.venv\Scripts\python.exe"   set "PY=%~dp0..\.venv\Scripts\python.exe"

:: 4. Python in PATH
if not defined PY (
    where python >nul 2>&1 && set "PY=python"
)

if not defined PY (
    echo.
    echo FOUT: Python niet gevonden.
    echo Installeer Python via https://python.org of voeg het toe aan PATH.
    pause
    exit /b 1
)

echo Python gevonden: %PY%
echo.
"%PY%" "%~dp0setup_and_build.py" %*
pause
