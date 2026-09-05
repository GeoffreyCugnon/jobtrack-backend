-- AlterTable
ALTER TABLE `User`
  ADD COLUMN `resetPasswordToken` VARCHAR(255) NULL,
  ADD COLUMN `resetPasswordExpires` TIMESTAMP(0) NULL;
