@echo off
REM Double-click this file to launch the local server.
REM Uses pure PowerShell + .NET HttpListener — no Python, Node, or install needed.

cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
