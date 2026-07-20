import type { ContentTemplate } from "../types.js";

export const listicleTemplate: ContentTemplate = {
  id: "listicle",
  name: "Top X Listicle",
  description: "Create numbered list content in slide or video format. Perfect for countdowns, rankings, and 'Top 10' style content.",
  category: "education",
  icon: "ListOrdered",
  thumbnailDescription: "Numbered list cards",
  supportedContentTypes: ["slide", "video"],
  supportedPlatforms: ["tiktok", "instagram", "facebook", "generic"],
  renderMode: "hybrid",
  inputFields: [
    {
      id: "topic",
      label: "Topic",
      type: "text",
      required: true,
      placeholder: "e.g., Top 10 Travel Destinations",
    },
    {
      id: "itemCount",
      label: "Number of Items",
      type: "number",
      required: true,
      min: 3,
      max: 10,
      defaultValue: 5,
    },
    {
      id: "items",
      label: "List Items (optional — AI generates if empty)",
      type: "array",
      required: false,
      placeholder: "Add items or let AI generate them",
    },
    {
      id: "style",
      label: "Visual Style",
      type: "select",
      required: true,
      options: [
        { value: "numbered", label: "Bold Numbered Cards" },
        { value: "cards", label: "Clean Info Cards" },
        { value: "minimal", label: "Minimal & Elegant" },
      ],
      defaultValue: "numbered",
    },
  ],
  defaultContentType: "slide",
  defaultPlatform: "instagram",
  defaultAspectRatio: "1:1",
};
