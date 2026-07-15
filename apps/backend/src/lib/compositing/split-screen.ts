import sharp from "sharp";

export async function createSplitScreen(
  left: Buffer,
  right: Buffer,
  orientation: "horizontal" | "vertical",
  targetWidth: number,
  targetHeight: number,
): Promise<Buffer> {
  if (orientation === "horizontal") {
    const halfWidth = Math.floor(targetWidth / 2);
    const leftResized = await sharp(left)
      .resize(halfWidth, targetHeight, { fit: "cover" })
      .png()
      .toBuffer();
    const rightResized = await sharp(right)
      .resize(halfWidth, targetHeight, { fit: "cover" })
      .png()
      .toBuffer();

    return sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: leftResized, left: 0, top: 0 },
        { input: rightResized, left: halfWidth, top: 0 },
      ])
      .png()
      .toBuffer();
  } else {
    const halfHeight = Math.floor(targetHeight / 2);
    const topResized = await sharp(left)
      .resize(targetWidth, halfHeight, { fit: "cover" })
      .png()
      .toBuffer();
    const bottomResized = await sharp(right)
      .resize(targetWidth, halfHeight, { fit: "cover" })
      .png()
      .toBuffer();

    return sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: topResized, left: 0, top: 0 },
        { input: bottomResized, left: 0, top: halfHeight },
      ])
      .png()
      .toBuffer();
  }
}
