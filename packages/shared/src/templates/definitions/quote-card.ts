import type { ContentTemplate } from "../types";

export const quoteCardTemplate: ContentTemplate = {
  id: "quote-card",
  name: "Quote / Typography Cards",
  description: "Create beautiful typography-focused quote cards with atmospheric backgrounds. Perfect for inspirational, motivational, or literary content.",
  category: "typography",
  icon: "Quote",
  thumbnailDescription: "Elegant typography on moody background",
  supportedContentTypes: ["image", "slide"],
  supportedPlatforms: ["tiktok", "instagram", "facebook", "twitter", "generic"],
  renderMode: "hybrid",
  inputFields: [
    {
      id: "quoteText",
      label: "Quote Text",
      type: "textarea",
      required: true,
      placeholder: "Enter the quote or text",
    },
    {
      id: "author",
      label: "Author (optional)",
      type: "text",
      required: false,
      placeholder: "e.g., Albert Einstein",
    },
    {
      id: "style",
      label: "Visual Style",
      type: "select",
      required: true,
      options: [
        { value: "elegant", label: "Elegant & Classic" },
        { value: "bold", label: "Bold & Modern" },
        { value: "minimal", label: "Minimal & Clean" },
        { value: "gradient", label: "Gradient & Vibrant" },
      ],
      defaultValue: "elegant",
    },
  ],
  defaultContentType: "image",
  defaultPlatform: "instagram",
  defaultAspectRatio: "1:1",
};
