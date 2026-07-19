import type { TextProvider, GenerateTextOptions, ImageProvider, VideoProvider, AudioProvider, MusicProvider, AudioResult, GenerateVideoOptions } from "./types.js";
import { uploadFile, randomFilename, downloadAndStoreVideoUrl, downloadAndStoreImageUrl, downloadAndStoreAudioUrl } from "../storage.js";

const TEXT_URL =
  process.env.DASHSCOPE_TEXT_URL ??
  "https://ws-s9kt82adyyt5wf26.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions";
const IMAGE_URL =
  process.env.DASHSCOPE_IMAGE_URL ??
  "https://ws-s9kt82adyyt5wf26.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
const VIDEO_URL =
  process.env.DASHSCOPE_VIDEO_URL ??
  "https://ws-s9kt82adyyt5wf26.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
const AUDIO_URL =
  process.env.DASHSCOPE_AUDIO_URL ??
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/audio-synthesis";
const MUSIC_URL =
  process.env.DASHSCOPE_MUSIC_URL ??
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/audio-synthesis";
const TASK_URL_TEMPLATE =
  process.env.DASHSCOPE_TASK_URL ??
  "https://ws-s9kt82adyyt5wf26.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}";

const TEXT_MODEL = process.env.AI_TEXT_MODEL ?? "qwen-plus";
const IMAGE_MODEL = process.env.AI_IMAGE_MODEL ?? "wan2.7-image-pro";
const VIDEO_MODEL = process.env.AI_VIDEO_MODEL ?? "happyhorse-1.1-i2v";
const AUDIO_MODEL = process.env.AI_AUDIO_MODEL ?? "cosyvoice-v1";
const MUSIC_MODEL = process.env.AI_MUSIC_MODEL ?? "fun-music-1.0";

const POLL_INTERVAL = 10_000;
const MAX_POLL_TIME = 300_000;

