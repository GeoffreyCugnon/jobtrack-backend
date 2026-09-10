import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma/generated/prisma/client';
import { Document_type } from '../../prisma/generated/prisma/enums';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

type DocumentRow = Prisma.DocumentGetPayload<object>;

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: DocumentRow) {
    const updatedAt = new Date(row.updated_at);
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      // Le Front range les documents en deux onglets (CV / Lettres).
      basePath: row.type === Document_type.CV ? 'cv' : 'letters',
      updatedAt: updatedAt.toLocaleDateString('fr-FR'),
      updatedAtISO: updatedAt.toISOString(),
    };
  }

  async findAllForUser(userId: number, type?: Document_type) {
    const rows = await this.prisma.document.findMany({
      where: { user_id: userId, ...(type ? { type } : {}) },
      orderBy: { updated_at: 'desc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOneForUser(id: number, userId: number) {
    const row = await this.prisma.document.findUnique({ where: { id } });
    if (!row || row.user_id !== userId) {
      throw new NotFoundException('Document introuvable.');
    }
    return this.toDto(row);
  }

  async create(dto: CreateDocumentDto, userId: number) {
    const row = await this.prisma.document.create({
      data: {
        user_id: userId,
        title: dto.title,
        type: dto.type,
        // Pas d'upload de fichier pour l'instant : `file_url` est requis et
        // unique en base, on pose une valeur interne unique.
        file_url: `internal://document/${userId}/${randomUUID()}`,
      },
    });
    return this.toDto(row);
  }

  private async assertOwned(id: number, userId: number): Promise<void> {
    const row = await this.prisma.document.findUnique({
      where: { id },
      select: { user_id: true },
    });
    if (!row) {
      throw new NotFoundException('Document introuvable.');
    }
    if (row.user_id !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres documents.',
      );
    }
  }

  async update(id: number, dto: UpdateDocumentDto, userId: number) {
    await this.assertOwned(id, userId);
    const row = await this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
      },
    });
    return this.toDto(row);
  }

  async remove(id: number, userId: number) {
    await this.assertOwned(id, userId);
    await this.prisma.document.delete({ where: { id } });
    return { id };
  }
}
