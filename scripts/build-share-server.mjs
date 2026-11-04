import { build } from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
await mkdir("share-server/dist/server", { recursive: true });
await build({
  entryPoints: ["share-server/worker.ts"],
  outfile: "share-server/dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  define: {
    __GAME_HTML__: JSON.stringify(await readFile("dist/play.html", "utf8")),
  },
});
console.log("Sharing worker built: share-server/dist/server/index.js");
