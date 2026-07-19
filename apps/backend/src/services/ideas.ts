import { db } from "../db/index";
import { ideas } from "../db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { mastra } from "../mastra/index";
import { UsageService } from "./usage";
import { CreditTransactionService } from "./credit-transaction";
import { CREDIT_COSTS } from "@faceless/shared";
import type { Idea, IdeaItem } from "@faceless/shared";

const usageService = new UsageService();

const MAX_RETRIES = 2;

interface RawIdeaItem {
  topic: string;
  description: string;
  hashtags: string[];
  contentType: string;
  platform: string;
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const bracketStart = text.indexOf("[");
  const bracketEnd = text.lastIndexOf("]");
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    return text.slice(bracketStart, bracketEnd + 1);
  }
  return text.trim();
}

function parseIdeaItems(text: string): RawIdeaItem[] {
  const jsonStr = extractJson(text);
  const parsed = JSON.parse(jsonStr) as RawIdeaItem[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Agent returned empty or invalid array");
  }
  return parsed;
}

function validateIdeaItem(item: RawIdeaItem): IdeaItem {
  return {
    topic: item.topic ?? "",
    description: (item.description ?? "").slice(0, 300),
    hashtags: Array.isArray(item.hashtags) ? item.hashtags.slice(0, 8) : [],
    contentType: ["image", "slide", "video", "text"].includes(item.contentType)
      ? (item.contentType as IdeaItem["contentType"])
      : "image",
    platform: ["tiktok", "instagram", "facebook", "twitter", "generic"].includes(item.platform)
      ? (item.platform as IdeaItem["platform"])
      : "generic",
  };
}

async function generateIdeasViaAgent(prompt: string, language: string): Promise<IdeaItem[]> {
  const agent = mastra.getAgent("ideaGenerator");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await agent.generate(
        `Generate 10 content ideas for niche: "${prompt}" in language: "${language}".
Make sure all ideas are relevant to this niche and language.
Return ONLY valid JSON array — no markdown, no code fences, no explanation.`,
      );

      const text = (response as { text: string }).text;

      if (!text) {
        console.warn(`[ideas] Agent returned empty response (attempt ${attempt + 1})`);
        continue;
      }

      const parsed = parseIdeaItems(text);
      return parsed.slice(0, 10).map(validateIdeaItem);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ideas] Agent generation failed (attempt ${attempt + 1}): ${errMsg}`);
      if (attempt === MAX_RETRIES) throw new Error(`Failed to generate ideas: ${errMsg}`);
    }
  }

  throw new Error("Failed to generate ideas after retries");
}

export async function getUserIdeas(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<{ ideas: Idea[]; total: number }> {
  const clampedLimit = Math.min(Math.max(limit, 1), 50);

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(ideas)
      .where(eq(ideas.userId, userId))
      .orderBy(desc(ideas.createdAt))
      .limit(clampedLimit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(ideas)
      .where(eq(ideas.userId, userId)),
  ]);

  return {
    ideas: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      prompt: row.prompt,
      language: row.language,
      ideas: (row.ideas ?? []) as IdeaItem[],
      createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
    total: totalResult[0]?.count ?? 0,
  };
}

export async function generateIdeas(
  userId: string,
  prompt: string,
  language: string,
): Promise<Idea> {
  const cost = CREDIT_COSTS.idea;

  const { allowed } = await usageService.checkGenerationLimit(userId, cost);
  if (!allowed) {
    throw new Error("Insufficient credits");
  }

  const items = await generateIdeasViaAgent(prompt, language);

  const [row] = await db
    .insert(ideas)
    .values({
      userId,
      prompt,
      language,
      ideas: items,
    })
    .returning();

  await usageService.deductCredits(userId, cost);

  const creditTransactionService = new CreditTransactionService();
  await creditTransactionService.logTransaction(userId, {
    type: "deduction",
    amount: -cost,
    reason: "idea_generation",
    referenceId: row.id,
  });

  return {
    id: row.id,
    userId: row.userId,
    prompt: row.prompt,
    language: row.language,
    ideas: (row.ideas ?? []) as IdeaItem[],
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}