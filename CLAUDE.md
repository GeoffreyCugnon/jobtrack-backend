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

## Sécurité — autorisation sur l'API (audit v2 septembre 2026, corrigé)

Le point critique de l'audit v2 (quasi-absence de `@UseGuards(AuthGuard)`) est **traité** :

- `@UseGuards(AuthGuard)` est posé **au niveau classe** sur tous les contrôleurs qui en manquaient : `application`, `comment`, `company`, `connection`, `contact`, `document`, `employment`, `interview`, `message`, `publication`, `role`, `skill`.
- `job_offering` : `create` était déjà protégé ; `update` et `remove` le sont maintenant aussi (guard au niveau méthode). `findAll`/`findOne` restent **publics volontairement** (parcours des offres côté Frontend guest).
- `user.controller.ts` : au-delà de l'authentification (guard classe déjà présent), une **vérification de propriété** minimale a été ajoutée — `_assertSelf(id, request)` sur `PUT /user/:id` et `DELETE /user/:id` : un utilisateur ne peut agir que sur son propre compte (`ForbiddenException` sinon). La route `DELETE /user` (`deleteAll`, suppression de **tous** les comptes) et la méthode `UserService.deleteAll()` — qui plantait de toute façon sur `ALTER TABLE Candidate/Recruiter`, tables disparues du schéma — ont été **supprimées**.

Reste ouvert (non bloquant, à faire quand le besoin apparaît) : il n'y a toujours pas de `RolesGuard` basé sur le modèle `Role` (pas de rôle admin). Le contrôle d'accès « ressource appartenant à un utilisateur précis » n'est fait que sur `user` ; les autres modules se contentent pour l'instant de l'authentification (tout utilisateur connecté peut voir/modifier les ressources des autres modules). À renforcer par une vérification de propriété si ces modules portent des données par-utilisateur en production.

## Schéma de données

`prisma/schema.prisma` : modèles en **PascalCase** (`Application`, `Job_offering`, `Skill`, `User`...), mais champs et enums restent en **snake_case** (`user_id`, `created_at`, `Application_status`). Pas de `@@map` explicite — les noms de table réels en MySQL doivent donc correspondre au nom du modèle tel quel ; ça fonctionne tant que la collation est insensible à la casse (par défaut sur Windows/MySQL), à vérifier si un déploiement change cet environnement.

Modèles : `User`, `User_skill`, `Skill`, `Company`, `Company_follower`, `Contact`, `Employment`, `Job_offering`, `Application`, `Application_document`, `Document`, `Interview`, `Message`, `Comment`, `Publication`, `Connection`, `Notification`, `Role`. Le modèle `event` a été supprimé (le module `events` correspondant aussi — voir plus bas).

Les fichiers `*.entities.ts` générés par `nest generate resource` restent quasi vides et **ne sont pas utilisés** : les services utilisent directement les types générés par Prisma (`../../prisma/generated/prisma/client`). Pas la peine de les étoffer.

## Module Auth

`src/auth/` implémente un flux JWT access + refresh complet, plus un flux de réinitialisation de mot de passe :

