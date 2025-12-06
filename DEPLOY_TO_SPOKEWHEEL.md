# Deploy SpokeWheel to https://spokewheel.app/

This guide will help you deploy your SpokeWheel app to your domain. Since Squarespace doesn't support Node.js applications, we'll use a hosting provider that does.

## 🎯 Choose Your Hosting Option

### Option 1: Railway (Recommended - Easiest) ⭐

- **No SSH needed** - Everything through web interface
- **Free tier available** - $5 credit/month
- **Automatic HTTPS** - SSL certificates included
- **Built-in PostgreSQL** - Database included
- **Auto-deployments** - Connect GitHub for automatic updates

### Option 2: Render

- **No SSH needed** - Web-based deployment
- **Free tier available** - With limitations
- **Automatic HTTPS** - SSL included
- **PostgreSQL add-on** - Easy database setup

### Option 3: DigitalOcean VPS

- **Full control** - SSH access, custom configuration
- **$6/month** - Basic droplet
- **Requires SSH** - Command-line setup
- **More technical** - Follow PRODUCTION_DEPLOY.md

---

## 🚀 Option 1: Deploy to Railway (Recommended)

### Step 1: Prepare Your Code

First, let's make sure your code is ready:

```bash
# Make sure you're in the project directory
cd /Users/aleksandraradziwill/Workspaces/feedback_vibe

# Build the React app
cd client
npm run build
cd ..
```

### Step 2: Create a Git Repository (if not already done)

Railway works best with Git. If you don't have a Git repository yet:

```bash
# Initialize git (if not already done)
git init

# Create .gitignore if it doesn't exist
cat > .gitignore << 'EOF'
node_modules/
client/node_modules/
*.db
*.db-journal
.env
.DS_Store
logs/
*.log
client/build/
EOF

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit - SpokeWheel app"
```

### Step 3: Push to GitHub

1. **Create a new repository on GitHub:**

   - Go to https://github.com/new
   - Name it `spokewheel` (or any name you prefer)
   - Don't initialize with README
   - Click "Create repository"

