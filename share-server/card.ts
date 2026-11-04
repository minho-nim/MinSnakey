import { decode, encode } from "fast-png";
import atlasData from "./generated/font-atlas.json";
import { previewRacer } from "../src/physics";
import { bodyRig, skinPoint, partFrame } from "../src/geometry";
import { snakeExtents } from "../src/render";
import { courseInfo } from "../src/courses";
import { TAUNTS } from "../src/share-copy";
import type { Challenge } from "../src/challenge";
import type { Point, Stroke } from "../src/model";
const WIDTH = 1200,
  HEIGHT = 630;
const atlas = decode(
  Uint8Array.from(atob(atlasData.png), (c) => c.charCodeAt(0)),
);
const fontPixels = atlas.data as Uint8Array;
const glyphs = atlasData.glyphs as Record<
  string,
  { x: number; y: number; w: number; h: number; advance: number }
>;
export function renderCard(challenge: Challenge) {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  let work = 0;
  const blend = (x: number, y: number, color: number[], alpha = 1) => {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
    const i = (y * WIDTH + x) * 4;
    for (let c = 0; c < 3; c++)
      pixels[i + c] = Math.round(
        pixels[i + c] * (1 - alpha) + color[c] * alpha,
      );
    pixels[i + 3] = 255;
  };
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: number[],
    radius = 0,
  ) => {
    for (
      let py = Math.max(0, Math.floor(y));
      py < Math.min(HEIGHT, y + h);
      py++
    )
      for (
        let px = Math.max(0, Math.floor(x));
        px < Math.min(WIDTH, x + w);
        px++
      ) {
        const dx = Math.max(x + radius - px, 0, px - (x + w - radius)),
          dy = Math.max(y + radius - py, 0, py - (y + h - radius));
        if (!radius || dx * dx + dy * dy <= radius * radius)
          blend(px, py, color);
      }
  };
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color: number[],
  ) => {
    const scale = size / 96;
    for (const char of value) {
      const glyph = glyphs[char];
      if (!glyph) continue;
      const w = Math.ceil(glyph.w * scale),
        h = Math.ceil(glyph.h * scale);
      for (let py = 0; py < h; py++)
        for (let px = 0; px < w; px++) {
          const ax = glyph.x + Math.min(glyph.w - 1, Math.floor(px / scale)),
            ay = glyph.y + Math.min(glyph.h - 1, Math.floor(py / scale));
          const alpha = fontPixels[(ay * atlas.width + ax) * 4 + 3] / 255;
          if (alpha)
            blend(Math.round(x) + px, Math.round(y) + py, color, alpha);
        }
      x += glyph.advance * scale;
    }
  };
  const line = (a: Point, b: Point, width: number, color: number[]) => {
    if (++work > 1800) return;
    const r = Math.min(36, Math.max(1, width / 2)),
      dx = b.x - a.x,
      dy = b.y - a.y,
      len = dx * dx + dy * dy;
    const left = Math.max(0, Math.floor(Math.min(a.x, b.x) - r - 1)),
      right = Math.min(WIDTH - 1, Math.ceil(Math.max(a.x, b.x) + r + 1)),
      top = Math.max(0, Math.floor(Math.min(a.y, b.y) - r - 1)),
      bottom = Math.min(HEIGHT - 1, Math.ceil(Math.max(a.y, b.y) + r + 1));
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        const t = len
            ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len))
            : 0,
          d = Math.hypot(x - a.x - dx * t, y - a.y - dy * t),
          alpha = Math.max(0, Math.min(1, r + 0.6 - d));
        if (alpha) blend(x, y, color, alpha);
      }
  };
  const dark = [38, 62, 44],
    cream = [255, 247, 222];
  rect(0, 0, WIDTH, HEIGHT, [42, 69, 49]);
  rect(14, 14, 1172, 602, cream, 28);
  rect(43, 260, 1114, 246, [228, 209, 169], 21);
  for (let y = 315; y < 506; y += 78) rect(44, y, 1112, 3, [255, 248, 225]);
  text("꼬물 레이스 · 친구 도전", 60, 25, 27, dark);
  const taunt = TAUNTS[challenge.taunt ?? 0];
  text(taunt.title, 58, 68, 112, [197, 120, 44]);
  text(taunt.subtitle, 65, 198, 42, dark);
  rect(888, 60, 258, 176, [232, 184, 76], 18);
  text("내 기록", 919, 68, 26, [102, 83, 40]);
  text(challenge.targetTime.toFixed(2) + "초", 910, 109, 67, dark);
  text(courseInfo(challenge.course).name, 910, 195, 24, dark);
  const racer = previewRacer(challenge.snake, 0.65),
    rig = bodyRig(challenge.snake.parts.body),
    bounds = snakeExtents(racer),
    scale = Math.min(980 / Math.max(1, bounds.w), 184 / Math.max(1, bounds.h));
  const ox = 600 - (bounds.x + bounds.w / 2) * scale,
    oy = 382 - (bounds.y + bounds.h / 2) * scale;
  const paths: Stroke[] = challenge.snake.parts.body.strokes.map((s, i) => ({
    ...s,
    width: s.width * rig.scale,
    points: s.points.map((_, j) =>
      skinPoint(rig.bindings[i][j], racer.nodes, rig.scale),
    ),
  }));
  for (const kind of ["head", "tail"] as const) {
    const { node, angle } = partFrame(rig, racer.nodes, kind),
      co = Math.cos(angle),
      si = Math.sin(angle),
      part = challenge.snake.parts[kind];
    for (const s of part.strokes)
      paths.push({
        ...s,
        width: s.width * rig.scale,
        points: s.points.map((p) => {
          const px = (p.x - part.anchor.x) * rig.scale,
            py = (p.y - part.anchor.y) * rig.scale;
          return {
            x: node.x + px * co - py * si,
            y: node.y + px * si + py * co,
          };
        }),
      });
  }
  const total = paths.reduce((n, s) => n + s.points.length, 0),
    stride = Math.max(1, Math.ceil(total / 1500));
  for (const s of paths) {
    const color = [1, 3, 5].map((i) => parseInt(s.color.slice(i, i + 2), 16));
    const points = s.points
      .filter((_, i) => i % stride === 0 || i === s.points.length - 1)
      .map((p) => ({ x: ox + p.x * scale, y: oy + p.y * scale }));
    if (points.length === 1) line(points[0], points[0], s.width * scale, color);
    for (let i = 1; i < points.length; i++)
      line(points[i - 1], points[i], s.width * scale, color);
  }
  rect(43, 527, 1114, 62, dark, 14);
  text("내 뱀으로 도전하기 →", 382, 530, 36, cream);
  return encode({
    width: WIDTH,
    height: HEIGHT,
    data: pixels,
    channels: 4,
    depth: 8,
  });
}
