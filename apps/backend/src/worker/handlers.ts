import { db } from "../db/index.js";
import { generationJobs } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { runContentPipeline } from "../agents/pipeline.js";
import { mastra } from "../mastra/index.js";
import type { GenerationJobPayload } from "../lib/queue.js";
import { UsageService } from "../services/usage.js";

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
    if (payload.cost) {
      const usageService = new UsageService();
      await usageService.refundCredits(payload.userId, payload.cost);
    }
    throw error;
  }
}

async function handleAvatarGeneration(
  payload: GenerationJobPayload,
): Promise<void> {
  const { jobId, avatarId, userId, customPrompt } = payload;
  if (!avatarId) return;

  await db
    .update(generationJobs)
    .set({ status: "active", startedAt: new Date() })
    .where(eq(generationJobs.id, jobId));

  try {
    const workflow = mastra.getWorkflow("generateAvatarWorkflow");
    const run = await workflow.createRunAsync();
    await run.start({
      inputData: { avatarId, userId, customPrompt },
    });

    await db
      .update(generationJobs)
      .set({ status: "completed", progress: 100, completedAt: new Date() })
      .where(eq(generationJobs.id, jobId));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(generationJobs)
      .set({ status: "failed", error: errMsg, completedAt: new Date() })
      .where(eq(generationJobs.id, jobId));
    if (payload.cost) {
      const usageService = new UsageService();
      await usageService.refundCredits(payload.userId, payload.cost);
    }
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