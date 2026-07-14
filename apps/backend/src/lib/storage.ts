import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const CDN_BASE = process.env.R2_PUBLIC_URL || "https://cdn.solutip.com";
const BUCKET = process.env.R2_BUCKET_NAME || "faceless-media";

function getR2Client() {
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
  return uploadFile(buffer, "generated.mp4", "video/mp4");
}

export function getR2PublicUrl(key: string): string {
  return `${CDN_BASE}/${key}`;
}