#!/bin/bash
# SSL Setup Script for SpokeWheel
# This script helps you set up SSL/HTTPS with Let's Encrypt

set -e

echo "🔒 SSL/HTTPS Setup for SpokeWheel"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get domain name
read -p "Enter your domain name (e.g., spokewheel.app): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domain name is required!${NC}"
    exit 1
fi

echo ""
echo "📋 Pre-flight Checks:"
echo "-------------------"

# Check DNS
echo "1. Checking DNS..."
DNS_IP=$(dig +short $DOMAIN | head -1)
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)

if [ -z "$DNS_IP" ]; then
    echo -e "${RED}❌ DNS not resolving for $DOMAIN${NC}"
    echo "   Make sure your DNS A record points to your server"
    exit 1
elif [ "$DNS_IP" = "$SERVER_IP" ]; then
    echo -e "${GREEN}✅ DNS is pointing to this server ($DNS_IP)${NC}"
else
    echo -e "${YELLOW}⚠️  DNS points to $DNS_IP, but server IP is $SERVER_IP${NC}"
    echo "   This might cause issues. Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check Nginx
echo ""
echo "2. Checking Nginx..."
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ Nginx is installed${NC}"
    if pgrep nginx > /dev/null; then
        echo -e "${GREEN}✅ Nginx is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx is not running. Starting...${NC}"
        sudo nginx 2>/dev/null || sudo service nginx start 2>/dev/null || {
            echo -e "${RED}❌ Could not start Nginx${NC}"
            exit 1
        }
    fi
else
    echo -e "${RED}❌ Nginx is not installed${NC}"
    echo "Install with: sudo apt install nginx"
    exit 1
fi

# Check port 80
echo ""
echo "3. Checking port 80..."
if sudo netstat -tuln 2>/dev/null | grep -q ":80 " || sudo lsof -i :80 2>/dev/null | grep -q nginx; then
    echo -e "${GREEN}✅ Port 80 is listening${NC}"
else
    echo -e "${YELLOW}⚠️  Port 80 might not be listening${NC}"
fi

# Check Certbot
echo ""
echo "4. Checking Certbot..."
if command -v certbot &> /dev/null; then
    echo -e "${GREEN}✅ Certbot is installed${NC}"
else
    echo -e "${YELLOW}⚠️  Certbot is not installed. Installing...${NC}"
    if command -v apt &> /dev/null; then
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot python3-certbot-nginx
    else
        echo -e "${RED}❌ Could not install Certbot automatically${NC}"
        echo "Please install Certbot manually"
        exit 1
    fi
fi

echo ""
echo "🚀 Ready to obtain SSL certificate!"
echo ""
echo "Certbot will:"
echo "  1. Obtain certificate for $DOMAIN and www.$DOMAIN"
echo "  2. Automatically configure Nginx"
echo "  3. Set up auto-renewal"
echo "  4. Redirect HTTP to HTTPS"
echo ""
read -p "Continue? (y/n): " -r
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo "🔐 Obtaining SSL certificate..."
echo ""

# Run certbot
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SSL certificate obtained successfully!${NC}"
    echo ""
    echo "🧪 Testing HTTPS..."
    
    # Test HTTPS
    if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✅ HTTPS is working!${NC}"
    else
        echo -e "${YELLOW}⚠️  HTTPS test returned non-200 status${NC}"
    fi
    
    echo ""
    echo "📋 Next steps:"
    echo "1. Test your site: https://$DOMAIN"
    echo "2. Update .env file: FRONTEND_BASE_URL=https://$DOMAIN"
    echo "3. Restart application: pm2 restart spokewheel"
    echo ""
    echo -e "${GREEN}🎉 SSL setup complete!${NC}"
else
    echo ""
    echo -e "${RED}❌ Failed to obtain certificate${NC}"
    echo ""
    echo "Common issues:"
    echo "1. DNS not pointing to this server"
    echo "2. Port 80 not accessible"
    echo "3. Firewall blocking port 80"
    echo ""
    echo "Check the error messages above for details"
    exit 1
fi


