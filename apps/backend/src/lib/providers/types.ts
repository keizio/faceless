export interface GenerateTextOptions {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  images?: { name: string; url: string }[];
}

export interface TextProvider {
  generate(options: GenerateTextOptions): Promise<string>;
}

export interface ImageProvider {
  generate(prompt: string, size?: string, model?: string): Promise<string>;
}

export interface VideoProvider {
  generate(
    sceneImages: { url: string; description: string }[],
    storyboard: string,
    onProgress?: (completed: number, total: number) => void,
  ): Promise<string[]>;
}

export interface Providers {
  text: TextProvider;
  image: ImageProvider;
  video: VideoProvider;
}
