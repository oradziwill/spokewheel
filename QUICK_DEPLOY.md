# Quick Deployment Checklist

A simple checklist for deploying SpokeWheel to production.

## Prerequisites

- [ ] Domain purchased (e.g., `spokewheel.com`)
- [ ] Server/VPS set up (e.g., DigitalOcean, AWS, Linode)
- [ ] SSH access to server
- [ ] Node.js installed on server

## Domain Setup (5 minutes)

1. **Get your server IP address**

   ```bash
   # On your server
   curl ifconfig.me
   ```

2. **Configure DNS at your registrar**

   - Add **A Record**: `@` → `your.server.ip.address`
   - Add **CNAME**: `www` → `yourdomain.com`
   - Wait 5-60 minutes for DNS propagation

3. **Verify DNS**
   ```bash
   nslookup yourdomain.com
   # Should show your server IP
   ```

## Database Setup (10 minutes)

### Option A: Keep SQLite (Simplest)

```bash
# On your server
cd /path/to/feedback_vibe
chmod 664 admin_feedback.db feedback.db
# That's it! SQLite is ready.
```

### Option B: PostgreSQL (Recommended)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql

# Create database
sudo -u postgres psql
CREATE DATABASE spokewheel;
CREATE USER spokewheel_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE spokewheel TO spokewheel_user;
\q

# Install Node.js driver
npm install pg
```

**Note**: You'll need to update `admin-db.js` to use PostgreSQL instead of SQLite.

## Application Setup (10 minutes)

1. **Clone/Upload your code to server**

   ```bash
   git clone your-repo-url
   cd feedback_vibe
   ```

2. **Install dependencies**

   ```bash
   npm install --production
   cd client && npm install && npm run build && cd ..
   ```

3. **Create `.env` file**

   ```bash
   nano .env
   ```

   Add:

   ```bash
   PORT=3001
   NODE_ENV=production
   FRONTEND_BASE_URL=https://yourdomain.com
   ```

4. **Install PM2**

   ```bash
   sudo npm install -g pm2
   ```

5. **Start application**
   ```bash
   pm2 start server.js --name spokewheel
   pm2 save
   pm2 startup
   # Follow the instructions it provides
   ```

## Web Server Setup (10 minutes)

1. **Install Nginx**

   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Create Nginx config**

   ```bash
   sudo nano /etc/nginx/sites-available/spokewheel
   ```

   Paste:

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           root /path/to/feedback_vibe/client/build;
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/spokewheel /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## SSL Setup (5 minutes)

1. **Install Certbot**

   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Get SSL certificate**

   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. **Done!** Certbot automatically configures HTTPS and auto-renewal.

## Security Checklist

- [ ] Changed default admin password in `admin-db.js`
- [ ] `.env` file not in version control (add to `.gitignore`)
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] Database password is strong
- [ ] HTTPS working (check `https://yourdomain.com`)

## Testing

1. **Test domain**

   ```bash
   curl https://yourdomain.com
   ```

2. **Test API**

   ```bash
   curl https://yourdomain.com/api/axes
   ```

3. **Open in browser**
   - Go to `https://yourdomain.com`
   - Register a new user
   - Create a person
   - Generate a feedback link
   - Test feedback submission

## Troubleshooting

**Domain not working?**

- Check DNS: `nslookup yourdomain.com`
- Wait up to 48 hours for full propagation

**Application not starting?**

- Check logs: `pm2 logs spokewheel`
- Check environment: `pm2 env spokewheel`

**Nginx errors?**

- Test config: `sudo nginx -t`
- Check logs: `sudo tail -f /var/log/nginx/error.log`

**Database issues?**

- Check if running: `sudo systemctl status postgresql`
- Test connection: `psql -U spokewheel_user -d spokewheel`

## Next Steps

- [ ] Set up automated backups
- [ ] Configure monitoring (e.g., PM2 monitoring)
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure rate limiting
- [ ] Set up email notifications (optional)

## Need Help?

See the full **[DEPLOYMENT.md](./DEPLOYMENT.md)** guide for detailed instructions.
