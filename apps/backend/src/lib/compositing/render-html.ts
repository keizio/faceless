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
        data: await loadFontData(400),
        weight: 400,
        style: "normal" as const,
      },
      {
        name: "Inter",
        data: await loadFontData(700),
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

const fontCache = new Map<number, Buffer>();

async function loadFontData(weight: number): Promise<Buffer> {
  if (fontCache.has(weight)) return fontCache.get(weight)!;
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-${weight}-normal.woff`;
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fontCache.set(weight, buffer);
  return buffer;
}