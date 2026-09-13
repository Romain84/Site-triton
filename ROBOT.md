# 🤖 Directives & Règles pour Agents IA (ROBOT.md)
# Projet : Triton Club Cavaillon (Site Web & Plateforme)

Ce document constitue la référence absolue pour tout agent IA (Antigravity, Cursor, Claude, etc.) intervenant sur le projet `Site_New_TRITON-`.

---

## 🚨 RÈGLES D'OR D'INFRASTRUCTURE (NE JAMAIS OUBLIER)

1. **AUCUN Vercel, AUCUN Supabase** :
   - Le site de production **https://tritoncavaillon.fr** est hébergé sur un **serveur VPS OVH** dédié (`146.59.239.75` / `vps-248c64f5.vps.ovh.net`).
   - Le déploiement s'effectue via **Docker & Docker Compose** (`docker-compose.vps.yml`).
   - La base de données de production est un conteneur **PostgreSQL 16 Alpine** (`triton-postgres-prod`), relié au conteneur web (`triton-web-prod`).
   - Ne JAMAIS réintroduire d'URL Supabase ou de configuration Vercel Database.

2. **Environnement Local vs Production** :
   - **En local** : Le fichier `.env` utilise PostgreSQL local sur `postgresql://postgres:TritonNewSite84@localhost:5432/postgres`.
   - **Sur le VPS** : La variable `DATABASE_URL` dans Docker pointe vers `postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/postgres?schema=public`.
   - **ORM** : Le projet utilise **Prisma 7** avec l'adaptateur `@prisma/adapter-pg` et `pg.Pool` (`lib/prisma.ts`).

3. **Gestion du disque dur sur le VPS** :
   - Lors de builds Docker répétés sur le VPS, l'espace disque peut se saturer si le cache n'est pas purgé.
   - Une tâche planifiée `systemd` (`docker-prune.timer`) nettoie le cache chaque semaine.
   - En cas d'intervention manuelle sur le VPS : `sudo docker builder prune -af` et `sudo docker image prune -f`.

---

## 🛠️ STACK TECHNIQUE

- **Framework** : Next.js 16 (App Router) + React 19 + TypeScript
- **Styling** : Tailwind CSS v4 + Framer Motion + Lucide React
- **ORM & DB** : Prisma 7.9+ + PostgreSQL 16
- **Adaptateur Prisma** : `@prisma/adapter-pg` avec `pg.Pool` (obligatoire en Prisma 7)
- **Authentification** : Sessions chiffrées (cookies sécurisés HTTP-Only) + bcrypt
- **Paiements** : Stripe Checkout & Webhooks (Boutique & Séances)
- **Emails** : Nodemailer (SMTP OVH / Gmail)
- **PDFs** : jsPDF + jspdf-autotable (Reçus dons Cerfa, factures coachs, etc.)
- **IA Locale** : Mistral AI via Genkit (chatbot d'assistance visiteurs)

---

## 🏊 ARCHITECTURE & RÈGLES MÉTIER DU CLUB

### 1. Espace Coachs (`/coach`)
- **Authentification initiale** :
  - Tout nouveau coach (ou coach réinitialisé) se connecte avec le mot de passe provisoire **`1234`**.
  - Dès sa première connexion (`mustChangePassword: true`), une modale obligatoire et conviviale l'invite à définir son mot de passe personnel.
  - Côté Admin (`/admin/coaches`) : un bouton permet de réinitialiser le mot de passe d'un coach comme s'il s'agissait de sa 1ère connexion.
- **Planning & Remplacements** :
  - L'interface coach intègre en 2 colonnes les créneaux tournants et la déclaration/acceptation de remplaçant.
  - Le chatbot Mistral est masqué dans l'espace coach pour laisser l'interface claire.
- **Facturation Coachs (`/coach/facturation`, `/admin`)** :
  - **Date de début de saison** : Les séances récurrentes hebdomadaires (`planningsFixe`) et les heures administratives antérieures à la date de début de saison (`settings.debutCoursNormal`, ex: 14 Septembre 2026) ne sont **JAMAIS** comptabilisées dans la facture.
  - **Workflow de facturation manuelle** :
    - La facture mensuelle reste en **Brouillon** tant qu'elle n'est pas officialisée.
    - Le coach clique sur le bouton **"Générer la facture"** pour officialiser le document (attribution du numéro `F-TCC-AAAA-XXXX`, calcul officiel et génération du PDF).
    - Le bouton **"Envoyer au club"** permet ensuite de transmettre la facture par e-mail au secrétariat du club (`emailClub`).
  - **Règles de modification & verrouillage strict** :
    - Tant que la facture est générée mais **non envoyée**, elle **peut être modifiée** (ajout/suppression de prestations ou compétitions), avec un bouton **"Régénérer"** pour actualiser le PDF officiel avant transmission.
    - Dès que la facture est **envoyée au club (`envoyee`)**, **TOUT EST STRICTEMENT BLOQUÉ** : aucun ajout, aucune suppression ni modification n'est permise. Seul le téléchargement du PDF officiel transmis reste accessible.

### 2. Inscriptions & Tests de Nage (`/inscription`, `/admin/tests-nage`)
- Le public peut réserver un créneau de test de nage.
- Côté Admin, un bouton permet de **bloquer manuellement une séance** même si elle n'est pas complète, afin d'empêcher de nouvelles inscriptions dessus.

### 3. Boutique Club (`/boutique`, `/admin/boutique`)
- Produits du club avec variantes (tailles, couleurs, flocage personnalisé).
- Gestion des stocks et commandes reliées à Stripe.

### 4. Comptabilité & Trésorerie (`/admin/finances`)
- Catégorisation double-partie, suivi des encaissements / décaissements.
- Gestion des reçus fiscaux de dons (CERFA) avec signature électronique du Président / Trésorière.

---

## 📦 COMMANDES CLÉS DU PROJET

```bash
# Développement local
npm run dev

# Vérification du typage & build
npm run build

# Synchronisation du schéma Prisma vers PostgreSQL
npx prisma db push

# Accès visuel Prisma Studio
npx prisma studio

# Déploiement VPS (depuis /root/docker/site_triton)
git pull origin main
docker compose -f docker-compose.vps.yml build --no-cache web
docker compose -f docker-compose.vps.yml up -d
```
