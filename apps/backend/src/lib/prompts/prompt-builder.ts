import type {
  PromptContext,
  EnhancedPrompt,
  Platform,
  ContentType,
} from "./types.js";
import { buildAvatarContext, renderAvatarForVisual, renderNoAvatarGuidance } from "./avatar-injector.js";
import { getNegativePrompt } from "./negative-prompts.js";
import { PLATFORM_STRATEGIES } from "./platform-strategies.js";
import { renderCameraDirection, cameraDirectionForScene } from "./camera-dsl.js";
import { db } from "../../db/index.js";
import { contents } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export async function buildPromptContext(
  contentId: string,
  userPrompt: string,
  platform: Platform,
  contentType: ContentType,
  language: string,
  aspectRatio: string,
  sceneIndex?: number,
  totalScenes?: number,
): Promise<PromptContext> {
  const [content] = await db
    .select({ avatarId: contents.avatarId })
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  const context: PromptContext = {
    userPrompt,
    contentType,
    platform,
    aspectRatio,
    language,
    sceneIndex,
    totalScenes,
  };

  if (content?.avatarId) {
    context.avatar = await buildAvatarContext(content.avatarId);
  }

  return context;
}

export function assembleFinalPrompt(
  enhanced: EnhancedPrompt,
  context: PromptContext,
): string {
  const parts: string[] = [enhanced.visualPrompt];

  const cameraText = renderCameraDirection(enhanced.cameraDirection);
  parts.push(cameraText);

  if (enhanced.qualityTags.length > 0) {
    parts.push(enhanced.qualityTags.join(", "));
  }

  const platformStrategy = PLATFORM_STRATEGIES[context.platform];

  if (context.avatar) {
    const avatarVisual = renderAvatarForVisual(context.avatar);
    parts.push(avatarVisual);
  } else {
    parts.push(renderNoAvatarGuidance());
  }

  parts.push(platformStrategy.compositionGuidance);

  let prompt = parts.join(", ");

  const negativeText = getNegativePrompt(context.platform);
  if (negativeText) {
    prompt += ` --neg ${negativeText}`;
  }

  return prompt;
}

export function assembleScenePrompt(
  enhanced: EnhancedPrompt,
  context: PromptContext,
  sceneIndex: number,
  totalScenes: number,
  previousScenePrompt?: string,
): string {
  const sceneParts: string[] = [enhanced.visualPrompt];

  const sceneContext = `Scene ${sceneIndex + 1} of ${totalScenes}`;
  sceneParts.push(sceneContext);

  const sceneCameraDefaults = cameraDirectionForScene(sceneIndex, totalScenes);
  const sceneCamera = {
    ...enhanced.cameraDirection,
    ...sceneCameraDefaults,
  };
  const cameraText = renderCameraDirection(sceneCamera);
  sceneParts.push(cameraText);

  if (enhanced.qualityTags.length > 0) {
    sceneParts.push(enhanced.qualityTags.join(", "));
  }

  const platformStrategy = PLATFORM_STRATEGIES[context.platform];

  if (context.avatar) {
    const avatarVisual = renderAvatarForVisual(context.avatar);
    sceneParts.push(avatarVisual);
  } else {
    sceneParts.push(renderNoAvatarGuidance());
  }

  if (previousScenePrompt) {
    sceneParts.push(
      `maintain visual continuity with previous scene: ${previousScenePrompt}`,
    );
  }

  sceneParts.push(platformStrategy.compositionGuidance);

  let prompt = sceneParts.join(", ");

  const negativeText = getNegativePrompt(context.platform);
  if (negativeText) {
    prompt += ` --neg ${negativeText}`;
  }

  return prompt;
}