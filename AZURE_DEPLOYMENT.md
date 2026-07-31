# Azure Deployment Guide

## Prerequisites
- Azure account with active subscription
- Azure CLI installed: `az --version`
- Docker installed (for local testing)

## Option 1: Single Container (Azure App Service)

### 1. Login to Azure
```bash
az login
```

### 2. Create Resource Group
```bash
az group create --name owsc-rg --location eastus
```

### 3. Create PostgreSQL Database
```bash
az postgres flexible-server create \
  --resource-group owsc-rg \
  --name owsc-db \
  --location eastus \
  --admin-user owscadmin \
  --admin-password <SECURE_PASSWORD> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --storage-size 32
```

### 4. Create Database
```bash
az postgres flexible-server db create \
  --resource-group owsc-rg \
  --server-name owsc-db \
  --database-name rms_db
```

### 5. Allow Azure Services
```bash
az postgres flexible-server firewall-rule create \
  --resource-group owsc-rg \
  --name owsc-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 6. Create App Service Plan
```bash
az appservice plan create \
  --name owsc-plan \
  --resource-group owsc-rg \
  --sku B1 \
  --is-linux
```

### 7. Create Web App with Docker
```bash
az webapp create \
  --resource-group owsc-rg \
  --plan owsc-plan \
  --name owsc-club \
  --deployment-container-image-name nginx
```

### 8. Enable Container Logging
```bash
az webapp log config \
  --name owsc-club \
  --resource-group owsc-rg \
  --docker-container-logging filesystem
```

### 9. Configure Environment Variables
```bash
az webapp config appsettings set \
  --resource-group owsc-rg \
  --name owsc-club \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DATABASE_URL="postgresql://owscadmin:<PASSWORD>@owsc-db.postgres.database.azure.com:5432/rms_db?schema=public&sslmode=require" \
    JWT_SECRET="<GENERATE_SECURE_KEY>" \
    JWT_EXPIRES_IN="7d" \
    BASE_URL="https://owsc-club.azurewebsites.net" \
    FRONTEND_URL="https://owsc-club.azurewebsites.net" \
    BREVO_API_KEY="<YOUR_BREVO_KEY>" \
    CLOUDINARY_CLOUD_NAME="<YOUR_CLOUD_NAME>" \
    CLOUDINARY_API_KEY="<YOUR_API_KEY>" \
    CLOUDINARY_API_SECRET="<YOUR_API_SECRET>" \
    WEBSITES_PORT=8080
```

### 10. Deploy from GitHub
**Option A: Azure Portal**
1. Go to Azure Portal → App Services → owsc-club
2. Deployment Center → GitHub → Authorize
3. Select repository: `JTM-03/OWSC--SDP`
4. Branch: `main`
5. Dockerfile path: `/Dockerfile`
6. Save

**Option B: GitHub Actions (Manual)**
```bash
# Generate deployment credentials
az webapp deployment list-publishing-credentials \
  --name owsc-club \
  --resource-group owsc-rg \
  --query publishingPassword -o tsv
```

Add these secrets to your GitHub repo (Settings → Secrets):
- `AZURE_WEBAPP_NAME`: `owsc-club`
- `AZURE_WEBAPP_PUBLISH_PROFILE`: (download from Azure Portal)

Create `.github/workflows/azure-deploy.yml`:
```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Build and push Docker image
        run: |
          docker build -t owsc-club:${{ github.sha }} .
          docker tag owsc-club:${{ github.sha }} owsc-club:latest
      
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'owsc-club'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          images: 'owsc-club:latest'
```

### 11. View Logs
```bash
az webapp log tail --name owsc-club --resource-group owsc-rg
```

### 12. Access Your App
```
https://owsc-club.azurewebsites.net
```

---

## Option 2: Azure Container Instances (docker-compose)

### 1. Create Azure Container Registry
```bash
az acr create \
  --resource-group owsc-rg \
  --name owsccr \
  --sku Basic
```

### 2. Login to ACR
```bash
az acr login --name owsccr
```

### 3. Build and Push Images
```bash
# Build frontend
docker build -t owsccr.azurecr.io/frontend:latest ./Frontend
docker push owsccr.azurecr.io/frontend:latest

# Build backend
docker build -t owsccr.azurecr.io/backend:latest ./backend
docker push owsccr.azurecr.io/backend:latest
```

### 4. Create Azure Container Instance
```bash
az container create \
  --resource-group owsc-rg \
  --name owsc-app \
  --image owsccr.azurecr.io/frontend:latest \
  --dns-name-label owsc-club \
  --ports 80 443
```

---

## Local Testing (Docker)

### Test the root Dockerfile locally:
```bash
docker build -t owsc-test .
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="test-secret" \
  owsc-test
```

### Or use docker-compose (recommended for development):
```bash
docker-compose up --build
```

Access at: `http://localhost:80`

---

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `8080` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Auth secret | Generate 32+ char random string |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `BASE_URL` | Backend URL | `https://owsc-club.azurewebsites.net` |
| `FRONTEND_URL` | CORS origin | `https://owsc-club.azurewebsites.net` |
| `BREVO_API_KEY` | Email service | Get from Brevo dashboard |
| `CLOUDINARY_CLOUD_NAME` | Image storage | Get from Cloudinary |
| `CLOUDINARY_API_KEY` | Cloudinary key | Get from Cloudinary |
| `CLOUDINARY_API_SECRET` | Cloudinary secret | Get from Cloudinary |
| `WEBSITES_PORT` | Azure port override | `8080` |

---

## Troubleshooting

### 1. Container fails to start
```bash
# View logs
az webapp log tail --name owsc-club --resource-group owsc-rg

# Check container logs
az webapp log download --name owsc-club --resource-group owsc-rg
```

### 2. Database connection fails
- Verify firewall rules allow Azure services
- Check DATABASE_URL format includes `?sslmode=require`
- Test connection: `psql $DATABASE_URL`

### 3. Port issues
- Ensure `WEBSITES_PORT=8080` is set in App Settings
- Verify Dockerfile `EXPOSE 8080` matches server port

### 4. Environment variables not loading
- Check App Settings in Azure Portal
- Restart the app: `az webapp restart --name owsc-club --resource-group owsc-rg`

---

## Cost Optimization

**Free Tier Options:**
- Azure App Service: F1 (free tier, 60 min/day runtime)
- Azure Database for PostgreSQL: Single Server Basic tier (~$25/month)

**Production Recommendations:**
- App Service: B1 (~$13/month)
- PostgreSQL: Flexible Server Burstable B1ms (~$15/month)
- Total: ~$30/month

**Enable autoscaling:**
```bash
az monitor autoscale create \
  --resource-group owsc-rg \
  --resource owsc-club \
  --resource-type Microsoft.Web/sites \
  --name autoscale-owsc \
  --min-count 1 \
  --max-count 3 \
  --count 1
```

---

## Security Checklist

- [ ] Use Azure Key Vault for secrets
- [ ] Enable HTTPS only (done by default on App Service)
- [ ] Configure custom domain + SSL certificate
- [ ] Set up Azure Application Insights for monitoring
- [ ] Enable Azure DDoS protection
- [ ] Configure database backups
- [ ] Set up alerts for errors and high CPU usage

---

## Next Steps

1. Set up custom domain: `www.owsc-club.com`
2. Configure SSL certificate (free via Azure)
3. Enable Application Insights for monitoring
4. Set up CI/CD pipeline with GitHub Actions
5. Configure database backups and disaster recovery
6. Add Azure CDN for static assets
