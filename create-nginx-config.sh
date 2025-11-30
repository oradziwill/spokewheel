#!/bin/bash
# Create Nginx Production Config on Server
# Run this on your production server

echo "📝 Creating Nginx Production Configuration"
echo "=========================================="
echo ""

# Get domain name
read -p "Enter your domain name (e.g., spokewheel.app): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN="spokewheel.app"
    echo "Using default: $DOMAIN"
fi

# Get project path
read -p "Enter your project path (default: /var/www/spokewheel): " PROJECT_PATH
if [ -z "$PROJECT_PATH" ]; then
    PROJECT_PATH="/var/www/spokewheel"
fi

echo ""
echo "Creating Nginx config for domain: $DOMAIN"
echo "Project path: $PROJECT_PATH"
echo ""

# Create the nginx config file
cat > /tmp/nginx-spokewheel.conf << EOF
# Nginx Production Configuration for SpokeWheel
# Domain: $DOMAIN

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL certificates (update paths after running certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Serve React app
    location / {
        root $PROJECT_PATH/client/build;
        try_files \$uri \$uri/ /index.html;
        index index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to Node.js backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Error and access logs
    error_log /var/log/nginx/spokewheel_error.log;
    access_log /var/log/nginx/spokewheel_access.log;
}
EOF

# Copy to project directory
cp /tmp/nginx-spokewheel.conf $PROJECT_PATH/nginx-production.conf
echo "✅ Created: $PROJECT_PATH/nginx-production.conf"

# Copy to nginx sites-available
sudo cp /tmp/nginx-spokewheel.conf /etc/nginx/sites-available/spokewheel
echo "✅ Created: /etc/nginx/sites-available/spokewheel"

echo ""
echo "📋 Next steps:"
echo "1. Review the config: sudo nano /etc/nginx/sites-available/spokewheel"
echo "2. Test configuration: sudo nginx -t"
echo "3. Enable site: sudo ln -s /etc/nginx/sites-available/spokewheel /etc/nginx/sites-enabled/"
echo "4. Remove default: sudo rm /etc/nginx/sites-enabled/default"
echo "5. Reload nginx: sudo systemctl reload nginx"
echo ""
echo "⚠️  Note: SSL certificates will be added automatically when you run certbot"
echo "   For now, you can test with HTTP (port 80) by temporarily commenting out SSL lines"


