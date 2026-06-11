export interface UploadAccessPolicy {
  assertCanStartUpload(userId: number, projectId: string): Promise<void>;
  consumeOnUploadCreated(userId: number, projectId: string, videoId: string): Promise<void>;
  releaseOnUploadFailed(userId: number, projectId: string, videoId?: string): Promise<void>;
}
