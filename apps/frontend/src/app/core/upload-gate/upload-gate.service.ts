import { Injectable } from '@angular/core';

export abstract class UploadGate {
  abstract requestUploadAccess(projectId: string): Promise<boolean>;
}

@Injectable()
export class PublicUploadGate implements UploadGate {
  async requestUploadAccess(): Promise<boolean> {
    return true;
  }
}
