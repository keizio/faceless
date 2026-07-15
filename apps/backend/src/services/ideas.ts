import { db } from "../db/index";
import { ideas } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { cacheGet, cacheSet } from "../lib/cache";
import { mastra } from "../mastra/index";
import type { Idea } from "@faceless/shared";

const CACHE_NAMESPACE = "ideas";
const MAX_RETRIES = 2;

function todayDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export async function getIdeas(language: string, date?: string): Promise<Idea[]> {
  const targetDate = date ?? todayDate();

  const cached = await cacheGet<Idea[]>(CACHE_NAMESPACE, language, targetDate);
  if (cached) return cached;

  const rows = await db
    .select()
    .from(ideas)
    .where(and(eq(ideas.language, language), eq(ideas.date, targetDate)))
    .orderBy(ideas.createdAt);

  const result = rows.map((row) => ({
    id: row.id,
    language: row.language,
    date: row.date,
    topic: row.topic,
    description: row.description,
    hashtags: (row.hashtags ?? []) as string[],
    contentType: row.contentType as Idea["contentType"],
    platform: row.platform as Idea["platform"],
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  }));

  await cacheSet<Idea[]>(CACHE_NAMESPACE, result, 86_400, language, targetDate);
  return result;
}

interface RawTrendItem {
  topic: string;
  description: string;
  hashtags: string[];
  contentType: string;
  platform: string;
  sourceUrl: string;
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

async function generateIdeasViaAgent(language: string): Promise<RawTrendItem[]> {
  const agent = mastra.getAgent("ideaGenerator");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await agent.generate(
        `Generate 15 trending social media content ideas for the language: "${language}". 
Research current trending topics, viral content, and popular hashtags in this language/region.
Make sure all ideas are relevant to this language and its cultural context.
Return ONLY valid JSON array — no markdown, no code fences, no explanation.`,
      );

      const text = (response as { text: string }).text;

      if (!text) {
        console.warn(`[ideas] Agent returned empty response for language "${language}" (attempt ${attempt + 1})`);
        continue;
      }

      const jsonStr = extractJson(text);
      const parsed = JSON.parse(jsonStr) as RawTrendItem[];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.warn(`[ideas] Agent returned empty array for language "${language}" (attempt ${attempt + 1})`);
        continue;
      }

      return parsed.slice(0, 15).map((item) => ({
        topic: item.topic ?? "",
        description: (item.description ?? "").slice(0, 300),
        hashtags: Array.isArray(item.hashtags) ? item.hashtags.slice(0, 8) : [],
        contentType: ["image", "slide", "video", "text"].includes(item.contentType) ? item.contentType : "image",
        platform: ["tiktok", "instagram", "facebook", "twitter", "generic"].includes(item.platform) ? item.platform : "generic",
        sourceUrl: item.sourceUrl ?? "",
      }));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ideas] Agent generation failed for language "${language}" (attempt ${attempt + 1}): ${errMsg}`);
      if (attempt === MAX_RETRIES) throw new Error(`Failed to generate ideas via agent after retries: ${errMsg}`);
    }
  }

  return [];
}

export async function generateIdeasForLanguage(language: string): Promise<void> {
  const targetDate = todayDate();

  const existing = await db
    .select({ id: ideas.id })
    .from(ideas)
    .where(and(eq(ideas.language, language), eq(ideas.date, targetDate)))
    .limit(1);

  if (existing.length > 0) return;

  const items = await generateIdeasViaAgent(language);

  if (items.length === 0) return;

  const values = items.map((item) => ({
    language,
    date: targetDate,
    topic: item.topic,
    description: item.description,
    hashtags: item.hashtags,
    contentType: item.contentType,
    platform: item.platform,
    sourceUrl: item.sourceUrl,
  }));

  await db.insert(ideas).values(values);
}

export async function generateAllIdeas(): Promise<{ languages: string[]; count: number }> {
  const rows = await db
    .select({ language: ideas.language })
    .from(ideas)
    .groupBy(ideas.language);

  const distinctLanguages = rows.map((r) => r.language);
  const userLanguages = await db.execute<{ language: string }>(
    sql`SELECT DISTINCT language FROM users`,
  );
  const languages = [
    ...new Set([
      ...(userLanguages.rows?.map((r) => r.language) ?? []),
      ...distinctLanguages,
      "en",
    ]),
  ];

  let total = 0;
  for (const lang of languages) {
    await generateIdeasForLanguage(lang);
    total++;
  }

  return { languages, count: total };
}