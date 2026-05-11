import { Injectable } from '@nestjs/common';

import { VideoTelemetryService } from './video-telemetry.service.js';

type EncodingMonitorConfig = {
  readySlaSeconds: number;
};

@Injectable()
export class EncodingMonitorService {
  private readonly config: EncodingMonitorConfig;

  constructor(private readonly telemetryService: VideoTelemetryService) {
    this.config = {
      readySlaSeconds: Number(process.env.VIDEO_ENCODING_SLA_SECONDS ?? 900),
    };
  }

  checkEncodingDelay(params: {
    videoId: string;
    provider: string;
    createdAt?: Date;
  }) {
    const { videoId, provider, createdAt } = params;
    if (!createdAt) {
      return;
    }

    const elapsedSeconds = Math.floor((Date.now() - createdAt.getTime()) / 1000);
    const sla = this.config.readySlaSeconds;

    if (elapsedSeconds >= sla) {
      this.telemetryService.log('sla.encoding_delay', {
        videoId,
        provider,
        elapsedSeconds,
        thresholdSeconds: sla,
      });
    }
  }

  notifyRetry(params: {
    provider: string;
    videoId?: string;
    attempt: number;
    reason: string;
  }) {
    this.telemetryService.log('retry.attempt', {
      provider: params.provider,
      videoId: params.videoId,
      attempt: params.attempt,
      reason: params.reason,
    });
  }
}
