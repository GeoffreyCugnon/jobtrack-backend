# JobTrack — Backend

API du CRM de recherche d'emploi JobTrack. Repo Git **séparé** du frontend (`../Frontend`) — pas un monorepo, pas de dépendances partagées entre les deux. Connecté à GitLab (dépôt distant en SSH) et ouvert dans l'IDE via Claude Code — c'est là qu'a eu lieu l'audit complet dont ce fichier reprend les conclusions.

## Stack

- NestJS 11, TypeScript
- Prisma 7.8 — datasource MySQL (`schema.prisma`), adaptateur `@prisma/adapter-mariadb`
- Auth JWT maison : `@nestjs/jwt` + `passport`/`passport-jwt` en dépendance mais garde custom (voir plus bas), hash des mots de passe avec **argon2** (bcrypt a été retiré)
- class-validator / class-transformer pour la validation des DTO — `ValidationPipe` global en mode strict (`whitelist: true, forbidNonWhitelisted: true`) : tout champ non déclaré dans un DTO fait échouer la requête, donc les DTO doivent être exhaustifs
- **Vitest** pour les tests (migré depuis Jest) : `test`, `test:watch`, `test:cov`, `test:e2e` passent tous par `vitest`
- ESLint + Prettier
- Collection Bruno (`bruno/`) pour tester les endpoints manuellement

## Schéma de données

`prisma/schema.prisma` : modèles en **PascalCase** (`Application`, `Job_offering`, `Skill`, `User`...), mais champs et enums restent en **snake_case** (`user_id`, `created_at`, `Application_status`). Pas de `@@map` explicite — les noms de table réels en MySQL doivent donc correspondre au nom du modèle tel quel ; ça fonctionne tant que la collation est insensible à la casse (par défaut sur Windows/MySQL), à vérifier si un déploiement change cet environnement.

Modèles : `User`, `User_skill`, `Skill`, `Company`, `Company_follower`, `Contact`, `Employment`, `Job_offering`, `Application`, `Application_document`, `Document`, `Interview`, `Message`, `Comment`, `Publication`, `Connection`, `Notification`, `Role`. Le modèle `event` a été supprimé (le module `events` correspondant aussi — voir plus bas).

Les fichiers `*.entities.ts` générés par `nest generate resource` restent quasi vides et **ne sont pas utilisés** : les services utilisent directement les types générés par Prisma (`../../prisma/generated/prisma/client`). Pas la peine de les étoffer.

## Module Auth (nouveau)

`src/auth/` implémente un flux JWT access + refresh complet :

- `POST /auth/register` — hash du mot de passe (argon2) puis création via `UserService`
- `POST /auth/login` — vérifie le mot de passe, génère access + refresh token, stocke le refresh token en DB sur l'utilisateur, le renvoie dans un cookie `httpOnly` scopé à `/auth/refresh`
- `POST /auth/refresh` — relit le cookie, revérifie le JWT, compare au refresh token stocké en DB
- `PATCH /auth/password` — protégé par `AuthGuard`, nécessite l'ancien mot de passe

Points d'attention :
- Le cookie de refresh token est parsé **manuellement** depuis `request.headers.cookie` (`extractTokenFromCookie`) — il n'y a pas de middleware `cookie-parser` installé. Ne pas ajouter `request.cookies` en supposant qu'il existe sans avoir vérifié.
- `AuthGuard` est une garde maison (extraction du header `Authorization: Bearer`), pas la stratégie Passport standard, même si `passport`/`passport-jwt` sont en dépendance.
- Secrets et durées de vie des tokens attendus en env : `ACCESS_SECRET_KEY`, `ACCESS_JWT_EXPIRE`, `REFRESH_SECRET_KEY`, `REFRESH_JWT_EXPIRE`, plus `PROD` (conditionne `httpOnly`) et `PORT`. Ne jamais afficher ni committer les valeurs réelles (`.env`).
- CORS activé dans `main.ts` uniquement pour `http://localhost:5173` avec `credentials: true` — cohérent avec le port du frontend, mais à mettre à jour si l'origine change.

## Gestion d'erreurs centralisée (nouveau)

Deux filtres globaux enregistrés dans `main.ts` :
- `utils/exceptions/http.filter.ts` — formate toute `HttpException` en réponse JSON standard (`statusCode`, `timestamp`, `path`, `message`).
- `utils/exceptions/prisma.filter.ts` — traduit les erreurs Prisma connues (`utils/enum/prismaError.ts` : `P2025`/`P2002`/`P2003`) en réponses HTTP appropriées (404/409/400) avec un message exploitable côté client.

Réutiliser ces filtres plutôt que du `try/catch` ad hoc dans les services pour les erreurs Prisma courantes (contrainte unique, clé étrangère, enregistrement introuvable).

## Organisation des modules

Modules renommés au singulier lors de l'audit (`applications` → `application`, `jobs` → `job_offering`, `competences` → `skill`, etc.). Liste actuelle : `application`, `auth`, `comment`, `company`, `connection`, `contact`, `document`, `employment`, `interview`, `job_offering`, `message`, `notification`, `publication`, `role`, `skill`, `user`, plus `utils/` (filtres d'exception, enum Prisma partagés). Le module `events` a été supprimé — ne pas le recréer sans vérifier d'abord si c'est intentionnel.

## État d'avancement

Logique substantielle déjà écrite : `auth`, `user`, `company`, `notification`, `role`. Les DTO de création (`create-*.dto.ts`) portent maintenant de vraies règles class-validator sur la plupart des modules (contrairement à avant l'audit). En revanche, les services de `application`, `comment`, `connection`, `contact`, `document`, `employment`, `interview`, `job_offering`, `message`, `publication`, `skill` restent proches du scaffold `nest generate resource` — CRUD minimal, peu de règles métier. Ne pas supposer qu'un endpoint gère des cas particuliers (autorisations, cascades, validations croisées) sans avoir lu le service correspondant.

## Sécurité

- `.env` contient des secrets (connexion DB, clés JWT) — ne jamais l'afficher, le logger ou le committer.

## Workflow Git

Projet solo désormais, plus de suivi par tickets (l'ancienne convention YouTrack `GC/CRM-XX` était liée au projet d'équipe CRM, abandonnée ici).

- Dépôt hébergé sur `gp_assassin-script/jobtrack/backend` (GitLab self-hosted, `git.alt-tools.tech`) — remote `origin`. L'ancien dépôt d'équipe reste accessible en lecture via le remote `crm`.
- Commits réguliers désormais, plutôt qu'uniquement à des points stables validés.

## Commandes utiles

- `npm run start:dev` — serveur NestJS en watch mode (port `3000` par défaut, cf. `PORT` en env)
- `npm run lint` — ESLint avec `--fix`
- `npm run format` — Prettier sur `src/` et `test/`
- `npm run test` / `test:watch` / `test:cov` / `test:e2e` — Vitest
