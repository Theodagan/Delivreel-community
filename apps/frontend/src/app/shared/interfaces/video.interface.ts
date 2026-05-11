export interface CreateVideoRequest {
  title: string;
  description?: string;
  projectId: string;
}

export interface UpdateVideoRequest {
  title?: string;
  description?: string;
}