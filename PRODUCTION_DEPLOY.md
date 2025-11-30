# Production Deployment Guide for SpokeWheel

Complete step-by-step guide to deploy SpokeWheel to your production server.

## Prerequisites

- [ ] Server/VPS with Ubuntu 20.04+ (DigitalOcean, AWS, Linode, etc.)
- [ ] Domain name (e.g., `spokewheel.app`)
- [ ] SSH access to your server
- [ ] Root or sudo access on the server

## Step 1: Server Setup (5 minutes)

### 1.1 Connect to Your Server

```bash
ssh user@your-server-ip
```

### 1.2 Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Get Your Server IP

```bash
curl ifconfig.me
# Note this IP - you'll need it for DNS configuration
```

## Step 2: DNS Configuration (5 minutes)

### 2.1 Configure DNS Records

Go to your domain registrar (Squarespace Domains, Namecheap, etc.) and add:

**A Record:**

- Type: `A`
- Name: `@` (or blank for root domain)
- Value: `YOUR_SERVER_IP` (from Step 1.3)
- TTL: `3600`

**CNAME Record (optional for www):**

- Type: `CNAME`
- Name: `www`
- Value: `spokewheel.app`
- TTL: `3600`

### 2.2 Verify DNS

Wait 5-15 minutes, then verify:

```bash
dig +short spokewheel.app
# Should return your server IP
```

