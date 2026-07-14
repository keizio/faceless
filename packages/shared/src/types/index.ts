export type ContentType = "image" | "slide" | "video" | "text";

export type Platform = "tiktok" | "instagram" | "facebook" | "twitter" | "generic";

export type ContentStatus = "draft" | "queued" | "generating" | "ready" | "failed";

export type JobStatus = "pending" | "active" | "completed" | "failed";

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithContents extends Project {
  contents: Content[];
}

export interface Content {
  id: string;
  projectId: string;
  userId: string;
  type: ContentType;
  platform: Platform;
  status: ContentStatus;
  title: string | null;
  prompt: string;
  script: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContentWithVersions extends Content {
  versions: ContentVersion[];
}

export interface ContentVersion {
  id: string;
  contentId: string;
  versionNumber: number;
  outputUrl: string | null;
  thumbnailUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GenerationJob {
  id: string;
  contentId: string;
  userId: string;
  jobType: string;
  status: JobStatus;
  progress: number;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateContentRequest {
  type: ContentType;
  platform: Platform;
  prompt: string;
  title?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}
