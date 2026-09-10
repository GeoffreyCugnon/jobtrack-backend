import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // Le fil d'actus est public (accueil invité) : les commentaires le sont aussi.
  @Get()
  findByPublication(
    @Query('publicationId', ParseIntPipe) publicationId: number,
  ) {
    return this.commentService.findByPublication(publicationId);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Req() request: IRequestWithPayload,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentService.create(createCommentDto, request.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Req() request: IRequestWithPayload, @Param('id') id: string) {
    return this.commentService.remove(+id, request.user.id);
  }
}
