import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { projectRoutes } from "./routes/projects";
import { contentRoutes } from "./routes/contents";
import { jobRoutes } from "./routes/jobs";
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
app.use("*", cors());

app.route("/api/auth", authRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/projects", contentRoutes);
app.route("/api/jobs", jobRoutes);

app.onError(errorHandler);

app.get("/health", (c) => c.json({ status: "ok" }));

export { app };
