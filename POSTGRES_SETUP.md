# PostgreSQL Setup Guide for SpokeWheel

This guide will help you set up PostgreSQL for SpokeWheel, either from scratch or migrating from SQLite.

## Quick Start

### Step 1: Install PostgreSQL

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**

```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### Step 2: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE spokewheel;
CREATE USER spokewheel_user WITH PASSWORD 'spoke_wheel';
GRANT ALL PRIVILEGES ON DATABASE spokewheel TO spokewheel_user;

# For PostgreSQL 15+, also grant schema privileges
\c spokewheel
GRANT ALL ON SCHEMA public TO spokewheel_user;

# Exit
\q
```

### Step 3: Install PostgreSQL Driver

```bash
cd /path/to/feedback_vibe
npm install pg
```

### Step 4: Configure Environment Variables

Create or update your `.env` file:

```bash
# Database Configuration
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spokewheel
DB_USER=spokewheel_user
DB_PASSWORD=your_secure_password_here
DB_SSL=false

# Server Configuration
PORT=3001
NODE_ENV=production
FRONTEND_BASE_URL=https://yourdomain.com
```

### Step 5: Test Connection

```bash
# Test PostgreSQL connection
node -e "const {Pool} = require('pg'); const pool = new Pool({user: 'spokewheel_user', host: 'localhost', database: 'spokewheel', password: 'your_password', port: 5432}); pool.query('SELECT NOW()', (err, res) => { if(err) console.error(err); else console.log('Connected!', res.rows[0]); pool.end(); });"
```

If you see "Connected!" with a timestamp, you're good to go!

## Migration from SQLite to PostgreSQL

### Option 1: Automatic Migration (Recommended)

1. **Ensure your SQLite database exists** (`admin_feedback.db`)

2. **Set up PostgreSQL** (follow Steps 1-3 above)

3. **Set environment variables** (Step 4 above)

4. **Run the migration script:**

   ```bash
   node migrate-to-postgres.js
   ```

5. **Verify migration:**

   ```bash
   # Connect to PostgreSQL
   psql -U spokewheel_user -d spokewheel

   # Check tables
   \dt

   # Check data
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM people;
   SELECT COUNT(*) FROM admin_feedback_results;
   ```

6. **Start your application:**
   ```bash
   # Make sure DB_TYPE=postgresql is in .env
   node server.js
   ```

### Option 2: Manual Migration

If you prefer to migrate manually:

1. **Export from SQLite:**

   ```bash
   sqlite3 admin_feedback.db .dump > backup.sql
   ```

2. **Convert SQL syntax** (SQLite to PostgreSQL):

   - Replace `INTEGER PRIMARY KEY AUTOINCREMENT` with `SERIAL PRIMARY KEY`
   - Replace `DATETIME` with `TIMESTAMP`
   - Replace `BOOLEAN DEFAULT 1` with `BOOLEAN DEFAULT TRUE`
   - Replace `INSERT OR IGNORE` with `INSERT ... ON CONFLICT DO NOTHING`

3. **Import to PostgreSQL:**
   ```bash
   psql -U spokewheel_user -d spokewheel < converted_backup.sql
   ```

## Verification

### Check Tables Exist

```bash
psql -U spokewheel_user -d spokewheel -c "\dt"
```

You should see:

- admin_users
- users
- people
- feedback_links
- feedback_axes
- admin_feedback_results
- feedback_summary

### Check Data

```bash
psql -U spokewheel_user -d spokewheel

# Count records
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'people', COUNT(*) FROM people
UNION ALL
SELECT 'admin_feedback_results', COUNT(*) FROM admin_feedback_results;
```

### Test Application

1. **Start the server:**

   ```bash
   DB_TYPE=postgresql node server.js
   ```

2. **Test API:**

   ```bash
   curl http://localhost:3001/api/axes
   ```

3. **Register a user:**
   ```bash
   curl -X POST http://localhost:3001/api/users/register \
     -H "Content-Type: application/json" \
     -d '{"username":"test","email":"test@example.com","password":"test123"}'
   ```

## Troubleshooting

### Connection Refused

**Error:** `ECONNREFUSED` or `Connection refused`

**Solution:**

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Enable auto-start
sudo systemctl enable postgresql
```

### Authentication Failed

**Error:** `password authentication failed`

**Solution:**

1. Check your `.env` file has correct password
2. Verify user exists:
   ```bash
   sudo -u postgres psql -c "\du"
   ```
3. Reset password if needed:
   ```bash
   sudo -u postgres psql
   ALTER USER spokewheel_user WITH PASSWORD 'new_password';
   ```

### Database Does Not Exist

**Error:** `database "spokewheel" does not exist`

**Solution:**

```bash
sudo -u postgres psql
CREATE DATABASE spokewheel;
GRANT ALL PRIVILEGES ON DATABASE spokewheel TO spokewheel_user;
\q
```

### Permission Denied

**Error:** `permission denied for schema public`

**Solution:**

```bash
sudo -u postgres psql -d spokewheel
GRANT ALL ON SCHEMA public TO spokewheel_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO spokewheel_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO spokewheel_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO spokewheel_user;
\q
```

### Module Not Found: 'pg'

**Error:** `Cannot find module 'pg'`

**Solution:**

```bash
npm install pg
```

## Remote Database Setup

If your PostgreSQL database is on a remote server:

1. **Update `.env`:**

   ```bash
   DB_HOST=your-remote-server.com
   DB_PORT=5432
   DB_SSL=true
   ```

2. **Configure PostgreSQL to allow remote connections:**

   ```bash
   # Edit postgresql.conf
   sudo nano /etc/postgresql/14/main/postgresql.conf
   # Set: listen_addresses = '*'

   # Edit pg_hba.conf
   sudo nano /etc/postgresql/14/main/pg_hba.conf
   # Add: host all all 0.0.0.0/0 md5

   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

3. **Open firewall port:**
   ```bash
   sudo ufw allow 5432/tcp
   ```

## Backup and Restore

### Backup

```bash
# Full database backup
pg_dump -U spokewheel_user -d spokewheel > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -U spokewheel_user -d spokewheel -F c -f backup_$(date +%Y%m%d).dump
```

### Restore

```bash
# From SQL file
psql -U spokewheel_user -d spokewheel < backup_20240101.sql

# From compressed dump
pg_restore -U spokewheel_user -d spokewheel backup_20240101.dump
```

## Performance Tips

1. **Create indexes** (if needed):

   ```sql
   CREATE INDEX idx_people_created_by ON people(created_by_user_id);
   CREATE INDEX idx_feedback_person ON admin_feedback_results(person_id);
   CREATE INDEX idx_feedback_axis ON admin_feedback_results(axis_name);
   ```

2. **Vacuum regularly:**

   ```sql
   VACUUM ANALYZE;
   ```

3. **Monitor connections:**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

## Switching Back to SQLite

If you need to switch back to SQLite:

1. **Update `.env`:**

   ```bash
   # Remove or comment out DB_TYPE
   # DB_TYPE=postgresql
   ```

2. **Restart application:**
   ```bash
   node server.js
   ```

The application will automatically use SQLite if `DB_TYPE` is not set to `postgresql`.

## Next Steps

- ✅ Database is set up and running
- ✅ Application is using PostgreSQL
- 📝 Set up automated backups (see DEPLOYMENT.md)
- 📝 Configure monitoring
- 📝 Set up connection pooling (if needed)

## Need Help?

- Check PostgreSQL logs: `/var/log/postgresql/postgresql-*.log`
- Check application logs: `pm2 logs spokewheel`
- Test connection: `psql -U spokewheel_user -d spokewheel`
