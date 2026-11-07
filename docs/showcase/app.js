// Builds File Flier's window in the stage and gives scenes the pieces they animate.
// Everything a scene draws is a pure function of time, so window.seek(t) can draw
// any frame exactly (that's what record.mjs captures).

export const ICON = (n) => `icons/${n}.png`;
export const sym = (n, extra = "") => `<i class="sym ${extra}" style="--i:url(icons/${n}.svg)"></i>`;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
export const ease = (x) => { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const fmt = (s) => { s = Math.max(0, s); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };

// File icons as File Flier draws them (src/icons.rs `file`): a page with a folded
// corner in the kind's colour and a white glyph; text is plain paper with lines.
const KIND_COLOR = { vid: [139, 92, 246], img: [16, 165, 200], aud: [230, 72, 142], csv: [30, 160, 84], code: [14, 163, 150],
  docx: [47, 123, 245], pdf: [229, 65, 60], zip: [224, 150, 28], pres: [242, 107, 42] };
const mixc = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const rgb = (c) => `rgb(${c.join(",")})`;
const iconCache = {};
export function fileIcon(kind) {
  if (kind === "dir") return ICON("folder");
  if (iconCache[kind]) return iconCache[kind];
  const body = "17,5 57,5 83,31 83,95 17,95", corner = "57,5 83,31 61,31";
  const G = (x, y) => `${29 + 42 * x},${42 + 42 * y}`;
  const sw = 100 / 18;
  const c = KIND_COLOR[kind];
  let s;
  if (!c) {
    const paper = [232, 235, 240], edge = [196, 201, 209], ink = rgb(mixc(edge, [0, 0, 0], .2));
    s = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${rgb(paper)}"/><stop offset="1" stop-color="${rgb(mixc(paper, edge, .35))}"/></linearGradient></defs>
      <polygon points="${body}" fill="url(#g)"/><polygon points="${corner}" fill="${rgb(edge)}"/>
      ${[[46, 66], [60, 66], [74, 50]].map(([y, x1]) => `<line x1="30" y1="${y}" x2="${x1}" y2="${y}" stroke="${ink}" stroke-width="${sw}"/>`).join("")}`;
  } else {
    const st = `stroke="#fff" stroke-width="${sw * 1.1}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    const glyph = {
      vid: `<polygon points="${G(.26, .12)} ${G(.86, .5)} ${G(.26, .88)}" fill="#fff"/>`,
      img: `<polygon points="${G(0, .92)} ${G(.4, .38)} ${G(.78, .92)}" fill="#fff"/><polygon points="${G(.5, .92)} ${G(.74, .6)} ${G(1, .92)}" fill="#fff" fill-opacity=".8"/><circle cx="${29 + 42 * .78}" cy="${42 + 42 * .2}" r="${42 * .14}" fill="#fff"/>`,
      aud: `<polyline points="${G(.64, .74)} ${G(.64, .08)} ${G(.9, .24)}" ${st}/><circle cx="${29 + 42 * .46}" cy="${42 + 42 * .76}" r="${42 * .2}" fill="#fff"/>`,
      csv: `<rect x="29" y="${42 + 42 * .06}" width="42" height="${42 * .88}" rx="1" ${st}/><line x1="${29 + 42 * .42}" y1="${42 + 42 * .06}" x2="${29 + 42 * .42}" y2="${42 + 42 * .94}" ${st}/><line x1="29" y1="${42 + 42 * (.06 + .88 * .36)}" x2="71" y2="${42 + 42 * (.06 + .88 * .36)}" ${st}/><line x1="29" y1="${42 + 42 * (.06 + .88 * .66)}" x2="71" y2="${42 + 42 * (.06 + .88 * .66)}" ${st}/>`,
      code: `<polyline points="${G(.36, .2)} ${G(.06, .5)} ${G(.36, .8)}" ${st}/><polyline points="${G(.64, .2)} ${G(.94, .5)} ${G(.64, .8)}" ${st}/>`,
    }[kind] ?? [[.14, 1], [.42, 1], [.7, .62]].map(([y, x1]) => `<line x1="29" y1="${42 + 42 * y}" x2="${29 + 42 * x1}" y2="${42 + 42 * y}" ${st}/>`).join("");
    s = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${rgb(mixc(c, [255, 255, 255], .16))}"/><stop offset="1" stop-color="${rgb(mixc(c, [0, 0, 0], .06))}"/></linearGradient></defs>
      <polygon points="${body}" fill="url(#g)"/><polygon points="${corner}" fill="${rgb(mixc(c, [255, 255, 255], .5))}"/>${glyph}`;
  }
  return (iconCache[kind] = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${s}</svg>`)}`);
}

const PLACES = [["user-home-symbolic", "Home"], ["user-desktop-symbolic", "Desktop"], ["folder-documents-symbolic", "Documents"],
  ["folder-download-symbolic", "Downloads"], ["folder-music-symbolic", "Music"], ["folder-pictures-symbolic", "Pictures"],
  ["folder-videos-symbolic", "Videos"], ["user-trash-symbolic", "Trash"]];

/** The window: sidebar, tab strip, one pane listing `files`, the preview panel. */
export function buildWindow(stage, { place = "Videos", tabs = ["Videos"], files = [], cols = ["Size", "Modified"], inspW = 360, caption = "" }) {
  const W = 1200, sbW = 230, paneW = W - sbW - inspW;
  stage.innerHTML = `
  <div class="caption">${caption}</div>
  <div class="win">
    <div class="sb">
      <div class="sb-top"><img src="icons/app.svg" alt="">${sym("sidebar-show-right-symbolic")}</div>
      <div class="sb-filter">${sym("system-search-symbolic")}Filter...</div>
      <div class="sb-sec">${sym("document-open-recent-symbolic")}Recents${sym("pan-end-symbolic", "chev")}</div>
      <div class="sb-sec">${sym("user-bookmarks-symbolic")}Bookmarks${sym("pan-down-symbolic", "chev")}</div>
      <div class="sb-item">${sym("folder-symbolic")}Projects</div>
      <div class="sb-item">${sym("folder-symbolic")}Client work</div>
      <div class="sb-sec">${sym("folder-symbolic")}Places${sym("pan-down-symbolic", "chev")}</div>
      ${PLACES.map(([i, n]) => `<div class="sb-item${n === place ? " on" : ""}">${sym(i)}${n}</div>`).join("")}
      <div class="sb-sec">${sym("tag-symbolic")}Tags${sym("pan-end-symbolic", "chev")}</div>
      <div class="sb-sec">${sym("drive-harddisk-symbolic")}Storage${sym("pan-end-symbolic", "chev")}</div>
    </div>
    <div class="strip">
      ${tabs.map((t, i) => `<div class="tab${i === 0 ? " on" : ""}" style="left:${8 + i * 200}px;width:192px"><img src="${ICON("folder")}" alt="">${t}</div>`).join("")}
      <span class="tab-add" style="left:${8 + tabs.length * 200 + 6}px">${sym("list-add-symbolic")}</span>
      <div class="wbtns"><span>${sym("window-minimize-symbolic")}</span><span>${sym("window-maximize-symbolic")}</span><span>${sym("window-close-symbolic")}</span></div>
    </div>
    <div class="pane" style="left:${sbW}px;width:${paneW}px">
      <div class="toolbar">
        <span class="b">${sym("go-previous-symbolic")}</span><span class="b off">${sym("go-next-symbolic")}</span>
        <span class="b">${sym("go-up-symbolic")}</span><span class="b">${sym("pan-down-symbolic")}</span><span class="vr"></span>
        <span class="b">${sym("changes-allow-symbolic")}</span><span class="b">${sym("bookmark-new-symbolic")}</span><span class="vr"></span>
        <span class="crumb"><i>Home  ›</i>${place}</span><span class="b more">${sym("view-more-symbolic")}</span>
      </div>
      <div class="hdr"><span class="chk"></span><span class="name">Name${sym("view-sort-ascending-symbolic")}</span>
        ${cols.map((c) => `<span class="col" style="width:${c === "Size" ? 96 : 150}px">${c}</span>`).join("")}</div>
      <div class="rows">${files.map((f, i) => `<div class="row" data-i="${i}"><span class="chev">${f[0] === "dir" ? sym("pan-end-symbolic") : ""}</span>
        <img src="${fileIcon(f[0])}" alt=""><span class="name">${f[1]}</span>
        ${cols.map((c, j) => `<span class="col" style="width:${c === "Size" ? 96 : 150}px">${f[2 + j] ?? ""}</span>`).join("")}</div>`).join("")}</div>
      <div class="bbar"><span class="bb-filter">${sym("system-search-symbolic")}Filter...${sym("preferences-system-symbolic")}</span>
        <span class="bb-count">${files.length} items</span><span class="bb-pct">0%</span></div>
    </div>
    <div class="insp" style="width:${inspW}px">
      <div class="insp-head"><span class="kind">Folder</span><span class="sp"></span><span class="b">${sym("view-dual-symbolic")}</span><span class="b">${sym("window-close-symbolic")}</span></div>
      <div class="insp-prev" style="height:${Math.round(inspW * 0.62)}px"></div>
      <div class="insp-name"></div><div class="insp-sub"></div>
      <div class="insp-stars">${[1, 2, 3, 4, 5].map(() => sym("non-starred-symbolic")).join("")}</div>
      <div class="insp-tags"><span class="chip">+ Tag</span></div>
      <div class="insp-infot">Information</div><div class="insp-info"></div>
      <div class="insp-foot"><span class="btn accent">Open</span><span class="btn">Quick Look</span></div>
    </div>
  </div>
  <div class="ripple"></div>
  <svg class="cursor" viewBox="0 0 24 24"><path d="M4 2.5 L4 19.5 L8.4 15.6 L11.3 22 L14.2 20.7 L11.4 14.5 L17.5 14.5 Z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>
  <div class="keyb"></div>`;
  const win = { x: 40, y: 40 };
  const rowsTop = win.y + 35 + 40 + 31;
  return {
    stage, win, paneLeft: win.x + sbW, paneW, inspW,
    rows: [...stage.querySelectorAll(".row")],
    /** Stage coordinates of row i's middle, at `x` into the pane. */
    rowAt: (i, x = 120) => [win.x + sbW + x, rowsTop + i * 32 + 16],
    insp: stage.querySelector(".insp"),
    cursor: stage.querySelector(".cursor"), ripple: stage.querySelector(".ripple"), keyb: stage.querySelector(".keyb"),
  };
}

/** Shows `entry` (or the folder) in the preview panel; `draw(canvas)` paints a picture preview. */
export function showInInspector(w, entry, { kind, sub, info, draw }) {
  const q = (s) => w.insp.querySelector(s);
  q(".kind").textContent = kind;
  q(".insp-name").textContent = entry;
  q(".insp-sub").textContent = sub;
  q(".insp-info").innerHTML = info.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join("");
  const prev = q(".insp-prev");
  if (draw) {
    let cv = prev.querySelector("canvas");
    if (!cv) { prev.innerHTML = ""; cv = document.createElement("canvas"); cv.width = 640; cv.height = 360; prev.appendChild(cv); }
    cv.style.width = `${w.inspW - 36}px`; cv.style.height = `${(w.inspW - 36) * 9 / 16}px`;
    draw(cv);
  } else if (!prev.querySelector("img")) {
    prev.innerHTML = `<img class="big" src="${ICON("folder")}" alt="">`;
  }
}

/** Pointer path: [time, x, y] points, eased between them. Returns [x, y]. */
export function pointerAt(t, path) {
  for (let i = 0; i < path.length - 1; i++) {
    const [t0, x0, y0] = path[i], [t1, x1, y1] = path[i + 1];
    if (t <= t1) { const k = ease(seg(t, t0, t1)); return [lerp(x0, x1, k), lerp(y0, y1, k)]; }
  }
  const l = path[path.length - 1];
  return [l[1], l[2]];
}

/** Draws the pointer, click ripples and key badges for time t. */
export function overlay(w, t, { path, clicks = [], keys = [] }) {
  const [x, y] = pointerAt(t, path);
  w.cursor.style.transform = `translate(${x - 4}px, ${y - 2.5}px)`;
  let rk = -1;
  for (const c of clicks) if (t >= c && t < c + .45) rk = seg(t, c, c + .45);
  Object.assign(w.ripple.style, { left: `${x}px`, top: `${y}px`, opacity: rk < 0 ? 0 : 1 - rk, transform: `scale(${.4 + Math.max(rk, 0)})` });
  const k = keys.find(([at, , len]) => t >= at - .08 && t <= at + len);
  if (k) {
    const [at, label, len, note] = k;
    w.keyb.innerHTML = label.split("+").map((p) => `<kbd>${p}</kbd>`).join("+") + (note ? `<small>${note}</small>` : "");
    w.keyb.style.opacity = Math.min(seg(t, at - .08, at + .05), 1 - seg(t, at + len - .15, at + len));
  } else w.keyb.style.opacity = 0;
}

/** A stand-in video: the sun setting over the sea, as a function of video time. */
export function drawSunset(cv, vt) {
  const c = cv.getContext("2d"), w = cv.width, h = cv.height, k = clamp(vt / 12, 0, 1);
  const sky = c.createLinearGradient(0, 0, 0, h * .62);
  sky.addColorStop(0, `hsl(${lerp(215, 262, k)} 55% ${lerp(40, 17, k)}%)`);
  sky.addColorStop(1, `hsl(${lerp(30, 8, k)} 92% ${lerp(64, 42, k)}%)`);
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  const sy = lerp(h * .26, h * .63, k);
  c.fillStyle = `hsl(${lerp(44, 14, k)} 100% 63%)`; c.beginPath(); c.arc(w * .63, sy, h * .09, 0, 7); c.fill();
  c.fillStyle = `hsl(222 45% ${lerp(24, 9, k)}%)`; c.fillRect(0, h * .62, w, h);
  c.fillStyle = "rgba(255,190,120,.35)";
  for (let i = 0; i < 9; i++) {
    const yy = h * .65 + i * h * .035, ww = w * (.18 - i * .014);
    c.fillRect(w * .63 - ww / 2 + Math.sin(vt * 3 + i) * w * .005, yy, ww, Math.max(2, h * .006));
  }
  c.fillStyle = "#0b0b12"; c.beginPath(); c.moveTo(0, h * .62);
  for (let x = 0; x <= w * .36; x += w / 80) c.lineTo(x, h * .62 - h * (.05 + .04 * Math.sin(x / (w * .045))));
  c.lineTo(w * .36, h * .62); c.fill();
  const tx = (((vt * .09) % 1.3) - .15) * w;
  c.fillStyle = "#f6d32d"; c.fillRect(tx, h * .585, w * .06, h * .03);
}
