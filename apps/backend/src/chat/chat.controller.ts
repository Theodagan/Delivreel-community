import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ChatService } from './chat.service.js';
import { AccessAuthGuard } from '../auth/guards/access-auth.guard.js';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AccessAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'Get recent chat messages for a video' })
  @ApiResponse({ status: 200, description: 'Chat messages retrieved successfully' })
  @Get()
  getMessages(@Query('videoId') videoId: string, @Query('limit') limit: string | undefined, @Request() req) {
    return this.chatService.getRecentMessages(videoId, req.user, Number(limit) || 50);
  }
}
