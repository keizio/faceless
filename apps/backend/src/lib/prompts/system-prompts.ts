import type { Platform } from "./types.js";
import { PLATFORM_STRATEGIES } from "./platform-strategies.js";

interface ScriptWriterParams {
  platform: Platform;
  contentType: string;
  language: string;
  isFaceless: boolean;
  avatarContext?: string;
  frameworkSection?: string;
  headlineSection?: string;
  ctaSection?: string;
  persuasionSection?: string;
  brandSection?: string;
  templateOverride?: string;
}

export function buildScriptWriterSystemPrompt(params: ScriptWriterParams): string {
  const { platform, contentType, language, isFaceless, avatarContext, brandSection } = params;
  const strategy = PLATFORM_STRATEGIES[platform] ?? PLATFORM_STRATEGIES.generic;

  const modeSection = isFaceless
    ? "FACELESS MODE: No human figures or faces. Focus on environment, objects, typography, and abstract visuals."
    : `AVATAR MODE: Write in this character's voice:\n${avatarContext ?? ""}`;

  const sections = [
    `You are a professional script writer for faceless social media content.`,
    `Generate an engaging script for a ${contentType} on ${platform}.`,
    `The script should hook the viewer in the first 3 seconds.`,
    ``,
    `Platform: ${platform}`,
    strategy.visualStyleGuidance,
    ``,
    modeSection,
    ``,
    `Language: ${language}`,
  ];

  if (brandSection) {
    sections.push(``, `Brand identity:`, brandSection, ``, `Incorporate the brand identity naturally into the content.`);
  }

  if (params.frameworkSection) {
    sections.push(``, params.frameworkSection);
  }

  if (params.headlineSection) {
    sections.push(``, params.headlineSection);
  }

  if (params.ctaSection) {
    sections.push(``, params.ctaSection);
  }

  if (params.persuasionSection) {
    sections.push(``, params.persuasionSection);
  }

  if (params.templateOverride) {
    sections.push(``, params.templateOverride);
  }

  sections.push(
    ``,
    `Output format: JSON with "hook", "body", "cta", "caption" (with hashtags), and "visual_prompt" (a detailed visual description for AI image/video generation).`,
    ``,
    `CRITICAL: Never include fake social media statistics, follower counts, like counts, or social media account handles (@username, @handle) in the caption or script. Never include slide numbers or scene numbering in the visual description.`,
  );

  return sections.join("\n");
}

interface PromptEnhancerParams {
  platform: Platform;
  isFaceless: boolean;
  avatarName?: string;
  templateVisualGuidance?: string;
}

export function buildPromptEnhancerSystemPrompt(params: PromptEnhancerParams): string {
  const { platform, isFaceless, avatarName, templateVisualGuidance } = params;

  const modeSection = isFaceless
    ? "FACELESS MODE: Generate content with NO human figures, NO faces. Focus on environment, objects, typography, and abstract visuals."
    : `AVATAR MODE: Include the character in the visual description. Avatar: ${avatarName ?? "character"}.`;

  const sections = [
    `You are a visual prompt engineer. Transform a user's content idea into a detailed image generation prompt.`,
    ``,
    `Platform: ${platform}`,
    modeSection,
  ];

  if (templateVisualGuidance) {
    sections.push(``, `Visual guidance: ${templateVisualGuidance}`);
  }

  sections.push(
    ``,
    `Output format: JSON with {`,
    `  "artStyle"?: "comic" | "cartoon" | "anime" | "realistic" | "cinematic" | "pixel-art" | "watercolor" | "3d-render" | "cyberpunk" | "vintage" | "abstract" | "chibi" | "minimalist" (detect from user prompt),`,
    `  "visualPrompt": string (rich visual description 200-400 words),`,
    `  "cameraDirection": {`,
    `    "shotType": "close-up" | "medium-shot" | "wide-shot" | "establishing-shot" | "pov" | "over-the-shoulder" | "dutch-angle" | "aerial",`,
    `    "movement"?: "static" | "pan" | "tilt" | "zoom" | "tracking" | "dolly" | "handheld" | "drone",`,
    `    "lighting": "natural" | "golden-hour" | "studio" | "neon" | "low-key" | "high-key" | "backlit" | "rim-light" | "cinematic" | "soft-diffused",`,
    `    "composition"?: "rule-of-thirds" | "center-frame" | "leading-lines" | "symmetry" | "negative-space" | "depth-of-field-shallow",`,
    `    "style"?: "cinematic" | "documentary" | "social-media-native" | "stop-motion" | "timelapse" | "macro"`,
    `  },`,
    `  "qualityTags": string[]`,
    `}`,
  );

  return sections.join("\n");
}

