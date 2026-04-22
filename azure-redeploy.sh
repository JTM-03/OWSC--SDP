#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# OWSC Quick Re-deploy Script
# Use this after code changes to push updated images and restart the app.
# ─────────────────────────────────────────────────────────────────────────────

set -e

ACR_NAME="owscregistry"
RESOURCE_GROUP="owsc-rg"
APP_NAME="owsc-app"

echo "🔄 Re-deploying OWSC..."

# Login to ACR
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)
echo "$ACR_PASSWORD" | docker login "$ACR_NAME.azurecr.io" \
  --username "$(az acr credential show --name "$ACR_NAME" --query "username" -o tsv)" \
  --password-stdin

# Rebuild and push
echo "🐳 Building and pushing images..."
docker build -t "$ACR_NAME.azurecr.io/owsc-backend:latest" ./backend
docker push "$ACR_NAME.azurecr.io/owsc-backend:latest"

docker build -t "$ACR_NAME.azurecr.io/owsc-frontend:latest" ./Frontend
docker push "$ACR_NAME.azurecr.io/owsc-frontend:latest"

# Restart the app to pull new images
echo "♻️  Restarting App Service..."
az webapp restart \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP"

echo "✅ Re-deploy complete — https://$APP_NAME.azurewebsites.net"
