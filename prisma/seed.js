const mysql = require('mysql2/promise');

const databaseUrl =
  process.env.DATABASE_URL ||
  'mysql://root:root@192.168.1.85:3306/job_platform';
const url = new URL(databaseUrl);

// Entreprises de démo. `address` alimente le champ `location` des offres côté
// API (`toOfferDto`), `verified` alimente le badge « Vérifiée ».
const companies = [
  { id: 1, name: 'TechCorp', business_sector: 'IT', website: 'https://techcorp.example', address: 'Sophia Antipolis, Alpes-Maritimes, France', is_public: true, verified: true },
  { id: 2, name: 'CloudNine', business_sector: 'IT', website: 'https://cloudnine.example', address: 'Sophia Antipolis, Alpes-Maritimes, France', is_public: true, verified: true },
  { id: 3, name: 'Mairie de Nice', business_sector: 'Administration', website: 'https://nice.fr', address: 'Nice, Alpes-Maritimes, France', is_public: true, verified: true },
  { id: 4, name: 'Académie Sud', business_sector: 'Éducation', website: 'https://academie-sud.example', address: 'Antibes, Alpes-Maritimes, France', is_public: true, verified: false },
  { id: 5, name: 'ShopLine', business_sector: 'Commerce', website: 'https://shopline.example', address: 'Grasse, Alpes-Maritimes, France', is_public: false, verified: false },
  { id: 6, name: 'TransExpress', business_sector: 'Transport & Logistique', website: 'https://transexpress.example', address: 'Lyon, Rhône, France', is_public: true, verified: false },
  { id: 7, name: 'Clinique du Parc', business_sector: 'Santé', website: 'https://cliniqueparc.example', address: 'Cannes, Alpes-Maritimes, France', is_public: true, verified: true },
  { id: 8, name: 'AgenceNova', business_sector: 'Marketing & Communication', website: 'https://agencenova.example', address: 'Antibes, Alpes-Maritimes, France', is_public: false, verified: false },
  { id: 9, name: 'BanquePop', business_sector: 'Finance', website: 'https://banquepop.example', address: 'Nice, Alpes-Maritimes, France', is_public: true, verified: true },
  { id: 10, name: 'RemoteWorks', business_sector: 'IT', website: 'https://remoteworks.example', address: 'Full remote, France', is_public: true, verified: true },
  { id: 11, name: 'Hôtel Le Majestic', business_sector: 'Hôtellerie', website: 'https://lemajestic.example', address: 'Cannes, Alpes-Maritimes, France', is_public: true, verified: false },
  { id: 12, name: 'Hôpital Pasteur', business_sector: 'Santé', website: 'https://chu-pasteur.example', address: 'Nice, Alpes-Maritimes, France', is_public: true, verified: true },
  { id: 13, name: 'ContentFlow', business_sector: 'Marketing & Communication', website: 'https://contentflow.example', address: 'Full remote, France', is_public: true, verified: false },
  { id: 14, name: 'PixelWorks', business_sector: 'IT', website: 'https://pixelworks.example', address: 'Nice, Alpes-Maritimes, France', is_public: true, verified: false },
  { id: 15, name: 'Lycée Saint-Exupéry', business_sector: 'Éducation', website: 'https://lycee-st-ex.example', address: 'Cannes, Alpes-Maritimes, France', is_public: true, verified: true },
  { id: 16, name: 'LogiSud', business_sector: 'Transport & Logistique', website: 'https://logisud.example', address: 'Antibes, Alpes-Maritimes, France', is_public: true, verified: false },
  { id: 17, name: 'Nomad Agency', business_sector: 'Conseil', website: 'https://nomad-agency.example', address: 'Full remote, Europe', is_public: true, verified: false },
  { id: 18, name: 'Supermarché Leclerc', business_sector: 'Commerce', website: 'https://e-leclerc.example', address: 'Nice, Alpes-Maritimes, France', is_public: true, verified: false },
];

