#!/usr/bin/env bash
# ==============================================================================
# Deploy LokDarpan Backend to Azure Container Apps (Free Tier Friendly)
# ==============================================================================
set -euo pipefail

# Configuration Defaults
RESOURCE_GROUP="${RESOURCE_GROUP:-lokdarpan-rg}"
LOCATION="${LOCATION:-centralindia}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-lokdarpan-env}"
APP_NAME="${APP_NAME:-lokdarpan-api}"
CONTAINER_IMAGE="${CONTAINER_IMAGE:-ghcr.io/rajbhoyar729/lokdarpan-backend:latest}"
TARGET_PORT=5000

echo "🚀 Deploying LokDarpan Backend to Azure Container Apps..."
echo "Resource Group: $RESOURCE_GROUP"
echo "Location:       $LOCATION"
echo "App Name:       $APP_NAME"
echo "Image:          $CONTAINER_IMAGE"

# 1. Create Resource Group if not exists
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

# 2. Create Container Apps Managed Environment if not exists
if ! az containerapp env show --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "📦 Creating Container Apps Environment: $ENVIRONMENT_NAME..."
  az containerapp env create \
    --name "$ENVIRONMENT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output none
fi

# 3. Create or Update Container App
# (Uses 0.25 vCPU, 0.5 GiB memory, min-replicas 0 to stay within free tier)
echo "🚀 Creating / Updating Container App: $APP_NAME..."
az containerapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_NAME" \
  --image "$CONTAINER_IMAGE" \
  --target-port "$TARGET_PORT" \
  --ingress external \
  --cpu 0.25 \
  --memory 0.5Gi \
  --min-replicas 0 \
  --max-replicas 2 \
  --output none

# 4. Retrieve FQDN
APP_URL=$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv)

echo "=============================================================================="
echo "✅ LokDarpan API successfully deployed to Azure Container Apps!"
echo "🌐 API URL: https://$APP_URL"
echo "🔍 Health check: https://$APP_URL/health"
echo "👉 Add this URL as 'API_URL' and 'VITE_API_URL' in your Vercel project settings."
echo "=============================================================================="
