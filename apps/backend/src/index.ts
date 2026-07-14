import { config } from "dotenv";
config();

const port = Number(process.env.PORT) || 3001;

const { serve } = await import("@hono/node-server");
const { app } = await import("./app");

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
