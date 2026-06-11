import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Get recent activity for the current user' })
  @ApiResponse({ status: 200, description: 'Activity retrieved' })
  @Get('activity')
  getActivity(@Request() req, @Query('limit') limit?: string) {
    return this.dashboardService.getActivity(req.user.userId, Number(limit) || 10);
  }

  @ApiOperation({ summary: 'Get recent feedback for the current user' })
  @ApiResponse({ status: 200, description: 'Feedback retrieved' })
  @Get('feedback')
  getFeedback(@Request() req, @Query('limit') limit?: string) {
    return this.dashboardService.getFeedback(req.user.userId, Number(limit) || 10);
  }

  @ApiOperation({ summary: 'Get analytics summary' })
  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @ApiOperation({ summary: 'Get workspace storage usage' })
  @Get('storage')
  async getStorage() {
    const bytes = await this.dashboardService.getTotalBytes();
    return { totalBytes: bytes };
  }
}
