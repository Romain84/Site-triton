# 📋 Cahier des Charges Fonctionnel & Technique — Triton Club Cavaillon v2.0

**Version** : 2.0.0  
**Date** : Septembre 2026  
**Statut** : En Production  
**Domaine officiel** : [https://tritoncavaillon.fr](https://tritoncavaillon.fr)  
**Hébergement** : VPS OVH Dédié (`146.59.239.75`), conteneurs Docker (`triton-web-prod` & `triton-postgres-prod`).

---

## 1. 📌 Présentation & Objectifs Généraux

Le **Triton Club Cavaillon** est une association sportive affiliée à la Fédération Française de Natation (FFN), dispensant des cours de natation (école de natation, perfectionnement, natation synchronisée, aquagym/aquafitness, compétitions et formations sauvetage BNSSA/SSA) à la piscine municipale Alphonse Roudière de Cavaillon (84).

La plateforme web v2.0 a pour objectifs :
1. **Informer le grand public** : Vitrine moderne, actualités, calendrier des compétitions FFN, planning hebdomadaire interactif, tarifs et horaires.
2. **Faciliter les adhésions & tests de nage** : Réservation en ligne des tests de niveau avec gestion des quotas et blocage manuel par les administrateurs.
3. **Espace Coachs dédié** : Gestion des créneaux tournants, déclarations et acceptations de remplacements en temps réel, facturation mensuelle transparente (heures, forfaits compétitions, déductions de remplacements).
4. **Administration complète du Club** : Gestion des groupes, plannings, coachs, boutique en ligne avec Stripe, suivi comptable des recettes/dépenses, et émission des reçus fiscaux de dons (CERFA 11580*05).

---

## 2. 👥 Acteurs & Périmètre Fonctionnel

### A. Visiteurs & Adhérents
- **Accueil & Présentation du Club** : Actualités récentes, prochains événements/compétitions, galerie photos et liens institutionnels.
- **Planning interactif** : Filtrage par jour, heure, lieu, bassin et groupe d'entraînement.
- **Calendrier des Compétitions** : Liste complète des compétitions FFN et événements club avec fiches récapitulatives et règlements PDF.
- **Tests de Nage & Inscription** : Sélection d'un créneau de test selon le niveau et l'âge de l'enfant, notification par email et génération de fiche.
- **Boutique Officielle du Club** : Consultation des équipements du club (bonnets, maillots, parkas), choix des variantes (tailles, couleurs, flocage personnalisé du prénom), paiement sécurisé Stripe.

### B. Coachs & Éducateurs Sportifs (`/coach`)
- **Connexion sécurisée simplifiée** :
  - Mot de passe initial provisoire standardisé : `1234`.
  - Modale automatique invitant à personnaliser son mot de passe dès la 1ère connexion (`mustChangePassword`).
- **Gestion des séances & remplacements (Interface 2 colonnes)** :
  - Colonne 1 : Créneaux tournants (prendre ou libérer une vacation).
  - Colonne 2 : Déclaration d'un besoin de remplaçant ou acceptation d'une séance proposée par un collègue.
- **Facturation & Rémunération** :
  - Récapitulatif mensuel précis des heures fixes, remplacements effectués (+) ou subis (-), et forfaits compétitions (demi-journées / régionales).
  - Téléchargement du PDF récapitulatif mensuel et synchronisation Abby.

### C. Administrateurs & Bureau du Club (`/admin`)
- **Gestion des Coachs** : Fiche profil, SIRET, spécialités, taux horaire, réinitialisation du mot de passe en mode "1ère connexion".
- **Gestion des Plannings & Groupes** : Affectation des bassins et des horaires, synchronisation des catégories d'âge et des couleurs.
- **Gestion des Tests de Nage** : Suivi des inscrits, validation des passages de niveau, et bouton de **blocage manuel d'une séance** pour stopper les réservations.
- **Facturation & Validation** : Génération manuelle et envoi par email au club des factures mensuelles des coachs.
- **Boutique & Commandes** : Gestion du catalogue, stocks, variantes, suivi des commandes payées Stripe et préparation.
- **Comptabilité & Finances** : Saisie des écritures comptables, ventilation par catégorie, bilan prévisionnel vs réalisé, et génération des reçus fiscaux de dons Cerfa.

---

## 3. 🏗️ Architecture Technique & Infrastructure

### Stack Applicative
- **Framework** : Next.js 16 (App Router, Server Components & Server Actions)
- **Langage** : TypeScript strict
- **UI / Design** : React 19, Tailwind CSS v4, Lucide React, Framer Motion
- **ORM** : Prisma 7 avec adaptateur `@prisma/adapter-pg` et pool PostgreSQL natif
- **Base de données** : PostgreSQL 16 Alpine
- **Paiements** : Stripe API & Webhooks
- **Emails** : Nodemailer SMTP
- **PDF** : jsPDF + autoTable

### Hébergement & Déploiement
- **Serveur Dédié / VPS** : OVH Debian 13 (`146.59.239.75` / `vps-248c64f5.vps.ovh.net`)
- **Orchestration** : Docker & Docker Compose (`docker-compose.vps.yml`)
  - Conteneur applicatif : `triton-web-prod`
  - Conteneur base de données : `triton-postgres-prod` (Volume persistant `pgdata`)
- **Sécurité SSL & Proxy** : Nginx Reverse Proxy + Certbot Let's Encrypt
- **Maintenance du Disque** : Timer hebdomadaire systemd `docker-prune.timer` pour purger les caches de compilation Docker.
- **Sauvegardes** : Snapshots compressés quotidiens de la base PostgreSQL vers `/root/backups` avec rétention de 10 jours.

---

## 4. 🗄️ Modèle de Données Clé (Prisma)

- `Coach` : Données profil, taux horaire, SIRET, Abby, `mustChangePassword`, relations plannings et factures.
- `Planning` : Créneaux hebdomadaires, jour, heure, lieu, groupe associé.
- `CoachPlanning` : Table de jointure entre coachs et créneaux de planning.
- `EvenementTournant` : Créneaux rotatifs gérés de façon dynamique entre coachs.
- `Remplacement` : Demandes de remplacement entre coachs avec horodatage, statut et motif.
- `FactureCoach` & `LigneFactureCoach` : Historique des relevés mensuels émis.
- `CandidatTestNage` : Inscriptions aux tests de niveau avec validation admin.
- `Produit` & `VarianteProduit` : Catalogue boutique, stocks, attributs.
- `Commande` & `LigneCommande` : Commandes boutique validées avec Stripe ID.
- `TransactionComptable` & `CategorieComptable` : Grand livre comptable de l'association.
- `Don` : Reçus fiscaux de dons aux œuvres avec numérotation légale séquentielle.
