#!/bin/bash
# Direct Nginx Management (No systemctl/service)
# For systems without init systems

echo "🔍 Direct Nginx Management"
echo "========================="
echo ""

# Check what system we're on
echo "System Information:"
echo "------------------"
uname -a
echo ""

if [ -f /etc/os-release ]; then
    cat /etc/os-release
    echo ""
fi

# Check if nginx is installed
echo "Checking Nginx Installation:"
echo "---------------------------"
if command -v nginx &> /dev/null; then
    echo "✅ Nginx is installed"
    nginx -v
    echo ""
    echo "Nginx binary location:"
    which nginx
else
    echo "❌ Nginx is not installed"
    echo "Install with: sudo apt install nginx (or your package manager)"
    exit 1
fi

echo ""
echo "📋 Direct Nginx Commands:"
echo "========================"
echo ""
echo "1. Check if nginx is running:"
echo "   ps aux | grep nginx"
echo ""
echo "2. Test nginx configuration:"
echo "   sudo nginx -t"
echo ""
echo "3. Start nginx (if not running):"
echo "   sudo nginx"
echo ""
echo "4. Stop nginx:"
echo "   sudo nginx -s stop"
echo ""
echo "5. Reload nginx (after config changes):"
echo "   sudo nginx -s reload"
echo ""
echo "6. Check nginx processes:"
echo "   ps aux | grep nginx"
echo ""
echo "7. Check if ports are listening:"
echo "   sudo netstat -tuln | grep -E '80|443'"
echo "   # or"
echo "   sudo lsof -i :80"
echo "   sudo lsof -i :443"
echo ""

# Check current status
echo "Current Status:"
echo "--------------"
if pgrep -x nginx > /dev/null; then
    echo "✅ Nginx is running"
    ps aux | grep nginx | grep -v grep
else
    echo "❌ Nginx is NOT running"
    echo ""
    echo "To start nginx:"
    echo "  sudo nginx"
fi

echo ""
echo "Configuration Test:"
echo "------------------"
if sudo nginx -t 2>&1; then
    echo ""
    echo "✅ Configuration is valid"
else
    echo ""
    echo "❌ Configuration has errors - fix them first"
fi


