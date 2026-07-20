import type { ContentTemplate } from "../types.js";

export const lofiMusicTemplate: ContentTemplate = {
  id: "lofi-music",
  name: "Lo-Fi Beats",
  description:
    "Create a looping lo-fi music video with AI-generated chill beats and a cozy visual scene. Perfect for study, relax, or ambient content.",
  category: "music",
  icon: "Headphones",
  thumbnailDescription: "Cozy lo-fi scene with chill beats visualizer",
  supportedContentTypes: ["video"],
  supportedPlatforms: ["tiktok", "instagram", "facebook", "generic"],
  renderMode: "hybrid",
  inputFields: [
    {
      id: "moodOrGenre",
      label: "Music Mood",
      type: "text",
      required: true,
      placeholder: "e.g. Chill lo-fi hip hop beats, Rainy jazz lo-fi, Study ambient",
      defaultValue: "Chill lo-fi hip hop beats",
    },
    {
      id: "visualStyle",
      label: "Visual Style",
      type: "select",
      required: true,
      options: [
        { value: "anime-room", label: "Anime Cozy Room" },
        { value: "abstract", label: "Abstract / Ambient" },
        { value: "nature", label: "Nature / Calm Scenery" },
        { value: "city-night", label: "City Night / Neon" },
        { value: "cafe", label: "Cafe / Warm Interior" },
      ],
      defaultValue: "anime-room",
    },
    {
      id: "sceneDescription",
      label: "Custom Scene Description (optional)",
      type: "textarea",
      required: false,
      placeholder: "Describe your own scene. Overrides the visual style default.",
    },
    {
      id: "duration",
      label: "Video Duration (seconds)",
      type: "number",
      required: true,
      min: 15,
      max: 3600,
      defaultValue: 60,
      placeholder: "15 to 3600 seconds",
    },
  ],
  defaultContentType: "video",
  defaultPlatform: "tiktok",
  defaultAspectRatio: "9:16",
};