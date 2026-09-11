-- AlterTable : bannière de couverture de la fiche entreprise, même contrat
-- que `logo_url` (URL https ou data URL d'image redimensionnée côté client,
-- cf. `Frontend/src/utils/image.ts#fileToBannerDataUrl`, déjà utilisé pour
-- `User.banner_url`) -> LONGTEXT.
ALTER TABLE `Company`
  ADD COLUMN `banner_url` LONGTEXT NULL AFTER `logo_url`;
