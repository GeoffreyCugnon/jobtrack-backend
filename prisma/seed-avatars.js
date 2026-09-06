/**
 * Réattribue à CHAQUE utilisateur une photo de profil réaliste (randomuser.me,
 * CDN public), déterministe par id — remplace les anciens avatars DiceBear.
 * Idempotent. Lancer avec `node prisma/seed-avatars.js`.
 */
const mysql = require("mysql2/promise");

const databaseUrl =
  process.env.DATABASE_URL ||
  "mysql://root:root@192.168.1.85:3306/job_platform";
const url = new URL(databaseUrl);

function portraitForId(id) {
  const gender = id % 2 === 0 ? "men" : "women";
  // décalage pour éviter que id 0/1 tombe toujours sur le visage 0/1
  const n = (id * 7 + 13) % 100;
  return `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;
}

async function main() {
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ""),
  });

  const [rows] = await conn.query("SELECT id FROM User");
  for (const { id } of rows) {
    await conn.execute("UPDATE User SET avatar_url = ? WHERE id = ?", [
      portraitForId(id),
      id,
    ]);
  }

  console.log(`Seed avatars OK : ${rows.length} utilisateur(s) mis à jour.`);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
