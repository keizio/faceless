import sharp from "sharp";

export interface CompositeLayer {
  input: Buffer;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

export async function compositeImages(
  base: Buffer,
  layers: CompositeLayer[],
): Promise<Buffer> {
  const image = sharp(base);
  const result = image.composite(
    layers.map((layer) => ({
      input: layer.input,
      left: layer.left ?? 0,
      top: layer.top ?? 0,
      ...((layer.width || layer.height)
        ? { resize: { width: layer.width, height: layer.height, fit: "cover" as const } }
        : {}),
    })),
  );
  return result.png().toBuffer();
}

export async function createBaseImage(
  width: number,
  height: number,
  color: string = "#000000",
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toBuffer();
}