interface CaptionGeneratorParams {
  platform: Platform;
  language: string;
  isFaceless: boolean;
  avatarContext?: string;
  toneSection?: string;
  ctaSection?: string;
  headlineSection?: string;
  brandSection?: string;
}

export function buildCaptionGeneratorSystemPrompt(params: CaptionGeneratorParams): string {
  const { platform, language, isFaceless, avatarContext, brandSection } = params;
  const strategy = PLATFORM_STRATEGIES[platform] ?? PLATFORM_STRATEGIES.generic;

  const modeSection = isFaceless
    ? "FACELESS MODE: No human figures or faces. Focus on the visual theme."
    : `AVATAR MODE: Write in this character's voice:\n${avatarContext ?? ""}`;

  const sections = [
    `You are a professional social media caption writer for faceless content.`,
    `Generate an engaging caption for a ${platform} post.`,
    ``,
    `Platform: ${platform}`,
    strategy.visualStyleGuidance,
    ``,
    modeSection,
    ``,
    `Language: ${language}`,
  ];

  if (brandSection) {
    sections.push(``, `Brand identity:`, brandSection, ``, `Incorporate the brand identity naturally into the content.`);
  }

  if (params.toneSection) {
    sections.push(``, params.toneSection);
  }

  if (params.headlineSection) {
    sections.push(``, params.headlineSection);
  }

  if (params.ctaSection) {
    sections.push(``, params.ctaSection);
  }

  sections.push(
    ``,
    `Output format: JSON with "hook", "body", "cta", "caption" (with hashtags).`,
    ``,
    `CRITICAL: Never include fake social media statistics, follower counts, like counts, or social media account handles (@username, @handle) in the caption or script.`,
  );

  return sections.join("\n");
}

interface QualityReviewerParams {
  platform: Platform;
  frameworkSection?: string;
}

export function buildQualityReviewerSystemPrompt(params: QualityReviewerParams): string {
  const { platform } = params;

  const sections = [
    `You are a quality assurance agent for AI-generated faceless social media content.`,
    ``,
    `Review the generated content and score it on the following criteria:`,
    ``,
    `1. HOOK STRENGTH (1-10):`,
    `   - Does the opening grab attention within 1-2 seconds?`,
    `   - Is it platform-appropriate and scroll-stopping?`,
    ``,
    `2. CTA CLARITY (1-10):`,
    `   - Is the call to action clear and actionable?`,
    `   - Does it feel natural, not forced?`,
    ``,
    `3. CONTENT QUALITY (1-10):`,
    `   - Is the content engaging and well-structured?`,
    `   - Does it deliver value to the viewer?`,
    ``,
    `4. PLATFORM COMPLIANCE (1-10):`,
    `   - ${platform}: appropriate format, length, and style?`,
    `   - Follows platform best practices?`,
    ``,
    `5. CONTENT SAFETY (1-10):`,
    `   - No NSFW content, copyrighted material, harmful content, or hate speech`,
    `   - No fake statistics or social media handles`,
    ``,
    `6. ENGAGEMENT POTENTIAL (1-10):`,
    `   - Would a real viewer watch/read to the end?`,
    `   - Is the pacing appropriate for the platform?`,
  ];

  if (params.frameworkSection) {
    sections.push(``, `7. FRAMEWORK ADHERENCE:`, params.frameworkSection);
  }

  sections.push(
    ``,
    `Output format: JSON with {`,
    `  "approved": boolean (true if average score >= 6),`,
    `  "score": number (1-10, overall average),`,
    `  "hookScore": number (1-10),`,
    `  "ctaScore": number (1-10),`,
    `  "issues": array of { "severity": "critical" | "warning" | "suggestion", "description": string },`,
    `  "improvements": array of string (actionable suggestions for improvement)`,
    `}`,
  );

  return sections.join("\n");
}
