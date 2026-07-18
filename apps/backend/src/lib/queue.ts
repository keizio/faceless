import { Queue, Worker } from "bullmq";
import { getRedisConnection } from "./redis.js";

const redisConnection = getRedisConnection();

export const generationQueue = new Queue("generation", {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export function createGenerationWorker(
  handler: (job: { data: GenerationJobPayload }) => Promise<void>,
): Worker {
  return new Worker("generation", handler, {
    connection: redisConnection as any,
    concurrency: 3,
  });
}

export interface GenerationJobPayload {
  jobId: string;
  userId: string;
  type: string;
  contentId?: string;
  projectId?: string;
  contentType?: string;
  platform?: string;
  aspectRatio?: string;
  language?: string;
  prompt?: string;
  avatarId?: string;
  slideCount?: number;
  sceneIds?: string[];
  imageSize?: string;
  customPrompt?: string;
  templateId?: string;
  templateInputs?: Record<string, unknown>;
  cost?: number;
}

export { redisConnection };