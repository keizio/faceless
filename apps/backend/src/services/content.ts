import { db } from "../db/index.js";
import { contents, contentVersions, generationJobs, mediaAssets } from "../db/schema.js";
import { eq, and, inArray, desc, sql, isNull } from "drizzle-orm";
import { enqueueContentGeneration } from "../queues/content-generation.js";
import { CREDIT_COSTS, TEMPLATE_MULTIPLIERS } from "@faceless/shared";
import { UsageService } from "./usage.js";
import { CreditTransactionService } from "./credit-transaction.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, uploadFile, randomFilename } from "../lib/storage.js";
import { getProviders } from "../lib/providers/factory.js";
import { getEffectiveSlideCount } from "../lib/utils/content.js";

export class ContentService {
  async createContent(
    userId: string,
    projectId: string | null,
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
    const baseCost = CREDIT_COSTS[data.type];

    let templateSurcharge = 0;
    if (data.templateId) {
      const multiplier = TEMPLATE_MULTIPLIERS[data.templateId] ?? TEMPLATE_MULTIPLIERS['*'];
      if (multiplier > 1.0) {
        templateSurcharge = Math.ceil(baseCost * (multiplier - 1.0));
      }
    }

    const cost = baseCost + templateSurcharge;
    const limit = await usageService.checkGenerationLimit(userId, cost);
    if (!limit.allowed) {
      throw new Error(`Insufficient credits. You need ${cost} credits but have ${limit.credits}.`);
    }
    const [content] = await db
      .insert(contents)
      .values({
        projectId: projectId ?? undefined,
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
      } as any)
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

    await usageService.deductCredits(userId, cost);

    const creditTransactionService = new CreditTransactionService();
    await creditTransactionService.logTransaction(userId, {
      type: "deduction",
      amount: -cost,
      reason: "content_generation",
      referenceId: content.id,
      metadata: {
        baseCost,
        templateId: data.templateId,
        templateSurcharge,
        contentType: data.type,
      },
    });

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
      cost,
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

  async listAllContents(userId: string, limit = 50, offset = 0, projectId?: string | null) {
    const conditions = [eq(contents.userId, userId)];
    if (projectId === null) {
      conditions.push(isNull(contents.projectId));
    } else if (projectId !== undefined) {
      conditions.push(eq(contents.projectId, projectId));
    }
    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(contents)
      .where(whereClause);

    const total = totalResult?.count ?? 0;

    const allContents = await db
      .select()
      .from(contents)
      .where(whereClause)
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

    const usageService = new UsageService();
    const baseCost = CREDIT_COSTS[content.type];

    let templateSurcharge = 0;
    if (content.templateId) {
      const multiplier = TEMPLATE_MULTIPLIERS[content.templateId] ?? TEMPLATE_MULTIPLIERS['*'];
      if (multiplier > 1.0) {
        templateSurcharge = Math.ceil(baseCost * (multiplier - 1.0));
      }
    }

    const cost = baseCost + templateSurcharge;
    const limit = await usageService.checkGenerationLimit(userId, cost);
    if (!limit.allowed) {
      throw new Error(`Insufficient credits. You need ${cost} credits but have ${limit.credits}.`);
    }

    await usageService.deductCredits(userId, cost);

    const creditTransactionService = new CreditTransactionService();
    await creditTransactionService.logTransaction(userId, {
      type: "deduction",
      amount: -cost,
      reason: "content_generation",
      referenceId: contentId,
      metadata: {
        baseCost,
        templateId: content.templateId,
        templateSurcharge,
        contentType: content.type,
        reason: "regenerate",
      },
    });

    const [job] = await db
      .insert(generationJobs)
      .values({
        contentId,
        userId,
        jobType: "content-generation",
        status: "pending",
      })
      .returning();

    const slideCount = getEffectiveSlideCount(content.templateId, content.templateInputs as Record<string, unknown> | null);

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
      cost,
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

    const r2Client = getR2Client();

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

    await db.delete(mediaAssets).where(eq(mediaAssets.contentId, contentId));
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

  async saveTextLayers(userId: string, contentId: string, versionId: string, textLayers: Record<string, unknown[]>, shapeLayers?: Record<string, unknown[]>) {
    const [content] = await db
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.id, contentId), eq(contents.userId, userId)))
      .limit(1);

    if (!content) throw new Error("Content not found");

    const [version] = await db
      .select({ id: contentVersions.id, metadata: contentVersions.metadata })
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

    if (!version) throw new Error("Version not found");

    const existingMetadata = (version.metadata as Record<string, unknown>) || {};
    const updatedMetadata: Record<string, unknown> = { ...existingMetadata, textLayers };
    if (shapeLayers) {
      updatedMetadata.shapeLayers = shapeLayers;
    }

    await db
      .update(contentVersions)
      .set({ metadata: updatedMetadata })
      .where(eq(contentVersions.id, versionId));

    return { textLayers, shapeLayers };
  }

  async getTextLayers(userId: string, contentId: string, versionId: string) {
    const [version] = await db
      .select({ metadata: contentVersions.metadata })
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

    if (!version) throw new Error("Version not found");

    const metadata = (version.metadata as Record<string, unknown>) || {};
    return { textLayers: metadata.textLayers ?? {}, shapeLayers: metadata.shapeLayers ?? {} };
  }

  async createEditorVersion(
    userId: string,
    contentId: string,
    imageUrls: string[],
    textLayers: Record<string, unknown[]>,
    shapeLayers?: Record<string, unknown[]>,
  ) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.id, contentId), eq(contents.userId, userId)))
      .limit(1);

    if (!content) throw new Error("Content not found");

    const [maxVersion] = await db
      .select({ versionNumber: contentVersions.versionNumber })
      .from(contentVersions)
      .where(eq(contentVersions.contentId, contentId))
      .orderBy(desc(contentVersions.versionNumber))
      .limit(1);

    const nextVersionNumber = (maxVersion?.versionNumber ?? 0) + 1;

    const metadata: Record<string, unknown> = { textLayers };
    if (shapeLayers) {
      metadata.shapeLayers = shapeLayers;
    }

    const [newVersion] = await db
      .insert(contentVersions)
      .values({
        contentId,
        versionNumber: nextVersionNumber,
        outputUrl: imageUrls[0],
        thumbnailUrl: imageUrls[0],
        metadata,
      })
      .returning();

    for (const url of imageUrls) {
      await db.insert(mediaAssets).values({
        userId,
        contentId,
        type: "image",
        url,
        metadata: { source: "editor-export" },
      });
    }

    return { version: newVersion };
  }

  async inpaintImage(userId: string, contentId: string, imageUrl: string, maskDataUrl: string) {
    const [content] = await db
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.id, contentId), eq(contents.userId, userId)))
      .limit(1);
    if (!content) throw new Error("Content not found");

    const maskMatch = maskDataUrl.match(/^data:image\/png;base64,(.+)$/);
    if (!maskMatch) throw new Error("Invalid mask data URL format");
    const maskBuffer = Buffer.from(maskMatch[1], "base64");
    const maskUrl = await uploadFile(maskBuffer, randomFilename("png"), "image/png");

    const provider = getProviders().image;
    if (!provider.inpaint) throw new Error("Inpainting not supported by current provider");

    const resultUrl = await provider.inpaint(imageUrl, maskUrl);
    return { url: resultUrl };
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

    const slideCount = getEffectiveSlideCount(content.templateId, content.templateInputs as Record<string, unknown> | null);

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
