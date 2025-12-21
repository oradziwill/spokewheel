# Reset PostgreSQL Database on Railway

If you're having trouble dropping the table, you can remove and recreate the entire PostgreSQL service. This is often simpler and ensures a completely fresh database.

## ⚠️ Warning

**This will DELETE ALL DATA in the database:**
- All users
- All people
- All feedback links
- All feedback results
- All admin users

The database will be completely wiped and recreated.

## Steps to Reset PostgreSQL on Railway

### Step 1: Remove the PostgreSQL Service

1. **Go to Railway Dashboard:**
   - Navigate to your project
   - Find your PostgreSQL service

2. **Delete the Service:**
   - Click on the PostgreSQL service
   - Go to "Settings" tab
   - Scroll down to "Danger Zone"
   - Click "Delete Service" or "Remove Service"
   - Confirm the deletion

### Step 2: Recreate PostgreSQL Service

1. **Add New PostgreSQL:**
   - In your Railway project, click "+ New"
   - Select "Database"
   - Choose "Add PostgreSQL"

2. **Railway will automatically:**
   - Create a new PostgreSQL database
   - Set up connection variables
   - Generate new credentials

### Step 3: Update Environment Variables

Your application service should automatically pick up the new database connection variables. However, verify:

1. **Go to your Application Service:**
   - Click on your main service (not PostgreSQL)

2. **Check Variables tab:**
   - Verify these variables are set (Railway should set them automatically):
     - `DATABASE_URL` (or `PGDATABASE_URL`)
     - `PGHOST`
     - `PGPORT`
     - `PGDATABASE`
     - `PGUSER`
     - `PGPASSWORD`

   If your code uses different variable names, you may need to add them:
   - `DB_TYPE=postgresql`
   - `DB_HOST=${{Postgres.PGHOST}}`
   - `DB_PORT=${{Postgres.PGPORT}}`
   - `DB_NAME=${{Postgres.PGDATABASE}}`
   - `DB_USER=${{Postgres.PGUSER}}`
   - `DB_PASSWORD=${{Postgres.PGPASSWORD}}`

   **Note:** Railway uses `${{Service.Variable}}` syntax to reference variables from other services.

### Step 4: Restart Your Application Service

1. **Redeploy your service:**
   - Go to your Application Service
   - Click "Deployments"
   - Click "Redeploy" on the latest deployment
   - OR trigger a new deployment by pushing to GitHub (if connected)

2. **The server will automatically:**
   - Connect to the new database
   - Create all tables with the new schema (including `admin_feedback_results` with new column names)
   - Insert default data (axes, admin user, etc.)

### Step 5: Verify

1. **Check Railway logs:**
   - Look for "Connected to PostgreSQL database"
   - Check for any table creation messages
   - Verify no errors

2. **Test the application:**
   - Visit your deployed URL
   - Try accessing the admin panel
   - Verify feedback submission works

## Alternative: If You Need to Keep Some Data

If you have data you want to preserve:

1. **Export data first:**
   ```bash
   # Connect to old database
   railway connect postgresql
   
   # Export specific tables
   pg_dump -t users -t people --data-only > backup.sql
   ```

2. **Recreate database** (follow steps above)

3. **Import data after recreation:**
   ```bash
   # Connect to new database
   railway connect postgresql
   
   # Import data
   psql < backup.sql
   ```

## Troubleshooting

### Variables Not Updating

If your service doesn't see the new database variables:

1. **Check variable references:**
   - In your service Variables tab
   - Use Railway's variable reference syntax: `${{Postgres.PGHOST}}`

2. **Or set variables directly:**
   - Copy values from PostgreSQL service
   - Paste into your application service variables

### Connection Errors

- Verify all database variables are set
- Check that PostgreSQL service is running
- Ensure variable names match what your code expects

### Schema Still Wrong

- Make sure you've restarted/redeployed your application service
- Check logs to verify tables were created
- Verify you're using the latest code with new schema