- `POST /auth/register` — hash du mot de passe (argon2) puis création via `UserService`
- `POST /auth/login` — vérifie le mot de passe, génère access + refresh token, stocke le refresh token en DB sur l'utilisateur, le renvoie dans un cookie `httpOnly` scopé à `/auth/refresh`
- `POST /auth/refresh` — relit le cookie, revérifie le JWT, compare au refresh token stocké en DB
- `POST /auth/logout` (protégé par `AuthGuard`) — met `refreshToken: null` en DB pour l'utilisateur courant et efface le cookie (`clearTokenCookie`) ; répond `{ message: 'Déconnexion réussie' }`
- `POST /auth/forgot-password` (nouveau) — réponse **volontairement générique** (pas d'énumération de comptes) ; si le compte existe, génère un token aléatoire (32 octets), le hash en argon2 et le stocke sur l'utilisateur avec une expiration de 15 min. **Limitation connue** : aucun service d'envoi d'email n'est configuré — le lien de réinitialisation est écrit dans les logs serveur (`Logger.log`, préfixé `[DEV]`).
- `POST /auth/reset-password` (nouveau) — consomme `email` + `token` + `newPassword` : vérifie le token via `AuthService.verifyResetToken` (présence, expiration, comparaison argon2), met à jour le mot de passe, invalide le token de reset **et** le refresh token (force une reconnexion). Coté Frontend, la route `/auth/reset-password` (page `ResetPasswordPage`) lit `email`/`token` dans les query params et appelle `AuthApi.resetPassword()`.
- `PATCH /auth/password` — protégé par `AuthGuard`, nécessite l'ancien mot de passe. Coté Frontend, `SettingsPassword.tsx` l'appelle via `UserApi.changePassword()`.

`register`/`login`/`refresh`/`logout` renvoient un utilisateur "safe" via `toSafeUser()` (`user/user.utils.ts` + type `SafeUser`, qui exclut aussi `resetPasswordToken`/`resetPasswordExpires`) plutôt que l'objet Prisma brut — réutiliser ce helper pour tout nouvel endpoint qui renvoie un `User`.

Points d'attention :
- Le cookie de refresh token est parsé **manuellement** depuis `request.headers.cookie` (`extractTokenFromCookie`) — il n'y a pas de middleware `cookie-parser` installé. Ne pas ajouter `request.cookies` en supposant qu'il existe sans avoir vérifié.
- `AuthGuard` est une garde maison (extraction du header `Authorization: Bearer`), pas la stratégie Passport standard, même si `passport`/`passport-jwt` sont en dépendance.
- Secrets et durées de vie des tokens attendus en env : `ACCESS_SECRET_KEY`, `ACCESS_JWT_EXPIRE`, `REFRESH_SECRET_KEY`, `REFRESH_JWT_EXPIRE`, plus `PROD` (conditionne `httpOnly`), `PORT` et `FRONTEND_URL` (utilisé pour construire le lien de reset password, fallback `http://localhost:5173`). Ne jamais afficher ni committer les valeurs réelles (`.env`).
- Les DTO de `auth/dto/` sont tous en kebab-case (`login.dto.ts`, `change-password.dto.ts`, `forgot-password.dto.ts`, `reset-password.dto.ts`, `register.dto.ts`, `update-auth.dto.ts`) — l'incohérence de nommage relevée par l'audit v2 a été corrigée.

`auth.service.spec.ts` teste `extractTokenFromCookie` et `verifyResetToken` (token absent, expiré, valide/invalide) en instanciant `AuthService` avec un mock minimal de `JwtService` (`{ signAsync: vi.fn(), verifyAsync: vi.fn() } as any`) — même logique que le pattern `job_offering.service.spec.ts` (instancier le service directement plutôt que passer par le `TestingModule` de Nest), à réutiliser pour les prochains services simples.

## CORS

`main.ts` n'utilise pas une origine fixe : la fonction `origin` d'`enableCors` autorise dynamiquement toute origine `http(s)://(localhost|127.0.0.1):<port quelconque>` via une regex, `credentials: true`. Objectif : ne pas avoir à retoucher `main.ts` quand le port du Frontend change (5173 → 5174 en fallback Vite, par ex.). Toute origine non-locale reste rejetée — à revoir explicitement avant un déploiement (ajouter le domaine de prod à la regex/whitelist).

## Gestion d'erreurs centralisée

Deux filtres globaux enregistrés dans `main.ts` :
- `utils/exceptions/http.filter.ts` — formate toute `HttpException` en réponse JSON standard (`statusCode`, `timestamp`, `path`, `message`). Journalise via le `Logger` NestJS (`this.logger.error`), plus de `console.log`.
- `utils/exceptions/prisma.filter.ts` — traduit les erreurs Prisma connues (`utils/enum/prismaError.ts` : `P2025`/`P2002`/`P2003`) en réponses HTTP appropriées (404/409/400) avec un message exploitable côté client.

Réutiliser ces filtres plutôt que du `try/catch` ad hoc dans les services pour les erreurs Prisma courantes (contrainte unique, clé étrangère, enregistrement introuvable).

## Organisation des modules

Modules renommés au singulier lors d'un audit précédent (`applications` → `application`, `jobs` → `job_offering`, `competences` → `skill`, etc.). Liste actuelle : `application`, `auth`, `comment`, `company`, `connection`, `contact`, `document`, `employment`, `interview`, `job_offering`, `message`, `notification`, `publication`, `role`, `skill`, `user`, plus `utils/` (filtres d'exception, enum Prisma partagés). Le module `events` a été supprimé — ne pas le recréer sans vérifier d'abord si c'est intentionnel.

