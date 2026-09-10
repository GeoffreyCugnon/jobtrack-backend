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
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document_type } from '../../prisma/generated/prisma/enums';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';

@Controller('document')
@UseGuards(AuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  findAll(
    @Req() request: IRequestWithPayload,
    @Query('type') type?: Document_type,
  ) {
    const validType = Object.values(Document_type).includes(
      type as Document_type,
    )
      ? (type as Document_type)
      : undefined;
    return this.documentService.findAllForUser(request.user.id, validType);
  }

  @Get(':id')
  findOne(@Req() request: IRequestWithPayload, @Param('id') id: string) {
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
