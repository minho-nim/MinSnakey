import { drawingConnection, snakeConnections } from "./connectivity";
import {
  terrainAt,
  waterZonesFor,
  obstaclesFor,
  HILL_VISUAL_RATIO,
  JUMP_VISUAL_RATIO,
} from "./courses";
import { snakeRig, skinPoint, partFrame } from "./geometry";
import { bounds, clamp, type Drawing, type Point } from "./model";
import { previewRacer, type Racer, type Race } from "./physics";
export function fitCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect(),
    dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, rect.width),
    h = Math.max(1, rect.height);
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
function strokes(
  ctx: CanvasRenderingContext2D,
  part: Drawing,
  map: (p: Point) => Point,
  scale: number,
  opacity: (index: number) => number = () => 1,
) {
  const alpha = ctx.globalAlpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let index = 0; index < part.strokes.length; index++) {
    const s = part.strokes[index];
    ctx.globalAlpha = alpha * opacity(index);
    if (!s.points.length) continue;
    ctx.beginPath();
    s.points.forEach((p, i) => {
      const q = map(p);
      if (!i) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    if (s.points.length === 1) {
      const q = map(s.points[0]);
      ctx.lineTo(q.x + 0.01, q.y);
    }
    ctx.strokeStyle = s.color;
    ctx.lineWidth = Math.max(1, s.width * scale);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
}
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  r: Racer,
  x: number,
  y: number,
  scale: number,
) {
  const body = r.snake.parts.body,
    rig = snakeRig(r.snake);
  body.strokes.forEach((stroke, strokeIndex) => {
    const points = stroke.points.map((_, i) =>
      skinPoint(rig.bindings[strokeIndex][i], r.nodes, rig.scale),
    );
    strokes(
      ctx,
      { ...body, strokes: [{ ...stroke, points }] },
      (p) => ({ x: x + p.x * scale, y: y + p.y * scale }),
      rig.scale * scale,
      () =>
        snakeConnections(r.snake).reports.body.detached.includes(strokeIndex)
          ? 0.28
          : 1,
    );
  });
  function part(kind: "head" | "tail") {
    const drawing = r.snake.parts[kind],
      { node, angle } = partFrame(rig, r.nodes, kind);
    const ratio = rig.scale,
      anchor = drawing.anchor;
    const co = Math.cos(angle),
      si = Math.sin(angle);
    strokes(
      ctx,
      drawing,
      (p) => {
        const px = (p.x - anchor.x) * ratio,
          py = (p.y - anchor.y) * ratio;
        return {
          x: x + (node.x + px * co - py * si) * scale,
          y: y + (node.y + px * si + py * co) * scale,
        };
      },
      ratio * scale,
      (i) => (drawingConnection(drawing).detached.includes(i) ? 0.28 : 1),
    );
  }
  part("tail");
  part("head");
}
export function snakeExtents(r: Racer) {
  const rig = snakeRig(r.snake),
    points: Point[] = [];
  rig.bindings.forEach((a) =>
    a.forEach((b) => points.push(skinPoint(b, r.nodes, rig.scale))),
  );
  for (const kind of ["head", "tail"] as const) {
    const { node, angle } = partFrame(rig, r.nodes, kind),
      co = Math.cos(angle),
      si = Math.sin(angle),
      part = r.snake.parts[kind];
    for (const stroke of part.strokes)
      for (const p of stroke.points) {
        const px = (p.x - part.anchor.x) * rig.scale,
          py = (p.y - part.anchor.y) * rig.scale;
        points.push({
          x: node.x + px * co - py * si,
          y: node.y + px * si + py * co,
        });
      }
  }
  if (!points.length) return { x: -1, y: -0.5, w: 2, h: 1 };
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const p of points) {
    x = Math.min(x, p.x);
    y = Math.min(y, p.y);
    right = Math.max(right, p.x);
    bottom = Math.max(bottom, p.y);
  }
  return { x: x - 0.1, y: y - 0.1, w: right - x + 0.2, h: bottom - y + 0.2 };
}
export function renderPreview(canvas: HTMLCanvasElement, r: Racer) {
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const extents = snakeExtents(r),
    pad = 24;
  const scale = Math.min(
    (w - pad * 2) / Math.max(1, extents.w),
    (h - pad * 2) / Math.max(1, extents.h),
    74,
  );
  drawSnake(
    ctx,
    r,
    w / 2 - (extents.x + extents.w / 2) * scale,
    h / 2 - (extents.y + extents.h / 2) * scale,
    scale,
  );
}
export type RaceCamera = { x: number; scale?: number; viewport?: string };
export function trackScale(
  race: Race,
  camera: RaceCamera,
  width: number,
  height: number,
) {
  const viewport = `${width}:${height}`;
  if (camera.scale === undefined || camera.viewport !== viewport) {
    const laneHeight = (height - 46) / 4;
    const restHeight = Math.max(
      1,
      ...race.racers.map(
        (r) => snakeExtents({ ...r, nodes: r.rest }).h + r.stats.amplitude * 2,
      ),
    );
    camera.scale = Math.min(
      width < 650 ? 36 : 52,
      (laneHeight * 0.65) / restHeight,
    );
    camera.viewport = viewport;
  }
  return camera.scale;
}
export function renderRace(
  canvas: HTMLCanvasElement,
  race: Race,
  camera: RaceCamera,
  elapsed: number,
) {
  const { ctx, w, h } = fitCanvas(canvas),
    laneH = (h - 46) / 4,
    scale = trackScale(race, camera, w, h);
  const terrainCourse = ["combined", "hills", "hurdles"].includes(race.course);
  const baseline = terrainCourse ? 0.76 : 0.56;
  const player = race.racers[0],
    desired =
      w / scale >= 104
        ? (100 - w / scale) / 2
        : clamp(player.distance - (w / scale) * 0.52, -2, 102 - w / scale);
  camera.x += (desired - camera.x) * Math.min(1, elapsed * 5);
  const sx = (m: number) => (m - camera.x) * scale;
  ctx.fillStyle = "#e8eee0";
  ctx.fillRect(0, 0, w, h);
  const groundY = (screenX: number, base: number) =>
    base -
    terrainAt(race.course, camera.x + screenX / scale).elevation *
      scale *
      HILL_VISUAL_RATIO;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 28, w, h - 46);
  ctx.clip();
  for (let i = 0; i < 4; i++) {
    const top = 28 + i * laneH,
      bottom = 28 + (i + 1) * laneH;
    ctx.fillStyle = i === 0 ? "#e4c59e" : i % 2 ? "#edd7b9" : "#e8cdae";
    ctx.beginPath();
    for (let x = 0; x <= w + 12; x += 12) {
      const y = groundY(x, top);
      if (!x) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = w + 12; x >= 0; x -= 12) ctx.lineTo(x, groundY(x, bottom));
    ctx.lineTo(0, groundY(0, bottom));
    ctx.closePath();
    ctx.fill();
    for (const zone of waterZonesFor(race.course)) {
      const left = sx(zone.start),
        width = (zone.end - zone.start) * scale;
      if (left + width < 0 || left > w) continue;
      ctx.fillStyle = "#83b9bb";
      ctx.fillRect(left, top + 2, width, laneH - 4);
      ctx.strokeStyle = "#c4e1d7";
      ctx.lineWidth = 2;
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(left + 8, top + 18 + j * 15);
        ctx.lineTo(left + width - 8, top + 18 + j * 15);
        ctx.stroke();
      }
    }
    obstaclesFor(race.course).forEach((ob, index) => {
      const x = sx(ob.start),
        width = Math.max(12, (ob.end - ob.start) * scale),
        height = 12 + ob.height * scale * 0.65,
        base = 28 + (i + baseline) * laneH + 14;
      if (x + width < 0 || x > w) return;
      const hit = race.racers[i].obstacleHits.includes(index);
      ctx.fillStyle = "#493a2926";
      ctx.fillRect(x - 5, base, width + 12, 5);
      ctx.fillStyle = hit ? "#bd6b48" : "#e19b42";
      ctx.fillRect(x, base - height, width, height);
      ctx.strokeStyle = "#654d30";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, base - height, width, height);
      ctx.fillStyle = "#fff3be";
      ctx.fillRect(x + 2, base - height + 3, width - 4, 5);
      ctx.strokeStyle = "#866039";
      for (let j = 6; j < width; j += 12) {
        ctx.beginPath();
        ctx.moveTo(x + j, base - 2);
        ctx.lineTo(x + j + 8, base - height + 10);
        ctx.stroke();
      }
    });
    ctx.strokeStyle = "#fffcf2";
    ctx.lineWidth = 2;
    ctx.setLineDash([13, 10]);
    ctx.beginPath();
    for (let x = 0; x <= w + 12; x += 12) {
      const y = groundY(x, bottom);
      if (!x) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.setLineDash([]);
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  for (let m = 0; m <= 100; m += 5) {
    const x = sx(m);
    if (x < -40 || x > w + 40) continue;
    ctx.strokeStyle = m % 25 === 0 ? "#aa8e6c" : "#c9af8c";
    ctx.lineWidth = m % 25 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 28);
    ctx.lineTo(x, h - 18);
    ctx.stroke();
    ctx.fillStyle = "#75664f";
  }
  for (const m of [0, 100]) {
    const x = sx(m);
    for (let row = 0; row < Math.ceil((h - 46) / 10); row++)
      for (let col = 0; col < 2; col++) {
        ctx.fillStyle = (row + col) % 2 ? "#fbf7ed" : "#385844";
        ctx.fillRect(x + col * 7, 28 + row * 10, 7, 10);
      }
  }
  race.racers.forEach((r, i) => {
    const x = sx(r.distance),
      ground = groundY(x, 28 + (i + baseline) * laneH),
      y = ground - r.jumpHeight * scale * JUMP_VISUAL_RATIO;
    ctx.fillStyle = "#5b493a16";
    ctx.beginPath();
    ctx.ellipse(
      x - r.stats.length * scale * 0.4,
      ground + 14,
      r.stats.length * scale * 0.55,
      8,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    const pose = ["combined", "hills"].includes(race.course)
      ? {
          ...r,
          nodes: r.nodes.map((node) => ({
            ...node,
            y:
              node.y -
              (terrainAt(race.course, r.distance + node.x).elevation -
                terrainAt(race.course, r.distance).elevation) *
                HILL_VISUAL_RATIO,
          })),
        }
      : r;
    ctx.save();
    if (race.time < r.stumbleUntil) {
      const fall = Math.sin(
        Math.PI * Math.min(1, (r.stumbleUntil - race.time) / 0.7),
      );
      ctx.translate(x, y);
      ctx.rotate(0.85 * fall);
      ctx.translate(-x, -y);
    }
    drawSnake(ctx, pose, x, y, scale);
    ctx.restore();
    if (race.time < r.stumbleUntil) {
      ctx.fillStyle = "#a34324";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("앗! 넘어짐", x - 40, y - 28);
    }

    ctx.font = `${i === 0 ? "bold " : ""}11px sans-serif`;
    ctx.fillStyle = "#4d4f3f";
    ctx.textAlign = "center";
    ctx.fillText(
      `${i === 0 ? "나 · " : ""}${r.snake.name}`,
      clamp(x - r.stats.length * scale * 0.4, 65, w - 65),
      terrainCourse ? 28 + (i + 1) * laneH - 7 : y - laneH * 0.28,
    );
  });
  ctx.restore();
  ctx.fillStyle = "#75664f";
  ctx.textAlign = "center";
  ctx.font = "bold 11px sans-serif";
  for (let m = 0; m <= 100; m += 5) {
    const x = sx(m);
    if (x >= -40 && x <= w + 40) ctx.fillText(`${m}m`, x, 17);
  }
  ctx.fillStyle = "#728064";
  ctx.textAlign = "left";
  ctx.font = "10px sans-serif";
  ctx.fillText("START → 100m", 12, h - 5);
}
export { previewRacer };
