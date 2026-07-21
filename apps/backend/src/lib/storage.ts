import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID, randomBytes } from "node:crypto";

const CDN_BASE = process.env.R2_PUBLIC_URL || "https://cdn.solutip.com";
const BUCKET = process.env.R2_BUCKET_NAME || "faceless-media";

export function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  if (!process.env.R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME not set. Configure R2 storage.");
  }

  const ext = filename.split(".").pop() ?? "bin";
  const key = `uploads/${randomUUID()}.${ext}`;
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `${CDN_BASE}/${key}`;
}

export async function downloadAndStoreVideoUrl(
  videoUrl: string,
): Promise<string> {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download video from ${videoUrl}: ${response.status} ${response.statusText}`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return uploadFile(buffer, randomFilename("mp4"), "video/mp4");
}

export async function downloadAndStoreImageUrl(
  imageUrl: string,
): Promise<string> {
  if (imageUrl.startsWith(CDN_BASE + "/")) {
    return imageUrl;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download image from ${imageUrl}: ${response.status} ${response.statusText}`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/png";
  const ext = contentType.split("/")[1] || "png";

  return uploadFile(buffer, randomFilename(ext), contentType);
}

export async function downloadAndStoreAudioUrl(
  audioUrl: string,
): Promise<string> {
  if (audioUrl.startsWith(CDN_BASE + "/")) {
    return audioUrl;
  }

  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download audio from ${audioUrl}: ${response.status} ${response.statusText}`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return uploadFile(buffer, randomFilename("mp3"), "audio/mpeg");
}

export function randomFilename(ext: string): string {
  const hash = randomBytes(16).toString("hex");
  return `${hash}.${ext}`;
}

export function getR2PublicUrl(key: string): string {
  return `${CDN_BASE}/${key}`;
}

export async function deleteFile(url: string): Promise<void> {
  const key = url.replace(`${CDN_BASE}/`, "");
  if (!key || key === url) return;
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}