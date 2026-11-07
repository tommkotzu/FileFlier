// Records a showcase page frame by frame: the page draws any moment with
// window.seek(t), so every frame is exact however long a screenshot takes.
//
//   node record.mjs <url> <out-name> [fps]
//
// Writes <out-name>.mp4 (1280×800) and <out-name>.gif (800 px wide) to ../media.
// Needs Chromium (CHROMIUM=/path to override) and ffmpeg.
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer-core";

const [url, name, fpsArg] = process.argv.slice(2);
if (!url || !name) {
  console.error("usage: node record.mjs <url> <out-name> [fps]");
  process.exit(1);
}
const fps = Number(fpsArg || 30);
const here = dirname(fileURLToPath(import.meta.url));
const media = join(here, "..", "media");
mkdirSync(media, { recursive: true });
const frames = mkdtempSync(join(process.env.FRAMES_DIR || tmpdir(), "ff-frames-"));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM || "/snap/bin/chromium",
  headless: true,
  args: ["--hide-scrollbars", "--force-device-scale-factor=1"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1300, height: 820, deviceScaleFactor: 1 });
  await page.goto(url + (url.includes("?") ? "&" : "?") + "record", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.READY === true);
  await page.evaluate(() => document.fonts.ready);
  const stage = await page.$("#stage");
  const dur = await page.evaluate(() => window.DURATION);
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => window.seek(t), i / fps);
    await stage.screenshot({ path: join(frames, `f${String(i).padStart(4, "0")}.png`) });
  }
  console.log(`${n} frames`);
} finally {
  await browser.close();
}

const input = ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(frames, "f%04d.png")];
execFileSync("ffmpeg", [...input, "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  join(media, `${name}.mp4`)]);
execFileSync("ffmpeg", [...input, "-vf",
  "fps=20,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=200:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
  "-loop", "0", join(media, `${name}.gif`)]);
rmSync(frames, { recursive: true, force: true });
console.log(`wrote media/${name}.mp4 and media/${name}.gif`);