// Offres de démo. `category` et `workMode` ne sont PAS stockés : l'API les
// infère du `title` (`JobOfferingService.inferCategory` / `inferWorkMode`), les
// titres ci-dessous sont choisis pour tomber dans la bonne catégorie / le bon
// mode de travail. `hoursAgo` décale `created_at` pour varier « Il y a Xh » et
// l'ordre d'affichage (tri par date décroissante). `contract_type` ∈
// { CDI, CDD, Freelance, Stage } (enum Prisma `Job_offering_contract_type`).
const offers = [
  { id: 1, company_id: 1, title: 'Développeuse Fullstack — poste hybride', contract_type: 'CDI', hoursAgo: 2, description: "Vous concevez et faites évoluer nos applications web (React, Node.js) au sein d'une équipe produit de six personnes. Revues de code en binôme, participation aux choix d'architecture et au refinement. Deux jours de télétravail par semaine." },
  { id: 2, company_id: 1, title: 'Développeur Backend Node.js', contract_type: 'CDI', hoursAgo: 9, description: "Développement des services API (NestJS, PostgreSQL) qui alimentent nos produits SaaS. Vous êtes garant de la qualité : tests, observabilité, revue des schémas de données. Environnement CI/CD outillé." },
  { id: 3, company_id: 2, title: 'Ingénieur DevOps Cloud (télétravail partiel)', contract_type: 'CDI', hoursAgo: 30, description: "Vous industrialisez le déploiement de nos plateformes sur AWS (Terraform, Kubernetes, GitLab CI). Astreinte partagée une semaine sur six. Trois jours de télétravail par semaine." },
  { id: 4, company_id: 14, title: 'Développeuse Frontend React', contract_type: 'CDI', hoursAgo: 10, description: "Intégration et développement d'interfaces riches (React, TypeScript, Tailwind) à partir des maquettes Figma. Vous travaillez au contact direct des designers et du pôle UX. Accessibilité et performances au cœur du poste." },
  { id: 5, company_id: 2, title: 'Data Analyst SQL / Python', contract_type: 'CDD', hoursAgo: 48, description: "Analyse des données d'usage produit, construction de tableaux de bord (Metabase) et cadrage des indicateurs avec les équipes métier. Mission de 12 mois renouvelable." },
  { id: 6, company_id: 10, title: 'Développeur Backend — full remote', contract_type: 'CDI', hoursAgo: 1, description: "Poste 100% télétravail au sein d'une équipe distribuée (France, Portugal, Pologne). Développement backend Go et PostgreSQL, forte autonomie, rituels asynchrones. Deux rassemblements physiques par an." },
  { id: 7, company_id: 10, title: 'Data Engineer en télétravail complet', contract_type: 'CDI', hoursAgo: 24, description: "Vous construisez et maintenez les pipelines de données (Airflow, dbt, BigQuery) de nos clients grands comptes. Travail entièrement à distance, horaires flexibles sur le fuseau européen." },
  { id: 8, company_id: 3, title: 'Gestionnaire administratif', contract_type: 'CDI', hoursAgo: 72, description: "Suivi des dossiers administratifs d'un service de 40 agents : courriers, marchés publics, archivage. Poste en présentiel à l'Hôtel de Ville, titulaire ou contractuel." },
  { id: 9, company_id: 3, title: "Agent d'accueil administratif", contract_type: 'CDD', hoursAgo: 96, description: "Accueil physique et téléphonique du public, orientation des usagers, saisie et mise à jour des dossiers. CDD de 6 mois, horaires de bureau." },
  { id: 10, company_id: 4, title: 'Formateur numérique adultes', contract_type: 'CDD', hoursAgo: 96, description: "Animation de sessions de formation aux outils bureautiques et à la culture numérique pour des publics en reconversion. Conception des supports pédagogiques. Déplacements ponctuels sur le département." },
  { id: 11, company_id: 15, title: 'Professeur de mathématiques (remplacement)', contract_type: 'CDD', hoursAgo: 144, description: "Remplacement d'un enseignant de mathématiques sur des classes de seconde et première, jusqu'à la fin de l'année scolaire. 18 heures hebdomadaires." },
  { id: 12, company_id: 4, title: 'Responsable de formation continue', contract_type: 'CDI', hoursAgo: 120, description: "Pilotage de l'offre de formation continue : ingénierie pédagogique, relation avec les financeurs (OPCO), suivi qualité Qualiopi. Management d'une équipe de trois formateurs." },
  { id: 13, company_id: 8, title: 'Chargé(e) de communication', contract_type: 'CDI', hoursAgo: 24, description: "Pilotage de la communication d'un portefeuille de clients : plan média, rédaction, coordination des prestataires (graphistes, imprimeurs). Reporting mensuel des retombées." },
  { id: 14, company_id: 8, title: 'Community Manager', contract_type: 'CDI', hoursAgo: 48, description: "Animation quotidienne des réseaux sociaux de nos clients (LinkedIn, Instagram, TikTok), création de contenus, modération et veille. Bonne plume exigée." },
  { id: 15, company_id: 13, title: 'Rédacteur web / content manager (full remote)', contract_type: 'Freelance', hoursAgo: 4, description: "Rédaction d'articles de fond et de pages SEO pour des clients B2B tech. Mission freelance récurrente, environ 10 jours par mois, en télétravail intégral." },
  { id: 16, company_id: 9, title: 'Analyste financier', contract_type: 'CDI', hoursAgo: 168, description: "Analyse de la performance et des risques d'un portefeuille de PME régionales, préparation des comités de crédit, modélisation. Poste basé au siège niçois." },
  { id: 17, company_id: 9, title: 'Comptable général', contract_type: 'CDI', hoursAgo: 60, description: "Tenue de la comptabilité générale et auxiliaire jusqu'au bilan, déclarations fiscales, révision des comptes. Logiciel Sage, équipe de quatre personnes." },
  { id: 18, company_id: 9, title: 'Stage - Audit financier', contract_type: 'Stage', hoursAgo: 36, description: "Stage de fin d'études au sein du département audit : participation aux missions de contrôle des comptes, tests de procédures, rédaction des synthèses. Durée 6 mois, gratification légale." },
  { id: 19, company_id: 5, title: 'Conseiller de vente prêt-à-porter', contract_type: 'CDI', hoursAgo: 48, description: "Accueil et conseil client en boutique, tenue du rayon, encaissement et objectifs de vente. Travail le samedi, un dimanche sur deux en période de soldes." },
  { id: 20, company_id: 18, title: 'Caissier(ère) polyvalent(e)', contract_type: 'CDD', hoursAgo: 7, description: "Encaissement, mise en rayon et entretien de la ligne de caisses d'un hypermarché. CDD de 3 mois, planning tournant du lundi au samedi." },
  { id: 21, company_id: 5, title: 'Assistant e-commerce à temps partiel', contract_type: 'Freelance', hoursAgo: 6, description: "Gestion du catalogue produits, traitement des commandes et du SAV de la boutique en ligne (Shopify). Mission à temps partiel, 3 jours par semaine, sur site à Grasse." },
  { id: 22, company_id: 6, title: 'Chauffeur-livreur permis B', contract_type: 'CDI', hoursAgo: 8, description: "Livraison de colis auprès de professionnels sur la métropole lyonnaise, environ 60 points par tournée. Chargement le matin au dépôt, véhicule fourni." },
  { id: 23, company_id: 16, title: 'Magasinier cariste (CACES 1-3-5)', contract_type: 'CDI', hoursAgo: 72, description: "Réception, stockage et préparation de commandes dans un entrepôt logistique. Conduite de chariots élévateurs, utilisation du WMS. Horaires d'équipe 2x8." },
  { id: 24, company_id: 6, title: 'Coordinateur logistique transport', contract_type: 'CDI', hoursAgo: 54, description: "Organisation des plans de transport, affectation des tournées, suivi des indicateurs de service et relation avec les affrétés. Poste sédentaire au siège." },
  { id: 25, company_id: 7, title: 'Aide-soignant(e) en service de soins', contract_type: 'CDD', hoursAgo: 3, description: "Accompagnement des patients dans les actes de la vie quotidienne, surveillance des constantes, collaboration avec l'équipe infirmière. CDD renouvelable, roulement jour/nuit." },
  { id: 26, company_id: 12, title: "Infirmier(ère) diplômé(e) d'État", contract_type: 'CDI', hoursAgo: 5, description: "Poste en service de médecine polyvalente : soins techniques, suivi des protocoles, éducation thérapeutique. Établissement de 300 lits, équipe stable." },
  { id: 27, company_id: 11, title: 'Réceptionniste tournant', contract_type: 'CDD', hoursAgo: 24, description: "Accueil des clients d'un hôtel 4 étoiles, check-in / check-out, conciergerie et facturation. Maîtrise de l'anglais indispensable, une troisième langue appréciée. Shifts matin, soir et nuit." },
  { id: 28, company_id: 11, title: 'Chef de rang en brasserie', contract_type: 'CDI', hoursAgo: 9, description: "Service en salle sur un rang de 25 couverts, conseil sur la carte et les vins, coordination avec la cuisine. Service continu midi et soir, deux jours de repos consécutifs." },
  { id: 29, company_id: 17, title: 'Chef de projet digital — 100% à distance', contract_type: 'Freelance', hoursAgo: 9, description: "Pilotage de projets de refonte de sites web pour des clients européens : cadrage, planning, coordination des équipes créa et dev. Mission freelance longue durée, entièrement à distance." },
  { id: 30, company_id: 17, title: 'Consultant support client à distance', contract_type: 'Freelance', hoursAgo: 120, description: "Support de niveau 2 pour un éditeur de logiciel B2B : qualification des tickets, rédaction de la base de connaissances, remontée des bugs. Travail à distance, plage horaire 9h-18h." },
  // Volume supplémentaire (pas de scénario narratif particulier) : sert à
  // tester le rendu de l'accueil invité sur de très grands écrans (4K
  // portrait...) sans dépendre d'un jeu de données trop restreint.
  { id: 31, company_id: 2, title: 'Ingénieure QA Automatisation', contract_type: 'CDI', hoursAgo: 12, description: "Mise en place et maintenance des suites de tests end-to-end (Playwright) sur nos produits SaaS. Collaboration étroite avec les équipes dev pour intégrer les tests au pipeline CI." },
  { id: 32, company_id: 14, title: 'Développeur Mobile React Native', contract_type: 'CDI', hoursAgo: 14, description: "Développement de l'application mobile (iOS/Android) partagée avec une base de code unique. Intégration API REST, gestion offline, publication sur les stores." },
  { id: 33, company_id: 10, title: 'Tech Lead Backend (full remote)', contract_type: 'CDI', hoursAgo: 16, description: "Encadrement technique d'une équipe de quatre développeurs backend, arbitrages d'architecture, revue de code. Poste 100% télétravail, réunions synchrones limitées." },
  { id: 34, company_id: 9, title: 'Chargé(e) de clientèle particuliers', contract_type: 'CDI', hoursAgo: 18, description: "Accueil et conseil d'un portefeuille de clients particuliers en agence, montage de dossiers de crédit, développement commercial. Objectifs mensuels." },
  { id: 35, company_id: 18, title: 'Employé(e) libre-service', contract_type: 'CDD', hoursAgo: 20, description: "Mise en rayon, gestion des stocks et facing d'un rayon épicerie. CDD de 2 mois, horaires du matin." },
  { id: 36, company_id: 7, title: 'Secrétaire médical(e)', contract_type: 'CDI', hoursAgo: 22, description: "Accueil physique et téléphonique des patients, prise de rendez-vous, frappe de comptes rendus médicaux. Poste à temps plein en clinique." },
  { id: 37, company_id: 12, title: 'Manipulateur(trice) radio', contract_type: 'CDI', hoursAgo: 26, description: "Réalisation d'examens d'imagerie médicale (radiologie conventionnelle, scanner), respect des protocoles de radioprotection. Plateau technique récent." },
  { id: 38, company_id: 15, title: 'Professeur de physique-chimie', contract_type: 'CDD', hoursAgo: 28, description: "Enseignement en classes de collège et lycée, préparation des cours et évaluations. Remplacement jusqu'à la fin du trimestre." },
  { id: 39, company_id: 4, title: "Coordinateur(trice) pédagogique", contract_type: 'CDI', hoursAgo: 32, description: "Coordination des plannings de formation, suivi des stagiaires et relation avec les intervenants. Poste basé à Antibes." },
  { id: 40, company_id: 8, title: 'Graphiste maquettiste', contract_type: 'CDI', hoursAgo: 34, description: "Conception de supports print et digitaux pour un portefeuille de clients variés : identité visuelle, brochures, bannières. Maîtrise de la suite Adobe requise." },
  { id: 41, company_id: 13, title: 'Traducteur(trice) technique EN>FR (freelance)', contract_type: 'Freelance', hoursAgo: 38, description: "Traduction de documentations techniques et contenus marketing pour des clients B2B tech. Mission récurrente, volume variable selon les mois." },
  { id: 42, company_id: 6, title: 'Chef d\'équipe entrepôt', contract_type: 'CDI', hoursAgo: 40, description: "Encadrement d'une équipe de dix préparateurs de commandes, organisation des plannings, suivi des indicateurs de productivité et de qualité." },
  { id: 43, company_id: 16, title: 'Conducteur(trice) poids lourd (SPL)', contract_type: 'CDI', hoursAgo: 42, description: "Transport de marchandises sur des tournées régionales, chargement/déchargement, respect de la réglementation transport. Découchés occasionnels." },
  { id: 44, company_id: 11, title: 'Commis de cuisine', contract_type: 'CDD', hoursAgo: 44, description: "Préparation des mets sous la responsabilité du chef de partie, mise en place, respect des normes d'hygiène HACCP. Saison été, logement possible." },
  { id: 45, company_id: 17, title: 'UX Researcher (freelance)', contract_type: 'Freelance', hoursAgo: 46, description: "Conduite d'entretiens utilisateurs et de tests d'usabilité pour des clients produits variés, restitution des insights aux équipes design. Mission ponctuelle, quelques jours par mois." },
  { id: 46, company_id: 2, title: 'Ingénieur Sécurité / DevSecOps', contract_type: 'CDI', hoursAgo: 48, description: "Intégration des bonnes pratiques de sécurité dans le pipeline CI/CD, audits de code, gestion des vulnérabilités. Trois jours de télétravail par semaine." },
  { id: 47, company_id: 1, title: 'Product Owner', contract_type: 'CDI', hoursAgo: 50, description: "Définition et priorisation de la roadmap produit, rédaction des user stories, animation des cérémonies agiles avec une équipe de six développeurs." },
  { id: 48, company_id: 9, title: 'Chargé(e) de recouvrement', contract_type: 'CDI', hoursAgo: 52, description: "Suivi et relance des créances clients, négociation d'échéanciers, reporting mensuel. Poste sédentaire au siège niçois." },
  { id: 49, company_id: 5, title: 'Responsable de boutique adjoint(e)', contract_type: 'CDI', hoursAgo: 56, description: "Animation d'une équipe de cinq vendeurs, gestion des stocks et des plannings, suivi des objectifs commerciaux. Un week-end sur deux travaillé." },
  { id: 50, company_id: 3, title: 'Instructeur(trice) urbanisme', contract_type: 'CDI', hoursAgo: 58, description: "Instruction des demandes de permis de construire et déclarations préalables, accueil du public sur rendez-vous. Poste titulaire ou contractuel." },
];

