import { renderHtmlToImage } from "./render-html.js";
import { compositeImages, createBaseImage } from "./composite.js";
import { createSplitScreen } from "./split-screen.js";
import { overlayText } from "./text-overlay.js";
import { ChatUIComponent } from "./templates/chat-ui.js";
import { FactCardComponent } from "./templates/fact-card.js";
import { QuoteCardComponent } from "./templates/quote-card.js";
import type { ReactElement } from "react";

export interface CompositeResult {
  imageUrl: string;
}

function getImageDimensions(aspectRatio: string): { width: number; height: number } {
  const dims: Record<string, { width: number; height: number }> = {
    "9:16": { width: 1080, height: 1920 },
    "16:9": { width: 1920, height: 1080 },
    "1:1": { width: 1080, height: 1080 },
    "4:5": { width: 1080, height: 1350 },
  };
  return dims[aspectRatio] ?? { width: 1080, height: 1080 };
}

export async function renderChatTemplate(
  inputs: Record<string, unknown>,
  aspectRatio: string,
): Promise<Buffer> {
  const { width, height } = getImageDimensions(aspectRatio);
  const chatStyle = (inputs.chatStyle as string) ?? "whatsapp";
  const senderName = (inputs.senderName as string) ?? "You";
  const receiverName = (inputs.receiverName as string) ?? "Friend";
  const rawMessages = (inputs.messages as { sender: string; text: string }[]) ?? [];
  const messages: { sender: "left" | "right"; text: string }[] = rawMessages.map((m) => ({
    sender: m.sender === "you" ? "right" : "left",
    text: m.text,
  }));

  const element = ChatUIComponent({
    messages,
    style: chatStyle as "whatsapp" | "imessage" | "dm" | "telegram",
    senderName,
    receiverName,
    width,
    height,
  }) as ReactElement;

  return renderHtmlToImage(element, width, height);
}

export async function renderFactCardTemplate(
  inputs: Record<string, unknown>,
  aspectRatio: string,
  backgroundImage?: Buffer,
): Promise<Buffer> {
  const { width, height } = getImageDimensions(aspectRatio);
  const factText = (inputs.factText as string) ?? "";
  const topic = (inputs.topic as string) ?? "";
  const style = (inputs.style as string) ?? "bold";
  const source = inputs.source as string | undefined;

  if (backgroundImage) {
    const element = FactCardComponent({
      factText,
      topic,
      style: style as "bold" | "minimal" | "neon" | "pastel",
      source,
      width,
      height,
    }) as ReactElement;

    const overlay = await renderHtmlToImage(element, width, height);
    return compositeImages(backgroundImage, [{ input: overlay }]);
  }

  const element = FactCardComponent({
    factText,
    topic,
    style: style as "bold" | "minimal" | "neon" | "pastel",
    source,
    width,
    height,
  }) as ReactElement;

  return renderHtmlToImage(element, width, height);
}

export async function renderQuoteCardTemplate(
  inputs: Record<string, unknown>,
  aspectRatio: string,
  backgroundImage?: Buffer,
): Promise<Buffer> {
  const { width, height } = getImageDimensions(aspectRatio);
  const quoteText = (inputs.quoteText as string) ?? "";
  const author = inputs.author as string | undefined;
  const style = (inputs.style as string) ?? "elegant";

  if (backgroundImage) {
    const element = QuoteCardComponent({
      quoteText,
      author,
      style: style as "elegant" | "bold" | "minimal" | "gradient",
      width,
      height,
    }) as ReactElement;

    const overlay = await renderHtmlToImage(element, width, height);
    return compositeImages(backgroundImage, [{ input: overlay }]);
  }

  const element = QuoteCardComponent({
    quoteText,
    author,
    style: style as "elegant" | "bold" | "minimal" | "gradient",
    width,
    height,
  }) as ReactElement;

  return renderHtmlToImage(element, width, height);
}

