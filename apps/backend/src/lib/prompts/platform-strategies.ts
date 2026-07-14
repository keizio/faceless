import type { Platform, PlatformStrategy } from "./types.js";

export const PLATFORM_STRATEGIES: Record<Platform, PlatformStrategy> = {
  tiktok: {
    label: "TikTok",
    defaultCamera: {
      movement: "handheld",
      style: "social-media-native",
      composition: "center-frame",
      shotType: "medium-shot",
    },
    preferredLighting: ["natural", "neon", "soft-diffused"],
    compositionGuidance:
      "Vertical framing, subject centered, text overlay space at top and bottom thirds, high contrast for mobile viewing",
    qualityTagSuffixes: [
      "vertical format",
      "9:16 aspect ratio",
      "mobile-first",
      "scroll-stopping",
      "high contrast",
    ],
    negativePromptAdditions: [
      "horizontal framing",
      "landscape orientation",
      "slow pacing",
      "letterbox",
      "16:9",
    ],
    visualStyleGuidance:
      "High energy, fast-paced visuals, bold colors, trending aesthetic, native mobile content feel. Use jump cuts, quick transitions, and hook-driven opening frames.",
  },
  instagram: {
    label: "Instagram",
    defaultCamera: {
      lighting: "soft-diffused",
      style: "cinematic",
      composition: "rule-of-thirds",
      shotType: "medium-shot",
    },
    preferredLighting: [
      "soft-diffused",
      "golden-hour",
      "studio",
      "natural",
    ],
    compositionGuidance:
      "Polished, curated aesthetic. Clean backgrounds, intentional color palettes. Subject should be prominent with breathing room.",
    qualityTagSuffixes: [
      "aesthetic",
      "curated",
      "polished",
      "high resolution",
      "professional photography",
    ],
    negativePromptAdditions: [
      "amateur",
      "low resolution",
      "cluttered background",
      "messy",
      "poor lighting",
      "snapshot",
    ],
    visualStyleGuidance:
      "Polished, aspirational aesthetic. Lifestyle photography style. Attention to color harmony and composition. Clean, intentional framing.",
  },
  facebook: {
    label: "Facebook",
    defaultCamera: {
      lighting: "natural",
      composition: "center-frame",
      movement: "static",
      shotType: "wide-shot",
    },
    preferredLighting: ["natural", "studio", "high-key"],
    compositionGuidance:
      "Wide or landscape framing preferred. Text overlay friendly with clear focal point. Information-rich visuals.",
    qualityTagSuffixes: [
      "informational",
      "clear",
      "professional",
      "landscape friendly",
      "wide format",
    ],
    negativePromptAdditions: [
      "inappropriate",
      "offensive",
      "NSFW",
      "controversial",
    ],
    visualStyleGuidance:
      "Informational, shareable content. Clear messaging, text overlay compatible. Professional but approachable. Family-friendly aesthetic.",
  },
  twitter: {
    label: "Twitter/X",
    defaultCamera: {
      lighting: "high-key",
      composition: "rule-of-thirds",
      style: "documentary",
      shotType: "medium-shot",
    },
    preferredLighting: ["high-key", "natural", "studio"],
    compositionGuidance:
      "Bold, simple compositions. High contrast for timeline visibility. Square or landscape preferred.",
    qualityTagSuffixes: [
      "bold",
      "high contrast",
      "newsworthy",
      "scroll-stopping",
      "minimal",
    ],
    negativePromptAdditions: [
      "cluttered",
      "busy",
      "low contrast",
      "complex",
      "text heavy",
    ],
    visualStyleGuidance:
      "News-style, bold, attention-grabbing. Simple, punchy visuals that work at small sizes in the timeline. High contrast, minimal text on image.",
  },
  generic: {
    label: "Generic",
    defaultCamera: {
      lighting: "cinematic",
      composition: "rule-of-thirds",
      shotType: "medium-shot",
    },
    preferredLighting: ["cinematic", "natural", "studio"],
    compositionGuidance:
      "Balanced, professional composition. Flexible framing for multiple use cases.",
    qualityTagSuffixes: [
      "professional",
      "high quality",
      "4K",
      "high detail",
    ],
    negativePromptAdditions: [],
    visualStyleGuidance:
      "Professional, versatile content suitable for any platform. Clean, balanced visuals with universal appeal.",
  },
};