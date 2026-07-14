import { db } from "../db/index.js";
import { generationJobs, avatars } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { runContentPipeline } from "../agents/pipeline.js";
import { getProviders } from "../lib/providers/factory.js";
import type { GenerationJobPayload } from "../lib/queue.js";

type JobHandler = (payload: GenerationJobPayload) => Promise<void>;

async function handleContentGeneration(
  payload: GenerationJobPayload,
): Promise<void> {
  const { jobId, contentId } = payload;
  if (!contentId) return;

  await db
    .update(generationJobs)
    .set({ status: "active", startedAt: new Date() })
    .where(eq(generationJobs.id, jobId));

  try {
    await runContentPipeline(payload);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(generationJobs)
      .set({ status: "failed", error: errMsg, completedAt: new Date() })
      .where(eq(generationJobs.id, jobId));
    throw error;
  }
}

async function handleAvatarGeneration(
  payload: GenerationJobPayload,
): Promise<void> {
  const { jobId, avatarId } = payload;
  if (!avatarId) return;

  await db
    .update(generationJobs)
    .set({ status: "active", startedAt: new Date() })
    .where(eq(generationJobs.id, jobId));

  try {
    const [avatar] = await db
      .select()
      .from(avatars)
      .where(eq(avatars.id, avatarId))
      .limit(1);

    if (!avatar) {
      throw new Error(`Avatar not found: ${avatarId}`);
    }

    const textProvider = getProviders().text;

    const systemPrompt = `You are a character designer. Create a detailed character sheet for a faceless content avatar.

    Given the avatar's name, age, gender, and speech style, generate a comprehensive character description suitable for consistent AI image generation.

    The character sheet should describe:
    1. Physical appearance (clothing style, silhouette, posture, distinguishing features)
    2. Typical environments and settings
    3. Color palette and aesthetic
    4. Camera angles and framing that suit this character
    5. Visual mood and atmosphere

    IMPORTANT: This is for FACELESS content. The character should be described in a way that works without showing faces. Focus on silhouette, clothing, posture, and environmental context.

    Output format: A single paragraph (200-300 words) that can be injected into image generation prompts to maintain character consistency.`;

    const characterSheet = await textProvider.generate({
      system: systemPrompt,
      prompt: `Create a character sheet for: ${avatar.name}, ${avatar.age ?? "unknown"} years old, ${avatar.gender ?? "unspecified"}, speech style: ${avatar.speechStyle ?? "neutral"}.`,
      temperature: 0.8,
      maxTokens: 1024,
    });

    const currentMetadata = (avatar.metadata as Record<string, unknown>) ?? {};
    const updatedMetadata = {
      ...currentMetadata,
      characterSheet,
      generatedAt: new Date().toISOString(),
    };

    await db
      .update(avatars)
      .set({
        metadata: updatedMetadata as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(avatars.id, avatarId));

    await db
      .update(generationJobs)
      .set({
        status: "completed",
        progress: 100,
        result: { characterSheet },
        completedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(generationJobs)
      .set({ status: "failed", error: errMsg, completedAt: new Date() })
      .where(eq(generationJobs.id, jobId));
    throw error;
  }
}

const jobHandlers: Record<string, JobHandler> = {
  "content-generation": handleContentGeneration,
  "avatar-generation": handleAvatarGeneration,
};

export async function jobHandler(
  job: { data: GenerationJobPayload },
): Promise<void> {
  const { type } = job.data;
  const handler = jobHandlers[type];
  if (!handler) {
    throw new Error(`Unknown job type: ${type}`);
  }
  await handler(job.data);
}