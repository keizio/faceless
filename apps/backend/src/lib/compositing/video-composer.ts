import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { uploadFile, randomFilename } from "../storage";

export async function composeVideoWithAudio(
  videoUrls: string[],
  audioUrl?: string,
  sceneAudioUrls?: string[],
): Promise<string> {
  if (videoUrls.length === 0) {
    throw new Error("No video URLs provided for compositing");
  }

  if (videoUrls.length === 1 && !audioUrl && (!sceneAudioUrls || sceneAudioUrls.length === 0)) {
    return videoUrls[0];
  }

  const workDir = join(tmpdir(), `video-compose-${randomUUID()}`);
  const outputFile = join(workDir, `output-${randomUUID()}.mp4`);

  try {
    execSync(`mkdir -p "${workDir}"`, { stdio: "ignore" });

    if (sceneAudioUrls && sceneAudioUrls.length > 0) {
      return await composePerScene(
        videoUrls,
        sceneAudioUrls,
        workDir,
        outputFile,
      );
    }

    const concatFile = join(workDir, "concat.txt");
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

    const buffer = readFileSync(outputFile);
    const finalUrl = await uploadFile(buffer, randomFilename("mp4"), "video/mp4");

    return finalUrl;
  } finally {
    try {
      execSync(`rm -rf "${workDir}"`, { stdio: "ignore" });
    } catch {}
  }
}

async function composePerScene(
  videoUrls: string[],
  sceneAudioUrls: string[],
  workDir: string,
  outputFile: string,
): Promise<string> {
  const sceneCount = Math.min(videoUrls.length, sceneAudioUrls.length);
  const sceneClipFiles: string[] = [];

  for (let i = 0; i < sceneCount; i++) {
    const videoPath = join(workDir, `scene-video-${i}.mp4`);
    const audioPath = join(workDir, `scene-audio-${i}.mp3`);
    const sceneOutput = join(workDir, `scene-merged-${i}.mp4`);

    execSync(`curl -sL "${videoUrls[i]}" -o "${videoPath}"`, { stdio: "ignore" });
    execSync(`curl -sL "${sceneAudioUrls[i]}" -o "${audioPath}"`, { stdio: "ignore" });

    execSync(
      `ffmpeg -y -stream_loop -1 -i "${videoPath}" -i "${audioPath}" -c:v libx264 -preset fast -c:a aac -shortest -map 0:v:0 -map 1:a:0 "${sceneOutput}"`,
      { stdio: "ignore", timeout: 300_000 },
    );

    sceneClipFiles.push(sceneOutput);
  }

  if (sceneClipFiles.length === 1) {
    const buffer = readFileSync(sceneClipFiles[0]);
    return await uploadFile(buffer, randomFilename("mp4"), "video/mp4");
  }

  const concatFile = join(workDir, "concat.txt");
  const concatContent = sceneClipFiles
    .map((f) => `file '${f}'`)
    .join("\n");
  writeFileSync(concatFile, concatContent);

  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${outputFile}"`,
    { stdio: "ignore", timeout: 300_000 },
  );

  const buffer = readFileSync(outputFile);
  return await uploadFile(buffer, randomFilename("mp4"), "video/mp4");
}