import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDto } from './create-document.dto';

// En pratique seul le `title` est modifiable (renommage) : il n'y a pas encore
// d'upload de fichier, `type` est fixé à la création.
export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
