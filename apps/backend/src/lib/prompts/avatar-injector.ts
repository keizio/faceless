import { db } from "../../db/index.js";
import { avatars } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type { AvatarContext } from "./types.js";

export async function buildAvatarContext(
  avatarId: string,
): Promise<AvatarContext> {
  const [avatar] = await db
    .select()
    .from(avatars)
    .where(eq(avatars.id, avatarId))
    .limit(1);

  if (!avatar) {
    throw new Error(`Avatar not found: ${avatarId}`);
  }

  const characterSheet = (avatar.metadata as Record<string, unknown>)
    ?.characterSheet as string | undefined;

  return {
    id: avatar.id,
    name: avatar.name,
    age: avatar.age,
    gender: avatar.gender,
    speechStyle: avatar.speechStyle as AvatarContext["speechStyle"],
    referenceImageUrl: avatar.referenceImageUrl,
    characterSheet: characterSheet ?? null,
  };
}

export function renderAvatarForVisual(avatar: AvatarContext): string {
  const parts: string[] = [];

  if (avatar.characterSheet) {
    parts.push(avatar.characterSheet);
  } else {
    if (avatar.gender) {
      parts.push(avatar.gender.toLowerCase());
    }
    if (avatar.age) {
      parts.push(`${avatar.age}-year-old`);
    }
    parts.push(`character named ${avatar.name}`);
  }

  parts.push("consistent appearance across all scenes");

  const style = avatar.speechStyle;
  if (style) {
    const styleDescriptors: Record<string, string> = {
      formal: "professional attire, composed posture",
      casual: "relaxed casual clothing, natural demeanor",
      humorous: "expressive, playful energy",
      professional: "business attire, confident stance",
      friendly: "warm smile, approachable presence",
      persuasive: "confident body language, engaging eye contact",
      inspirational: "motivated expression, dynamic presence",
      educational: "knowledgeable demeanor, clear communication style",
    };
    if (styleDescriptors[style]) {
      parts.push(styleDescriptors[style]);
    }
  }

  return parts.join(", ");
}

export function renderAvatarForText(avatar: AvatarContext): string {
  const parts: string[] = [];

  parts.push(`Character: ${avatar.name}`);

  if (avatar.age) {
    parts.push(`Age: ${avatar.age}`);
  }

  if (avatar.gender) {
    parts.push(`Gender: ${avatar.gender}`);
  }

  if (avatar.speechStyle) {
    const styleLabels: Record<string, string> = {
      formal: "Formal and articulate",
      casual: "Casual and relatable",
      humorous: "Funny and witty",
      professional: "Professional and authoritative",
      friendly: "Warm and approachable",
      persuasive: "Persuasive and compelling",
      inspirational: "Inspirational and motivating",
      educational: "Educational and clear",
    };
    const styleLabel = styleLabels[avatar.speechStyle] ?? avatar.speechStyle;
    parts.push(`Speaking style: ${styleLabel}`);
  }

  if (avatar.characterSheet) {
    parts.push(`Personality: ${avatar.characterSheet}`);
  }

  return parts.join("\n");
}

export function renderNoAvatarGuidance(): string {
  return "faceless style, no human figures or faces visible, focus on environment, objects, typography, and abstract visuals only";
}