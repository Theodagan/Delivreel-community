import { Injectable } from '@nestjs/common';

import { UploadAccessPolicy } from './upload-access-policy.interface.js';

@Injectable()
export class PublicUploadAccessPolicy implements UploadAccessPolicy {
  async assertCanStartUpload(): Promise<void> {}

  async consumeOnUploadCreated(): Promise<void> {}

  async releaseOnUploadFailed(): Promise<void> {}
}
