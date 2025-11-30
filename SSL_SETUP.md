# SSL/HTTPS Setup Guide for SpokeWheel

Complete guide to set up free SSL certificates using Let's Encrypt.

## Prerequisites

Before starting, ensure:

- ✅ Your domain DNS is pointing to your server IP
- ✅ Nginx is installed and configured
- ✅ Your site is accessible via HTTP (port 80)
- ✅ Firewall allows ports 80 and 443

Verify DNS:

```bash
dig +short yourdomain.com
# Should return your server IP
```

## Step 1: Install Certbot (5 minutes)

### For Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### For RHEL/CentOS:

```bash
sudo yum install -y certbot python3-certbot-nginx
# or for newer versions:
sudo dnf install -y certbot python3-certbot-nginx
```

### For macOS (if testing locally):

```bash
brew install certbot
```

## Step 2: Prepare Nginx Configuration

### Option A: HTTP Only (Before SSL)

If you haven't set up SSL yet, create a simple HTTP config first:

```bash
sudo nano /etc/nginx/sites-available/spokewheel
```

Paste this (replace `spokewheel.app` with your domain):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name spokewheel.app www.spokewheel.app;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Serve React app
    location / {
        root /var/www/spokewheel/client/build;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Test and reload:

```bash
sudo nginx -t
sudo nginx -s reload  # or sudo service nginx reload
```

### Option B: Already Have Config

If you already have a config, make sure it has the `.well-known` location for Let's Encrypt:

```nginx
location /.well-known/acme-challenge/ {
    root /var/www/html;
}
```

## Step 3: Obtain SSL Certificate (5 minutes)

### Automatic Method (Recommended)

Certbot can automatically configure Nginx:

```bash
sudo certbot --nginx -d spokewheel.app -d www.spokewheel.app
```

**Replace `spokewheel.app` with your actual domain!**

This will:

1. Obtain the certificate
2. Automatically update your Nginx config
3. Set up auto-renewal
4. Redirect HTTP to HTTPS

**During the process, you'll be asked:**

- Email address (for renewal notices)
- Agree to terms of service
- Share email with EFF (optional)

### Manual Method (If automatic doesn't work)

```bash
# 1. Obtain certificate only (no auto-config)
sudo certbot certonly --nginx -d spokewheel.app -d www.spokewheel.app

# 2. Then manually update your Nginx config (see Step 4)
```

## Step 4: Verify Certificate

```bash
# Check certificate status
sudo certbot certificates

# Test certificate
sudo certbot renew --dry-run
```

You should see your certificate listed with expiration date.

## Step 5: Verify HTTPS Works

```bash
# Test from server
curl -I https://spokewheel.app

# Test API
curl https://spokewheel.app/api/axes
```

Open in browser: `https://spokewheel.app` - you should see the lock icon.

## Step 6: Auto-Renewal Setup

Certbot automatically sets up renewal, but verify:

```bash
# Check renewal timer
sudo systemctl status certbot.timer
# or
sudo service certbot status

# Test renewal (dry run)
sudo certbot renew --dry-run
```

### Manual Renewal (if needed)

```bash
sudo certbot renew
sudo nginx -s reload  # Reload nginx after renewal
```

## Troubleshooting

### Issue 1: "Failed to obtain certificate"

**Error:** `Failed to obtain certificate` or `Connection refused`

**Solutions:**

1. **Check DNS is pointing to your server:**

   ```bash
   dig +short yourdomain.com
   ```

2. **Check port 80 is open:**

   ```bash
   sudo netstat -tuln | grep :80
   sudo ufw allow 80/tcp
   ```

3. **Check Nginx is running:**

   ```bash
   ps aux | grep nginx
   sudo nginx  # Start if not running
   ```

4. **Check firewall:**
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

### Issue 2: "Domain does not point to this server"

**Solution:**

- Wait for DNS propagation (can take up to 48 hours)
- Verify DNS: `dig +short yourdomain.com`
- Make sure it returns your server IP

### Issue 3: "Port 80 is already in use"

**Solution:**

```bash
# Find what's using port 80
sudo lsof -i :80

# Stop the conflicting service or change nginx port
```

### Issue 4: Certificate renewal fails

**Solution:**

```bash
# Check renewal logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Manually renew
sudo certbot renew --force-renewal
sudo nginx -s reload
```

### Issue 5: "nginx: command not found" during certbot

**Solution:**

- Make sure nginx is installed and in PATH
- Use `certbot certonly --standalone` instead of `--nginx`

## Manual Nginx SSL Configuration

If Certbot didn't auto-configure, add this to your Nginx config:

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name spokewheel.app www.spokewheel.app;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name spokewheel.app www.spokewheel.app;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/spokewheel.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/spokewheel.app/privkey.pem;

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

    # Your existing location blocks
    location / {
        root /var/www/spokewheel/client/build;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then:

```bash
sudo nginx -t
sudo nginx -s reload
```

## Update Your .env File

Make sure your `.env` file has HTTPS URL:

```bash
FRONTEND_BASE_URL=https://spokewheel.app
```

Then restart your application:

```bash
pm2 restart spokewheel
```

## Security Checklist

After SSL setup:

- [ ] HTTPS is working (`https://yourdomain.com`)
- [ ] HTTP redirects to HTTPS
- [ ] Certificate auto-renewal is set up
- [ ] Security headers are configured
- [ ] `.env` file has HTTPS URL
- [ ] Application restarted with new URL

## Testing SSL

```bash
# Test SSL certificate
openssl s_client -connect spokewheel.app:443 -servername spokewheel.app

# Test from browser
# Visit https://spokewheel.app
# Check for lock icon in address bar
```

## Quick Reference

```bash
# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Renew certificate
sudo certbot renew

# Check certificates
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Revoke certificate (if needed)
sudo certbot revoke --cert-path /etc/letsencrypt/live/yourdomain.com/cert.pem
```

## Next Steps

After SSL is set up:

1. ✅ Test your site: `https://yourdomain.com`
2. ✅ Test API: `https://yourdomain.com/api/axes`
3. ✅ Update any hardcoded HTTP URLs
4. ✅ Monitor certificate expiration (auto-renewal should handle this)

---

**Congratulations! Your site is now secured with HTTPS! 🔒**

