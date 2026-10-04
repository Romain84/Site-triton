-- AlterTable
ALTER TABLE "lignes_facture_coach" ADD COLUMN IF NOT EXISTS "groupeCompetitionId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lignes_facture_coach_groupeCompetitionId_idx" ON "lignes_facture_coach"("groupeCompetitionId");

-- Migrer les lignes de compétitions existantes de remplacementId vers groupeCompetitionId
UPDATE "lignes_facture_coach"
SET "groupeCompetitionId" = "remplacementId", "remplacementId" = NULL
WHERE "remplacementId" LIKE 'comp_%';
