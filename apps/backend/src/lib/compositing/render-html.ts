import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { ReactElement } from "react";

export async function renderHtmlToImage(
  element: ReactElement,
  width: number,
  height: number,
): Promise<Buffer> {
  const svg = await satori(element, {
    width,
    height,
    fonts: [
      {
        name: "Inter",
        data: await loadFontData(),
        weight: 400,
        style: "normal" as const,
      },
      {
        name: "Inter",
        data: await loadFontData(),
        weight: 700,
        style: "normal" as const,
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

let fontCache: Buffer | null = null;

async function loadFontData(): Promise<Buffer> {
  if (fontCache) return fontCache;
  const fontUrl = "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff";
  const response = await fetch(fontUrl);
  const arrayBuffer = await response.arrayBuffer();
  fontCache = Buffer.from(arrayBuffer);
  return fontCache;
}
