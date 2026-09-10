/**
 * Seed « activité candidat » pour les comptes de démo : candidatures,
 * entretiens, documents (CV / lettres) et commentaires d'actus.
 *
 * Cible : les emails de `TARGET_EMAILS` (surchargeable via `ACTIVITY_EMAILS`,
 * séparés par des virgules). Un email absent de la base est ignoré sans erreur.
 *
 * Idempotent : purge d'abord les candidatures / documents / commentaires de
 * l'utilisateur (les entretiens tombent en cascade avec les candidatures) puis
 * réinsère un jeu propre.
 *
 * Prérequis : `npm run prisma:seed` (companies + 30 offres) et la migration
 * `20260910133000_add_document_user_id` appliquée.
 */
const mysql = require('mysql2/promise');

const databaseUrl =
  process.env.DATABASE_URL ||
  'mysql://root:root@192.168.1.85:3306/job_platform';
const url = new URL(databaseUrl);

const TARGET_EMAILS = (
  process.env.ACTIVITY_EMAILS || 'admin@jobtrack.local,admin2@jobtrack.local'
)
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);

async function idByEmail(conn, email) {
  const [rows] = await conn.execute('SELECT id FROM User WHERE email = ?', [
    email,
  ]);
  return rows[0]?.id ?? null;
}

