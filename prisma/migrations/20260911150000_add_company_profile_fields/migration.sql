-- AlterTable : champs de profil entreprise saisis à la création
-- (page "Créer votre entreprise", Frontend). `size` reprend les tranches
-- affichées côté UI ("1-10", "11-50", "51-200", "201-500", "500+") sans les
-- contraindre en base (simple VarChar, comme `business_sector`). `logo_url`
-- suit le même traitement que `User.banner_url` (data URL d'image
-- redimensionnée côté client, ou URL https) -> LONGTEXT.
ALTER TABLE `Company`
  ADD COLUMN `size` VARCHAR(20) NULL AFTER `business_sector`,
  ADD COLUMN `description` TEXT NULL AFTER `address`,
  ADD COLUMN `logo_url` LONGTEXT NULL AFTER `description`;
