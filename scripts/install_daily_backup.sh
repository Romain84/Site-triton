#!/bin/bash
# ==========================================================
# INSTALLATION DES TÂCHES PLANIFIÉES CRON
# 1. Sauvegarde quotidienne (03h00 du matin) - Base + Uploads
# 2. Dépouillement de la file d'e-mails (Toutes les 10 minutes)
# ==========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup_db.sh"
EMAIL_SCRIPT="$SCRIPT_DIR/process_email_queue.sh"

# Si le dossier est ailleurs, on cherche le chemin réel
if [ ! -f "$BACKUP_SCRIPT" ]; then
  BACKUP_SCRIPT=$(find /root -name "backup_db.sh" 2>/dev/null | head -n 1)
fi

if [ ! -f "$EMAIL_SCRIPT" ]; then
  EMAIL_SCRIPT=$(find /root -name "process_email_queue.sh" 2>/dev/null | head -n 1)
fi

if [ -z "$BACKUP_SCRIPT" ] || [ ! -f "$BACKUP_SCRIPT" ]; then
  echo "❌ Fichier backup_db.sh introuvable !"
  exit 1
fi

chmod +x "$BACKUP_SCRIPT"

# 1. Configurer la sauvegarde quotidienne à 03h00
(crontab -l 2>/dev/null | grep -v "backup_db.sh"; echo "0 3 * * * $BACKUP_SCRIPT > /dev/null 2>&1") | crontab -
echo "✅ Sauvegarde quotidienne configurée (03h00 du matin)"
echo "📁 Script : $BACKUP_SCRIPT"

# 2. Configurer le dépouillement des e-mails toutes les 10 minutes (si présent)
if [ -n "$EMAIL_SCRIPT" ] && [ -f "$EMAIL_SCRIPT" ]; then
  chmod +x "$EMAIL_SCRIPT"
  (crontab -l 2>/dev/null | grep -v "process_email_queue.sh"; echo "*/10 * * * * $EMAIL_SCRIPT > /dev/null 2>&1") | crontab -
  echo "✅ Traitement file d'attente d'e-mails configuré (toutes les 10 minutes)"
  echo "📁 Script : $EMAIL_SCRIPT"
fi

echo "=========================================================="
echo "📋 Liste actuelle des tâches crontab :"
crontab -l
echo "=========================================================="

