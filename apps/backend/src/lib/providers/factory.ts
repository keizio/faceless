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
} from "./openrouter.js";
import { ElevenLabsAudioProvider } from "./elevenlabs.js";
import {
  GoogleAIStudioTextProvider,
  GoogleAIStudioImageProvider,
  GoogleAIStudioVideoProvider,
  GoogleAIStudioAudioProvider,
  GoogleAIStudioMusicProvider,
} from "./google-ai-studio.js";
import {
  GoogleVertexTextProvider,
  GoogleVertexImageProvider,
  GoogleVertexVideoProvider,
  GoogleVertexAudioProvider,
  GoogleVertexMusicProvider,
} from "./google-vertex-ai.js";
import {
  ModelArkTextProvider,
  ModelArkImageProvider,
  ModelArkVideoProvider,
  ModelArkAudioProvider,
  ModelArkMusicProvider,
} from "./model-ark.js";
import {
  ReplicateTextProvider,
  ReplicateImageProvider,
  ReplicateVideoProvider,
  ReplicateAudioProvider,
  ReplicateMusicProvider,
} from "./replicate.js";
import {
  LocalTextProvider,
  LocalImageProvider,
  LocalVideoProvider,
  LocalAudioProvider,
  LocalMusicProvider,
} from "./local.js";

type ProviderName = "dashscope" | "openrouter" | "elevenlabs" | "google-ai-studio" | "google-vertex-ai" | "model-ark" | "replicate" | "local";

function getEnvVar(suffix: string): ProviderName {
  const val = process.env[`AI_${suffix}_PROVIDER`];
  if (val === "openrouter") return "openrouter";
  if (val === "elevenlabs") return "elevenlabs";
  if (val === "google-ai-studio") return "google-ai-studio";
  if (val === "google-vertex-ai") return "google-vertex-ai";
  if (val === "model-ark") return "model-ark";
  if (val === "replicate") return "replicate";
  if (val === "local") return "local";
  return "dashscope";
}

function resolveText(name: ProviderName): TextProvider {
  switch (name) {
    case "dashscope":
      return new DashScopeTextProvider();
    case "openrouter":
      return new OpenRouterTextProvider();
    case "google-ai-studio":
      return new GoogleAIStudioTextProvider();
    case "google-vertex-ai":
      return new GoogleVertexTextProvider();
    case "model-ark":
      return new ModelArkTextProvider();
    case "replicate":
      return new ReplicateTextProvider();
    case "local":
      return new LocalTextProvider();
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
    case "google-ai-studio":
      return new GoogleAIStudioImageProvider();
    case "google-vertex-ai":
      return new GoogleVertexImageProvider();
    case "model-ark":
      return new ModelArkImageProvider();
    case "replicate":
      return new ReplicateImageProvider();
    case "local":
      return new LocalImageProvider();
    default:
      throw new Error(`Unknown image provider: ${name}`);
  }
}

function resolveVideo(name: ProviderName): VideoProvider {
  switch (name) {
    case "google-ai-studio":
      return new GoogleAIStudioVideoProvider();
    case "google-vertex-ai":
      return new GoogleVertexVideoProvider();
    case "model-ark":
      return new ModelArkVideoProvider();
    case "replicate":
      return new ReplicateVideoProvider();
    case "local":
      return new LocalVideoProvider();
    default:
      return new DashScopeVideoProvider();
  }
}

function resolveAudio(name: ProviderName): AudioProvider {
  switch (name) {
    case "elevenlabs":
      return new ElevenLabsAudioProvider();
    case "google-ai-studio":
      return new GoogleAIStudioAudioProvider();
    case "google-vertex-ai":
      return new GoogleVertexAudioProvider();
    case "model-ark":
      return new ModelArkAudioProvider();
    case "replicate":
      return new ReplicateAudioProvider();
    case "local":
      return new LocalAudioProvider();
    default:
      return new DashScopeAudioProvider();
  }
}

function resolveMusic(name: ProviderName): MusicProvider {
  switch (name) {
    case "google-ai-studio":
      return new GoogleAIStudioMusicProvider();
    case "google-vertex-ai":
      return new GoogleVertexMusicProvider();
    case "model-ark":
      return new ModelArkMusicProvider();
    case "replicate":
      return new ReplicateMusicProvider();
    case "local":
      return new LocalMusicProvider();
    default:
      return new DashScopeMusicProvider();
  }
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
