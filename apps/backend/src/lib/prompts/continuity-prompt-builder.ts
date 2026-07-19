import type { Platform, CameraDirection, ArtStyle } from "./types.js";
import type { SceneSummary, StoryBible } from "./story-bible.js";
import { renderCameraDirection } from "./camera-dsl.js";
import { renderAvatarForVisual, renderNoAvatarGuidance } from "./avatar-injector.js";
import { PLATFORM_STRATEGIES } from "./platform-strategies.js";
import { getArtStyleModifier } from "./art-style-detector.js";

const ASPECT_LABELS: Record<string, string> = {
  "9:16": "9:16 (vertical portrait)",
  "16:9": "16:9 (widescreen landscape)",
  "1:1": "1:1 (square)",
  "4:5": "4:5 (portrait)",
};

function getNarrativePosition(sceneIndex: number, totalScenes: number): string {
  if (totalScenes <= 1) return "single scene";
  if (sceneIndex === 0) return "opening scene — establish setting and hook the viewer";
  if (sceneIndex === totalScenes - 1) return "concluding scene — provide resolution and strong closing visual";
  return "middle scene — advance the narrative from the previous beat";
}

function buildTransitionGuidance(sceneIndex: number, totalScenes: number, previousSceneSummary?: SceneSummary): string {
  if (totalScenes <= 1) return "";

  const parts: string[] = [];

  if (sceneIndex === 0) {
    parts.push("This is the opening scene. Establish the world, setting, and mood. Hook the viewer immediately with a compelling visual.");
  } else if (sceneIndex === totalScenes - 1) {
    parts.push("This is the final scene. Provide a satisfying visual conclusion. Resolve the narrative arc.");
  } else {
    parts.push("This scene continues the story from the previous scene. Advance the narrative with new visual information.");
  }

  if (previousSceneSummary) {
    parts.push(
      `The previous scene had this mood: ${previousSceneSummary.mood}. ` +
      `This scene should transition naturally. If the mood changes, signal it through lighting and color changes.`,
    );
  }

  return parts.join(" ");
}

function buildNegativeConstraints(
  previousSceneSummaries: SceneSummary[],
  storyBible: StoryBible,
): string {
  if (previousSceneSummaries.length === 0) return "";

  const previousElements = previousSceneSummaries.map((s) => {
    const parts: string[] = [];
    if (s.setting) parts.push(s.setting);
    if (s.action) parts.push(s.action);
    return parts.join(", ");
  });

  const uniqueElements = [...new Set(previousElements.filter(Boolean))];

  const constraints: string[] = [];
  constraints.push(`DO NOT repeat the same visual composition as earlier scenes.`);

  if (uniqueElements.length > 0) {
    constraints.push(`The following visual elements/scenes have already been shown. DO NOT reuse them: ${uniqueElements.join(" | ")}`);
  }

  if (storyBible.visualThread.recurringElements.length > 0) {
    constraints.push(`Recurring elements that CAN appear if they fit the scene: ${storyBible.visualThread.recurringElements.join(", ")}`);
  }

  return constraints.join("\n");
}

