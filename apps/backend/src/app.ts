import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { projectRoutes } from "./routes/projects";
import { contentRoutes } from "./routes/contents";
import { avatarRoutes } from "./routes/avatars";
import { jobRoutes } from "./routes/jobs";
import { notificationRoutes } from "./routes/notifications";
import { settingsRoutes } from "./routes/settings";
import { templateRoutes } from "./routes/templates";
import { ideasRoutes } from "./routes/ideas";
import { uploadRoutes } from "./routes/upload";
import { statsRoutes } from "./routes/stats";
import { creditRoutes } from "./routes/credits";
import { rateLimiter } from "./middleware/rate-limiter";
import { errorHandler } from "./middleware/error-handler";

type Bindings = {};
type Variables = {
  userId: string;
  email: string;
  validated?: unknown;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use("/api/*", rateLimiter);
app.use("*", cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.route("/api/auth", authRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/contents", contentRoutes);
app.route("/api/avatars", avatarRoutes);
app.route("/api/jobs", jobRoutes);
app.route("/api/notifications", notificationRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/templates", templateRoutes);
app.route("/api/ideas", ideasRoutes);
app.route("/api/upload", uploadRoutes);
app.route("/api/stats", statsRoutes);
app.route("/api/credits", creditRoutes);

app.get("/api/proxy/image", async (c) => {
  const imageUrl = c.req.query("url");
  if (!imageUrl) return c.json({ error: "Missing url parameter" }, 400);
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    c.header("Content-Type", response.headers.get("Content-Type") ?? "image/png");
    c.header("Cache-Control", "public, max-age=86400");
    c.header("Access-Control-Allow-Origin", "*");
    return c.body(new Uint8Array(buffer));
  } catch {
    return c.json({ error: "Failed to fetch image" }, 502);
  }
});

app.onError(errorHandler);

app.get("/health", (c) => c.json({ status: "ok" }));

export { app };
