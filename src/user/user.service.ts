import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, User } from '../../prisma/generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserWithoutPass } from './interface/partielUser';
import { RegisterDto } from '../auth/dto/register.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: RegisterDto): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          ...dto,
        },
      });
    } catch {
      throw new ConflictException('Email is already used');
    }
  }
  async countByEmail(email: string): Promise<number> {
    return await this.prisma.user.count({ where: { email } });
  }

  async findOneOrThrow(id: number): Promise<User> {
    return await this.prisma.user.findUniqueOrThrow({ where: { id } });
  }

  async findAll(): Promise<UserWithoutPass[]> {
    return this.prisma.user.findMany({ omit: { password: true } });
  }

  async findByEmailOrThrow(email: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { email } });
  }

  async update(
    id: number,
    data: Prisma.UserUpdateInput,
  ): Promise<UserWithoutPass> {
    await this.findOneOrThrow(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
      },
      omit: { password: true },
    });
  }

  async delete(id: number): Promise<User> {
    await this.findOneOrThrow(id);
    return this.prisma.user.delete({ where: { id } });
  }

  async deleteAll(): Promise<Prisma.BatchPayload> {
    const result = await this.prisma.user.deleteMany();
    await this.prisma.$executeRaw`ALTER TABLE User AUTO_INCREMENT = 1`;
    await this.prisma.$executeRaw`ALTER TABLE Candidate AUTO_INCREMENT = 1`;
    await this.prisma.$executeRaw`ALTER TABLE Recruiter AUTO_INCREMENT = 1`;

    return result;
  }
}
