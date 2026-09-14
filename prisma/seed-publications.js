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

// [authorIndex, type, title, content, likes, heuresDansLePasse, image?]
const posts = [
  [
    0,
    "ACTU",
    "Retour sur le meetup React de Sophia",
    "Super soirée hier au meetup React Côte d'Azur 🎉 Trois talks très concrets : Server Components en prod, tests avec Vitest, et migration progressive vers React 19. Les slides arrivent bientôt, je partagerai le lien ici.",
    27,
    3,
    "https://picsum.photos/seed/jobtrack-react/1000/560",
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
    "https://picsum.photos/seed/jobtrack-reconversion/900/1200",
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
    "https://picsum.photos/seed/jobtrack-prisma/1200/675",
  ],
  [
    2,
    "ACTU",
    "Petit rappel : vos candidatures méritent un suivi",
    "J'ai relancé deux entreprises cette semaine sur des candidatures « sans nouvelles » depuis 10 jours. Résultat : un entretien décroché. Un CRM (même une simple feuille) change tout pour ne rien laisser filer.",
    38,
    96,
  ],
  // Volume supplémentaire (pas de contenu narratif particulier) : sert à
  // tester le rendu de l'accueil invité sur les paliers hauts de
  // `PUBLICATIONS_PREVIEW_TIERS` (grands écrans) sans dépendre d'un jeu de
  // données trop restreint.
  [3, "ACTU", "Retour d'expérience meetup DevOps", "Bonne session hier sur les pipelines CI/CD, plein de retours concrets sur GitLab CI vs GitHub Actions.", 12, 100],
  [4, "ANNONCE", "Recherche stage data/BI - printemps", "Étudiante en M1 data, je cherche un stage data/BI à partir de mars sur Nice / Sophia / remote. Dispo pour échanger en MP.", 9, 110],
  [0, "ARTICLE", "5 questions à se poser avant d'accepter une offre", "Salaire à part, ce qui compte vraiment : l'équipe, le produit, l'autonomie, le télétravail réel, et la trajectoire de la boîte.", 31, 120],
  [1, "ACTU", "Retour sur un an de télétravail full remote", "Un an après le passage en full remote : plus de deep work, un peu moins de sérendipité d'équipe. Le bilan reste largement positif.", 22, 130],
  [2, "ANNONCE", "Recherche dev mobile React Native", "Notre équipe cherche un·e dev React Native (2+ ans) pour une appli déjà en prod, CDI Nice ou remote.", 17, 140],
  [3, "ACTU", "Ce que j'ai appris en relisant du code d'il y a 2 ans", "Verdict sans appel : trop de commentaires inutiles, pas assez de tests. Bon rappel avant de se relancer sur un vieux projet.", 8, 150],
  [4, "ARTICLE", "Se former en autodidacte : ce qui a marché pour moi", "Un projet perso concret bat toujours une formation théorique sans mise en pratique. Le vrai déclic est venu en cassant des choses.", 44, 160],
  [0, "ACTU", "Petit bilan du salon emploi tech de la semaine", "Beaucoup de stands DevOps/cloud cette année, moins de front pur. Le marché semble se déplacer doucement.", 15, 170],
  [1, "ANNONCE", "On recrute un·e alternant·e QA", "Poste d'alternant·e QA/test à pourvoir dès septembre, encadrement assuré, stack Cypress + Playwright.", 11, 180],
  [2, "ARTICLE", "Pourquoi j'ai arrêté de candidater en masse", "Dix candidatures ciblées valent mieux que cent envoyées au hasard. La qualité de la lettre change tout au taux de réponse.", 29, 190],
  [3, "ACTU", "Retour sur la conf React Paris de cette année", "Beaucoup de contenu sur les Server Components et le streaming SSR, moins de hype pure cette édition, plus de retours d'expérience prod.", 33, 200],
  // Volume supplémentaire (idem `seed.js`) : couvre les très grands écrans
  // (4K portrait...) sans dépendre d'un jeu de données trop restreint.
  [4, "ARTICLE", "Ce qui a vraiment changé depuis mon premier CDI", "Moins de stress sur les détails, plus d'attention portée aux vraies priorités. L'expérience aide surtout à savoir où NE PAS aller trop vite.", 26, 210],
  [0, "ANNONCE", "Recherche dev backend Go - mission courte", "Mission de 6 semaines pour renforcer une équipe backend Go sur un projet fintech, remote possible.", 18, 220],
  [1, "ACTU", "Bilan de notre premier hackathon interne", "Deux jours, six équipes, une appli de covoiturage interne sortie du lot. On recommence l'an prochain.", 21, 230],
  [2, "ARTICLE", "Le syndrome de l'imposteur ne disparaît jamais totalement", "Il change juste de forme avec l'expérience. En parler ouvertement avec son équipe aide énormément.", 47, 240],
  [3, "ACTU", "Retour d'expérience : passer de Jest à Vitest", "Migration terminée sur trois repos, temps de test divisé par deux, quelques mocks à réécrire.", 14, 250],
  [4, "ANNONCE", "Recherche mentor en développement front", "Junior en autodidaxie, je cherche un·e mentor pour un point mensuel sur mon code. Café virtuel bienvenu.", 20, 260],
  [0, "ARTICLE", "Ce que je regarde vraiment sur un CV", "Moins les intitulés de poste, plus les projets concrets et ce que la personne en dit en entretien.", 36, 270],
  [1, "ACTU", "On a doublé notre couverture de tests en un trimestre", "Objectif fixé en janvier atteint : passage de 40% à 82% de couverture sur le service principal.", 25, 280],
  [2, "ANNONCE", "Recherche designer UI freelance - refonte app", "Refonte de l'interface d'une appli mobile B2C, mission de 2 mois, budget à discuter selon profil.", 16, 290],
  [3, "ARTICLE", "Pourquoi j'ai arrêté les todo-lists infinies", "Trois tâches par jour maximum, le reste attend. Contre-intuitif mais radicalement plus efficace pour moi.", 39, 300],
  [4, "ACTU", "Retour sur notre premier sprint en 4 jours", "Test d'un rythme de travail sur 4 jours pendant un mois : productivité stable, moral en nette hausse.", 30, 310],
  [0, "ANNONCE", "Recherche alternant·e développement full-stack", "Poste d'alternance dès septembre, stack React/NestJS, encadrement par un senior dédié.", 13, 320],
  [1, "ARTICLE", "Ce que j'aurais aimé savoir sur le télétravail", "L'isolement se travaille autant que l'autonomie. Un rituel de café virtuel a changé la donne pour notre équipe.", 28, 330],
  [2, "ACTU", "Petit bilan de notre veille technique hebdo", "Quinze minutes le vendredi, un article partagé par personne. Simple, mais ça tient dans la durée.", 17, 340],
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

  for (const [
    authorIdx,
    type,
    title,
    content,
    likes,
    hoursAgo,
    image = null,
  ] of posts) {
    await connection.execute(
      `INSERT INTO Publication (user_id, title, content, image_url, type, is_public, likes_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, DATE_SUB(NOW(), INTERVAL ? HOUR), DATE_SUB(NOW(), INTERVAL ? HOUR))`,
      [ids[authorIdx], title, content, image, type, likes, hoursAgo, hoursAgo],
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
