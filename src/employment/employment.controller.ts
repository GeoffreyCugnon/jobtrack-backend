import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EmploymentService } from './employment.service';
import { CreateEmploymentDto } from './dto/create-employment.dto';
import { UpdateEmploymentDto } from './dto/update-employment.dto';

@Controller('employment')
export class EmploymentController {
  constructor(private readonly employmentService: EmploymentService) {}

  @Post()
  create(@Body() createEmploymentDto: CreateEmploymentDto) {
    return this.employmentService.create(createEmploymentDto);
  }

  @Get()
  findAll() {
    return this.employmentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employmentService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmploymentDto: UpdateEmploymentDto,
  ) {
    return this.employmentService.update(+id, updateEmploymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employmentService.remove(+id);
  }
}
