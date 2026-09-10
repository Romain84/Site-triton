# Triton Club Cavaillon — Site Web & Plateforme Numérique

Plateforme web officielle et système de gestion intégrée pour le **Triton Club Cavaillon** (club de natation affilié FFN, natation course, artistique, aquagym, sauvetage SSA).

🌐 **Site officiel en production** : [https://tritoncavaillon.fr](https://tritoncavaillon.fr)  
📋 **Cahier des charges complet** : Consulter [CAHIER-DES-CHARGES.md](./CAHIER-DES-CHARGES.md)  
🤖 **Directives d'architecture & IA** : Consulter [ROBOT.md](./ROBOT.md)

---

## 🚀 Technologies utilisées

- **Next.js 16** (App Router, Server Actions, Server Components)
- **React 19** & **TypeScript**
- **Tailwind CSS v4** & **Framer Motion** (Interface moderne, responsive)
- **Prisma 7** avec adaptateur natif `@prisma/adapter-pg`
- **PostgreSQL 16** (Alpine Linux en production Docker)
- **Stripe** (Paiements sécurisés pour la boutique en ligne)
- **jsPDF & autoTable** (Génération PDF des factures coachs et reçus de dons fiscaux CERFA)
- **Nodemailer** (Notifications automatiques par e-mail)
- **Genkit & Mistral AI** (Chatbot intelligent d'accueil des visiteurs)

---

## 📦 Architecture & Déploiement en Production

Le site de production ne dépend d'aucun service tiers type Vercel ou Supabase : il est hébergé en toute autonomie sur un **serveur VPS OVH dédié** (`vps-248c64f5.vps.ovh.net` / `146.59.239.75`).

### Déploiement via Docker Compose

Le fichier de production utilisé sur le serveur est `docker-compose.vps.yml` :
- **`triton-postgres-prod`** : Conteneur PostgreSQL 16 Alpine avec volume persistant `pgdata`.
- **`triton-web-prod`** : Conteneur Node 20 / Next.js exécutant `npm run start`.
- **Nginx Reverse Proxy** : Gère les certificats Let's Encrypt SSL et achemine le trafic vers le port `3000`.
- **Maintenance automatique** : Service et timer systemd `docker-prune.timer` pour nettoyer automatiquement le cache de compilation Docker chaque semaine et préserver l'espace disque.
- **Sauvegardes automatiques** : Script quotidien compressant la base PostgreSQL vers `/root/backups` avec rétention de 10 jours.

---

## 🛠️ Développement Local

### 1. Prérequis
- Node.js 20+
- PostgreSQL local en cours d'exécution (port 5432)

### 2. Configuration locale (`.env`)
```env
DATABASE_URL="postgresql://postgres:TritonNewSite84@localhost:5432/postgres"
NEXT_PUBLIC_URL="http://localhost:3000"
```

### 3. Commandes courantes

```bash
# Installer les dépendances
npm install

# Synchroniser le schéma Prisma avec PostgreSQL
npx prisma db push

# Lancer l'interface Prisma Studio
npx prisma studio

# Lancer le serveur de développement Next.js
npm run dev

# Tester et compiler pour la production
npm run build
```

---

## 🌟 Fonctionnalités Principales Déployées

1. **Espace Public** :
   - Présentation du club, historique, équipe et contacts.
   - Planning hebdomadaire des cours avec filtre par niveau, âge et bassin.
   - Calendrier dynamique des compétitions FFN et événements club.
   - Galerie photos & vidéos.
   - Chatbot d'orientation propulsé par Mistral AI.
2. **Inscriptions & Tests de Nage** :
   - Prise de rendez-vous en ligne pour les tests de niveau.
   - Contrôle des quotas et blocage manuel d'un créneau côté admin.
3. **Espace Coachs (`/coach`)** :
   - Connexion initiale avec le code temporaire `1234` et personnalisation obligatoire dès l'accueil.
   - Interface en 2 colonnes pour la gestion des créneaux tournants et des remplacements.
   - Facturation mensuelle transparente (calcul précis des heures, déductions de remplacements subis, ajouts de remplacements effectués, forfaits compétitions).
4. **Administration Intégrale (`/admin`)** :
   - Gestion des plannings, des groupes et des bassins fréquents.
   - Gestion des coachs avec réinitialisation de mot de passe en 1 clic.
   - Boutique du club, gestion des stocks par variante, commandes Stripe.
   - Module de Trésorerie et génération de reçus fiscaux de dons (CERFA 11580*05).

---

## 📄 Licence

© 2026 Triton Club Cavaillon. Tous droits réservés.
