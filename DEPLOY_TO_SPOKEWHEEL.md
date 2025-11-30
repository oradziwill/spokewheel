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

3. **Update DNS in Squarespace:**

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

5. **Verify HTTPS:**
   - Railway automatically provisions SSL certificates
   - Once DNS propagates, `https://spokewheel.app` should work

### Step 6: Initialize Database

Once your app is deployed, you need to initialize the database tables:

1. **Access Railway's PostgreSQL:**

   - In Railway, click on your PostgreSQL service
   - Go to "Connect" tab
   - Copy the connection string

2. **Run Database Initialization:**

   - You can use Railway's built-in PostgreSQL console, or
   - Connect from your local machine using the connection string

   The easiest way is to add a one-time script. Create a file `init-db.js`:

   ```javascript
   // This will run the database initialization
   require("dotenv").config();
   const adminDb = require("./admin-db-pg");

   console.log("Database initialized!");
   ```

   Then in Railway, add a temporary environment variable:

   - `INIT_DB=true`

   And modify `server.js` to run initialization on first start (or run it manually via Railway's console).

   **Alternative:** Use Railway's PostgreSQL console to run the SQL from `admin-db-pg.js` manually.

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

### Database Connection Issues

If you see database errors:

- Verify environment variables are set correctly
- Check that PostgreSQL service is running
- Ensure database credentials match

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
- Verify DNS records in Squarespace
- Check Railway/Render custom domain configuration
- Use `dig spokewheel.app` to verify DNS

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
