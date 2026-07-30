# Photolib Operations Guide

This guide covers day-to-day operations for running Photolib in production.

> **📖 See also:**
> - [README.md](./README.md) — Installation and development setup
> - [DEPLOYMENT.md](./DEPLOYMENT.md) — Initial production deployment
> - [ARCHITECTURE.md](./ARCHITECTURE.md) — Technical architecture
> - [CHANGELOG.md](./CHANGELOG.md) — Version history

---

## Table of Contents

1. [Starting and Stopping the Application](#starting-and-stopping-the-application)
2. [Checking Application Status](#checking-application-status)
3. [Viewing Logs](#viewing-logs)
4. [Managing the Application with PM2](#managing-the-application-with-pm2)
5. [Environment Variables](#environment-variables)
6. [Database Operations](#database-operations)
7. [Troubleshooting](#troubleshooting)

---

## Starting and Stopping the Application

### Method 1: Using PM2 (Recommended)

PM2 is a production process manager that keeps your app running and auto-restarts it on crashes.

**Install PM2:**
```bash
npm install -g pm2
```

**Start the application:**
```bash
cd ~/webapps/PhotoLib
pm2 start npm --name "photolib" -- start
```

**Stop the application:**
```bash
pm2 stop photolib
```

**Restart the application:**
```bash
pm2 restart photolib
```

**Auto-start on server reboot:**
```bash
pm2 startup
pm2 save
```

**Remove from PM2:**
```bash
pm2 delete photolib
```

### Method 2: Direct npm start (For Testing)

**Start in background:**
```bash
cd ~/webapps/PhotoLib
set -a && source .env && set +a
nohup npm start > photolib.log 2>&1 &
```

**Stop:**
```bash
pkill -f "next start"
```

### Method 3: Systemd Service (Alternative)

Create `/etc/systemd/system/photolib.service`:

```ini
[Unit]
Description=Photolib Photography Delivery Application
After=network.target mysql.service

[Service]
Type=simple
User=photolib
WorkingDirectory=/home/photolib/webapps/PhotoLib
EnvironmentFile=/home/photolib/webapps/PhotoLib/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Manage the service:**
```bash
sudo systemctl enable photolib
sudo systemctl start photolib
sudo systemctl stop photolib
sudo systemctl restart photolib
sudo systemctl status photolib
```

---

## Checking Application Status

### Check if the app is running:

```bash
# Check process
ps aux | grep "next start" | grep -v grep

# Check if listening on port 3000
netstat -tlnp | grep :3000
# Or
ss -tlnp | grep :3000

# Test the health endpoint
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### With PM2:

```bash
pm2 status
pm2 show photolib
```

### With systemd:

```bash
systemctl status photolib
```

---

## Viewing Logs

### With PM2:

```bash
# View real-time logs
pm2 logs photolib

# View last 100 lines
pm2 logs photolib --lines 100

# View only errors
pm2 logs photolib --err
```

### Direct npm start:

```bash
# View the log file
tail -f ~/webapps/PhotoLib/photolib.log

# View last 100 lines
tail -100 ~/webapps/PhotoLib/photolib.log

# Search for errors
grep -i error ~/webapps/PhotoLib/photolib.log
```

### With systemd:

```bash
sudo journalctl -u photolib -f
sudo journalctl -u photolib --since "1 hour ago"
```

---

## Managing the Application with PM2

### View PM2 Dashboard:

```bash
pm2 monit
```

### Application Metrics:

```bash
pm2 show photolib
```

### Memory and CPU Usage:

```bash
pm2 list
```

### Restart on File Changes (Development):

```bash
pm2 start npm --name "photolib-dev" --watch -- run dev
```

### Save PM2 Configuration:

```bash
# Save current process list
pm2 save

# Restore saved processes
pm2 resurrect
```

---

## Environment Variables

### Required Variables

The application requires these variables in `/home/photolib/webapps/PhotoLib/.env`:

```bash
# Database connection
DATABASE_URL='mysql://user:password@localhost:3306/database'

# Session encryption key (64 hex characters)
SESSION_SECRET='5360d4f7dd1f19117ffc4a530962ffe84c155528ac3b11fec73fec2d06a49728'

# File storage path
UPLOAD_DIR=./uploads

# Optional: Enable secure cookies for HTTPS sites
COOKIE_SECURE=true
```

### Generate a new SESSION_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Reload Environment Variables:

After editing `.env`, restart the application:

```bash
# With PM2
pm2 restart photolib

# With systemd
sudo systemctl restart photolib

# Direct npm start
pkill -f "next start"
set -a && source .env && set +a
nohup npm start > photolib.log 2>&1 &
```

---

## Database Operations

### Backup Database:

```bash
# Create timestamped backup
mysqldump -u photolib -p photolib > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup to specific location
mysqldump -u photolib -p photolib > ~/backups/photolib-backup.sql
```

### Restore Database:

```bash
mysql -u photolib -p photolib < backup-20260730-123456.sql
```

### Sync Database Schema:

```bash
cd ~/webapps/PhotoLib
npx prisma db push
```

### View Database Tables:

```bash
mysql -u photolib -p photolib -e "SHOW TABLES;"
```

### Check User Accounts:

```bash
mysql -u photolib -p photolib -e "SELECT id, email, username, role FROM User;"
```

### Check Projects:

```bash
mysql -u photolib -p photolib -e "SELECT id, title, createdAt FROM Project;"
```

---

## Troubleshooting

### Application won't start

**Check if port 3000 is already in use:**
```bash
netstat -tlnp | grep :3000
# If something is using it, kill it:
pkill -f "next start"
```

**Check if database is accessible:**
```bash
# Test database connection
mysql -u photolib -p photolib -e "SELECT 1;"
```

**Verify environment variables are loaded:**
```bash
# Check if DATABASE_URL is set
grep DATABASE_URL .env

# Test loading env vars
set -a && source .env && set +a
echo $DATABASE_URL
```

### Login not working (cookies)

**Check if HTTPS is configured:**
```bash
# If using HTTPS, ensure COOKIE_SECURE is set
grep COOKIE_SECURE .env
```

**Test login API directly:**
```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"identifier":"your@email.com","password":"yourpassword"}'
```

**Check nginx proxy headers:**
```bash
# Ensure these headers are set in nginx config:
# proxy_set_header X-Forwarded-Proto $scheme;
# proxy_set_header Host $host;
```

### 502 Bad Gateway

**Check if app is running:**
```bash
curl http://localhost:3000/api/health
```

**Check nginx error logs:**
```bash
sudo tail -50 /var/log/nginx/error.log
```

**Restart both nginx and app:**
```bash
pm2 restart photolib
sudo systemctl reload nginx
```

### 404 on all routes

**Check nginx proxy configuration:**
```bash
# Ensure location / block has proxy_pass
sudo nginx -T | grep -A10 "location /"
```

**Verify .next build exists:**
```bash
ls -la ~/webapps/PhotoLib/.next/
```

### Database connection errors

**Check if MySQL is running:**
```bash
sudo systemctl status mysql
```

**Test connection string:**
```bash
# Extract connection details from DATABASE_URL
mysql -h localhost -u photolib -p photolib -e "SELECT 1;"
```

**Check if database exists:**
```bash
mysql -u photolib -p -e "SHOW DATABASES;"
```

### Out of disk space

**Check disk usage:**
```bash
df -h
du -sh ~/webapps/PhotoLib/*
```

**Check upload directory:**
```bash
du -sh ~/webapps/PhotoLib/uploads/
```

**Clean up old logs:**
```bash
# PM2 logs
pm2 flush

# Application logs
> ~/webapps/PhotoLib/photolib.log
```

### Memory issues

**Check memory usage:**
```bash
free -h
pm2 show photolib
```

**Restart the application:**
```bash
pm2 restart photolib
```

### Application crashes repeatedly

**View crash logs:**
```bash
pm2 logs photolib --lines 200 --err
```

**Common causes:**
- Database connection lost
- Out of memory
- Missing environment variables
- File permissions issues

**Check file permissions:**
```bash
ls -la ~/webapps/PhotoLib/
# Ensure photolib user owns all files
```

---

## Performance Monitoring

### Check response times:

```bash
# Test health endpoint
time curl http://localhost:3000/api/health
```

### Monitor resource usage:

```bash
# With PM2
pm2 monit

# System resources
top
htop
```

### Check database performance:

```bash
mysql -u photolib -p photolib -e "SHOW PROCESSLIST;"
```

---

## Security Best Practices

1. **Never commit `.env` to git** - it contains secrets
2. **Use strong SESSION_SECRET** - regenerate if compromised
3. **Regular database backups** - automate with cron
4. **Keep Node.js updated** - check for security updates
5. **Use HTTPS in production** - set `COOKIE_SECURE=true`
6. **Restrict file permissions** - uploads directory should not be executable
7. **Monitor logs** - watch for suspicious activity

---

## Quick Reference Commands

```bash
# Start app
pm2 start npm --name "photolib" -- start

# Stop app
pm2 stop photolib

# Restart app
pm2 restart photolib

# View logs
pm2 logs photolib

# Check status
pm2 status

# Test app
curl http://localhost:3000/api/health

# Backup database
mysqldump -u photolib -p photolib > backup-$(date +%Y%m%d).sql

# Update from GitHub
./scripts/update-from-github.sh
```

---

## Need More Help?

- Check `DEPLOYMENT.md` for initial setup
- Check `README.md` for application overview
- Check GitHub issues: https://github.com/Geobusteni/photolib/issues
