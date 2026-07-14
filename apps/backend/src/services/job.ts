import { db } from "../db/index.js";
import { generationJobs } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { generationQueue } from "../lib/queue.js";

export class JobService {
  async getJobStatus(userId: string, jobId: string) {
    const [job] = await db
      .select()
      .from(generationJobs)
      .where(
        and(eq(generationJobs.id, jobId), eq(generationJobs.userId, userId)),
      )
      .limit(1);

    if (!job) throw new Error("Job not found");

    const bullJob = await generationQueue.getJob(jobId);

    if (bullJob) {
      const progress = await bullJob.progress;
      return { ...job, progress: typeof progress === "number" ? progress : 0 };
    }

    return job;
  }
}