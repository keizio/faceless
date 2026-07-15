import { Hono } from "hono";
import { getIdeas, generateAllIdeas, generateIdeasForLanguage } from "../services/ideas";
import { verifyFirebaseToken } from "../middleware/auth";
import type { AppEnv } from "../app";

const ideasRoutes = new Hono<AppEnv>();

ideasRoutes.use("*", verifyFirebaseToken);

ideasRoutes.get("/", async (c) => {
  const language = c.req.query("language") ?? "en";
  const date = c.req.query("date") ?? undefined;

  const result = await getIdeas(language, date);
  return c.json({ ideas: result });
});

ideasRoutes.post("/refresh", async (c) => {
  const language = c.req.query("language");
  if (language) {
    await generateIdeasForLanguage(language);
  } else {
    await generateAllIdeas();
  }
  return c.json({ success: true });
});

export { ideasRoutes };