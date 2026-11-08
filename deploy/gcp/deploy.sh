#!/usr/bin/env bash
set -euo pipefail

# Deploy Sunderta AI to a single GCE VM running Docker Compose.
# Prerequisites: gcloud auth login + project selected.

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-asia-south1}"
ZONE="${GCP_ZONE:-asia-south1-a}"
VM_NAME="${GCP_VM_NAME:-sunderta-ai}"
MACHINE_TYPE="${GCP_MACHINE_TYPE:-e2-small}"
DISK_SIZE_GB="${GCP_DISK_SIZE_GB:-30}"
TAG="sunderta-web"

if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

if [[ ! -f "${ROOT_DIR}/.env" ]]; then
  echo "Missing ${ROOT_DIR}/.env — copy from .env.example and set AZURE_OPENAI_API_KEY"
  exit 1
fi

echo "Project: ${PROJECT_ID}"
echo "Zone:    ${ZONE}"
echo "VM:      ${VM_NAME} (${MACHINE_TYPE})"

gcloud config set project "${PROJECT_ID}" >/dev/null

echo "Enabling APIs..."
gcloud services enable compute.googleapis.com --project "${PROJECT_ID}"

# Firewall for HTTP (and optional 8000 for API docs)
if ! gcloud compute firewall-rules describe allow-sunderta-http --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud compute firewall-rules create allow-sunderta-http \
    --project "${PROJECT_ID}" \
    --allow tcp:80,tcp:8000 \
    --target-tags "${TAG}" \
    --description "Sunderta AI HTTP access" \
    --direction INGRESS \
    --priority 1000
fi

# Create VM if missing
if ! gcloud compute instances describe "${VM_NAME}" --zone "${ZONE}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Creating VM ${VM_NAME}..."
  gcloud compute instances create "${VM_NAME}" \
    --project "${PROJECT_ID}" \
    --zone "${ZONE}" \
    --machine-type "${MACHINE_TYPE}" \
    --image-family debian-12 \
    --image-project debian-cloud \
    --boot-disk-size "${DISK_SIZE_GB}GB" \
    --boot-disk-type pd-balanced \
    --tags "${TAG}" \
    --metadata=enable-oslogin=TRUE \
    --scopes=cloud-platform
else
  echo "VM ${VM_NAME} already exists."
fi

echo "Waiting for SSH..."
for i in $(seq 1 30); do
  if gcloud compute ssh "${VM_NAME}" --zone "${ZONE}" --project "${PROJECT_ID}" --command "echo ok" >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

echo "Installing Docker on VM..."
gcloud compute scp "${ROOT_DIR}/deploy/gcp/vm-startup.sh" "${VM_NAME}:/tmp/vm-startup.sh" --zone "${ZONE}" --project "${PROJECT_ID}"
gcloud compute ssh "${VM_NAME}" --zone "${ZONE}" --project "${PROJECT_ID}" --command "sudo bash /tmp/vm-startup.sh"

echo "Syncing project to VM..."
# Exclude heavy/local-only paths
gcloud compute scp --recurse \
  --zone "${ZONE}" \
  --project "${PROJECT_ID}" \
  "${ROOT_DIR}/backend" \
  "${ROOT_DIR}/ui-code" \
  "${ROOT_DIR}/deploy" \
  "${ROOT_DIR}/docker-compose.yml" \
  "${ROOT_DIR}/.env" \
  "${ROOT_DIR}/.dockerignore" \
  "${ROOT_DIR}/.env.example" \
  "${VM_NAME}:~/sunderta-ai/"

# Ensure upload dir exists remotely via compose volumes
gcloud compute ssh "${VM_NAME}" --zone "${ZONE}" --project "${PROJECT_ID}" --command "
  set -e
  mkdir -p ~/sunderta-ai
  cd ~/sunderta-ai
  sudo usermod -aG docker \\\$USER || true
  sudo docker compose -f docker-compose.yml -f deploy/gcp/docker-compose.gcp.yml up -d --build
  sudo docker compose -f docker-compose.yml -f deploy/gcp/docker-compose.gcp.yml exec -T api python -m app.scripts.seed_products || true
"

EXTERNAL_IP=$(gcloud compute instances describe "${VM_NAME}" --zone "${ZONE}" --project "${PROJECT_ID}" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo ""
echo "Deployed."
echo "UI:  http://${EXTERNAL_IP}"
echo "API: http://${EXTERNAL_IP}:8000/docs"
