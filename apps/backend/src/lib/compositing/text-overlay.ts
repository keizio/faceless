import sharp from "sharp";

export interface TextStyleOptions {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  x?: number;
  y?: number;
  maxWidth?: number;
  textAlign?: "left" | "center" | "right";
  fontWeight?: "normal" | "bold";
  lineHeight?: number;
}

export async function overlayText(
  background: Buffer,
  options: TextStyleOptions,
): Promise<Buffer> {
  const {
    text,
    fontSize = 48,
    fontFamily = "Inter, sans-serif",
    color = "white",
    x = 0,
    y = 0,
    maxWidth,
    textAlign = "center",
    fontWeight = "bold",
    lineHeight = 1.4,
  } = options;

  const metadata = await sharp(background).metadata();
  const width = metadata.width ?? 1080;
  const textMaxWidth = maxWidth ?? width - 80;

  const svgText = `
    <svg width="${width}" height="${metadata.height ?? 1080}">
      <style>
        text {
          font-family: ${fontFamily};
          font-size: ${fontSize}px;
          font-weight: ${fontWeight};
          fill: ${color};
          text-anchor: ${textAlign === "center" ? "middle" : textAlign === "right" ? "end" : "start"};
          line-height: ${lineHeight};
        }
      </style>
      <foreignObject x="${x}" y="${y}" width="${textMaxWidth}" height="${(metadata.height ?? 1080) - y}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          font-family: ${fontFamily};
          font-size: ${fontSize}px;
          font-weight: ${fontWeight};
          color: ${color};
          text-align: ${textAlign};
          line-height: ${lineHeight};
          word-wrap: break-word;
        ">
          ${text}
        </div>
      </foreignObject>
    </svg>
  `;

  const textBuffer = Buffer.from(svgText);

  return sharp(background)
    .composite([{ input: textBuffer, left: 0, top: 0 }])
    .png()
    .toBuffer();
}
