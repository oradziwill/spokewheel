#!/bin/bash
# Production Deployment Script for SpokeWheel
# Run this on your production server

set -e  # Exit on error

echo "🚀 SpokeWheel Production Deployment"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root (some commands need sudo)
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}Please don't run this script as root. Run as a regular user with sudo privileges.${NC}"
    exit 1
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
echo -e "${GREEN}Detected server IP: ${SERVER_IP}${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}Node.js $(node -v) is installed${NC}"
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing...${NC}"
    sudo npm install -g pm2
else
    echo -e "${GREEN}PM2 is installed${NC}"
fi

# Check Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx not found. Installing...${NC}"
    sudo apt update
    sudo apt install -y nginx
else
    echo -e "${GREEN}Nginx is installed${NC}"
fi

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Make sure your code is in the project directory"
echo "2. Create/update .env file with production settings"
echo "3. Run: npm install --production"
echo "4. Run: cd client && npm install && npm run build && cd .."
echo "5. Run: pm2 start ecosystem.config.js"
echo "6. Configure Nginx (see nginx-production.conf)"
echo "7. Set up SSL with Let's Encrypt"
echo ""
echo -e "${GREEN}For detailed instructions, see PRODUCTION_DEPLOY.md${NC}"


