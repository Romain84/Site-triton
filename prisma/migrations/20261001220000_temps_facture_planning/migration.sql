-- AlterTable
ALTER TABLE "plannings" ADD COLUMN IF NOT EXISTS "tempsFacture" INTEGER;

-- AlterTable
ALTER TABLE "groupes" DROP COLUMN IF EXISTS "tempsFacture";
