#!/bin/bash
# Alternative Nginx Commands for Non-systemd Systems
# This script detects your system and provides the right commands

echo "🔍 Detecting System Type"
echo "======================="
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    echo "Detected OS: $OS"
elif [ -f /etc/redhat-release ]; then
    OS="rhel"
    echo "Detected OS: RHEL/CentOS (older version)"
elif uname -s | grep -qi "darwin"; then
    OS="macos"
    echo "Detected OS: macOS"
else
    OS="unknown"
    echo "OS: Unknown"
fi

echo ""

# Check for systemd
if command -v systemctl &> /dev/null; then
    echo "✅ systemctl found - using systemd commands"
    echo ""
    echo "Nginx commands:"
    echo "  sudo systemctl status nginx"
    echo "  sudo systemctl start nginx"
    echo "  sudo systemctl stop nginx"
    echo "  sudo systemctl restart nginx"
    echo "  sudo systemctl reload nginx"
    echo "  sudo systemctl enable nginx"
elif command -v service &> /dev/null; then
    echo "✅ service command found - using service commands"
    echo ""
    echo "Nginx commands:"
    echo "  sudo service nginx status"
    echo "  sudo service nginx start"
    echo "  sudo service nginx stop"
    echo "  sudo service nginx restart"
    echo "  sudo service nginx reload"
    echo ""
    echo "To enable on boot:"
    echo "  sudo update-rc.d nginx defaults  # Debian/Ubuntu"
    echo "  sudo chkconfig nginx on          # RHEL/CentOS"
elif [ -f /etc/init.d/nginx ]; then
    echo "✅ Nginx init script found"
    echo ""
    echo "Nginx commands:"
    echo "  sudo /etc/init.d/nginx status"
    echo "  sudo /etc/init.d/nginx start"
    echo "  sudo /etc/init.d/nginx stop"
    echo "  sudo /etc/init.d/nginx restart"
    echo "  sudo /etc/init.d/nginx reload"
elif command -v brew &> /dev/null; then
    echo "✅ Homebrew found - macOS detected"
    echo ""
    echo "Nginx commands:"
    echo "  brew services list"
    echo "  brew services start nginx"
    echo "  brew services stop nginx"
    echo "  brew services restart nginx"
    echo "  nginx -s reload"
else
    echo "⚠️  Could not detect system type"
    echo ""
    echo "Try these commands:"
    echo "  sudo service nginx status"
    echo "  sudo /etc/init.d/nginx status"
    echo "  ps aux | grep nginx"
fi

echo ""
echo "📋 Quick Check Commands:"
echo "----------------------"
echo "Check if nginx is running:"
echo "  ps aux | grep nginx"
echo ""
echo "Check nginx config:"
echo "  sudo nginx -t"
echo ""
echo "Check ports:"
echo "  sudo netstat -tuln | grep -E '80|443'"
echo "  # or"
echo "  sudo lsof -i :80"
echo "  sudo lsof -i :443"


