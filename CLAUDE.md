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

- `@UseGuards(AuthGuard)` est posé **au niveau classe** sur tous les contrôleurs restants (`notification`, `publication`, `role`, `user`). Les contrôleurs scaffold non protégés à l'origine ont depuis été supprimés (audit v3). `company` est un cas particulier : guard **au niveau méthode** (comme `job_offering`), `findAll`/`findOne` publics — cf. section « Module `company` ».
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

Modèles : `User`, `User_skill`, `Skill`, `Company`, `Company_follower`, `Contact`, `Employment`, `Job_category`, `Job_offering`, `Application`, `Application_document`, `Document`, `Interview`, `Message`, `Comment`, `Publication`, `Connection`, `Notification`, `Role`. Le modèle `event` a été supprimé (le module `events` correspondant aussi — voir plus bas).

`Job_category` : référentiel des catégories d'offres (13 lignes, secteurs + modes de travail), poussé en base depuis l'ancienne constante Front `data/offerCategories`. Seule la donnée y vit (`key`/`label`/`description`/`is_work_mode`/`sort_order`) ; le pictogramme + la pastille de couleur restent au Front (`getCategoryStyle(key)`). `key` = clé renvoyée par `JobOfferingService.inferCategory`/`inferWorkMode`. Exposé public par `GET /job-categories` (`job_category` module). Seed : `npm run prisma:seed:categories` (idempotent, upsert par `key`).

### Historique des migrations réparé (sept. 2026)

Le journal `_prisma_migrations` de la base partagée était désynchronisé (une ligne `20260629073007_init` en échec bloquait `migrate deploy`, 12 migrations appliquées mais non enregistrées, un `20260625135557_init` fantôme absent en local). Réconcilié à l'époque (17 migrations locales) : la table `_prisma_migrations` liste toujours exactement les migrations du dossier local comme appliquées (`npx prisma migrate status` **propre**), ce nombre grandissant naturellement à chaque nouvelle migration — ne pas figer un total dans ce paragraphe. `migrate deploy` reste néanmoins à éviter sur cette base (le schéma réel a été construit hors journal) ; pour un changement de schéma, garder le workflow : écrire le dossier `prisma/migrations/<ts>_<nom>/` + appliquer le SQL en direct (mysql2) + `npx prisma migrate resolve --applied <nom>` + `npx prisma generate`. Les ~18 tables minuscules orphelines (doublons laissés par la migration `pascal_case_model`) sont sans effet, laissées en place.

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
- `utils/exceptions/http.filter.ts` — formate toute `HttpException` en réponse JSON standard (`statusCode`, `timestamp`, `path`, `message`). Journalise via le `Logger` NestJS (`this.logger.error`), plus de `console.log`. **`message` lit `exception.getResponse().message` (pas `exception.message`)** — corrigé (septembre 2026) car pour une erreur du `ValidationPipe` global, `exception.message` vaut juste `"Bad Request Exception"` alors que le détail utile (« URL invalid », etc.) vit dans `getResponse().message` (aplati en une seule string si c'est un tableau). Sans ce correctif, toute erreur de validation renvoyait un message générique inexploitable côté Frontend — repéré sur la page « Modifier votre entreprise » (`website` invalide).
- `utils/exceptions/prisma.filter.ts` — traduit les erreurs Prisma connues (`utils/enum/prismaError.ts` : `P2025`/`P2002`/`P2003`) en réponses HTTP appropriées (404/409/400) avec un message exploitable côté client.

Réutiliser ces filtres plutôt que du `try/catch` ad hoc dans les services pour les erreurs Prisma courantes (contrainte unique, clé étrangère, enregistrement introuvable).

## Organisation des modules

Modules renommés au singulier lors d'un audit précédent (`applications` → `application`, `jobs` → `job_offering`, etc.). **Liste actuelle** (audit v5, à jour) : `auth`, `application`, `comment`, `company`, `connection`, `dashboard`, `document`, `interview`, `job_category`, `job_offering`, `notification`, `publication`, `role`, `skill`, `user`, plus `utils/` (filtres d'exception, enum Prisma partagés, `ownership.ts`, `relative-time.ts`).

Les scaffolds `contact`, `employment`, `message` (jamais implémentés au-delà de `nest g resource`) ont été **supprimés** (commit `a9153c9`, 6 septembre 2026), pas seulement retirés d'`AppModule` — ne pas chercher leurs dossiers dans `src/`, les régénérer avec `nest g resource <nom>` en repartant de zéro le jour où le besoin est réel (même méthode que `application`/`comment`/`dashboard`/`document`/`interview`/`skill`, cf. plus bas). Le modèle `Employment` (Prisma) reste utilisé, mais uniquement en interne par `company`/`job_offering` — pas de CRUD dédié nécessaire. `Contact` et `Message` restent en revanche des modèles Prisma **orphelins** (zéro référence dans `src/`, la messagerie ayant été extraite vers MS-Messagerie) : à retirer du schéma dans un lot dédié si personne ne prévoit de les réutiliser tels quels. Le module `events` avait été supprimé plus tôt.

