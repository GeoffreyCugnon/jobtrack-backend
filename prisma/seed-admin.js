/**
 * Seed d'un second compte « admin » (compte de login normal — il n'existe
 * aucun système de privilèges dans l'API, cf. Backend/CLAUDE.md audit v4 :
 * le modèle Role n'est rattaché à aucun guard). Sert de second identifiant
 * de test/démo, à côté de `admin@jobtrack.local`.
 *
 * Idempotent (relançable) : INSERT ... ON DUPLICATE KEY UPDATE sur l'email
 * (unique). Un relancement remet à jour prénom/nom/mot de passe.
 * Lancer avec `node prisma/seed-admin.js` (ou `npm run prisma:seed:admin`).
 *
 * Surcharges possibles par env :
 *   ADMIN2_EMAIL       (défaut admin2@jobtrack.local)
 *   ADMIN2_FIRST_NAME  (défaut Admin)
 *   ADMIN2_LAST_NAME   (défaut Deux)
 *   ADMIN2_PASSWORD_HASH  hash argon2id déjà calculé (défaut : celui de
 *                         "Admin2!Track2026", cf. ci-dessous)
 *   ADMIN2_AVATAR_URL  photo de profil (défaut : la même que celle que
 *                      `seed-avatars.js` attribuerait à cet id). Posée
 *                      uniquement si le compte n'a pas déjà un avatar.
 */
const mysql = require("mysql2/promise");

const databaseUrl =
  process.env.DATABASE_URL ||
  "mysql://root:root@192.168.1.85:3306/job_platform";
const url = new URL(databaseUrl);

const EMAIL = process.env.ADMIN2_EMAIL || "admin2@jobtrack.local";
const FIRST_NAME = process.env.ADMIN2_FIRST_NAME || "Admin";
const LAST_NAME = process.env.ADMIN2_LAST_NAME || "Deux";

// argon2id de "Admin2!Track2026" (respecte @IsStrongPassword : maj + chiffre
// + symbole, 15 car.). Régénérer avec :
//   node -e "require('argon2').hash('<motdepasse>').then(console.log)"
const PASSWORD_HASH =
  process.env.ADMIN2_PASSWORD_HASH ||
  "$argon2id$v=19$m=65536,t=3,p=4$JZB6B9MK3KXw4T1mLOCwBg$hHXl7X/DNvjlS63Ua+zV8nK0USPUU8p5iS5D1aK0DjE";

// Même schéma déterministe que `seed-avatars.js` (photo stable par id).
function portraitForId(id) {
  const gender = id % 2 === 0 ? "men" : "women";
  const n = (id * 7 + 13) % 100;
  return `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;
}

async function main() {
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ""),
  });

  await connection.execute(
    `INSERT INTO User (first_name, last_name, email, password, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       first_name = VALUES(first_name),
       last_name = VALUES(last_name),
       password = VALUES(password),
       updated_at = NOW()`,
    [FIRST_NAME, LAST_NAME, EMAIL, PASSWORD_HASH],
  );

  const [rows] = await connection.execute(
    `SELECT id FROM User WHERE email = ?`,
    [EMAIL],
  );
  const id = rows[0].id;

  // Avatar : ne l'écrase pas si le compte en a déjà un (ex. changé via l'app).
  const avatarUrl = process.env.ADMIN2_AVATAR_URL || portraitForId(id);
  await connection.execute(
    `UPDATE User SET avatar_url = ?, updated_at = NOW()
     WHERE id = ? AND (avatar_url IS NULL OR avatar_url = '')`,
    [avatarUrl, id],
  );

  console.log(
    `Seed admin OK : compte #${id} — ${EMAIL} (${FIRST_NAME} ${LAST_NAME}).`,
  );
  await connection.end();
}

main().catch((error) => {
  console.error("Seed admin failed:", error);
  process.exit(1);
});
