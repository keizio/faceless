import { Hono } from "hono";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { verifyFirebaseToken } from "../middleware/auth";
import { AuthService } from "../services/auth";
import type { AppEnv } from "../app";

const updateLanguageSchema = z.object({
  language: z.string().min(1).max(10),
});

export const settingsRoutes = new Hono<AppEnv>();

settingsRoutes.use("*", verifyFirebaseToken);

settingsRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const service = new AuthService();
  const user = await service.getUser(userId);
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json({ language: user.language });
});

settingsRoutes.patch("/", validate(updateLanguageSchema), async (c) => {
  const userId = c.get("userId");
  const { language } = c.get("validated") as z.infer<typeof updateLanguageSchema>;
  const service = new AuthService();
  const user = await service.updateLanguage(userId, language);
  return c.json({ language: user.language });
});