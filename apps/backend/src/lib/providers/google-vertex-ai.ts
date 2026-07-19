import type { TextProvider, GenerateTextOptions, ImageProvider, VideoProvider, AudioProvider, MusicProvider, AudioResult, GenerateVideoOptions } from "./types.js";
import { uploadFile, randomFilename, downloadAndStoreImageUrl, downloadAndStoreAudioUrl, downloadAndStoreVideoUrl } from "../storage.js";
import jwt from "jsonwebtoken";

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const DEFAULT_LOCATION = "us-central1";
const TEXT_MODEL = process.env.AI_TEXT_MODEL ?? "gemini-3.5-flash-001";
const IMAGE_MODEL = process.env.AI_IMAGE_MODEL ?? "imagen-3.0-generate-001";
const VIDEO_MODEL = process.env.AI_VIDEO_MODEL ?? "veo-3.1-generate-001";
const AUDIO_MODEL = process.env.AI_AUDIO_MODEL ?? "chirp-3";
const MUSIC_MODEL = process.env.AI_MUSIC_MODEL ?? "lyria-3";

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

function getCredentials(): ServiceAccountCredentials {
  const raw = process.env.GOOGLE_VERTEX_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_VERTEX_CREDENTIALS not set");
  try {
    return JSON.parse(raw) as ServiceAccountCredentials;
  } catch {
    throw new Error("GOOGLE_VERTEX_CREDENTIALS is not valid JSON");
  }
}

function getProject(): string {
  return process.env.GOOGLE_VERTEX_PROJECT ?? getCredentials().project_id;
}

