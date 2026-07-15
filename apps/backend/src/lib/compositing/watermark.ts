import sharp from "sharp";

export async function applyWatermarkToBuffer(
  imageBuffer: Buffer,
  logoUrl: string,
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 1080;
  const height = metadata.height ?? 1080;

  const logoSize = Math.round(width * 0.1);
  const padding = Math.round(width * 0.04);

  let logoBuffer: Buffer;
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      return imageBuffer;
    }
    const arrayBuffer = await response.arrayBuffer();
    logoBuffer = Buffer.from(arrayBuffer);
  } catch {
    return imageBuffer;
  }

  const resizedLogo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const compositeImage = await image
    .composite([
      {
        input: resizedLogo,
        left: width - logoSize - padding,
        top: height - logoSize - padding,
      },
    ])
    .png()
    .toBuffer();

  return compositeImage;
}