**`application`, `comment`, `dashboard`, `document`, `interview`, `skill` ont depuis été réimplémentés et remontés** (retirés au stade scaffold à l'audit v3, avant de repasser par `nest g resource` en repartant de zéro) — vrai CRUD Prisma, guards, vérification de propriété, **et branchés côté Frontend** :

- `application` : candidatures de l'utilisateur (`GET/POST/PATCH/DELETE /application`), owner direct (`user_id`, `assertOwnership`). Empêche la double candidature à une même offre (vérif service, pas de contrainte DB). Consommé par `Candidatures.tsx`/`CandidatureDetail.tsx` et par le bouton "Postuler" de `OfferDetail.tsx`.
- `interview` : entretiens liés à une candidature (owner indirect, via `Application.user_id`). Consommé par `Entretiens.tsx`/`EntretienDetail.tsx`.
- `document` : CV/lettres de motivation (owner direct). Consommé par `Documents.tsx`, `DocumentEdit.tsx`, `DocumentPreview.tsx`.
- `dashboard` : `GET /dashboard/stats` (compteurs candidatures actives / entretiens à venir / offres dispo). Consommé par les tuiles de `Dashboard.tsx`.
- `comment` : commentaires sur une publication (owner direct). Consommé par `PublicationDetail.tsx`.
- `skill` : compétences de l'utilisateur (`User_skill`, flat — le regroupement par catégorie était une maquette Front). Consommé par `ProfileSkillsEdit.tsx`.

Le modèle `User` porte aussi désormais `headline`/`bio`/`location`/`phone`/`website`/`linkedin`/`github` (`PATCH /user/profile`) — l'écart "`MOCK_PROFILE_DETAILS` sans équivalent Backend" documenté aux audits v2-v4 est **résolu**, branché par `ProfileEdit.tsx`/`ProfileContactEdit.tsx`.

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
- `toOfferDto()` mappe une ligne Prisma `job_offering` (+ relations `company`, `application`) vers l'objet consommé par le Frontend (`Offer`), avec `timeAgo`/`postedHoursAgo` calculés depuis `created_at`. `verified` est lu depuis `company.verified` (vrai champ booléen en base) — plus de liste blanche de noms d'entreprises. `companyId`/`companyLogoUrl` sont aussi renvoyés (nouveau) pour que le Frontend puisse lier une offre à la vraie fiche entreprise (`/company/:id`) et afficher son logo plutôt qu'une simple initiale.
- `findAll()`/`findOne()` incluent `company: true` et `application: { select: { id: true } }`. Ces deux routes restent **publiques** (parcours des offres) ; `create`, `update` et `remove` sont protégées par `AuthGuard`.
- `create(dto, userId)` est protégé par `AuthGuard` côté controller (`@Req().user.id`) : le `company_id` de l'offre est celui de l'`Employment` courant (`is_current: true`) de l'utilisateur authentifié ; s'il n'a aucune entreprise courante, `ForbiddenException` (formatée par `http.filter.ts`). Plus de `company_id: 1` en dur.
- `update(id, dto, userId)` / `remove(id, userId)` (audit v4) passent par `assertCanManage(id, userId)` : 404 si l'offre n'existe pas, `ForbiddenException` si son `company_id` ne correspond pas à l'`Employment` courant de l'appelant.

Ce module a son test unitaire, `job_offering.service.spec.ts` : instancie le service directement (`new JobOfferingService(prisma)`), mocke `PrismaService` avec `vi.fn().mockResolvedValue(...)`, et couvre la forme retournée par `findAll()`, le mapping `verified` ← `company.verified`, et les deux branches de `create()` (rejet sans entreprise / rattachement au bon `company_id`). **C'est le pattern de référence à reproduire** pour les prochains tests unitaires de service (pas besoin du `TestingModule` de Nest pour un service sans autre dépendance injectée qu'un mock).

## Module `job_category`

`GET /job-categories` (public, comme `GET /job-offering`) → référentiel `Job_category` mappé en camelCase (`key/label/description/isWorkMode/sortOrder`), ordonné `sort_order` puis `label`. Service = un seul `findMany`, testé (`job_category.service.spec.ts`, même pattern que ci-dessus). Le Front le consomme via `useJobCategories()` (React Query, `staleTime` 1 h) pour le filtre « Catégorie » et le libellé de la fiche offre — cf. `Frontend/CLAUDE.md`.

