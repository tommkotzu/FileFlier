// Quick Look plays videos: click a video, Space opens it, K pauses, L skips ahead,
// K plays, Space closes.
import { buildWindow, showInInspector, overlay, drawSunset, ease, seg, clamp, fmt, sym, fileIcon } from "../app.js";

export const duration = 5;

const FILES = [
  ["dir", "Drone footage", "--", "Yesterday"],
  ["dir", "Wedding — edit", "--", "Tuesday"],
  ["csv", "Edit decisions.csv", "12 kB", "27 Oct 2026"],
  ["vid", "Harbour timelapse.mov", "312.4 MB", "Today 09:12"],
  ["vid", "Lisbon sunset.mp4", "48.2 MB", "Today 08:40"],
  ["vid", "Night tram.mkv", "121.0 MB", "2 Nov 2026"],
  ["img", "Poster frame.png", "2.1 MB", "1 Nov 2026"],
  ["aud", "Score — draft 3.flac", "38.0 MB", "28 Oct 2026"],
  ["doc", "Shot list.md", "4.2 kB", "27 Oct 2026"],
];
const ROW = 4;

let w, card, video, vcv, inspCv;
export function setup(stage) {
  w = buildWindow(stage, { files: FILES, caption: "<b>Quick Look</b>Space previews anything — videos play, K J L to control them" });
  // Quick Look's card, sized as the app sizes it (82% × 84% of the window, at most 1040 × 740).
  const cw = Math.min(1200 * .82, 1040), ch = Math.min(730 * .84, 740);
  const cx = w.win.x + (1200 - cw) / 2, cy = w.win.y + (730 - ch) / 2;
  stage.insertAdjacentHTML("beforeend", `<div class="ql-dim"></div>
    <div class="ql" style="left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px">
      <div class="ql-head"><img src="${fileIcon("vid")}" alt=""><div class="n">Lisbon sunset.mp4</div>
        <div class="m">MPEG-4 video  ·  48.2 MB  ·  1920 × 1080  ·  0:12  ·  Today 08:40</div>
        <span class="btn accent open" style="left:${cw - 141}px">Open</span><span class="x" style="left:${cw - 45}px">${sym("window-close-symbolic")}</span></div>
      <div class="ql-video" style="height:${ch - 64 - 12 - 34 - 12 - 44}px"><canvas width="1280" height="720"></canvas></div>
      <div class="ql-bar" style="top:${ch - 34 - 12 - 36}px"><span class="play"></span><span class="t"></span>
        <span class="seek"><span class="fill"></span><span class="knob"></span></span>${sym("audio-volume-high-symbolic")}</div>
      <div class="ql-foot"><span>5 of 9</span><span>K  play/pause   ·   J L  −5 s / +5 s   ·   E F  next / previous frame   ·   M  mute   ·   ← →  browse   ·   Space  close</span></div>
    </div>`);
  card = stage.querySelector(".ql");
  video = card.querySelector(".ql-video");
  vcv = video.querySelector("canvas");
  // The video fitted into its area, letterboxed.
  const vh = video.clientHeight || (ch - 166), vw = cw - 32, s = Math.min(vw / 16, vh / 9);
  Object.assign(vcv.style, { position: "absolute", width: `${16 * s}px`, height: `${9 * s}px`, left: `${(vw - 16 * s) / 2}px`, top: `${(vh - 9 * s) / 2}px` });
}

export function render(t) {
  const [x0, y0] = w.rowAt(ROW, 150);
  const timeline = {
    path: [[0, 1010, 690], [.7, x0, y0], [1.25, x0, y0], [1.9, 700, 600], [4.25, 700, 600], [5, 840, 680]],
    clicks: [.78],
    keys: [[1.1, "Space", .6, "Quick Look"], [2.55, "K", .5, "pause"], [3.15, "L", .5, "+5 s"], [3.75, "K", .5, "play"], [4.35, "Space", .55, "close"]],
  };
  const picked = t >= .78;
  w.rows.forEach((r, i) => {
    r.classList.toggle("sel", picked && i === ROW);
    r.classList.toggle("cur", (picked && i === ROW) || (!picked && i === 0));
    r.classList.toggle("hov", !picked && i === ROW && t > .5);
  });
  if (picked) {
    showInInspector(w, "Lisbon sunset.mp4", {
      kind: "MPEG-4 video", sub: "48.2 MB",
      info: [["Dimensions", "1920 × 1080"], ["Duration", "0:12"], ["Video", "H.264, 30 fps"], ["Audio", "AAC, stereo"], ["Modified", "Today 08:40"]],
      draw: (cv) => drawSunset(cv, 2),
    });
  } else {
    showInInspector(w, "Drone footage", { kind: "Folder", sub: "", info: [["Contains", "24 items"], ["Size", "3.8 GB"], ["Modified", "Yesterday"]] });
    const p = w.insp.querySelector(".insp-prev canvas"); if (p) p.remove();
  }

  // Opens at 1.2 s, closes at 4.4 s (fading in from 94% size, as the app does).
  const open = ease(seg(t, 1.2, 1.4)) * (1 - ease(seg(t, 4.4, 4.6)));
  w.stage.querySelector(".ql-dim").style.opacity = .47 * open;
  card.style.opacity = open;
  card.style.transform = `scale(${.94 + .06 * open})`;
  // Video time: plays from 0:02; K pauses at 2.55 s, L jumps 5 s at 3.15 s, K plays at 3.75 s.
  let vt = 2 + clamp(t - 1.4, 0, 1.15);
  if (t > 3.15) vt += 5;
  if (t > 3.75) vt += t - 3.75;
  const playing = t < 2.55 || t > 3.75;
  drawSunset(vcv, vt);
  card.querySelector(".play").innerHTML = sym(playing ? "media-playback-pause-symbolic" : "media-playback-start-symbolic");
  card.querySelector(".t").textContent = `${fmt(vt)} / 0:12`;
  const f = clamp(vt / 12, 0, 1) * 100;
  card.querySelector(".fill").style.width = `${f}%`;
  card.querySelector(".knob").style.left = `${f}%`;
  overlay(w, t, timeline);
}
