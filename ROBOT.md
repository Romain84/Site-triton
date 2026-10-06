# 🤖 Directives & Règles pour Agents IA (ROBOT.md)
# Projet : Triton Club Cavaillon (Plateforme Web & Système de Gestion Intégrée v2.0)

Ce document constitue la référence absolue et exhaustive pour tout agent IA (Antigravity, Cursor, Claude, etc.) intervenant sur le projet `Site_New_TRITON-`.

---

## 🏛️ 1. IDENTITÉ LÉGALE & COORDONNÉES OFFICIELLES DU CLUB (INVIOLABLE)

Toute édition de devis, facture, document officiel, e-mail, pied de page ou mention légale DOIT STRICTEMENT respecter ces informations certifiées INSEE :

| Champ | Valeur Officielle |
| :--- | :--- |
| **Dénomination légale** | `TRITON CLUB CAVAILLONNAIS` |
| **Nom d'usage** | `Triton Club Cavaillon` |
| **Numéro SIRET** | `448 666 065 00017` |
| **Numéro SIREN** | `448 666 065` |
| **Numéro RNA** | `W841000669` |
| **Code APE / NAF** | `93.12Z` (Activités de clubs de sports - Natation sportive et de loisir) |
| **Forme Juridique** | Association sportive déclarée régie par la loi du 1er juillet 1901 (fondée le 29 mars 1966) |
| **Affiliation officielle** | Fédération Française de Natation (FFN) |
| **Régime Fiscal / TVA** | TVA non applicable - art. 261-7-1° du CGI (organisme sans but lucratif) |
| **Siège social légal** | Piscine de la Clède, Route de Pertuis, 84300 Cavaillon |
| **Bassin & Correspondance** | Piscine Alphonse Roudière, Avenue Jean Moulin, Quartier La Clède, 84300 Cavaillon |
| **E-mail officiel** | `tritoncavaillon@gmail.com` |
| **Site officiel** | `https://tritoncavaillon.fr` |
| **Banque officielle** | Crédit Mutuel (CCM Agriculture de Cavaillon - 92 Cours Bournissac, 84306 Cavaillon) |
| **IBAN officiel** | `FR76 1027 8065 1400 0210 4070 102` |
| **Code BIC** | `CMCIFR2A` |
| **Titulaire du Compte** | `TRITON CLUB CAVAILLON` |
| **Hébergeur officiel** | OVH SAS, 2 rue Kellermann, 59100 Roubaix, France |

---

## 🚨 2. RÈGLES D'OR D'INFRASTRUCTURE & DÉPLOIEMENT

1. **AUCUN Vercel, AUCUN Supabase** :
   - Le site de production **https://tritoncavaillon.fr** est hébergé sur un **serveur VPS OVH** dédié (`146.59.239.75` / `vps-248c64f5.vps.ovh.net`).
   - Le déploiement s'effectue via **Docker & Docker Compose** (`docker-compose.vps.yml`).
   - La base de données de production est un conteneur **PostgreSQL 16 Alpine** (`triton-postgres-prod`), relié au conteneur web (`triton-web-prod`).
   - Ne JAMAIS réintroduire d'URL Supabase ou de configuration Vercel Database.

2. **Environnement Local vs Production** :
   - **En local** : Le fichier `.env` utilise PostgreSQL local sur `postgresql://postgres:TritonNewSite84@localhost:5432/postgres`.
   - **Sur le VPS** : La variable `DATABASE_URL` dans Docker pointe vers `postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/postgres?schema=public`.
   - **ORM** : Le projet utilise **Prisma 7.10+** avec l'adaptateur natif `@prisma/adapter-pg` et `pg.Pool` (`lib/prisma.ts`).

3. **Volumes & Persistance sur le VPS** :
   - `/var/lib/triton_uploads:/app/public/uploads` : Persistance des images, justificatifs comptables, logos et photos de la galerie.
   - `/root/backups:/app/backups` : Dépôt des sauvegardes automatisées accessibles via l'API d'administration.

4. **Sauvegardes Automatisées & Rétention** :
   - Sauvegardes quotidiennes compressées de la base PostgreSQL vers `/root/backups` (`.sql.gz`) avec rétention automatique de 10 jours (`scripts/backup_db.sh`).
   - Gestion visuelle en direct depuis Admin > Sauvegarde BDD (`/api/admin/database/backups`).

