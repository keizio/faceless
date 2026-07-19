import { Mastra } from "@mastra/core/mastra";

import {
  scriptWriterAgent,
  mediaSelectorAgent,
  captionGeneratorAgent,
  qualityReviewerAgent,
  promptEnhancerAgent,
  ideaGeneratorAgent,
  continuityCheckerAgent,
} from "../agents/index.js";

import { generateImageWorkflow } from "./workflows/generate-image-workflow.js";
import { generateVideoWorkflow } from "./workflows/generate-video-workflow.js";
import { generateContentWorkflow } from "./workflows/generate-content-workflow.js";
import { generateAvatarWorkflow } from "./workflows/generate-avatar-workflow.js";
import { generateMusicVideoWorkflow } from "./workflows/generate-music-video-workflow.js";

export const mastra: Mastra = new Mastra({
  agents: {
    scriptWriter: scriptWriterAgent,
    mediaSelector: mediaSelectorAgent,
    captionGenerator: captionGeneratorAgent,
    qualityReviewer: qualityReviewerAgent,
    promptEnhancer: promptEnhancerAgent,
    ideaGenerator: ideaGeneratorAgent,
    continuityChecker: continuityCheckerAgent,
  },
  workflows: {
    generateImageWorkflow,
    generateVideoWorkflow,
    generateContentWorkflow,
    generateAvatarWorkflow,
    generateMusicVideoWorkflow,
  },
});