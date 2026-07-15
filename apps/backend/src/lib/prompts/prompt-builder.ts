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

const ASPECT_LABELS: Record<string, string> = {
  "9:16": "9:16 (vertical portrait)",
  "16:9": "16:9 (widescreen landscape)",
  "1:1": "1:1 (square)",
  "4:5": "4:5 (portrait)",
};

export function assembleFinalPrompt(
  enhanced: EnhancedPrompt,
  context: PromptContext,
  isStillImage?: boolean,
): string {
  const sections: string[] = [];

  sections.push(`Visual description: ${enhanced.visualPrompt}`);

  const camera = { ...enhanced.cameraDirection };
  if (isStillImage) {
    delete camera.movement;
  }
  const cameraText = renderCameraDirection(camera);
  sections.push(`Camera: ${cameraText}`);

  if (enhanced.qualityTags.length > 0) {
    sections.push(`Quality: ${enhanced.qualityTags.join(", ")}`);
  }

  const platformStrategy = PLATFORM_STRATEGIES[context.platform];

  if (context.avatar) {
    const avatarVisual = renderAvatarForVisual(context.avatar);
    sections.push(`Character: ${avatarVisual}`);
  } else {
    sections.push(renderNoAvatarGuidance());
  }

  sections.push(`Composition: ${platformStrategy.compositionGuidance}`);

  const aspectLabel = ASPECT_LABELS[context.aspectRatio] ?? context.aspectRatio;
  sections.push(`Aspect ratio: ${aspectLabel}`);

  return sections.join("\n\n");
}

export function assembleScenePrompt(
  enhanced: EnhancedPrompt,
  context: PromptContext,
  sceneIndex: number,
  totalScenes: number,
  previousScenePrompt?: string,
  isStillImage?: boolean,
): string {
  const sections: string[] = [];

  sections.push(`Visual description: ${enhanced.visualPrompt}`);

  const sceneCameraDefaults = cameraDirectionForScene(sceneIndex, totalScenes);
  const sceneCamera = {
    ...enhanced.cameraDirection,
    ...sceneCameraDefaults,
  };
  if (isStillImage) {
    delete sceneCamera.movement;
  }
  const cameraText = renderCameraDirection(sceneCamera);
  sections.push(`Camera: ${cameraText}`);

  if (enhanced.qualityTags.length > 0) {
    sections.push(`Quality: ${enhanced.qualityTags.join(", ")}`);
  }

  const platformStrategy = PLATFORM_STRATEGIES[context.platform];

  if (context.avatar) {
    const avatarVisual = renderAvatarForVisual(context.avatar);
    sections.push(`Character: ${avatarVisual}`);
  } else {
    sections.push(renderNoAvatarGuidance());
  }

  if (previousScenePrompt) {
    sections.push(
      `Previous scene: ${previousScenePrompt}`,
    );
  }

  sections.push(`Composition: ${platformStrategy.compositionGuidance}`);

  const aspectLabel = ASPECT_LABELS[context.aspectRatio] ?? context.aspectRatio;
  sections.push(`Aspect ratio: ${aspectLabel}`);

  return sections.join("\n\n");
}