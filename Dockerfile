# syntax=docker/dockerfile:1

# --- Build stage: full toolchain -----------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# prisma/ doit être présent AVANT le npm ci : le postinstall (`prisma generate`)
# a besoin de prisma/schema.prisma pour s'exécuter, même en stage builder.
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
# Assertion de build : échoue bruyamment ici plutôt que de livrer une image
# runtime sans dist/main.js (déjà arrivé, symptôme découvert seulement au
# démarrage du conteneur en prod).
RUN test -f dist/main.js || (echo "ERREUR: dist/main.js absent après npm run build" >&2 && ls -la dist && exit 1)

# --- Runtime stage: prod deps + compiled output only ----------------------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
# prisma/ doit être présent AVANT le npm ci : le postinstall (`prisma generate`)
# a besoin de prisma/schema.prisma pour s'exécuter.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# `prisma` (CLI) est en dependency (pas devDependency) : nécessaire pour que
# `npx prisma migrate deploy` tourne depuis cette image (service `migrate` du
# docker-compose de prod), sans re-builder depuis les sources sur le serveur.
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN test -f dist/main.js || (echo "ERREUR: dist/main.js absent après COPY --from=builder" >&2 && ls -la dist && exit 1)
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
