import { db } from "../db/index";
import { mediaAssets } from "../db/schema";
import { eq } from "drizzle-orm";

interface InsertMediaAssetParams {
  userId: string;
  contentId: string | null;
  type: string;
  url: string;
  provider: string | null;
  metadata: Record<string, unknown>;
}

export async function insertMediaAsset(params: InsertMediaAssetParams): Promise<void> {
  const existing = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(eq(mediaAssets.url, params.url))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(mediaAssets).values({
    userId: params.userId,
    contentId: params.contentId,
    type: params.type,
    url: params.url,
    provider: params.provider,
    metadata: params.metadata,
  });
}