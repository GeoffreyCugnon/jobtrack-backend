import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Res,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from '../../prisma/generated/prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import { matchesETag } from '../utils/etag';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() request: IRequestWithPayload,
    @Body() body: CreateCompanyDto,
  ): Promise<{ data: { company: Company }; message: string }> {
    const company = await this.companyService.create(body, request.user.id);
    return { data: { company }, message: 'user create successfull' };
  }

  // Doit être déclaré avant `:id` pour ne pas être capté par ce paramètre.
  @Get('mine')
  @UseGuards(AuthGuard)
  async findMine(
    @Req() request: IRequestWithPayload,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Company | null | undefined> {
    const etag = await this.companyService.getMineETag(request.user.id);
    if (etag && matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    if (etag) {
      response.setHeader('ETag', etag);
    }
    return this.companyService.findMine(request.user.id);
  }

  @Get('mine/all')
  @UseGuards(AuthGuard)
  async findMineAll(
    @Req() request: IRequestWithPayload,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Company[] | undefined> {
    const etag = await this.companyService.getMineAllETag(request.user.id);
    if (matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    response.setHeader('ETag', etag);
    return this.companyService.findMineAll(request.user.id);
  }

  // Publiques (comme `job_offering.findAll`/`findOne`) : une fiche entreprise
  // est consultée depuis une offre d'emploi, elle-même publique — un visiteur
  // non connecté doit pouvoir cliquer sur l'entreprise d'une offre.
  @Get()
  async findAll(
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = await this.companyService.getListETag();
    if (matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    response.setHeader('ETag', etag);
    return this.companyService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = await this.companyService.getDetailETag(+id);
    if (etag && matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    if (etag) {
      response.setHeader('ETag', etag);
    }
    return this.companyService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Req() request: IRequestWithPayload,
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companyService.update(+id, updateCompanyDto, request.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Req() request: IRequestWithPayload, @Param('id') id: string) {
    return this.companyService.remove(+id, request.user.id);
  }
}
