# ==============================================================================
# Deploy LokDarpan Backend to Azure Container Apps (PowerShell)
# ==============================================================================
param (
    [string]$ResourceGroup = "lokdarpan-rg",
    [string]$Location = "centralindia",
    [string]$EnvironmentName = "lokdarpan-env",
    [string]$AppName = "lokdarpan-api",
    [string]$ContainerImage = "ghcr.io/rajbhoyar729/lokdarpan-backend:latest",
    [int]$TargetPort = 5000
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying LokDarpan Backend to Azure Container Apps..." -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup"
Write-Host "Location:       $Location"
Write-Host "App Name:       $AppName"
Write-Host "Image:          $ContainerImage"

# 1. Create Resource Group if not exists
az group create --name $ResourceGroup --location $Location --output none

# 2. Create Container Apps Managed Environment if not exists
$envExists = az containerapp env show --name $EnvironmentName --resource-group $ResourceGroup 2>$null
if (-not $envExists) {
    Write-Host "📦 Creating Container Apps Environment: $EnvironmentName..." -ForegroundColor Yellow
    az containerapp env create `
        --name $EnvironmentName `
        --resource-group $ResourceGroup `
        --location $Location `
        --output none
}

# 3. Create or Update Container App
Write-Host "🚀 Creating / Updating Container App: $AppName..." -ForegroundColor Yellow
az containerapp create `
    --name $AppName `
    --resource-group $ResourceGroup `
    --environment $EnvironmentName `
    --image $ContainerImage `
    --target-port $TargetPort `
    --ingress external `
    --cpu 0.25 `
    --memory 0.5Gi `
    --min-replicas 0 `
    --max-replicas 2 `
    --output none

# 4. Retrieve FQDN
$AppFqdn = az containerapp show --name $AppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "✅ LokDarpan API successfully deployed to Azure Container Apps!" -ForegroundColor Green
Write-Host "🌐 API URL: https://$AppFqdn" -ForegroundColor Green
Write-Host "🔍 Health check: https://$AppFqdn/health" -ForegroundColor Green
Write-Host "👉 Add this URL as 'API_URL' and 'VITE_API_URL' in your Vercel project settings." -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Green
