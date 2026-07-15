import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { uploadFile, randomFilename } from "../storage";

export async function composeVideoWithAudio(
  videoUrls: string[],
  audioUrl?: string,
): Promise<string> {
  if (videoUrls.length === 0) {
    throw new Error("No video URLs provided for compositing");
  }

  if (videoUrls.length === 1 && !audioUrl) {
    return videoUrls[0];
  }

  const workDir = join(tmpdir(), `video-compose-${randomUUID()}`);
  const concatFile = join(workDir, "concat.txt");
  const outputFile = join(workDir, `output-${randomUUID()}.mp4`);

  try {
    execSync(`mkdir -p "${workDir}"`, { stdio: "ignore" });

    const urls = audioUrl ? [...videoUrls, audioUrl] : videoUrls;

    const fileList = videoUrls
      .map((url) => `file '${url}'`)
      .join("\n");
    writeFileSync(concatFile, fileList);

    if (audioUrl) {
      const audioPath = join(workDir, "audio.mp3");
      execSync(`curl -sL "${audioUrl}" -o "${audioPath}"`, { stdio: "ignore" });

      const hasMultipleVideos = videoUrls.length > 1;

      if (hasMultipleVideos) {
        execSync(
          `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -i "${audioPath}" -c:v libx264 -preset fast -c:a aac -shortest -map 0:v:0 -map 1:a:0 "${outputFile}"`,
          { stdio: "ignore", timeout: 300_000 },
        );
      } else {
        execSync(
          `ffmpeg -y -i "${videoUrls[0]}" -i "${audioPath}" -c:v copy -c:a aac -shortest -map 0:v:0 -map 1:a:0 "${outputFile}"`,
          { stdio: "ignore", timeout: 300_000 },
        );
      }
    } else {
      execSync(
        `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${outputFile}"`,
        { stdio: "ignore", timeout: 300_000 },
      );
    }

    const buffer = require("fs").readFileSync(outputFile);
    const finalUrl = await uploadFile(buffer, randomFilename("mp4"), "video/mp4");

    return finalUrl;
  } finally {
    try {
      execSync(`rm -rf "${workDir}"`, { stdio: "ignore" });
    } catch {}
  }
}