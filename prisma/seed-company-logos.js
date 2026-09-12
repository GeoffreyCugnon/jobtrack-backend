/**
 * Attribue une icône (logo) générée à toute entreprise sans logo « réel » —
 * initiales sur fond coloré, générées localement avec DiceBear (`initials`) :
 * SVG produit en mémoire et stocké en data URI (`Company.logo_url`,
 * LONGTEXT), donc aucun appel réseau à un service tiers à l'affichage
 * (contrairement à un CDN d'avatars externe). Idempotent : ne touche pas à
 * un logo déjà uploadé par l'utilisateur, ne régénère que `NULL` ou un ancien
 * logo posé par ce même script. Lancer avec `node prisma/seed-company-logos.js`.
 *
 * `@dicebear/core`/`@dicebear/collection` sont des packages ESM-only, d'où
 * l'`import()` dynamique dans ce script CommonJS.
 */
const mysql = require("mysql2/promise");

const databaseUrl =
  process.env.DATABASE_URL ||
  "mysql://root:root@192.168.1.85:3306/job_platform";
const url = new URL(databaseUrl);

// Palette DaisyUI-friendly (rendu correct sur fond clair ou sombre) : DiceBear
// pioche dedans de façon déterministe par nom (même entreprise -> même couleur
// à chaque régénération).
const BACKGROUND_COLORS = [
  "2563eb",
  "0d9488",
  "9333ea",
  "dc2626",
  "d97706",
  "16a34a",
  "0891b2",
  "db2777",
];

async function main() {
  const { createAvatar } = await import("@dicebear/core");
  const { initials } = await import("@dicebear/collection");

  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ""),
  });

  // Ne remplace que : pas de logo, l'ancien logo ui-avatars.com (service
  // externe abandonné), ou un logo déjà généré par ce script — jamais un
  // logo réellement uploadé par un utilisateur.
  const [rows] = await conn.query(
    `SELECT id, name FROM Company
     WHERE logo_url IS NULL
        OR logo_url LIKE 'https://ui-avatars.com/%'
        OR logo_url LIKE 'data:image/svg+xml%'`,
  );

  for (const { id, name } of rows) {
    const avatar = createAvatar(initials, {
      seed: name,
      backgroundColor: BACKGROUND_COLORS,
      textColor: ["ffffff"],
    });
    await conn.execute("UPDATE Company SET logo_url = ? WHERE id = ?", [
      avatar.toDataUri(),
      id,
    ]);
  }

  console.log(
    `Seed logos entreprises OK : ${rows.length} entreprise(s) mise(s) à jour (DiceBear, hors ligne).`,
  );
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
