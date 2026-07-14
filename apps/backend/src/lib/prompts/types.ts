import type { Platform, ContentType, SpeechStyle } from "@faceless/shared";
export type { Platform, ContentType };

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
  sceneIndex?: number;
  totalScenes?: number;
}

export interface EnhancedPrompt {
  visualPrompt: string;
  cameraDirection: CameraDirection;
  negativePrompt: string;
  qualityTags: string[];
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