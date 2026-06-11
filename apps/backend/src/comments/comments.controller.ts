import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Request,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { AccessAuthGuard } from '../auth/guards/access-auth.guard.js';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(AccessAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @Post()
  create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    return this.commentsService.create(createCommentDto, req.user);
  }

  @ApiOperation({ summary: 'Get comments for a video' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @Get()
  findByVideo(@Query('videoId') videoId: string, @Request() req) {
    return this.commentsService.findByVideo(videoId, req.user);
  }

  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiResponse({ status: 200, description: 'Comment retrieved successfully' })
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.commentsService.findOne(id, req.user);
  }

  @ApiOperation({ summary: 'Update comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto, @Request() req) {
    return this.commentsService.update(id, updateCommentDto, req.user);
  }

  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.commentsService.remove(id, req.user);
  }

  @ApiOperation({ summary: 'Resolve comment' })
  @ApiResponse({ status: 200, description: 'Comment resolved successfully' })
  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @Request() req) {
    return this.commentsService.resolve(id, req.user);
  }
}
