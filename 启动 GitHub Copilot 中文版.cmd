@echo off
setlocal
set "ROOT=%~dp0"
set "COPILOT_ZH_CACHE_DIR=%ROOT%cache"
set "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222 --lang=zh-CN"
cd /d "%ROOT%"
if not exist "%ROOT%..\github.exe" exit /b 1
start "" /b "%ROOT%..\github.exe"
if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_CMD=%ProgramFiles%\nodejs\node.exe"
) else (
  for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_CMD set "NODE_CMD=%%N"
)
if not defined NODE_CMD exit /b 1
"%NODE_CMD%" "%ROOT%inject.js" >nul 2>&1
exit /b %errorlevel%
