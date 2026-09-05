# JobTrack — Backend

API du CRM de recherche d'emploi JobTrack. Repo Git **séparé** du frontend (`../Frontend`) — pas un monorepo, pas de dépendances partagées entre les deux.

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

## Module Auth

`src/auth/` implémente un flux JWT access + refresh complet :

- `POST /auth/register` — hash du mot de passe (argon2) puis création via `UserService`
- `POST /auth/login` — vérifie le mot de passe, génère access + refresh token, stocke le refresh token en DB sur l'utilisateur, le renvoie dans un cookie `httpOnly` scopé à `/auth/refresh`
- `POST /auth/refresh` — relit le cookie, revérifie le JWT, compare au refresh token stocké en DB
- `POST /auth/logout` (nouveau, protégé par `AuthGuard`) — met `refreshToken: null` en DB pour l'utilisateur courant et efface le cookie (`clearTokenCookie`) ; répond `{ message: 'Déconnexion réussie' }`
- `PATCH /auth/password` — protégé par `AuthGuard`, nécessite l'ancien mot de passe

`register`/`login`/`refresh`/`logout` renvoient maintenant un utilisateur "safe" via `toSafeUser()` (`user/user.utils.ts` + type `SafeUser`) plutôt que l'objet Prisma brut — réutiliser ce helper pour tout nouvel endpoint qui renvoie un `User`, plutôt que de risquer de renvoyer le hash du mot de passe ou le refresh token par erreur.

Points d'attention :
- Le cookie de refresh token est parsé **manuellement** depuis `request.headers.cookie` (`extractTokenFromCookie`) — il n'y a pas de middleware `cookie-parser` installé. Ne pas ajouter `request.cookies` en supposant qu'il existe sans avoir vérifié. Cette fonction a son premier test (`auth.service.spec.ts`, voir plus bas).
- `AuthGuard` est une garde maison (extraction du header `Authorization: Bearer`), pas la stratégie Passport standard, même si `passport`/`passport-jwt` sont en dépendance.
- Secrets et durées de vie des tokens attendus en env : `ACCESS_SECRET_KEY`, `ACCESS_JWT_EXPIRE`, `REFRESH_SECRET_KEY`, `REFRESH_JWT_EXPIRE`, plus `PROD` (conditionne `httpOnly`) et `PORT`. Ne jamais afficher ni committer les valeurs réelles (`.env`).
- Pas d'endpoint "mot de passe oublié" (le Frontend a un formulaire `RecoveryPasswordForm` mais son `onSubmit` est un stub non branché) — cohérent, mais à garder en tête si cette fonctionnalité est reprise.

`auth.service.spec.ts` (nouveau) teste `extractTokenFromCookie` en instanciant `AuthService` avec un mock minimal de `JwtService` (`{ signAsync: vi.fn(), verifyAsync: vi.fn() } as any`) — même logique que le pattern `job_offering.service.spec.ts` (instancier le service directement plutôt que passer par le `TestingModule` de Nest), à réutiliser pour les prochains services simples.

## CORS (mis à jour)

`main.ts` n'utilise plus une origine fixe : la fonction `origin` d'`enableCors` autorise dynamiquement toute origine `http(s)://(localhost|127.0.0.1):<port quelconque>` via une regex, `credentials: true`. Objectif : ne plus avoir à retoucher `main.ts` quand le port du Frontend change (5173 → 5174 en fallback Vite, par ex.). Toute origine non-locale reste rejetée — à revoir explicitement avant un déploiement (ajouter le domaine de prod à la regex/whitelist).

## Gestion d'erreurs centralisée

Deux filtres globaux enregistrés dans `main.ts` :
- `utils/exceptions/http.filter.ts` — formate toute `HttpException` en réponse JSON standard (`statusCode`, `timestamp`, `path`, `message`).
- `utils/exceptions/prisma.filter.ts` — traduit les erreurs Prisma connues (`utils/enum/prismaError.ts` : `P2025`/`P2002`/`P2003`) en réponses HTTP appropriées (404/409/400) avec un message exploitable côté client.

Réutiliser ces filtres plutôt que du `try/catch` ad hoc dans les services pour les erreurs Prisma courantes (contrainte unique, clé étrangère, enregistrement introuvable).

## Organisation des modules

