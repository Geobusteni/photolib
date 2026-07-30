# Photolib Deployment Guide

This guide covers deploying Photolib to a production server and keeping it updated.

---

## Quick Start

**For RunCloud or containerized environments:**

```bash
git clone https://github.com/yourusername/photolib.git
cd photolib
cp .env.docker .env
# Edit .env with your DB_PASSWORD and SESSION_SECRET
./scripts/docker-deploy.sh
```

**For traditional VPS:**

```bash
git clone https://github.com/yourusername/photolib.git
cd photolib
./scripts/build-for-deploy.sh
npx prisma migrate deploy
npm start
```

See detailed instructions below for each deployment option.

---

## Initial Deployment

### Option A: Docker (Recommended for RunCloud and containerized environments)

Perfect for RunCloud web apps, containerized environments, or when you want isolated, reproducible deployments.

#### 1. Server Prerequisites

- Docker 20.10+ and Docker Compose
- Git
- 1GB+ RAM

#### 2. Install Docker

**Ubuntu/Debian:**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

**RunCloud / Containerized Web App Users:**

If Docker was installed by root and your web app runs under a different user (e.g., `runcloud`, `webapp-user`), you must add that user to the docker group:

```bash
# Add the web app user to docker group
sudo usermod -aG docker runcloud  # Replace 'runcloud' with your actual user

# Verify the user is in the group
groups runcloud

# Apply group changes (choose one):
# Option 1: Log out and back in
# Option 2: Run this in your current shell
newgrp docker

# Option 3: Use su to switch to the user (most reliable for RunCloud)
su - runcloud
```

**Verify installation:**

```bash
docker --version
docker compose version

# Test you can run docker without sudo
docker ps
```

If `docker ps` gives a permission error, the user is not in the docker group yet. Log out and back in, or contact your hosting provider.

#### 3. Clone Repository

```bash
# Clone to your RunCloud web app directory or preferred location
cd /home/runcloud/webapps/your-app
git clone https://github.com/yourusername/photolib.git .

# Make scripts executable
chmod +x scripts/*.sh
```

#### 4. Configure Environment

```bash
# Copy Docker environment template
cp .env.docker .env

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env
nano .env
```

Set in `.env`:
- `DB_PASSWORD=your-secure-database-password` (Docker will create the PostgreSQL database with this password)
- `SESSION_SECRET=<64-random-hex-characters-from-above>`
- `PORT=3000` (or your preferred port)

> **Important:** You do NOT need to install PostgreSQL or create the database manually. Docker Compose handles all of this automatically. The database runs in its own container with the password you set in `.env`.

#### 5. Deploy

```bash
./scripts/docker-deploy.sh
```

This will:
- Build Docker images (app is built with a standalone output)
- Start PostgreSQL 16 database container (automatically created with your DB_PASSWORD)
- Create the `photolib` database and `photolib` user
- Run database migrations
- Start the application container
- Set up health checks for both containers

> **Behind the scenes:** Docker Compose automatically installs PostgreSQL 16 in a separate container, creates the database, sets up the user with your password, and connects everything together. You never touch PostgreSQL directly.

#### 6. Set Up Reverse Proxy (RunCloud)

In RunCloud, your web app automatically proxies requests from your domain to the Docker container.

**If using RunCloud:** Set your app as "Custom" or "Node.js" type. RunCloud handles the proxy configuration automatically.

**Manual Nginx configuration** (only if not using RunCloud):

```nginx
location / {
    proxy_pass http://localhost:3000;  # Points to Docker container
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    client_max_body_size 500M;  # Important: allows large photo uploads
}
```

> **RunCloud Users:** You don't need to edit Nginx manually. RunCloud configures the proxy automatically when you create the web app. Just ensure the PORT in `.env` matches (default is 3000).

#### 7. Enable SSL

In RunCloud, use the built-in Let's Encrypt integration to enable SSL for your domain.

#### 8. Access Your Application

Visit your configured domain (e.g., `https://photolib.yourdomain.com` or `https://photos.photolib.yourdomain.com`)

On first run, you'll be redirected to `/setup` to create the admin account.

> **Note:** The app runs on port 3000 *inside* the Docker container. Your reverse proxy (RunCloud/Nginx) forwards requests from your domain (port 80/443) to the container. You never access `:3000` directly in production.

#### Docker Management Commands

```bash
# View logs
docker compose logs -f

# Check status
docker compose ps

# Restart application
docker compose restart app

# Stop everything
docker compose down

# Stop but keep data
docker compose stop

# Shell into app container
docker compose exec app sh

# Run Prisma commands
docker compose exec app npx prisma studio

# Backup database
docker compose exec db pg_dump -U photolib photolib > backup.sql

# Backup uploads
docker cp photolib-app:/app/uploads ./uploads-backup
```

---

### Option B: Clone and Build on Server

This approach builds directly on your server without Docker.

#### 1. Server Prerequisites

- Ubuntu 22.04+ or similar Linux distribution
- Node.js 20 or newer
- PostgreSQL 14 or newer
- Git
- At least 2GB RAM (for building)

#### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 3. Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE USER photolib_user WITH PASSWORD 'your-secure-password';
CREATE DATABASE photolib_db OWNER photolib_user;
\q
```

#### 4. Clone Repository

```bash
# Clone to /var/www or your preferred location
cd /var/www
sudo git clone https://github.com/yourusername/photolib.git
cd photolib

# Make scripts executable
chmod +x scripts/*.sh
```

#### 5. Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit configuration
nano .env
```

Set:
- `DATABASE_URL='postgresql://photolib_user:your-secure-password@localhost:5432/photolib_db'`
- `SESSION_SECRET='<64-random-hex-characters>'` (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `UPLOAD_DIR='/var/www/photolib/uploads'`

#### 6. Build Application

```bash
./scripts/build-for-deploy.sh
```

#### 7. Run Migrations

```bash
npx prisma migrate deploy
```

#### 8. Create Upload Directory

```bash
mkdir -p uploads
chmod 755 uploads
```

#### 9. Set Up Process Manager

**Option 1: PM2 (Recommended)**

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
pm2 start npm --name photolib -- start

# Save PM2 process list
pm2 save

# Set PM2 to start on boot
pm2 startup
```

**Option 2: systemd**

Create `/etc/systemd/system/photolib.service`:

```ini
[Unit]
Description=Photolib Photography Delivery
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/photolib
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl start photolib
sudo systemctl enable photolib
```

#### 10. Set Up Reverse Proxy (Optional)

**Nginx Configuration** (`/etc/nginx/sites-available/photolib`):

```nginx
server {
    listen 80;
    server_name photos.yourdomain.com;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/photolib /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 11. Set Up SSL (Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d photos.yourdomain.com
```

---

### Option C: Build Locally and Deploy

If your server has limited resources, build locally and deploy the artifacts.

#### 1. Build Locally

```bash
./scripts/build-for-deploy.sh
```

#### 2. Package for Transfer

```bash
tar -czf photolib-deploy.tar.gz \
  .next \
  node_modules \
  public \
  prisma \
  package.json \
  package-lock.json \
  .env.example
```

#### 3. Transfer to Server

```bash
scp photolib-deploy.tar.gz user@your-server:/var/www/
```

#### 4. Extract on Server

```bash
cd /var/www
mkdir -p photolib
tar -xzf photolib-deploy.tar.gz -C photolib
cd photolib
```

Then follow steps 5-11 from Option B.

---

## Updating to a New Version

### Docker Update (Option A)

```bash
cd /home/runcloud/webapps/your-app/photolib
./scripts/docker-update.sh
```

This automatically:
- Backs up `.env`
- Pulls latest code
- Rebuilds containers
- Runs migrations
- Restarts the application

### Standard Update (Options B & C)

On your server:

```bash
cd /var/www/photolib
./scripts/update-server.sh
```

Then restart the application:

```bash
# If using PM2:
pm2 restart photolib

# If using systemd:
sudo systemctl restart photolib
```

### Manual Update

```bash
# 1. Back up .env
cp .env .env.backup

# 2. Pull latest changes
git fetch --tags
git pull

# 3. Restore .env
cp .env.backup .env

# 4. Install dependencies
npm ci --omit=dev

# 5. Temporarily install dev dependencies
npm install --save-dev

# 6. Generate Prisma client
npx prisma generate

# 7. Run migrations
npx prisma migrate deploy

# 8. Rebuild
NODE_ENV=production npm run build

# 9. Remove dev dependencies
rm -rf node_modules
npm ci --omit=dev

# 10. Restart application
pm2 restart photolib  # or: sudo systemctl restart photolib
```

---

## Backup Strategy

### Docker Backups (Option A)

**Database backup:**

```bash
# Manual backup
docker compose exec db pg_dump -U photolib photolib | gzip > photolib-db-$(date +%Y%m%d).sql.gz

# Automated daily backup (add to crontab):
0 2 * * * cd /home/runcloud/webapps/your-app/photolib && docker compose exec -T db pg_dump -U photolib photolib | gzip > /var/backups/photolib-db-$(date +\%Y\%m\%d).sql.gz
```

**Restore database:**

```bash
gunzip < photolib-db-backup.sql.gz | docker compose exec -T db psql -U photolib photolib
```

**Uploads backup:**

```bash
# Manual backup
docker cp photolib-app:/app/uploads ./uploads-backup
tar -czf photolib-uploads-$(date +%Y%m%d).tar.gz uploads-backup

# Automated (add to crontab):
0 3 * * * cd /home/runcloud/webapps/your-app/photolib && docker cp photolib-app:/app/uploads /tmp/uploads-backup && tar -czf /var/backups/photolib-uploads-$(date +\%Y\%m\%d).tar.gz -C /tmp uploads-backup && rm -rf /tmp/uploads-backup
```

**Volume backup (alternative):**

```bash
# Backup Docker volumes
docker run --rm -v photolib-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz /data
```

### Standard Backups (Options B & C)

**Database backup:**

```bash
# Automated daily backup (add to crontab):
0 2 * * * pg_dump -U photolib_user photolib_db | gzip > /var/backups/photolib-$(date +\%Y\%m\%d).sql.gz
```

**Manual backup:**

```bash
pg_dump -U photolib_user photolib_db > photolib-backup.sql
```

**Restore from backup:**

```bash
psql -U photolib_user photolib_db < photolib-backup.sql
```

**File backups:**

```bash
# Manual backup
tar -czf photolib-files-$(date +%Y%m%d).tar.gz .env uploads/

# Automated (add to crontab, runs at 3 AM daily):
0 3 * * * cd /var/www/photolib && tar -czf /var/backups/photolib-files-$(date +\%Y\%m\%d).tar.gz .env uploads/
```

---

## Monitoring

### Docker (Option A)

```bash
# Check status
docker compose ps

# View logs (follow mode)
docker compose logs -f

# View logs for specific service
docker compose logs -f app

# Check resource usage
docker stats photolib-app photolib-db

# Check health
docker compose exec app wget -qO- http://localhost:3000/api/health
```

### Standard Deployment (Options B & C)

```bash
# PM2
pm2 status
pm2 logs photolib

# systemd
sudo systemctl status photolib
sudo journalctl -u photolib -f
```

### Check Disk Space

```bash
df -h
du -sh /var/www/photolib/uploads
```

### Check Database

**Docker:**

```bash
docker compose exec db psql -U photolib photolib -c "SELECT COUNT(*) FROM \"Project\";"
```

**Standard:**

```bash
psql -U photolib_user photolib_db -c "SELECT COUNT(*) FROM \"Project\";"
```

---

## Troubleshooting

### Docker Issues

**Permission denied / Cannot connect to Docker daemon:**

```bash
# Check if your user is in the docker group
groups

# If 'docker' is not in the list, add it:
sudo usermod -aG docker $USER

# Apply changes (choose one):
su - $USER              # Switch to your user (most reliable)
newgrp docker           # Or activate group in current shell
# Or log out and back in

# Test
docker ps
```

**Container won't start:**

```bash
# Check logs
docker compose logs app

# Common issues:
# - .env not configured: check DB_PASSWORD and SESSION_SECRET
# - Port already in use: change PORT in .env
# - Database not ready: wait and retry
```

**Database connection fails:**

```bash
# Check database is running
docker compose ps db

# Check database logs
docker compose logs db

# Restart database
docker compose restart db
```

**Out of disk space:**

```bash
# Check Docker disk usage
docker system df

# Clean up unused images/containers
docker system prune -a

# Clean up volumes (CAUTION: this deletes data)
docker volume prune
```

**Permission issues in container:**

All files should be owned by `nextjs:nodejs` (UID 1001). If you need to fix permissions:

```bash
docker compose exec -u root app chown -R nextjs:nodejs /app/uploads
```

### Standard Deployment Issues

**Build fails with "Out of Memory":**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

Or use Option C (build locally).

**Migrations fail:**

Check database ownership:

```bash
sudo -u postgres psql -d postgres -c "ALTER DATABASE photolib_db OWNER TO photolib_user;"
sudo -u postgres psql -d photolib_db -c "ALTER SCHEMA public OWNER TO photolib_user;"
```

**Application won't start:**

Check logs:

```bash
# PM2
pm2 logs photolib --lines 100

# systemd
sudo journalctl -u photolib -n 100
```

Common issues:
- `.env` file missing or misconfigured
- Database not running: `sudo systemctl start postgresql`
- Port 3000 already in use: check with `lsof -i :3000`

**Upload directory permissions:**

```bash
sudo chown -R www-data:www-data /var/www/photolib/uploads
chmod 755 /var/www/photolib/uploads
```

---

## Security Checklist

- [ ] Use a strong `SESSION_SECRET` (64 random hex characters)
- [ ] Use a strong database password
- [ ] Set up SSL/HTTPS (Let's Encrypt)
- [ ] Configure firewall (UFW/iptables) to allow only SSH, HTTP, HTTPS
- [ ] Keep system packages updated: `sudo apt update && sudo apt upgrade`
- [ ] Set proper file permissions (uploads directory should not be executable)
- [ ] Regular backups (database + uploads + .env)
- [ ] Monitor disk space
- [ ] Keep Node.js and PostgreSQL updated

---

## Version Checking

Check current version:

```bash
node -p "require('./package.json').version"
```

Check for updates:

```bash
git fetch --tags
git tag -l
```

---

## Rollback to Previous Version

If an update causes issues:

```bash
# 1. Check git log for previous commit
git log --oneline

# 2. Checkout previous version (replace COMMIT_HASH)
git checkout COMMIT_HASH

# 3. Rebuild
./scripts/build-for-deploy.sh

# 4. Run migrations (will rollback if needed)
npx prisma migrate deploy

# 5. Restart
pm2 restart photolib  # or: sudo systemctl restart photolib
```

---

## Support

For issues not covered here, see:
- [`README.md`](./README.md) — installation and basic usage
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — technical details
- [`CHANGELOG.md`](./CHANGELOG.md) — version history
