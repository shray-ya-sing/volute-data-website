@echo off
REM Quick script to test the automated pipeline manually (Windows)

echo.
echo 🧪 Testing Automated 424B4 Pipeline
echo.

REM Check if CRON_SECRET is set
if "%CRON_SECRET%"=="" (
    echo ❌ CRON_SECRET not set
    echo Get it from: Vercel Dashboard → Settings → Environment Variables
    echo Then run: set CRON_SECRET=your_secret
    exit /b 1
)

REM Check if DOMAIN is set
if "%DOMAIN%"=="" (
    echo ❌ DOMAIN not set
    echo Example: set DOMAIN=your-app.vercel.app
    exit /b 1
)

echo ✓ Configuration loaded
echo Domain: %DOMAIN%
echo.

REM Step 1: Check for new filings
echo 📡 Step 1: Checking for new 424B4 filings...
curl -X GET "https://%DOMAIN%/api/cron/check-new-filings" -H "Authorization: Bearer %CRON_SECRET%"
echo.
echo.

timeout /t 3 >nul

REM Step 2: Submit batch
echo 📤 Step 2: Submitting batch for processing...
curl -X GET "https://%DOMAIN%/api/cron/submit-batch" -H "Authorization: Bearer %CRON_SECRET%"
echo.
echo.
echo ⏳ Batch is processing... This typically takes 30-90 minutes
echo.

REM Step 3: Check batch status
echo 🔍 Step 3: Checking batch status...
curl -X GET "https://%DOMAIN%/api/cron/poll-batches" -H "Authorization: Bearer %CRON_SECRET%"
echo.
echo.

REM Step 4: Overall status
echo 📊 Step 4: Overall pipeline status
curl "https://%DOMAIN%/api/cron/status"
echo.
echo.

echo ✅ Test complete!
echo.
echo Next steps:
echo 1. Check Vercel Blob: Dashboard → Storage → Blob → filings/424b4/
echo 2. Check Neon Database: Run queries from TESTING_PIPELINE.md
echo 3. Monitor logs: Vercel Dashboard → Functions → View logs
echo 4. Wait 30-90 min for batch to complete, then run this script again
echo.
echo Status dashboard: https://%DOMAIN%/api/cron/status
