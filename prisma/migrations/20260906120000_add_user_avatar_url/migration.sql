-- AlterTable
ALTER TABLE `User` ADD COLUMN `avatar_url` VARCHAR(255) NULL;

-- Backfill : avatar par défaut (généré, DiceBear) pour les comptes existants
-- qui n'en ont pas encore — dont le compte admin. Seed aléatoire par ligne.
UPDATE `User`
SET `avatar_url` = CONCAT(
  'https://api.dicebear.com/9.x/avataaars/svg?seed=',
  REPLACE(UUID(), '-', '')
)
WHERE `avatar_url` IS NULL;
