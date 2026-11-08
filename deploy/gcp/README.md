# GCP single-VM Docker Compose deploy

Runs the full stack (frontend, api, worker, mongo, redis) on **one** small GCE VM.

## Recommended minimum machine

- **e2-small** (2 vCPU / 2 GB) — practical minimum for build + OpenCV worker
- Disk: **30 GB**
- Region default: `asia-south1-a` (Mumbai)

`e2-micro` (1 GB) is usually too small for image builds + Mongo + OpenCV.

## Steps

1. `gcloud auth login`
2. `gcloud config set project YOUR_PROJECT_ID`
3. Ensure repo `.env` has `AZURE_OPENAI_API_KEY`
4. `bash deploy/gcp/deploy.sh`

Optional overrides:

```bash
export GCP_PROJECT_ID=my-project
export GCP_ZONE=asia-south1-a
export GCP_MACHINE_TYPE=e2-small
bash deploy/gcp/deploy.sh
```

## URLs after deploy

- UI: `http://EXTERNAL_IP`
- API docs: `http://EXTERNAL_IP:8000/docs`
