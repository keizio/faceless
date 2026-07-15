import { generationQueue } from "../lib/queue.js";
import type { GenerationJobPayload } from "../lib/queue.js";

export async function enqueueAvatarGeneration(
  data: Omit<GenerationJobPayload, "type">,
) {
  await generationQueue.add("avatar-generation", {
    ...data,
    type: "avatar-generation",
  }, { jobId: data.jobId });
}