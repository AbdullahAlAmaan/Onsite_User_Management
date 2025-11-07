# Deployment Guide

## Azure App Service Deployment

### Prerequisites
- Azure account with App Service and PostgreSQL database
- Azure Blob Storage account
- Azure AD app registration
- Docker Hub or Azure Container Registry

### Backend Deployment

1. **Build and push Docker image:**
```bash
cd backend
docker build -t enrollment-backend:latest .
docker tag enrollment-backend:latest <your-registry>/enrollment-backend:latest
docker push <your-registry>/enrollment-backend:latest
```

2. **Create Azure App Service:**
```bash
az webapp create \
  --resource-group <resource-group> \
  --plan <app-service-plan> \
  --name <app-name> \
  --deployment-container-image-name <your-registry>/enrollment-backend:latest
```

3. **Configure Environment Variables:**
```bash
az webapp config appsettings set \
  --resource-group <resource-group> \
  --name <app-name> \
  --settings \
    DATABASE_URL="postgresql://user:pass@host:5432/db" \
    AZURE_CLIENT_ID="<client-id>" \
    AZURE_CLIENT_SECRET="<client-secret>" \
    AZURE_TENANT_ID="<tenant-id>" \
    SECRET_KEY="<secret-key>" \
    AZURE_STORAGE_CONNECTION_STRING="<connection-string>"
```

4. **Run Database Migrations:**
```bash
az webapp ssh --resource-group <resource-group> --name <app-name>
alembic upgrade head
```

### Frontend Deployment

1. **Build React app:**
```bash
cd frontend
npm run build
```

2. **Deploy to Azure Static Web Apps or App Service:**
```bash
# Option 1: Azure Static Web Apps
az staticwebapp create \
  --name <app-name> \
  --resource-group <resource-group> \
  --source ./frontend \
  --location <location> \
  --branch main \
  --app-location frontend \
  --output-location build

# Option 2: Deploy build folder to App Service
az webapp deploy \
  --resource-group <resource-group> \
  --name <app-name> \
  --src-path ./frontend/build \
  --type static
```

### Database Setup

1. **Create Azure Database for PostgreSQL:**
```bash
az postgres flexible-server create \
  --resource-group <resource-group> \
  --name <server-name> \
  --location <location> \
  --admin-user <admin> \
  --admin-password <password> \
  --sku-name Standard_B1ms \
  --version 15
```

2. **Run migrations:**
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" alembic upgrade head
```

### Azure Blob Storage Setup

1. **Create storage account:**
```bash
az storage account create \
  --name <storage-account> \
  --resource-group <resource-group> \
  --location <location> \
  --sku Standard_LRS
```

2. **Create container:**
```bash
az storage container create \
  --name enrollment-uploads \
  --account-name <storage-account> \
  --auth-mode login
```

3. **Get connection string:**
```bash
az storage account show-connection-string \
  --name <storage-account> \
  --resource-group <resource-group>
```

## Environment Configuration

### Production Environment Variables

**Backend:**
- `DATABASE_URL`: PostgreSQL connection string
- `AZURE_CLIENT_ID`: Azure AD app client ID
- `AZURE_CLIENT_SECRET`: Azure AD app client secret
- `AZURE_TENANT_ID`: Azure AD tenant ID
- `SECRET_KEY`: Strong random secret key
- `AZURE_STORAGE_CONNECTION_STRING`: Blob storage connection string
- `CORS_ORIGINS`: Frontend URL(s)
- `ENVIRONMENT`: production
- `DEBUG`: false

**Frontend:**
- `REACT_APP_API_URL`: Backend API URL

## Monitoring & Logging

1. **Enable Application Insights:**
```bash
az monitor app-insights component create \
  --app <app-name> \
  --location <location> \
  --resource-group <resource-group>
```

2. **Configure logging:**
- Application logs: Enabled
- Web server logs: Enabled
- Detailed error messages: Enabled (dev only)

## Security Checklist

- [ ] Use managed identity for Azure services
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Use Azure Key Vault for secrets
- [ ] Enable firewall rules for database
- [ ] Regular security updates
- [ ] Enable Azure AD authentication
- [ ] Configure RBAC roles

## Scaling

### Horizontal Scaling
```bash
az appservice plan update \
  --name <plan-name> \
  --resource-group <resource-group> \
  --number-of-workers 3
```

### Auto-scaling
Configure in Azure Portal:
- Scale out: CPU > 70% for 5 minutes
- Scale in: CPU < 30% for 10 minutes
- Min instances: 1
- Max instances: 10

## Backup Strategy

1. **Database Backups:**
   - Automated daily backups (Azure PostgreSQL)
   - Retention: 35 days
   - Point-in-time restore enabled

2. **Application Backups:**
   - Blob storage versioning enabled
   - Weekly full backups

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   - Check firewall rules
   - Verify connection string
   - Check SSL requirements

2. **File Upload Failures:**
   - Verify Azure Blob Storage connection string
   - Check container permissions
   - Verify file size limits

3. **Authentication Issues:**
   - Verify Azure AD configuration
   - Check redirect URIs
   - Verify client secret expiration

