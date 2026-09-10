import { Module } from '@nestjs/common';
import { JobCategoryService } from './job_category.service';
import { JobCategoryController } from './job_category.controller';

@Module({
  controllers: [JobCategoryController],
  providers: [JobCategoryService],
})
export class JobCategoryModule {}
