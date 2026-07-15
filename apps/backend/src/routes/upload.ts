import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth.js";
import { uploadFile, randomFilename } from "../lib/storage.js";
import type { AppEnv } from "../app.js";

const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3"];
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024;

export const uploadRoutes = new Hono<AppEnv>();

uploadRoutes.use("*", verifyFirebaseToken);

uploadRoutes.post("/audio", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return c.json({ error: "Invalid file type. Allowed: mp3, wav, ogg" }, 400);
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: "File too large. Max 10MB" }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.type.split("/")[1] === "mpeg" ? "mp3" : file.type.split("/")[1];
  const url = await uploadFile(buffer, randomFilename(ext), file.type);

  return c.json({ url });
});

uploadRoutes.post("/image", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return c.json({ error: "Invalid file type. Allowed: PNG, JPG, WebP, GIF" }, 400);
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: "File too large. Max 10MB" }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const url = await uploadFile(buffer, randomFilename(ext), file.type);

  return c.json({ url });
});
