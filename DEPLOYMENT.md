# Photolib Deployment Guide

This guide covers deploying Photolib to a production server with MySQL.

---

## Quick Start (Production)

```bash
# 1. Prepare environment on server
sudo mkdir -p /var/www/photolib && cd /var/www/photolib
gh auth login

# 2. Get the update script (or download manually)
# Then run it to pull the latest artifact
./scripts/update-from-github.sh

# 3. Edit .env with your credentials
nano .env
```

---

## Prerequisites

### Server Requirements
- **Node.js 20+**
- **MySQL 5.7+ or MariaDB 10.3+**
- **2GB+ RAM** (for building)
- **500MB+ disk space**

### What You Need
- SSH access to your server
- MySQL database (create via hosting panel)
- Domain name configured to point to your server

## Development vs Production

Photolib distinguishes between **Development** (where you write code) and **Production** (where clients view photos).

| Feature | Development Server | Production Server |
|---------|-------------------|-------------------|
| **Code** | Full Git repository clone | Build artifacts only (no `.git`, no source TS files) |
| **Dependencies** | All (`npm install`) | Production only (`npm install --omit=dev`) |
| **Build Process** | Done locally or by GitHub | Never build on production (OOM risk) |
| **Update Method** | `git pull` | Download & unpack `photolib-deploy.tar.gz` |

---

## Production Deployment (Recommended)

On production, you do **not** need to clone the repository. You only need the pre-built artifact.

### 1. Initial Server Setup

Perform these steps once on your clean Ubuntu server:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs gh

# Create app directory
sudo mkdir -p /var/www/photolib
sudo chown $USER:$USER /var/www/photolib
cd /var/www/photolib

# Authenticate with GitHub (needed to download private artifacts)
gh auth login
```

### 2. Deploy / Update

Instead of `git pull`, use the update script to grab the latest build from GitHub Actions:

```bash
# Get the script (change REPO to your repository); for now the script is in the main brannch, on Geobusteni's project.
curl -fsSL https://raw.githubusercontent.com/Geobusteni/photolib/main/scripts/update-from-github.sh -o scripts/update-from-github.sh
chmod +x scripts/update-from-github.sh

# Run it to update
./scripts/update-from-github.sh
```

> **Note:** Right now the repo name in the script is Geobusteni. Edit `scripts/update-from-github.sh` to set your `REPO` name.

---

### 3. Step-by-Step Manual Deployment (Alternative)

### 1. Prepare MySQL Database

**In RunCloud:**
1. Go to your web application → Database
2. Click "Create Database"
3. Note: database name, username, password

**In cPanel:**
1. MySQL Databases → Create New Database
2. MySQL Users → Create New User
3. Add user to database with ALL PRIVILEGES

**Via Command Line:**
```bash
mysql -u root -p
CREATE DATABASE photolib CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'photolib'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON photolib.* TO 'photolib'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Install Node.js (if needed)

**Using NVM (recommended):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3.3 Clone Repository (Development only)

```bash
# Clone to your web app directory
cd /home/runcloud/webapps/your-app
git clone https://github.com/yourusername/photolib.git .
chmod +x scripts/*.sh
```

### 4. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Required:**
```env
DATABASE_URL='mysql://photolib:your-password@localhost:3306/photolib'
SESSION_SECRET='<64-hex-characters>'  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
UPLOAD_DIR=/absolute/path/to/uploads
```

### 5. Deploy

```bash
./scripts/deploy-server.sh
```

Creates database tables, builds app, sets up uploads directory.

### 6. Start Application

You have two main options for keeping the application running in the background. Since you are on Ubuntu, **systemd** is the recommended minimalist approach, but **PM2** is also supported.

#### Option A: systemd (Recommended for Ubuntu)

Create `/etc/systemd/system/photolib.service`:

```ini
[Unit]
Description=Photolib
After=network.target mysql.service

[Service]
Type=simple
User=your-user
Group=your-user
WorkingDirectory=/path/to/photolib
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable photolib
sudo systemctl start photolib
sudo systemctl status photolib
```

#### Option B: PM2

If you prefer PM2:

```bash
npm install -g pm2
pm2 start npm --name photolib -- start
pm2 save
pm2 startup
```

### 7. Configure Nginx Proxy

RunCloud does this automatically. For manual setup:

```nginx
server {
    listen 80;
    server_name photolib.yourdomain.com;
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

### 8. Enable SSL

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d photolib.yourdomain.com
```

### 9. Create Admin Account

Visit `https://photolib.yourdomain.com/setup`

---

## Updating

```bash
./scripts/update-production.sh
pm2 restart photolib  # or: sudo systemctl restart photolib
```

---

## Backup

**Database (crontab):**
```bash
0 2 * * * mysqldump -u photolib -p'password' photolib | gzip > /var/backups/photolib-$(date +\%Y\%m\%d).sql.gz
```

**Files:**
```bash
0 3 * * * tar -czf /var/backups/photolib-files-$(date +\%Y\%m\%d).tar.gz /path/to/photolib/.env /path/to/photolib/uploads/
```

---

## Troubleshooting

**App won't start:**
```bash
pm2 logs photolib
# Check .env configuration
# Verify MySQL is running
```

**Database connection fails:**
```bash
mysql -u photolib -p -e "SELECT 1;"
# Check DATABASE_URL format
# Special characters need percent-encoding
```

**Upload permissions:**
```bash
chmod 755 uploads/
chown -R your-user:your-user uploads/
```

**Out of memory during build:**
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## Security

- [ ] Strong SESSION_SECRET (64 hex chars)
- [ ] Strong MySQL password
- [ ] SSL enabled
- [ ] Firewall configured
- [ ] Regular backups
- [ ] File permissions (uploads not executable)
- [ ] Keep Node.js and MySQL updated

---

## Common Commands

```bash
pm2 status              # Check status
pm2 logs photolib       # View logs
pm2 restart photolib    # Restart
npx prisma studio       # Database GUI
npx prisma migrate deploy  # Run migrations
```

---

## Further Reading

- [README.md](./README.md) - Application overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical details
- [CHANGELOG.md](./CHANGELOG.md) - Version history
