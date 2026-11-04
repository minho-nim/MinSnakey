import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../dist/", import.meta.url);
let html = await readFile(new URL("index.html", root), "utf8");
const script = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);
const css = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/);
if (!script || !css) throw new Error("Build assets not found");
const jsText = await readFile(new URL(script[1], root), "utf8");
const cssText = await readFile(new URL(css[1], root), "utf8");
html = html.replace(
  script[0],
  () =>
    `<script type="module">${jsText.replaceAll("</script", "<\\/script")}</script>`,
);
html = html.replace(css[0], () => `<style>${cssText}</style>`);
await writeFile(new URL("play.html", root), html);
console.log("Offline standalone game: dist/play.html");
