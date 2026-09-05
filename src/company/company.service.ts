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

  findAll() {
    return `This action returns all company`;
  }

  findOne(id: number) {
    return `This action returns a #${id} company`;
  }

  update(id: number, _updateCompanyDto: UpdateCompanyDto) {
    return `This action updates a #${id} company`;
  }

  remove(id: number) {
    return `This action removes a #${id} company`;
  }
}
