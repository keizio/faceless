import type { TextProvider, GenerateTextOptions, ImageProvider, VideoProvider, AudioProvider, MusicProvider, AudioResult, GenerateVideoOptions } from "./types.js";
import { uploadFile, randomFilename, downloadAndStoreImageUrl, downloadAndStoreAudioUrl, downloadAndStoreVideoUrl } from "../storage.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_COMPAT_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

function getApiKey(): string {
  const key = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_STUDIO_API_KEY not set");
  return key;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": getApiKey(),
  };
}

const TEXT_MODEL = process.env.AI_TEXT_MODEL ?? "gemini-3.5-flash-001";
const IMAGE_MODEL = process.env.AI_IMAGE_MODEL ?? "gemini-3.1-flash-image-001";
const VIDEO_MODEL = process.env.AI_VIDEO_MODEL ?? "veo-3.1-generate-001";
const AUDIO_MODEL = process.env.AI_AUDIO_MODEL ?? "gemini-3.5-flash-001";
const MUSIC_MODEL = process.env.AI_MUSIC_MODEL ?? "lyria-3";

const POLL_INTERVAL = 10_000;
const MAX_POLL_TIME = 300_000;

async function pollGoogleTask(operationName: string): Promise<Record<string, unknown>> {
  const startTime = Date.now();
  const url = `${BASE_URL}/${operationName}?key=${getApiKey()}`;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    const response = await fetch(url, { headers: authHeaders() });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google AI Studio task poll error: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as {
      done?: boolean;
      response?: Record<string, unknown>;
      error?: { message: string };
    };

    if (result.done && result.response) {
      return result.response;
    }

    if (result.error) {
      throw new Error(`Google AI Studio task failed: ${result.error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error("Google AI Studio task timed out");
}

export class GoogleAIStudioTextProvider implements TextProvider {
  async generate(options: GenerateTextOptions): Promise<string> {
    const contents: Record<string, unknown>[] = [];

    if (options.system) {
      contents.push({
        role: "user",
        parts: [{ text: `System: ${options.system}\n\n${options.prompt}` }],
      });
    }

    const hasImages = options.images && options.images.length > 0;
    const parts: Record<string, unknown>[] = [];

    if (hasImages) {
      for (const img of options.images!) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: img.url,
          },
        });
      }
    }

    parts.push({ text: options.prompt });
    contents.push({ role: "user", parts });

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 8192,
        temperature: options.temperature ?? 0.7,
      },
    };

    const response = await fetch(
      `${BASE_URL}/models/${TEXT_MODEL}:generateContent?key=${getApiKey()}`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google AI Studio text API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}

export class GoogleAIStudioImageProvider implements ImageProvider {
  async generate(
    prompt: string,
    size?: string,
    _model?: string,
    options?: { negativePrompt?: string; qualityTags?: string[] },
  ): Promise<string> {
    let finalPrompt = prompt;
    if (options?.qualityTags?.length) {
      finalPrompt += `, ${options.qualityTags.join(", ")}`;
    }

    const body = {
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    };

    const response = await fetch(
      `${BASE_URL}/models/${IMAGE_MODEL}:generateContent?key=${getApiKey()}`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google AI Studio image API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: ({ inlineData?: { mimeType: string; data: string } } | { text?: string })[] } }[];
    };

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p): p is { inlineData: { mimeType: string; data: string } } =>
        "inlineData" in p && p.inlineData !== undefined,
    );

    if (!imagePart?.inlineData) {
      throw new Error("No image generated by Google AI Studio");
    }

    const { mimeType, data: base64Data } = imagePart.inlineData;
    const ext = mimeType.split("/")[1] ?? "png";
    const buffer = Buffer.from(base64Data, "base64");
    return uploadFile(buffer, randomFilename(ext), mimeType);
  }

  async inpaint(_imageUrl: string, _maskUrl: string, _prompt?: string): Promise<string> {
    throw new Error("Inpainting not supported by Google AI Studio");
  }
}

export class GoogleAIStudioVideoProvider implements VideoProvider {
  async generate(
    _sceneImages: { url: string; description: string }[],
    _storyboard: string,
    _avatarReferenceImage?: string,
    _onProgress?: (completed: number, total: number) => void,
    _options?: GenerateVideoOptions,
  ): Promise<string[]> {
    throw new Error("Video generation is not available via Google AI Studio. Use google-vertex-ai provider for Veo video generation.");
  }
}

export class GoogleAIStudioAudioProvider implements AudioProvider {
  async generate(_text: string, _voice?: string): Promise<AudioResult> {
    throw new Error("Audio/TTS generation is not available via Google AI Studio. Use google-vertex-ai provider for Cloud Text-to-Speech.");
  }
}

export class GoogleAIStudioMusicProvider implements MusicProvider {
  async generate(_prompt: string, _duration?: number): Promise<AudioResult> {
    throw new Error("Music generation is not available via Google AI Studio. Use google-vertex-ai provider for Lyria.");
  }
}