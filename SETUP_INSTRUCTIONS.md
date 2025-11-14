# Setup Instructions

## Prerequisites
- Install Docker Desktop: https://www.docker.com/products/docker-desktop
- Make sure Docker is running

## Steps

1. **Create a folder** (e.g., `enroll23-app`)

2. **Put `docker-compose.prod.yml` file in that folder**

3. **Create `.env` file in the same folder** with this content:
```env
DB_USER=admin
DB_PASSWORD=your-database-password #choose anything, not predefined 
DB_NAME=enroll23
ADMIN_EMAIL=your-email@company.com
ADMIN_PASSWORD=your-login-password
SECRET_KEY=your-random-secret-key
```

4. **Generate SECRET_KEY** (choose one):
   - Option 1: Run this command: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
   - Option 2: Use any random string (at least 32 characters)

5. **Open terminal in that folder and run:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

6. **Access application:** http://localhost:3000
   - Login with your `ADMIN_EMAIL` and `ADMIN_PASSWORD`

## Commands

**Start:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

**Stop:**
```bash
docker compose -f docker-compose.prod.yml down
```

**Update:**
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

