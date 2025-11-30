#!/bin/bash
# PM2 Verification Script for SpokeWheel
# Run this after Step 7 to verify everything is working

echo "🔍 Verifying PM2 Setup for SpokeWheel"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed${NC}"
    echo "Install with: sudo npm install -g pm2"
    exit 1
else
    echo -e "${GREEN}✅ PM2 is installed: $(pm2 -v)${NC}"
fi

echo ""

# Check PM2 status
echo "📊 PM2 Process Status:"
echo "---------------------"
pm2 status

echo ""
echo "📋 Checking SpokeWheel Application:"
echo "-----------------------------------"

# Check if spokewheel is running
if pm2 list | grep -q "spokewheel.*online"; then
    echo -e "${GREEN}✅ SpokeWheel is running${NC}"
    
    # Get process info
    APP_STATUS=$(pm2 jlist | python3 -c "import sys, json; data=json.load(sys.stdin); app=[a for a in data if a['name']=='spokewheel']; print('online' if app and app[0]['pm2_env']['status']=='online' else 'offline')" 2>/dev/null || echo "unknown")
    
    if [ "$APP_STATUS" = "online" ]; then
        echo -e "${GREEN}✅ Application status: ONLINE${NC}"
        
        # Check if port is listening
        if lsof -ti:3001 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Port 3001 is listening${NC}"
        else
            echo -e "${YELLOW}⚠️  Port 3001 is not listening (application may be starting)${NC}"
        fi
        
        # Test API endpoint
        echo ""
        echo "🧪 Testing API Endpoint:"
        API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/axes 2>/dev/null || echo "000")
        if [ "$API_RESPONSE" = "200" ]; then
            echo -e "${GREEN}✅ API is responding (HTTP $API_RESPONSE)${NC}"
        else
            echo -e "${YELLOW}⚠️  API returned HTTP $API_RESPONSE${NC}"
            echo "   This might be normal if the app is still starting"
        fi
    else
        echo -e "${RED}❌ Application status: $APP_STATUS${NC}"
    fi
else
    echo -e "${RED}❌ SpokeWheel is not running${NC}"
    echo ""
    echo "To start it, run:"
    echo "  cd /var/www/spokewheel"
    echo "  pm2 start ecosystem.config.js"
fi

echo ""
echo "📝 Recent Logs (last 10 lines):"
echo "-------------------------------"
pm2 logs spokewheel --lines 10 --nostream 2>/dev/null || echo "No logs available"

echo ""
echo "💾 PM2 Save Status:"
echo "-------------------"
if [ -f ~/.pm2/dump.pm2 ]; then
    echo -e "${GREEN}✅ PM2 save file exists${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 save file not found${NC}"
    echo "Run: pm2 save"
fi

echo ""
echo "🔄 Auto-start on Boot:"
echo "---------------------"
if pm2 startup | grep -q "PM2"; then
    echo -e "${YELLOW}⚠️  Auto-start may not be configured${NC}"
    echo "Run: pm2 startup"
    echo "Then follow the instructions it provides"
else
    echo -e "${GREEN}✅ Auto-start appears to be configured${NC}"
fi

echo ""
echo "📊 Memory Usage:"
echo "---------------"
pm2 list | grep spokewheel | awk '{print "Memory: " $10 " | CPU: " $11}'

echo ""
echo "✅ Verification Complete!"
echo ""
echo "If you see any ❌ or ⚠️, check the troubleshooting section below."
echo ""


