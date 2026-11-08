#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

set -a
. ./.env
set +a

exec uvicorn app:app --host 0.0.0.0 --port "${API_PORT:-8010}" --reload
