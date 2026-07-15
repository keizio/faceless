import type { ContentTemplate } from "../types";

export const fakeChatTemplate: ContentTemplate = {
  id: "fake-chat",
  name: "Fake Chat Messages",
  description: "Generate realistic WhatsApp, iMessage, or DM conversation screenshots. Perfect for storytelling, memes, and engagement bait.",
  category: "conversation",
  icon: "MessageSquare",
  thumbnailDescription: "Phone chat UI with realistic bubbles",
  supportedContentTypes: ["image", "video"],
  supportedPlatforms: ["tiktok", "instagram", "facebook", "generic"],
  renderMode: "composite",
  inputFields: [
    {
      id: "chatStyle",
      label: "Chat Style",
      type: "select",
      required: true,
      options: [
        { value: "whatsapp", label: "WhatsApp" },
        { value: "imessage", label: "iMessage" },
        { value: "dm", label: "Instagram DM" },
        { value: "telegram", label: "Telegram" },
      ],
      defaultValue: "whatsapp",
    },
    {
      id: "senderName",
      label: "Your Name",
      type: "text",
      required: true,
      placeholder: "e.g., You",
    },
    {
      id: "receiverName",
      label: "Their Name",
      type: "text",
      required: true,
      placeholder: "e.g., Sarah",
    },
    {
      id: "messages",
      label: "Messages",
      type: "array",
      required: true,
      placeholder: "Add conversation messages",
    },
  ],
  defaultContentType: "image",
  defaultPlatform: "instagram",
  defaultAspectRatio: "1:1",
};
