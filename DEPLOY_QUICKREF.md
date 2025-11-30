# Quick Deployment Reference

Quick commands for deploying SpokeWheel to production.

## Pre-Deployment Checklist

- [ ] Server IP: `curl ifconfig.me`
- [ ] DNS A record points to server IP
- [ ] SSH access to server
- [ ] Domain name ready

## Quick Commands

### On Your Server

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2
sudo npm install -g pm2

# 3. Install Nginx
sudo apt update && sudo apt install -y nginx

# 4. Install PostgreSQL (if using)
sudo apt install -y postgresql postgresql-contrib

# 5. Upload your code to /var/www/spokewheel

# 6. Install dependencies
cd /var/www/spokewheel
npm install --production
cd client && npm install && npm run build && cd ..

# 7. Create .env file (copy from .env.production.example)

# 8. Set up database (PostgreSQL)
sudo -u postgres psql
CREATE DATABASE spokewheel;
CREATE USER spokewheel_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE spokewheel TO spokewheel_user;
\c spokewheel
GRANT ALL ON SCHEMA public TO spokewheel_user;
\q

# 9. Start with PM2
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 10. Configure Nginx
sudo cp nginx-production.conf /etc/nginx/sites-available/spokewheel
sudo nano /etc/nginx/sites-available/spokewheel  # Update domain name
sudo ln -s /etc/nginx/sites-available/spokewheel /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 11. Set up SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d spokewheel.app -d www.spokewheel.app

# 12. Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Common Commands

```bash
# View logs
pm2 logs spokewheel
sudo tail -f /var/log/nginx/spokewheel_error.log

# Restart application
pm2 restart spokewheel

# Update application
cd /var/www/spokewheel
git pull  # or upload new files
npm install --production
cd client && npm install && npm run build && cd ..
pm2 restart spokewheel

# Check status
pm2 status
sudo systemctl status nginx
```

## File Locations

- Application: `/var/www/spokewheel`
- Nginx config: `/etc/nginx/sites-available/spokewheel`
- SSL certificates: `/etc/letsencrypt/live/spokewheel.app/`
- Logs: `/var/www/spokewheel/logs/` (PM2) and `/var/log/nginx/` (Nginx)

## Troubleshooting

```bash
# Application not starting?
pm2 logs spokewheel
pm2 restart spokewheel

# Nginx errors?
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Database issues?
sudo systemctl status postgresql
sudo -u postgres psql -d spokewheel
```

For detailed instructions, see `PRODUCTION_DEPLOY.md`