Modules renommés au singulier lors d'un audit précédent (`applications` → `application`, `jobs` → `job_offering`, `competences` → `skill`, etc.). Liste actuelle : `application`, `auth`, `comment`, `company`, `connection`, `contact`, `document`, `employment`, `interview`, `job_offering`, `message`, `notification`, `publication`, `role`, `skill`, `user`, plus `utils/` (filtres d'exception, enum Prisma partagés). Le module `events` a été supprimé — ne pas le recréer sans vérifier d'abord si c'est intentionnel.

## Module `job_offering` — logique métier implémentée (nouveau)

`job_offering.service.ts` est passé d'un scaffold CRUD à une vraie logique de mapping/inférence :

- `CATEGORY_BY_KEYWORD` et `WORK_MODE_BY_KEYWORD` : tables de mots-clés → `inferCategory()` / `inferWorkMode()` déduisent la catégorie et le mode de travail d'une offre à partir de son titre/description, faute de champs dédiés saisis à la création.
- `toOfferDto()` mappe une ligne Prisma `job_offering` (+ relations `company`, `application`) vers l'objet consommé par le Frontend (`OfferApiItem`), avec `timeAgo`/`postedHoursAgo` calculés depuis `created_at`. `verified` est lu depuis `company.verified` (vrai champ booléen en base, cf. `Company` dans `schema.prisma` + migration `20260905000000_add_company_verified`) — plus de liste blanche de noms d'entreprises.
- `findAll()`/`findOne()` incluent `company: true` et `application: { select: { id: true } }`.
- `create(dto, userId)` est protégé par `AuthGuard` côté controller (`@Req().user.id`) : le `company_id` de l'offre est celui de l'`Employment` courant (`is_current: true`) de l'utilisateur authentifié ; s'il n'a aucune entreprise courante, `ForbiddenException` (formatée par `http.filter.ts`). Plus de `company_id: 1` en dur. Le DTO `CreateJobOfferingDto` reste inchangé (le `company_id` ne transite pas par le body, cohérent avec `whitelist: true`).

Ce module a son test unitaire, `job_offering.service.spec.ts` : instancie le service directement (`new JobOfferingService(prisma)`), mocke `PrismaService` avec `vi.fn().mockResolvedValue(...)`, et couvre la forme retournée par `findAll()`, le mapping `verified` ← `company.verified`, et les deux branches de `create()` (rejet sans entreprise / rattachement au bon `company_id`). **C'est le pattern de référence à reproduire** pour les prochains tests unitaires de service (pas besoin du `TestingModule` de Nest pour un service sans autre dépendance injectée qu'un mock) — `auth.service.spec.ts` suit déjà ce même pattern (voir section Auth).

## État d'avancement

Logique substantielle déjà écrite : `auth`, `user`, `company`, `notification`, `role`, et maintenant `job_offering`. Les DTO de création (`create-*.dto.ts`) portent de vraies règles class-validator sur la plupart des modules. En revanche, les services de `application`, `comment`, `connection`, `contact`, `document`, `employment`, `interview`, `message`, `publication`, `skill` restent proches du scaffold `nest generate resource` — CRUD minimal, peu de règles métier. Ne pas supposer qu'un endpoint gère des cas particuliers (autorisations, cascades, validations croisées) sans avoir lu le service correspondant.

## Sécurité

- `.env` contient des secrets (connexion DB, clés JWT) — ne jamais l'afficher, le logger ou le committer.

## Workflow Git

Projet solo désormais, plus de suivi par tickets (l'ancienne convention YouTrack `GC/CRM-XX` était liée au projet d'équipe CRM, abandonnée ici).

- Dépôt hébergé sur `gp_assassin-script/jobtrack/backend` (GitLab self-hosted, `git.alt-tools.tech`) — remote `origin`. L'ancien dépôt d'équipe reste accessible en lecture via le remote `crm`.
- Commits réguliers désormais, plutôt qu'uniquement à des points stables validés.
- Voir aussi le `CLAUDE.md` à la racine de `JobTrack/` pour le workflow partagé entre les deux repos (lancement de Claude Code, skills/settings communs).

## Commandes utiles

- `npm run start:dev` — serveur NestJS en watch mode (port `3000` par défaut, cf. `PORT` en env)
- `npm run lint` — ESLint avec `--fix`
- `npm run format` — Prettier sur `src/` et `test/`
- `npm run test` / `test:watch` / `test:cov` / `test:e2e` — Vitest
