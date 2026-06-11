import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  ForbiddenException,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { CreateProjectMemberDto } from './dto/create-project-member.dto.js';
import { CreateProjectAccessLinkDto } from './dto/create-project-access-link.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';
import { UpdateProjectAccessLinkDto } from './dto/update-project-access-link.dto.js';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto.js';
import { AccessAuthGuard } from '../auth/guards/access-auth.guard.js';
import { ProjectAccessLinksService } from './project-access-links.service.js';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(AccessAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly accessLinksService: ProjectAccessLinksService,
  ) {}

  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    return this.projectsService.create(createProjectDto, req.user.userId);
  }

  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  @Get()
  findAll(@Request() req) {
    return this.projectsService.findAll(req.user.userId, req.user.email);
  }

  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.projectsService.findOne(id, req.user);
  }

  @ApiOperation({ summary: 'Get project settings' })
  @ApiResponse({ status: 200, description: 'Project settings retrieved successfully' })
  @Get(':id/settings')
  getSettings(@Param('id') id: string, @Request() req) {
    return this.projectsService.getSettings(id, req.user);
  }

  @ApiOperation({ summary: 'Update project settings' })
  @ApiResponse({ status: 200, description: 'Project settings updated successfully' })
  @Patch(':id/settings')
  updateSettings(@Param('id') id: string, @Body() updateProjectSettingsDto: UpdateProjectSettingsDto, @Request() req) {
    return this.projectsService.updateSettings(id, updateProjectSettingsDto, req.user);
  }

  @ApiOperation({ summary: 'List project members' })
  @ApiResponse({ status: 200, description: 'Project members retrieved successfully' })
  @Get(':id/members')
  listMembers(@Param('id') id: string, @Request() req) {
    return this.projectsService.getSettings(id, req.user).then((settings) => settings.members);
  }

  @ApiOperation({ summary: 'Add project member' })
  @ApiResponse({ status: 201, description: 'Project member added successfully' })
  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() createProjectMemberDto: CreateProjectMemberDto, @Request() req) {
    return this.projectsService.addMember(id, createProjectMemberDto, req.user);
  }

  @ApiOperation({ summary: 'Update project member' })
  @ApiResponse({ status: 200, description: 'Project member updated successfully' })
  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateProjectMemberDto: UpdateProjectMemberDto,
    @Request() req,
  ) {
    return this.projectsService.updateMember(id, memberId, updateProjectMemberDto, req.user);
  }

  @ApiOperation({ summary: 'Remove project member' })
  @ApiResponse({ status: 200, description: 'Project member removed successfully' })
  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    return this.projectsService.removeMember(id, memberId, req.user);
  }

  @ApiOperation({ summary: 'Create project access link' })
  @ApiResponse({ status: 201, description: 'Access link created successfully' })
  @Post(':id/settings/access-links')
  async createAccessLink(@Param('id') id: string, @Body() dto: CreateProjectAccessLinkDto, @Request() req) {
    await this.projectsService.getSettings(id, req.user).then((settings) => {
      if (!settings.capabilities.canManageSettings) {
        throw new ForbiddenException('Access denied');
      }
    });
    const result = await this.accessLinksService.create({
      ...dto,
      projectId: id,
      createdByUserId: req.user.userId,
    });
    return {
      accessLink: this.accessLinksService.serialize(result.link),
      token: result.token,
    };
  }

  @ApiOperation({ summary: 'Update project access link' })
  @ApiResponse({ status: 200, description: 'Access link updated successfully' })
  @Patch(':id/settings/access-links/:linkId')
  async updateAccessLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateProjectAccessLinkDto,
    @Request() req,
  ) {
    await this.projectsService.getSettings(id, req.user).then((settings) => {
      if (!settings.capabilities.canManageSettings) {
        throw new ForbiddenException('Access denied');
      }
    });
    const link = await this.accessLinksService.update(id, linkId, dto);
    return this.accessLinksService.serialize(link);
  }

  @ApiOperation({ summary: 'Revoke project access link' })
  @ApiResponse({ status: 200, description: 'Access link revoked successfully' })
  @Post(':id/settings/access-links/:linkId/revoke')
  async revokeAccessLink(@Param('id') id: string, @Param('linkId') linkId: string, @Request() req) {
    await this.projectsService.getSettings(id, req.user).then((settings) => {
      if (!settings.capabilities.canManageSettings) {
        throw new ForbiddenException('Access denied');
      }
    });
    const link = await this.accessLinksService.revoke(id, linkId, req.user.userId);
    return this.accessLinksService.serialize(link);
  }

  @ApiOperation({ summary: 'Rotate project access link token' })
  @ApiResponse({ status: 200, description: 'Access link token rotated successfully' })
  @Post(':id/settings/access-links/:linkId/rotate')
  async rotateAccessLink(@Param('id') id: string, @Param('linkId') linkId: string, @Request() req) {
    await this.projectsService.getSettings(id, req.user).then((settings) => {
      if (!settings.capabilities.canManageSettings) {
        throw new ForbiddenException('Access denied');
      }
    });
    const result = await this.accessLinksService.rotate(id, linkId);
    return {
      accessLink: this.accessLinksService.serialize(result.link),
      token: result.token,
    };
  }

  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Request() req) {
    return this.projectsService.update(id, updateProjectDto, req.user);
  }

  @ApiOperation({ summary: 'Archive project' })
  @ApiResponse({ status: 200, description: 'Project archived' })
  @Post(':id/archive')
  archive(@Param('id') id: string, @Request() req) {
    return this.projectsService.archive(id, req.user);
  }

  @ApiOperation({ summary: 'Restore archived project' })
  @ApiResponse({ status: 200, description: 'Project restored' })
  @Post(':id/restore')
  restore(@Param('id') id: string, @Request() req) {
    return this.projectsService.restore(id, req.user);
  }

  @ApiOperation({ summary: 'Get eligible approvers for a project' })
  @ApiResponse({ status: 200, description: 'Eligible approvers retrieved' })
  @Get(':id/eligible-approvers')
  findEligibleApprovers(@Param('id') id: string, @Request() req) {
    return this.projectsService.findEligibleApprovers(id, req.user);
  }

  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.projectsService.remove(id, req.user);
  }
}
