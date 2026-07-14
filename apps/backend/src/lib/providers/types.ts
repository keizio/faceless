export interface GenerateTextOptions {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  images?: { name: string; url: string }[];
}

export interface GenerateImageOptions {
  negativePrompt?: string;
  qualityTags?: string[];
}

export interface GenerateVideoOptions {
  avatarReferenceImage?: string;
  negativePrompt?: string;
}

export interface TextProvider {
  generate(options: GenerateTextOptions): Promise<string>;
}

export interface ImageProvider {
  generate(
    prompt: string,
    size?: string,
    model?: string,
    options?: GenerateImageOptions,
  ): Promise<string>;
}

export interface VideoProvider {
  generate(
    sceneImages: { url: string; description: string }[],
    storyboard: string,
    avatarReferenceImage?: string,
    onProgress?: (completed: number, total: number) => void,
    options?: GenerateVideoOptions,
  ): Promise<string[]>;
}

export interface Providers {
  text: TextProvider;
  image: ImageProvider;
  video: VideoProvider;
}