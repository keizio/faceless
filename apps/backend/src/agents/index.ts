import { Agent } from "@mastra/core/agent";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { dashscopeImageTool } from "../mastra/tools/dashscope-image-tool.js";
import type { Mastra } from "@mastra/core/mastra";

const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

const TEXT_MODEL = process.env.AI_TEXT_MODEL ?? "anthropic/claude-3.5-sonnet";
const llm = openrouter(TEXT_MODEL);

export const scriptWriterAgent: Agent = new Agent({
  name: "Script Writer",
  instructions: `You are a professional script writer for faceless social media content.
Given a topic, niche, and target platform, generate an engaging script.
The script should be concise, hook the viewer in the first 3 seconds,
and include clear scene descriptions for visual generation.
Output format: JSON with "hook", "scenes" (array of {narration, visual_description}), and "cta".`,
  model: llm,
});

export const mediaSelectorAgent: Agent = new Agent({
  name: "Media Selector",
  instructions: `You are a media planning agent. Given a script with scene descriptions,
plan the visual media for each scene. Output format: JSON array of {scene_index, media_type, prompt, aspect_ratio}.`,
  model: llm,
  tools: { dashscopeImageTool },
});

export const captionGeneratorAgent: Agent = new Agent({
  name: "Caption Generator",
  instructions: `You are a social media caption expert. Given content type, platform, and script,
generate an optimized caption with hashtags.
Output format: JSON with "caption" and "hashtags" array.`,
  model: llm,
});

export const qualityReviewerAgent: Agent = new Agent({
  name: "Quality Reviewer",
  instructions: `You are a quality assurance agent for AI-generated social media content.
Review the generated content and check for content policy violations, platform guideline compliance,
engagement potential, and brand safety.
Output format: JSON with "approved" boolean, "score" (1-10), and "issues" array.`,
  model: llm,
});
