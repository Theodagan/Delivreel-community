import { Module } from '@nestjs/common';

import { PublicUploadAccessPolicy } from './public-upload-access.policy.js';
import { UPLOAD_ACCESS_POLICY } from './upload-access-policy.token.js';

@Module({
  providers: [
    PublicUploadAccessPolicy,
    {
      provide: UPLOAD_ACCESS_POLICY,
      useExisting: PublicUploadAccessPolicy,
    },
  ],
  exports: [UPLOAD_ACCESS_POLICY],
})
export class UploadAccessModule {}
