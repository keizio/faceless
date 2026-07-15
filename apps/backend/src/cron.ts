import { config } from "dotenv";
config();

import cron from "node-cron";
import { generateAllIdeas } from "./services/ideas";

const CRON_SCHEDULE = process.env.IDEAS_CRON_SCHEDULE ?? "0 0 * * *";

async function runDailyIdeas() {
  console.log("[cron] Starting daily ideas generation...");
  try {
    const result = await generateAllIdeas();
    console.log(`[cron] Generated ideas for ${result.count} languages: ${result.languages.join(", ")}`);
  } catch (error) {
    console.error("[cron] Ideas generation failed:", error);
  }
}

cron.schedule(CRON_SCHEDULE, () => {
  runDailyIdeas();
});

console.log(`[cron] Ideas cron scheduled with pattern: ${CRON_SCHEDULE}`);

process.on("SIGTERM", () => {
  console.log("[cron] SIGTERM received, shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[cron] SIGINT received, shutting down...");
  process.exit(0);
});