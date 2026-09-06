import { ConflictException, Injectable } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Company } from '../../prisma/generated/prisma/client';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const isName = await this.prisma.company.findUnique({
      where: { name: dto.name },
    });
    if (isName) throw new ConflictException('Name already used !!!');

    return this.prisma.company.create({ data: dto });
  }

  findAll(): Promise<Company[]> {
    return this.prisma.company.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: number): Promise<Company> {
    return this.prisma.company.findUniqueOrThrow({ where: { id } });
  }

  update(id: number, dto: UpdateCompanyDto): Promise<Company> {
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  remove(id: number): Promise<Company> {
    return this.prisma.company.delete({ where: { id } });
  }
}
