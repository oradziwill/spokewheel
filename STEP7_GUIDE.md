# Step 7: Configure PM2 - Detailed Guide

This guide will help you set up PM2 (Process Manager) for SpokeWheel and verify everything works.

## Prerequisites

Before starting Step 7, make sure you have:

- ✅ Code uploaded to `/var/www/spokewheel` (or your chosen directory)
- ✅ Dependencies installed (`npm install --production` in root, `npm install && npm run build` in client)
- ✅ `.env` file created with production settings
- ✅ Database set up (PostgreSQL or SQLite)

## Step 7.1: Create Logs Directory

```bash
cd /var/www/spokewheel
mkdir -p logs
```

This directory will store PM2 logs.

## Step 7.2: Start Application with PM2

### Option A: Using ecosystem.config.js (Recommended)

```bash
cd /var/www/spokewheel
pm2 start ecosystem.config.js
```

### Option B: Direct start (Alternative)

```bash
cd /var/www/spokewheel
pm2 start server.js --name spokewheel --env production
```

### What to expect:

You should see output like:

```
[PM2] Starting in fork_mode (1 instance)
[PM2] Done.
┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name         │ mode        │ ↺       │ status  │ cpu      │
├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ spokewheel   │ fork        │ 0       │ online  │ 0%       │
└─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┘
```

## Step 7.3: Save PM2 Configuration

```bash
pm2 save
```

This saves the current PM2 process list so it persists after server reboots.

## Step 7.4: Set Up Auto-Start on Boot

```bash
pm2 startup
```

This will output a command like:

```
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u your_username --hp /home/your_username
```

**Copy and run that exact command** (it will be different for your system).

## Step 7.5: Verify Everything Works

### Check PM2 Status

```bash
pm2 status
```

You should see `spokewheel` with status `online`.

### Check Application Logs

```bash
pm2 logs spokewheel
```

Look for:

- ✅ "Server running on port 3001" or similar
- ✅ "Connected to PostgreSQL database" (if using PostgreSQL)
- ❌ Any error messages

Press `Ctrl+C` to exit logs view.

### Test API Endpoint

```bash
curl http://localhost:3001/api/axes
```

You should get JSON data with your axes. If you see:

- ✅ JSON array with axes → **Success!**
- ❌ "Connection refused" → Application not running
- ❌ "Cannot GET" → Check routes
- ❌ Empty response → Check logs

### Test from Browser (if on server)

If you have a browser on the server, or using port forwarding:

```bash
# From your local machine (if SSH port forwarding)
ssh -L 3001:localhost:3001 user@your-server

# Then open http://localhost:3001 in your browser
```

## Step 7.6: Run Verification Script

```bash
cd /var/www/spokewheel
chmod +x verify-pm2.sh
./verify-pm2.sh
```

This will check:

- PM2 installation
- Application status
- Port availability
- API responsiveness
- Logs
- Auto-start configuration

## Common Issues and Solutions

### Issue 1: "spawn EACCES" or Permission Error

**Solution:**

```bash
# Make sure you own the directory
sudo chown -R $USER:$USER /var/www/spokewheel

# Check file permissions
chmod +x server.js
```

### Issue 2: Application Crashes Immediately

**Check logs:**

```bash
pm2 logs spokewheel --lines 50
```

**Common causes:**

- Missing `.env` file
- Wrong database credentials
- Port 3001 already in use
- Missing dependencies

**Solutions:**

```bash
# Check if port is in use
sudo lsof -i :3001

# Kill process if needed
sudo kill -9 <PID>

# Check .env file exists
ls -la .env

# Verify database connection
# (Test PostgreSQL connection separately)
```

### Issue 3: "Cannot find module" Errors

**Solution:**

```bash
# Reinstall dependencies
npm install --production

# Check node_modules exists
ls -la node_modules
```

### Issue 4: Application Shows "Errored" Status

**Check detailed error:**

```bash
pm2 describe spokewheel
pm2 logs spokewheel --err
```

**Common fixes:**

- Check `.env` file has all required variables
- Verify database is running and accessible
- Check file paths in configuration

### Issue 5: Port 3001 Already in Use

**Find what's using it:**

```bash
sudo lsof -i :3001
sudo netstat -tulpn | grep 3001
```

**Kill the process:**

```bash
sudo kill -9 <PID>
# Or
pm2 delete spokewheel
pm2 start ecosystem.config.js
```

### Issue 6: Database Connection Errors

**For PostgreSQL:**

```bash
# Test connection manually
sudo -u postgres psql -d spokewheel -U spokewheel_user

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check .env has correct credentials
cat .env | grep DB_
```

**For SQLite:**

```bash
# Check database file exists and is writable
ls -la admin_feedback.db
chmod 664 admin_feedback.db
```

## Useful PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs spokewheel          # All logs
pm2 logs spokewheel --lines 50  # Last 50 lines
pm2 logs spokewheel --err    # Only errors

# Restart application
pm2 restart spokewheel

# Stop application
pm2 stop spokewheel

# Delete application from PM2
pm2 delete spokewheel

# Monitor (real-time)
pm2 monit

# Show detailed info
pm2 describe spokewheel
pm2 info spokewheel

# Reload (zero-downtime restart)
pm2 reload spokewheel
```

## Verification Checklist

Before moving to Step 8, verify:

- [ ] PM2 is installed (`pm2 -v`)
- [ ] Application is running (`pm2 status` shows `online`)
- [ ] No errors in logs (`pm2 logs spokewheel` shows no errors)
- [ ] API responds (`curl http://localhost:3001/api/axes` returns JSON)
- [ ] Port 3001 is listening (`sudo lsof -i :3001` shows node process)
- [ ] PM2 save completed (`pm2 save` ran successfully)
- [ ] Auto-start configured (`pm2 startup` command executed)

## Next Steps

Once Step 7 is complete and verified:

1. ✅ Application is running with PM2
2. ✅ API is accessible on port 3001
3. ✅ Logs are working
4. ✅ Auto-start is configured

**Proceed to Step 8: Configure Nginx** to expose your application to the internet.

## Getting Help

If you're stuck:

1. **Check the logs:**

   ```bash
   pm2 logs spokewheel --lines 100
   ```

2. **Run the verification script:**

   ```bash
   ./verify-pm2.sh
   ```

3. **Check system resources:**

   ```bash
   free -h
   df -h
   ```

4. **Verify environment:**

   ```bash
   cat .env
   node -v
   npm -v
   ```

5. **Test database connection separately** (if using PostgreSQL)