## Module `company` — remonté dans `AppModule`, multi-entreprises (septembre 2026)

`CompanyModule` était présent dans le code (CRUD Prisma complet depuis l'audit v3) mais **pas importé dans `AppModule`** — `/company` répondait 404. Remonté pour la page Frontend « Créer une entreprise » (`POST /company`, protégé par `AuthGuard`) — voir `Frontend/CLAUDE.md`.

- Champs sur `Company` : `size` (`String?`, une des `COMPANY_SIZES` = `1-10`/`11-50`/`51-200`/`201-500`/`500+`, validée par `@IsIn` dans `create-company.dto.ts`), `description` (`String? @db.Text`), `logo_url` et `banner_url` (`String? @db.LongText` chacun, même contrat que `UpdateAvatarDto.avatarUrl` — URL https ou data URL d'image, régénérée côté client via `fileToAvatarDataUrl`/`fileToBannerDataUrl`).
- `create-company.dto` : le champ d'effectif est `size`, celui de visibilité `is_public` (et non `isPublic`, qui échouait à l'insert Prisma) — cf. audit v3.
- **Un utilisateur peut gérer plusieurs entreprises** (un `Employment` par entreprise, PK composite `[user_id, company_id]` — pas de contrainte d'unicité côté schéma). `create(dto, userId)` relie le créateur à l'entreprise via un `Employment` (`job_title: 'CEO'`) créé dans la même transaction ; chaque nouvelle création repasse les `Employment.is_current` précédents de l'utilisateur à `false` et devient la nouvelle entreprise « courante » — `is_current` ne sert qu'à désambiguïser les fonctionnalités qui supposent une seule entreprise active (ex. `JobOfferingService.create`), pas à limiter le nombre d'entreprises. Il n'y a donc plus de `ConflictException` sur une seconde création (seul le nom reste unique).
- **`GET /company/mine`** renvoie l'entreprise « courante » (`Employment.is_current`), ou `null`. **`GET /company/mine/all`** renvoie la liste complète des entreprises gérées par l'appelant (une par `Employment`, plus récentes d'abord) — c'est celle-ci que le Frontend utilise pour savoir si le `SideMenu` doit pointer vers la création, la fiche unique ou la liste, cf. `Frontend/CLAUDE.md`. Les deux sont protégées par `AuthGuard`.
- **`GET /company` et `GET /company/:id` sont publics** (pas de guard, comme `job_offering.findAll`/`findOne`) : une fiche entreprise est consultée depuis une offre d'emploi elle-même publique (`Job_offering.company_id` → `Offer.companyId`/`companyLogoUrl` dans `toOfferDto`), un visiteur non connecté doit pouvoir cliquer dessus sans être bloqué par l'auth.
- **Vérification de propriété sur `PATCH`/`DELETE /company/:id`** (`assertOwned`, même pattern que `JobOfferingService.assertCanManage`) : l'entreprise doit être celle de l'`Employment` courant de l'appelant (404 si l'entreprise n'existe pas, 403 sinon). Branchée pour la page Frontend « Modifier votre entreprise » (`EditCompany.tsx`).
- **Limites connues, non traitées** : pas de rôle `CEO` assigné dans `Role` (seul l'`Employment.job_title` porte la mention "CEO", en texte libre, aucune permission n'en découle) ; `DELETE /company/:id` cascade toujours sur ses `job_offering` **et** sur l'`Employment` (pas de garde-fou métier, juste la vérification de propriété). À traiter avec un `RolesGuard` dédié si le besoin devient réel — même état que `role` (cf. section Sécurité).

## État d'avancement

Modules réellement câblés (audit v5) : `auth`, `user`, `company`, `notification`, `role`, `job_offering`, `publication`, `application`, `comment`, `dashboard`, `document`, `interview`, `skill`, `connection`, `job_category`. `notification`, `role`, `user`, `publication`, `application`, `comment`, `document`, `interview`, `skill` sont protégés par `@UseGuards(AuthGuard)` au niveau classe ; `company` et `job_offering` le sont au niveau méthode, avec `findAll`/`findOne` publics sur les deux (comme `job_category`). Vérification de propriété présente sur `user` (`_assertSelf`), `notification` (`target_user_id`), `connection`, `publication`/`application`/`document`/`comment` (`user_id`, direct ou via `utils/ownership.ts#assertOwnership`), `interview` (via la candidature), `job_offering` et `company` (entreprise de l'`Employment` courant) ; **absente** sur `role` (auth seule) — ne pas supposer qu'un endpoint gère l'autorisation fine sans avoir lu le service.

**Dette identifiée à l'audit v5, non traitée consciemment** : `User.deleted_at` existe en base mais n'est filtré nulle part (`findAll`/`findOneSafeOrThrow`) et `UserService.delete()` fait un vrai `delete` plutôt qu'un soft-delete — contrairement à `job_offering`/`publication`/`comment` qui respectent la convention. À trancher (exploiter ou retirer la colonne) dans un lot dédié, pas mélangé à un refactor plus large.

**Composeur de post (Frontend) — image jointe (septembre 2026) :** `Publication.image_url` est passé de `@db.Text` (64 Ko) à `@db.LongText`, même contrat que `Company.logo_url`/`banner_url` — le composeur (`CreatePublication.tsx`) envoie une data URL (`fileToPostImageDataUrl`, redimensionnée sans recadrage) qui dépassait la limite `TEXT`. `CreatePublicationDto` accepte désormais `image_url` (optionnel). Migration `20260912100000_publication_image_url_to_longtext`.

**Icônes d'entreprises (septembre 2026) :** `prisma:seed:company-logos` attribue un logo à initiales à toute entreprise sans logo réel — généré **hors ligne** avec `@dicebear/core`/`@dicebear/collection` (style `initials`, packages ESM-only donc chargés via `import()` dynamique dans le script CommonJS), stocké en data URI SVG directement dans `Company.logo_url` (pas d'appel à un service d'avatars distant à l'affichage, contrairement à `seed-avatars.js#randomuser.me` pour les utilisateurs). Idempotent : ne régénère que `NULL` ou un logo déjà posé par ce script, jamais un logo réellement uploadé.

**Candidatures de démonstration (septembre 2026) :** `prisma:seed:applications` répartit des candidatures (comptes démo + admin/admin2) sur toutes les offres avec un volume variable (cycle 0 à 7 par offre) — sert à voir coexister le badge Frontend « Premier candidat » (`OfferCard.tsx`, seuil `applicantCount < 5`) et des offres qui l'ont dépassé, plutôt que d'avoir un badge systématiquement affiché faute de données. Idempotent : purge d'abord les candidatures de ce pool de comptes avant de les réinsérer.

## Sécurité

- `.env` contient des secrets (connexion DB, clés JWT) — ne jamais l'afficher, le logger ou le committer.
- Voir la section « Sécurité — autorisation sur l'API » en tête de fichier : `AuthGuard` est maintenant posé partout ; reste à faire un `RolesGuard` / une vérification de propriété généralisée si besoin en production.

### Audit des dépendances (`npm audit`, septembre 2026)

`npm audit fix` (non cassant) exécuté : **22 → 13 vulnérabilités**. Les 13 restantes nécessitent toutes `--force` (changement majeur) et n'ont pas été appliquées :

- **`mariadb` (nested sous `@prisma/adapter-mariadb`) — le seul qui tourne réellement en prod** (c'est l'adaptateur DB de l'app). Fuite du mot de passe en clair malgré `ssl: true`, injection SQL possible sous certains charsets (`big5`/`gbk`/`sjis`/`cp932`/`gb18030`, pas ceux utilisés ici). **Pas de correctif disponible en amont** pour l'instant — à surveiller, rien à faire côté projet tant que ça n'existe pas.
- `mysql2` (top-level, `^2.3.3`) — correctif en 3.24.4, mais version gardée à dessein (cf. plus haut, utilisée uniquement par les scripts de seed) ; `--force` casserait ce choix.
- `multer` (via `@nestjs/platform-express`) — ferait redescendre `@nestjs/core` en 7.5.5 ; de toute façon **non utilisé** dans le code (`grep` ne trouve aucun `multer`/`FileInterceptor`).
- Le reste (`vitest`/`@vitest/mocker`, `valibot`, `deepmerge-ts`, `@prisma/dev`, `@prisma/config`, `hono`) : outillage interne du CLI `prisma`/`vitest` (devDependencies, jamais embarqué dans l'app qui tourne).

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
- `npm run prisma:seed` — companies + offres de démo · `prisma:seed:categories` — référentiel `Job_category` (13 lignes, idempotent) · `prisma:seed:connections` / `prisma:seed:avatars` — voir modules concernés · `prisma:seed:admin` — (ré)insère un 2e compte de login `admin2@jobtrack.local` (compte utilisateur ordinaire, pas de privilège ; email/nom/hash surchargeables par env `ADMIN2_*`) · `prisma:seed:company-logos` — logos à initiales (DiceBear, hors ligne) pour les entreprises sans logo · `prisma:seed:applications` — candidatures de démo réparties sur les offres (test du badge « Premier candidat »)
