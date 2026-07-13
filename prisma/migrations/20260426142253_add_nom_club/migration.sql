-- CreateTable
CREATE TABLE "coaches" (
    "id" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT,
    "email" TEXT,
    "password" TEXT,
    "telephone" TEXT,
    "photo" TEXT,
    "bio" TEXT,
    "specialites" TEXT,
    "siret" TEXT,
    "adresse" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remplacements" (
    "id" TEXT NOT NULL,
    "coachRemplaceId" TEXT NOT NULL,
    "coachRemplacantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "planningId" TEXT,
    "motif" TEXT,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remplacements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plannings" (
    "id" TEXT NOT NULL,
    "jourSemaine" TEXT NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "groupeId" TEXT,
    "lieu" TEXT,
    "couleur" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plannings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_planning" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "planningId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_planning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenements_calendrier" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "description" TEXT,
    "lieu" TEXT,
    "type" TEXT,
    "groupeId" TEXT,
    "coachId" TEXT,
    "couleur" TEXT,
    "pdfReglement" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evenements_calendrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actualites" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "excerpt" TEXT,
    "image" TEXT,
    "auteur" TEXT,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "datePubli" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actualites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenements" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "excerpt" TEXT,
    "image" TEXT,
    "dateEvent" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "datePubli" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evenements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groupes" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "total" INTEGER NOT NULL,
    "inscrits" INTEGER NOT NULL DEFAULT 0,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "niveau" TEXT,
    "tarif" DOUBLE PRECISION,
    "caution" DOUBLE PRECISION,
    "prixLicence" DOUBLE PRECISION,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "tempsFacture" INTEGER,
    "isCompetition" BOOLEAN NOT NULL DEFAULT false,
    "nbCompetitions" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enfantsBureau" INTEGER NOT NULL DEFAULT 0,
    "membresBureau" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "groupes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscriptions" (
    "id" TEXT NOT NULL,
    "prenomNageur" TEXT NOT NULL,
    "nomNageur" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3) NOT NULL,
    "sexe" TEXT,
    "niveau" TEXT,
    "prenomParent" TEXT NOT NULL,
    "nomParent" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "certificatMedical" BOOLEAN NOT NULL DEFAULT false,
    "allergies" TEXT,
    "commentaires" TEXT,
    "groupeId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "montant" DOUBLE PRECISION,
    "paye" BOOLEAN NOT NULL DEFAULT false,
    "modePaiement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datePaiement" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seances_exceptionnelles" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "groupeId" TEXT,
    "dateSeance" TIMESTAMP(3) NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "placesTotal" INTEGER NOT NULL,
    "placesRestantes" INTEGER NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seances_exceptionnelles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations_seances" (
    "id" TEXT NOT NULL,
    "seanceId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "statutPaiement" TEXT NOT NULL DEFAULT 'en_attente',
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_seances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "galerie_albums" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "categorie" TEXT NOT NULL,
    "couverture" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galerie_albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "galerie_medias" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "titre" TEXT,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galerie_medias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "tauxHoraire" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "forfaitCompetition" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "nbCompetitionsAnnee" INTEGER NOT NULL DEFAULT 20,
    "nbDemiJourneesParCompetition" INTEGER NOT NULL DEFAULT 2,
    "forfaitRegionalActif" BOOLEAN NOT NULL DEFAULT false,
    "montantForfaitRegional" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "boutiqueOuverte" BOOLEAN NOT NULL DEFAULT true,
    "emailClub" TEXT,
    "emailNotification" TEXT,
    "logoUrl" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "inscriptionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reductionEnfantBureau" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "nomClub" TEXT DEFAULT 'Triton Club Cavaillon',

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT,
    "prenom" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenements_tournants" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "description" TEXT,
    "lieu" TEXT,
    "groupeId" TEXT,
    "coachId" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evenements_tournants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures_coach" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "tauxHoraire" DOUBLE PRECISION NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "pdfPath" TEXT,
    "dateGeneration" TIMESTAMP(3),
    "dateEnvoi" TIMESTAMP(3),
    "datePaiement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factures_coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_facture_coach" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "heures" DOUBLE PRECISION,
    "demiJournees" INTEGER,
    "montantFixe" DOUBLE PRECISION,
    "lieu" TEXT,
    "groupe" TEXT,
    "coachRemplaceId" TEXT,
    "montant" DOUBLE PRECISION NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_facture_coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodes_vacances" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'vacances',
    "impacteFacturation" BOOLEAN NOT NULL DEFAULT true,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "couleur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodes_vacances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories_produits" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "descriptionCourte" TEXT,
    "prix" DOUBLE PRECISION NOT NULL,
    "prixPromo" DOUBLE PRECISION,
    "enPromo" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "gererStock" BOOLEAN NOT NULL DEFAULT true,
    "stockIllimite" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "images" TEXT,
    "categorieId" TEXT,
    "tailles" TEXT,
    "couleurs" TEXT,
    "poids" INTEGER,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "enVedette" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variantes_produits" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "taille" TEXT,
    "couleur" TEXT,
    "sku" TEXT,
    "prix" DOUBLE PRECISION,
    "prixCoutantHT" DOUBLE PRECISION DEFAULT 0,
    "prixFlocageHT" DOUBLE PRECISION DEFAULT 0,
    "tauxTVA" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variantes_produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes" (
    "id" TEXT NOT NULL,
    "numeroCommande" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "prenomNageur" TEXT NOT NULL,
    "nomNageur" TEXT NOT NULL,
    "adresse" TEXT,
    "adresseComp" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'France',
    "sousTotal" DOUBLE PRECISION NOT NULL,
    "fraisLivraison" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "modePaiement" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "stripeSessionId" TEXT,
    "statutPaiement" TEXT NOT NULL DEFAULT 'en_attente',
    "statut" TEXT NOT NULL DEFAULT 'nouvelle',
    "methodeLivraison" TEXT,
    "numeroSuivi" TEXT,
    "dateExpedition" TIMESTAMP(3),
    "dateLivraison" TIMESTAMP(3),
    "noteClient" TEXT,
    "noteInterne" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_commande" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "varianteId" TEXT,
    "nomProduit" TEXT NOT NULL,
    "taille" TEXT,
    "couleur" TEXT,
    "image" TEXT,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "quantite" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_knowledge" (
    "id" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "reponse" TEXT NOT NULL,
    "motsCles" TEXT,
    "priorite" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associations_partenaires" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "heureDebutDefaut" TEXT NOT NULL,
    "heureFinDefaut" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "associations_partenaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins_associations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT,
    "prenom" TEXT,
    "associationId" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plannings_samedi" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "coachId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "activite" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'confirme',
    "motif" TEXT,
    "commentaire" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plannings_samedi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_planning_samedi" (
    "id" TEXT NOT NULL,
    "planningSamediId" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "adminAssociationId" TEXT,
    "adminClubId" TEXT,
    "action" TEXT NOT NULL,
    "ancienneValeur" TEXT,
    "nouvelleValeur" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_planning_samedi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coaches_email_key" ON "coaches"("email");

-- CreateIndex
CREATE INDEX "remplacements_coachRemplaceId_idx" ON "remplacements"("coachRemplaceId");

-- CreateIndex
CREATE INDEX "remplacements_coachRemplacantId_idx" ON "remplacements"("coachRemplacantId");

-- CreateIndex
CREATE INDEX "remplacements_date_idx" ON "remplacements"("date");

-- CreateIndex
CREATE INDEX "plannings_groupeId_idx" ON "plannings"("groupeId");

-- CreateIndex
CREATE INDEX "coach_planning_coachId_idx" ON "coach_planning"("coachId");

-- CreateIndex
CREATE INDEX "coach_planning_planningId_idx" ON "coach_planning"("planningId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_planning_coachId_planningId_key" ON "coach_planning"("coachId", "planningId");

-- CreateIndex
CREATE INDEX "evenements_calendrier_date_idx" ON "evenements_calendrier"("date");

-- CreateIndex
CREATE INDEX "evenements_calendrier_groupeId_idx" ON "evenements_calendrier"("groupeId");

-- CreateIndex
CREATE UNIQUE INDEX "actualites_slug_key" ON "actualites"("slug");

-- CreateIndex
CREATE INDEX "actualites_slug_idx" ON "actualites"("slug");

-- CreateIndex
CREATE INDEX "actualites_datePubli_idx" ON "actualites"("datePubli");

-- CreateIndex
CREATE UNIQUE INDEX "evenements_slug_key" ON "evenements"("slug");

-- CreateIndex
CREATE INDEX "evenements_slug_idx" ON "evenements"("slug");

-- CreateIndex
CREATE INDEX "evenements_dateEvent_idx" ON "evenements"("dateEvent");

-- CreateIndex
CREATE UNIQUE INDEX "groupes_nom_key" ON "groupes"("nom");

-- CreateIndex
CREATE INDEX "inscriptions_email_idx" ON "inscriptions"("email");

-- CreateIndex
CREATE INDEX "inscriptions_statut_idx" ON "inscriptions"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "factures_numero_key" ON "factures"("numero");

-- CreateIndex
CREATE INDEX "factures_numero_idx" ON "factures"("numero");

-- CreateIndex
CREATE INDEX "seances_exceptionnelles_dateSeance_idx" ON "seances_exceptionnelles"("dateSeance");

-- CreateIndex
CREATE INDEX "seances_exceptionnelles_actif_idx" ON "seances_exceptionnelles"("actif");

-- CreateIndex
CREATE INDEX "reservations_seances_email_idx" ON "reservations_seances"("email");

-- CreateIndex
CREATE INDEX "reservations_seances_seanceId_idx" ON "reservations_seances"("seanceId");

-- CreateIndex
CREATE UNIQUE INDEX "galerie_albums_slug_key" ON "galerie_albums"("slug");

-- CreateIndex
CREATE INDEX "galerie_medias_albumId_idx" ON "galerie_medias"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "evenements_tournants_date_idx" ON "evenements_tournants"("date");

-- CreateIndex
CREATE INDEX "evenements_tournants_coachId_idx" ON "evenements_tournants"("coachId");

-- CreateIndex
CREATE INDEX "evenements_tournants_groupeId_idx" ON "evenements_tournants"("groupeId");

-- CreateIndex
CREATE UNIQUE INDEX "factures_coach_numero_key" ON "factures_coach"("numero");

-- CreateIndex
CREATE INDEX "factures_coach_numero_idx" ON "factures_coach"("numero");

-- CreateIndex
CREATE INDEX "factures_coach_coachId_idx" ON "factures_coach"("coachId");

-- CreateIndex
CREATE INDEX "factures_coach_annee_mois_idx" ON "factures_coach"("annee", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "factures_coach_coachId_mois_annee_key" ON "factures_coach"("coachId", "mois", "annee");

-- CreateIndex
CREATE INDEX "lignes_facture_coach_factureId_idx" ON "lignes_facture_coach"("factureId");

-- CreateIndex
CREATE INDEX "periodes_vacances_dateDebut_idx" ON "periodes_vacances"("dateDebut");

-- CreateIndex
CREATE INDEX "periodes_vacances_dateFin_idx" ON "periodes_vacances"("dateFin");

-- CreateIndex
CREATE UNIQUE INDEX "categories_produits_nom_key" ON "categories_produits"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "categories_produits_slug_key" ON "categories_produits"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "produits_slug_key" ON "produits"("slug");

-- CreateIndex
CREATE INDEX "produits_slug_idx" ON "produits"("slug");

-- CreateIndex
CREATE INDEX "produits_categorieId_idx" ON "produits"("categorieId");

-- CreateIndex
CREATE INDEX "produits_actif_idx" ON "produits"("actif");

-- CreateIndex
CREATE UNIQUE INDEX "variantes_produits_sku_key" ON "variantes_produits"("sku");

-- CreateIndex
CREATE INDEX "variantes_produits_produitId_idx" ON "variantes_produits"("produitId");

-- CreateIndex
CREATE INDEX "variantes_produits_sku_idx" ON "variantes_produits"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "commandes_numeroCommande_key" ON "commandes"("numeroCommande");

-- CreateIndex
CREATE INDEX "commandes_numeroCommande_idx" ON "commandes"("numeroCommande");

-- CreateIndex
CREATE INDEX "commandes_email_idx" ON "commandes"("email");

-- CreateIndex
CREATE INDEX "commandes_statut_idx" ON "commandes"("statut");

-- CreateIndex
CREATE INDEX "commandes_statutPaiement_idx" ON "commandes"("statutPaiement");

-- CreateIndex
CREATE INDEX "commandes_createdAt_idx" ON "commandes"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "lignes_commande_commandeId_idx" ON "lignes_commande"("commandeId");

-- CreateIndex
CREATE INDEX "lignes_commande_produitId_idx" ON "lignes_commande"("produitId");

-- CreateIndex
CREATE INDEX "chatbot_knowledge_categorie_idx" ON "chatbot_knowledge"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "associations_partenaires_nom_key" ON "associations_partenaires"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "associations_partenaires_slug_key" ON "associations_partenaires"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "admins_associations_email_key" ON "admins_associations"("email");

-- CreateIndex
CREATE INDEX "admins_associations_associationId_idx" ON "admins_associations"("associationId");

-- CreateIndex
CREATE INDEX "plannings_samedi_associationId_idx" ON "plannings_samedi"("associationId");

-- CreateIndex
CREATE INDEX "plannings_samedi_coachId_idx" ON "plannings_samedi"("coachId");

-- CreateIndex
CREATE INDEX "plannings_samedi_date_idx" ON "plannings_samedi"("date");

-- CreateIndex
CREATE UNIQUE INDEX "plannings_samedi_associationId_date_heureDebut_key" ON "plannings_samedi"("associationId", "date", "heureDebut");

-- CreateIndex
CREATE INDEX "historique_planning_samedi_planningSamediId_idx" ON "historique_planning_samedi"("planningSamediId");

-- CreateIndex
CREATE INDEX "historique_planning_samedi_associationId_idx" ON "historique_planning_samedi"("associationId");

-- CreateIndex
CREATE INDEX "historique_planning_samedi_createdAt_idx" ON "historique_planning_samedi"("createdAt");

-- AddForeignKey
ALTER TABLE "remplacements" ADD CONSTRAINT "remplacements_coachRemplacantId_fkey" FOREIGN KEY ("coachRemplacantId") REFERENCES "coaches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remplacements" ADD CONSTRAINT "remplacements_coachRemplaceId_fkey" FOREIGN KEY ("coachRemplaceId") REFERENCES "coaches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plannings" ADD CONSTRAINT "plannings_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "groupes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_planning" ADD CONSTRAINT "coach_planning_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_planning" ADD CONSTRAINT "coach_planning_planningId_fkey" FOREIGN KEY ("planningId") REFERENCES "plannings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenements_calendrier" ADD CONSTRAINT "evenements_calendrier_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenements_calendrier" ADD CONSTRAINT "evenements_calendrier_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "groupes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "groupes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "inscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances_exceptionnelles" ADD CONSTRAINT "seances_exceptionnelles_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "groupes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations_seances" ADD CONSTRAINT "reservations_seances_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "seances_exceptionnelles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galerie_medias" ADD CONSTRAINT "galerie_medias_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "galerie_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenements_tournants" ADD CONSTRAINT "evenements_tournants_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenements_tournants" ADD CONSTRAINT "evenements_tournants_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "groupes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures_coach" ADD CONSTRAINT "factures_coach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_facture_coach" ADD CONSTRAINT "lignes_facture_coach_coachRemplaceId_fkey" FOREIGN KEY ("coachRemplaceId") REFERENCES "coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_facture_coach" ADD CONSTRAINT "lignes_facture_coach_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures_coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories_produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes_produits" ADD CONSTRAINT "variantes_produits_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes_produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins_associations" ADD CONSTRAINT "admins_associations_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations_partenaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plannings_samedi" ADD CONSTRAINT "plannings_samedi_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations_partenaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plannings_samedi" ADD CONSTRAINT "plannings_samedi_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_planning_samedi" ADD CONSTRAINT "historique_planning_samedi_adminAssociationId_fkey" FOREIGN KEY ("adminAssociationId") REFERENCES "admins_associations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_planning_samedi" ADD CONSTRAINT "historique_planning_samedi_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations_partenaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_planning_samedi" ADD CONSTRAINT "historique_planning_samedi_planningSamediId_fkey" FOREIGN KEY ("planningSamediId") REFERENCES "plannings_samedi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
