/**
 * Seed du référentiel `Job_category` (13 lignes) — reprend l'ancienne constante
 * Front `data/offerCategories`. Le pictogramme et la pastille de couleur restent
 * côté Front (map `key` -> style) : ici on ne stocke que la donnée.
 *
 * Idempotent : upsert par `key` (INSERT ... ON DUPLICATE KEY UPDATE).
 *
 * Lancer : `npm run prisma:seed:categories`
 */
const mysql = require('mysql2/promise');

const databaseUrl =
  process.env.DATABASE_URL ||
  'mysql://root:root@192.168.1.85:3306/job_platform';
const url = new URL(databaseUrl);

// `sort_order` = ordre d'affichage du filtre. Les deux premières (`is_work_mode`)
// sont masquées du filtre « Catégorie » côté Front (elles relèvent du filtre
// « Mode de travail »), gardées ici pour résoudre un libellé.
const categories = [
  { key: 'distance', label: 'À distance', is_work_mode: 1, sort_order: 1, description: 'Travaillez entièrement à distance, sans contrainte de site.' },
  { key: 'hybride', label: 'Hybride', is_work_mode: 1, sort_order: 2, description: 'Un équilibre entre présentiel et télétravail, où que vous soyez.' },
  { key: 'informatique', label: 'Informatique', is_work_mode: 0, sort_order: 3, description: 'Développement, support et infrastructure pour les équipes tech.' },
  { key: 'enseignement', label: 'Enseignement', is_work_mode: 0, sort_order: 4, description: 'Former et transmettre, du primaire à l’enseignement supérieur.' },
  { key: 'hotellerie', label: 'Hôtellerie', is_work_mode: 0, sort_order: 5, description: 'Accueil, restauration et service dans l’hôtellerie-restauration.' },
  { key: 'administration', label: 'Administration publique', is_work_mode: 0, sort_order: 6, description: 'Des postes au service de l’intérêt général, dans les collectivités et l’État.' },
  { key: 'temps-partiel', label: 'Temps partiel', is_work_mode: 0, sort_order: 7, description: 'Des missions flexibles, adaptées à votre emploi du temps.' },
  { key: 'commerce', label: 'Commerce', is_work_mode: 0, sort_order: 8, description: 'Vente, conseil et relation client en magasin ou à distance.' },
  { key: 'transport', label: 'Transport & Logistique', is_work_mode: 0, sort_order: 9, description: 'Acheminer, organiser et optimiser les flux de marchandises.' },
  { key: 'sante', label: 'Santé', is_work_mode: 0, sort_order: 10, description: 'Prendre soin des patients, en établissement ou à domicile.' },
  { key: 'industrie', label: 'Industrie', is_work_mode: 0, sort_order: 11, description: 'Fabrication, maintenance et production sur site industriel.' },
  { key: 'marketing', label: 'Marketing & Communication', is_work_mode: 0, sort_order: 12, description: 'Faire connaître une marque et parler à ses clients.' },
  { key: 'finance', label: 'Finance', is_work_mode: 0, sort_order: 13, description: 'Gérer, analyser et sécuriser les flux financiers.' },
];

async function main() {
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  });

  for (const c of categories) {
    await conn.execute(
      'INSERT INTO `Job_category` (`key`, `label`, `description`, `is_work_mode`, `sort_order`) ' +
        'VALUES (?, ?, ?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `description` = VALUES(`description`), ' +
        '`is_work_mode` = VALUES(`is_work_mode`), `sort_order` = VALUES(`sort_order`)',
      [c.key, c.label, c.description, c.is_work_mode, c.sort_order],
    );
  }

  const [[{ count }]] = await conn.query(
    'SELECT COUNT(*) AS count FROM `Job_category`',
  );
  console.log(`Job_category : ${count} lignes.`);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
