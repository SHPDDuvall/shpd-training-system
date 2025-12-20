@echo off
echo =========================================
echo Training System - Quick Deployment
echo =========================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Git is not installed. Please install Git first:
    echo    https://git-scm.com/downloads
    pause
    exit /b 1
)

echo [OK] Git is installed

REM Initialize git if not already done
if not exist ".git" (
    echo.
    echo [*] Initializing Git repository...
    git init
    git config user.email "admin@shakerpd.com"
    git config user.name "Shaker PD Admin"
    
    REM Create .gitignore
    (
        echo node_modules/
        echo dist/
        echo .vercel/
        echo .env
        echo .env.local
        echo *.log
        echo .DS_Store
    ) > .gitignore
    
    echo [OK] Git initialized
)

REM Add and commit files
echo.
echo [*] Committing files...
git add -A
git commit -m "Initial commit with Chain of Command enhancements and Schedule Training fix" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Files committed
) else (
    echo [OK] Files already committed
)

echo.
echo =========================================
echo Manual GitHub Setup Required
echo =========================================
echo.
echo 1. Go to: https://github.com/new
echo 2. Repository name: training-system-shaker
echo 3. Make it Private (recommended)
echo 4. DO NOT initialize with README
echo 5. Click 'Create repository'
echo.
echo Then run these commands:
echo.
echo   git remote add origin https://github.com/YOUR-USERNAME/training-system-shaker.git
echo   git branch -M main
echo   git push -u origin main
echo.
pause

echo.
echo =========================================
echo Vercel Deployment
echo =========================================
echo.

where vercel >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Vercel CLI is installed
    echo.
    set /p DEPLOY="Deploy to Vercel now? (y/n): "
    if /i "%DEPLOY%"=="y" (
        echo [*] Deploying to Vercel...
        vercel --prod
    ) else (
        echo Skipped Vercel deployment.
        echo To deploy later, run: vercel --prod
    )
) else (
    echo [!] Vercel CLI is not installed.
    echo.
    echo To deploy via Vercel CLI:
    echo 1. Install: npm install -g vercel
    echo 2. Run: vercel --prod
    echo.
    echo Or deploy via Vercel Dashboard:
    echo 1. Go to: https://vercel.com/shaker-heights-police-depts-projects/training-system
    echo 2. Settings - Git - Connect Git Repository
    echo 3. Select your GitHub repository
    echo 4. Vercel will auto-deploy
)

echo.
echo =========================================
echo [OK] Setup Complete!
echo =========================================
echo.
echo Next steps:
echo 1. Connect GitHub to Vercel (if not done)
echo 2. Wait for deployment to complete (~2 minutes)
echo 3. Visit: https://train.shakerpd.com
echo 4. Hard refresh: Ctrl+Shift+R
echo.
echo See COMPLETE_DEPLOYMENT_GUIDE.md for detailed instructions.
echo.
pause
