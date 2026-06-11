import { ForbiddenException } from '@nestjs/common';

import { VideoGatewayService } from './video-gateway.service.js';

describe('VideoGatewayService', () => {
  const videosRepository = {
    remove: jest.fn(),
    save: jest.fn(),
  };
  const usersRepository = {
    findOne: jest.fn(),
  };
  const projectsRepository = {
    findOne: jest.fn(),
  };
  const videoAccessService = {
    findAccessibleVideo: jest.fn(),
  };
  const projectAccessService = {
    assertPermission: jest.fn(),
    resolveAccess: jest.fn().mockResolvedValue({
      permissions: {
        canDownloadVideos: true,
        canManageSettings: true,
        canUploadVideos: true,
        canApproveVideos: true,
        canSignOffVideos: true,
        canComment: true,
        canResolveComments: true,
      },
    }),
  };
  const provider = {
    id: 'test-provider',
    reconcileProcessingStatus: jest.fn(),
  };
  const videoProviderRegistry = {
    getUploadProvider: jest.fn().mockReturnValue(provider),
  };
  const uploadAccessPolicy = {
    assertCanStartUpload: jest.fn(),
    consumeOnUploadCreated: jest.fn(),
    releaseOnUploadFailed: jest.fn(),
  };

  let service: VideoGatewayService;

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccessService.assertPermission.mockResolvedValue(undefined);
    videoProviderRegistry.getUploadProvider.mockReturnValue(provider);
    service = new VideoGatewayService(
      videosRepository as never,
      usersRepository as never,
      projectsRepository as never,
      videoAccessService as never,
      projectAccessService as never,
      videoProviderRegistry as never,
      uploadAccessPolicy as never,
    );
  });

  it('reconciles processing video status through the upload provider', async () => {
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const processingVideo = { id: 'video-1', status: 'processing', updatedAt };
    const readyVideo = { ...processingVideo, status: 'ready' };
    videoAccessService.findAccessibleVideo.mockResolvedValue(processingVideo);
    provider.reconcileProcessingStatus.mockResolvedValue(readyVideo);

    await expect(service.getStatus('video-1' , 1)).resolves.toEqual({
      id: 'video-1',
      status: 'ready',
      updatedAt,
      provider: 'test-provider',
    });
    expect(provider.reconcileProcessingStatus).toHaveBeenCalledWith(processingVideo);
  });

  it('returns non-processing video status without reconciliation', async () => {
    const video = { id: 'video-1', status: 'ready', updatedAt: new Date('2026-01-01T00:00:00.000Z') };
    videoAccessService.findAccessibleVideo.mockResolvedValue(video);

    await expect(service.getStatus('video-1' , 1)).resolves.toEqual({
      id: 'video-1',
      status: 'ready',
      updatedAt: video.updatedAt,
      provider: 'test-provider',
    });
    expect(provider.reconcileProcessingStatus).not.toHaveBeenCalled();
  });

  describe('approve', () => {
    it('allows client with approval grant to approve', async () => {
      const video = {
        id: 'video-1',
        approvedAt: null,
        approvedBy: null,
        project: { ownerId: 1, approverIds: ['client-approver-1'] },
      };
      videosRepository.save = jest.fn().mockResolvedValue(video);
      videoAccessService.findAccessibleVideo.mockResolvedValue(video);

      await expect(
        service.approve('video-1', 1),
      ).resolves.toBeDefined();
      expect(videosRepository.save).toHaveBeenCalled();
    });

    it('rejects client without approval grant', async () => {
      const video = {
        id: 'video-1',
        approvedAt: null,
        approvedBy: null,
        project: { ownerId: 1, approverIds: ['client-approver-1'] },
      };
      videosRepository.save = jest.fn().mockResolvedValue(video);
      videoAccessService.findAccessibleVideo.mockResolvedValue(video);
      projectAccessService.assertPermission.mockRejectedValueOnce(new ForbiddenException('Access denied'));

      await expect(
        service.approve('video-1', 3),
      ).rejects.toThrow('Access denied');
    });

    it('allows a user when project settings grant approval permission', async () => {
      const video = {
        id: 'video-1',
        approvedAt: null,
        approvedBy: null,
        project: { ownerId: 1, approverIds: ['client-approver-1'] },
      };
      videosRepository.save = jest.fn().mockResolvedValue(video);
      videoAccessService.findAccessibleVideo.mockResolvedValue(video);

      await expect(
        service.approve('video-1' , 1),
      ).resolves.toBeDefined();
    });

    it('rejects project owner when project settings do not grant approval permission', async () => {
      const video = {
        id: 'video-1',
        approvedAt: null,
        approvedBy: null,
        project: { ownerId: 1, approverIds: ['client-approver-1'] },
      };
      videosRepository.save = jest.fn().mockResolvedValue(video);
      videoAccessService.findAccessibleVideo.mockResolvedValue(video);
      projectAccessService.assertPermission.mockRejectedValueOnce(new ForbiddenException('Access denied'));

      await expect(
        service.approve('video-1', 2),
      ).rejects.toThrow('Access denied');
    });

    it('rejects already approved video', async () => {
      const video = {
        id: 'video-1',
        approvedAt: new Date(),
        approvedBy: null,
        project: { ownerId: 1, approverIds: ['client-approver-1'] },
      };
      videosRepository.save = jest.fn().mockResolvedValue(video);
      videoAccessService.findAccessibleVideo.mockResolvedValue(video);

      await expect(
        service.approve('video-1', 1),
      ).rejects.toThrow('Video already approved');
    });
  });

  describe('signOff', () => {
    it('allows a user with sign-off permission to sign off', async () => {
      const video = {
        id: 'video-1',
        signedOffAt: null,
        signedOffBy: null,
        project: { ownerId: 1 },
      };
      videosRepository.save = jest.fn().mockResolvedValue(video);
      videoAccessService.findAccessibleVideo.mockResolvedValue(video);

      await expect(
        service.signOff('video-1' , 1),
      ).resolves.toBeDefined();
      expect(videosRepository.save).toHaveBeenCalled();
    });

    it('allows project owner to sign off', async () => {
      const video = {
        id: 'video-1',
        signedOffAt: null,
        signedOffBy: null,
        project: { ownerId: 1 },
      };
      videosRepository.save = jest.fn().mockResolvedValue(video);
      videoAccessService.findAccessibleVideo.mockResolvedValue(video);

      await expect(
        service.signOff('video-1', 2),
      ).resolves.toBeDefined();
      expect(videosRepository.save).toHaveBeenCalled();
    });

    it('rejects client without sign-off permission', async () => {
      const video = {
        id: 'video-1',
        signedOffAt: null,
        signedOffBy: null,
        project: { ownerId: 1 },
      };
      videosRepository.save = jest.fn().mockResolvedValue(video);
      videoAccessService.findAccessibleVideo.mockResolvedValue(video);
      projectAccessService.assertPermission.mockRejectedValueOnce(new ForbiddenException('Access denied'));

      await expect(
        service.signOff('video-1', 3),
      ).rejects.toThrow('Access denied');
    });
  });
});
