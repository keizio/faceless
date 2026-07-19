export interface SceneSummary {
  index: number;
  narrativeBeat: string;
  setting: string;
  action: string;
  mood: string;
  shotType: string;
}

export interface VisualThread {
  colorPalette: string;
  lightingStyle: string;
  compositionStyle: string;
  recurringElements: string[];
  artStyle?: string;
}

export interface StoryBible {
  topic: string;
  theme: string;
  narrativeArc: string;
  totalScenes: number;
  sceneSummaries: SceneSummary[];
  visualThread: VisualThread;
  characterDescription: string;
  facelessGuidance: string;
}

export function buildStoryBibleUserMessage(
  script: string,
  prompt: string,
  sceneCount: number,
  platform: string,
  avatarContext: string,
  isFaceless: boolean,
): string {
  const modeInfo = isFaceless
    ? "Faceless mode: No human figures. Emphasize environmental storytelling, objects, typography, abstract visuals."
    : `Avatar present: ${avatarContext}`;

  return `Extract a structured Story Bible from this ${platform} script.

Topic: ${prompt}
Scene count: ${sceneCount}
${modeInfo}

Script:
${script}

Analyze the script and return a Story Bible JSON with these fields:

1. "topic": The original topic/prompt
2. "theme": The overall theme or message of the content
3. "narrativeArc": A brief summary of the story arc (beginning, middle, end)
4. "totalScenes": Number of scenes
5. "sceneSummaries": Array of objects, one per scene:
   - "index": Scene number (0-based)
   - "narrativeBeat": What happens narratively in this scene
   - "setting": Where and when the scene takes place
   - "action": What is visually happening
   - "mood": The emotional tone of the scene
   - "shotType": Camera perspective (e.g., close-up, wide-shot, establishing-shot)
6. "visualThread": Object with:
   - "colorPalette": Dominant colors that should carry across all scenes
   - "lightingStyle": Consistent lighting approach (e.g., warm golden hour, cool neon, soft diffused)
   - "compositionStyle": Framing approach (e.g., rule-of-thirds, center-frame, symmetry)
   - "recurringElements": Array of visual elements that appear in multiple scenes
   - "artStyle": The overall visual art style of the content (e.g., "anime", "cinematic", "comic", "realistic", "watercolor", "pixel-art", "3d-render", "cyberpunk", "vintage", "abstract", "chibi", "minimalist", "cartoon") — detect from the script's visual descriptions
7. "characterDescription": ${isFaceless ? '"" (no characters)' : "Consistent description of the avatar character across all scenes, including appearance, clothing, and demeanor"}
8. "facelessGuidance": ${isFaceless ? '"Guidance for faceless content: no human figures, focus on environment, objects, typography, and abstract visuals. Tell the story through setting and composition."' : '"" (character is present)'}

CRITICAL: Each sceneSummary must be DISTINCT from others. No two scenes should describe the same setting, action, or narrative beat. The story must PROGRESS from scene to scene.

Return ONLY valid JSON — no markdown, no code fences, no explanation.`;
}

export function parseStoryBibleResponse(
  text: string,
  fallback: { topic: string; totalScenes: number },
): StoryBible {
  try {
    const parsed = JSON.parse(text) as StoryBible;
    return {
      topic: parsed.topic || fallback.topic,
      theme: parsed.theme || "",
      narrativeArc: parsed.narrativeArc || "",
      totalScenes: parsed.totalScenes || fallback.totalScenes,
      sceneSummaries: Array.isArray(parsed.sceneSummaries) ? parsed.sceneSummaries : [],
      visualThread: {
        colorPalette: parsed.visualThread?.colorPalette || "",
        lightingStyle: parsed.visualThread?.lightingStyle || "",
        compositionStyle: parsed.visualThread?.compositionStyle || "",
        recurringElements: Array.isArray(parsed.visualThread?.recurringElements) ? parsed.visualThread.recurringElements : [],
        artStyle: parsed.visualThread?.artStyle || undefined,
      },
      characterDescription: parsed.characterDescription || "",
      facelessGuidance: parsed.facelessGuidance || "",
    };
  } catch {
    return {
      topic: fallback.topic,
      theme: "",
      narrativeArc: "",
      totalScenes: fallback.totalScenes,
      sceneSummaries: [],
      visualThread: { colorPalette: "", lightingStyle: "", compositionStyle: "", recurringElements: [], artStyle: undefined },
      characterDescription: "",
      facelessGuidance: "",
    };
  }
}