5. **Maintenance du Disque sur le VPS** :
   - Les builds répétés saturent rapidement le disque si le cache Docker n'est pas purgé.
   - Tâche planifiée `systemd` (`docker-prune.timer`) active sur le VPS.
   - En cas d'intervention manuelle : `sudo docker builder prune -af` et `sudo docker image prune -f`.

---

## 🛠️ 3. STACK TECHNIQUE & SÉCURITÉ

- **Framework** : Next.js 16 (App Router, Server Components & Server Actions) + React 19 + TypeScript strict
- **Styling** : Tailwind CSS v4 + Framer Motion + Lucide React
- **Base & ORM** : Prisma 7.10+ avec adaptateur PostgreSQL natif (`@prisma/adapter-pg` + `pg.Pool`)
- **Authentification & Sessions** :
  - Gestion sécurisée via `jose` (JWT chiffré en HS256 dans cookies HTTP-Only).
  - Deux cookies hermétiques : `coach_session` (validité 7 jours) et `admin_session`.
  - Rôles administratifs gérés : `admin`, `president`, `tresorier`.
  - Pas de jetons dans le localStorage.
- **Protection Anti-Abus & Sécurité Réseau** :
  - Validation stricte d'origine CSRF (`isSameOriginRequest`).
  - Rate Limiter en mémoire (`lib/rate-limiter.ts`) avec seuils par minute et par jour anti-bruteforce.
  - Headers stricts : `poweredByHeader: false`, CSP avec `frame-ancestors: none`, anti-spoofing IP.
  - Conteneur Docker exécuté sous utilisateur non-root (`nextjs:1001`).
- **Journal d'Audit Intégré** :
  - Traçabilité des actions sensibles en base (`AdminAuditLog` / `lib/admin-audit.ts`).
- **File d'Attente d'Emails Asynchrone** :
  - Table `EmailQueue` pour découpler les envois SMTP (OVH / Gmail) et prévenir les blocages réseau.
  - Cron worker périodique (`/api/cron/process-emails`, script `process_email_queue.sh`).

---

## 🏊 4. RÈGLES MÉTIERS DU CLUB

### A. Espace Coachs (`/coach`) & Authentification Sécurisée
- **Connexion initiale** :
  - Mot de passe provisoire standardisé à l'initialisation : **`1234`**.
  - Dès la première connexion (`mustChangePassword: true`), une modale obligatoire et conviviale invite le coach à définir son mot de passe personnel.
  - Aucune mention visible du mot de passe `1234` sur la page publique de login coach.
  - Côté Admin (`/admin/coaches`) : bouton de réinitialisation 1-clic remettant `mustChangePassword: true` et le mot de passe `1234`.
  - **Interface & Expérience Coach** :
  - Accueil simplifié en 2 colonnes (Planning Tournant / Remplacements).
  - **Planning & Agenda épurés** : Affichage direct des horaires (ex. `18:00 – 19:30`), du groupe et du lieu. Aucun affichage de durée globale (ex. `1h30`) ni de mention "Facturé Xh" superflue dans l'agenda ou la modale d'absence.
  - Le chatbot IA d'assistance est **strictement masqué** dans l'espace coach pour laisser l'interface claire.
  - Guide d'utilisation officiel téléchargeable en PDF haute définition via `/api/guide-coach`.

### B. Moteur de Facturation des Coachs (`/coach/facturation`, `/admin/factures`)
- **Numérotation personnalisée par coach avec initiales** :
  - **Format officiel** : `F-TCC-AAAA-{INITIALES}-XXXX` (ex: `F-TCC-2026-JP-0001`, `F-TCC-2026-JP-0002` pour Julie Petrella ; `F-TCC-2026-FD-0002` pour Florian Di-Giusto).
  - **Initiales** : 2 lettres majuscules nettoyées (prénom + nom, sans accents ni tirets : Gaël Bernard -> `GB`, Chloé Quillet -> `CQ`, Florian Di-Giusto -> `FD`).
  - **Règle séquentielle pour existant** :
    - Chaque coach a sa propre suite séquentielle par an.
    - Si un coach a déjà une facture existante pour l'année (ex: facture 0001), sa prochaine facture démarre au numéro suivant (`0002`).
    - Pour un coach sans facture émise sur l'année, sa série démarre à `0001`.
  - **Inviolabilité stricte de l'existant** : Ne JAMAIS modifier, renommer ou écraser le numéro d'une facture déjà finalisée (`generee`, `envoyee`, `payee`). La facture `F-TCC-2026-0001` reste 100% intacte.
