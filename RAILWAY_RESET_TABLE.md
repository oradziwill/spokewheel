# How to Reset admin_feedback_results Table on Railway

If you're getting the error: `column "asking" does not exist`, it means your Railway database still has the old table schema. Follow one of these methods to reset it:

## ⚠️ Warning

**This will DELETE ALL existing feedback data in the admin_feedback_results table.**

## Method 1: Using Railway CLI (Recommended)

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Link to your project:**
   ```bash
   railway link
   ```

4. **Connect to PostgreSQL:**
   ```bash
   railway connect postgresql
   ```

5. **Run the SQL command:**
   ```sql
   DROP TABLE IF EXISTS admin_feedback_results CASCADE;
   ```
   
   Then exit: `\q`

6. **Restart your service:**
   - Go to Railway dashboard → Your Service → "Deployments" → "Redeploy"
   - OR use CLI: `railway restart`

## Method 2: Using Railway Dashboard

1. **Go to Railway Dashboard:**
   - https://railway.app → Your Project → PostgreSQL Service

2. **Open PostgreSQL Console:**
   - Click on your PostgreSQL service
   - Click "Connect" or "Query" tab
   - Or use "Open in PgAdmin" if available

3. **Run SQL command:**
   ```sql
   DROP TABLE IF EXISTS admin_feedback_results CASCADE;
   ```

4. **Restart your service:**
   - Go to Your Service → "Deployments" → "Redeploy"

## Method 3: Using Node.js Script

1. **Set up environment variables locally:**
   ```bash
   export DATABASE_URL="your-railway-database-url"
   # OR
   export DB_HOST="your-host"
   export DB_PORT="5432"
   export DB_NAME="railway"
   export DB_USER="postgres"
   export DB_PASSWORD="your-password"
   ```

2. **Run the reset script:**
   ```bash
   node reset-table-railway.js
   ```

3. **Restart your Railway service**

## Method 4: Using psql (if you have it installed)

1. **Get connection string from Railway:**
   - Railway Dashboard → PostgreSQL → "Connect" → Copy connection string

2. **Run psql:**
   ```bash
   psql "your-railway-connection-string" -c "DROP TABLE IF EXISTS admin_feedback_results CASCADE;"
   ```

3. **Restart your Railway service**

## Verify the Reset

After restarting your service, verify the new schema:

1. **Check Railway logs** for table creation messages
2. **Connect to PostgreSQL** and check columns:
   ```sql
   \d admin_feedback_results
   ```
   
   You should see columns: `asking`, `chaos`, `positive-fbck`, `listening`, `macro-mgmt`, `visioneering`, `1on1`, `synchronous`, `pro-motion`, `adaptive`, `care`

## What Happens Next

When your Railway service restarts:
- The server will detect that `admin_feedback_results` doesn't exist
- It will automatically create it with the new schema (using `CREATE TABLE IF NOT EXISTS`)
- The new columns will be: `asking`, `chaos`, `positive-fbck`, etc.
- Your app will work correctly with the new column names

## Need Help?

If you continue to have issues:
1. Check Railway logs for errors
2. Verify environment variables are set correctly
3. Make sure DB_TYPE=postgresql is set
4. Check that the PostgreSQL service is running

