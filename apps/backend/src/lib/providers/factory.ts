import type { TextProvider, ImageProvider, VideoProvider, AudioProvider, MusicProvider, Providers } from "./types.js";
import {
  DashScopeTextProvider,
  DashScopeImageProvider,
  DashScopeVideoProvider,
  DashScopeAudioProvider,
  DashScopeMusicProvider,
} from "./dashscope.js";
import {
  OpenRouterTextProvider,
  OpenRouterImageProvider,
  OpenRouterVideoProvider,
} from "./openrouter.js";

type ProviderName = "dashscope" | "openrouter";

function getEnvVar(suffix: string): ProviderName {
  const val = process.env[`AI_${suffix}_PROVIDER`];
  if (val === "openrouter") return "openrouter";
  return "dashscope";
}

function resolveText(name: ProviderName): TextProvider {
  switch (name) {
    case "dashscope":
      return new DashScopeTextProvider();
    case "openrouter":
      return new OpenRouterTextProvider();
    default:
      throw new Error(`Unknown text provider: ${name}`);
  }
}

function resolveImage(name: ProviderName): ImageProvider {
  switch (name) {
    case "dashscope":
      return new DashScopeImageProvider();
    case "openrouter":
      return new OpenRouterImageProvider();
    default:
      throw new Error(`Unknown image provider: ${name}`);
  }
}

function resolveVideo(name: ProviderName): VideoProvider {
  switch (name) {
    case "dashscope":
      return new DashScopeVideoProvider();
    case "openrouter":
      return new OpenRouterVideoProvider();
    default:
      throw new Error(`Unknown video provider: ${name}`);
  }
}

function resolveAudio(_name: ProviderName): AudioProvider {
  return new DashScopeAudioProvider();
}

function resolveMusic(_name: ProviderName): MusicProvider {
  return new DashScopeMusicProvider();
}

function createProviders(): Providers {
  return {
    text: resolveText(getEnvVar("TEXT")),
    image: resolveImage(getEnvVar("IMAGE")),
    video: resolveVideo(getEnvVar("VIDEO")),
    audio: resolveAudio(getEnvVar("AUDIO")),
    music: resolveMusic(getEnvVar("MUSIC")),
  };
}

let cached: Providers | null = null;

export function getProviders(): Providers {
  if (!cached) {
    cached = createProviders();
  }
  return cached;
}

export function resetProviders(): void {
  cached = null;
}
