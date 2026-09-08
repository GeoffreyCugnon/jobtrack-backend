# JobTrack — Backend

API du CRM de recherche d'emploi JobTrack. Repo Git **séparé** du frontend (`../Frontend`) — pas un monorepo, pas de dépendances partagées entre les deux.

## Stack

- NestJS 11, TypeScript
- Prisma 7.8 — datasource MySQL (`schema.prisma`), adaptateur `@prisma/adapter-mariadb`. `prisma.service.ts` ajoute `allowPublicKeyRetrieval=true` à `DATABASE_URL` avant de le passer à l'adaptateur : le serveur MySQL authentifie en `caching_sha2_password` sans TLS, sans ce flag le pool part en timeout (`pool timeout ... active=0 idle=0`). Ne pas retirer (ou alors passer le serveur en TLS / `mysql_native_password`).
- Auth JWT maison : `@nestjs/jwt` + garde custom (`AuthGuard`, voir plus bas). `passport`/`passport-jwt` ont été retirés (audit v3) — jamais utilisés. Hash des mots de passe avec **argon2** (bcrypt a été retiré)
- class-validator / class-transformer pour la validation des DTO — `ValidationPipe` global en mode strict (`whitelist: true, forbidNonWhitelisted: true`) : tout champ non déclaré dans un DTO fait échouer la requête, donc les DTO doivent être exhaustifs
- **Vitest** pour les tests (migré depuis Jest) : `test`, `test:watch`, `test:cov`, `test:e2e` passent tous par `vitest`
- ESLint + Prettier
- Collection Bruno (`bruno/`) pour tester les endpoints manuellement

## Sécurité — autorisation sur l'API (audit v2 septembre 2026, corrigé)

Le point critique de l'audit v2 (quasi-absence de `@UseGuards(AuthGuard)`) est **traité** :

- `@UseGuards(AuthGuard)` est posé **au niveau classe** sur tous les contrôleurs restants (`company`, `notification`, `publication`, `role`, `user`). Les contrôleurs scaffold non protégés à l'origine ont depuis été supprimés (audit v3).
- `job_offering` : `create` était déjà protégé ; `update` et `remove` le sont maintenant aussi (guard au niveau méthode). `findAll`/`findOne` restent **publics volontairement** (parcours des offres côté Frontend guest).
- `user.controller.ts` : `_assertSelf(id, request)` sur `PUT /user/:id` et `DELETE /user/:id` (un utilisateur ne peut agir que sur son propre compte). `DELETE /user` (`deleteAll`) supprimé.
- **🔴🔴 Fuite corrigée (audit v3).** `UserService.findOneOrThrow` renvoyait la ligne `User` complète (hash `password`, `refreshToken`, `resetPasswordToken`, `resetPasswordExpires`) — exposée par `GET /user/:id` et `GET /user/profil` à tout utilisateur connecté. Désormais : `SAFE_USER_OMIT` (`user.utils.ts`, `omit` Prisma appliqué au **runtime**) sur `findAll`/`update` + `findOneSafeOrThrow` pour les routes ; `findOneOrThrow` (complet) réservé à `auth` (comparaison mot de passe / refresh token). Toute nouvelle route qui renvoie un `User` doit passer par une méthode « safe » ou `toSafeUser()` — le type `SafeUser` seul ne filtre rien.

### Audit v4 (septembre 2026) — propriété + stubs résiduels (traité)

