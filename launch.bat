@echo off
title Nexus by BostonAi.io — Launcher
cd /d "%~dp0"

echo.
echo  ============================================
echo   Nexus by BostonAi.io — Dev Launcher
echo  ============================================
echo.

:: Check for node_modules
if not exist "node_modules\" (
    echo  [1/3] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo  ERROR: npm install failed.
        pause
        exit /b 1
    )
) else (
    echo  [1/3] Dependencies already installed. Skipping.
)

echo.
echo  [2/3] Building extension...
call npm run build
if errorlevel 1 (
    echo.
    echo  ERROR: Build failed. Check the output above.
    pause
    exit /b 1
)

echo.
echo  [3/3] Launching Chrome with Nexus loaded...
echo.

:: Get absolute path to dist folder
set "DIST_PATH=%~dp0dist"

:: Create a dedicated Chrome profile for Nexus dev
set "PROFILE_PATH=%~dp0.chrome-dev-profile"

:: Try to find Chrome
set "CHROME="
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)
if not defined CHROME if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
)
if not defined CHROME if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if defined CHROME (
    echo  Found Chrome: %CHROME%
    echo  Loading extension from: %DIST_PATH%
    echo  Using dev profile: %PROFILE_PATH%
    echo.
    echo  NOTE: Click the Nexus icon in the toolbar to open the sidebar.
    echo        If you don't see it, click the puzzle piece icon and pin Nexus.
    echo.
    start "" "%CHROME%" --user-data-dir="%PROFILE_PATH%" --load-extension="%DIST_PATH%" --no-first-run --auto-open-devtools-for-tabs "https://www.google.com"
    goto :done
)

:: Try Edge as fallback (also Chromium-based, supports MV3)
set "EDGE="
if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"
)
if not defined EDGE if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

if defined EDGE (
    echo  Found Edge: %EDGE%
    echo  Loading extension from: %DIST_PATH%
    echo.
    start "" "%EDGE%" --user-data-dir="%PROFILE_PATH%" --load-extension="%DIST_PATH%" --no-first-run "https://www.google.com"
    goto :done
)

:: Neither found
echo  ERROR: No Chromium browser found.
echo  Install Chrome or Edge, or load manually:
echo    Chrome:  chrome://extensions  ^> Load unpacked ^> select dist\
echo    Edge:    edge://extensions    ^> Load unpacked ^> select dist\

:done
echo.
echo  ============================================
echo   Nexus by BostonAi.io is running!
echo   Click the extension icon to open the sidebar.
echo  ============================================
echo.
pause
