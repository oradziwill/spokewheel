# Production Deployment Guide

This guide will walk you through setting up SpokeWheel for production, including domain configuration and database setup.

## Table of Contents

1. [Domain Setup](#domain-setup)
2. [Database Setup](#database-setup)
3. [Server Configuration](#server-configuration)
4. [Environment Variables](#environment-variables)
5. [SSL/HTTPS Setup](#sslhttps-setup)
6. [Testing](#testing)

## Domain Setup

### Step 1: Purchase and Configure Domain

1. **Purchase a domain** from a registrar (e.g., Namecheap, GoDaddy, Google Domains)
2. **Note your domain**: e.g., `spokewheel.com` or `feedback.yourcompany.com`

### Step 2: Set Up DNS Records

Configure your DNS records to point to your server:

#### Option A: Using a VPS/Cloud Server (DigitalOcean, AWS, etc.)

1. **Get your server IP address** (e.g., `123.45.67.89`)

2. **Add DNS A Record**:

   - **Type**: A
   - **Name**: `@` (or your subdomain like `feedback`)
   - **Value**: Your server IP address (e.g., `123.45.67.89`)
   - **TTL**: 3600 (or default)

3. **Add CNAME for www** (optional):
   - **Type**: CNAME
   - **Name**: `www`
   - **Value**: `yourdomain.com`
   - **TTL**: 3600

#### Option B: Using a Platform (Heroku, Vercel, etc.)

1. **Heroku**: Add your domain in Heroku dashboard → Settings → Domains
2. **Vercel**: Add domain in project settings → Domains
3. **Follow platform-specific DNS instructions**

### Step 3: Verify DNS Propagation

Wait 5-60 minutes for DNS to propagate, then verify:

```bash
# Check if DNS is working
nslookup yourdomain.com
# or
dig yourdomain.com
```

## Database Setup

### Option 1: PostgreSQL (Recommended for Production)

#### Step 1: Install PostgreSQL

**On Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**On macOS:**

```bash
brew install postgresql
brew services start postgresql
```

**On Windows:**
Download from https://www.postgresql.org/download/windows/

#### Step 2: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE spokewheel;

# Create user
CREATE USER spokewheel_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE spokewheel TO spokewheel_user;

# Exit
\q
```

#### Step 3: Install PostgreSQL Driver for Node.js

```bash
npm install pg
```

#### Step 4: Update Database Connection

Create a new file `db-postgres.js`:

```javascript
const { Pool } = require("pg");
const pool = new Pool({
  user: process.env.DB_USER || "spokewheel_user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "spokewheel",
  password: process.env.DB_PASSWORD || "your_secure_password",
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to PostgreSQL database");
  }
});

module.exports = pool;
```

#### Step 5: Migrate Data from SQLite

Create a migration script `migrate-to-postgres.js`:

```javascript
const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");
const fs = require("fs");

// SQLite connection
const sqliteDb = new sqlite3.Database("./admin_feedback.db");

// PostgreSQL connection
const pgPool = new Pool({
  user: process.env.DB_USER || "spokewheel_user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "spokewheel",
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function migrate() {
  console.log("Starting migration...");

  // Read SQLite schema and create PostgreSQL tables
  // (You'll need to adapt the SQLite schema to PostgreSQL)

  // Example: Migrate users table
  sqliteDb.all("SELECT * FROM users", async (err, rows) => {
    if (err) {
      console.error("Error reading SQLite:", err);
      return;
    }

    for (const row of rows) {
      await pgPool.query(
        `INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, created_at, last_login)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          row.username,
          row.email,
          row.password_hash,
          row.full_name,
          row.role,
          row.is_active,
          row.created_at,
          row.last_login,
        ]
      );
    }
    console.log("Migrated users table");
  });

  // Repeat for other tables...

  sqliteDb.close();
  await pgPool.end();
  console.log("Migration complete!");
}

migrate();
```

### Option 2: MySQL/MariaDB

#### Step 1: Install MySQL

**On Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install mysql-server
```

**On macOS:**

```bash
brew install mysql
brew services start mysql
```

#### Step 2: Create Database and User

```bash
# Login to MySQL
sudo mysql -u root

# Create database
CREATE DATABASE spokewheel;

# Create user
CREATE USER 'spokewheel_user'@'localhost' IDENTIFIED BY 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON spokewheel.* TO 'spokewheel_user'@'localhost';
FLUSH PRIVILEGES;

# Exit
EXIT;
```

#### Step 3: Install MySQL Driver

```bash
npm install mysql2
```

### Option 3: Keep SQLite (Not Recommended for Production)

If you want to keep SQLite for simplicity:

1. **Ensure database file is writable**:

   ```bash
   chmod 664 admin_feedback.db
   chmod 664 feedback.db
   ```

2. **Set proper file permissions**:

   ```bash
   sudo chown www-data:www-data admin_feedback.db
   sudo chown www-data:www-data feedback.db
   ```

3. **Backup regularly**:
   ```bash
   # Add to crontab
   0 2 * * * cp /path/to/admin_feedback.db /path/to/backups/admin_feedback_$(date +\%Y\%m\%d).db
   ```

## Server Configuration

### Step 1: Install Node.js and Dependencies

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Navigate to project directory
cd /path/to/feedback_vibe

# Install dependencies
npm install --production
cd client && npm install && npm run build && cd ..
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Frontend URL (your domain)
FRONTEND_BASE_URL=https://yourdomain.com

# Database Configuration (if using PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spokewheel
DB_USER=spokewheel_user
DB_PASSWORD=your_secure_password
DB_SSL=false

# Database Configuration (if using MySQL)
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=spokewheel
# DB_USER=spokewheel_user
# DB_PASSWORD=your_secure_password
```

**Important**: Add `.env` to `.gitignore` to prevent committing secrets!

### Step 3: Install Process Manager (PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start server.js --name spokewheel

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

### Step 4: Configure Nginx

Install Nginx:

```bash
sudo apt update
sudo apt install nginx
```

Create Nginx configuration file `/etc/nginx/sites-available/spokewheel`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Serve React app
    location / {
        root /path/to/feedback_vibe/client/build;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Proxy API requests to Node.js server
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

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/spokewheel /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL/HTTPS Setup

### Using Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically configure Nginx for HTTPS
# It will also set up auto-renewal
```

### Update Nginx Configuration for HTTPS

After SSL setup, update your Nginx config to redirect HTTP to HTTPS:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Serve React app
    location / {
        root /path/to/feedback_vibe/client/build;
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

## Testing

### Step 1: Test Domain

```bash
# Check if domain resolves
curl -I https://yourdomain.com

# Test API
curl https://yourdomain.com/api/axes
```

### Step 2: Test Application

1. **Open your domain** in a browser: `https://yourdomain.com`
2. **Register a new user** in "People Management"
3. **Create a person** and generate a feedback link
4. **Test feedback submission** through the link
5. **Login as admin** and verify all data is visible

### Step 3: Monitor Logs

```bash
# View PM2 logs
pm2 logs spokewheel

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Using HTTPS (SSL certificate installed)
- [ ] Environment variables set securely
- [ ] Database password is strong
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] Regular backups configured
- [ ] PM2 auto-restart on failure
- [ ] Nginx security headers configured
- [ ] `.env` file not in version control

## Backup Strategy

### Database Backups

**PostgreSQL:**

```bash
# Daily backup script
pg_dump -U spokewheel_user spokewheel > backup_$(date +%Y%m%d).sql

# Restore
psql -U spokewheel_user spokewheel < backup_20240101.sql
```

**SQLite:**

```bash
# Simple copy
cp admin_feedback.db backups/admin_feedback_$(date +%Y%m%d).db
```

### Automated Backups

Add to crontab (`crontab -e`):

```bash
# Daily database backup at 2 AM
0 2 * * * pg_dump -U spokewheel_user spokewheel > /path/to/backups/spokewheel_$(date +\%Y\%m\%d).sql

# Keep only last 30 days
0 3 * * * find /path/to/backups -name "*.sql" -mtime +30 -delete
```

## Troubleshooting

### Domain Not Resolving

1. Check DNS propagation: `nslookup yourdomain.com`
2. Verify DNS records in your registrar
3. Wait up to 48 hours for full propagation

### Database Connection Issues

1. Check database is running: `sudo systemctl status postgresql`
2. Verify credentials in `.env`
3. Check firewall: `sudo ufw status`
4. Test connection: `psql -U spokewheel_user -d spokewheel`

### Application Not Starting

1. Check PM2 logs: `pm2 logs spokewheel`
2. Verify environment variables: `pm2 env spokewheel`
3. Check Node.js version: `node --version`
4. Verify dependencies: `npm install --production`

### Nginx Errors

1. Test configuration: `sudo nginx -t`
2. Check error logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify file permissions: `ls -la /path/to/client/build`

## Support

For issues or questions:

- Check application logs: `pm2 logs spokewheel`
- Check Nginx logs: `/var/log/nginx/error.log`
- Verify all environment variables are set correctly
- Ensure database is accessible and running
