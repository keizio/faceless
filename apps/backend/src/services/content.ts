import { db } from "../db/index.js";
import { contents, contentVersions, generationJobs, mediaAssets } from "../db/schema.js";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { enqueueContentGeneration } from "../queues/content-generation.js";
import { UsageService } from "./usage.js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
      slideCount?: number;
      templateId?: string;
      templateInputs?: Record<string, unknown>;
    },
  ) {
    const usageService = new UsageService();
    const limit = await usageService.checkGenerationLimit(userId);
    if (!limit.allowed) {
      throw new Error(`Daily generation limit reached. You have used ${limit.limit} out of ${limit.limit} generations. Upgrade to pro for more.`);
    }
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
        templateId: data.templateId ?? null,
        templateInputs: data.templateInputs ?? null,
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
      slideCount: data.slideCount,
      templateId: data.templateId,
      templateInputs: data.templateInputs,
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

    const media = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.contentId, id))
      .orderBy(mediaAssets.createdAt);

    return { ...content, versions, media, latestJobId: latestJob?.id ?? null };
  }

  async listAllContents(userId: string, limit = 50, offset = 0) {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(contents)
      .where(eq(contents.userId, userId));

    const total = totalResult?.count ?? 0;

    const allContents = await db
      .select()
      .from(contents)
      .where(eq(contents.userId, userId))
      .orderBy(desc(contents.createdAt))
      .limit(limit)
      .offset(offset);

    const contentIds = allContents.map((c) => c.id);
    const mediaByContent = new Map<string, { url: string; type: string }>();
    if (contentIds.length > 0) {
      const allMedia = await db
        .select()
        .from(mediaAssets)
        .where(inArray(mediaAssets.contentId, contentIds))
        .orderBy(mediaAssets.createdAt);
      for (const m of allMedia) {
        if (m.contentId && !mediaByContent.has(m.contentId) && (m.type === "image" || m.type === "video")) {
          mediaByContent.set(m.contentId, { url: m.url, type: m.type });
        }
      }
    }

    return {
      contents: allContents.map((c) => ({
        ...c,
        thumbnailUrl: mediaByContent.get(c.id)?.url ?? null,
      })),
      total,
    };
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

    const slideCount =
      content.templateId === "listicle"
        ? ((content.templateInputs as Record<string, unknown> | null)?.itemCount as number) ?? undefined
        : undefined;

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
      slideCount,
      templateId: content.templateId ?? undefined,
      templateInputs: content.templateInputs ?? undefined,
    });

    return { job };
  }

  async deleteContent(userId: string, contentId: string) {
    const [content] = await db
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.id, contentId), eq(contents.userId, userId)))
      .limit(1);

    if (!content) throw new Error("Content not found");

    const assets = await db
      .select({ url: mediaAssets.url })
      .from(mediaAssets)
      .where(eq(mediaAssets.contentId, contentId));

    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });

    const cdnBase = process.env.R2_PUBLIC_URL || "https://cdn.solutip.com";
    for (const asset of assets) {
      const key = asset.url.replace(`${cdnBase}/`, "");
      if (key && key !== asset.url) {
        try {
          await r2Client.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || "faceless-media",
            Key: key,
          }));
        } catch {
          // Non-critical; proceed with DB cleanup
        }
      }
    }

    await db.delete(contents).where(eq(contents.id, contentId));
  }

  async getVersionDownloadUrl(userId: string, contentId: string, versionId: string): Promise<string | null> {
    const [version] = await db
      .select({ outputUrl: contentVersions.outputUrl })
      .from(contentVersions)
      .innerJoin(contents, eq(contentVersions.contentId, contents.id))
      .where(
        and(
          eq(contents.userId, userId),
          eq(contentVersions.contentId, contentId),
          eq(contentVersions.id, versionId),
        ),
      )
      .limit(1);

    return version?.outputUrl ?? null;
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

    const slideCount =
      content.templateId === "listicle"
        ? ((content.templateInputs as Record<string, unknown> | null)?.itemCount as number) ?? undefined
        : undefined;

    return this.createContent(userId, content.projectId, {
      type: content.type,
      platform: content.platform,
      aspectRatio: content.aspectRatio ?? "16:9",
      language: newLanguage,
      prompt: content.prompt,
      title: content.title ? `${content.title} (${newLanguage})` : undefined,
      avatarId: content.avatarId ?? undefined,
      slideCount,
      templateId: content.templateId ?? undefined,
      templateInputs: content.templateInputs ?? undefined,
    });
  }
}
