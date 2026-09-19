# syntax=docker/dockerfile:1

# --- Build stage: full toolchain -----------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

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
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