## Module `job_offering` — logique métier implémentée

`job_offering.service.ts` est passé d'un scaffold CRUD à une vraie logique de mapping/inférence :

- `CATEGORY_BY_KEYWORD` et `WORK_MODE_BY_KEYWORD` : tables de mots-clés → `inferCategory()` / `inferWorkMode()` déduisent la catégorie et le mode de travail d'une offre à partir de son titre/description, faute de champs dédiés saisis à la création.
- `toOfferDto()` mappe une ligne Prisma `job_offering` (+ relations `company`, `application`) vers l'objet consommé par le Frontend (`Offer`), avec `timeAgo`/`postedHoursAgo` calculés depuis `created_at`. `verified` est lu depuis `company.verified` (vrai champ booléen en base) — plus de liste blanche de noms d'entreprises.
- `findAll()`/`findOne()` incluent `company: true` et `application: { select: { id: true } }`. Ces deux routes restent **publiques** (parcours des offres) ; `create`, `update` et `remove` sont protégées par `AuthGuard`.
- `create(dto, userId)` est protégé par `AuthGuard` côté controller (`@Req().user.id`) : le `company_id` de l'offre est celui de l'`Employment` courant (`is_current: true`) de l'utilisateur authentifié ; s'il n'a aucune entreprise courante, `ForbiddenException` (formatée par `http.filter.ts`). Plus de `company_id: 1` en dur.

Ce module a son test unitaire, `job_offering.service.spec.ts` : instancie le service directement (`new JobOfferingService(prisma)`), mocke `PrismaService` avec `vi.fn().mockResolvedValue(...)`, et couvre la forme retournée par `findAll()`, le mapping `verified` ← `company.verified`, et les deux branches de `create()` (rejet sans entreprise / rattachement au bon `company_id`). **C'est le pattern de référence à reproduire** pour les prochains tests unitaires de service (pas besoin du `TestingModule` de Nest pour un service sans autre dépendance injectée qu'un mock).

## État d'avancement

Logique substantielle déjà écrite : `auth`, `user`, `company` (partiellement, voir ci-dessous), `notification`, `role`, `job_offering`. Les DTO de création (`create-*.dto.ts`) portent de vraies règles class-validator sur la plupart des modules. En revanche, les services de `application`, `comment`, `connection`, `contact`, `document`, `employment`, `interview`, `message`, `publication`, `skill` restent proches du scaffold `nest generate resource` — CRUD minimal, peu de règles métier. Leurs contrôleurs sont désormais protégés par `@UseGuards(AuthGuard)` au niveau classe (authentification requise), mais **sans vérification de propriété** : ne pas supposer qu'un endpoint gère les cas particuliers (autorisation fine, cascades, validations croisées) sans avoir lu le service correspondant.

`company.service.ts` : seule `create()` est implémentée (avec vérification d'unicité du nom) ; `findAll`, `findOne`, `update`, `remove` ne sont que des chaînes de texte factices (`` `This action returns all company` ``, etc.) — non fonctionnels. Le contrôleur est protégé par `AuthGuard` au niveau classe.

## Sécurité

- `.env` contient des secrets (connexion DB, clés JWT) — ne jamais l'afficher, le logger ou le committer.
- Voir la section « Sécurité — autorisation sur l'API » en tête de fichier : `AuthGuard` est maintenant posé partout ; reste à faire un `RolesGuard` / une vérification de propriété généralisée si besoin en production.

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
