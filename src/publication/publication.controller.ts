import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Res,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { PublicationService } from './publication.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import { matchesETag } from '../utils/etag';

@Controller('publication')
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Req() request: IRequestWithPayload,
    @Body() createPublicationDto: CreatePublicationDto,
  ) {
    return this.publicationService.create(
      createPublicationDto,
      request.user.id,
    );
  }

  // Le fil d'actus est visible sans être connecté (accueil invité).
  @Get()
  async findAll(
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = await this.publicationService.getListETag();
    if (matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    response.setHeader('ETag', etag);
    return this.publicationService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = await this.publicationService.getDetailETag(+id);
    if (etag && matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    if (etag) {
      response.setHeader('ETag', etag);
    }
    return this.publicationService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Req() request: IRequestWithPayload,
    @Param('id') id: string,
    @Body() updatePublicationDto: UpdatePublicationDto,
  ) {
    return this.publicationService.update(
      +id,
      updatePublicationDto,
      request.user.id,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Req() request: IRequestWithPayload, @Param('id') id: string) {
    return this.publicationService.remove(+id, request.user.id);
  }
}
