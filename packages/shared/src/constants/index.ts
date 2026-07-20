export const PLATFORM_SPECS = {
  tiktok: {
    label: "TikTok",
    aspectRatios: ["9:16"],
    maxVideoLength: 180,
    maxImageSize: { width: 1080, height: 1920 },
    captionLimit: 2200,
    hashtagLimit: 100,
  },
  instagram: {
    label: "Instagram",
    aspectRatios: ["1:1", "4:5", "9:16"],
    maxVideoLength: 90,
    maxImageSize: { width: 1080, height: 1350 },
    captionLimit: 2200,
    hashtagLimit: 30,
  },
  facebook: {
    label: "Facebook",
    aspectRatios: ["16:9", "1:1", "4:5"],
    maxVideoLength: 240,
    maxImageSize: { width: 1200, height: 630 },
    captionLimit: 63206,
    hashtagLimit: 30,
  },
  twitter: {
    label: "Twitter/X",
    aspectRatios: ["16:9", "1:1"],
    maxVideoLength: 140,
    maxImageSize: { width: 1200, height: 675 },
    captionLimit: 280,
    hashtagLimit: 10,
  },
  generic: {
    label: "Generic",
    aspectRatios: ["16:9", "1:1", "9:16"],
    maxVideoLength: 300,
    maxImageSize: { width: 1920, height: 1080 },
    captionLimit: 5000,
    hashtagLimit: 20,
  },
} as const;

export const SPEECH_STYLE_LABELS = {
  formal: "Formal",
  casual: "Casual",
  humorous: "Humorous",
  professional: "Professional",
  friendly: "Friendly",
  persuasive: "Persuasive",
  inspirational: "Inspirational",
  educational: "Educational",
} as const;

export const CREDIT_COSTS = {
  text: 1,
  image: 2,
  slide: 3,
  video: 5,
  avatar: 2,
  idea: 2,
} as const;

export const TEMPLATE_MULTIPLIERS: Record<string, number> = {
  '*': 1.0,
  'quote-card': 1.0,
  'fact-card': 1.0,
  'pov': 1.0,
  'fake-chat': 1.25,
  'split-screen': 1.25,
  'ugc-product-marketing': 1.25,
  'listicle': 1.5,
  'storytime-narration': 1.5,
  'ai-music-video': 1.5,
  'lofi-music': 1.5,
};

export const CONTENT_LIMITS = {
  maxProjectsPerUser: 50,
  maxContentsPerProject: 200,
  maxVersionsPerContent: 20,
  maxPromptLength: 2000,
} as const;

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "id", label: "Indonesian / Bahasa Indonesia" },
  { code: "ja", label: "Japanese / 日本語" },
  { code: "ko", label: "Korean / 한국어" },
  { code: "zh-CN", label: "Chinese Simplified / 简体中文" },
  { code: "zh-TW", label: "Chinese Traditional / 繁體中文" },
  { code: "es", label: "Spanish / Español" },
  { code: "fr", label: "French / Français" },
  { code: "de", label: "German / Deutsch" },
  { code: "pt", label: "Portuguese / Português" },
  { code: "ar", label: "Arabic / العربية" },
  { code: "hi", label: "Hindi / हिन्दी" },
  { code: "th", label: "Thai / ไทย" },
  { code: "vi", label: "Vietnamese / Tiếng Việt" },
  { code: "ru", label: "Russian / Русский" },
  { code: "it", label: "Italian / Italiano" },
  { code: "nl", label: "Dutch / Nederlands" },
  { code: "tr", label: "Turkish / Türkçe" },
  { code: "pl", label: "Polish / Polski" },
  { code: "ms", label: "Malay / Bahasa Melayu" },
] as const;

export const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"] as const;

export const AGE_RANGES = [
  { label: "Under 18", value: 16 },
  { label: "18-24", value: 21 },
  { label: "25-34", value: 30 },
  { label: "35-44", value: 40 },
  { label: "45-54", value: 50 },
  { label: "55-64", value: 60 },
  { label: "65+", value: 70 },
] as const;

export function getAgeRangeLabel(age: number | null): string {
  if (!age) return "";
  const range = AGE_RANGES.find((r) => r.value === age);
  if (range) return range.label;
  const closest = AGE_RANGES.reduce((prev, curr) =>
    Math.abs(curr.value - age) < Math.abs(prev.value - age) ? curr : prev,
  );
  return closest.label;
}

export function getAgeRangeValue(age: number | null): string {
  if (!age) return "";
  const range = AGE_RANGES.find((r) => r.value === age);
  if (range) return range.value.toString();
  const closest = AGE_RANGES.reduce((prev, curr) =>
    Math.abs(curr.value - age) < Math.abs(prev.value - age) ? curr : prev,
  );
  return closest.value.toString();
}

export const SUPPORTED_FORMATS = {
  image: ["png", "jpg", "webp"],
  video: ["mp4", "webm"],
  slide: ["png", "jpg", "pdf"],
  text: ["txt", "md"],
} as const;
