# Photolib Deployment Guide

This guide covers deploying Photolib to a production server with MySQL.

---

## Quick Start

```bash
# 1. Create MySQL database in hosting panel (RunCloud, cPanel, etc.)
# 2. Clone repository
git clone https://github.com/yourusername/photolib.git
cd photolib

# 3. Configure environment
cp .env.example .env
nano .env  # Set DATABASE_URL, SESSION_SECRET, UPLOAD_DIR

# 4. Deploy
./scripts/deploy-server.sh

# 5. Start with PM2
npm install -g pm2
pm2 start npm --name photolib -- start
pm2 save
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

---

## Step-by-Step Deployment

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

### 3. Clone Repository

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

**With PM2:**
```bash
npm install -g pm2
pm2 start npm --name photolib -- start
pm2 save
pm2 startup
```

**With systemd:**
Create `/etc/systemd/system/photolib.service`:
```ini
[Unit]
Description=Photolib
After=network.target mysql.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/photolib
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable photolib
sudo systemctl start photolib
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
