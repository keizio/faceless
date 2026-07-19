import type { AudioProvider, AudioResult } from "./types.js";
import { uploadFile, randomFilename } from "../storage.js";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL = "eleven_multilingual_v2";

export class ElevenLabsAudioProvider implements AudioProvider {
  async generate(text: string, voice?: string): Promise<AudioResult> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    const voiceId = voice ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: DEFAULT_MODEL,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(`ElevenLabs API error: ${response.status} ${errorBody}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const url = await uploadFile(buffer, randomFilename("mp3"), "audio/mpeg");

    const durationMs = Math.round(text.length * 75);

    return { url, durationMs };
  }
}