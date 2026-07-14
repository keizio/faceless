import { Mastra } from "@mastra/core/mastra";

import {
  scriptWriterAgent,
  mediaSelectorAgent,
  captionGeneratorAgent,
  qualityReviewerAgent,
  promptEnhancerAgent,
} from "../agents/index.js";

import { generateImageWorkflow } from "./workflows/generate-image-workflow.js";
import { generateVideoWorkflow } from "./workflows/generate-video-workflow.js";
import { generateContentWorkflow } from "./workflows/generate-content-workflow.js";

export const mastra: Mastra = new Mastra({
  agents: {
    scriptWriter: scriptWriterAgent,
    mediaSelector: mediaSelectorAgent,
    captionGenerator: captionGeneratorAgent,
    qualityReviewer: qualityReviewerAgent,
    promptEnhancer: promptEnhancerAgent,
  },
  workflows: {
    generateImageWorkflow,
    generateVideoWorkflow,
    generateContentWorkflow,
  },
});