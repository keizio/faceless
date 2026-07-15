export type ContentType = "image" | "slide" | "video" | "text";

export type Platform = "tiktok" | "instagram" | "facebook" | "twitter" | "generic";

export type ContentStatus = "draft" | "queued" | "generating" | "ready" | "failed";

export type JobStatus = "pending" | "active" | "completed" | "failed";

export type SpeechStyle =
  | "formal"
  | "casual"
  | "humorous"
  | "professional"
  | "friendly"
  | "persuasive"
  | "inspirational"
  | "educational";

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  plan: string;
  language: string;
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

export interface Avatar {
  id: string;
  userId: string;
  name: string;
  age: number | null;
  gender: string | null;
  speechStyle: SpeechStyle | null;
  referenceImageUrl: string | null;
  characterSheetUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Content {
  id: string;
  projectId: string;
  userId: string;
  avatarId: string | null;
  type: ContentType;
  platform: Platform;
  aspectRatio: string | null;
  language: string;
  status: ContentStatus;
  title: string | null;
  prompt: string;
  script: string | null;
  templateId: string | null;
  templateInputs: Record<string, unknown> | null;
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
  aspectRatio: string;
  language: string;
  prompt: string;
  title?: string;
  avatarId?: string;
  templateId?: string;
  templateInputs?: Record<string, unknown>;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export type NotificationType = "content_generated" | "content_failed" | "avatar_generated" | "avatar_failed" | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface BrandKitColors {
  primary: string;
  secondary: string;
  accent: string;
  text?: string;
  background?: string;
}

export interface BrandKit {
  brandName?: string;
  colors?: BrandKitColors;
  logoUrl?: string;
  fontFamily?: string;
  brandVoice?: string;
  defaultHashtags?: string[];
  defaultCta?: string;
}

export interface CreateAvatarRequest {
  name: string;
  age?: number;
  gender?: string;
  speechStyle?: SpeechStyle;
  referenceImageUrl?: string;
}

export interface Idea {
  id: string;
  language: string;
  date: string;
  topic: string;
  description: string | null;
  hashtags: string[];
  contentType: ContentType | null;
  platform: Platform | null;
  sourceUrl: string | null;
  createdAt: string;
}
