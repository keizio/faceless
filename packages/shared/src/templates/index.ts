import type { ContentTemplate, TemplateCategory } from "./types.js";
import { fakeChatTemplate } from "./definitions/fake-chat.js";
import { ugcProductMarketingTemplate } from "./definitions/ugc-product-marketing.js";
import { splitScreen } from "./definitions/split-screen.js";
import { aiMusicVideo } from "./definitions/ai-music-video.js";
import { factCardTemplate } from "./definitions/fact-card.js";
import { storytimeNarrationTemplate } from "./definitions/storytime-narration.js";
import { listicleTemplate } from "./definitions/listicle.js";
import { quoteCardTemplate } from "./definitions/quote-card.js";
import { povTemplate } from "./definitions/pov.js";
import { lofiMusicTemplate } from "./definitions/lofi-music.js";

export const ALL_TEMPLATES: ContentTemplate[] = [
  fakeChatTemplate,
  ugcProductMarketingTemplate,
  splitScreen,
  aiMusicVideo,
  factCardTemplate,
  storytimeNarrationTemplate,
  listicleTemplate,
  quoteCardTemplate,
  povTemplate,
  lofiMusicTemplate,
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
  povTemplate,
  lofiMusicTemplate,
};

export type { ContentTemplate, TemplateCategory, RenderMode, TemplateInputField, TemplateFieldType, TemplateItemField } from "./types.js";