export async function renderSplitScreenTemplate(
  inputs: Record<string, unknown>,
  aspectRatio: string,
  leftImage: Buffer,
  rightImage: Buffer,
): Promise<Buffer> {
  const { width, height } = getImageDimensions(aspectRatio);
  const orientation = (inputs.orientation as string) ?? "horizontal";
  const leftLabel = inputs.leftLabel as string | undefined;
  const rightLabel = inputs.rightLabel as string | undefined;

  let composited = await createSplitScreen(
    leftImage,
    rightImage,
    orientation as "horizontal" | "vertical",
    width,
    height,
  );

  if (leftLabel || rightLabel) {
    const labelFontSize = Math.floor(width * 0.04);
    if (leftLabel) {
      const labelX = orientation === "horizontal" ? Math.floor(width * 0.1) : Math.floor(width * 0.3);
      const labelY = orientation === "horizontal" ? Math.floor(height * 0.05) : Math.floor(height * 0.2);
      composited = await overlayText(composited, {
        text: leftLabel,
        fontSize: labelFontSize,
        color: "white",
        x: labelX,
        y: labelY,
        textAlign: "center",
      });
    }
    if (rightLabel) {
      const labelX = orientation === "horizontal" ? Math.floor(width * 0.6) : Math.floor(width * 0.3);
      const labelY = orientation === "horizontal" ? Math.floor(height * 0.05) : Math.floor(height * 0.7);
      composited = await overlayText(composited, {
        text: rightLabel,
        fontSize: labelFontSize,
        color: "white",
        x: labelX,
        y: labelY,
        textAlign: "center",
      });
    }
  }

  return composited;
}

export async function renderListicleCardTemplate(
  inputs: Record<string, unknown>,
  aspectRatio: string,
  itemNumber: number,
  itemTitle: string,
  itemDescription: string,
  totalItems: number,
  backgroundImage?: Buffer,
): Promise<Buffer> {
  const { width, height } = getImageDimensions(aspectRatio);
  const style = (inputs.style as string) ?? "numbered";
  const topic = (inputs.topic as string) ?? "";

  const numberSize = Math.floor(width * 0.15);
  const titleSize = Math.floor(width * 0.05);
  const descSize = Math.floor(width * 0.03);

  const numberSvg = `
    <svg width="${width}" height="${height}">
      <style>
        .number { font-family: Inter, sans-serif; font-size: ${numberSize}px; font-weight: 900; fill: rgba(255,255,255,0.15); }
        .title { font-family: Inter, sans-serif; font-size: ${titleSize}px; font-weight: 700; fill: white; }
        .desc { font-family: Inter, sans-serif; font-size: ${descSize}px; font-weight: 400; fill: rgba(255,255,255,0.8); }
        .topic { font-family: Inter, sans-serif; font-size: ${Math.floor(width * 0.025)}px; font-weight: 600; fill: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 2px; }
      </style>
      <text class="number" x="${width * 0.08}" y="${height * 0.35}">${itemNumber}</text>
      <text class="topic" x="${width * 0.08}" y="${height * 0.08}">${topic}</text>
      <foreignObject x="${width * 0.08}" y="${height * 0.45}" width="${width * 0.84}" height="${height * 0.5}">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <p style="font-family: Inter, sans-serif; font-size: ${titleSize}px; font-weight: 700; color: white; margin: 0 0 12px 0;">${itemTitle}</p>
          <p style="font-family: Inter, sans-serif; font-size: ${descSize}px; font-weight: 400; color: rgba(255,255,255,0.8); margin: 0; line-height: 1.5;">${itemDescription}</p>
        </div>
      </foreignObject>
    </svg>
  `;

  const textBuffer = Buffer.from(numberSvg);

  if (backgroundImage) {
    return compositeImages(backgroundImage, [{ input: textBuffer }]);
  }

  const base = await createBaseImage(width, height, "#1a1a2e");
  return compositeImages(base, [{ input: textBuffer }]);
}
