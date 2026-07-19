import type { TextProvider, GenerateTextOptions, ImageProvider, VideoProvider, AudioProvider, MusicProvider, AudioResult, GenerateVideoOptions } from "./types.js";
import { uploadFile, randomFilename, downloadAndStoreImageUrl, downloadAndStoreVideoUrl, downloadAndStoreAudioUrl } from "../storage.js";

const BASE_URL = process.env.ARK_BASE_URL ?? "https://ark.volces.com/api/v3";
const VIDEO_URL = process.env.ARK_VIDEO_URL ?? `${BASE_URL}/video/generations`;
const AUDIO_URL = process.env.ARK_AUDIO_URL ?? `${BASE_URL}/audio/speech`;
const MUSIC_URL = process.env.ARK_MUSIC_URL ?? `${BASE_URL}/audio/generations`;

const POLL_INTERVAL = 10_000;
const MAX_POLL_TIME = 300_000;

function getApiKey(): string {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error("ARK_API_KEY not set");
  return key;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getApiKey()}`,
  };
}

async function pollArkTask(
  taskId: string,
  baseUrl: string,
): Promise<Record<string, unknown>> {
  const startTime = Date.now();
  const taskUrl = `${baseUrl}/${taskId}`;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    const response = await fetch(taskUrl, { headers: authHeaders() });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ModelArk task poll error: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as {
      status?: string;
      state?: string;
      output?: Record<string, unknown>;
      error?: { message?: string };
    };

    const status = result.status ?? result.state ?? "";

    if (status === "SUCCEEDED" || status === "succeeded" || status === "completed") {
      return result.output ?? (result as unknown as Record<string, unknown>);
    }

    if (status === "FAILED" || status === "failed") {
      throw new Error(
        `ModelArk task failed: ${result.error?.message ?? "Unknown error"}`,
      );
    }

    if (status === "CANCELED" || status === "canceled") {
      throw new Error("ModelArk task was canceled");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error("ModelArk task timed out");
}

async function submitArkTask(
  url: string,
  body: Record<string, unknown>,
): Promise<{ taskId?: string; output?: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ModelArk API error: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as Record<string, unknown>;

  const taskId = (result.id ?? result.task_id ?? result.operationName ?? result.name) as string | undefined;

  if (taskId) {
    return { taskId };
  }

  const output = result.data ?? result.output ?? result;
  return { output: output as Record<string, unknown> };
}

export class ModelArkTextProvider implements TextProvider {
  async generate(options: GenerateTextOptions): Promise<string> {
    const messages: Record<string, unknown>[] = [];
    if (options.system) {
      messages.push({ role: "system", content: options.system });
    }

    const hasImages = options.images && options.images.length > 0;
    if (hasImages) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: options.prompt },
          ...options.images!.map((img) => ({
            type: "image_url",
            image_url: { url: img.url },
          })),
        ],
      });
    } else {
      messages.push({ role: "user", content: options.prompt });
    }

    const model = process.env.AI_TEXT_MODEL;
    if (!model) {
      throw new Error("AI_TEXT_MODEL not set for ModelArk text provider");
    }

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 8192,
        temperature: options.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ModelArk text API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content: string } }[];
    };

    return data.choices?.[0]?.message?.content ?? "";
  }
}

export class ModelArkImageProvider implements ImageProvider {
  async generate(
    prompt: string,
    size?: string,
    model?: string,
    options?: { negativePrompt?: string; qualityTags?: string[] },
  ): Promise<string> {
    let finalPrompt = prompt;
    if (options?.qualityTags?.length) {
      finalPrompt += `, ${options.qualityTags.join(", ")}`;
    }

    const resolvedModel = model ?? process.env.AI_IMAGE_MODEL;
    if (!resolvedModel) {
      throw new Error("AI_IMAGE_MODEL not set for ModelArk image provider");
    }

    const body: Record<string, unknown> = {
      model: resolvedModel,
      prompt: finalPrompt,
      n: 1,
    };

    if (size) {
      body.size = size;
    }

    if (options?.negativePrompt) {
      body.negative_prompt = options.negativePrompt;
    }

    const response = await fetch(`${BASE_URL}/images/generations`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ModelArk image API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      data?: { url?: string; b64_json?: string }[];
    };

    const imageData = data.data?.[0];

    if (!imageData) {
      throw new Error("No image generated by ModelArk");
    }

    if (imageData.b64_json) {
      const buffer = Buffer.from(imageData.b64_json, "base64");
      return uploadFile(buffer, randomFilename("png"), "image/png");
    }

    if (imageData.url) {
      return downloadAndStoreImageUrl(imageData.url);
    }

    throw new Error("ModelArk image response has no url or b64_json");
  }

  async inpaint(imageUrl: string, maskUrl: string, prompt?: string): Promise<string> {
    const model = process.env.AI_IMAGE_MODEL;
    if (!model) {
      throw new Error("AI_IMAGE_MODEL not set for ModelArk inpaint");
    }

    const body = {
      model,
      input: {
        image: imageUrl,
        mask: maskUrl,
        prompt: prompt ?? "Fill the masked area naturally",
      },
    };

    const response = await fetch(`${BASE_URL}/images/edits`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ModelArk inpaint API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      data?: { url?: string; b64_json?: string }[];
    };

    const imageData = data.data?.[0];
    if (!imageData) {
      throw new Error("No inpainted image generated by ModelArk");
    }

    if (imageData.b64_json) {
      const buffer = Buffer.from(imageData.b64_json, "base64");
      return uploadFile(buffer, randomFilename("png"), "image/png");
    }

    if (imageData.url) {
      return downloadAndStoreImageUrl(imageData.url);
    }

    throw new Error("ModelArk inpaint response has no url or b64_json");
  }
}

export class ModelArkVideoProvider implements VideoProvider {
  async generate(
    sceneImages: { url: string; description: string }[],
    storyboard: string,
    _avatarReferenceImage?: string,
    onProgress?: (completed: number, total: number) => void,
    _options?: GenerateVideoOptions,
  ): Promise<string[]> {
    const model = process.env.AI_VIDEO_MODEL;
    if (!model) {
      throw new Error("AI_VIDEO_MODEL not set for ModelArk video provider");
    }

    const videoUrls: string[] = [];

    for (let i = 0; i < sceneImages.length; i++) {
      const scene = sceneImages[i];
      const videoPrompt = `${storyboard}\n\nScene ${i + 1}: ${scene.description}`;

      const body = {
        model,
        input: {
          prompt: videoPrompt,
          image: scene.url,
        },
        parameters: {
          duration: _options?.durations?.[i] ?? 5,
        },
      };

      const { taskId, output } = await submitArkTask(VIDEO_URL, body);

      let resultOutput: Record<string, unknown>;
      if (taskId) {
        resultOutput = await pollArkTask(taskId, VIDEO_URL);
      } else if (output) {
        resultOutput = output;
      } else {
        throw new Error(`ModelArk video API returned no task_id or output for scene ${i + 1}`);
      }

      const videoUrl = (resultOutput.video_url ?? resultOutput.url ?? resultOutput.output_url) as string | undefined;

      if (!videoUrl) {
        throw new Error(`ModelArk video generation failed for scene ${i + 1}: no video URL in response`);
      }

      const storedUrl = await downloadAndStoreVideoUrl(videoUrl);
      videoUrls.push(storedUrl);

      onProgress?.(videoUrls.length, sceneImages.length);
    }

    return videoUrls;
  }
}

export class ModelArkAudioProvider implements AudioProvider {
  async generate(text: string, voice?: string): Promise<AudioResult> {
    const model = process.env.AI_AUDIO_MODEL;
    if (!model) {
      throw new Error("AI_AUDIO_MODEL not set for ModelArk audio provider");
    }

    const body: Record<string, unknown> = {
      model,
      input: { text },
      ...(voice ? { voice } : {}),
    };

    const response = await fetch(AUDIO_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ModelArk audio API error: ${response.status} ${errorText}`);
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("audio/") || contentType.includes("octet-stream")) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = contentType.includes("mpeg") ? "mp3" : "wav";
      const url = await uploadFile(buffer, randomFilename(ext), contentType);
      const durationMs = Math.round(text.length * 75);
      return { url, durationMs };
    }

    const data = (await response.json()) as {
      audio_url?: string;
      data?: { url?: string };
      duration?: number;
    };

    const audioUrl = data.audio_url ?? data.data?.url;

    if (!audioUrl) {
      throw new Error("No audio generated by ModelArk");
    }

    const storedUrl = await downloadAndStoreAudioUrl(audioUrl);
    const durationMs = (data.duration ?? text.length * 75) as number;

    return { url: storedUrl, durationMs };
  }
}

export class ModelArkMusicProvider implements MusicProvider {
  async generate(prompt: string, duration?: number): Promise<AudioResult> {
    const model = process.env.AI_MUSIC_MODEL;
    if (!model) {
      throw new Error("AI_MUSIC_MODEL not set for ModelArk music provider");
    }

    const body: Record<string, unknown> = {
      model,
      input: { prompt },
      parameters: {
        ...(duration ? { duration: Math.min(duration, 60) } : { duration: 30 }),
      },
    };

    const { taskId, output } = await submitArkTask(MUSIC_URL, body);

    let resultOutput: Record<string, unknown>;
    if (taskId) {
      resultOutput = await pollArkTask(taskId, MUSIC_URL);
    } else if (output) {
      resultOutput = output;
    } else {
      throw new Error("ModelArk music API returned no task_id or output");
    }

    const audioUrl = (resultOutput.audio_url ?? resultOutput.url ?? resultOutput.output_url) as string | undefined;

    if (!audioUrl) {
      throw new Error("No music generated by ModelArk");
    }

    const storedUrl = await downloadAndStoreAudioUrl(audioUrl);
    const durationMs = (resultOutput.duration ?? (duration ?? 30) * 1000) as number;

    return { url: storedUrl, durationMs };
  }
}