2. **Push your code:**

   ```bash
   # Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
   git remote add origin https://github.com/YOUR_USERNAME/spokewheel.git

   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

### Step 4: Deploy to Railway

1. **Sign up for Railway:**

   - Go to https://railway.app
   - Click "Start a New Project"
   - Sign up with GitHub (recommended)

2. **Create a New Project:**

   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `spokewheel` repository
   - Railway will auto-detect Node.js

3. **Add PostgreSQL Database:**

   - In your Railway project, click "+ New"
   - Select "Database" → "Add PostgreSQL"
   - Railway will create a PostgreSQL database automatically

4. **Configure Environment Variables:**

   - Click on your service (the Node.js app)
   - Go to "Variables" tab
   - Add these variables:

   ```
   NODE_ENV=production
   PORT=3001
   FRONTEND_BASE_URL=https://spokewheel.app
   DB_TYPE=postgresql
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_NAME=${{Postgres.PGDATABASE}}
   DB_USER=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   DB_SSL=true
   ```

   **Note:** Railway automatically provides database connection variables. The `${{Postgres.*}}` syntax references the PostgreSQL service you just added.

5. **Set Build and Start Commands:**

   - In your service settings, go to "Settings"
   - **Build Command:** `npm install && cd client && npm install && npm run build`
   - **Start Command:** `node server.js`
   - **Root Directory:** Leave empty (or set to `/`)

   **Note:** Railway will use the `railway.json` file if present, which has the correct build command configured.

6. **Deploy:**
   - Railway will automatically start deploying
   - Wait for deployment to complete (2-5 minutes)
   - You'll get a URL like `spokewheel-production.up.railway.app`

### Step 5: Point Your Domain to Railway

1. **Get Railway's Domain:**

   - In Railway, go to your service
   - Click "Settings" → "Networking"
   - Click "Generate Domain" if not already generated
   - Copy the domain (e.g., `spokewheel-production.up.railway.app`)

2. **Configure Custom Domain in Railway:**

   - Still in "Settings" → "Networking"
   - Under "Custom Domain", enter: `spokewheel.app`
   - Railway will provide DNS records to add

3. **Update DNS Records:**

   **Option A: Using Cloudflare (Recommended) ⭐**

   - Log into Cloudflare dashboard
   - Select your domain `spokewheel.app`
   - Go to "DNS" → "Records"
   - **Add CNAME record for root domain:**
     - Type: `CNAME`
     - Name: `@` (or leave blank for root domain)
     - Target: `spokewheel-production.up.railway.app` (your Railway domain)
     - Proxy status: **Proxied** (orange cloud) ✅
     - TTL: Auto
   - **Add CNAME for www:**
     - Type: `CNAME`
     - Name: `www`
     - Target: `spokewheel-production.up.railway.app`
     - Proxy status: **Proxied** (orange cloud) ✅
     - TTL: Auto

   **Enable Free SSL Certificate in Cloudflare:**

   - Go to "SSL/TLS" in Cloudflare dashboard
   - Under "Overview", ensure SSL/TLS encryption mode is set to **"Full"** or **"Full (strict)"**
   - Go to "SSL/TLS" → "Edge Certificates"
   - Make sure **"Universal SSL"** is enabled (it's free and enabled by default)
   - If you see the error "This hostname is not covered by a certificate":
     - Wait 5-15 minutes for Universal SSL to provision (usually happens automatically)
     - Check "Edge Certificates" section - you should see "Active Certificate" appear
     - If it doesn't appear after 15 minutes, click "Restart Universal SSL" button
   - **Important:** Keep proxy status as "Proxied" (orange cloud) - this enables Cloudflare's free SSL

   **Option B: Using Squarespace Domains:**

   - Log into Squarespace Domains
   - Go to DNS settings for `spokewheel.app`
   - **Remove any existing A records** for `@` (root domain)
   - **Add CNAME record:**
     - Type: `CNAME`
     - Name: `@` (or leave blank for root domain)
     - Value: `spokewheel-production.up.railway.app` (your Railway domain)
     - TTL: `3600`
   - **Add CNAME for www:**
     - Type: `CNAME`
     - Name: `www`
     - Value: `spokewheel-production.up.railway.app`
     - TTL: `3600`

   **Note:** Some domain registrars don't allow CNAME on root domain. If Squarespace doesn't allow it:

   - Use Railway's provided A record IP addresses instead
   - Or use a subdomain like `app.spokewheel.app`

4. **Wait for DNS Propagation:**

   - DNS changes can take 5-60 minutes
   - Check with: `dig spokewheel.app` or `nslookup spokewheel.app`
   - If using Cloudflare with proxy enabled, DNS will show Cloudflare IPs (not Railway IPs) - this is normal!

5. **Verify HTTPS:**

   - **If using Cloudflare:** SSL certificate will be provisioned automatically (wait 5-15 minutes)
   - **If using Squarespace:** Railway automatically provisions SSL certificates
   - Once DNS propagates and SSL is active, `https://spokewheel.app` should work
   - Test: Visit `https://spokewheel.app` in your browser

### Step 6: Initialize Database

The database should **automatically initialize** when the server starts. The `admin-db-pg.js` file handles table creation automatically.

**To verify database initialization:**

1. **Check Railway Logs:**

   - Go to Railway → Your service → "Deployments" → Latest deployment → "View Logs"
   - Look for these messages:
     - ✅ `"Connected to PostgreSQL database"` - Connection successful
     - ✅ `"Default admin user created (username: admin, password: admin123)"` - Tables initialized
   - ❌ If you see `"PostgreSQL connection error"` - See troubleshooting below

2. **Test the Database:**
   - Visit your app URL
   - Try to register a user or login to admin panel
   - If you get "Database error", check the troubleshooting section below

**If database doesn't auto-initialize:**

The database initialization happens automatically when `admin-db-pg.js` is loaded. If it's not working:

1. Check that `DB_TYPE=postgresql` is set in environment variables
2. Verify all database connection variables are set correctly
3. Check Railway logs for specific error messages
4. See "Database Error Troubleshooting" section below

### Step 7: Test Your Deployment

1. **Visit your site:**

   - Go to `https://spokewheel.app`
   - You should see the SpokeWheel interface

2. **Test functionality:**

   - Register a new user
   - Create a person
   - Generate a feedback link
   - Submit feedback
   - Check admin panel

3. **Check logs:**
   - In Railway, go to your service
   - Click "Deployments" → Select latest deployment → "View Logs"
   - Check for any errors

---

## 🎨 Option 2: Deploy to Render

