import type { ContentTemplate, TemplateCategory } from "./types";
import { fakeChatTemplate } from "./definitions/fake-chat";
import { ugcProductMarketingTemplate } from "./definitions/ugc-product-marketing";
import { splitScreen } from "./definitions/split-screen";
import { aiMusicVideo } from "./definitions/ai-music-video";
import { factCardTemplate } from "./definitions/fact-card";
import { storytimeNarrationTemplate } from "./definitions/storytime-narration";
import { listicleTemplate } from "./definitions/listicle";
import { quoteCardTemplate } from "./definitions/quote-card";

export const ALL_TEMPLATES: ContentTemplate[] = [
  fakeChatTemplate,
  ugcProductMarketingTemplate,
  splitScreen,
  aiMusicVideo,
  factCardTemplate,
  storytimeNarrationTemplate,
  listicleTemplate,
  quoteCardTemplate,
];

export function getTemplateById(id: string): ContentTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: TemplateCategory): ContentTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateCategories(): TemplateCategory[] {
  const categories = new Set<TemplateCategory>();
  for (const t of ALL_TEMPLATES) {
    categories.add(t.category);
  }
  return Array.from(categories);
}

export {
  fakeChatTemplate,
  ugcProductMarketingTemplate,
  splitScreen,
  aiMusicVideo,
  factCardTemplate,
  storytimeNarrationTemplate,
  listicleTemplate,
  quoteCardTemplate,
};

export type { ContentTemplate, TemplateCategory, RenderMode, TemplateInputField, TemplateFieldType } from "./types";
