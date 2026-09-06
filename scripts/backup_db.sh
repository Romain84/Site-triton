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

# 5. Sauvegarde des médias et fichiers téléversés (/var/lib/triton_uploads)
UPLOADS_DIR="${UPLOADS_DIR:-/var/lib/triton_uploads}"
UPLOADS_FILENAME="triton_uploads_$DATE.tar.gz"
UPLOADS_DEST="$BACKUP_DIR/$UPLOADS_FILENAME"

if [ -d "$UPLOADS_DIR" ]; then
  echo "[INFO $(date)] Sauvegarde des fichiers médias de $UPLOADS_DIR vers $UPLOADS_DEST..." >> "$BACKUP_DIR/backup.log"
  tar -czf "$UPLOADS_DEST" -C "$UPLOADS_DIR" . 2>/dev/null
  if [ -s "$UPLOADS_DEST" ]; then
    UPLOADS_SIZE=$(du -h "$UPLOADS_DEST" | cut -f1)
    echo "[SUCCÈS $(date)] Sauvegarde médias réussie ($UPLOADS_SIZE) : $UPLOADS_FILENAME" >> "$BACKUP_DIR/backup.log"
    echo "✅ Sauvegarde médias terminée avec succès ($UPLOADS_SIZE) : $UPLOADS_DEST"
  else
    echo "[AVERTISSEMENT $(date)] L'archive médias est vide ou aucun fichier trouvé dans $UPLOADS_DIR" >> "$BACKUP_DIR/backup.log"
  fi
else
  echo "[INFO $(date)] Répertoire $UPLOADS_DIR introuvable, sauvegarde médias ignorée." >> "$BACKUP_DIR/backup.log"
fi

# 6. Nettoyage automatique - Rétention stricte de 10 jours
find "$BACKUP_DIR" -name "triton_db_*.sql.gz" -mtime +10 -delete
find "$BACKUP_DIR" -name "triton_uploads_*.tar.gz" -mtime +10 -delete

