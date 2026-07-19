import type { StoryBible } from "./story-bible.js";

export interface ContinuityIssue {
  sceneIndex: number;
  type: "duplicate" | "narrative_gap" | "visual_repetition" | "transition_issue" | "consistency_issue";
  description: string;
  severity: "critical" | "warning";
}

export interface ContinuityCheckResult {
  passes: boolean;
  issues: ContinuityIssue[];
  rewrittenPrompts: string[] | null;
}

export function buildContinuityCheckUserMessage(
  scenePrompts: string[],
  storyBible: StoryBible,
): string {
  const scenesList = scenePrompts
    .map((p, i) => `--- SCENE ${i + 1} ---\n${p}`)
    .join("\n\n");

  const sceneSummaries = storyBible.sceneSummaries
    .map((s) => `Scene ${s.index + 1}: ${s.narrativeBeat} — ${s.setting}, mood: ${s.mood}`)
    .join("\n");

  return `Review ALL scene prompts below for narrative continuity, visual variety, and duplicate prevention.

Story Bible context:
  Theme: ${storyBible.theme}
  Narrative arc: ${storyBible.narrativeArc}
  Color palette: ${storyBible.visualThread.colorPalette}
  Lighting: ${storyBible.visualThread.lightingStyle}
  Composition: ${storyBible.visualThread.compositionStyle}

Expected scene progression:
${sceneSummaries}

Scene prompts to review:
${scenesList}

CHECKLIST:
1. NARRATIVE PROGRESSION: Does each scene advance the story? No scene should feel like a restatement of a previous scene.
2. VISUAL VARIETY: Are shot types, angles, and compositions varied? No two scenes should look alike.
3. DUPLICATE PREVENTION: If any two scenes share the same subject + setting + composition, flag as duplicate.
4. CONSISTENCY: Do all scenes maintain the visual thread (colors, lighting, style)?
5. TRANSITIONS: Does each scene naturally follow from the previous one?

Output only valid JSON with this structure:
{
  "passes": boolean,
  "issues": [
    {
      "sceneIndex": number,
      "type": "duplicate" | "narrative_gap" | "visual_repetition" | "transition_issue" | "consistency_issue",
      "description": string,
      "severity": "critical" | "warning"
    }
  ],
  "rewrittenPrompts": string[] | null
}

Rules:
- If passes is true, rewrittenPrompts must be null.
- If passes is false, provide rewrittenPrompts array with FIXED versions of ONLY the problematic scenes. Keep good scenes identical.
- If rewrittenPrompts is provided, it must have the same length as the input scenePrompts array.
- Do NOT rewrite scenes that are fine. Copy them verbatim.`;
}

export function parseContinuityCheckResponse(
  text: string,
  originalPrompts: string[],
): ContinuityCheckResult {
  try {
    const raw = text.trim();
    let jsonStr = raw;

    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      const braceStart = raw.indexOf("{");
      if (braceStart !== -1) {
        const braceEnd = raw.lastIndexOf("}");
        if (braceEnd > braceStart) {
          jsonStr = raw.slice(braceStart, braceEnd + 1);
        }
      }
    }

    const parsed = JSON.parse(jsonStr) as ContinuityCheckResult;

    if (parsed.rewrittenPrompts && parsed.rewrittenPrompts.length !== originalPrompts.length) {
      return { passes: true, issues: [], rewrittenPrompts: null };
    }

    return {
      passes: parsed.passes ?? true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      rewrittenPrompts: parsed.rewrittenPrompts ?? null,
    };
  } catch {
    return { passes: true, issues: [], rewrittenPrompts: null };
  }
}