export function assembleContinuityPrompt(
  visualPrompt: string,
  storyBible: StoryBible,
  sceneIndex: number,
  totalScenes: number,
  previousSceneSummaries: SceneSummary[],
  cameraDirection: CameraDirection,
  qualityTags: string[],
  platform: Platform,
  aspectRatio: string,
  isStillImage: boolean,
  isFaceless: boolean,
  avatarVisual?: string,
  artStyle?: ArtStyle,
): string {
  const sections: string[] = [];

  sections.push(`Visual description: ${visualPrompt}`);

  const narrativePosition = getNarrativePosition(sceneIndex, totalScenes);
  sections.push(`Story context:\n  Topic: ${storyBible.topic}\n  Theme: ${storyBible.theme}\n  Narrative position: ${narrativePosition}`);

  if (previousSceneSummaries.length > 0) {
    const prevScenesText = previousSceneSummaries
      .map((s) => `  Scene ${s.index + 1}: ${s.narrativeBeat} — ${s.setting}, ${s.action}, mood: ${s.mood}`)
      .join("\n");
    sections.push(`Previous scenes:\n${prevScenesText}`);
  }

  const visualConsistencyParts: string[] = [];
  if (storyBible.visualThread.colorPalette) visualConsistencyParts.push(`Color palette: ${storyBible.visualThread.colorPalette}`);
  if (storyBible.visualThread.lightingStyle) visualConsistencyParts.push(`Lighting: ${storyBible.visualThread.lightingStyle}`);
  if (storyBible.visualThread.compositionStyle) visualConsistencyParts.push(`Composition: ${storyBible.visualThread.compositionStyle}`);
  if (storyBible.visualThread.recurringElements.length > 0) {
    visualConsistencyParts.push(`Recurring elements: ${storyBible.visualThread.recurringElements.join(", ")}`);
  }
  if (visualConsistencyParts.length > 0) {
    sections.push(`Visual consistency:\n  ${visualConsistencyParts.join("\n  ")}`);
  }

  const camera = { ...cameraDirection };
  if (isStillImage) {
    delete camera.movement;
  }
  const cameraText = renderCameraDirection(camera);
  sections.push(`Camera: ${cameraText}`);

  if (qualityTags.length > 0) {
    sections.push(`Quality: ${qualityTags.join(", ")}`);
  }

  const styleModifier = getArtStyleModifier(artStyle);
  if (styleModifier) {
    sections.push(`Art style: ${styleModifier}`);
  }

  if (isFaceless) {
    sections.push(`Character: ${renderNoAvatarGuidance()}`);
  } else if (avatarVisual) {
    sections.push(`Character: ${avatarVisual}`);
  }

  if (storyBible.characterDescription && !isFaceless) {
    sections.push(`Character consistency: ${storyBible.characterDescription}`);
  }

  if (storyBible.facelessGuidance && isFaceless) {
    sections.push(`Faceless guidance: ${storyBible.facelessGuidance}`);
  }

  const platformStrategy = PLATFORM_STRATEGIES[platform] ?? PLATFORM_STRATEGIES.generic;
  sections.push(`Composition: ${platformStrategy.compositionGuidance}`);

  const aspectLabel = ASPECT_LABELS[aspectRatio] ?? aspectRatio;
  sections.push(`Aspect ratio: ${aspectLabel}`);

  const transitionGuidance = buildTransitionGuidance(sceneIndex, totalScenes, previousSceneSummaries[previousSceneSummaries.length - 1]);
  if (transitionGuidance) {
    sections.push(`Transition guidance: ${transitionGuidance}`);
  }

  const negativeConstraints = buildNegativeConstraints(previousSceneSummaries, storyBible);
  if (negativeConstraints) {
    sections.push(`Negative constraints:\n${negativeConstraints}`);
  }

  return sections.join("\n\n");
}

export interface SlideStoryboardItem {
  slideIndex: number;
  title: string;
  description: string;
  visualDirection: string;
}

export function buildSlideStoryboardUserMessage(
  script: string,
  slideCount: number,
  platform: string,
  prompt: string,
): string {
  return `Split this script into ${slideCount} individual slides for a ${platform} carousel post.

Topic: ${prompt}

Script:
${script}

For each slide, provide:
1. "slideIndex": Slide number (0-based)
2. "title": A short title for this slide
3. "description": What this slide communicates (text/overlay content)
4. "visualDirection": Detailed visual description for AI image generation

CRITICAL RULES:
- Each slide must cover a DIFFERENT aspect of the topic — no repetition
- Slides must flow in a logical sequence (opening → middle slides → closing)
- Slide 0 should be the hook/attention grabber
- The final slide should be the conclusion or CTA
- Each visualDirection must be unique in setting, composition, and visual elements

Return ONLY valid JSON array — no markdown, no code fences, no explanation:
[
  {
    "slideIndex": 0,
    "title": string,
    "description": string,
    "visualDirection": string
  }
]`;
}

export function parseSlideStoryboardResponse(
  text: string,
  slideCount: number,
  fallbackVisualDirection: string,
): SlideStoryboardItem[] {
  try {
    const raw = text.trim();
    let jsonStr = raw;

    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      const bracketStart = raw.indexOf("[");
      if (bracketStart !== -1) {
        const bracketEnd = raw.lastIndexOf("]");
        if (bracketEnd > bracketStart) {
          jsonStr = raw.slice(bracketStart, bracketEnd + 1);
        }
      }
    }

    const parsed = JSON.parse(jsonStr) as SlideStoryboardItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return generateFallbackSlideStoryboard(slideCount, fallbackVisualDirection);
    }

    return parsed.slice(0, slideCount).map((item, i) => ({
      slideIndex: item.slideIndex ?? i,
      title: item.title || `Slide ${i + 1}`,
      description: item.description || "",
      visualDirection: item.visualDirection || fallbackVisualDirection,
    }));
  } catch {
    return generateFallbackSlideStoryboard(slideCount, fallbackVisualDirection);
  }
}

function generateFallbackSlideStoryboard(slideCount: number, visualDirection: string): SlideStoryboardItem[] {
  return Array.from({ length: slideCount }, (_, i) => ({
    slideIndex: i,
    title: `Slide ${i + 1}`,
    description: "",
    visualDirection,
  }));
}