# Delete Only admin_feedback_results Table on Railway

Here are several ways to drop just the `admin_feedback_results` table on Railway PostgreSQL:

## Method 1: Railway CLI (Easiest)

1. **Install Railway CLI** (if needed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and link:**
   ```bash
   railway login
   railway link  # Select your project
   ```

3. **Connect to PostgreSQL:**
   ```bash
   railway connect postgresql
   ```
   This opens a psql session connected to your Railway database.

4. **Drop the table:**
   ```sql
   DROP TABLE IF EXISTS admin_feedback_results CASCADE;
   ```

5. **Verify it's gone:**
   ```sql
   \dt admin_feedback_results
   ```
   Should say "Did not find any relation"

6. **Exit:**
   ```sql
   \q
   ```

7. **Restart your service:**
   ```bash
   railway restart
   ```
   Or redeploy from the Railway dashboard

## Method 2: Railway Dashboard Query Tab

1. **Go to Railway Dashboard:**
   - Your Project → PostgreSQL Service

2. **Open Query/Console:**
   - Look for "Query" or "Console" or "Connect" button
   - Some Railway interfaces have a SQL query editor

3. **Run SQL:**
   ```sql
   DROP TABLE IF EXISTS admin_feedback_results CASCADE;
   ```

4. **Redeploy your application service**

## Method 3: Using psql with Connection String

1. **Get connection string from Railway:**
   - PostgreSQL Service → "Connect" → Copy connection string
   - Or use: `railway variables` to get individual connection vars

2. **Run psql:**
   ```bash
   psql "your-connection-string-here" -c "DROP TABLE IF EXISTS admin_feedback_results CASCADE;"
   ```

   Or if you have individual vars:
   ```bash
   PGPASSWORD=your-password psql -h your-host -U postgres -d railway -c "DROP TABLE IF EXISTS admin_feedback_results CASCADE;"
   ```

3. **Redeploy your application**

## Method 4: Node.js Script (Local)

1. **Create a file `drop-table.js`:**
   ```javascript
   require("dotenv").config();
   const { Pool } = require("pg");

   const pool = new Pool({
     connectionString: process.env.DATABASE_URL || undefined,
     host: process.env.DB_HOST || process.env.PGHOST,
     port: process.env.DB_PORT || process.env.PGPORT || 5432,
     database: process.env.DB_NAME || process.env.PGDATABASE,
     user: process.env.DB_USER || process.env.PGUSER,
     password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
     ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
   });

   async function dropTable() {
     try {
       await pool.query('DROP TABLE IF EXISTS admin_feedback_results CASCADE');
       console.log('✅ Successfully dropped admin_feedback_results table');
     } catch (error) {
       console.error('❌ Error:', error.message);
       process.exit(1);
     } finally {
       await pool.end();
     }
   }

   dropTable();
   ```

2. **Get Railway connection vars:**
   ```bash
   railway variables
   ```
   Copy the PostgreSQL connection variables

3. **Set environment variables locally:**
   ```bash
   export DATABASE_URL="your-railway-database-url"
   # OR
   export DB_HOST="..."
   export DB_PORT="5432"
   export DB_NAME="railway"
   export DB_USER="postgres"
   export DB_PASSWORD="..."
   ```

4. **Run the script:**
   ```bash
   node drop-table.js
   ```

5. **Redeploy your Railway service**

## Method 5: Railway Connect + psql

If Railway provides a direct connection option:

1. **Railway Dashboard → PostgreSQL → "Connect"**
   - Copy the connection command or connection string

2. **Run the command in your terminal:**
   ```bash
   # Example (Railway might give you a command like):
   railway connect postgresql --execute "DROP TABLE IF EXISTS admin_feedback_results CASCADE;"
   ```

## After Dropping the Table

1. **Redeploy your application service:**
   - Railway Dashboard → Your App Service → "Deployments" → "Redeploy"
   - OR push a new commit if using GitHub integration

2. **The server will automatically:**
   - Detect the table doesn't exist
   - Create it with the new schema (using `CREATE TABLE IF NOT EXISTS`)
   - New columns will be: `asking`, `chaos`, `positive-fbck`, etc.

3. **Verify in logs:**
   - Check Railway logs for "Connected to PostgreSQL database"
   - No errors about missing columns

## Troubleshooting

### "Permission denied" or "Access denied"
- Make sure you're using the correct database user
- Railway PostgreSQL typically uses the `postgres` superuser
- Check your connection credentials

### "Table is being used"
- Make sure your application service is stopped or restarted
- The table might have active connections

### Can't find Railway CLI connection option
- Try the Dashboard method instead
- Or use the connection string with psql directly

### Still seeing old columns after restart
- Make sure you actually dropped the table (verify with `\dt`)
- Check that you're redeploying the latest code
- Verify environment variables point to the correct database

