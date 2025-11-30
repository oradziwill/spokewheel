# PostgreSQL Setup for macOS

## Quick Setup (5 minutes)

### Step 1: Start PostgreSQL

```bash
brew services start postgresql@14
# or if you have a different version:
brew services start postgresql
```

### Step 2: Connect to PostgreSQL

On macOS with Homebrew, you typically connect as your macOS user:

```bash
psql -d postgres
```

If it asks for a password and you haven't set one, you may need to:

1. Press Enter (if no password is set)
2. Or set a password first (see below)

### Step 3: Create Database and User

Once connected to PostgreSQL, run:

```sql
-- Create database
CREATE DATABASE spokewheel;

-- Create user
CREATE USER spokewheel_user WITH PASSWORD 'spoke_wheel';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE spokewheel TO spokewheel_user;

-- Connect to the new database
\c spokewheel

-- Grant schema privileges (important for PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO spokewheel_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO spokewheel_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO spokewheel_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO spokewheel_user;

-- Exit
\q
```

### Step 4: Configure Environment

Create/update your `.env` file:

```bash
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spokewheel
DB_USER=spokewheel_user
DB_PASSWORD=spoke_wheel
DB_SSL=false
```

### Step 5: Test Connection

```bash
node test-postgres.js
```

You should see: ✅ Connection successful!

## If You Get Password Errors

### Option 1: Set Password for Your User

```bash
psql -d postgres
```

Then:

```sql
ALTER USER aleksandraradziwill WITH PASSWORD 'your_password';
\q
```

### Option 2: Use Trust Authentication (Development Only)

Edit PostgreSQL config to allow local connections without password:

```bash
# Find pg_hba.conf location
psql -d postgres -c "SHOW hba_file;"

# Edit the file (usually in /opt/homebrew/var/postgresql@14/pg_hba.conf)
nano /opt/homebrew/var/postgresql@14/pg_hba.conf
```

Change this line:

```
local   all             all                                     md5
```

To:

```
local   all             all                                     trust
```

Then restart PostgreSQL:

```bash
brew services restart postgresql@14
```

**⚠️ Warning:** This is only for development! Never use `trust` in production.

### Option 3: Use Environment Variable

Set password in your shell:

```bash
export PGPASSWORD='your_password'
psql -d postgres
```

## Verify Setup

```bash
# Test connection
node test-postgres.js

# Should see:
# ✅ Connection successful!
# ✅ PostgreSQL is ready to use!
```

## Start Your Application

```bash
# Make sure DB_TYPE=postgresql is in .env
node server.js
```

The application will automatically create all tables!

## Troubleshooting

### "psql: fatal: could not find own program executable"

This usually means PostgreSQL isn't properly installed. Reinstall:

```bash
brew uninstall postgresql@14
brew install postgresql@14
brew services start postgresql@14
```

### "password authentication failed"

1. Check if PostgreSQL is running: `brew services list`
2. Try connecting without specifying user: `psql -d postgres`
3. Reset password (see Option 1 above)

### "database does not exist"

Run the CREATE DATABASE command from Step 3.

### "permission denied for schema public"

Run the GRANT commands from Step 3 (the `\c spokewheel` part).

## Next Steps

Once PostgreSQL is working:

1. ✅ Test connection: `node test-postgres.js`
2. 📦 Migrate data (if you have SQLite data): `node migrate-to-postgres.js`
3. 🚀 Start application: `node server.js`

