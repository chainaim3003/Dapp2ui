#!/bin/bash

# ZK-PRET Composed Proofs Integration Verification Script
# This script verifies that the composed proofs integration was successful

echo "🔍 ZK-PRET Composed Proofs Integration Verification"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the zk-pret-dapp11 root directory"
    exit 1
fi

echo "✅ Directory check passed"

# Check if modified files exist and have the right content
echo ""
echo "📁 Checking modified files..."

# Check compliance.html for the 4th card
if grep -q "lg:grid-cols-4" public/compliance.html && grep -q "Composed Proofs" public/compliance.html; then
    echo "✅ compliance.html: 4th card added successfully"
else
    echo "❌ compliance.html: Missing composed proofs card or grid layout"
fi

# Check app.js for global functions
if grep -q "selectComposedProofTemplate" public/js/app.js && grep -q "loadAvailableTemplates" public/js/app.js; then
    echo "✅ app.js: Global functions added successfully"
else
    echo "❌ app.js: Missing global functions for composed proofs"
fi

# Check api.js for new methods
if grep -q "getComposedProofTemplates" public/js/utils/api.js && grep -q "executeComposedProof" public/js/utils/api.js; then
    echo "✅ api.js: Composed proofs API methods added successfully"
else
    echo "❌ api.js: Missing composed proofs API methods"
fi

# Check for new files
echo ""
echo "📄 Checking new files..."

if [ -f "test-composed-proofs-frontend.html" ]; then
    echo "✅ test-composed-proofs-frontend.html: Integration test file created"
else
    echo "❌ test-composed-proofs-frontend.html: Missing integration test file"
fi

if [ -f "INTEGRATION_SUMMARY.md" ]; then
    echo "✅ INTEGRATION_SUMMARY.md: Documentation created"
else
    echo "❌ INTEGRATION_SUMMARY.md: Missing documentation"
fi

# Check existing backend files
echo ""
echo "🖥️ Checking backend files..."

if [ -f "src/services/ComposedProofService.ts" ]; then
    echo "✅ ComposedProofService.ts: Backend service exists"
else
    echo "❌ ComposedProofService.ts: Missing backend service"
fi

if grep -q "composed-proofs" src/server.ts; then
    echo "✅ server.ts: API endpoints exist"
else
    echo "❌ server.ts: Missing API endpoints"
fi

# Check for required dependencies
echo ""
echo "📦 Checking dependencies..."

if grep -q "express" package.json; then
    echo "✅ Express.js dependency found"
else
    echo "❌ Express.js dependency missing"
fi

# Summary
echo ""
echo "📋 Integration Summary"
echo "====================="

# Count checks
total_checks=7
passed_checks=0

# Re-run checks for counting
[ -f "public/compliance.html" ] && grep -q "lg:grid-cols-4" public/compliance.html && grep -q "Composed Proofs" public/compliance.html && ((passed_checks++))
[ -f "public/js/app.js" ] && grep -q "selectComposedProofTemplate" public/js/app.js && grep -q "loadAvailableTemplates" public/js/app.js && ((passed_checks++))
[ -f "public/js/utils/api.js" ] && grep -q "getComposedProofTemplates" public/js/utils/api.js && grep -q "executeComposedProof" public/js/utils/api.js && ((passed_checks++))
[ -f "test-composed-proofs-frontend.html" ] && ((passed_checks++))
[ -f "INTEGRATION_SUMMARY.md" ] && ((passed_checks++))
[ -f "src/services/ComposedProofService.ts" ] && ((passed_checks++))
[ -f "src/server.ts" ] && grep -q "composed-proofs" src/server.ts && ((passed_checks++))

echo "Passed: $passed_checks/$total_checks checks"

if [ $passed_checks -eq $total_checks ]; then
    echo ""
    echo "🎉 SUCCESS: All integration checks passed!"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Start the server: npm start"
    echo "2. Visit: http://localhost:3000/compliance.html"
    echo "3. Click the purple 'Composed Proofs' card"
    echo "4. Test the functionality in the app"
    echo ""
    echo "📊 Test the integration:"
    echo "Visit: http://localhost:3000/test-composed-proofs-frontend.html"
else
    echo ""
    echo "⚠️ WARNING: Some integration checks failed"
    echo "Please review the failed checks above and ensure all files are properly modified"
fi

echo ""
echo "📚 Documentation: See INTEGRATION_SUMMARY.md for complete details"
echo "=================================================="