### Step 1: Prepare Code (Same as Railway)

Follow Step 1-3 from Railway section (prepare code, create Git repo, push to GitHub).

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub

### Step 3: Create Web Service

1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `spokewheel`
   - **Environment:** `Node`
   - **Build Command:** `npm install && cd client && npm install && npm run build`
   - **Start Command:** `node server.js`
   - **Plan:** Free (or paid)

### Step 4: Add PostgreSQL Database

1. Click "New" → "PostgreSQL"
2. Configure:
   - **Name:** `spokewheel-db`
   - **Database:** `spokewheel`
   - **User:** `spokewheel_user`
   - **Plan:** Free (or paid)

### Step 5: Configure Environment Variables

In your Web Service, go to "Environment" and add:

```
NODE_ENV=production
PORT=3001
FRONTEND_BASE_URL=https://spokewheel.app
DB_TYPE=postgresql
DB_HOST=<from PostgreSQL service>
DB_PORT=5432
DB_NAME=spokewheel
DB_USER=spokewheel_user
DB_PASSWORD=<from PostgreSQL service>
DB_SSL=true
```

### Step 6: Configure Custom Domain

1. In your Web Service, go to "Settings"
2. Under "Custom Domains", add `spokewheel.app`
3. Render will provide DNS instructions
4. Update DNS in Squarespace (similar to Railway instructions)

---

## 🔧 Troubleshooting

### Database Error Troubleshooting

If you see **"Database error"** or connection issues:

#### Step 1: Check Environment Variables

In Railway, go to your service → "Variables" tab and verify these are set:

```
DB_TYPE=postgresql
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_SSL=true
```

**Important:** Make sure you've added the PostgreSQL database service first! The `${{Postgres.*}}` variables only work if you have a PostgreSQL service in your Railway project.

#### Step 2: Check Railway Logs

1. Go to Railway → Your service → "Deployments" → Latest → "View Logs"
2. Look for these error patterns:

   **"PostgreSQL connection error" or "ECONNREFUSED":**

   - Database service might not be running
   - Solution: Check that PostgreSQL service is running in Railway

   **"password authentication failed":**

   - Wrong database password
   - Solution: Verify `DB_PASSWORD=${{Postgres.PGPASSWORD}}` is set correctly

   **"database does not exist":**

   - Database name is wrong
   - Solution: Verify `DB_NAME=${{Postgres.PGDATABASE}}` matches Railway's database name

   **"relation does not exist" or "table does not exist":**

   - Tables weren't created
   - Solution: The `admin-db-pg.js` should auto-create tables. Check logs for initialization errors

#### Step 3: Verify Database Service

1. In Railway, check that you have a PostgreSQL service:
   - Click "+ New" → "Database" → "Add PostgreSQL" (if missing)
2. Verify the PostgreSQL service is running (should show "Active" status)

#### Step 4: Test Database Connection

1. In Railway, click on your PostgreSQL service
2. Go to "Connect" tab
3. Copy the connection string
4. Try connecting with a PostgreSQL client to verify the database is accessible

#### Step 5: Manual Database Initialization (if needed)

If tables aren't being created automatically:

1. **Access Railway's PostgreSQL Console:**

   - In Railway, click on PostgreSQL service → "Data" tab
   - Or use "Connect" tab to get connection details

2. **Check if tables exist:**

   ```sql
   \dt
   ```

   (Should show: admin_users, users, people, feedback_links, feedback_axes, admin_feedback_results)

3. **If tables don't exist, they should be created automatically when the app starts.**
   - Check Railway logs for initialization errors
   - The `admin-db-pg.js` file runs `initializeTables()` automatically

#### Step 6: Common Fixes

**Fix 1: Missing DB_TYPE variable**

- Add `DB_TYPE=postgresql` to environment variables
- Restart the service

**Fix 2: Wrong database adapter**

- If `DB_TYPE` is not set or set to `sqlite`, the app will try to use SQLite
- Make sure `DB_TYPE=postgresql` is set

**Fix 3: SSL Connection Issues**

- Make sure `DB_SSL=true` is set (Railway requires SSL)
- If you see SSL errors, verify the connection string

**Fix 4: Database Not Initialized**

- The database should auto-initialize on first start
- Check Railway logs for "Connected to PostgreSQL database" message
- If you see connection errors, fix those first

