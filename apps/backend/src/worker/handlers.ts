import { db } from "../db/index.js";
import { generationJobs } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { runContentPipeline } from "../agents/pipeline.js";
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

const jobHandlers: Record<string, JobHandler> = {
  "content-generation": handleContentGeneration,
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
