#!/bin/bash
# ==========================================================
# TRITON CLUB CAVAILLON - DÉPÈCHEMENT DE LA FILE D'ATTENTE D'E-MAILS
# ==========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Charger CRON_SECRET depuis l'environnement ou les fichiers .env
if [ -z "$CRON_SECRET" ]; then
  if [ -f "$PROJECT_ROOT/.env.production" ]; then
    CRON_SECRET=$(grep -E "^CRON_SECRET=" "$PROJECT_ROOT/.env.production" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  elif [ -f "$PROJECT_ROOT/.env" ]; then
    CRON_SECRET=$(grep -E "^CRON_SECRET=" "$PROJECT_ROOT/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  fi
fi

LOG_FILE="/root/backups/cron_emails.log"
mkdir -p "$(dirname "$LOG_FILE")"

if [ -z "$CRON_SECRET" ]; then
  echo "[AVERTISSEMENT $(date)] Variable CRON_SECRET introuvable. File d'attente d'e-mails non traitée." >> "$LOG_FILE"
  exit 1
fi

# Appel local de l'API
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://127.0.0.1:3000/api/cron/process-emails" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --max-time 30 2>&1)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "[SUCCÈS $(date)] Traitement de la file d'e-mails effectué : $BODY" >> "$LOG_FILE"
else
  echo "[ERREUR $(date)] Échec appel cron email (HTTP $HTTP_STATUS) : $BODY" >> "$LOG_FILE"
fi
