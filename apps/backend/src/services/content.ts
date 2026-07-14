import { db } from "../db/index.js";
import { contents, contentVersions, generationJobs } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { enqueueContentGeneration } from "../queues/content-generation.js";

export class ContentService {
  async createContent(
    userId: string,
    projectId: string,
    data: {
      type: "image" | "slide" | "video" | "text";
      platform: string;
      aspectRatio: string;
      language: string;
      prompt: string;
      title?: string;
      avatarId?: string;
    },
  ) {
    const [content] = await db
      .insert(contents)
      .values({
        projectId,
        userId,
        avatarId: data.avatarId ?? null,
        type: data.type,
        platform: data.platform as any,
        aspectRatio: data.aspectRatio,
        language: data.language,
        prompt: data.prompt,
        title: data.title,
        status: "queued",
      })
      .returning();

    const [job] = await db
      .insert(generationJobs)
      .values({
        contentId: content.id,
        userId,
        jobType: "content-generation",
        status: "pending",
      })
      .returning();

    await enqueueContentGeneration({
      jobId: job.id,
      contentId: content.id,
      userId,
      contentType: data.type,
      platform: data.platform,
      aspectRatio: data.aspectRatio,
      language: data.language,
      prompt: data.prompt,
      avatarId: data.avatarId,
    });

    return { content, job };
  }

  async getContent(userId: string, id: string) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.id, id), eq(contents.userId, userId)))
      .limit(1);

    if (!content) throw new Error("Content not found");

    const versions = await db
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.contentId, id))
      .orderBy(desc(contentVersions.versionNumber));

    const [latestJob] = await db
      .select({ id: generationJobs.id })
      .from(generationJobs)
      .where(eq(generationJobs.contentId, id))
      .orderBy(desc(generationJobs.createdAt))
      .limit(1);

    return { ...content, versions, latestJobId: latestJob?.id ?? null };
  }

  async listVersions(userId: string, contentId: string) {
    return db
      .select()
      .from(contentVersions)
      .innerJoin(contents, eq(contentVersions.contentId, contents.id))
      .where(
        and(
          eq(contents.userId, userId),
          eq(contentVersions.contentId, contentId),
        ),
      )
      .orderBy(desc(contentVersions.versionNumber));
  }

  async regenerateContent(userId: string, contentId: string) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.id, contentId), eq(contents.userId, userId)))
      .limit(1);

    if (!content) throw new Error("Content not found");

    const [job] = await db
      .insert(generationJobs)
      .values({
        contentId,
        userId,
        jobType: "content-generation",
        status: "pending",
      })
      .returning();

    await enqueueContentGeneration({
      jobId: job.id,
      contentId,
      userId,
      contentType: content.type,
      platform: content.platform,
      aspectRatio: content.aspectRatio ?? undefined,
      language: content.language,
      prompt: content.prompt,
      avatarId: content.avatarId ?? undefined,
    });

    return { job };
  }

  async duplicateContent(
    userId: string,
    contentId: string,
    newLanguage: string,
  ) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.id, contentId), eq(contents.userId, userId)))
      .limit(1);

    if (!content) throw new Error("Content not found");

    return this.createContent(userId, content.projectId, {
      type: content.type,
      platform: content.platform,
      aspectRatio: content.aspectRatio ?? "16:9",
      language: newLanguage,
      prompt: content.prompt,
      title: content.title ? `${content.title} (${newLanguage})` : undefined,
      avatarId: content.avatarId ?? undefined,
    });
  }
}
