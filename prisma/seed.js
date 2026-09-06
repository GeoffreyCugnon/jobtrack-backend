const mysql = require('mysql2/promise');

const databaseUrl =
  process.env.DATABASE_URL ||
  'mysql://root:root@192.168.1.85:3306/job_platform';
const url = new URL(databaseUrl);

const companies = [
  {
    id: 1,
    name: 'TechCorp',
    business_sector: 'IT',
    website: 'https://techcorp.example',
    address: 'Nice, France',
    is_public: true,
  },
  {
    id: 2,
    name: 'CloudNine',
    business_sector: 'IT',
    website: 'https://cloudnine.example',
    address: 'Sophia Antipolis, France',
    is_public: true,
  },
  {
    id: 3,
    name: 'Mairie de Nice',
    business_sector: 'Administration',
    website: 'https://nice.fr',
    address: 'Nice, France',
    is_public: true,
  },
  {
    id: 4,
    name: 'Académie Sud',
    business_sector: 'Education',
    website: 'https://academie-sud.example',
    address: 'Antibes, France',
    is_public: true,
  },
  {
    id: 5,
    name: 'ShopLine',
    business_sector: 'Commerce',
    website: 'https://shopline.example',
    address: 'Grasse, France',
    is_public: false,
  },
  {
    id: 6,
    name: 'TransExpress',
    business_sector: 'Transport',
    website: 'https://transexpress.example',
    address: 'Lyon, France',
    is_public: true,
  },
  {
    id: 7,
    name: 'Clinique du Parc',
    business_sector: 'Santé',
    website: 'https://cliniqueparc.example',
    address: 'Cannes, France',
    is_public: true,
  },
  {
    id: 8,
    name: 'AgenceNova',
    business_sector: 'Marketing',
    website: 'https://agencenova.example',
    address: 'Antibes, France',
    is_public: false,
  },
  {
    id: 9,
    name: 'BanquePop',
    business_sector: 'Finance',
    website: 'https://banquepop.example',
    address: 'Nice, France',
    is_public: true,
  },
  {
    id: 10,
    name: 'RemoteWorks',
    business_sector: 'IT',
    website: 'https://remoteworks.example',
    address: 'France',
    is_public: true,
  },
];

const offers = [
  {
    id: 1,
    title: 'Développeuse Fullstack',
    description: '...',
    contract_type: 'CDI',
    company_id: 1,
  },
  {
    id: 2,
    title: 'Concepteur Appli',
    description: '...',
    contract_type: 'CDI',
    company_id: 2,
  },
  {
    id: 3,
    title: 'Support IT',
    description: '...',
    contract_type: 'CDD',
    company_id: 1,
  },
  {
    id: 4,
    title: 'Gestionnaire administratif',
    description: '...',
    contract_type: 'CDI',
    company_id: 3,
  },
  {
    id: 5,
    title: 'Formateur numérique',
    description: '...',
    contract_type: 'CDD',
    company_id: 4,
  },
  {
    id: 6,
    title: 'Assistant e-commerce',
    description: '...',
    contract_type: 'Freelance',
    company_id: 5,
  },
  {
    id: 7,
    title: 'Chauffeur-livreur',
    description: '...',
    contract_type: 'CDI',
    company_id: 6,
  },
  {
    id: 8,
    title: 'Aide-soignant(e)',
    description: '...',
    contract_type: 'CDD',
    company_id: 7,
  },
  {
    id: 9,
    title: 'Chargé(e) de communication',
    description: '...',
    contract_type: 'CDI',
    company_id: 8,
  },
  {
    id: 10,
    title: 'Analyste financier',
    description: '...',
    contract_type: 'CDI',
    company_id: 9,
  },
  {
    id: 11,
    title: 'Développeur Backend',
    description: '...',
    contract_type: 'CDI',
    company_id: 10,
  },
  {
    id: 12,
    title: 'Data Analyst',
    description: '...',
    contract_type: 'CDD',
    company_id: 10,
  },
];

async function main() {
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ''),
    // Auth caching_sha2_password sans TLS (cf. prisma.service.ts).
    allowPublicKeyRetrieval: true,
  });

  for (const company of companies) {
    await connection.execute(
      `
        INSERT INTO Company (id, name, business_sector, website, address, is_public, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          business_sector = VALUES(business_sector),
          website = VALUES(website),
          address = VALUES(address),
          is_public = VALUES(is_public),
          updated_at = NOW()
      `,
      [
        company.id,
        company.name,
        company.business_sector,
        company.website,
        company.address,
        company.is_public ? 1 : 0,
      ],
    );
  }

  for (const offer of offers) {
    await connection.execute(
      `
        INSERT INTO Job_offering (id, company_id, title, contract_type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          company_id = VALUES(company_id),
          title = VALUES(title),
          contract_type = VALUES(contract_type),
          description = VALUES(description),
          updated_at = NOW()
      `,
      [
        offer.id,
        offer.company_id,
        offer.title,
        offer.contract_type,
        offer.description,
      ],
    );
  }

  console.log(
    `Seed complete: ${companies.length} companies and ${offers.length} offers inserted/updated.`,
  );
  await connection.end();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
