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
    __ICON_ASSETS__: JSON.stringify(
      Object.fromEntries(
        await Promise.all(
          [
            "icon-32.png",
            "apple-touch-icon.png",
            "icon-192.png",
            "icon-512.png",
          ].map(async (name) => [
            "/icons/" + name,
            (await readFile("public/icons/" + name)).toString("base64"),
          ]),
        ),
      ),
    ),
    __MANIFEST_JSON__: JSON.stringify(
      await readFile("public/manifest.webmanifest", "utf8"),
    ),
    __GAME_HTML__: JSON.stringify(
      (await readFile("dist/play.html", "utf8")).replace(
        "</head>",
        '<link rel="manifest" href="/manifest.webmanifest"></head>',
      ),
    ),
  },
});
console.log("Sharing worker built: share-server/dist/server/index.js");