## Step 3: Install Node.js and Dependencies (5 minutes)

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node -v  # Should show v18.x or higher
npm -v
```

## Step 4: Install PM2 (Process Manager) (2 minutes)

```bash
sudo npm install -g pm2
```

## Step 5: Install Nginx (2 minutes)

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 6: Deploy Your Application (10 minutes)

### 6.1 Upload Your Code

**Option A: Using Git (Recommended)**

```bash
# On your server
cd /var/www
sudo mkdir -p spokewheel
sudo chown $USER:$USER spokewheel
cd spokewheel
git clone YOUR_REPO_URL .
```

**Option B: Using SCP**

```bash
# From your local machine
scp -r /Users/aleksandraradziwill/Workspaces/feedback_vibe/* user@your-server:/var/www/spokewheel/
```

### 6.2 Install Dependencies

```bash
cd /var/www/spokewheel

# Install server dependencies
npm install --production

# Install client dependencies and build
cd client
npm install
npm run build
cd ..
```

### 6.3 Create Environment File

```bash
nano .env
```

Add the following (update with your values):

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Frontend URL (your domain)
FRONTEND_BASE_URL=https://spokewheel.app

# Database Configuration (PostgreSQL)
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spokewheel
DB_USER=spokewheel_user
DB_PASSWORD=your_secure_password_here
DB_SSL=false

# Or use SQLite (simpler, but not recommended for production)
# DB_TYPE=sqlite
```

**Important:** Use a strong password for `DB_PASSWORD`!

### 6.4 Set Up Database

**Option A: PostgreSQL (Recommended)**

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
```

In PostgreSQL prompt:

```sql
CREATE DATABASE spokewheel;
CREATE USER spokewheel_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE spokewheel TO spokewheel_user;
\c spokewheel
GRANT ALL ON SCHEMA public TO spokewheel_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO spokewheel_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO spokewheel_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO spokewheel_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO spokewheel_user;
\q
```

**Option B: SQLite (Simpler, but less scalable)**

```bash
# SQLite files will be created automatically
# Just make sure the directory is writable
chmod 664 admin_feedback.db feedback.db 2>/dev/null || true
```

## Step 7: Configure PM2 (3 minutes)

### 7.1 Create Logs Directory

```bash
mkdir -p /var/www/spokewheel/logs
```

### 7.2 Start Application with PM2

```bash
cd /var/www/spokewheel
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Follow the instructions it provides to enable auto-start on boot
```

### 7.3 Verify PM2

```bash
pm2 status
pm2 logs spokewheel
```

You should see your application running.

## Step 8: Configure Nginx (5 minutes)

### 8.1 Copy Nginx Configuration

```bash
sudo cp /var/www/spokewheel/nginx-production.conf /etc/nginx/sites-available/spokewheel
```

### 8.2 Update Domain Name

```bash
sudo nano /etc/nginx/sites-available/spokewheel
```

Replace `spokewheel.app` with your actual domain name (if different).

### 8.3 Update Build Path

Make sure the `root` path in the config matches your deployment:

```nginx
root /var/www/spokewheel/client/build;
```

### 8.4 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/spokewheel /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

## Step 9: Set Up SSL/HTTPS (5 minutes)

### 9.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 9.2 Get SSL Certificate

```bash
sudo certbot --nginx -d spokewheel.app -d www.spokewheel.app
```

Certbot will:

- Automatically configure Nginx for HTTPS
- Set up auto-renewal
- Redirect HTTP to HTTPS

### 9.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

## Step 10: Firewall Configuration (2 minutes)

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Step 11: Testing (5 minutes)

### 11.1 Test Your Domain

```bash
# From your local machine
curl -I https://spokewheel.app
curl https://spokewheel.app/api/axes
```

### 11.2 Test in Browser

1. Open `https://spokewheel.app` in your browser
2. You should see the SpokeWheel interface
3. Try registering a user
4. Test creating a person and generating a link
5. Test submitting feedback

### 11.3 Check Logs

```bash
# PM2 logs
pm2 logs spokewheel

# Nginx logs
sudo tail -f /var/log/nginx/spokewheel_access.log
sudo tail -f /var/log/nginx/spokewheel_error.log
```

## Step 12: Security Checklist

- [ ] Changed default admin password (in database)
- [ ] Strong database password set
- [ ] `.env` file not in version control (check `.gitignore`)
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] SSL certificate installed and auto-renewal working
- [ ] PM2 auto-restart enabled
- [ ] Regular backups configured (see below)

## Step 13: Backup Configuration (Optional but Recommended)

### 13.1 Create Backup Script

```bash
nano /var/www/spokewheel/backup.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/spokewheel"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
if [ "$DB_TYPE" = "postgresql" ]; then
    pg_dump -U spokewheel_user spokewheel > $BACKUP_DIR/db_$DATE.sql
else
    cp /var/www/spokewheel/admin_feedback.db $BACKUP_DIR/admin_feedback_$DATE.db
fi

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete
```

Make executable:

```bash
chmod +x /var/www/spokewheel/backup.sh
```

### 13.2 Set Up Cron Job

```bash
crontab -e
```

Add:

```bash
# Daily backup at 2 AM
0 2 * * * /var/www/spokewheel/backup.sh
```

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 status
pm2 status
pm2 logs spokewheel

# Check if port is in use
sudo lsof -i :3001

# Restart application
pm2 restart spokewheel
```

### Nginx Not Working

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
sudo -u postgres psql -d spokewheel -U spokewheel_user

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually if needed
sudo certbot renew
```

## Maintenance Commands

```bash
# View application logs
pm2 logs spokewheel

# Restart application
pm2 restart spokewheel

# Stop application
pm2 stop spokewheel

# Update application
cd /var/www/spokewheel
git pull  # or upload new files
npm install --production
cd client && npm install && npm run build && cd ..
pm2 restart spokewheel

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx config
sudo nginx -t && sudo systemctl reload nginx
```

## Next Steps

1. **Change default admin password** - Log in as admin and change password
2. **Set up monitoring** - Consider using PM2 Plus or other monitoring tools
3. **Configure email** - If you need email notifications
4. **Set up CDN** - For better performance (Cloudflare, etc.)
5. **Enable logging** - Set up proper log rotation

## Support

If you encounter issues:

1. Check the logs (PM2 and Nginx)
2. Verify all environment variables are set correctly
3. Ensure DNS is pointing to your server
4. Check firewall rules
5. Verify SSL certificate is valid

---

**Congratulations! Your SpokeWheel application is now live in production! 🎉**
