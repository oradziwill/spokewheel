#!/bin/bash
# Setup script for Nginx on macOS

echo "🚀 Setting up Nginx for SpokeWheel..."
echo ""

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx is not installed. Installing..."
    brew install nginx
else
    echo "✅ Nginx is already installed"
    nginx -v
fi

echo ""

# Create log directory if it doesn't exist
LOG_DIR="/opt/homebrew/var/log/nginx"
if [ ! -d "$LOG_DIR" ]; then
    echo "Creating log directory: $LOG_DIR"
    mkdir -p "$LOG_DIR"
fi

# Copy nginx config to servers directory
CONFIG_FILE="nginx-spokewheel.conf"
SERVERS_DIR="/opt/homebrew/etc/nginx/servers"
TARGET_FILE="$SERVERS_DIR/spokewheel.conf"

echo "📝 Installing Nginx configuration..."
cp "$CONFIG_FILE" "$TARGET_FILE"
echo "✅ Configuration installed to: $TARGET_FILE"

echo ""
echo "🔍 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Nginx configuration is valid!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Build your React app:"
    echo "   cd client && npm run build && cd .."
    echo ""
    echo "2. Make sure your Node.js server is running on port 3001"
    echo ""
    echo "3. Start Nginx:"
    echo "   brew services start nginx"
    echo "   # Or run manually: nginx"
    echo ""
    echo "4. Test your site:"
    echo "   curl http://localhost:8080"
    echo "   curl http://localhost:8080/api/axes"
    echo ""
    echo "📝 Note: On macOS, Nginx runs on port 8080 by default (not 80)"
    echo "   For production, you'll need to:"
    echo "   - Set up port forwarding or use a reverse proxy"
    echo "   - Configure SSL/HTTPS with Let's Encrypt"
else
    echo ""
    echo "❌ Nginx configuration has errors. Please check the config file."
    exit 1
fi

