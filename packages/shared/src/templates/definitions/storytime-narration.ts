import type { ContentTemplate } from "../types.js";

export const storytimeNarrationTemplate: ContentTemplate = {
  id: "storytime-narration",
  name: "Storytime / Narration",
  description: "Create compelling story-driven videos with strong narrative hooks, emotional arcs, and cinematic visuals. Perfect for TikTok storytimes and YouTube shorts.",
  category: "narrative",
  icon: "BookOpen",
  thumbnailDescription: "Cinematic scenes with narration",
  supportedContentTypes: ["video"],
  supportedPlatforms: ["tiktok", "instagram", "facebook", "generic"],
  renderMode: "ai",
  inputFields: [
    {
      id: "storyTopic",
      label: "Story Topic",
      type: "textarea",
      required: true,
      placeholder: "Describe the story, event, or experience",
    },
    {
      id: "tone",
      label: "Tone",
      type: "select",
      required: true,
      options: [
        { value: "dramatic", label: "Dramatic & Intense" },
        { value: "humorous", label: "Humorous & Light" },
        { value: "mysterious", label: "Mysterious & Suspenseful" },
        { value: "inspirational", label: "Inspirational & Uplifting" },
        { value: "confessional", label: "Confessional & Raw" },
      ],
      defaultValue: "dramatic",
    },
    {
      id: "hookStyle",
      label: "Hook Style",
      type: "select",
      required: true,
      options: [
        { value: "question", label: "Start with a Question" },
        { value: "shocking-fact", label: "Shocking Fact" },
        { value: "cliffhanger", label: "Cliffhanger Opening" },
        { value: "confession", label: "Personal Confession" },
      ],
      defaultValue: "question",
    },
  ],
  defaultContentType: "video",
  defaultPlatform: "tiktok",
  defaultAspectRatio: "9:16",
};
