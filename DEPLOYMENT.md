# Deployment Guide for Enroll23

This guide covers deployment strategies for the Enroll23 application.

## Quick Reference

### For Developers
- **Local Development**: Use `docker-compose.yml` (builds locally)
- **CI/CD**: Automatically builds and pushes to Docker Hub on push to `main`
- **Manual Build**: See "Manual Image Building" section below

### For Admins/Deployers
- **First Time Setup**: Use `docker-compose.prod.yml` (uses pre-built images)
- **Updates**: Run `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`

## Deployment Methods

### Method 1: CI/CD with Docker Hub (Recommended) ⭐

**Best for:** Production deployments, multiple admins, automated updates

**How it works:**
1. Developer pushes code → GitHub Actions builds images → Images pushed to Docker Hub
2. Admin runs `docker compose pull` → Gets latest images → Restarts containers

**Setup Steps:**

1. **Developer Setup (One-time):**
   ```bash
   # 1. Create Docker Hub account
   # 2. Create access token in Docker Hub
   # 3. Add secrets to GitHub:
   #    - DOCKER_USERNAME
   #    - DOCKER_PASSWORD (access token)
   ```

2. **Admin Setup (One-time):**
   ```bash
   # 1. Download docker-compose.prod.yml and .env.example
   # 2. Create .env file with your configuration
   # 3. Update docker-compose.prod.yml with Docker Hub username
   # 4. Start application:
   docker compose -f docker-compose.prod.yml up -d
   ```

3. **Admin Updates (When new version available):**
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

**Advantages:**
- ✅ No hosting required (Docker Hub is free)
- ✅ One command to update
- ✅ Automatic builds on code push
- ✅ Industry standard approach
- ✅ Works for multiple admins

### Method 2: Local Builds

**Best for:** Development, testing, single admin deployments

**How it works:**
- Build images locally on the server
- No Docker Hub required

**Setup:**
```bash
# 1. Clone repository on server
git clone <repository-url>
cd Onsite_User_Management

# 2. Create .env file
cp .env.example .env
# Edit .env

# 3. Build and start
docker compose up --build -d
```

**Updates:**
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up --build -d
```

**Advantages:**
- ✅ No Docker Hub account needed
- ✅ Full control over builds
- ✅ Good for development

**Disadvantages:**
- ❌ Requires Git and build tools on server
- ❌ Slower updates (rebuilds everything)
- ❌ More complex for multiple admins

## Environment Configuration

### Required Environment Variables

Create a `.env` file with these variables:

```env
# Database
DB_USER=admin
DB_PASSWORD=your-secure-password
DB_NAME=enroll23

# Security (IMPORTANT: Change in production!)
SECRET_KEY=generate-a-strong-random-key-here
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=your-secure-admin-password

# Application
ENVIRONMENT=production
DEBUG=False
CORS_ORIGINS=http://your-domain.com:3000
```

### Generating a Secure SECRET_KEY

```bash
# Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Using OpenSSL
openssl rand -hex 32
```

## Production Checklist

Before deploying to production:

- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Change `ADMIN_PASSWORD` to a secure password
- [ ] Set `ENVIRONMENT=production`
- [ ] Set `DEBUG=False`
- [ ] Update `CORS_ORIGINS` to your production domain
- [ ] Use strong `DB_PASSWORD`
- [ ] Review and update all security settings
- [ ] Test database backups
- [ ] Set up monitoring/logging
- [ ] Configure firewall rules
- [ ] Set up SSL/TLS (if exposing publicly)

## Server Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB (for database and uploads)
- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2

### Recommended Requirements
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

### Software Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- (Optional) Git (for local builds)

## Network Configuration

### Ports Required
- **3000**: Frontend web interface
- **8000**: Backend API
- **5432**: PostgreSQL database (can be internal only)

### Firewall Rules
```bash
# Allow frontend access
sudo ufw allow 3000/tcp

# Allow backend API access (if needed)
sudo ufw allow 8000/tcp

# Database should NOT be exposed publicly
# Only allow localhost access
```

## Database Backups

### Manual Backup
```bash
# Backup database
docker compose exec db pg_dump -U admin enroll23 > backup_$(date +%Y%m%d).sql

# Restore database
docker compose exec -T db psql -U admin enroll23 < backup_20240101.sql
```

### Automated Backups (Cron)
```bash
# Add to crontab (crontab -e)
0 2 * * * cd /path/to/app && docker compose exec db pg_dump -U admin enroll23 > /backups/enroll23_$(date +\%Y\%m\%d).sql
```

## Monitoring & Logs

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Health Checks
```bash
# Check backend health
curl http://localhost:8000/health

# Check all containers
docker compose ps
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker compose logs <service-name>

# Check container status
docker compose ps

# Restart specific service
docker compose restart <service-name>
```

### Database Connection Issues
```bash
# Check database is running
docker compose ps db

# Check database logs
docker compose logs db

# Test connection
docker compose exec db psql -U admin -d enroll23 -c "SELECT 1;"
```

### Out of Disk Space
```bash
# Clean up unused images
docker system prune -a

# Remove old volumes (WARNING: deletes data)
docker volume prune
```

### Update Fails
```bash
# Stop containers
docker compose down

# Pull latest images
docker compose pull

# Start with fresh containers
docker compose up -d
```

## Security Considerations

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Use strong passwords** - Especially for database and admin
3. **Keep Docker updated** - Regular security updates
4. **Limit network exposure** - Only expose necessary ports
5. **Regular backups** - Automated database backups
6. **Monitor logs** - Watch for suspicious activity
7. **Update regularly** - Pull latest images for security patches

## Scaling (Future)

For high-traffic scenarios:

1. **Load Balancer**: Add nginx/traefik in front
2. **Multiple Backend Instances**: Scale backend service
3. **Database Replication**: Master-slave setup
4. **CDN**: For static frontend assets
5. **Caching**: Redis for session management

## Support

For issues or questions:
1. Check logs: `docker compose logs`
2. Review this guide
3. Check GitHub Issues
4. Contact development team
