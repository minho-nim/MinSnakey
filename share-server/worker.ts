import { readChallenge } from "../src/challenge";
import { TAUNTS, SHARE_ORIGIN, SHARE_CARD_VERSION } from "../src/share-copy";
import { courseInfo } from "../src/courses";
import { renderCard } from "./card";
declare const __GAME_HTML__: string;
const GAME = "https://minho-nim.github.io/snake-race/";
const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export default {
  async fetch(
    request: Request,
    _env?: unknown,
    ctx?: { waitUntil?: (p: Promise<unknown>) => void },
  ) {
    const url = new URL(request.url);
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Method not allowed", { status: 405 });
    if (url.pathname === "/robots.txt")
      return new Response("User-agent: *\nAllow: /\n", {
        headers: { "Content-Type": "text/plain" },
      });
    if (url.pathname === "/")
      return new Response(request.method === "HEAD" ? null : __GAME_HTML__, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    if (!["/c", "/og.png"].includes(url.pathname))
      return new Response("Not found", { status: 404 });
    const payload = url.searchParams.get("d") || "";
    if (payload.length > 24000 || !/^[-_A-Za-z0-9]+$/.test(payload))
      return new Response("Invalid challenge", { status: 400 });
    try {
      const challenge = await readChallenge("#challenge=" + payload);
      if (!challenge) throw new Error("Missing challenge");
      const cache = (
        globalThis as unknown as {
          caches?: {
            default?: {
              match: (request: Request) => Promise<Response | undefined>;
              put: (request: Request, response: Response) => Promise<void>;
            };
          };
        }
      ).caches?.default;
      if (url.pathname === "/og.png") {
        const headers = {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        };
        if (request.method === "HEAD") return new Response(null, { headers });
        const cached = await cache?.match(request);
        if (cached) return cached;
        const png = renderCard(challenge);
        const response = new Response(png as unknown as BodyInit, { headers });
        if (cache && ctx?.waitUntil)
          ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      }
      const taunt = TAUNTS[challenge.taunt ?? 0],
        title = "MinSnakey · " + taunt.title + " " + taunt.subtitle,
        description = `${challenge.snake.name} · ${courseInfo(challenge.course).name} ${challenge.targetTime.toFixed(2)}초. 내 뱀으로 도전해 봐!`;
      const origin = ["localhost", "127.0.0.1"].includes(url.hostname)
        ? url.origin
        : SHARE_ORIGIN;
      const canonical = new URL("/c", origin);
      canonical.searchParams.set("d", payload);
      canonical.searchParams.set("v", SHARE_CARD_VERSION);
      const image = new URL("/og.png", origin);
      image.searchParams.set("d", payload);
      image.searchParams.set("v", SHARE_CARD_VERSION);
      const game = new URL(
        ["localhost", "127.0.0.1"].includes(url.hostname)
          ? url.origin + "/"
          : GAME,
      );
      game.hash = "challenge=" + payload;
      const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta property="og:site_name" content="MinSnakey"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical.href)}"><meta property="og:image" content="${escape(image.href)}"><meta property="og:image:secure_url" content="${escape(image.href)}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escape(image.href)}"></head><body style="margin:0;padding:24px;background:#263e2c;color:#fff7de;font-family:sans-serif;text-align:center"><h1>${escape(title)}</h1><img alt="${escape(description)}" style="width:min(100%,900px);border-radius:18px" src="${escape(image.href)}"><p><a style="color:#f5cb68;font-size:24px" href="${escape(game.href)}">내 뱀으로 도전하기 →</a></p><script>location.replace(${JSON.stringify(game.href)});</script></body></html>`;
      return new Response(request.method === "HEAD" ? null : html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return new Response("도전장을 열지 못했어요. 새 링크를 받아주세요.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  },
};
