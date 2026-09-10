-- AlterTable : champs de profil visibles par les recruteurs (tous nullables).
ALTER TABLE `User`
  ADD COLUMN `headline` VARCHAR(150) NULL,
  ADD COLUMN `bio` TEXT NULL,
  ADD COLUMN `location` VARCHAR(150) NULL,
  ADD COLUMN `phone` VARCHAR(40) NULL,
  ADD COLUMN `website` VARCHAR(255) NULL,
  ADD COLUMN `linkedin` VARCHAR(255) NULL,
  ADD COLUMN `github` VARCHAR(255) NULL;
