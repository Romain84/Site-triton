# Triton Club Cavaillon - Site Web Next.js

Site web moderne pour le Triton Club Cavaillon, converti d'Eleventy vers Next.js 16.

## 🚀 Technologies utilisées

- **Next.js 16** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **Prisma** - ORM pour la base de données
- **PostgreSQL** - Base de données (tous les environnements)
- **Zod** - Validation des données
- **bcrypt** - Hachage des mots de passe

## 📦 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/Romain84/Site_TRITON.git
cd Site_TRITON
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer la base de données (PostgreSQL)

Copiez le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Puis renseignez la variable `DATABASE_URL` avec votre instance PostgreSQL :

```env
DATABASE_URL="postgresql://username:password@localhost:5432/triton_club"
```

> ℹ️ Le runtime Prisma du projet utilise PostgreSQL via `pg` + `@prisma/adapter-pg` en développement comme en production.

### 4. Initialiser la base de données

```bash
# Créer la structure de la base de données
npm run db:push

# Remplir avec les données de démonstration
npm run db:seed
```

### 5. Lancer le serveur de développement

```bash
npm run dev
```

Le site sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
├── app/                    # Pages Next.js (App Router)
│   ├── actualites/        # Page et détails des actualités
│   ├── evenements/        # Page et détails des événements
│   ├── calendrier/        # Calendrier des événements
│   ├── planning/          # Planning des cours
│   ├── inscription/       # Formulaire d'inscription
│   ├── admin/             # Interface d'administration
│   └── api/               # API Routes
├── components/            # Composants React réutilisables
├── lib/                   # Utilitaires (Prisma, etc.)
├── prisma/                # Schéma et migrations de la base de données
├── public/                # Fichiers statiques (images, PDF)
└── old/                   # Ancien site Eleventy (archive)
```

## 🔐 Accès admin

Par défaut, un compte admin est créé avec le seed :

- **Email** : `admin@triton-club.fr`
- **Mot de passe** : `admin123`

⚠️ **IMPORTANT** : Changez ce mot de passe en production !

## 🛠️ Scripts disponibles

```bash
npm run dev          # Lancer le serveur de développement
npm run build        # Build pour la production
npm run start        # Lancer le serveur de production
npm run lint         # Linter le code
npm run db:push      # Synchroniser le schéma Prisma avec la DB
npm run db:studio    # Ouvrir Prisma Studio (interface visuelle)
npm run db:seed      # Remplir la DB avec des données de test
```

## 📧 Configuration des emails

Pour activer l'envoi d'emails (confirmations d'inscription, etc.), configurez les variables d'environnement dans `.env` :

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="votre-email@gmail.com"
SMTP_PASSWORD="votre-mot-de-passe-app"
SMTP_FROM="Triton Club Cavaillon <noreply@triton-club.fr>"
```

### Configuration Gmail

1. Activez la validation en 2 étapes sur votre compte Gmail
2. Générez un "Mot de passe d'application" : https://myaccount.google.com/apppasswords
3. Utilisez ce mot de passe dans `SMTP_PASSWORD`

## 🚀 Déploiement sur VPS OVH

### 1. Installer les dépendances sur le serveur

```bash
# Installer Node.js (version 18+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Installer PM2 pour gérer le processus
sudo npm install -g pm2
```

### 2. Configurer PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base de données et l'utilisateur
CREATE DATABASE triton_club;
CREATE USER triton_user WITH ENCRYPTED PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE triton_club TO triton_user;
\q
```

### 3. Déployer l'application

```bash
# Cloner le repository
git clone https://github.com/Romain84/Site_TRITON.git
cd Site_TRITON

# Installer les dépendances
npm install

# Configurer .env avec PostgreSQL
nano .env  # Ajustez DATABASE_URL et autres variables

# Initialiser la base de données
npm run db:push
npm run db:seed

# Build l'application
npm run build

# Lancer avec PM2
pm2 start npm --name "triton-club" -- start
pm2 save
pm2 startup
```

### 4. Configurer Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name votre-domaine.fr;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 TODO - Fonctionnalités à venir

- [ ] Interface d'administration complète
- [ ] Système d'authentification avec NextAuth
- [ ] Génération de factures PDF
- [ ] Envoi automatique d'emails
- [ ] Upload d'images pour les actualités/événements
- [ ] Gestion des paiements en ligne

## 🆘 Support

Pour toute question ou problème :
- Email : admin@triton-club.fr
- GitHub Issues : https://github.com/Romain84/Site_TRITON/issues

## 📄 Licence

© 2025 Triton Club Cavaillon. Tous droits réservés.
