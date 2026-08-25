#!/bin/bash
# ==========================================================
# INSTALLATION DU CRON DE SAUVEGARDE QUOTIDIENNE (03H00 DU MATIN)
# ==========================================================

SCRIPT_PATH="/root/docker/site_triton/scripts/backup_db.sh"

# Si le dossier est ailleurs, on cherche le chemin réel
if [ ! -f "$SCRIPT_PATH" ]; then
  SCRIPT_PATH=$(find /root -name "backup_db.sh" 2>/dev/null | head -n 1)
fi

if [ -z "$SCRIPT_PATH" ]; then
  echo "❌ Fichier backup_db.sh introuvable !"
  exit 1
fi

chmod +x "$SCRIPT_PATH"

# Ajouter au crontab chaque jour à 03h00 du matin
(crontab -l 2>/dev/null | grep -v "backup_db.sh"; echo "0 3 * * * $SCRIPT_PATH > /dev/null 2>&1") | crontab -

echo "✅ Sauvegarde quotidienne configurée avec succès chaque nuit à 03h00 !"
echo "📁 Les sauvegardes seront stockées dans : /root/backups/"
