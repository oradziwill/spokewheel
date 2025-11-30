#!/bin/bash
# Verify SpokeWheel is Running Correctly
# Run this to check if your application is working despite 0% CPU

echo "🔍 Verifying SpokeWheel is Running Correctly"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📊 PM2 Status:"
echo "--------------"
pm2 status

echo ""
echo "🧪 Testing Application:"
echo "----------------------"

# Check if process is running
if pm2 list | grep -q "spokewheel.*online"; then
    echo -e "${GREEN}✅ Application is online in PM2${NC}"
    
    # Check if port is listening
    echo ""
    echo "🔌 Checking Port 3001:"
    if lsof -ti:3001 > /dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":3001"; then
        echo -e "${GREEN}✅ Port 3001 is listening${NC}"
    else
        echo -e "${YELLOW}⚠️  Port 3001 is not listening${NC}"
        echo "   The app might still be starting..."
    fi
    
    # Test API endpoint
    echo ""
    echo "🌐 Testing API Endpoint:"
    API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/axes 2>/dev/null || echo "000")
    
    if [ "$API_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✅ API is responding (HTTP 200)${NC}"
        
        # Get actual response
        echo ""
        echo "📦 API Response Sample:"
        curl -s http://localhost:3001/api/axes | head -c 200
        echo "..."
        
    elif [ "$API_RESPONSE" = "000" ]; then
        echo -e "${RED}❌ Cannot connect to API${NC}"
        echo "   The application might not be fully started yet"
        echo "   Wait a few seconds and try: curl http://localhost:3001/api/axes"
    else
        echo -e "${YELLOW}⚠️  API returned HTTP $API_RESPONSE${NC}"
        echo "   Check logs for details: pm2 logs spokewheel"
    fi
    
    # Check recent logs for errors
    echo ""
    echo "📝 Recent Logs (checking for errors):"
    RECENT_LOGS=$(pm2 logs spokewheel --lines 20 --nostream 2>&1)
    
    if echo "$RECENT_LOGS" | grep -qi "error\|Error\|ERROR\|failed\|Failed"; then
        echo -e "${YELLOW}⚠️  Found potential errors in logs:${NC}"
        echo "$RECENT_LOGS" | grep -i "error\|failed" | head -5
    else
        echo -e "${GREEN}✅ No obvious errors in recent logs${NC}"
    fi
    
    # Memory usage
    echo ""
    echo "💾 Resource Usage:"
    pm2 list | grep spokewheel | awk '{print "  Memory: " $10 " | CPU: " $11 " | Uptime: " $12}'
    
    echo ""
    echo "✅ Verification Summary:"
    if [ "$API_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✅ Your application is running correctly!${NC}"
        echo ""
        echo "0% CPU is normal when the app is idle (not handling requests)."
        echo "The app will use CPU when it receives requests."
        echo ""
        echo "Next steps:"
        echo "1. Proceed to Step 8: Configure Nginx"
        echo "2. Test from browser once Nginx is set up"
    else
        echo -e "${YELLOW}⚠️  Application is running but API not responding yet${NC}"
        echo ""
        echo "Try:"
        echo "  pm2 restart spokewheel"
        echo "  sleep 5"
        echo "  curl http://localhost:3001/api/axes"
    fi
    
else
    echo -e "${RED}❌ Application is not online${NC}"
    echo ""
    echo "Check status:"
    echo "  pm2 status"
    echo "  pm2 logs spokewheel --lines 50"
fi

echo ""


