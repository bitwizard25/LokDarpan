# LokDarpan Backend CI/CD Pipeline

This directory contains the GitHub Actions automated CI/CD pipeline for the LokDarpan backend.

## Workflow File: [`backend-ci-cd.yml`](./backend-ci-cd.yml)

### 1. Trigger Conditions
- **Push events**: Commits pushed to `main`, `master`, or `design-port` that touch `server/**`, `docker/**`, `Dockerfile`, or `docker-compose.yml`.
- **Pull Requests**: Pull requests targeting `main`, `master`, or `design-port`.
- **Manual Trigger**: Can be run on-demand via the **Run workflow** button in GitHub Actions.

---

### 2. Pipeline Stages

#### 🧪 Stage 1: `test` (Continuous Integration)
- Runs on `ubuntu-latest` with Node.js 20.x.
- Leverages npm dependency caching (`server/package-lock.json`).
- Executes the full backend test suite (`node --test tests/*.test.js`, 80/80 tests).
- Runs high-severity security dependency checks (`npm audit`).

#### 🐳 Stage 2: `docker-build` (Container Verification & Registry Push)
- Uses Docker Buildx with GitHub Actions layer caching (`type=gha`).
- Validates that the [`Dockerfile`](../../Dockerfile) builds correctly with:
  - Node 20 runtime
  - BullMQ transcode worker
  - BullMQ recommendation stats worker
  - Redis server
  - FFmpeg & supervisord
- On `push`, tags and pushes the production image to GitHub Container Registry (`ghcr.io`).

#### 🚀 Stage 3: `deploy` (Continuous Deployment to EC2)
- Runs only on pushes to production branches when tests and Docker build pass.
- Connects to your AWS EC2 instance via SSH.
- Updates code, restarts container via `docker compose up -d --build`, and removes dangling images.
- Performs an automated health check probing `GET http://<EC2_HOST>:5000/health` up to 60s until status 200 OK is returned.

---

### 3. Required GitHub Repository Secrets

To enable automated EC2 deployment, configure these in **GitHub Repo → Settings → Secrets and variables → Actions**:

| Secret Name | Description | Example |
|---|---|---|
| `EC2_HOST` | Public IP address or DNS domain of your EC2 instance | `13.232.xxx.xxx` or `api.lokdarpan.in` |
| `EC2_USER` | SSH user for the EC2 instance | `ubuntu` (Ubuntu) or `ec2-user` (Amazon Linux) |
| `EC2_SSH_KEY` | Private SSH key (`.pem`) used to connect to your instance | `-----BEGIN RSA PRIVATE KEY----- ...` |
| `EC2_PORT` *(Optional)* | SSH port (defaults to 22 if omitted) | `22` |
| `EC2_APP_DIR` *(Optional)* | Path to the LokDarpan repo on your EC2 instance | `/home/ubuntu/LokDarpan` |

> [!NOTE]
> If `EC2_HOST`, `EC2_USER`, or `EC2_SSH_KEY` are not set, the workflow will safely pass the tests and Docker build, while gracefully skipping the EC2 deployment step.
