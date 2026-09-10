-- AlterTable : bannière de profil persistée (data URL d'image redimensionnée
-- côté client, ou URL https). LONGTEXT car une bannière large dépasse la limite
-- 64 Ko d'un TEXT. NULL = pas de bannière -> le dégradé par défaut s'affiche.
ALTER TABLE `User` ADD COLUMN `banner_url` LONGTEXT NULL AFTER `avatar_url`;
