import type { TextLayer, TextLayerMap } from "@faceless/shared";

const FACT_CARD_STYLE_CONFIGS: Record<string, { textColor: string; accentColor: string }> = {
  bold: { textColor: "#ffffff", accentColor: "#e94560" },
  minimal: { textColor: "#1a1a1a", accentColor: "#666666" },
  neon: { textColor: "#00ff88", accentColor: "#ff00ff" },
  pastel: { textColor: "#2d3436", accentColor: "#e17055" },
};

const QUOTE_CARD_STYLE_CONFIGS: Record<string, { textColor: string; quoteColor: string; authorColor: string }> = {
  elegant: { textColor: "#ecf0f1", quoteColor: "#f39c12", authorColor: "#bdc3c7" },
  bold: { textColor: "#ffffff", quoteColor: "#ff3838", authorColor: "#888888" },
  minimal: { textColor: "#222222", quoteColor: "#cccccc", authorColor: "#888888" },
  gradient: { textColor: "#ffffff", quoteColor: "#a8b4ff", authorColor: "#d0d6ff" },
};

function getDimensions(aspectRatio: string): { width: number; height: number } {
  const dims: Record<string, { width: number; height: number }> = {
    "9:16": { width: 1080, height: 1920 },
    "16:9": { width: 1920, height: 1080 },
    "1:1": { width: 1080, height: 1080 },
    "4:5": { width: 1080, height: 1350 },
  };
  return dims[aspectRatio] ?? { width: 1080, height: 1080 };
}

function makeTextLayer(overrides: Partial<TextLayer> & { id: string; text: string }): TextLayer {
  return {
    fontFamily: "Inter",
    fontSize: 32,
    fontWeight: "normal",
    fontStyle: "normal",
    color: "#ffffff",
    textAlign: "center",
    x: 0,
    y: 0,
    width: 400,
    originX: "center",
    originY: "center",
    angle: 0,
    opacity: 1,
    visible: true,
    locked: false,
    source: "ai",
    ...overrides,
  };
}

export function factCardToTextLayers(
  inputs: Record<string, unknown>,
  aspectRatio: string,
): TextLayer[] {
  const { width, height } = getDimensions(aspectRatio);
  const style = (inputs.style as string) ?? "bold";
  const colors = FACT_CARD_STYLE_CONFIGS[style] ?? FACT_CARD_STYLE_CONFIGS.bold;

  const layers: TextLayer[] = [];
  const contentMaxWidth = width - 96;

  const topic = inputs.topic as string;
  if (topic) {
    layers.push(
      makeTextLayer({
        id: "overlay-fact-topic",
        text: topic,
        fontSize: Math.floor(height * 0.018),
        fontWeight: "bold",
        color: colors.accentColor,
        textAlign: "center",
        x: width / 2,
        y: Math.floor(height * 0.35),
        width: contentMaxWidth,
        originX: "center",
        originY: "center",
      }),
    );
  }

  const factText = (inputs.factText as string) ?? "";
  if (factText) {
    layers.push(
      makeTextLayer({
        id: "overlay-fact-text",
        text: factText,
        fontSize: Math.floor(height * 0.045),
        fontWeight: "bold",
        color: colors.textColor,
        textAlign: "center",
        x: width / 2,
        y: Math.floor(height * 0.5),
        width: contentMaxWidth,
        originX: "center",
        originY: "center",
        lineHeight: 1.4,
      }),
    );
  }

  const source = inputs.source as string | undefined;
  if (source) {
    layers.push(
      makeTextLayer({
        id: "overlay-fact-source",
        text: `Source: ${source}`,
        fontSize: Math.floor(height * 0.016),
        fontWeight: "bold",
        color: colors.accentColor,
        textAlign: "center",
        x: width / 2,
        y: Math.floor(height * 0.72),
        width: contentMaxWidth,
        originX: "center",
        originY: "center",
      }),
    );
  }

  return layers;
}

export function quoteCardToTextLayers(
  inputs: Record<string, unknown>,
  aspectRatio: string,
): TextLayer[] {
  const { width, height } = getDimensions(aspectRatio);
  const style = (inputs.style as string) ?? "elegant";
  const colors = QUOTE_CARD_STYLE_CONFIGS[style] ?? QUOTE_CARD_STYLE_CONFIGS.elegant;

  const layers: TextLayer[] = [];
  const contentMaxWidth = width - 128;

  const quoteText = (inputs.quoteText as string) ?? "";
  if (quoteText) {
    layers.push(
      makeTextLayer({
        id: "overlay-quote-text",
        text: quoteText,
        fontSize: Math.floor(height * 0.036),
        fontWeight: "normal",
        color: colors.textColor,
        textAlign: "center",
        x: width / 2,
        y: Math.floor(height * 0.45),
        width: contentMaxWidth,
        originX: "center",
        originY: "center",
        lineHeight: 1.5,
      }),
    );
  }

  const author = inputs.author as string | undefined;
  if (author) {
    layers.push(
      makeTextLayer({
        id: "overlay-quote-author",
        text: `— ${author}`,
        fontSize: Math.floor(height * 0.018),
        fontWeight: "normal",
        color: colors.authorColor,
        textAlign: "center",
        x: width / 2,
        y: Math.floor(height * 0.65),
        width: contentMaxWidth,
        originX: "center",
        originY: "center",
      }),
    );
  }

  return layers;
}

