-- Migration SQL pour renseigner le temps facturé sur la base de la durée réelle exacte (fin - début en minutes)
UPDATE plannings
SET "tempsFacture" = (
  EXTRACT(EPOCH FROM ("heureFin"::time - "heureDebut"::time)) / 60
)::integer
WHERE actif = true AND ("tempsFacture" IS NULL OR "tempsFacture" = 0);

SELECT id, "jourSemaine", "heureDebut", "heureFin", "tempsFacture"
FROM plannings
WHERE actif = true
ORDER BY "jourSemaine", "heureDebut";
