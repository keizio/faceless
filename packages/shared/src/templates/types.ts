import type { ContentType, Platform } from "../types/index.js";

export type TemplateCategory =
  | "conversation"
  | "marketing"
  | "comparison"
  | "music"
  | "education"
  | "narrative"
  | "typography";

export type RenderMode = "ai" | "composite" | "hybrid";

export type TemplateFieldType = "text" | "textarea" | "select" | "number" | "file" | "array";

export interface TemplateItemField {
  id: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

export interface TemplateInputField {
  id: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  defaultValue?: unknown;
  itemSchema?: TemplateItemField[];
  accept?: string;
  maxSize?: number;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  thumbnailDescription: string;
  supportedContentTypes: ContentType[];
  supportedPlatforms: Platform[];
  renderMode: RenderMode;
  inputFields: TemplateInputField[];
  defaultContentType: ContentType;
  defaultPlatform: Platform;
  defaultAspectRatio: string;
}
