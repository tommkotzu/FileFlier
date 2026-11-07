// One still of a scene, to check a layout:  node snap.mjs <scene> <t> <out.png>
import puppeteer from "puppeteer-core";

const [scene, t, out] = process.argv.slice(2);
const base = process.env.BASE || "http://127.0.0.1:8765";
const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM || "/snap/bin/chromium", headless: true });
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.setViewport({ width: 1300, height: 820, deviceScaleFactor: 1 });
  await page.goto(`${base}/scene.html?s=${scene}&record`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.READY === true, { timeout: 10000 });
  await page.evaluate((t) => window.seek(t), Number(t));
  await (await page.$("#stage")).screenshot({ path: out });
  console.log("wrote", out);
} finally {
  await browser.close();
}
