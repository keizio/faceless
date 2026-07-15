import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { AvatarService } from "../services/avatar";
import { createAvatarSchema, updateAvatarSchema } from "@faceless/shared";
import type { CreateAvatarInput, UpdateAvatarInput } from "@faceless/shared";
import type { AppEnv } from "../app";
import { uploadFile } from "../lib/storage";

export const avatarRoutes = new Hono<AppEnv>();

avatarRoutes.use("*", verifyFirebaseToken);

avatarRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const service = new AvatarService();
  const avatars = await service.listAvatars(userId);
  return c.json({ avatars });
});

avatarRoutes.post("/", validate(createAvatarSchema), async (c) => {
  const userId = c.get("userId");
  const data = c.get("validated") as CreateAvatarInput;
  const service = new AvatarService();
  const avatar = await service.createAvatar(userId, data);
  return c.json({ avatar }, 201);
});

avatarRoutes.post("/:id/upload", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new AvatarService();

  const body = await c.req.parseBody();
  const file = body["image"] as File | undefined;
  if (!file) return c.json({ error: "No image file provided" }, 400);

  if (!file.type.startsWith("image/")) {
    return c.json({ error: "File must be an image" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadFile(buffer, file.name, file.type);

  const avatar = await service.updateAvatar(userId, id, { referenceImageUrl: url });
  return c.json({ avatar });
});

avatarRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new AvatarService();
  const avatar = await service.getAvatar(userId, id);
  return c.json({ avatar });
});

avatarRoutes.put("/:id", validate(updateAvatarSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id")!;
  const data = c.get("validated") as UpdateAvatarInput;
  const service = new AvatarService();
  const avatar = await service.updateAvatar(userId, id, data);
  return c.json({ avatar });
});

avatarRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new AvatarService();
  await service.deleteAvatar(userId, id);
  return c.json({ success: true });
});

avatarRoutes.post("/:id/generate", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const customPrompt = body.customPrompt as string | undefined;
  const service = new AvatarService();
  const result = await service.generateCharacterSheet(userId, id, customPrompt);
  return c.json(result);
});