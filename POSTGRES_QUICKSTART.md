# PostgreSQL Quick Start

The fastest way to get PostgreSQL working with SpokeWheel.

## 5-Minute Setup

### 1. Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql && brew services start postgresql
```

### 2. Create Database

```bash
sudo -u postgres psql
```

Then in PostgreSQL:

```sql
CREATE DATABASE spokewheel;
CREATE USER spokewheel_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE spokewheel TO spokewheel_user;
\c spokewheel
GRANT ALL ON SCHEMA public TO spokewheel_user;
\q
```

### 3. Install Dependencies

```bash
npm install pg dotenv
```

### 4. Configure Environment

Create/update `.env`:

```bash
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spokewheel
DB_USER=spokewheel_user
DB_PASSWORD=your_password
DB_SSL=false
```

### 5. Test Connection

```bash
node test-postgres.js
```

You should see: ✅ Connection successful!

### 6. Migrate Data (if you have SQLite data)

```bash
node migrate-to-postgres.js
```

### 7. Start Application

```bash
node server.js
```

The application will automatically use PostgreSQL!

## That's It! 🎉

Your application is now using PostgreSQL. The database will be automatically initialized with all necessary tables.

## Need More Help?

- **Full Setup Guide**: See [POSTGRES_SETUP.md](./POSTGRES_SETUP.md)
- **Troubleshooting**: Check the troubleshooting section in POSTGRES_SETUP.md
- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

## Switching Back to SQLite

Just remove or comment out `DB_TYPE=postgresql` in your `.env` file:

```bash
# DB_TYPE=postgresql
```

The application will automatically switch back to SQLite.
