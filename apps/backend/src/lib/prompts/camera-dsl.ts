import type { CameraDirection, Platform } from "./types.js";

const SHOT_TYPE_MAP: Record<CameraDirection["shotType"], string> = {
  "close-up": "close-up shot, intimate framing, subject fills the frame",
  "medium-shot": "medium shot, waist-up framing, balanced composition",
  "wide-shot": "wide shot, full scene visible, environmental context",
  "establishing-shot": "establishing shot, wide angle, sets the location and mood",
  pov: "POV shot, first-person perspective, immersive viewpoint",
  "over-the-shoulder": "over-the-shoulder shot, depth layering, perspective from behind subject",
  "dutch-angle": "dutch angle, tilted frame, disorienting or dramatic effect",
  aerial: "aerial shot, drone perspective, bird's eye view",
};

const MOVEMENT_MAP: Record<NonNullable<CameraDirection["movement"]>, string> = {
  static: "static camera, locked tripod",
  pan: "smooth horizontal pan",
  tilt: "slow vertical tilt",
  zoom: "gradual zoom in",
  tracking: "tracking shot, camera follows subject",
  dolly: "dolly movement, smooth push in or pull out",
  handheld: "handheld camera, subtle natural shake, documentary feel",
  drone: "drone movement, sweeping aerial motion",
};

const LIGHTING_MAP: Record<CameraDirection["lighting"], string> = {
  natural: "natural daylight, soft shadows",
  "golden-hour": "golden hour lighting, warm tones, long shadows",
  studio: "studio lighting, three-point setup, clean and even",
  neon: "neon lighting, vibrant colors, cyberpunk aesthetic",
  "low-key": "low-key lighting, dramatic shadows, high contrast",
  "high-key": "high-key lighting, bright and even, minimal shadows",
  backlit: "backlit, rim light effect, silhouette definition",
  "rim-light": "rim light, edge definition, separation from background",
  cinematic: "cinematic lighting, motivated light sources, filmic look",
  "soft-diffused": "soft diffused lighting, gentle shadows, flattering",
};

const COMPOSITION_MAP: Record<
  NonNullable<CameraDirection["composition"]>,
  string
> = {
  "rule-of-thirds": "rule of thirds composition, subject off-center",
  "center-frame": "center framed, symmetrical balance",
  "leading-lines": "leading lines directing eye to subject",
  symmetry: "symmetrical composition, mirror-like balance",
  "negative-space": "negative space composition, breathing room around subject",
  "depth-of-field-shallow":
    "shallow depth of field, blurred background, subject isolation",
};

const STYLE_MAP: Record<NonNullable<CameraDirection["style"]>, string> = {
  cinematic: "cinematic style, 24fps film look, anamorphic aspect",
  documentary: "documentary style, authentic, observational",
  "social-media-native":
    "social media native style, vertical format, mobile-first, scroll-stopping",
  "stop-motion": "stop motion animation style, frame-by-frame, tactile",
  timelapse: "timelapse, accelerated time, clouds and light movement",
  macro: "macro photography, extreme close-up detail",
};

export function renderCameraDirection(cd: CameraDirection): string {
  const parts: string[] = [];

  parts.push(SHOT_TYPE_MAP[cd.shotType]);

  if (cd.movement) {
    parts.push(MOVEMENT_MAP[cd.movement]);
  }

  parts.push(LIGHTING_MAP[cd.lighting]);

  if (cd.composition) {
    parts.push(COMPOSITION_MAP[cd.composition]);
  }

  if (cd.style) {
    parts.push(STYLE_MAP[cd.style]);
  }

  return parts.join(", ");
}

export function cameraDirectionForPlatform(
  platform: Platform,
): Partial<CameraDirection> {
  switch (platform) {
    case "tiktok":
      return {
        movement: "handheld",
        style: "social-media-native",
        composition: "center-frame",
      };
    case "instagram":
      return {
        lighting: "soft-diffused",
        style: "cinematic",
        composition: "rule-of-thirds",
      };
    case "facebook":
      return {
        lighting: "natural",
        composition: "center-frame",
        movement: "static",
      };
    case "twitter":
      return {
        lighting: "high-key",
        composition: "rule-of-thirds",
        style: "documentary",
      };
    case "generic":
    default:
      return {
        lighting: "cinematic",
        composition: "rule-of-thirds",
      };
  }
}

export function cameraDirectionForScene(
  sceneIndex: number,
  totalScenes: number,
): Partial<CameraDirection> {
  if (totalScenes <= 1) {
    return {
      shotType: "medium-shot",
      movement: "static",
    };
  }

  if (sceneIndex === 0) {
    return {
      shotType: "establishing-shot",
      movement: "static",
    };
  }

  if (sceneIndex === totalScenes - 1) {
    return {
      shotType: "close-up",
      movement: "zoom",
    };
  }

  return {
    shotType: "medium-shot",
    movement: "pan",
  };
}