- **🔴 `RoleService.update()` était encore un stub scaffold** (`return "This action updates a #${id} role"`) — `PATCH /role/:id` répondait 200 sans rien modifier. Corrigé : vrai `prisma.role.update` précédé de `findOne(id)`. Endpoint conservé (le modèle `Role` est destiné à porter les permissions recruteur : le créateur d'une entreprise devient `CEO` et peut octroyer le rôle `recruteur` à un employé — le `RolesGuard` correspondant reste à faire).
- **🟠 Vérification de propriété sur `publication` et `job_offering`.** `PATCH`/`DELETE /publication/:id` : le service exige désormais `publication.user_id === request.user.id` (`assertOwned`, 403/404 sinon). `PATCH`/`DELETE /job-offering/:id` : l'offre doit appartenir à l'entreprise de l'`Employment` courant de l'appelant (`assertCanManage`, même règle que `create()`). Les contrôleurs passent `request.user.id` au service. Specs : `publication.service.spec.ts` (nouveau) + `job_offering.service.spec.ts` (étoffé).
- **🟠 `CreatePublicationDto`** : `likes_count` retiré (démarrait à `@default(0)` en base, mais était requis et falsifiable par le client) ; `is_public` passé en `@IsOptional` (défaut `true`). `forbidNonWhitelisted` rejette maintenant un `likes_count` envoyé par le client.
- **🟡 Politique de mot de passe.** `ChangePasswordDto` et `ResetPasswordDto` : `@MinLength(8)` → `@IsStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 })`, alignés sur `CreateUserDto` / `LoginDto` et le `passwordSchema` du Front.
- **🟡 `src/auth/dto/update-auth.dto.ts`** supprimé (mort, aucun import — remnant `nest g resource`).

Reste ouvert (non bloquant, à faire quand le besoin apparaît) : pas encore de `RolesGuard` basé sur le modèle `Role` (rôles `CEO` / `recruteur`, cf. audit v4) ; la vérification de propriété est faite sur `user` (`_assertSelf`), `notification` (`target_user_id`), `connection`, `publication` (`user_id`) et `job_offering` (entreprise de l'employment) — les autres modules (`company`, `role`) se contentent de l'authentification. `NotificationService.create()` n'est appelé par aucun module (aucune notif n'est générée pour l'instant). Colonnes `User.refreshToken`/`resetPasswordToken`/`resetPasswordExpires` toujours en camelCase (à passer en `@map` snake_case dans un lot dédié). `mysql2` v2 reste (seeds `prisma/*.js`).

## Schéma de données

`prisma/schema.prisma` : modèles en **PascalCase** (`Application`, `Job_offering`, `Skill`, `User`...), mais champs et enums restent en **snake_case** (`user_id`, `created_at`, `Application_status`). Pas de `@@map` explicite — les noms de table réels en MySQL doivent donc correspondre au nom du modèle tel quel ; ça fonctionne tant que la collation est insensible à la casse (par défaut sur Windows/MySQL), à vérifier si un déploiement change cet environnement.

Modèles : `User`, `User_skill`, `Skill`, `Company`, `Company_follower`, `Contact`, `Employment`, `Job_offering`, `Application`, `Application_document`, `Document`, `Interview`, `Message`, `Comment`, `Publication`, `Connection`, `Notification`, `Role`. Le modèle `event` a été supprimé (le module `events` correspondant aussi — voir plus bas).

Les dossiers `entities/` générés par `nest g resource` ont été **supprimés** (audit v3) : les services utilisent directement les types Prisma générés (`../../prisma/generated/prisma/client`). Ne pas recréer de `*.entity.ts`.

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
- `AuthGuard` est une garde maison (extraction du header `Authorization: Bearer`), pas la stratégie Passport standard (Passport n'est plus une dépendance).
- Secrets et durées de vie des tokens attendus en env : `ACCESS_SECRET_KEY`, `ACCESS_JWT_EXPIRE`, `REFRESH_SECRET_KEY`, `REFRESH_JWT_EXPIRE`, plus `PROD` (conditionne `httpOnly`), `PORT` et `FRONTEND_URL` (utilisé pour construire le lien de reset password, fallback `http://localhost:5173`). Ne jamais afficher ni committer les valeurs réelles (`.env`).
- Les DTO de `auth/dto/` sont tous en kebab-case (`login.dto.ts`, `change-password.dto.ts`, `forgot-password.dto.ts`, `reset-password.dto.ts`, `register.dto.ts`) — l'incohérence de nommage relevée par l'audit v2 a été corrigée. `update-auth.dto.ts` (mort) a été supprimé à l'audit v4.

`auth.service.spec.ts` teste `extractTokenFromCookie` et `verifyResetToken` (token absent, expiré, valide/invalide) en instanciant `AuthService` avec un mock minimal de `JwtService` (`{ signAsync: vi.fn(), verifyAsync: vi.fn() } as any`) — même logique que le pattern `job_offering.service.spec.ts` (instancier le service directement plutôt que passer par le `TestingModule` de Nest), à réutiliser pour les prochains services simples.

## Pont d'authentification vers MS-Messagerie (nouveau)

La partie messagerie a été extraite dans un micro-service séparé (`../../MS-Messagerie`, NestJS + Prisma + PostgreSQL, dépôt indépendant). Le Frontend lui parle **directement** (REST + WebSocket) plutôt que de passer par ce Backend en proxy — voir `Frontend/CLAUDE.md`. Le rôle de ce Backend se limite à fournir le jeton :

- `GET /auth/messaging-token` (protégé par `AuthGuard`) : émet un JWT **dédié**, distinct des tokens access/refresh JobTrack — `AuthService#generateMessagingToken` signe `{ sub: String(user.id) }` en **HS256** (MS-Messagerie l'impose, alors que les tokens JobTrack sont en HS512) avec `MESSAGING_JWT_SECRET`/`MESSAGING_JWT_EXPIRE` (`.env`).
- `MESSAGING_JWT_SECRET` doit être **strictement identique** à celui de `MS-Messagerie/.env` (chaque instance de MS-Messagerie a son propre secret ; ici les deux sont alignés puisque c'est la même instance qui sert JobTrack). Un changement de secret d'un côté sans l'autre invalide silencieusement tous les tokens de messagerie (401 côté MS).
- Le claim est `sub` (convention MS-Messagerie), pas `id` comme dans `IPayload` — ne pas réutiliser `generateJwts`/`IPayload` pour ce token.
- Ce Backend ne relaie aucun appel vers MS-Messagerie (pas de proxy REST/WS) : il ne fait que fabriquer et distribuer le jeton.

## CORS

`main.ts` n'utilise pas une origine fixe : la fonction `origin` d'`enableCors` autorise dynamiquement toute origine `http(s)://(localhost|127.0.0.1):<port quelconque>` via une regex, `credentials: true`. Objectif : ne pas avoir à retoucher `main.ts` quand le port du Frontend change (5173 → 5174 en fallback Vite, par ex.). Toute origine non-locale reste rejetée — à revoir explicitement avant un déploiement (ajouter le domaine de prod à la regex/whitelist).

## Gestion d'erreurs centralisée

Deux filtres globaux enregistrés dans `main.ts` :
- `utils/exceptions/http.filter.ts` — formate toute `HttpException` en réponse JSON standard (`statusCode`, `timestamp`, `path`, `message`). Journalise via le `Logger` NestJS (`this.logger.error`), plus de `console.log`.
- `utils/exceptions/prisma.filter.ts` — traduit les erreurs Prisma connues (`utils/enum/prismaError.ts` : `P2025`/`P2002`/`P2003`) en réponses HTTP appropriées (404/409/400) avec un message exploitable côté client.

Réutiliser ces filtres plutôt que du `try/catch` ad hoc dans les services pour les erreurs Prisma courantes (contrainte unique, clé étrangère, enregistrement introuvable).

## Organisation des modules

Modules renommés au singulier lors d'un audit précédent (`applications` → `application`, `jobs` → `job_offering`, etc.). **Liste actuelle** : `auth`, `company`, `connection`, `job_offering`, `notification`, `publication`, `role`, `user`, plus `utils/` (filtres d'exception, enum Prisma partagés).

Encore retirés d'`AppModule` (stade scaffold, `"This action returns all …"`) : `application`, `comment`, `contact`, `document`, `employment`, `interview`, `message`, `skill`. Les régénérer avec `nest g resource <nom>` **au moment de les implémenter**, puis les remonter dans `app.module.ts`. `connection` a été recréé (voir ci-dessous). Le module `events` avait été supprimé plus tôt.

### Module `connection` — mise en relation entre membres

`Connection` : PK composite `[user_action_id, user_receiver_id]` (demandeur → destinataire), statut `PENDING`/`ACCEPTED`/`REJECTED`. Toutes les routes sous `AuthGuard`.

- `POST /connection` `{ userId }` → crée une invitation `PENDING`. Refuse self-connect et doublon (peu importe le sens).
- `GET /connection` → `{ connections, incoming, outgoing }` ; chaque entrée porte l'autre utilisateur en **SafeUser** (`select` explicite `id/first_name/last_name/email/avatar_url`) + `since`.
- `PATCH /connection/:userId/accept` → passe à `ACCEPTED` l'invitation où je suis destinataire (`updateMany`, 404 si aucune).
- `DELETE /connection/:userId` → `deleteMany` sur la paire : refuser une invitation reçue, annuler une envoyée, ou retirer une relation.

Seed : `prisma/seed-connections.js` (`npm run prisma:seed:connections`, `ADMIN_EMAIL` défaut `admin@jobtrack.local`) — 3 relations acceptées + 2 invitations en attente depuis les utilisateurs de démo. Idempotent (purge d'abord les lignes de l'admin).

## Module `job_offering` — logique métier implémentée

`job_offering.service.ts` est passé d'un scaffold CRUD à une vraie logique de mapping/inférence :

- `CATEGORY_BY_KEYWORD` et `WORK_MODE_BY_KEYWORD` : tables de mots-clés → `inferCategory()` / `inferWorkMode()` déduisent la catégorie et le mode de travail d'une offre à partir de son titre/description, faute de champs dédiés saisis à la création.
- `toOfferDto()` mappe une ligne Prisma `job_offering` (+ relations `company`, `application`) vers l'objet consommé par le Frontend (`Offer`), avec `timeAgo`/`postedHoursAgo` calculés depuis `created_at`. `verified` est lu depuis `company.verified` (vrai champ booléen en base) — plus de liste blanche de noms d'entreprises.
- `findAll()`/`findOne()` incluent `company: true` et `application: { select: { id: true } }`. Ces deux routes restent **publiques** (parcours des offres) ; `create`, `update` et `remove` sont protégées par `AuthGuard`.
- `create(dto, userId)` est protégé par `AuthGuard` côté controller (`@Req().user.id`) : le `company_id` de l'offre est celui de l'`Employment` courant (`is_current: true`) de l'utilisateur authentifié ; s'il n'a aucune entreprise courante, `ForbiddenException` (formatée par `http.filter.ts`). Plus de `company_id: 1` en dur.
- `update(id, dto, userId)` / `remove(id, userId)` (audit v4) passent par `assertCanManage(id, userId)` : 404 si l'offre n'existe pas, `ForbiddenException` si son `company_id` ne correspond pas à l'`Employment` courant de l'appelant.

Ce module a son test unitaire, `job_offering.service.spec.ts` : instancie le service directement (`new JobOfferingService(prisma)`), mocke `PrismaService` avec `vi.fn().mockResolvedValue(...)`, et couvre la forme retournée par `findAll()`, le mapping `verified` ← `company.verified`, et les deux branches de `create()` (rejet sans entreprise / rattachement au bon `company_id`). **C'est le pattern de référence à reproduire** pour les prochains tests unitaires de service (pas besoin du `TestingModule` de Nest pour un service sans autre dépendance injectée qu'un mock).

## État d'avancement

Modules réellement câblés (après audit v3, les scaffolds ont été supprimés) : `auth`, `user`, `company`, `notification`, `role`, `job_offering`, `publication`. Tous les contrôleurs sont protégés par `@UseGuards(AuthGuard)` au niveau classe. Vérification de propriété présente sur `user` (`_assertSelf`), `notification` (`target_user_id`), `connection`, `publication` (`user_id`) et `job_offering` (entreprise de l'`Employment` courant) ; **absente** sur `company` et `role` (auth seule) — ne pas supposer qu'un endpoint gère l'autorisation fine sans avoir lu le service.

`company.service.ts` : CRUD Prisma complet depuis l'audit v3 (`create` garde la vérification d'unicité du nom). `create-company.dto` : le champ est `is_public` (et non `isPublic`, qui échouait à l'insert Prisma).

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
- `npm run prisma:seed` — companies + offres de démo · `prisma:seed:connections` / `prisma:seed:avatars` — voir modules concernés · `prisma:seed:admin` — (ré)insère un 2e compte de login `admin2@jobtrack.local` (compte utilisateur ordinaire, pas de privilège ; email/nom/hash surchargeables par env `ADMIN2_*`)