export function povToTextLayers(
  inputs: Record<string, unknown>,
  aspectRatio: string,
): TextLayer[] {
  const { width, height } = getDimensions(aspectRatio);

  const povText = (inputs.povText as string) ?? "";
  if (!povText) return [];

  return [
    makeTextLayer({
      id: "overlay-pov-chip",
      text: `POV: ${povText}`,
      fontSize: Math.floor(width * 0.038),
      fontWeight: "bold",
      color: "#ffffff",
      textAlign: "center",
      x: width / 2,
      y: Math.floor(height * 0.06),
      width: Math.floor(width * 0.85),
      originX: "center",
      originY: "top",
      textBackgroundColor: "rgba(0, 0, 0, 0.7)",
    }),
  ];
}

export function listicleToTextLayers(
  inputs: Record<string, unknown>,
  aspectRatio: string,
  itemCount: number,
): TextLayerMap {
  const { width, height } = getDimensions(aspectRatio);
  const items = (inputs.items as string[]) ?? [];
  const topic = (inputs.topic as string) ?? "";

  const result: TextLayerMap = {};

  for (let i = 0; i < itemCount; i++) {
    const slideKey = `slide-${i}`;
    const itemTitle = items[i] ?? `Item ${i + 1}`;
    const itemNumber = i + 1;
    const layers: TextLayer[] = [];

    if (topic) {
      layers.push(
        makeTextLayer({
          id: `overlay-listicle-topic-${i}`,
          text: topic.toUpperCase(),
          fontSize: Math.floor(width * 0.025),
          fontWeight: "bold",
          color: "rgba(255,255,255,0.5)",
          textAlign: "left",
          x: Math.floor(width * 0.08),
          y: Math.floor(height * 0.08),
          width: Math.floor(width * 0.84),
          originX: "left",
          originY: "top",
          charSpacing: 2,
        }),
      );
    }

    layers.push(
      makeTextLayer({
        id: `overlay-listicle-number-${i}`,
        text: String(itemNumber),
        fontSize: Math.floor(width * 0.15),
        fontWeight: "bold",
        color: "rgba(255,255,255,0.15)",
        textAlign: "left",
        x: Math.floor(width * 0.08),
        y: Math.floor(height * 0.32),
        width: Math.floor(width * 0.84),
        originX: "left",
        originY: "center",
      }),
    );

    layers.push(
      makeTextLayer({
        id: `overlay-listicle-title-${i}`,
        text: itemTitle,
        fontSize: Math.floor(width * 0.05),
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "left",
        x: Math.floor(width * 0.08),
        y: Math.floor(height * 0.45),
        width: Math.floor(width * 0.84),
        originX: "left",
        originY: "top",
        lineHeight: 1.3,
      }),
    );

    const itemDescription = `Description for ${itemTitle}`;
    layers.push(
      makeTextLayer({
        id: `overlay-listicle-desc-${i}`,
        text: itemDescription,
        fontSize: Math.floor(width * 0.03),
        fontWeight: "normal",
        color: "rgba(255,255,255,0.8)",
        textAlign: "left",
        x: Math.floor(width * 0.08),
        y: Math.floor(height * 0.55),
        width: Math.floor(width * 0.84),
        originX: "left",
        originY: "top",
        lineHeight: 1.5,
      }),
    );

    result[slideKey] = layers;
  }

  return result;
}

export function splitScreenToTextLayers(
  inputs: Record<string, unknown>,
  aspectRatio: string,
): TextLayer[] {
  const { width, height } = getDimensions(aspectRatio);
  const orientation = (inputs.orientation as string) ?? "horizontal";

  const layers: TextLayer[] = [];
  const labelFontSize = Math.floor(width * 0.04);

  const leftLabel = inputs.leftLabel as string | undefined;
  if (leftLabel) {
    const labelX = orientation === "horizontal" ? Math.floor(width * 0.25) : Math.floor(width * 0.3);
    const labelY = orientation === "horizontal" ? Math.floor(height * 0.05) : Math.floor(height * 0.2);
    layers.push(
      makeTextLayer({
        id: "overlay-split-left-label",
        text: leftLabel,
        fontSize: labelFontSize,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
        x: labelX,
        y: labelY,
        width: Math.floor(width * 0.4),
        originX: "center",
        originY: "top",
      }),
    );
  }

  const rightLabel = inputs.rightLabel as string | undefined;
  if (rightLabel) {
    const labelX = orientation === "horizontal" ? Math.floor(width * 0.75) : Math.floor(width * 0.3);
    const labelY = orientation === "horizontal" ? Math.floor(height * 0.05) : Math.floor(height * 0.7);
    layers.push(
      makeTextLayer({
        id: "overlay-split-right-label",
        text: rightLabel,
        fontSize: labelFontSize,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
        x: labelX,
        y: labelY,
        width: Math.floor(width * 0.4),
        originX: "center",
        originY: "top",
      }),
    );
  }

  return layers;
}

export function templateOverlayToTextLayers(
  templateId: string,
  templateInputs: Record<string, unknown>,
  aspectRatio: string,
  slideCount?: number,
): TextLayerMap {
  switch (templateId) {
    case "fact-card": {
      return { "slide-0": factCardToTextLayers(templateInputs, aspectRatio) };
    }
    case "quote-card": {
      return { "slide-0": quoteCardToTextLayers(templateInputs, aspectRatio) };
    }
    case "pov": {
      return { "slide-0": povToTextLayers(templateInputs, aspectRatio) };
    }
    case "listicle": {
      const count = slideCount ?? (templateInputs.itemCount as number) ?? 5;
      return listicleToTextLayers(templateInputs, aspectRatio, count);
    }
    case "split-screen": {
      return { "slide-0": splitScreenToTextLayers(templateInputs, aspectRatio) };
    }
    default:
      return {};
  }
}