function getApiKey(): string {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("DASHSCOPE_API_KEY not set");
  return key;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getApiKey()}`,
  };
}

function asyncHeaders() {
  return {
    ...authHeaders(),
    "X-DashScope-Async": "enable",
  };
}

export function getImageSize(aspectRatio: string): string {
  const sizes: Record<string, string> = {
    "9:16": "1080*1920",
    "16:9": "1920*1080",
    "1:1": "1080*1080",
    "4:5": "1080*1350",
  };
  return sizes[aspectRatio] ?? "1080*1920";
}

async function pollDashScopeTask(
  taskId: string,
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME) {
    const taskUrl = TASK_URL_TEMPLATE.replace("{task_id}", taskId);
    const response = await fetch(taskUrl, { headers: authHeaders() });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `DashScope task poll error: ${response.status} ${errorText}`,
      );
    }

    const status = (await response.json()) as {
      output: {
        task_status: string;
        code?: string;
        message?: string;
        choices?: { message?: { content?: { image?: string }[] } }[];
        video_url?: string;
        audio_url?: string;
        duration?: number;
      };
    };

    const taskStatus = status.output?.task_status;

    if (taskStatus === "SUCCEEDED") {
      return status.output as unknown as Record<string, unknown>;
    }

    if (taskStatus === "FAILED") {
      throw new Error(
        `DashScope task failed: ${status.output?.message ?? status.output?.code ?? "Unknown error"}`,
      );
    }

    if (taskStatus === "CANCELED") {
      throw new Error("DashScope task was canceled");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error("DashScope task timed out");
}

async function submitDashScopeTask(
  url: string,
  body: Record<string, unknown>,
  useAsync = false,
): Promise<{ taskId?: string; output?: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: "POST",
    headers: useAsync ? asyncHeaders() : authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DashScope API error: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as {
    output?: {
      task_id?: string;
      task_status?: string;
      choices?: unknown[];
      video_url?: string;
      audio_url?: string;
    };
  };

  if (!result.output) {
    throw new Error(
      `DashScope API returned no output: ${JSON.stringify(result)}`,
    );
  }

  if (result.output.task_id) {
    return { taskId: result.output.task_id };
  }

  if (
    result.output.choices ||
    result.output.video_url ||
    result.output.audio_url ||
    result.output.task_status === "SUCCEEDED"
  ) {
    return { output: result.output as unknown as Record<string, unknown> };
  }

  throw new Error(
    `DashScope API returned unexpected response: ${JSON.stringify(result)}`,
  );
}

export class DashScopeTextProvider implements TextProvider {
  async generate(options: GenerateTextOptions): Promise<string> {
    const hasImages = options.images && options.images.length > 0;

    let userContent: Record<string, unknown> | string;
    if (hasImages) {
      userContent = {
        content: [
          { type: "text", text: options.prompt },
          ...options.images!.map((img) => ({
            type: "image_url",
            image_url: { url: img.url },
          })),
        ],
      };
    } else {
      userContent = options.prompt;
    }

    const messages: Record<string, unknown>[] = [];
    if (options.system) {
      messages.push({ role: "system", content: options.system });
    }
    messages.push({
      role: "user",
      ...(hasImages
        ? { content: (userContent as { content: unknown[] }).content }
        : { content: userContent }),
    });

    const response = await fetch(TEXT_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages,
        max_tokens: options.maxTokens ?? 8192,
        temperature: options.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DashScope text API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

export class DashScopeImageProvider implements ImageProvider {
  async generate(
    prompt: string,
    size?: string,
    _model?: string,
    options?: { negativePrompt?: string; qualityTags?: string[] },
  ): Promise<string> {
    const parameters: Record<string, unknown> = {
      size: size ?? "1080*1920",
      n: 1,
    };

    if (options?.negativePrompt) {
      parameters.refute = options.negativePrompt;
    }

    const body = {
      model: IMAGE_MODEL,
      input: {
        messages: [{ role: "user", content: [{ text: prompt }] }],
      },
      parameters,
    };

    const { taskId, output } = await submitDashScopeTask(IMAGE_URL, body);

    let resultOutput: Record<string, unknown>;

    if (taskId) {
      resultOutput = await pollDashScopeTask(taskId);
    } else if (output) {
      resultOutput = output;
    } else {
      throw new Error("DashScope image API returned no task_id or output");
    }

    const choices = (
      resultOutput as {
        choices?: { message?: { content?: { image?: string }[] } }[];
      }
    ).choices;
    const imageUrl = choices?.[0]?.message?.content?.[0]?.image;

    if (!imageUrl) {
      throw new Error("No image generated by DashScope");
    }

    if (imageUrl.startsWith("data:")) {
      const base64Match = imageUrl.match(
        /^data:image\/(\w+);base64,(.+)$/,
      );
      if (!base64Match) throw new Error("Invalid image data URL format");
      const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
      const buffer = Buffer.from(base64Match[2], "base64");
      return uploadFile(buffer, randomFilename(ext), `image/${ext}`);
    }

    return downloadAndStoreImageUrl(imageUrl);
  }

  async inpaint(imageUrl: string, maskUrl: string, prompt?: string): Promise<string> {
    const body = {
      model: IMAGE_MODEL,
      input: {
        messages: [
          {
            role: "user",
            content: [
              { image: imageUrl },
              { image: maskUrl },
              { text: prompt ?? "Remove the masked area and fill with natural background" },
            ],
          },
        ],
      },
      parameters: {
        size: "1080*1920",
        n: 1,
      },
    };

    const { taskId, output } = await submitDashScopeTask(IMAGE_URL, body);

    let resultOutput: Record<string, unknown>;
    if (taskId) {
      resultOutput = await pollDashScopeTask(taskId);
    } else if (output) {
      resultOutput = output;
    } else {
      throw new Error("DashScope inpaint API returned no task_id or output");
    }

    const choices = (resultOutput as { choices?: { message?: { content?: { image?: string }[] } }[] }).choices;
    const imageResult = choices?.[0]?.message?.content?.[0]?.image;
    if (!imageResult) throw new Error("No inpainted image generated");

    if (imageResult.startsWith("data:")) {
      const base64Match = imageResult.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) throw new Error("Invalid image data URL format");
      const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
      const buffer = Buffer.from(base64Match[2], "base64");
      return uploadFile(buffer, randomFilename(ext), `image/${ext}`);
    }
    return downloadAndStoreImageUrl(imageResult);
  }
}

export class DashScopeVideoProvider implements VideoProvider {
  async generate(
    sceneImages: { url: string; description: string }[],
    storyboard: string,
    avatarReferenceImage?: string,
    onProgress?: (completed: number, total: number) => void,
    _options?: GenerateVideoOptions,
  ): Promise<string[]> {
    const videoUrls: string[] = [];

    const resolutionMap: Record<string, string> = {
      "9:16": "720P",
      "16:9": "720P",
      "1:1": "720P",
      "4:5": "720P",
    };

    const aspectRatio = _options?.aspectRatio ?? "9:16";

    for (let i = 0; i < sceneImages.length; i++) {
      const scene = sceneImages[i];
      const videoPrompt = `${storyboard}\n\nScene ${i + 1}: ${scene.description}`;

      const media: { type: string; url: string }[] = [];
      if (avatarReferenceImage && i === 0) {
        media.push({ type: "first_frame", url: avatarReferenceImage });
      }
      media.push({ type: "first_frame", url: scene.url });

      const body = {
        model: VIDEO_MODEL,
        input: {
          prompt: videoPrompt,
          media,
        },
        parameters: {
          resolution: resolutionMap[aspectRatio] ?? "720P",
          duration: _options?.durations?.[i] ?? 5,
        },
      };

      const { taskId, output } = await submitDashScopeTask(
        VIDEO_URL,
        body,
        true,
      );

      let videoUrl: string | undefined;

      if (taskId) {
        const polled = await pollDashScopeTask(taskId);
        videoUrl = (polled as { video_url?: string }).video_url;
      } else if (output) {
        videoUrl = (output as { video_url?: string }).video_url;
      }

      if (videoUrl) {
        const storedUrl = await downloadAndStoreVideoUrl(videoUrl);
        videoUrls.push(storedUrl);
      }

      onProgress?.(videoUrls.length, sceneImages.length);
    }

    return videoUrls;
  }
}

export class DashScopeAudioProvider implements AudioProvider {
  async generate(text: string, voice?: string): Promise<AudioResult> {
    const body = {
      model: AUDIO_MODEL,
      input: {
        text,
      },
      parameters: {
        ...(voice ? { voice } : {}),
      },
    };

    const { taskId, output } = await submitDashScopeTask(AUDIO_URL, body, true);

    let resultOutput: Record<string, unknown>;

    if (taskId) {
      resultOutput = await pollDashScopeTask(taskId);
    } else if (output) {
      resultOutput = output;
    } else {
      throw new Error("DashScope audio API returned no task_id or output");
    }

    const audioUrl = (resultOutput as { audio_url?: string }).audio_url;

    if (!audioUrl) {
      throw new Error("No audio generated by DashScope CosyVoice");
    }

    const storedUrl = await downloadAndStoreAudioUrl(audioUrl);

    const durationMs = (resultOutput as { duration?: number }).duration ?? 0;

    return { url: storedUrl, durationMs: durationMs as number };
  }
}

export class DashScopeMusicProvider implements MusicProvider {
  async generate(prompt: string, duration?: number): Promise<AudioResult> {
    const body = {
      model: MUSIC_MODEL,
      input: {
        prompt,
      },
      parameters: {
        ...(duration ? { duration: Math.min(duration, 60) } : { duration: 30 }),
      },
    };

    const { taskId, output } = await submitDashScopeTask(MUSIC_URL, body, true);

    let resultOutput: Record<string, unknown>;

    if (taskId) {
      resultOutput = await pollDashScopeTask(taskId);
    } else if (output) {
      resultOutput = output;
    } else {
      throw new Error("DashScope music API returned no task_id or output");
    }

    const audioUrl = (resultOutput as { audio_url?: string }).audio_url;

    if (!audioUrl) {
      throw new Error("No music generated by DashScope Fun-Music");
    }

    const storedUrl = await downloadAndStoreAudioUrl(audioUrl);
    const durationMs = (resultOutput as { duration?: number }).duration ?? 0;

    return { url: storedUrl, durationMs: durationMs as number };
  }
}
