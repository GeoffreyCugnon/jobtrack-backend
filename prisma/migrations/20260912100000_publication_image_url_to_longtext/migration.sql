-- AlterTable : le composeur de post (Frontend) envoie l'image en data URL
-- (`fileToPostImageDataUrl`), qui dépasse la limite TEXT (64 Ko) -> LONGTEXT,
-- même contrat que Company.logo_url/banner_url.
ALTER TABLE `Publication` MODIFY `image_url` LONGTEXT NULL;
