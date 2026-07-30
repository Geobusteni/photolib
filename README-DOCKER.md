# Docker Deployment Quick Reference

This is a quick reference for deploying Photolib with Docker. For complete documentation, see [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Prerequisites

- Docker 20.10+
- Docker Compose
- Git

---

## Initial Setup

### 1. Clone and Configure

```bash
git clone https://github.com/yourusername/photolib.git
cd photolib
cp .env.docker .env
```

### 2. Edit .env

```bash
nano .env
```

Set these values:
- `DB_PASSWORD` - Secure password for PostgreSQL (Docker will create the database with this password)
- `SESSION_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `PORT` - Port to expose (default: 3000)

> **Note:** You don't need to install PostgreSQL or create any databases manually. Docker Compose creates and manages the PostgreSQL container automatically with the password you specify.

### 3. Deploy

```bash
chmod +x scripts/*.sh
./scripts/docker-deploy.sh
```

### 4. Access

**Production (with RunCloud/reverse proxy):**
Visit your configured domain (e.g., `https://photolib.yourdomain.com`)

**Local testing only:**
`http://localhost:3000`

> **Note:** The app runs on port 3000 *inside* the Docker container. Your reverse proxy (RunCloud/Nginx) forwards requests from your domain (port 80/443) to this container port. You don't access `:3000` directly in production. Use whatever domain you configured in RunCloud.

First run: you'll be redirected to `/setup` to create an admin account.

---

## Common Commands

```bash
# View logs
docker compose logs -f

# Check status
docker compose ps

# Restart app
docker compose restart app

# Stop everything
docker compose down

# Update to latest version
./scripts/docker-update.sh

# Shell into app
docker compose exec app sh

# Open Prisma Studio
docker compose exec app npx prisma studio

# Backup database
docker compose exec db pg_dump -U photolib photolib | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore database
gunzip < backup.sql.gz | docker compose exec -T db psql -U photolib photolib
```

---

## RunCloud Integration

### Setup in RunCloud

1. Create a new web application (Custom or Node.js type) with your domain
2. Deploy Docker containers using `./scripts/docker-deploy.sh` in your app directory
3. RunCloud automatically proxies requests from your domain to the Docker container
4. The `PORT` in `.env` (default: 3000) is the container's internal port - RunCloud handles the mapping

### SSL Certificate

Use RunCloud's built-in Let's Encrypt integration to add SSL.

### File Permissions

RunCloud apps run under specific users. Ensure Docker has proper permissions:

```bash
sudo usermod -aG docker runcloud
```

Log out and back in for changes to take effect.

---

## Updating

```bash
cd /path/to/photolib
./scripts/docker-update.sh
```

This automatically:
- Backs up `.env`
- Pulls latest code
- Rebuilds containers
- Runs migrations
- Restarts services

---

## Troubleshooting

### Container won't start

```bash
docker compose logs app
```

Common causes:
- `.env` not configured
- Port already in use (change `PORT` in `.env`)
- Database not ready (wait 10 seconds and retry)

### Database connection fails

```bash
# Restart database
docker compose restart db

# Check database logs
docker compose logs db
```

### Out of space

```bash
# Check usage
docker system df

# Clean up
docker system prune -a
```

### Port conflicts

If port 3000 is in use, change `PORT` in `.env`:

```bash
PORT=8080
```

Then restart:

```bash
docker compose down
docker compose up -d
```

---

## Data Locations

- **Database**: Docker volume `photolib-db-data`
- **Uploads**: Docker volume `photolib-uploads`
- **Config**: `.env` file (gitignored, back up separately)

---

## Backup Strategy

### Automated Daily Backups

Add to crontab:

```bash
crontab -e
```

Add:

```cron
# Database backup at 2 AM
0 2 * * * cd /path/to/photolib && docker compose exec -T db pg_dump -U photolib photolib | gzip > /var/backups/photolib-db-$(date +\%Y\%m\%d).sql.gz

# Uploads backup at 3 AM
0 3 * * * cd /path/to/photolib && docker cp photolib-app:/app/uploads /tmp/uploads-backup && tar -czf /var/backups/photolib-uploads-$(date +\%Y\%m\%d).tar.gz -C /tmp uploads-backup && rm -rf /tmp/uploads-backup
```

---

## Security Notes

- Never commit `.env` (it's gitignored)
- Use strong passwords (32+ characters)
- `SESSION_SECRET` must be 64 hex characters
- Enable SSL in production
- Keep Docker updated: `sudo apt update && sudo apt upgrade`
- Regular backups are essential

---

## Further Reading

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) - Complete deployment guide
- [`README.md`](./README.md) - Application overview and features
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - Technical details

---

## Support

For issues or questions, refer to the main documentation or check the logs:

```bash
docker compose logs -f
```
