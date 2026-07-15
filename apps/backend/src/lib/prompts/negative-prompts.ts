import type { Platform } from "./types.js";
import { PLATFORM_STRATEGIES } from "./platform-strategies.js";

const DEFAULT_NEGATIVE_PROMPT = [
  "blurry",
  "low quality",
  "distorted",
  "deformed",
  "watermark",
  "text artifacts",
  "logo",
  "oversaturated",
  "underexposed",
  "pixelated",
  "jpeg artifacts",
  "bad anatomy",
  "extra limbs",
  "fused fingers",
  "ugly",
  "duplicate",
  "cropped",
  "out of frame",
  "lowres",
  "error",
  "mutated",
  "poorly drawn",
  "worst quality",
  "social media UI overlays",
  "fake follower count",
  "dummy text",
  "UI mockup",
  "fabricated stats",
  "@handle",
  "@username",
  "social media account",
];

export function getNegativePrompt(platform: Platform): string {
  const strategy = PLATFORM_STRATEGIES[platform];
  const additions = strategy.negativePromptAdditions ?? [];
  const allNegatives = [...DEFAULT_NEGATIVE_PROMPT, ...additions];
  return allNegatives.join(", ");
}

export function getNegativePromptSuffix(platform: Platform): string {
  return `--neg ${getNegativePrompt(platform)}`;
}