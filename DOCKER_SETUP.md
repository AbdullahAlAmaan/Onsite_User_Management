# Docker Setup Guide for Enroll23

This guide explains how to run the entire Enroll23 application using Docker and Docker Compose.

## Prerequisites

- Docker Desktop installed (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- No need to install Python, Node.js, or PostgreSQL separately

## Quick Start

1. **Clone the repository** (if you haven't already):
```bash
git clone <repository-url>
cd Onsite_User_Management
```

2. **Create `.env` file** from the example:
```bash
cp .env.example .env
```

3. **Edit `.env` file** with your configuration:
```env
# Database Configuration
DB_USER=admin
DB_PASSWORD=mysecretpassword
DB_NAME=enroll23

# Security (IMPORTANT: Change these in production!)
SECRET_KEY=your-secret-key-change-in-production-use-a-strong-random-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

4. **Build and start all services**:
```bash
docker compose up --build
```

That's it! The entire application will be running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: PostgreSQL on port 5432

## What Happens When You Run `docker compose up`

1. **PostgreSQL Database** starts first
2. **Backend** builds and starts:
   - Runs database migrations automatically
   - Starts FastAPI server on port 8000
3. **Frontend** builds and starts:
   - Builds React application
   - Serves static files on port 3000

## Stopping the Application

Press `Ctrl+C` in the terminal, or run:
```bash
docker compose down
```

To also remove volumes (deletes database data):
```bash
docker compose down -v
```

## Viewing Logs

View logs from all services:
```bash
docker compose logs -f
```

View logs from a specific service:
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

## Rebuilding After Code Changes

If you make changes to the code:
```bash
docker compose up --build
```

Or rebuild a specific service:
```bash
docker compose build backend
docker compose up -d backend
```

## Accessing the Database

To connect to the PostgreSQL database directly:
```bash
docker compose exec db psql -U admin -d enroll23
```

Or from outside Docker:
```bash
psql -h localhost -p 5432 -U admin -d enroll23
```

## Environment Variables

All environment variables are loaded from the `.env` file in the project root. Key variables:

- `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Database credentials
- `SECRET_KEY`: JWT secret key (change in production!)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Admin login credentials
- `CORS_ORIGINS`: Allowed frontend origins

## Production Deployment & Updates

### Initial Setup (First Time)

1. **Set up GitHub Secrets** (for CI/CD):
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add `DOCKER_USERNAME`: Your Docker Hub username
   - Add `DOCKER_PASSWORD`: Your Docker Hub access token (not your password)

2. **Update `.env` file** with production values:
   - Use strong `SECRET_KEY`
   - Use secure `DB_PASSWORD`
   - Set `ENVIRONMENT=production`
   - Set `DEBUG=False`
   - Update `CORS_ORIGINS` to your production domain

3. **Update `docker-compose.prod.yml`**:
   - Replace `yourdockerhub` with your actual Docker Hub username in both image references

4. **Deploy to server**:
```bash
# Copy docker-compose.prod.yml and .env to server
docker compose -f docker-compose.prod.yml up -d
```

### How Updates Work (CI/CD Workflow)

**⭐ The Update Process:**

1. **Developer pushes code** to `main` branch
2. **GitHub Actions automatically:**
   - Builds new Docker images
   - Pushes images to Docker Hub with `latest` tag
3. **Admin updates the app** with one command:
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

That's it! The app updates instantly.

### Setting Up CI/CD (One-Time Setup)

The CI/CD workflow is already configured in `.github/workflows/docker-build.yml`. You just need to:

1. **Create Docker Hub account** (if you don't have one): https://hub.docker.com

2. **Create Docker Hub access token**:
   - Go to Docker Hub → Account Settings → Security
   - Click "New Access Token"
   - Name it (e.g., "github-actions")
   - Copy the token

3. **Add GitHub Secrets**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add `DOCKER_USERNAME` = your Docker Hub username
   - Add `DOCKER_PASSWORD` = your Docker Hub access token

4. **Push to main branch** - CI/CD will automatically build and push images!

### Manual Image Building (Alternative)

If you prefer to build and push images manually:

```bash
# Build and tag images
docker build -t yourdockerhub/enroll23-backend:latest ./backend
docker build -t yourdockerhub/enroll23-frontend:latest ./frontend

# Login to Docker Hub
docker login

# Push images
docker push yourdockerhub/enroll23-backend:latest
docker push yourdockerhub/enroll23-frontend:latest
```

### Admin Update Instructions

**For admins deploying the application:**

**Initial Setup:**
```bash
# 1. Clone or download the repository
git clone <repository-url>
cd Onsite_User_Management

# 2. Create .env file
cp .env.example .env
# Edit .env with your configuration

# 3. Update docker-compose.prod.yml with correct Docker Hub username

# 4. Start the application
docker compose -f docker-compose.prod.yml up -d
```

**To Update to Latest Version:**
```bash
# Pull latest images and restart
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

**To Check Current Version:**
```bash
# View running containers and their images
docker compose -f docker-compose.prod.yml ps
```

### Version Tags (Optional)

If you want to use version tags instead of `latest`:

1. **Update CI/CD workflow** to tag with version numbers
2. **Update `docker-compose.prod.yml`** to use specific version:
```yaml
image: yourdockerhub/enroll23-backend:v1.4
```

3. **Admin can update to specific version**:
```bash
# Update docker-compose.prod.yml to v1.4
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Port Already in Use
If ports 3000, 8000, or 5432 are already in use, update `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change host port
```

### Database Connection Issues
Ensure the database is healthy before backend starts. The healthcheck should handle this automatically.

### Frontend Can't Connect to Backend
Check that `REACT_APP_API_URL` in `docker-compose.yml` matches your backend URL. For production, update this to your backend domain.

### Migrations Not Running
Migrations run automatically on backend startup. Check backend logs:
```bash
docker compose logs backend
```

### Upload Directory Permissions
The `uploads` directory is mounted as a volume. Ensure it has proper permissions:
```bash
chmod 755 backend/uploads
```

## File Structure

```
Onsite_User_Management/
├── docker-compose.yml          # Docker Compose for local development (builds locally)
├── docker-compose.prod.yml     # Docker Compose for production (uses pre-built images)
├── .env.example                # Environment variables template
├── .env                        # Your environment variables (create from .env.example)
├── .github/
│   └── workflows/
│       └── docker-build.yml    # CI/CD workflow for automatic image builds
├── backend/
│   ├── Dockerfile              # Backend container definition
│   └── .dockerignore           # Files to exclude from build
└── frontend/
    ├── Dockerfile              # Frontend container definition
    └── .dockerignore           # Files to exclude from build
```

## Additional Commands

### Restart a specific service:
```bash
docker compose restart backend
```

### Stop all services:
```bash
docker compose stop
```

### Remove all containers and volumes:
```bash
docker compose down -v
```

### View running containers:
```bash
docker compose ps
```

### Execute commands in a container:
```bash
docker compose exec backend bash
docker compose exec db psql -U admin -d enroll23
```

