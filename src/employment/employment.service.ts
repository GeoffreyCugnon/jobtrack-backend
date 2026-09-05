import { Injectable } from '@nestjs/common';
import { CreateEmploymentDto } from './dto/create-employment.dto';
import { UpdateEmploymentDto } from './dto/update-employment.dto';

@Injectable()
export class EmploymentService {
  create(_createEmploymentDto: CreateEmploymentDto) {
    return 'This action adds a new employment';
  }

  findAll() {
    return `This action returns all employment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} employment`;
  }

  update(id: number, _updateEmploymentDto: UpdateEmploymentDto) {
    return `This action updates a #${id} employment`;
  }

  remove(id: number) {
    return `This action removes a #${id} employment`;
  }
}
