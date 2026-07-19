import type { Platform, ContentType, SpeechStyle, BrandKit } from "@faceless/shared";
import type { ArtStyle } from "./art-style-detector.js";
export type { Platform, ContentType };
export type { ArtStyle };

export type CopywritingFramework = "aida" | "pas" | "fab" | "none";
export type HeadlineFormula = "how-to" | "list" | "question" | "command" | "curiosity-gap" | "testimonial" | "why" | "secret" | "number-adjective" | "before-after";
export type CtaPattern = "low-friction" | "benefit-driven" | "urgency" | "command" | "personal" | "curiosity";

export interface CameraDirection {
  shotType:
    | "close-up"
    | "medium-shot"
    | "wide-shot"
    | "establishing-shot"
    | "pov"
    | "over-the-shoulder"
    | "dutch-angle"
    | "aerial";
  movement?:
    | "static"
    | "pan"
    | "tilt"
    | "zoom"
    | "tracking"
    | "dolly"
    | "handheld"
    | "drone";
  lighting:
    | "natural"
    | "golden-hour"
    | "studio"
    | "neon"
    | "low-key"
    | "high-key"
    | "backlit"
    | "rim-light"
    | "cinematic"
    | "soft-diffused";
  composition?:
    | "rule-of-thirds"
    | "center-frame"
    | "leading-lines"
    | "symmetry"
    | "negative-space"
    | "depth-of-field-shallow";
  style?:
    | "cinematic"
    | "documentary"
    | "social-media-native"
    | "stop-motion"
    | "timelapse"
    | "macro";
}

export interface AvatarContext {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  speechStyle: SpeechStyle | null;
  referenceImageUrl: string | null;
  characterSheet: string | null;
}

export interface PromptContext {
  userPrompt: string;
  contentType: ContentType;
  platform: Platform;
  aspectRatio: string;
  language: string;
  avatar?: AvatarContext;
  brandKit?: BrandKit;
  sceneIndex?: number;
  totalScenes?: number;
  copywritingFramework?: CopywritingFramework;
  headlineFormula?: HeadlineFormula;
  ctaPattern?: CtaPattern;
  artStyle?: ArtStyle;
}

export interface EnhancedPrompt {
  visualPrompt: string;
  cameraDirection: CameraDirection;
  negativePrompt: string;
  qualityTags: string[];
  artStyle?: ArtStyle;
}

export interface PlatformStrategy {
  label: string;
  defaultCamera: Partial<CameraDirection>;
  preferredLighting: CameraDirection["lighting"][];
  compositionGuidance: string;
  qualityTagSuffixes: string[];
  negativePromptAdditions: string[];
  visualStyleGuidance: string;
}