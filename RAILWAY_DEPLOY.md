# Railway Deployment Guide

This guide will help you deploy SpokeWheel to Railway.

## Important: Database Schema Update ⚠️

**Railway will NOT automatically update your database schema.** Since we changed the column names in `admin_feedback_results` table (from `influencing_style`, `feedback_style`, etc. to `asking`, `positive-fbck`, etc.), you need to update the database manually.

## Step 1: Build the Client

Before deploying, build the React client:

```bash
cd client
npm run build
cd ..
```

## Step 2: Deploy to Railway

### Option A: Deploy via Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize/Deploy:**
   ```bash
   railway init
   railway up
   ```

### Option B: Deploy via GitHub (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Railway:**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Railway will automatically:**
   - Detect Node.js project
   - Install dependencies
   - Build the client (uses `npm run build` from package.json)
   - Start the server

## Step 3: Set Environment Variables

In Railway dashboard → Your Service → Variables, add:

```
DB_TYPE=postgresql
DB_HOST=<railway-postgres-host>
DB_PORT=5432
DB_NAME=<railway-postgres-database>
DB_USER=<railway-postgres-user>
DB_PASSWORD=<railway-postgres-password>
NODE_ENV=production
FRONTEND_BASE_URL=https://your-app.railway.app
PORT=3001
```

**Important:** Railway PostgreSQL provides these connection details automatically if you add a PostgreSQL service to your project.

### Add PostgreSQL Database

1. In Railway dashboard → Your Project
2. Click "+ New" → "Database" → "Add PostgreSQL"
3. Railway will automatically create the database and set connection variables
4. Copy the connection variables to your service's environment variables

## Step 4: Update Database Schema ⚠️

Since `CREATE TABLE IF NOT EXISTS` won't update existing tables, you need to manually update the schema.

### Option A: Drop and Recreate (Easiest - Wipes existing data)

1. **Connect to Railway PostgreSQL:**
   - In Railway dashboard → PostgreSQL service → "Connect"
   - Use the connection string or connect via Railway CLI

2. **Drop the table:**
   ```sql
   DROP TABLE IF EXISTS admin_feedback_results CASCADE;
   ```

3. **Restart your service:**
   - The table will be automatically recreated with the new schema when the server starts

### Option B: Manual Migration (Preserves data)

If you have existing data you want to keep, you'll need to manually migrate:

```sql
-- First, create a backup table
CREATE TABLE admin_feedback_results_backup AS 
SELECT * FROM admin_feedback_results;

-- Drop the old table
DROP TABLE admin_feedback_results CASCADE;

-- The server will recreate it with new schema on restart
-- Then you'll need to write a migration script to copy data from backup
```

**Note:** The new schema has different column names, so you'll need to map old columns to new ones.

## Step 5: Verify Deployment

1. **Check Railway logs:**
   - Go to Railway dashboard → Your Service → "Deployments" → Latest → "View Logs"
   - Look for "Server running on port..." or any errors

2. **Test the API:**
   ```bash
   curl https://your-app.railway.app/api/axes
   ```

3. **Check database schema:**
   ```bash
   # Connect to Railway PostgreSQL (see Railway dashboard for connection string)
   psql $DATABASE_URL -c "\d admin_feedback_results"
   ```
   
   You should see columns: `asking`, `chaos`, `positive-fbck`, `listening`, `macro-mgmt`, `visioneering`, `1on1`, `synchronous`, `pro-motion`, `adaptive`, `care`

## Step 6: Custom Domain (Optional)

1. In Railway dashboard → Your Service → Settings → "Domains"
2. Click "Generate Domain" or "Add Custom Domain"
3. Follow Railway's instructions for DNS configuration

## Troubleshooting

### Database Connection Errors

- Verify all environment variables are set correctly
- Check that PostgreSQL service is running
- Verify connection string format

### Build Errors

- Check Railway build logs
- Ensure `client/package.json` exists
- Verify Node.js version (requires >=18.0.0)

### Schema Mismatch Errors

- If you see errors about missing columns, the database schema wasn't updated
- Follow Step 4 above to update the schema

### Port Issues

- Railway automatically sets `PORT` environment variable
- Your server should use `process.env.PORT || 3001`
- Check server.js to ensure it uses the PORT variable

## Quick Checklist

- [ ] Client built (`cd client && npm run build`)
- [ ] Code pushed to GitHub (if using GitHub deployment)
- [ ] PostgreSQL database added to Railway project
- [ ] Environment variables set (DB_TYPE, DB_HOST, etc.)
- [ ] Database schema updated (drop admin_feedback_results table)
- [ ] Service deployed and running
- [ ] API responding correctly
- [ ] Database schema verified

## Next Steps

After deployment:
1. Test the application thoroughly
2. Create test feedback entries
3. Verify admin panel works
4. Check that feedback submissions work with new column names

