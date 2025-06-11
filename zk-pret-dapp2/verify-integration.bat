@echo off
REM ZK-PRET Composed Proofs Integration Verification Script (Windows)
REM This script verifies that the composed proofs integration was successful

echo 🔍 ZK-PRET Composed Proofs Integration Verification
echo ==================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Run this script from the zk-pret-dapp11 root directory
    pause
    exit /b 1
)

echo ✅ Directory check passed

REM Check if modified files exist and have the right content
echo.
echo 📁 Checking modified files...

REM Check compliance.html for the 4th card
findstr /c:"lg:grid-cols-4" public\compliance.html >nul && findstr /c:"Composed Proofs" public\compliance.html >nul
if %errorlevel% equ 0 (
    echo ✅ compliance.html: 4th card added successfully
) else (
    echo ❌ compliance.html: Missing composed proofs card or grid layout
)

REM Check app.js for global functions
findstr /c:"selectComposedProofTemplate" public\js\app.js >nul && findstr /c:"loadAvailableTemplates" public\js\app.js >nul
if %errorlevel% equ 0 (
    echo ✅ app.js: Global functions added successfully
) else (
    echo ❌ app.js: Missing global functions for composed proofs
)

REM Check api.js for new methods
findstr /c:"getComposedProofTemplates" public\js\utils\api.js >nul && findstr /c:"executeComposedProof" public\js\utils\api.js >nul
if %errorlevel% equ 0 (
    echo ✅ api.js: Composed proofs API methods added successfully
) else (
    echo ❌ api.js: Missing composed proofs API methods
)

REM Check for new files
echo.
echo 📄 Checking new files...

if exist "test-composed-proofs-frontend.html" (
    echo ✅ test-composed-proofs-frontend.html: Integration test file created
) else (
    echo ❌ test-composed-proofs-frontend.html: Missing integration test file
)

if exist "INTEGRATION_SUMMARY.md" (
    echo ✅ INTEGRATION_SUMMARY.md: Documentation created
) else (
    echo ❌ INTEGRATION_SUMMARY.md: Missing documentation
)

REM Check existing backend files
echo.
echo 🖥️ Checking backend files...

if exist "src\services\ComposedProofService.ts" (
    echo ✅ ComposedProofService.ts: Backend service exists
) else (
    echo ❌ ComposedProofService.ts: Missing backend service
)

findstr /c:"composed-proofs" src\server.ts >nul
if %errorlevel% equ 0 (
    echo ✅ server.ts: API endpoints exist
) else (
    echo ❌ server.ts: Missing API endpoints
)

REM Check for required dependencies
echo.
echo 📦 Checking dependencies...

findstr /c:"express" package.json >nul
if %errorlevel% equ 0 (
    echo ✅ Express.js dependency found
) else (
    echo ❌ Express.js dependency missing
)

REM Summary
echo.
echo 📋 Integration Summary
echo =====================
echo.

echo 🎉 Integration verification completed!
echo.
echo 🚀 Next Steps:
echo 1. Start the server: npm start
echo 2. Visit: http://localhost:3000/compliance.html
echo 3. Click the purple 'Composed Proofs' card
echo 4. Test the functionality in the app
echo.
echo 📊 Test the integration:
echo Visit: http://localhost:3000/test-composed-proofs-frontend.html
echo.
echo 📚 Documentation: See INTEGRATION_SUMMARY.md for complete details
echo ==================================================

pause
