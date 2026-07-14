import { config } from "dotenv";
config();

const { createGenerationWorker, redisConnection } = await import("./lib/queue.js");
const { jobHandler } = await import("./worker/handlers.js");

const worker = createGenerationWorker(jobHandler);
console.log("[worker] Generation worker started, waiting for jobs...");

process.on("SIGTERM", async () => {
  console.log("[worker] SIGTERM received, shutting down gracefully...");
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[worker] SIGINT received, shutting down gracefully...");
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
});
