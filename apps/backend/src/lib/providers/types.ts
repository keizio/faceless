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
  aspectRatio?: string;
  durations?: number[];
}

export interface AudioResult {
  url: string;
  durationMs: number;
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
  inpaint?(imageUrl: string, maskUrl: string, prompt?: string): Promise<string>;
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

export interface AudioProvider {
  generate(text: string, voice?: string): Promise<AudioResult>;
}

export interface MusicProvider {
  generate(prompt: string, duration?: number): Promise<AudioResult>;
}

export interface Providers {
  text: TextProvider;
  image: ImageProvider;
  video: VideoProvider;
  audio: AudioProvider;
  music: MusicProvider;
}