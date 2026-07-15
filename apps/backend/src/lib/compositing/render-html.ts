import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { ReactElement } from "react";

export async function renderHtmlToImage(
  element: ReactElement,
  width: number,
  height: number,
  fontFamily?: string,
): Promise<Buffer> {
  const fontName = fontFamily ?? "Inter";
  const fonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] = [];

  if (fontName === "Inter" || !fontName) {
    fonts.push(
      { name: "Inter", data: await loadFontData(400), weight: 400, style: "normal" as const },
      { name: "Inter", data: await loadFontData(700), weight: 700, style: "normal" as const },
    );
  } else {
    const fontData = await loadCustomFont(fontName);
    fonts.push(
      { name: fontName, data: fontData, weight: 400, style: "normal" as const },
      { name: fontName, data: fontData, weight: 700, style: "normal" as const },
    );
  }

  const svg = await satori(element, {
    width,
    height,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

const fontCache = new Map<string, Buffer>();

async function loadFontData(weight: number): Promise<Buffer> {
  const key = `Inter-${weight}`;
  if (fontCache.has(key)) return fontCache.get(key)!;
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-${weight}-normal.woff`;
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fontCache.set(key, buffer);
  return buffer;
}

async function loadCustomFont(fontName: string): Promise<Buffer> {
  const key = `custom-${fontName}`;
  if (fontCache.has(key)) return fontCache.get(key)!;
  const slug = fontName.toLowerCase().replace(/\s+/g, "-");
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/latin-400-normal.woff`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fontCache.set(key, buffer);
      return buffer;
    }
  } catch {}
  return fontCache.get("Inter-400") ?? await loadFontData(400);
}