- **Épuration visuelle des lignes de facture (UI et PDF)** :
  - **Séances régulières** : Le sous-titre affiche uniquement le jour et les horaires (ex. `Vendredi 17:00 – 18:00`). Les bassins physiques et lignes d'eau (ex. `Grand Bassin - Ligne 1, Ligne 2`) sont strictement exclus car superflus.
  - **Créneaux tournants** : Le sous-titre affiche uniquement la date et les horaires (ex. `03/10/2026 · 11:00 – 12:30`). Le lieu (ex. `Piscine de Cavaillon`) est strictement exclu.
- **Règle d'arrondi des heures** : Arrondi strict à la demi-heure supérieure (`Math.ceil(minutes / 30) * 0.5`) sur tous les créneaux (fixes, remplacements, absences, tournants).
- **Date de rentrée sportive** :
  - Les séances fixes (`planningsFixe`) antérieures à la date officielle de reprise des cours (`settings.debutCoursNormal`, ex: 14 Septembre 2026) ne sont JAMAIS facturées.
  - Gestion spécifique possible pour le cours de sauvetage BNSSA (`settings.debutCoursBnssa`).
- **Gestion des Semaines Paires / Impaires** :
  - Les créneaux de planning avec `semaineImpaire: true` ne sont comptabilisés que les semaines calendaires impaires correspondantes.
- **Vacances & Séances Annulées** :
  - Les vacances scolaires avec `impacteFacturation: true` suspendent automatiquement les heures de cours régulières.
  - Les séances ponctuellement déclarées comme annulées (`seanceAnnulee`) sont soustraites automatiquement des heures travaillées.
- **Génération & Archivage PDF** :
  - Génération de factures PDF certifiées avec récapitulatif détaillé pour la comptabilité et les déclarations auto-entrepreneurs des éducateurs.
- **Workflow & Rôle Admin** :
  - La facture mensuelle reste en **Brouillon** tant qu'elle n'est pas officialisée.
  - **Génération et transmission en 1 clic** : Le bouton "Générer la facture" génère le PDF ET transmet directement la facture au club au statut `envoyee`. Il n'y a pas de bouton "Envoyer" séparé.
  - **Génération directe par l'Admin** : Depuis Admin > Factures (onglet *"⚡ Factures en cours & Génération"*), l'administrateur peut générer la facture à la place de chaque coach en 1 clic (statut `envoyee` direct avec transmission e-mail).
  - **Notification e-mail au club (`emailClub`)** : Reçue **UNIQUEMENT** lorsque la facture passe au statut **"Envoyée" (`envoyee`)** lors de cette génération directe. **AUCUN e-mail** en "Brouillon".
  - **Verrouillage post-envoi** : Dès que le statut est `envoyee`, la facture et ses séances sont verrouillées. Seul l'admin dispose du bouton "Déverrouiller" pour la repasser en brouillon si besoin.

### C. Remplacements, Vacations Tournantes & Prestations Manuelles
- **Onglet dédié en Admin** : **"Remplacements & Prestations"** (`/admin/remplacements`).
- **Prestations manuelles** : L'admin peut ajouter des vacations manuelles pour tout coach sélectionné (heures ponctuelles, indemnités, forfaits spécifiques). Elles s'intègrent instantanément dans la facture mensuelle en cours.
- **Déclaration d'absence & Remplacement** :
  - L'absence d'un coach déduit automatiquement les heures de sa facture et crédite le coach remplaçant qui a accepté la vacation.
- **Vacations tournantes du samedi (`EvenementTournant`)** :
  - Prise ou libération de créneaux en direct entre coachs avec verrouillage immédiat pour éviter les doublons.
- **Détection des conflits** : Vérification automatique des chevauchements d'horaires (`/api/coach/planning/check-conflit`).

