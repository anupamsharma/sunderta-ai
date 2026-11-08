# startupidea4-full

Sunderta AI — full-stack skin appearance analyzer (React + FastAPI + RQ worker + Redis + MongoDB).

## Architecture

```text
Browser (ui-code)
  -> FastAPI API
       -> Local media volume (/data/uploads)
       -> MongoDB (analyses, reports, routines, chat, products, profile)
       -> Redis / RQ queue
  -> Worker
       -> OpenCV quality + frame selection
       -> Azure OpenAI vision + chat
       -> MongoDB status/report updates
```

## Directory structure

```text
backend/app/          FastAPI API, services, worker, skin pipeline
ui-code/              React frontend
skin_analyzer.py      Original CLI (still usable)
docker-compose.yml    Local orchestration
deploy/gcp/           Single-VM GCP Docker Compose deploy
.env.example          Environment template
```

## Local setup

1. Copy env and set your Azure key:

```bash
cp .env.example .env
# edit AZURE_OPENAI_API_KEY
```

2. Start everything:

```bash
docker compose up --build
```

3. Open:

- UI: http://localhost:3000
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

4. Seed products:

```bash
docker compose exec api python -m app.scripts.seed_products
```

## Required environment variables

See `.env.example`. Critical:

- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_CHAT_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION`
- `MONGODB_URL`
- `REDIS_URL`
- `UPLOAD_ROOT`
- `CORS_ORIGINS`

## Test image / video analysis

1. Open http://localhost:3000/analysis
2. Choose **Image** or **Video**, capture/upload, accept consent
3. Wait for processing, then open the report

Phone on same Wi‑Fi (local): `http://<LAN-IP>:3000`  
Live camera on phones usually requires HTTPS (use upload, or tunnel with ngrok).

## Run tests

```bash
cd backend
python -m pip install -r requirements.txt
pytest -q
```

## CLI (optional)

```bash
source .venv/bin/activate
python skin_analyzer.py --mode image --input samples/face.jpg --output results/image_report.json
```

## GCP deploy (single VM + Docker Compose)

All services run on one GCE VM via Docker Compose.

### Prerequisites

```bash
# Install gcloud (macOS)
brew install --cask google-cloud-sdk

# Login
gcloud auth login
gcloud config set project project-c2e38f7a-ac87-453f-951
```

Ensure `.env` exists locally with `AZURE_OPENAI_API_KEY` (not committed).

### Deploy / redeploy

```bash
export GCP_PROJECT_ID=project-c2e38f7a-ac87-453f-951
export GCP_ZONE=asia-south1-a
export GCP_MACHINE_TYPE=e2-small
bash deploy/gcp/deploy.sh
```

What the script does:

1. Enables Compute API
2. Creates firewall rule `allow-sunderta-http` (TCP 80, 8000)
3. Creates VM `sunderta-ai` (`e2-small`, Debian 12, 30 GB) if missing
4. Installs Docker + Compose on the VM
5. Syncs project files and runs `docker compose up --build`
6. Seeds products

### Useful GCP commands

```bash
# Project / account
gcloud config get-value project
gcloud auth list

# VM status + public IP
gcloud compute instances list --project project-c2e38f7a-ac87-453f-951
gcloud compute instances describe sunderta-ai \
  --zone asia-south1-a \
  --project project-c2e38f7a-ac87-453f-951 \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# SSH
gcloud compute ssh sunderta-ai \
  --zone asia-south1-a \
  --project project-c2e38f7a-ac87-453f-951

# On the VM: container status / logs
cd ~/sunderta-ai
sudo docker compose -f docker-compose.yml -f deploy/gcp/docker-compose.gcp.yml ps
sudo docker compose -f docker-compose.yml -f deploy/gcp/docker-compose.gcp.yml logs -f api worker

# Stop / start VM (save cost when idle)
gcloud compute instances stop sunderta-ai --zone asia-south1-a --project project-c2e38f7a-ac87-453f-951
gcloud compute instances start sunderta-ai --zone asia-south1-a --project project-c2e38f7a-ac87-453f-951

# Billing (linked account for this project)
gcloud billing projects describe project-c2e38f7a-ac87-453f-951
gcloud billing accounts list
```

### Current GCP deployment

| Item | Value |
|------|--------|
| Project | `project-c2e38f7a-ac87-453f-951` |
| VM | `sunderta-ai` |
| Zone | `asia-south1-a` |
| Machine | `e2-small` |
| UI | http://8.234.68.196 |
| UI (HTTPS / phone) | https://8.234.68.196.sslip.io |
| API docs | http://8.234.68.196:8000/docs |
| Billing account | `My Billing Account` (`010A11-380664-6CD98A`) |

> Public IP may change if the VM is stopped/started without a static IP.

## Current limitations

- Local anonymous user via `X-User-Id` / localStorage (no full auth provider)
- Product catalogue is fictional seed data
- Reminders are UI-only
- Streaming chat responses are not implemented
- Media on local Docker volume (not object storage yet)
- Phone live camera needs HTTPS

## Future AWS mapping

```text
Local media volume -> Amazon S3
Redis container     -> ElastiCache Redis or SQS
MongoDB container   -> MongoDB Atlas or DocumentDB
API + worker        -> ECS Fargate
Docker images       -> ECR
Env secrets         -> Secrets Manager
Logs                -> CloudWatch
```
