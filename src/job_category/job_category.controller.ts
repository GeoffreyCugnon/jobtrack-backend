import { Controller, Get } from '@nestjs/common';
import { JobCategoryService, JobCategoryDto } from './job_category.service';

/**
 * Référentiel des catégories d'offres. Public (comme `GET /job-offering`) :
 * le filtre « Catégorie » de la liste d'offres est visible en invité.
 */
@Controller('job-categories')
export class JobCategoryController {
  constructor(private readonly jobCategoryService: JobCategoryService) {}

  @Get()
  findAll(): Promise<JobCategoryDto[]> {
    return this.jobCategoryService.findAll();
  }
}