### D. Compétitions FFN, LiveFFN & Déplacements
- **Barème officiel compétitions** : 40 € la demi-journée, 80 € la journée complète (forfait régional paramétrable).
- **Transport & Forfait kilométrique** : Calcul automatique selon la distance aller-retour et les bassins officiels enregistrés dans les paramètres admin (`lib/competition-distance.ts`).
- **Synchronisation iCal** : Flux d'export calendrier des compétitions et entraînements (`/calendrier/ical`, `/planning/ics`).
- **Connecteur LiveFFN (`lib/liveffn-parser.ts`)** :
  - Extraction automatique des résultats officiels des nageurs cavaillonnais depuis `liveffn.com`.
- **Rédaction assistée par IA & Instagram** :
  - Synthèse automatique des performances LiveFFN en article de presse chaleureux (`/api/admin/actualites/generate-competition-summary`).
  - Publication directe de l'article sur le compte Instagram du club via Meta Graph API (`/api/admin/actualites/instagram`).
- **Palmarès de Saison** : Module d'enregistrement des podiums, médailles et bilans annuels (`PodiumSaison`).

### E. Inscriptions & Tests de Nage (`/inscription`, `/tests-de-nage`)
- **Réservation publique** : Choix de créneau selon l'âge et le groupe ciblé (Sauv'nage, Pass'compétition, Perfectionnement, Maîtres).
- **Blocage manuel par l'Admin** : Bouton permettant de bloquer manuellement une séance même incomplète pour fermer les réservations (affiche le tampon "COMPLET" côté public).
- **Gestion des incidents piscine (fermetures inopinées)** :
  - Outil dédié pour notifier les familles par e-mail groupé en cas d'annulation technique.
  - Reprogrammation unitaire ou multi-sessions avec verrouillage pessimiste anti-collision pour prévenir tout surbooking.
  - Fusion de sessions de tests et relance des candidats non finalisés.
- **Association de niveau post-test** : Affectation directe d'un candidat évalué à son groupe d'entraînement pour fluidifier l'adhésion.
- **Fiches d'évaluation PDF officielles (`lib/pdf/test-nage-fiche-generator.ts`)** :
  - Fiches individuelles imprimables avec nom, date de naissance, téléphone des parents, grille d'évaluation 4 groupes cibles et programme de passage de la journée.
- **Éditeur dynamique de la page d'inscription** : Blocs modulaires configurables et réordonnables en admin (`/admin/inscription-page`).

### F. Vacances Scolaires Zone B & Règle d'Ajustement au Dimanche
- **Import automatisé** : Synchronisation avec l'API officielle `data.education.gouv.fr` pour la Zone B (Académie Aix-Marseille couvrant Cavaillon et le Vaucluse 84).
- **RÈGLE MÉTIER STRICTE DU CLUB (`adjustToSunday`)** :
  - Les vacances scolaires nationales débutent officiellement le samedi.
  - **Les entraînements du samedi ont toujours lieu au Triton Club Cavaillon**.
  - Le système décale donc automatiquement la date de début de fermeture au **dimanche suivant** (`adjustToSunday`), pour ne jamais annuler à tort les cours du samedi.

### G. Gestion des Devis & Recherche Entreprises (`/admin/devis`)
- **Module Devis Formations & Conventions** : Référence séquentielle `DEV-AAAA-XXXX` (SSA, BNSSA, entreprises).
- **Mentions légales & Conformité** : Exonération de TVA (art. 261-7-1° du CGI), modalités de règlement (virement / chèque), signature du club et RIB officiel Crédit Mutuel intégré au PDF.
- **Connecteur API Recherche Entreprises** :
  - Intégration de l'API officielle `https://recherche-entreprises.api.gouv.fr` pour l'auto-complétion instantanée des fiches entreprises (SIREN/SIRET, raison sociale, adresse légale) avec cache mémoire de 5 minutes.

