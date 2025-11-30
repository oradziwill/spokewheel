#!/bin/bash
# PM2 Error Diagnostic Script
# Run this when PM2 shows "errored" status

echo "🔍 Diagnosing PM2 Error for SpokeWheel"
echo "======================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📊 Current PM2 Status:"
echo "----------------------"
pm2 status

echo ""
echo "📝 Error Logs (last 50 lines):"
echo "-------------------------------"
pm2 logs spokewheel --err --lines 50 --nostream

echo ""
echo "📋 All Logs (last 30 lines):"
echo "----------------------------"
pm2 logs spokewheel --lines 30 --nostream

echo ""
echo "🔍 Detailed Process Info:"
echo "------------------------"
pm2 describe spokewheel

echo ""
echo "💡 Common Error Patterns:"
echo "-------------------------"
ERROR_LOG=$(pm2 logs spokewheel --err --lines 50 --nostream 2>&1)

if echo "$ERROR_LOG" | grep -qi "EADDRINUSE\|port.*already in use"; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use${NC}"
    echo "Solution:"
    echo "  sudo lsof -i :3001"
    echo "  sudo kill -9 <PID>"
    echo "  pm2 restart spokewheel"
elif echo "$ERROR_LOG" | grep -qi "ENOENT.*\.env\|Cannot find.*\.env"; then
    echo -e "${YELLOW}⚠️  .env file is missing${NC}"
    echo "Solution:"
    echo "  Create .env file in project root"
    echo "  See .env.production.example for template"
elif echo "$ERROR_LOG" | grep -qi "database\|postgres\|sqlite\|ECONNREFUSED"; then
    echo -e "${YELLOW}⚠️  Database connection issue${NC}"
    echo "Solution:"
    echo "  Check .env DB_* variables"
    echo "  Verify database is running"
    echo "  Test connection manually"
elif echo "$ERROR_LOG" | grep -qi "Cannot find module\|MODULE_NOT_FOUND"; then
    echo -e "${YELLOW}⚠️  Missing dependencies${NC}"
    echo "Solution:"
    echo "  npm install --production"
    echo "  cd client && npm install && npm run build && cd .."
elif echo "$ERROR_LOG" | grep -qi "EACCES\|permission"; then
    echo -e "${YELLOW}⚠️  Permission error${NC}"
    echo "Solution:"
    echo "  sudo chown -R \$USER:\$USER /var/www/spokewheel"
    echo "  chmod +x server.js"
else
    echo -e "${YELLOW}⚠️  Check the error logs above for specific issue${NC}"
fi

echo ""
echo "✅ Diagnostic Complete!"
echo ""
echo "Next steps:"
echo "1. Review the error messages above"
echo "2. Apply the suggested solution"
echo "3. Restart: pm2 restart spokewheel"
echo "4. Check status: pm2 status"


