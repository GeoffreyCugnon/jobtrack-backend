import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from '../../prisma/generated/prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  async create(
    @Body() body: CreateRoleDto,
  ): Promise<{ data: { role: Role }; message: string }> {
    const role = await this.roleService.create(body);
    return { data: { role }, message: 'role create successfull' };
  }

  @Get()
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(+id, updateRoleDto);
  }

  @Delete(':id')
  async deleteRole(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ data: null; message: string }> {
    await this.roleService.delete(id);
    return {
      data: null,
      message: `Le role avec l'id ${id} a été supprimé avec succès.`,
    };
  }
}