async function seedForUser(conn, userId) {
  // Offres et publications disponibles pour rattacher l'activité.
  const [offers] = await conn.query(
    'SELECT id FROM Job_offering ORDER BY id LIMIT 8',
  );
  const [publications] = await conn.query(
    'SELECT id FROM Publication WHERE deleted_at IS NULL ORDER BY id LIMIT 5',
  );
  if (offers.length < 5) {
    throw new Error(
      'Moins de 5 offres en base : lance d’abord `npm run prisma:seed`.',
    );
  }
  const offerId = (i) => offers[i].id;

  // --- Purge de l'activité existante de cet utilisateur -------------------
  await conn.execute('DELETE FROM Application WHERE user_id = ?', [userId]); // -> Interview en cascade
  await conn.execute('DELETE FROM Document WHERE user_id = ?', [userId]);
  await conn.execute('DELETE FROM Comment WHERE user_id = ?', [userId]);
  await conn.execute('DELETE FROM User_skill WHERE user_id = ?', [userId]);

  // --- Profil (champs éditables) -------------------------------------
  await conn.execute(
    `UPDATE User SET headline = ?, bio = ?, location = ?, phone = ?,
       website = ?, linkedin = ?, github = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      'Développeur Web Fullstack',
      "En reconversion réussie vers le développement web, spécialisé React / Node.js. Je cherche une équipe produit où apprendre vite et livrer utile.",
      'Nice, France',
      '+33 6 12 34 56 78',
      'exemple.dev',
      'linkedin.com/in/exemple',
      'github.com/exemple',
      userId,
    ],
  );

  // --- Compétences -------------------------------------------------------
  const skills = [
    'React',
    'TypeScript',
    'Node.js',
    'NestJS',
    'PostgreSQL',
    'Tailwind CSS',
    'Git',
    'Docker',
    'Tests (Vitest / Cypress)',
    'Autonomie',
  ];
  for (const name of skills) {
    await conn.execute(
      `INSERT INTO Skill (name, created_at, updated_at) VALUES (?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [name],
    );
    const [[{ id: skillId }]] = await conn.query(
      'SELECT id FROM Skill WHERE name = ?',
      [name],
    );
    await conn.execute(
      `INSERT IGNORE INTO User_skill (user_id, skill_id, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())`,
      [userId, skillId],
    );
  }

  // --- Candidatures (entreprises variées : offres 1 / 3 / 4 / 6 / 8) ----
  const applications = [
    { offer: offerId(0), status: 'PENDING', daysAgo: 3 },
    { offer: offerId(2), status: 'PENDING', daysAgo: 6 },
    { offer: offerId(3), status: 'ACCEPTED', daysAgo: 10 },
    { offer: offerId(5), status: 'REJECTED', daysAgo: 14 },
    { offer: offerId(7), status: 'WITHDRAWN', daysAgo: 20 },
  ];

  const applicationIds = [];
  for (const application of applications) {
    const [res] = await conn.execute(
      `INSERT INTO Application (user_id, job_offering_id, status, created_at, updated_at)
       VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), NOW())`,
      [userId, application.offer, application.status, application.daysAgo],
    );
    applicationIds.push(res.insertId);
  }

  // --- Entretiens (sur les 2 premières candidatures, dans le futur) -----
  const interviews = [
    {
      application: applicationIds[0],
      type: 'VISIO',
      inDays: 2,
      atHour: 14,
      notes: 'https://meet.example.com/entretien-rh',
    },
    {
      application: applicationIds[1],
      type: 'PRESENTIEL',
      inDays: 5,
      atHour: 10,
      notes: '12 rue de la Tech, 06560 Sophia Antipolis',
    },
    {
      application: applicationIds[2],
      type: 'TELEPHONE',
      inDays: 8,
      atHour: 9,
      notes: 'Appel de M. Bernard (RH) — prévoir 30 min.',
    },
  ];

  for (const interview of interviews) {
    await conn.execute(
      `INSERT INTO Interview (application_id, interview_type, scheduled_at, notes, created_at, updated_at)
       VALUES (?, ?, DATE_ADD(DATE_ADD(CURDATE(), INTERVAL ? DAY), INTERVAL ? HOUR), ?, NOW(), NOW())`,
      [
        interview.application,
        interview.type,
        interview.inDays,
        interview.atHour,
        interview.notes,
      ],
    );
  }

  // --- Documents (bibliothèque CV / lettres) ---------------------------
  const documents = [
    { title: 'CV principal — Développeur Fullstack', type: 'CV' },
    { title: 'CV anglais — Software Engineer', type: 'CV' },
    { title: 'Lettre de motivation — TechCorp', type: 'LETTRE' },
    { title: 'Lettre de motivation — modèle générique', type: 'LETTRE' },
  ];

  for (const doc of documents) {
    await conn.execute(
      `INSERT INTO Document (user_id, title, type, file_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        doc.title,
        doc.type,
        `internal://document/${userId}/${doc.type.toLowerCase()}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,
      ],
    );
  }

  // --- Commentaires sur les actus existantes --------------------------
  const comments = [
    'Merci pour le partage, très utile !',
    'Je suis passé par là aussi, courage 💪',
    'Une fourchette de salaire pour ce poste ?',
  ];
  for (let i = 0; i < Math.min(comments.length, publications.length); i += 1) {
    await conn.execute(
      `INSERT INTO Comment (publication_id, user_id, content, created_at, updated_at)
       VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR), NOW())`,
      [publications[i].id, userId, comments[i], (i + 1) * 3],
    );
  }

  return {
    applications: applications.length,
    interviews: interviews.length,
    documents: documents.length,
    comments: Math.min(comments.length, publications.length),
    skills: skills.length,
  };
}

async function main() {
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ''),
  });

  let seeded = 0;
  for (const email of TARGET_EMAILS) {
    const userId = await idByEmail(conn, email);
    if (!userId) {
      console.log(`- ${email} : absent de la base, ignoré.`);
      continue;
    }
    const counts = await seedForUser(conn, userId);
    seeded += 1;
    console.log(
      `- ${email} (#${userId}) : ${counts.applications} candidatures, ${counts.interviews} entretiens, ${counts.documents} documents, ${counts.comments} commentaires, ${counts.skills} compétences.`,
    );
  }

  console.log(`Seed activité terminé pour ${seeded} compte(s).`);
  await conn.end();
}

main().catch((error) => {
  console.error('Seed activité échoué :', error);
  process.exit(1);
});
