@echo off
setlocal

if "%~1"=="" (
    echo Usage: sync.bat ^<tag^>
    echo Example: sync.bat v2.7.6
    pause
    exit /b 1
)

set TAG=%~1
set WORKSPACE=d:\001.Sac\projects\002.immich\workspace

echo.
echo ========================================
echo  Syncing workspace to immich %TAG%
echo ========================================
echo.

cd /d %WORKSPACE%

:: Backup extensions truoc khi reset
echo [1/6] Backing up extensions...
xcopy /E /I /Y server\src\extensions ..\ext-backup\server\src\extensions >nul 2>&1
xcopy /E /I /Y web\src\routes\(user)\extensions ..\ext-backup\web\src\routes\extensions >nul 2>&1
echo       Done.

:: Fetch tag tu upstream
echo [2/6] Fetching tag %TAG% from upstream...
git fetch immich %TAG%
if %errorlevel% neq 0 (
    echo ERROR: Could not fetch tag %TAG%. Check remote 'immich' exists.
    echo Run: git remote add immich https://github.com/immich-app/immich.git
    pause
    exit /b 1
)
echo       Done.

:: Reset ve tag
echo [3/6] Resetting to %TAG%...
git reset --hard FETCH_HEAD
if %errorlevel% neq 0 (
    echo ERROR: git reset failed.
    pause
    exit /b 1
)
echo       Done.

:: Restore 4 file custom tu main
echo [4/6] Restoring custom files from origin/main...
git checkout origin/main -- server/src/controllers/index.ts
git checkout origin/main -- server/src/services/index.ts
git checkout origin/main -- web/src/lib/route.ts
git checkout origin/main -- "web/src/lib/components/shared-components/side-bar/user-sidebar.svelte"
git checkout origin/main -- server/src/services/database.service.ts
if %errorlevel% neq 0 (
    echo ERROR: Could not restore custom files.
    pause
    exit /b 1
)
echo       Done.

:: Restore extensions
echo [5/6] Restoring extensions...
xcopy /E /I /Y ..\ext-backup\server\src\extensions server\src\extensions >nul 2>&1
xcopy /E /I /Y "..\ext-backup\web\src\routes\extensions" "web\src\routes\(user)\extensions" >nul 2>&1
echo       Done.

:: Install dependencies
echo [6/6] Installing dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo ERROR: pnpm install failed.
    pause
    exit /b 1
)
echo       Done.

echo.
echo ========================================
echo  Sync to %TAG% completed successfully!
echo  Next steps:
echo    1. Check for TypeScript errors: pnpm build
echo    2. Verify extension code compatibility
echo    3. Commit: git add . ^&^& git commit -m "chore: sync to %TAG%"
echo    4. Push: git push origin main --force
echo ========================================
echo.
pause
