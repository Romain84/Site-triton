# Etape 1 : Installation des dépendances
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Etape 2 : Construction de l'application
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Dummy DATABASE_URL to prevent crash during Next.js/Prisma build
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Build arguments for client-side NEXT_PUBLIC_ variables
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npx prisma generate
RUN npx tsc prisma/seed.ts --target es2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0
RUN npm run build
RUN npm prune --omit=dev


# Etape 3 : Image finale de production (ultra-légère)
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl su-exec
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Création de l'utilisateur et groupe non-privilégiés
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copier uniquement les fichiers nécessaires au fonctionnement
COPY package*.json ./
COPY prisma.config.js ./
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/chatbot_knowledge.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Configuration des dossiers persistants et attribution des droits
RUN mkdir -p /app/public/uploads /app/backups && \
    chown -R nextjs:nodejs /app

EXPOSE 3000

# Commande de démarrage
CMD ["npm", "run", "start"]
