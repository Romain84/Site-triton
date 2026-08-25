#!/bin/bash
# ==========================================================
# TRITON CLUB CAVAILLON - SCRIPT DE SAUVEGARDE QUOTIDIENNE (10 JOURS)
# ==========================================================

# 1. Dossier de destination des sauvegardes
BACKUP_DIR="${BACKUP_DIR:-/root/backups}"
mkdir -p "$BACKUP_DIR"

# 2. Date et heure du snapshot
DATE=$(date +%Y-%m-%d_%Hh%M)
FILENAME="triton_db_$DATE.sql.gz"
DEST="$BACKUP_DIR/$FILENAME"

# 3. Détection automatique du conteneur PostgreSQL
CONTAINER_NAME=$(docker ps --filter "ancestor=postgres:16-alpine" --format "{{.Names}}" | head -n 1)

if [ -z "$CONTAINER_NAME" ]; then
  if docker ps --format "{{.Names}}" | grep -q "triton-postgres-prod"; then
    CONTAINER_NAME="triton-postgres-prod"
  elif docker ps --format "{{.Names}}" | grep -q "triton-postgres-dev"; then
    CONTAINER_NAME="triton-postgres-dev"
  fi
fi

if [ -z "$CONTAINER_NAME" ]; then
  echo "[ERREUR $(date)] Conteneur PostgreSQL introuvable ou arrêté !" >> "$BACKUP_DIR/backup.log"
  exit 1
fi

# 4. Exécution du dump compressé
echo "[INFO $(date)] Sauvegarde de la base $CONTAINER_NAME vers $DEST..." >> "$BACKUP_DIR/backup.log"
docker exec "$CONTAINER_NAME" pg_dump -U postgres postgres | gzip > "$DEST"

# Vérification de l'intégrité
if [ -s "$DEST" ]; then
  SIZE=$(du -h "$DEST" | cut -f1)
  echo "[SUCCÈS $(date)] Sauvegarde réussie ($SIZE) : $FILENAME" >> "$BACKUP_DIR/backup.log"
  echo "✅ Sauvegarde terminée avec succès ($SIZE) : $DEST"
else
  echo "[ERREUR $(date)] Le fichier de sauvegarde est vide !" >> "$BACKUP_DIR/backup.log"
  echo "❌ Erreur : fichier de sauvegarde vide"
  exit 1
fi

# 5. Nettoyage automatique - Rétention stricte de 10 jours
find "$BACKUP_DIR" -name "triton_db_*.sql.gz" -mtime +10 -delete