#### Still Having Issues?

1. **Check Railway Logs** for the exact error message
2. **Verify all environment variables** are set correctly
3. **Ensure PostgreSQL service** is running and connected
4. **Restart the service** after making changes

### Build Failures

If build fails with "exit code: 1":

1. **Check the build command:**

   - Use: `npm install && cd client && npm install && npm run build`
   - Make sure root dependencies are installed first

2. **Check Railway logs:**

   - Go to your service → "Deployments" → Latest deployment → "View Logs"
   - Look for specific error messages (TypeScript errors, missing dependencies, etc.)

3. **Common issues:**

   - **Missing dependencies:** Ensure `package.json` and `client/package.json` have all required packages
   - **TypeScript errors:** Fix any TypeScript compilation errors in `client/src`
   - **Node version:** Railway should auto-detect, but you can set `NODE_VERSION=18` in environment variables
   - **Memory issues:** If build runs out of memory, Railway will show this in logs

4. **Alternative build command (if above doesn't work):**

   ```
   npm ci && cd client && npm ci && npm run build
   ```

   (Uses `npm ci` for more reliable, reproducible builds)

5. **Verify locally first:**
   ```bash
   npm install
   cd client && npm install && npm run build
   ```
   If this fails locally, fix those errors first.

### Domain Not Working

If `https://spokewheel.app` doesn't work:

- Wait 15-60 minutes for DNS propagation
- Verify DNS records in your DNS provider (Cloudflare or Squarespace)
- Check Railway/Render custom domain configuration
- Use `dig spokewheel.app` to verify DNS

### Cloudflare SSL Certificate Error

If you see: **"This hostname is not covered by a certificate"**:

1. **Enable Universal SSL (Free):**

   - Go to Cloudflare dashboard → Your domain → "SSL/TLS"
   - Click "Edge Certificates"
   - Ensure "Universal SSL" is enabled (should be on by default)
   - If disabled, click "Enable Universal SSL"

2. **Wait for Certificate Provisioning:**

   - Universal SSL certificates are provisioned automatically
   - Usually takes 5-15 minutes, can take up to 24 hours
   - Check "Edge Certificates" section - you should see "Active Certificate" appear
   - Status will show "Active Certificate" when ready

3. **Restart Universal SSL (if needed):**

   - In "Edge Certificates", scroll down
   - Click "Restart Universal SSL" button
   - Wait 5-15 minutes for certificate to be re-provisioned

4. **Check SSL/TLS Mode:**

   - Go to "SSL/TLS" → "Overview"
   - Set encryption mode to **"Full"** or **"Full (strict)"**
   - **"Full"** = Cloudflare ↔ Origin (Railway) uses HTTPS
   - **"Full (strict)"** = Same, but validates Railway's certificate (recommended if Railway has valid cert)

5. **Verify Proxy Status:**

   - Go to "DNS" → "Records"
   - Ensure your CNAME records have **orange cloud** (Proxied) enabled
   - SSL only works when proxy is enabled

6. **You DON'T need Advanced Certificate Manager:**
   - Universal SSL is free and covers all proxied hostnames
   - The error message about "Advanced Certificate Manager" is misleading
   - Just wait for Universal SSL to provision (it's automatic)

**Note:** If using Railway, Railway also provides SSL certificates. With Cloudflare in front, you get:

- Cloudflare SSL (visitor ↔ Cloudflare)
- Railway SSL (Cloudflare ↔ Railway)

Both are free and work together automatically!

### App Not Starting

- Check logs in Railway/Render dashboard
- Verify all environment variables are set
- Ensure database is initialized
- Check that `PORT` matches what the platform expects

---

## 📝 Next Steps After Deployment

1. **Change default admin password:**

   - Log into admin panel
   - Change the default password

2. **Set up backups:**

   - Railway: Automatic backups included
   - Render: Configure manual backups

3. **Monitor your app:**

   - Check Railway/Render dashboard regularly
   - Set up error alerts if available

4. **Update code:**
   - Push changes to GitHub
   - Railway/Render will auto-deploy (if configured)

---

## 🆘 Need Help?

- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs
- **Squarespace DNS:** https://support.squarespace.com/hc/en-us/articles/205812378

---

**Recommended:** Start with **Railway** - it's the easiest option and handles most things automatically! 🚀
