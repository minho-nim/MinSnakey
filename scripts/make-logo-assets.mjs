import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const input = process.argv[2];
if (!input)
  throw new Error(
    "Usage: node scripts/make-logo-assets.mjs <approved-logo.png>",
  );
const source =
  "data:image/png;base64," + (await readFile(input)).toString("base64");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const variants = await page.evaluate(async (source) => {
    const img = new Image();
    img.src = source;
    await img.decode();
    return [32, 180, 192, 256, 512].map((size) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size, size);
      return { size, png: canvas.toDataURL("image/png").split(",")[1] };
    });
  }, source);
  await mkdir("public/icons", { recursive: true });
  await mkdir("src/assets", { recursive: true });
  for (const { size, png } of variants) {
    const target =
      size === 256
        ? "src/assets/minsnakey-logo.png"
        : `public/icons/${size === 180 ? "apple-touch-icon" : "icon-" + size}.png`;
    await writeFile(target, Buffer.from(png, "base64"));
    console.log(target);
  }
} finally {
  await browser.close();
}