function getLocation(): string {
  return process.env.GOOGLE_VERTEX_LOCATION ?? DEFAULT_LOCATION;
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const credentials = getCredentials();
  const now = Math.floor(Date.now() / 1000);
  const expiry = 3600;

  const claimSet = {
    iss: credentials.client_email,
    scope: SCOPES.join(" "),
    aud: TOKEN_URL,
    exp: now + expiry,
    iat: now,
  };

  const signedJwt = jwt.sign(claimSet, credentials.private_key, { algorithm: "RS256" });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex AI auth error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  const accessToken = data.access_token;
  cachedToken = {
    accessToken,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return accessToken;
}

function authHeadersWithToken(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function vertexEndpoint(model: string, action: string): string {
  const project = getProject();
  const location = getLocation();
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:${action}`;
}

const POLL_INTERVAL = 10_000;
const MAX_POLL_TIME = 300_000;

async function submitVertexTask(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<{ operationName?: string; output?: Record<string, unknown> }> {
  const token = await getAccessToken();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: authHeadersWithToken(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex AI API error: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as Record<string, unknown>;

  if (result.name && typeof result.name === "string") {
    return { operationName: result.name };
  }

  if (result.predictions || result.choices) {
    return { output: result };
  }

  return { output: result };
}

async function pollVertexOperation(operationName: string): Promise<Record<string, unknown>> {
  const startTime = Date.now();
  const token = await getAccessToken();

  while (Date.now() - startTime < MAX_POLL_TIME) {
    const response = await fetch(
      `https://${DEFAULT_LOCATION}-aiplatform.googleapis.com/v1/${operationName}`,
      { headers: authHeadersWithToken(token) },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI operation poll error: ${response.status} ${errorText}`);
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
      throw new Error(`Vertex AI operation failed: ${result.error.message}`);
    }

    const newToken = await getAccessToken();
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error("Vertex AI operation timed out");
}

export class GoogleVertexTextProvider implements TextProvider {
  async generate(options: GenerateTextOptions): Promise<string> {
    const contents: Record<string, unknown>[] = [];

    const parts: Record<string, unknown>[] = [];
    const hasImages = options.images && options.images.length > 0;

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

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 8192,
        temperature: options.temperature ?? 0.7,
      },
    };

    if (options.system) {
      body.systemInstruction = { parts: [{ text: options.system }] };
    }

    const token = await getAccessToken();
    const endpoint = vertexEndpoint(TEXT_MODEL, "generateContent");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: authHeadersWithToken(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI text API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}

export class GoogleVertexImageProvider implements ImageProvider {
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

    const parameters: Record<string, unknown> = {
      sampleCount: 1,
    };

    if (size) {
      const [w, h] = size.split("*").map(Number);
      if (w && h) {
        parameters.aspectRatio = `${w}:${h}`;
      }
    }

    if (options?.negativePrompt) {
      parameters.negativePrompt = options.negativePrompt;
    }

    const body = {
      instances: [{ prompt: finalPrompt }],
      parameters,
    };

    const endpoint = vertexEndpoint(IMAGE_MODEL, "predict");
    const { operationName, output } = await submitVertexTask(endpoint, body);

    let resultOutput: Record<string, unknown>;
    if (operationName) {
      resultOutput = await pollVertexOperation(operationName);
    } else if (output) {
      resultOutput = output;
    } else {
      throw new Error("Vertex AI image API returned no operation or output");
    }

    const predictions = resultOutput.predictions as Array<{ bytesBase64Encoded?: string; mimeType?: string }> | undefined;
    const prediction = predictions?.[0];

    if (!prediction) {
      throw new Error("No image generated by Vertex AI Imagen");
    }

    if (prediction.bytesBase64Encoded) {
      const mimeType = prediction.mimeType ?? "image/png";
      const ext = mimeType.split("/")[1] ?? "png";
      const buffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
      return uploadFile(buffer, randomFilename(ext), mimeType);
    }

    throw new Error("Vertex AI image generation returned unexpected format");
  }

  async inpaint(imageUrl: string, maskUrl: string, prompt?: string): Promise<string> {
    const body = {
      instances: [{
        prompt: prompt ?? "Fill the masked area naturally",
        image: { bytesBase64Encoded: imageUrl },
        mask: { bytesBase64Encoded: maskUrl },
      }],
      parameters: { sampleCount: 1 },
    };

    const endpoint = vertexEndpoint(IMAGE_MODEL, "predict");
    const { operationName, output } = await submitVertexTask(endpoint, body);

    let resultOutput: Record<string, unknown>;
    if (operationName) {
      resultOutput = await pollVertexOperation(operationName);
    } else if (output) {
      resultOutput = output;
    } else {
      throw new Error("Vertex AI inpaint API returned no operation or output");
    }

    const predictions = resultOutput.predictions as Array<{ bytesBase64Encoded?: string; mimeType?: string }> | undefined;
    const prediction = predictions?.[0];

    if (!prediction?.bytesBase64Encoded) {
      throw new Error("No inpainted image generated");
    }

    const mimeType = prediction.mimeType ?? "image/png";
    const ext = mimeType.split("/")[1] ?? "png";
    const buffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
    return uploadFile(buffer, randomFilename(ext), mimeType);
  }
}

export class GoogleVertexVideoProvider implements VideoProvider {
  async generate(
    sceneImages: { url: string; description: string }[],
    storyboard: string,
    _avatarReferenceImage?: string,
    onProgress?: (completed: number, total: number) => void,
    _options?: GenerateVideoOptions,
  ): Promise<string[]> {
    const videoUrls: string[] = [];

    for (let i = 0; i < sceneImages.length; i++) {
      const scene = sceneImages[i];
      const videoPrompt = `${storyboard}\n\nScene ${i + 1}: ${scene.description}`;

      const body = {
        instances: [{
          prompt: videoPrompt,
          image: { url: scene.url },
        }],
        parameters: {
          sampleCount: 1,
          durationSeconds: _options?.durations?.[i] ?? 5,
          aspectRatio: _options?.aspectRatio?.replace(":", ":") ?? "9:16",
        },
      };

      const endpoint = vertexEndpoint(VIDEO_MODEL, "predict");
      const { operationName, output } = await submitVertexTask(endpoint, body);

      let resultOutput: Record<string, unknown>;
      if (operationName) {
        resultOutput = await pollVertexOperation(operationName);
      } else if (output) {
        resultOutput = output;
      } else {
        throw new Error(`Vertex AI video API returned no operation or output for scene ${i + 1}`);
      }

      const predictions = resultOutput.predictions as Array<{ bytesBase64Encoded?: string; videoUrl?: string; mimeType?: string }> | undefined;
      const prediction = predictions?.[0];

      let videoUrl: string | undefined;

      if (prediction?.videoUrl) {
        videoUrl = prediction.videoUrl;
      } else if (prediction?.bytesBase64Encoded) {
        const mimeType = prediction.mimeType ?? "video/mp4";
        const ext = mimeType.split("/")[1] ?? "mp4";
        const buffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
        videoUrl = await uploadFile(buffer, randomFilename(ext), mimeType);
      } else if (resultOutput.videoUrl) {
        videoUrl = resultOutput.videoUrl as string;
      }

      if (!videoUrl) {
        throw new Error(`Vertex AI video generation failed for scene ${i + 1}: no video in response`);
      }

      if (videoUrl.startsWith("http")) {
        const storedUrl = await downloadAndStoreVideoUrl(videoUrl);
        videoUrls.push(storedUrl);
      } else {
        videoUrls.push(videoUrl);
      }

      onProgress?.(videoUrls.length, sceneImages.length);
    }

    return videoUrls;
  }
}

export class GoogleVertexAudioProvider implements AudioProvider {
  async generate(text: string, voice?: string): Promise<AudioResult> {
    const body = {
      input: { text },
      voice: {
        languageCode: "en-US",
        name: voice ?? "en-US-Wavenet-D",
        ssmlGender: "NEUTRAL",
      },
      audioConfig: {
        audioEncoding: "MP3",
      },
    };

    const token = await getAccessToken();
    const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST",
      headers: authHeadersWithToken(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI audio API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { audioContent?: string };
    if (!data.audioContent) {
      throw new Error("No audio generated by Google Cloud Text-to-Speech");
    }

    const buffer = Buffer.from(data.audioContent, "base64");
    const url = await uploadFile(buffer, randomFilename("mp3"), "audio/mpeg");
    const durationMs = Math.round(text.length * 75);

    return { url, durationMs };
  }
}

export class GoogleVertexMusicProvider implements MusicProvider {
  async generate(prompt: string, duration?: number): Promise<AudioResult> {
    const body = {
      instances: [{
        prompt,
        ...(duration ? { durationSeconds: duration } : {}),
      }],
      parameters: {
        sampleCount: 1,
      },
    };

    const endpoint = vertexEndpoint(MUSIC_MODEL, "predict");
    const { operationName, output } = await submitVertexTask(endpoint, body);

    let resultOutput: Record<string, unknown>;
    if (operationName) {
      resultOutput = await pollVertexOperation(operationName);
    } else if (output) {
      resultOutput = output;
    } else {
      throw new Error("Vertex AI music API returned no operation or output");
    }

    const predictions = resultOutput.predictions as Array<{ bytesBase64Encoded?: string; audioUrl?: string; mimeType?: string }> | undefined;
    const prediction = predictions?.[0];

    let audioUrl: string | undefined;
    if (prediction?.audioUrl) {
      audioUrl = prediction.audioUrl;
    } else if (prediction?.bytesBase64Encoded) {
      const mimeType = prediction.mimeType ?? "audio/mpeg";
      const ext = "mp3";
      const buffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
      audioUrl = await uploadFile(buffer, randomFilename(ext), mimeType);
    }

    if (!audioUrl) {
      throw new Error("No music generated by Vertex AI Lyria");
    }

    let storedUrl: string;
    if (audioUrl.startsWith("http")) {
      storedUrl = await downloadAndStoreAudioUrl(audioUrl);
    } else {
      storedUrl = audioUrl;
    }

    const durationMs = ((prediction as Record<string, unknown> | undefined)?.durationSeconds as number ?? duration ?? 30) * 1000;
    return { url: storedUrl, durationMs };
  }
}