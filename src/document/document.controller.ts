import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  Res,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document_type } from '../../prisma/generated/prisma/enums';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import { matchesETag } from '../utils/etag';

@Controller('document')
@UseGuards(AuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  async findAll(
    @Req() request: IRequestWithPayload,
    @Query('type') type: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const validType = Object.values(Document_type).includes(
      type as Document_type,
    )
      ? (type as Document_type)
      : undefined;
    const etag = await this.documentService.getListETag(
      request.user.id,
      validType,
    );
    if (matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    response.setHeader('ETag', etag);
    return this.documentService.findAllForUser(request.user.id, validType);
  }

  @Get(':id')
  async findOne(
    @Req() request: IRequestWithPayload,
    @Param('id') id: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = await this.documentService.getDetailETag(+id, request.user.id);
    if (etag && matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    if (etag) {
      response.setHeader('ETag', etag);
    }
    return this.documentService.findOneForUser(+id, request.user.id);
  }

  @Post()
  create(
    @Req() request: IRequestWithPayload,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    return this.documentService.create(createDocumentDto, request.user.id);
  }

  @Patch(':id')
  update(
    @Req() request: IRequestWithPayload,
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentService.update(+id, updateDocumentDto, request.user.id);
  }

  @Delete(':id')
  remove(@Req() request: IRequestWithPayload, @Param('id') id: string) {
    return this.documentService.remove(+id, request.user.id);
  }
}
