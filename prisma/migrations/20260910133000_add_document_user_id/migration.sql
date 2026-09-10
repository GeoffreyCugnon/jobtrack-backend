-- AlterTable : rattache un document à son propriétaire (bibliothèque CV / lettres).
ALTER TABLE `Document` ADD COLUMN `user_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `fk_document_user` ON `Document`(`user_id`);

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `fk_document_user` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
