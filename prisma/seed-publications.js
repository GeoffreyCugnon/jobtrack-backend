/**
 * Seed du fil d'actus : quelques utilisateurs "auteurs" + leurs publications.
 * Idempotent (relançable) : supprime puis réinsère les publications des auteurs
 * seedés. Lancer avec `node prisma/seed-publications.js`.
 */
const mysql = require("mysql2/promise");

const databaseUrl =
  process.env.DATABASE_URL ||
  "mysql://root:root@192.168.1.85:3306/job_platform";
const url = new URL(databaseUrl);

// argon2id de "Publisher!2026" — comptes de démo, connexion possible mais
// secondaire (ils servent surtout d'auteurs).
const DEMO_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$PWDO9P8vW/kVneWSb5wNXA$r0QTwV0pRyQcnqFl+nLoFdA3XJ+3gMsSDhgs7pvt87o";

// Portrait réaliste (randomuser.me, CDN public) — `gender` cohérent avec le
// prénom de l'auteur, `n` fixe le visage (0-99).
const avatar = (gender, n) =>
  `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;

const authors = [
  {
    email: "camille.roux@demo.jobtrack",
    first_name: "Camille",
    last_name: "Roux",
    avatar_url: avatar("women", 44),
  },
  {
    email: "sofiane.benali@demo.jobtrack",
    first_name: "Sofiane",
    last_name: "Benali",
    avatar_url: avatar("men", 32),
  },
  {
    email: "lea.moreau@demo.jobtrack",
    first_name: "Léa",
    last_name: "Moreau",
    avatar_url: avatar("women", 68),
  },
  {
    email: "thomas.girard@demo.jobtrack",
    first_name: "Thomas",
    last_name: "Girard",
    avatar_url: avatar("men", 75),
  },
  {
    email: "nadia.haddad@demo.jobtrack",
    first_name: "Nadia",
    last_name: "Haddad",
    avatar_url: avatar("women", 90),
  },
];

// [authorIndex, type, title, content, likes, heuresDansLePasse]
const posts = [
  [
    0,
    "ACTU",
    "Retour sur le meetup React de Sophia",
    "Super soirée hier au meetup React Côte d'Azur 🎉 Trois talks très concrets : Server Components en prod, tests avec Vitest, et migration progressive vers React 19. Les slides arrivent bientôt, je partagerai le lien ici.",
    27,
    3,
  ],
  [
    1,
    "ANNONCE",
    "On recrute un·e dev back Node.js",
    "Mon équipe cherche un·e développeur·se back Node.js / NestJS (2-4 ans d'xp) pour un poste en CDI à Nice, télétravail 3j/semaine. Stack : NestJS, Prisma, PostgreSQL, un peu d'infra. MP ouverts, je réponds à tout le monde.",
    41,
    8,
  ],
  [
    2,
    "ARTICLE",
    "Ce que j'aurais aimé savoir avant ma reconversion",
    "Il y a 18 mois je bossais dans la logistique, aujourd'hui je suis dev front en alternance. Trois choses qui m'ont aidée : construire un vrai projet perso (pas un énième todo), demander des retours tôt et souvent, et accepter de ne pas tout comprendre au début. Courage à celles et ceux qui se lancent 💪",
    63,
    26,
  ],
  [
    3,
    "ACTU",
    "TypeScript 5.x : les nouveautés qui comptent",
    "Petit récap des ajouts récents de TypeScript que j'utilise déjà au quotidien : `satisfies`, les `const` type parameters, et l'inférence améliorée sur les tableaux. Rien de spectaculaire mais l'ergonomie du typage progresse à chaque version.",
    19,
    30,
  ],
  [
    0,
    "ARTICLE",
    "Préparer un entretien technique sans stresser",
    "Ma méthode en 4 points : relire les fondamentaux du langage, refaire 2-3 exercices d'algo la veille (pas plus), préparer 3 questions à poser à l'équipe, et surtout dormir. Un entretien raté n'est pas un échec, c'est une itération.",
    52,
    50,
  ],
  [
    4,
    "ANNONCE",
    "Recherche alternance UX/UI - rentrée",
    "Étudiante en M1 design, je cherche une alternance UX/UI à partir de septembre sur Nice / Sophia / remote. Portfolio en commentaire. Si vous connaissez une équipe produit qui recrute, un partage m'aiderait beaucoup 🙏",
    14,
    54,
  ],
  [
    1,
    "ACTU",
    "Postmortem : notre migration vers Prisma 7",
    "On a fini la migration Prisma 6 → 7 la semaine dernière. Le gros morceau : l'adaptateur driver et quelques requêtes brutes à réécrire. Bilan positif, build plus rapide et types plus fins. Je détaille les pièges dans un article à venir.",
    23,
    72,
  ],
  [
    2,
    "ACTU",
    "Petit rappel : vos candidatures méritent un suivi",
    "J'ai relancé deux entreprises cette semaine sur des candidatures « sans nouvelles » depuis 10 jours. Résultat : un entretien décroché. Un CRM (même une simple feuille) change tout pour ne rien laisser filer.",
    38,
    96,
  ],
];

async function main() {
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ""),
  });

  const ids = [];
  for (const a of authors) {
    await connection.execute(
      `INSERT INTO User (first_name, last_name, email, password, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), avatar_url = VALUES(avatar_url)`,
      [a.first_name, a.last_name, a.email, DEMO_HASH, a.avatar_url],
    );
    const [rows] = await connection.execute(
      `SELECT id FROM User WHERE email = ?`,
      [a.email],
    );
    ids.push(rows[0].id);
  }

  // Réinitialise les publications des auteurs seedés.
  await connection.query(
    `DELETE FROM Publication WHERE user_id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );

  for (const [authorIdx, type, title, content, likes, hoursAgo] of posts) {
    await connection.execute(
      `INSERT INTO Publication (user_id, title, content, type, is_public, likes_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, DATE_SUB(NOW(), INTERVAL ? HOUR), DATE_SUB(NOW(), INTERVAL ? HOUR))`,
      [ids[authorIdx], title, content, type, likes, hoursAgo, hoursAgo],
    );
  }

  console.log(
    `Seed publications OK : ${authors.length} auteurs, ${posts.length} publications.`,
  );
  await connection.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
