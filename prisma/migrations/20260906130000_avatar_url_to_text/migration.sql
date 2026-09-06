-- AlterTable : les data URL (avatar uploadé depuis le profil) dépassent 255
-- caractères. On passe la colonne en TEXT.
ALTER TABLE `User` MODIFY `avatar_url` TEXT NULL;
