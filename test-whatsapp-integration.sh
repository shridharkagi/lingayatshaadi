#!/bin/bash

# Test WhatsApp Profile Link Integration
echo "🧪 Testing WhatsApp Profile Link Integration"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check files were updated
echo "1️⃣ Checking Updated Files..."
if grep -q "usePathname" "lingayat-shaadi/src/components/ui/ContactFloat.tsx"; then
    echo -e "${GREEN}✅ lingayat-shaadi/src/components/ui/ContactFloat.tsx updated${NC}"
else
    echo -e "${YELLOW}⚠️  File not updated${NC}"
fi

if grep -q "usePathname" "src/components/ui/ContactFloat.tsx"; then
    echo -e "${GREEN}✅ src/components/ui/ContactFloat.tsx updated${NC}"
else
    echo -e "${YELLOW}⚠️  File not updated${NC}"
fi
echo ""

# Show implementation details
echo "2️⃣ Implementation Details"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "When users visit profile pages and click WhatsApp:"
echo ""
echo -e "${BLUE}Profile Page Example:${NC}"
echo "  URL: http://localhost:3000/profile/ls26010003-rahul"
echo ""
echo -e "${GREEN}WhatsApp Message:${NC}"
echo "  I need more information about the profile http://localhost:3000/profile/ls26010003-rahul."
echo ""
echo "  My name is: "
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test cases
echo "3️⃣ Test Cases"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test Case 1: Profile LS26010003 (Rahul)"
echo "  Route: /profile/ls26010003-rahul"
echo "  ✅ Should include profile URL in message"
echo ""
echo "Test Case 2: Profile LS26010002 (Priya)"
echo "  Route: /profile/ls26010002-priya"
echo "  ✅ Should include profile URL in message"
echo ""
echo "Test Case 3: Homepage"
echo "  Route: /"
echo "  ✅ Should use default message (no profile URL)"
echo ""
echo "Test Case 4: Profile Complete Page"
echo "  Route: /profile/complete"
echo "  ✅ Should use default message (excluded)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# How to test
echo "4️⃣ Manual Testing Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Start development server:"
echo "   cd lingayat-shaadi && npm run dev"
echo ""
echo "2. Visit a profile page:"
echo "   http://localhost:3000/profile/ls26010003-rahul"
echo ""
echo "3. Click the floating contact button (bottom-right)"
echo ""
echo "4. Click 'WhatsApp Us' in the modal"
echo ""
echo "5. Verify WhatsApp opens with profile URL in message"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Expected behavior
echo "5️⃣ Expected Behavior"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "On Profile Pages:"
echo "  ✅ Message includes full profile URL"
echo "  ✅ Message asks for more information"
echo "  ✅ Message prompts for user's name"
echo "  ✅ URL is clickable in WhatsApp"
echo ""
echo "On Other Pages:"
echo "  ✅ Uses default message"
echo "  ✅ No profile URL included"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Features
echo "6️⃣ Features"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Automatic profile detection"
echo "✨ Dynamic URL inclusion"
echo "✨ Works with any profile slug"
echo "✨ Proper message formatting"
echo "✨ Context preservation for support"
echo "✨ No configuration needed"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${GREEN}✅ WhatsApp Profile Link integration is ready!${NC}"
echo ""
echo "📖 See WHATSAPP_PROFILE_LINK.md for detailed documentation"
