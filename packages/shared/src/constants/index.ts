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

export const CONTENT_LIMITS = {
  maxProjectsPerUser: 50,
  maxContentsPerProject: 200,
  maxVersionsPerContent: 20,
  maxPromptLength: 2000,
  freePlanGenerationsPerDay: 5,
  proPlanGenerationsPerDay: 100,
} as const;

export const SUPPORTED_FORMATS = {
  image: ["png", "jpg", "webp"],
  video: ["mp4", "webm"],
  slide: ["png", "jpg", "pdf"],
  text: ["txt", "md"],
} as const;
