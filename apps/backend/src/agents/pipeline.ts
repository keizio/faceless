import { mastra } from "../mastra/index.js";
import { db } from "../db/index.js";
import { contents, generationJobs, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { NotificationService } from "../services/notification.js";
import { buildTemplatePrompt } from "../lib/templates/prompt-builder.js";
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
    let language = payload.language;
    if (!language) {
      const [user] = await db
        .select({ language: users.language })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      language = user?.language ?? "en";
    }

    let templatePrompts = null;
    if (payload.templateId && payload.templateInputs) {
      templatePrompts = buildTemplatePrompt(payload.templateId, payload.templateInputs);
    }

    const templateOverrides = templatePrompts
      ? {
          templateSystemPrompt: templatePrompts.systemPrompt,
          templateVisualGuidance: templatePrompts.visualGuidance,
          templateNegativeAdditions: templatePrompts.negativeAdditions,
          templateScriptStructure: templatePrompts.scriptStructure,
          templateNarrationGuidance: templatePrompts.narrationGuidance,
        }
      : {};

    switch (contentType) {
      case "image": {
        const workflow = mastra.getWorkflow("generateImageWorkflow");
        const run = await workflow.createRunAsync();
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
              templateId: payload.templateId,
              templateInputs: payload.templateInputs,
              ...templateOverrides,
            },
          }),
          WORKFLOW_TIMEOUT,
        );
        break;
      }

      case "video": {
        if (payload.templateId === "ai-music-video") {
          const ti = payload.templateInputs ?? {};
          const workflow = mastra.getWorkflow("generateMusicVideoWorkflow");
          const run = await workflow.createRunAsync();
          result = await withTimeout(
            run.start({
              inputData: {
                contentId,
                userId,
                prompt: prompt ?? "",
                platform: platform ?? "generic",
                aspectRatio,
                sceneCount: 4,
                language,
                moodOrGenre: (ti.moodOrGenre as string) ?? "",
                visualStyle: (ti.visualStyle as string) ?? "cinematic",
                audioSource: (ti.audioSource as "ai-generated" | "upload") ?? "ai-generated",
                audioFileUrl: (ti.audioFile as string) ?? undefined,
              },
            }),
            WORKFLOW_TIMEOUT,
          );
        } else {
          let sceneCount = 3;
          if (payload.templateId === "listicle") {
            sceneCount = (payload.templateInputs?.itemCount as number) ?? 5;
          } else if (payload.templateId && ["fake-chat", "split-screen", "ugc-product-marketing"].includes(payload.templateId)) {
            sceneCount = 1;
          }

          const workflow = mastra.getWorkflow("generateVideoWorkflow");
          const run = await workflow.createRunAsync();
          result = await withTimeout(
            run.start({
              inputData: {
                contentId,
                userId,
                prompt: prompt ?? "",
                platform: platform ?? "generic",
                aspectRatio,
                sceneCount,
                language,
                avatarId,
                templateId: payload.templateId,
                templateInputs: payload.templateInputs,
                ...templateOverrides,
              },
            }),
            WORKFLOW_TIMEOUT,
          );
        }
        break;
      }

      case "slide": {
        let slideCount = payload.slideCount ?? 3;
        if (payload.templateId === "listicle") {
          slideCount = (payload.templateInputs?.itemCount as number) ?? 5;
        }

        const workflow = mastra.getWorkflow("generateContentWorkflow");
        const run = await workflow.createRunAsync();
        result = await withTimeout(
          run.start({
            inputData: {
              contentId,
              userId,
              contentType: "slide" as const,
              platform: platform ?? "generic",
              prompt: prompt ?? "",
              language,
              avatarId,
              aspectRatio,
              slideCount,
              templateId: payload.templateId,
              templateInputs: payload.templateInputs,
              ...templateOverrides,
            },
          }),
          WORKFLOW_TIMEOUT,
        );
        break;
      }

      case "text": {
        const workflow = mastra.getWorkflow("generateContentWorkflow");
        const run = await workflow.createRunAsync();
        result = await withTimeout(
          run.start({
            inputData: {
              contentId,
              userId,
              contentType: "text" as const,
              platform: platform ?? "generic",
              prompt: prompt ?? "",
              language,
              avatarId,
              aspectRatio,
              templateId: payload.templateId,
              templateInputs: payload.templateInputs,
              ...templateOverrides,
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