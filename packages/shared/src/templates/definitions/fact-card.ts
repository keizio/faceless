import type { ContentTemplate } from "../types";

export const factCardTemplate: ContentTemplate = {
  id: "fact-card",
  name: "Fact / Did You Know Cards",
  description: "Create bold, eye-catching fact cards with striking typography. Perfect for educational content, trivia, and shareable knowledge.",
  category: "education",
  icon: "Lightbulb",
  thumbnailDescription: "Bold text on atmospheric background",
  supportedContentTypes: ["image", "slide"],
  supportedPlatforms: ["tiktok", "instagram", "facebook", "twitter", "generic"],
  renderMode: "hybrid",
  inputFields: [
    {
      id: "factText",
      label: "Fact Text",
      type: "textarea",
      required: true,
      placeholder: "Enter the fact or interesting information",
    },
    {
      id: "topic",
      label: "Topic",
      type: "text",
      required: true,
      placeholder: "e.g., Space, History, Science",
    },
    {
      id: "style",
      label: "Visual Style",
      type: "select",
      required: true,
      options: [
        { value: "bold", label: "Bold & High Contrast" },
        { value: "minimal", label: "Minimal & Clean" },
        { value: "neon", label: "Neon & Glowing" },
        { value: "pastel", label: "Pastel & Soft" },
      ],
      defaultValue: "bold",
    },
    {
      id: "source",
      label: "Source (optional)",
      type: "text",
      required: false,
      placeholder: "e.g., NASA, National Geographic",
    },
  ],
  defaultContentType: "image",
  defaultPlatform: "instagram",
  defaultAspectRatio: "1:1",
};
