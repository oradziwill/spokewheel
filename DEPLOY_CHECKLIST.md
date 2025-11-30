# Quick Deployment Checklist for spokewheel.app

Follow these steps to deploy your app to https://spokewheel.app

## ✅ Pre-Deployment Checklist

- [ ] Code is ready (all features working locally)
- [ ] React app builds successfully (`cd client && npm run build`)
- [ ] Server starts without errors (`node server.js`)
- [ ] Database connection works (test with PostgreSQL locally if possible)

## 🚀 Railway Deployment (Recommended - 15 minutes)

### Step 1: Prepare Code (2 minutes)

```bash
# Make sure you're in the project directory
cd /Users/aleksandraradziwill/Workspaces/feedback_vibe

# Build the React app
cd client
npm run build
cd ..

# Verify .gitignore exists (should ignore .env, *.db, node_modules)
cat .gitignore
```

### Step 2: Create GitHub Repository (3 minutes)

1. Go to https://github.com/new
2. Create repository named `spokewheel`
3. **Don't** initialize with README
4. Copy the repository URL

### Step 3: Push to GitHub (2 minutes)

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit - SpokeWheel app"

# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/spokewheel.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 4: Deploy to Railway (5 minutes)

1. **Sign up:** Go to https://railway.app → Sign up with GitHub
2. **New Project:** Click "New Project" → "Deploy from GitHub repo"
3. **Select Repo:** Choose your `spokewheel` repository
4. **Add Database:** Click "+ New" → "Database" → "Add PostgreSQL"
5. **Configure Service:**
   - Click on your service (Node.js app)
   - Go to "Settings" tab
   - **Build Command:** `npm install && cd client && npm install && npm run build`
   - **Start Command:** `node server.js`
   - **Note:** Railway will auto-detect from `railway.json` if present
6. **Add Environment Variables:**
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

7. **Wait for deployment** (2-5 minutes)

### Step 5: Configure Custom Domain (3 minutes)

1. **In Railway:**
   - Go to your service → "Settings" → "Networking"
   - Under "Custom Domain", enter: `spokewheel.app`
   - Railway will show DNS instructions

2. **In Squarespace:**
   - Log into Squarespace Domains
   - Go to DNS settings for `spokewheel.app`
   - **Option A (if CNAME allowed on root):**
     - Add CNAME: `@` → `your-railway-domain.up.railway.app`
   - **Option B (if CNAME not allowed):**
     - Use Railway's provided A record IP addresses
     - Add A record: `@` → `IP_ADDRESS_FROM_RAILWAY`
   - Add CNAME for www: `www` → `your-railway-domain.up.railway.app`

3. **Wait 5-60 minutes** for DNS propagation

### Step 6: Initialize Database (2 minutes)

The database should auto-initialize when the server starts. To verify:

1. Go to Railway → Your service → "Deployments" → Latest → "View Logs"
2. Look for "Connected to PostgreSQL database" message
3. If you see errors, check the logs

**If database doesn't auto-initialize:**
- The `admin-db-pg.js` file should handle this automatically
- Check Railway logs for any database errors
- You may need to manually run initialization (contact support if needed)

### Step 7: Test Your Deployment (2 minutes)

1. **Visit:** https://spokewheel.app (wait for DNS if needed)
2. **Test:**
   - [ ] Homepage loads
   - [ ] Register a new user
   - [ ] Create a person
   - [ ] Generate a feedback link
   - [ ] Submit feedback
   - [ ] Check admin panel (username: `admin`, password: `admin123`)

## 🎉 You're Done!

Your app should now be live at https://spokewheel.app

## 🔧 Troubleshooting

### Build Fails
- Check Railway logs
- Verify all dependencies in `package.json`
- Ensure `client/package.json` exists

### Database Errors
- Verify environment variables are set correctly
- Check PostgreSQL service is running in Railway
- Review Railway logs for connection errors

### Domain Not Working
- Wait 15-60 minutes for DNS propagation
- Verify DNS records in Squarespace
- Check Railway custom domain configuration
- Test with: `dig spokewheel.app` or `nslookup spokewheel.app`

### App Not Starting
- Check Railway logs
- Verify PORT environment variable
- Ensure database is initialized
- Check that all environment variables are set

## 📝 Next Steps

- [ ] Change default admin password
- [ ] Test all features thoroughly
- [ ] Set up monitoring (Railway has built-in monitoring)
- [ ] Configure backups (Railway has automatic backups)

## 🆘 Need Help?

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Check logs:** Railway → Your service → Deployments → View Logs

---

**Estimated Total Time: 15-20 minutes** ⏱️

