#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# OWSC Azure Deployment Script
# Deploys the full stack to Azure Container Registry + Azure App Service
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Docker Desktop running
#   - .env file created from .env.production template
#
# Usage:
#   chmod +x azure-deploy.sh
#   ./azure-deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Exit immediately on any error

# ── CONFIGURATION — edit these ────────────────────────────────────────────────
RESOURCE_GROUP="owsc-rg"
LOCATION="eastasia"                    # Closest Azure region to Sri Lanka
ACR_NAME="owscregistry"                # Must be globally unique, lowercase, no hyphens
APP_SERVICE_PLAN="owsc-plan"
APP_NAME="owsc-app"                    # Your app URL: owsc-app.azurewebsites.net
POSTGRES_SERVER="owsc-postgres"
POSTGRES_ADMIN="owscadmin"
POSTGRES_PASSWORD="$(openssl rand -base64 32)"   # Auto-generated strong password
DB_NAME="rms_db"
# ─────────────────────────────────────────────────────────────────────────────

echo "🚀 Starting OWSC Azure deployment..."
echo "   Resource Group : $RESOURCE_GROUP"
echo "   Location       : $LOCATION"
echo "   ACR            : $ACR_NAME"
echo "   App Name       : $APP_NAME"
echo ""

# ── Step 1: Create Resource Group ────────────────────────────────────────────
echo "📦 Step 1/8 — Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none
echo "   ✓ Resource group created"

# ── Step 2: Create Azure Container Registry ───────────────────────────────────
echo "🗄️  Step 2/8 — Creating Azure Container Registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none
echo "   ✓ ACR created: $ACR_NAME.azurecr.io"

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query "username" -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

# ── Step 3: Build and push Docker images ──────────────────────────────────────
echo "🐳 Step 3/8 — Building and pushing Docker images..."

# Login to ACR
echo "$ACR_PASSWORD" | docker login "$ACR_NAME.azurecr.io" \
  --username "$ACR_USERNAME" \
  --password-stdin

# Build and push backend
echo "   Building backend..."
docker build -t "$ACR_NAME.azurecr.io/owsc-backend:latest" ./backend
docker push "$ACR_NAME.azurecr.io/owsc-backend:latest"
echo "   ✓ Backend image pushed"

# Build and push frontend
echo "   Building frontend..."
docker build -t "$ACR_NAME.azurecr.io/owsc-frontend:latest" ./Frontend
docker push "$ACR_NAME.azurecr.io/owsc-frontend:latest"
echo "   ✓ Frontend image pushed"

# ── Step 4: Create Azure Database for PostgreSQL ──────────────────────────────
echo "🗃️  Step 4/8 — Creating Azure PostgreSQL Flexible Server..."
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$POSTGRES_SERVER" \
  --location "$LOCATION" \
  --admin-user "$POSTGRES_ADMIN" \
  --admin-password "$POSTGRES_PASSWORD" \
  --sku-name "Standard_B1ms" \
  --tier "Burstable" \
  --storage-size 32 \
  --version 15 \
  --public-access "0.0.0.0" \
  --output none

# Create the database
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$POSTGRES_SERVER" \
  --database-name "$DB_NAME" \
  --output none

DATABASE_URL="postgresql://$POSTGRES_ADMIN:$POSTGRES_PASSWORD@$POSTGRES_SERVER.postgres.database.azure.com:5432/$DB_NAME?sslmode=require"
echo "   ✓ PostgreSQL server created"

# ── Step 5: Create App Service Plan ───────────────────────────────────────────
echo "⚙️  Step 5/8 — Creating App Service Plan (B2 — 2 vCPU, 3.5GB RAM)..."
az appservice plan create \
  --name "$APP_SERVICE_PLAN" \
  --resource-group "$RESOURCE_GROUP" \
  --is-linux \
  --sku B2 \
  --output none
echo "   ✓ App Service Plan created"

# ── Step 6: Create Web App (multi-container via docker-compose) ───────────────
echo "🌐 Step 6/8 — Creating Web App..."

# Create a production docker-compose for Azure (no local postgres — uses Azure DB)
cat > /tmp/azure-compose.yml << EOF
version: '3.8'
services:
  backend:
    image: $ACR_NAME.azurecr.io/owsc-backend:latest
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: "$DATABASE_URL"
      JWT_SECRET: "\${JWT_SECRET}"
      JWT_EXPIRES_IN: "7d"
      BASE_URL: "https://$APP_NAME.azurewebsites.net"
      FRONTEND_URL: "https://$APP_NAME.azurewebsites.net"
      EMAIL_USER: "\${EMAIL_USER}"
      EMAIL_PASS: "\${EMAIL_PASS}"
      CLOUDINARY_CLOUD_NAME: "\${CLOUDINARY_CLOUD_NAME}"
      CLOUDINARY_API_KEY: "\${CLOUDINARY_API_KEY}"
      CLOUDINARY_API_SECRET: "\${CLOUDINARY_API_SECRET}"

  frontend:
    image: $ACR_NAME.azurecr.io/owsc-frontend:latest
    ports:
      - "80:80"
    depends_on:
      - backend
EOF

az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_SERVICE_PLAN" \
  --name "$APP_NAME" \
  --multicontainer-config-type compose \
  --multicontainer-config-file /tmp/azure-compose.yml \
  --output none
echo "   ✓ Web App created: https://$APP_NAME.azurewebsites.net"

# ── Step 7: Configure App Settings (secrets) ─────────────────────────────────
echo "🔐 Step 7/8 — Configuring app settings..."

# Load secrets from local .env if it exists
if [ -f ".env" ]; then
  source .env
fi

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --settings \
    JWT_SECRET="${JWT_SECRET:-CHANGE_ME}" \
    EMAIL_USER="${EMAIL_USER:-}" \
    EMAIL_PASS="${EMAIL_PASS:-}" \
    CLOUDINARY_CLOUD_NAME="${CLOUDINARY_CLOUD_NAME:-}" \
    CLOUDINARY_API_KEY="${CLOUDINARY_API_KEY:-}" \
    CLOUDINARY_API_SECRET="${CLOUDINARY_API_SECRET:-}" \
    DOCKER_REGISTRY_SERVER_URL="https://$ACR_NAME.azurecr.io" \
    DOCKER_REGISTRY_SERVER_USERNAME="$ACR_USERNAME" \
    DOCKER_REGISTRY_SERVER_PASSWORD="$ACR_PASSWORD" \
  --output none
echo "   ✓ App settings configured"

# ── Step 8: Enable logging ────────────────────────────────────────────────────
echo "📋 Step 8/8 — Enabling application logging..."
az webapp log config \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --docker-container-logging filesystem \
  --output none
echo "   ✓ Logging enabled"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅  DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "   🌐 App URL     : https://$APP_NAME.azurewebsites.net"
echo "   🗃️  Database    : $POSTGRES_SERVER.postgres.database.azure.com"
echo "   🐳 Registry    : $ACR_NAME.azurecr.io"
echo ""
echo "   ⚠️  SAVE THESE CREDENTIALS:"
echo "   DB Admin       : $POSTGRES_ADMIN"
echo "   DB Password    : $POSTGRES_PASSWORD"
echo "   DB URL         : $DATABASE_URL"
echo ""
echo "   📋 Next steps:"
echo "   1. Update JWT_SECRET in Azure App Settings (Portal → App Service → Configuration)"
echo "   2. Add your Gmail App Password and Cloudinary keys"
echo "   3. Visit https://$APP_NAME.azurewebsites.net to verify"
echo "   4. Stream logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "═══════════════════════════════════════════════════════════════"
