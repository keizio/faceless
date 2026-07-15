import type { ContentTemplate } from "../types";

export const aiMusicVideo: ContentTemplate = {
  id: "ai-music-video",
  name: "AI Music Video",
  description:
    "Generate music videos with AI-created music and visuals. Choose a mood or genre, pick a visual style, and let AI create the full experience.",
  category: "music",
  icon: "Music",
  thumbnailDescription: "AI-generated music video",
  supportedContentTypes: ["video"],
  supportedPlatforms: ["tiktok", "instagram", "facebook", "generic"],
  renderMode: "hybrid",
  inputFields: [
    {
      id: "moodOrGenre",
      label: "Mood / Genre",
      type: "text",
      required: true,
      placeholder: "e.g. Chill lo-fi beats, Epic orchestral, Synthwave",
    },
    {
      id: "visualStyle",
      label: "Visual Style",
      type: "select",
      required: true,
      options: [
        { value: "abstract", label: "Abstract" },
        { value: "cinematic", label: "Cinematic" },
        { value: "anime", label: "Anime" },
        { value: "psychedelic", label: "Psychedelic" },
        { value: "nature", label: "Nature" },
      ],
      defaultValue: "cinematic",
    },
    {
      id: "audioSource",
      label: "Audio Source",
      type: "select",
      required: true,
      options: [
        { value: "ai-generated", label: "AI Generated" },
        { value: "upload", label: "Upload Audio" },
      ],
      defaultValue: "ai-generated",
    },
    {
      id: "audioFile",
      label: "Audio File",
      type: "file",
      required: false,
      accept: "audio/*",
      maxSize: 10 * 1024 * 1024,
      placeholder: "MP3, WAV, or OGG (max 10MB)",
    },
  ],
  defaultContentType: "video",
  defaultPlatform: "tiktok",
  defaultAspectRatio: "9:16",
};