async function main() {
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ''),
  });

  for (const company of companies) {
    await connection.execute(
      `
        INSERT INTO Company (id, name, business_sector, website, address, is_public, verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          business_sector = VALUES(business_sector),
          website = VALUES(website),
          address = VALUES(address),
          is_public = VALUES(is_public),
          verified = VALUES(verified),
          updated_at = NOW()
      `,
      [
        company.id,
        company.name,
        company.business_sector,
        company.website,
        company.address,
        company.is_public ? 1 : 0,
        company.verified ? 1 : 0,
      ],
    );
  }

  // Repart d'un jeu d'offres propre : on efface les lignes qui ne font pas
  // partie du seed (anciennes offres de démo / bouchons). Sans risque tant
  // qu'aucune candidature n'y est rattachée.
  const seededOfferIds = offers.map((offer) => offer.id);
  await connection.query('DELETE FROM Job_offering WHERE id NOT IN (?)', [
    seededOfferIds,
  ]);

  for (const offer of offers) {
    await connection.execute(
      `
        INSERT INTO Job_offering (id, company_id, title, contract_type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR), NOW())
        ON DUPLICATE KEY UPDATE
          company_id = VALUES(company_id),
          title = VALUES(title),
          contract_type = VALUES(contract_type),
          description = VALUES(description),
          created_at = VALUES(created_at),
          updated_at = NOW()
      `,
      [
        offer.id,
        offer.company_id,
        offer.title,
        offer.contract_type,
        offer.description,
        offer.hoursAgo,
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
