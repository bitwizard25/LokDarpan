# LokDarpan Backend CI/CD Pipeline

This directory contains the GitHub Actions automated CI/CD pipeline for the LokDarpan backend.

## Workflow File: [`backend-ci-cd.yml`](./backend-ci-cd.yml)

### 1. Trigger Conditions
- **Push events**: Commits pushed to `main`, `master`, or `design-port` that touch `server/**`, `docker/**`, `azure/**`, `Dockerfile`, or `docker-compose.yml`.
- **Pull Requests**: Pull requests targeting `main`, `master`, or `design-port`.
- **Manual Trigger**: Can be run on-demand via the **Run workflow** button in GitHub Actions.

---

### 2. Pipeline Stages

```mermaid
flowchart TD
    A[Push / PR] --> B[Stage 1: test - 80/80 Unit & Integration Tests]
    B --> C[Stage 2: docker-build - Build & Push to ghcr.io]
    C --> D1[Stage 3: deploy-azure-container-app - Zero-downtime rolling update]
    B --> D2[Stage 4: deploy-azure-functions - Deploy scheduled cron jobs]
    C --> D3[Stage 5: deploy-ec2 - Optional SSH fallback]
```

#### 🧪 Stage 1: `test` (Continuous Integration)
- Runs on `ubuntu-latest` with Node.js 20.x.
- Leverages npm dependency caching (`server/package-lock.json`).
- Executes the full backend test suite (`node --test tests/*.test.js`, 80/80 tests).
- Runs high-severity security dependency checks (`npm audit`).

#### 🐳 Stage 2: `docker-build` (Container Verification & Registry Push)
- Uses Docker Buildx with GitHub Actions layer caching (`type=gha`).
- Validates that the [`Dockerfile`](../../Dockerfile) builds correctly.
- Tags and pushes the production image to GitHub Container Registry (`ghcr.io`).

#### ☁️ Stage 3: `deploy-azure-container-app` (Azure Container Apps Deployment)
- Runs when `AZURE_CREDENTIALS` and `AZURE_CONTAINER_APP_NAME` are configured.
- Authenticates via `azure/login@v2`.
- Updates the Azure Container App image directly using `az containerapp update`.
- Verifies post-deployment container health via `GET /health`.

#### ⚡ Stage 4: `deploy-azure-functions` (Azure Functions Cron Deployment)
- Runs when `AZURE_FUNCTIONAPP_NAME` and `AZURE_CREDENTIALS` (or publish profile) are configured.
- Packages and deploys [`azure/azure-functions/`](../../azure/azure-functions) timer triggers for recommendation stats and transcode reconciliation.

#### 🖥️ Stage 5: `deploy-ec2` (Optional AWS EC2 VM Fallback)
- Connects via SSH to an EC2 instance if `EC2_HOST` and `EC2_SSH_KEY` are provided.

---

### 3. Required GitHub Repository Secrets

Configure in **GitHub Repo → Settings → Secrets and variables → Actions**:

#### For Azure (Container Apps & Functions):
| Secret Name | Description | Example |
|---|---|---|
| `AZURE_CREDENTIALS` | Service Principal JSON credentials | `{"clientId": "...", "clientSecret": "...", "subscriptionId": "...", "tenantId": "..."}` |
| `AZURE_CONTAINER_APP_NAME` | Name of your Azure Container App | `lokdarpan-api` |
| `AZURE_RESOURCE_GROUP` | Azure Resource Group name | `lokdarpan-rg` |
| `AZURE_CONTAINER_APP_FQDN` *(Optional)* | Ingress domain for health check | `lokdarpan-api.centralindia.azurecontainerapps.io` |
| `AZURE_FUNCTIONAPP_NAME` *(Optional)* | Name of the Azure Function App | `lokdarpan-cron` |

#### For EC2 (Optional VM Fallback):
| Secret Name | Description | Example |
|---|---|---|
| `EC2_HOST` | Public IP / DNS of EC2 instance | `13.232.xxx.xxx` |
| `EC2_USER` | SSH user | `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key | `-----BEGIN RSA PRIVATE KEY----- ...` |

> [!NOTE]
> If any secret group is omitted, the workflow gracefully skips that specific deployment job without failing the pipeline.
