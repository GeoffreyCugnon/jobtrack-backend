# JobTrack — Backend

API du CRM de recherche d'emploi JobTrack : authentification, offres d'emploi, candidatures, entretiens, documents, entreprises, réseau professionnel, publications.

Repo Git séparé du frontend (`../Frontend`) — pas un monorepo, pas de dépendances partagées. La messagerie est gérée par un micro-service indépendant (`../Microservices/messagerie`) ; ce Backend se contente de lui fournir un jeton dédié (`GET /auth/messaging-token`).

## Stack

- NestJS 11, TypeScript
- Prisma 7 — datasource MySQL, adaptateur `@prisma/adapter-mariadb`
- Auth JWT maison (`@nestjs/jwt` + garde `AuthGuard` custom, pas Passport) — access + refresh token (cookie `httpOnly`), hash des mots de passe en argon2
- class-validator / class-transformer — `ValidationPipe` global strict (`whitelist`, `forbidNonWhitelisted`)
- Vitest pour les tests
- ESLint + Prettier
- Collection Bruno (`bruno/`) pour tester les endpoints manuellement

## Prérequis

- Node.js LTS
- Une base MySQL accessible (voir `DATABASE_URL`)

## Installation

```bash
npm install
```

`postinstall` exécute automatiquement `prisma generate`.

### Variables d'environnement (`.env`)

- `DATABASE_URL` — connexion MySQL
- `ACCESS_SECRET_KEY` / `ACCESS_JWT_EXPIRE` / `REFRESH_SECRET_KEY` / `REFRESH_JWT_EXPIRE` — JWT access/refresh
- `MESSAGING_JWT_SECRET` / `MESSAGING_JWT_EXPIRE` — jeton dédié pour MS-Messagerie (doit être strictement identique au secret configuré côté MS-Messagerie)
- `PROD` — conditionne l'attribut `secure` du cookie de refresh
- `FRONTEND_URL` — utilisé pour construire le lien de réinitialisation de mot de passe (fallback `http://localhost:5173`)
- `PORT` — port d'écoute (`3000` par défaut)

Ne jamais committer, logger ou afficher les valeurs réelles.

## Lancement

```bash
npm run start:dev   # watch mode, port 3000 par défaut
npm run start       # sans watch
npm run start:prod  # depuis dist/
```

## Tests

```bash
npm run test        # unitaires (Vitest)
npm run test:watch
npm run test:cov
npm run test:e2e
```

## Scripts utiles

- `npm run lint` — ESLint avec `--fix`
- `npm run format` — Prettier sur `src/` et `test/`
- `npm run prisma:seed` — entreprises + offres de démo
- `npm run prisma:seed:categories` — référentiel `Job_category` (idempotent)
- `npm run prisma:seed:connections` — relations de démo entre membres
- `npm run prisma:seed:avatars` — avatars de démo
- `npm run prisma:seed:admin` — (ré)insère un 2e compte admin de démo
- `npm run prisma:seed:company-logos` — logos à initiales (DiceBear, hors ligne) pour les entreprises sans logo
- `npm run prisma:seed:applications` — candidatures de démo réparties sur les offres

## Organisation des modules

`auth`, `application`, `comment`, `company`, `connection`, `dashboard`, `document`, `interview`, `job_category`, `job_offering`, `notification`, `publication`, `role`, `skill`, `user`, plus `utils/` (filtres d'exception, enums Prisma partagés, vérification de propriété, formatage de dates relatives).

## Sécurité

- `@UseGuards(AuthGuard)` posé sur tous les contrôleurs (au niveau classe, sauf `company`/`job_offering` au niveau méthode avec `findAll`/`findOne` publics volontairement).
- Vérification de propriété (l'utilisateur ne peut agir que sur ses propres ressources) sur `user`, `notification`, `connection`, `publication`, `application`, `document`, `comment`, `interview`, `job_offering`, `company`.
- Toute route qui renvoie un `User` doit passer par un mécanisme « safe » (`findOneSafeOrThrow` / `toSafeUser()`) — jamais l'entité Prisma brute (hash de mot de passe, tokens).

## Projet

Projet solo (Jeff), repris après un développement initial à deux. Plus de suivi par tickets — commits réguliers.

Pour les conventions détaillées, la dette technique connue et l'historique des choix d'architecture, voir [`CLAUDE.md`](./CLAUDE.md) et [`JobTrack/CLAUDE.md`](../CLAUDE.md) (workflow partagé avec le Frontend).