### H. Comptabilité, Trésorerie & Reçus Fiscaux de Dons (CERFA)
- **Exercice comptable calé sur la saison sportive** : 12 mois du **1er août au 31 juillet** (`season-utils.ts`).
- **Calcul de saison sportive** : De Juillet de l'année N à Juin de l'année N+1 ==> `Saison N - N+1` (`getCurrentSeasonLabel`).
- **Mode Inter-saison** : S'active automatiquement du 30 juin au 15 septembre (ou pilotage manuel admin via `manualSetting`).
- **Analyse financière & Coût des groupes** :
  - Bilan prévisionnel vs réalisé, projections de trésorerie, ventilation par catégories comptables.
  - Calcul du coût de revient par groupe / jauge d'adhérents (`cout-saison`).
  - Import et archivage des justificatifs bancaires dans `/uploads/justificatifs/`.
- **Mécénat & Reçus Fiscaux de Dons (CERFA 11580*05)** :
  - Format séquentiel officiel `TCC-AAAA-00001`.
  - Réduction fiscale légale : 66% pour les particuliers (dans la limite de 20% du revenu imposable) et 60% pour les entreprises.
  - Génération PDF normalisée avec signature électronique du Président / Trésorière.

### I. Boutique Officielle & Paiements Stripe
- **Catalogue complet du club** : Bonnets, maillots, parkas, sacs de natation et textiles officiels.
- **Variantes & Personnalisation** : Tailles, couleurs et option de personnalisation prénom (flocage officiel).
- **Tri naturel des tailles** : Ordre ergonomique garanti : `XS` -> `S` -> `M` -> `L` -> `XL` -> `XXL`.
- **Tunnel de commande Click & Collect** : Paiement en ligne sécurisé via Stripe Checkout (carte bancaire), validation et mise à jour des stocks par Webhooks sécurisés (`/api/checkout/webhook`).
- **Suivi fournisseur** : Tableau récapitulatif des commandes par fournisseur pour lancer les réassorts (`/api/admin/boutique/recap-fournisseur`).
- **E-mails acheteurs** : Notifications automatiques avec récapitulatif de la commande et date estimée de mise à disposition à la piscine.

### J. Chatbot IA d'Assistance Visiteurs (`/api/chat`)
- **Moteur IA** : Modèle Mistral AI orchestré par Genkit avec température ultra-basse (**0.1**) pour éliminer les hallucinations.
- **Règle de Vérité Terrain (RAG Hybride)** :
  - Connecté à la base de connaissances dynamique (`ChatbotKnowledge`) synchronisée avec 11 sources officielles du club (horaires, tarifs, groupes, événements, tests, coordonnées, bassins).
  - Masqué dans l'espace coach (`/coach`) et désactivable en intersaison.
- **Supervision Admin** :
  - Console de test direct en administration, tableau des suggestions non résolues et suivi de consommation de tokens (`ChatbotTokenLog`).

### K. Audience & Respect RGPD
- **Analytics interne privacy-first** : Table `Visite` (`/api/analytics/track`) sans aucun cookie tiers, sans transmission externe, 100% conforme aux directives de la CNIL et au RGPD.

### L. Structure & Ergonomie de l'Espace Administration (`/admin`)
- **Hiérarchie et priorité des pôles** :
  1. **Pôle 1 : Finances & Comptabilité** (Factures coachs, Devis & conventions, Trésorerie & bilans, Reçus fiscaux CERFA).
  2. **Pôle 2 : Équipe & Gestion sportive** (Gestion des coachs, Remplacements & vacations, Planning régulier, Séances annulées).
  3. **Pôles suivants** : Adhérents & Inscriptions, Communication & Événements, Configuration & Système.

---

## 📦 5. COMMANDES CLÉS DU PROJET

```bash
# Développement local
npm run dev

# Tests automatisés
npx vitest run

# Vérification du typage & build de production
npm run build

# Synchronisation du schéma Prisma vers PostgreSQL
npx prisma db push

# Accès à l'interface graphique de la base de données
npx prisma studio

# Déploiement VPS (sur 146.59.239.75, connexion: ssh debian@146.59.239.75)
sudo git -C /root/docker/site_triton pull origin main
sudo docker compose -f /root/docker/site_triton/docker-compose.vps.yml build web
sudo docker compose -f /root/docker/site_triton/docker-compose.vps.yml up -d web

# Maintenance disque VPS (en cas de saturation d'espace)
sudo docker builder prune -af
sudo docker image prune -f
```
