import { mastra } from "../mastra/index.js";
import { db } from "../db/index.js";
import { contents, generationJobs } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { NotificationService } from "../services/notification.js";
import type { GenerationJobPayload } from "../lib/queue.js";

const WORKFLOW_TIMEOUT = 600_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Workflow timed out")), ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function runContentPipeline(payload: GenerationJobPayload) {
  const { jobId, userId, contentType, platform, prompt, avatarId } = payload;
  const contentId = payload.contentId!;

  await db
    .update(contents)
    .set({ status: "generating" })
    .where(eq(contents.id, contentId));

  try {
    let result: unknown;

    const aspectRatio = payload.aspectRatio ?? "9:16";
    const language = payload.language ?? "en";

    switch (contentType) {
      case "image": {
        const workflow = mastra.getWorkflow("generateImageWorkflow");
        const run = await workflow.createRun();
        result = await withTimeout(
          run.start({
            inputData: {
              contentId,
              userId,
              prompt: prompt ?? "",
              platform: platform ?? "generic",
              aspectRatio,
              language,
              avatarId,
            },
          }),
          WORKFLOW_TIMEOUT,
        );
        break;
      }

      case "video": {
        const workflow = mastra.getWorkflow("generateVideoWorkflow");
        const run = await workflow.createRun();
        result = await withTimeout(
          run.start({
            inputData: {
              contentId,
              userId,
              prompt: prompt ?? "",
              platform: platform ?? "generic",
              aspectRatio,
              sceneCount: 3,
              language,
              avatarId,
            },
          }),
          WORKFLOW_TIMEOUT,
        );
        break;
      }

      case "slide":
      case "text":
      default: {
        const workflow = mastra.getWorkflow("generateContentWorkflow");
        const run = await workflow.createRun();
        result = await withTimeout(
          run.start({
            inputData: {
              contentId,
              userId,
              contentType: (contentType ?? "text") as
                | "image"
                | "slide"
                | "video"
                | "text",
              platform: platform ?? "generic",
              prompt: prompt ?? "",
              language,
              avatarId,
            },
          }),
          WORKFLOW_TIMEOUT,
        );
        break;
      }
    }

    await db
      .update(generationJobs)
      .set({
        status: "completed",
        progress: 100,
        result: result as any,
        completedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));

    await db
      .update(contents)
      .set({ status: "ready" })
      .where(eq(contents.id, contentId));

    const notificationService = new NotificationService();
    await notificationService.create(
      userId,
      "content_generated",
      "Content Generated",
      `Your ${contentType} content has been generated successfully.`,
      `/contents/${contentId}`,
    );

    return result;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";

    await db
      .update(generationJobs)
      .set({ status: "failed", error: errMsg, completedAt: new Date() })
      .where(eq(generationJobs.id, jobId));

    await db
      .update(contents)
      .set({ status: "failed" })
      .where(eq(contents.id, contentId));

    const notificationService = new NotificationService();
    await notificationService.create(
      userId,
      "content_failed",
      "Generation Failed",
      `Your ${contentType} content generation failed: ${errMsg}`,
      `/contents/${contentId}`,
    );

    throw error;
  }
}