import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
const texts = [
  "덤벼봐!",
  "내 기록 깰 수 있겠어?",
  "한번 붙자!",
  "내 꼬물이, 생각보다 빠른데?",
  "이겨 봐!",
  "이 정도는 이겨줘야 친구지!",
  "도망 금지!",
  "말로만 빠르다고? 한번 붙자!",
  "MinSnakey 친구 도전",
  "내 뱀으로 도전하기 →",
  "종합경기 100m 달리기 언덕 물웅덩이 점프 장애물 자동 수동 초",
  "0123456789. ·",
];
const chars = [...new Set(texts.join(""))];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.setContent('<html lang="ko"><body></body></html>');
  const result = await page.evaluate(async (chars) => {
    await document.fonts.ready;
    const cell = 114,
      columns = 16,
      canvas = document.createElement("canvas");
    canvas.width = columns * cell;
    canvas.height = Math.ceil(chars.length / columns) * cell;
    const ctx = canvas.getContext("2d");
    ctx.font = '900 96px "Noto Sans CJK KR",sans-serif';
    ctx.fillStyle = "#000";
    const glyphs = {};
    chars.forEach((char, i) => {
      const x = (i % columns) * cell,
        y = Math.floor(i / columns) * cell;
      ctx.fillText(char, x + 3, y + 96);
      glyphs[char] = {
        x,
        y,
        w: cell,
        h: cell,
        advance: ctx.measureText(char).width,
      };
    });
    return {
      png: canvas.toDataURL("image/png").split(",")[1],
      glyphs,
      cell,
      fontSize: 96,
    };
  }, chars);
  await mkdir("share-server/generated", { recursive: true });
  await writeFile(
    "share-server/generated/font-atlas.json",
    JSON.stringify(result),
  );
  console.log("Generated Korean share-card atlas:", chars.length, "glyphs");
} finally {
  await browser.close();
}
