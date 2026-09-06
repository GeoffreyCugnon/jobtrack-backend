/**
 * Seed des relations du compte admin : quelques relations déjà acceptées + des
 * invitations en attente à accepter, pour avoir de quoi tester la page Réseau.
 * Idempotent : purge d'abord toutes les lignes Connection impliquant l'admin.
 * Lancer avec `node prisma/seed-connections.js`.
 *
 * `ADMIN_EMAIL` (env, défaut `admin@jobtrack.local`) désigne le compte pour
 * lequel on seed les relations.
 */
const mysql = require("mysql2/promise");

const databaseUrl =
  process.env.DATABASE_URL ||
  "mysql://root:root@192.168.1.85:3306/job_platform";
const url = new URL(databaseUrl);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@jobtrack.local";

// Utilisateurs de démo créés par `seed-publications.js`.
const DEMO_EMAILS = [
  "camille.roux@demo.jobtrack",
  "sofiane.benali@demo.jobtrack",
  "lea.moreau@demo.jobtrack",
  "thomas.girard@demo.jobtrack",
  "nadia.haddad@demo.jobtrack",
];

async function idByEmail(conn, email) {
  const [rows] = await conn.execute("SELECT id FROM User WHERE email = ?", [
    email,
  ]);
  return rows[0]?.id ?? null;
}

async function main() {
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ""),
  });

  const adminId = await idByEmail(conn, ADMIN_EMAIL);
  if (!adminId) {
    throw new Error(
      `Compte admin introuvable (${ADMIN_EMAIL}). Créez-le d'abord (register).`,
    );
  }

  const demoIds = [];
  for (const email of DEMO_EMAILS) {
    const id = await idByEmail(conn, email);
    if (id) demoIds.push(id);
  }
  if (demoIds.length < DEMO_EMAILS.length) {
    console.warn(
      "Certains utilisateurs de démo manquent — lancez d'abord `node prisma/seed-publications.js`.",
    );
  }

  // Purge des lignes impliquant l'admin (idempotence).
  await conn.execute(
    "DELETE FROM Connection WHERE user_action_id = ? OR user_receiver_id = ?",
    [adminId, adminId],
  );

  // 3 premières : relations acceptées (le membre de démo a « invité » l'admin).
  // 2 dernières : invitations reçues en attente, à accepter depuis la page.
  const accepted = demoIds.slice(0, 3);
  const pendingIncoming = demoIds.slice(3);

  for (const otherId of accepted) {
    await conn.execute(
      `INSERT INTO Connection (user_action_id, user_receiver_id, status, created_at, updated_at)
       VALUES (?, ?, 'ACCEPTED', NOW(), NOW())`,
      [otherId, adminId],
    );
  }
  for (const otherId of pendingIncoming) {
    await conn.execute(
      `INSERT INTO Connection (user_action_id, user_receiver_id, status, created_at, updated_at)
       VALUES (?, ?, 'PENDING', NOW(), NOW())`,
      [otherId, adminId],
    );
  }

  console.log(
    `Seed connexions OK : admin #${adminId} — ${accepted.length} relation(s) acceptée(s), ${pendingIncoming.length} invitation(s) en attente.`,
  );
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
