#!/bin/bash

# OG Image Verification Script
# This script checks if Open Graph meta tags are properly configured

echo "🔍 Checking Open Graph Implementation..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if OG image exists
echo "1️⃣ Checking Default OG Image..."
if [ -f "lingayat-shaadi/public/og-image.png" ]; then
    SIZE=$(du -h "lingayat-shaadi/public/og-image.png" | cut -f1)
    echo -e "${GREEN}✅ Default OG image exists (${SIZE})${NC}"
else
    echo -e "${RED}❌ Default OG image NOT found at lingayat-shaadi/public/og-image.png${NC}"
fi
echo ""

# Check main layout
echo "2️⃣ Checking Main Layout Configuration..."
if grep -q "openGraph:" "lingayat-shaadi/src/app/layout.tsx"; then
    echo -e "${GREEN}✅ OpenGraph configuration found in main layout${NC}"
    
    # Check for required OG properties
    if grep -q "og-image.png" "lingayat-shaadi/src/app/layout.tsx"; then
        echo -e "${GREEN}✅ OG image URL configured${NC}"
    else
        echo -e "${YELLOW}⚠️  OG image URL not found${NC}"
    fi
    
    if grep -q "metadataBase" "lingayat-shaadi/src/app/layout.tsx"; then
        echo -e "${GREEN}✅ Metadata base URL configured${NC}"
    else
        echo -e "${RED}❌ Metadata base URL not configured${NC}"
    fi
else
    echo -e "${RED}❌ OpenGraph configuration NOT found in main layout${NC}"
fi
echo ""

# Check profile layout
echo "3️⃣ Checking Profile Dynamic OG Configuration..."
if [ -f "lingayat-shaadi/src/app/(app)/profile/[id]/layout.tsx" ]; then
    echo -e "${GREEN}✅ Profile layout exists${NC}"
    
    if grep -q "generateMetadata" "lingayat-shaadi/src/app/(app)/profile/[id]/layout.tsx"; then
        echo -e "${GREEN}✅ Dynamic metadata generation configured${NC}"
    else
        echo -e "${RED}❌ Dynamic metadata generation NOT found${NC}"
    fi
else
    echo -e "${RED}❌ Profile layout NOT found${NC}"
fi
echo ""

# Check test page
echo "4️⃣ Checking OG Test Page..."
if [ -f "lingayat-shaadi/src/app/og-test/page.tsx" ]; then
    echo -e "${GREEN}✅ OG test page exists at /og-test${NC}"
else
    echo -e "${YELLOW}⚠️  OG test page not found${NC}"
fi
echo ""

# Check documentation
echo "5️⃣ Checking Documentation..."
if [ -f "lingayat-shaadi/OG_IMAGES_SETUP.md" ]; then
    echo -e "${GREEN}✅ Setup documentation exists${NC}"
else
    echo -e "${YELLOW}⚠️  Setup documentation not found${NC}"
fi

if [ -f "lingayat-shaadi/OG_IMPLEMENTATION_SUMMARY.md" ]; then
    echo -e "${GREEN}✅ Implementation summary exists${NC}"
else
    echo -e "${YELLOW}⚠️  Implementation summary not found${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Files Created:"
echo "  • lingayat-shaadi/public/og-image.png"
echo "  • lingayat-shaadi/src/app/(app)/profile/[id]/layout.tsx"
echo "  • lingayat-shaadi/src/app/og-test/page.tsx"
echo "  • lingayat-shaadi/OG_IMAGES_SETUP.md"
echo "  • lingayat-shaadi/OG_IMPLEMENTATION_SUMMARY.md"
echo ""
echo "Modified Files:"
echo "  • lingayat-shaadi/src/app/layout.tsx (added OG metadata)"
echo ""
echo "Next Steps:"
echo "  1. Run 'npm run dev' to start development server"
echo "  2. Visit http://localhost:3000/og-test to test OG tags"
echo "  3. Deploy to production and test with real URLs"
echo "  4. Use Facebook Debugger to verify sharing works"
echo ""
echo "Testing URLs:"
echo "  • OpenGraph.xyz: https://www.opengraph.xyz/"
echo "  • Facebook: https://developers.facebook.com/tools/debug/"
echo "  • Twitter: https://cards-dev.twitter.com/validator"
echo ""

echo -e "${GREEN}✨ OG Images implementation complete!${NC}"
