/**
 * Seed de candidatures de démonstration, réparties sur les offres avec des
 * volumes variés — sert à voir le badge « Premier candidat » (affiché sous
 * le seuil de 5 candidatures, cf. `OfferCard.tsx`) coexister avec des offres
 * qui l'ont déjà dépassé, plutôt que de l'avoir systématiquement affiché
 * faute de données. Idempotent : purge d'abord toutes les candidatures des
 * comptes de démo/admin avant de les réinsérer.
 * Lancer avec `node prisma/seed-applications.js`.
 */
const mysql = require("mysql2/promise");

const databaseUrl =
  process.env.DATABASE_URL ||
  "mysql://root:root@192.168.1.85:3306/job_platform";
const url = new URL(databaseUrl);

// Comptes de démo (`seed-publications.js`) + admin (`seed-connections.js`) +
// admin2 (`seed-admin.js`) : pool de « candidats » réutilisé, pas de nouvel
// utilisateur créé par ce script.
const APPLICANT_EMAILS = [
  "camille.roux@demo.jobtrack",
  "sofiane.benali@demo.jobtrack",
  "lea.moreau@demo.jobtrack",
  "thomas.girard@demo.jobtrack",
  "nadia.haddad@demo.jobtrack",
  process.env.ADMIN_EMAIL || "admin@jobtrack.local",
  process.env.ADMIN2_EMAIL || "admin2@jobtrack.local",
];

async function idsByEmails(conn, emails) {
  const ids = [];
  for (const email of emails) {
    const [rows] = await conn.execute("SELECT id FROM User WHERE email = ?", [
      email,
    ]);
    if (rows[0]?.id) ids.push(rows[0].id);
  }
  return ids;
}

async function main() {
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ""),
  });

  const applicantIds = await idsByEmails(conn, APPLICANT_EMAILS);
  if (applicantIds.length === 0) {
    throw new Error(
      "Aucun compte candidat trouvé — lancez d'abord seed-publications.js / seed-admin.js.",
    );
  }

  const [offers] = await conn.query(
    "SELECT id FROM Job_offering ORDER BY id ASC",
  );
  if (offers.length === 0) {
    throw new Error("Aucune offre en base — lancez d'abord `npm run prisma:seed`.");
  }

  // Idempotence : on ne touche qu'aux candidatures posées par ce pool de
  // comptes (une vraie candidature d'un utilisateur réel n'est pas purgée).
  const placeholders = applicantIds.map(() => "?").join(",");
  await conn.execute(
    `DELETE FROM Application WHERE user_id IN (${placeholders})`,
    applicantIds,
  );

  // Cycle 0..7 candidatures par offre (déterministe par id) : couvre à la
  // fois le cas « moins de 5 » (badge affiché) et « 5 et plus » (masqué).
  let inserted = 0;
  for (let i = 0; i < offers.length; i++) {
    const offerId = offers[i].id;
    const count = Math.min(i % 8, applicantIds.length);
    for (let j = 0; j < count; j++) {
      const userId = applicantIds[(i + j) % applicantIds.length];
      await conn.execute(
        `INSERT INTO Application (user_id, job_offering_id, status, created_at, updated_at)
         VALUES (?, ?, 'PENDING', NOW(), NOW())`,
        [userId, offerId],
      );
      inserted++;
    }
  }

  console.log(
    `Seed candidatures OK : ${inserted} candidature(s) réparties sur ${offers.length} offre(s).`,
  );
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
