#!/bin/bash
# Nginx Troubleshooting Script
# Run this when you get "Empty reply from server"

echo "🔍 Troubleshooting Nginx Configuration"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "1️⃣ Checking Nginx Status:"
echo "-------------------------"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
    sudo systemctl status nginx --no-pager -l | head -10
else
    echo -e "${RED}❌ Nginx is NOT running${NC}"
    echo "Starting nginx..."
    sudo systemctl start nginx
    sleep 2
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✅ Nginx started${NC}"
    else
        echo -e "${RED}❌ Failed to start nginx${NC}"
        echo "Check errors: sudo systemctl status nginx"
    fi
fi

echo ""
echo "2️⃣ Testing Nginx Configuration:"
echo "-------------------------------"
if sudo nginx -t 2>&1; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    echo "Fix the errors above, then run: sudo nginx -t"
fi

echo ""
echo "3️⃣ Checking if Site is Enabled:"
echo "-------------------------------"
if [ -L /etc/nginx/sites-enabled/spokewheel ]; then
    echo -e "${GREEN}✅ Site is enabled${NC}"
    ls -la /etc/nginx/sites-enabled/spokewheel
else
    echo -e "${YELLOW}⚠️  Site is not enabled${NC}"
    echo "Enable with: sudo ln -s /etc/nginx/sites-available/spokewheel /etc/nginx/sites-enabled/"
fi

echo ""
echo "4️⃣ Checking Ports:"
echo "------------------"
if sudo netstat -tuln | grep -q ":80 "; then
    echo -e "${GREEN}✅ Port 80 is listening${NC}"
    sudo netstat -tuln | grep ":80 "
else
    echo -e "${RED}❌ Port 80 is NOT listening${NC}"
fi

if sudo netstat -tuln | grep -q ":443 "; then
    echo -e "${GREEN}✅ Port 443 is listening${NC}"
else
    echo -e "${YELLOW}⚠️  Port 443 is not listening (normal if SSL not set up yet)${NC}"
fi

echo ""
echo "5️⃣ Checking Backend (Port 3001):"
echo "--------------------------------"
if curl -s http://localhost:3001/api/axes > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Backend is NOT responding on port 3001${NC}"
    echo "Check PM2: pm2 status"
    echo "Check logs: pm2 logs spokewheel"
fi

echo ""
echo "6️⃣ Testing Local Nginx:"
echo "----------------------"
LOCAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [ "$LOCAL_TEST" = "200" ] || [ "$LOCAL_TEST" = "301" ] || [ "$LOCAL_TEST" = "302" ]; then
    echo -e "${GREEN}✅ Nginx is responding locally (HTTP $LOCAL_TEST)${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx returned HTTP $LOCAL_TEST${NC}"
    echo "This might be normal if configuration is still being set up"
fi

echo ""
echo "7️⃣ Checking Firewall:"
echo "---------------------"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status | head -1)
    echo "UFW Status: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "inactive"; then
        echo -e "${YELLOW}⚠️  Firewall is inactive${NC}"
    else
        echo "Checking if ports 80 and 443 are allowed..."
        sudo ufw status | grep -E "80|443" || echo "Ports might not be explicitly allowed"
    fi
fi

echo ""
echo "8️⃣ Checking Nginx Error Logs:"
echo "----------------------------"
if [ -f /var/log/nginx/error.log ]; then
    echo "Recent errors:"
    sudo tail -5 /var/log/nginx/error.log
else
    echo "Error log not found"
fi

echo ""
echo "✅ Troubleshooting Complete!"
echo ""
echo "💡 Common Solutions:"
echo "1. If nginx not running: sudo systemctl start nginx"
echo "2. If config errors: sudo nginx -t (fix errors shown)"
echo "3. If site not enabled: sudo ln -s /etc/nginx/sites-available/spokewheel /etc/nginx/sites-enabled/"
echo "4. If backend not responding: pm2 restart spokewheel"
echo "5. After fixes: sudo systemctl reload nginx"


