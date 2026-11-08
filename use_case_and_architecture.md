# Sunderta AI — Use Cases & Architecture

Product: **Sunderta AI** (repo: `startupidea4`)  
Positioning: AI cosmetic **skin appearance** guidance from face photo/video — **not a medical diagnosis**.

Related sister product: **Sunderta Dental** lives in `startupidea5` on a separate VM (`sunderta-dental`).

---

## 1. Product use cases

### 1.1 End user (invitee)

| Use case | Description |
|----------|-------------|
| Open personal invite | Admin creates a named invite URL + password. User opens `/access/{token}`, enters password, gets a device session cookie (~30 days). |
| Skin scan | Capture or upload an **image** or short **video** of the face. Client compresses images before upload. Camera on phones needs HTTPS. |
| Get skin appearance report | Async analysis produces overall score, skin type, metrics (hydration, texture, tone, clarity, fine lines, dark circles), concerns, strengths, morning/night routine. |
| Skincare routine | Track morning/night steps from the report. |
| Products | Browse curated skincare product recommendations. |
| Beauty AI chat | Report-aware assistant explains scores and routines — cosmetic guidance only. |
| History & progress | Past scans and score trends. |
| Profile | Skin goals, preferences, logout. |

**Hard rules**

- App is **fully locked** without an invite session.
- All analyses / chat / routines / profile are scoped to the invite link’s `user_id`.

### 1.2 Admin operator

| Use case | Description |
|----------|-------------|
| Admin login | Password-gated `/admin` UI. |
| Create / list / reset / delete invites | Same model as Dental: one person = one URL; delete wipes that user’s data. |

### 1.3 Explicit non-goals

- Not a dermatological diagnosis.
- Cloudflare quick tunnel is demo HTTPS (URL may change on restart).

---

## 2. Deployed URLs (GCP)

| Item | Value |
|------|--------|
| GCP project | `project-c2e38f7a-ac87-453f-951` |
| VM name | `sunderta-ai` |
| Zone | `asia-south1-a` |
| Public IP | `8.234.68.196` |
| HTTP UI | http://8.234.68.196 |
| HTTPS (Cloudflare quick tunnel) | https://prefers-atlanta-interval-mixed.trycloudflare.com *(confirm if tunnel restarted)* |
| API docs | http://8.234.68.196:8000/docs |
| Admin UI | http://8.234.68.196/admin |
| Admin password | `okokchangeme123` (via `ADMIN_PASSWORD`) |

Confirm tunnel:

```bash
gcloud compute ssh sunderta-ai --zone asia-south1-a \
  --command "sudo grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' /var/log/sunderta-tunnel.log | tail -1"
```

---

## 3. System architecture

```text
Browser (React ui-code)
  │  same-origin /api via nginx/Caddy
  ▼
FastAPI API
  ├── Session cookies (invitee + admin)
  ├── MongoDB
  ├── Redis + RQ
  └── /data/uploads
        │
        ▼
Worker
  ├── OpenCV quality / frames
  ├── Azure OpenAI vision (skin prompts)
  ├── report_adapter → UI report
  └── Mongo updates
```

### 3.1 Containers

`frontend`, `api`, `worker`, `mongo`, `redis`, plus GCP `caddy` on `:80`.  
Remote dir: `~/sunderta-ai`. Database: `sunderta_ai`.

### 3.2 Auth & tenancy

Identical pattern to Dental:

- Admin cookie `sunderta_admin`
- Invitee cookie `sunderta_session` → `user_id` = access link document id
- App APIs no longer trust raw client `X-User-Id`

### 3.3 Analysis pipeline

Upload → queue → OpenCV + Azure skin appearance JSON → validate → `to_ui_report` → UI report / routine / chat.

### 3.4 Frontend highlights

- Gold/cream beauty theme (CSS `--gold`, etc.)
- Camera blank-preview fix: mount `<video>` then attach `srcObject`
- Image compression client + server-side resize for Azure

---

## 4. Key code map

| Area | Location |
|------|----------|
| UI | `ui-code/src/pages/*` |
| Auth cookies | `backend/app/core/security.py` |
| Invites | `backend/app/services/access_link_service.py`, `api/routes/admin.py`, `access.py` |
| Skin prompts | `backend/app/skin_pipeline/legacy.py`, `prompts.py` |
| Report adapter | `backend/app/services/report_adapter.py` |
| GCP | `deploy/gcp/*` |

---

## 5. Environment (critical)

- Azure OpenAI vars  
- `MONGODB_URL`, `REDIS_URL`  
- `ADMIN_PASSWORD`, `SESSION_SECRET`, `SESSION_TTL_DAYS`  
- `CORS_ORIGINS`  
- Never commit `.env`

---

## 6. Local vs GCP

```bash
docker compose up --build          # local
bash deploy/gcp/deploy.sh          # VM sunderta-ai
```

---

## 7. Security notes

- Invite-scoped isolation; delete invite wipes user data.
- Cosmetic / appearance disclaimers; recommend dermatologist for medical concerns.
- Prefer HTTPS (Cloudflare tunnel) for phone camera permissions.
