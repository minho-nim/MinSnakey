import { bodyRig, skinPoint } from "./geometry";
import type { Drawing, PartName, Point, Snake } from "./model";
const SLOP = 0.75;
type Segment = { a: Point; b: Point; width: number; stroke: number };
export type ConnectionReport = {
  connected: boolean;
  detached: number[];
  anchorAttached: boolean;
  missing: boolean;
};
const cache = new WeakMap<Drawing, ConnectionReport>();
const pointDistance = (p: Point, a: Point, b: Point) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function segmentDistance(a: Point, b: Point, c: Point, d: Point) {
  const ac = cross(a, b, c),
    ad = cross(a, b, d),
    ca = cross(c, d, a),
    cb = cross(c, d, b);
  if (ac * ad < 0 && ca * cb < 0) return 0;
  return Math.min(
    pointDistance(a, c, d),
    pointDistance(b, c, d),
    pointDistance(c, a, b),
    pointDistance(d, a, b),
  );
}
function inside(p: Point, polygon: Point[]) {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      yes = !yes;
  }
  return yes;
}
/** Stroke capsules must touch the anchored component. Closed-outline interior
 * details (eyes, mouth) belong to that component without needing drawn bridges. */
export function drawingConnection(drawing: Drawing): ConnectionReport {
  const old = cache.get(drawing);
  if (old) return old;
  const strokes = drawing.strokes,
    parent = strokes.map((_, i) => i),
    root = (i: number): number =>
      parent[i] === i ? i : (parent[i] = root(parent[i]));
  const join = (a: number, b: number) => {
    parent[root(a)] = root(b);
  };
  const grid = new Map<string, Segment[]>(),
    anchorStrokes: number[] = [];
  for (let index = 0; index < strokes.length; index++) {
    const stroke = strokes[index];
    let touches = false;
    for (let j = 0; j < stroke.points.length; j++) {
      if (j === 0 && stroke.points.length > 1) continue;
      const a = stroke.points[Math.max(0, j - 1)],
        b = stroke.points[j];
      if (pointDistance(drawing.anchor, a, b) <= stroke.width / 2 + SLOP)
        touches = true;
      // Split long sparse segments for bounded spatial lookup; keep exact geometry.
      const pieces = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 24),
      );
      for (let k = 0; k < pieces; k++) {
        const segment: Segment = {
          a: {
            x: a.x + ((b.x - a.x) * k) / pieces,
            y: a.y + ((b.y - a.y) * k) / pieces,
          },
          b: {
            x: a.x + ((b.x - a.x) * (k + 1)) / pieces,
            y: a.y + ((b.y - a.y) * (k + 1)) / pieces,
          },
          width: stroke.width,
          stroke: index,
        };
        const radius = stroke.width / 2 + SLOP,
          keys: string[] = [];
        for (
          let x = Math.floor(
            (Math.min(segment.a.x, segment.b.x) - radius) / 24,
          );
          x <= Math.floor((Math.max(segment.a.x, segment.b.x) + radius) / 24);
          x++
        )
          for (
            let y = Math.floor(
              (Math.min(segment.a.y, segment.b.y) - radius) / 24,
            );
            y <= Math.floor((Math.max(segment.a.y, segment.b.y) + radius) / 24);
            y++
          )
            keys.push(x + "," + y);
        const seen = new Set<Segment>();
        for (const key of keys)
          for (const other of grid.get(key) || []) {
            if (
              other.stroke === index ||
              root(other.stroke) === root(index) ||
              seen.has(other)
            )
              continue;
            seen.add(other);
            if (
              segmentDistance(segment.a, segment.b, other.a, other.b) <=
              (segment.width + other.width) / 2 + SLOP
            )
              join(index, other.stroke);
          }
        for (const key of keys) {
          const cell = grid.get(key) || [];
          cell.push(segment);
          grid.set(key, cell);
        }
      }
    }
    if (touches) anchorStrokes.push(index);
  }
  const closed = strokes
    .map((s, i) => ({ s, i }))
    .filter(
      ({ s }) =>
        s.points.length >= 4 &&
        Math.hypot(
          s.points[0].x - s.points.at(-1)!.x,
          s.points[0].y - s.points.at(-1)!.y,
        ) <=
          s.width + SLOP,
    );
  for (const { s: outer, i } of closed)
    for (let j = 0; j < strokes.length; j++)
      if (
        root(i) !== root(j) &&
        strokes[j].points.every((p) => inside(p, outer.points))
      )
        join(i, j);
  if (anchorStrokes.length)
    for (const i of anchorStrokes) join(i, anchorStrokes[0]);
  const detached = strokes
    .map((_, i) => i)
    .filter((i) => !anchorStrokes.length || root(i) !== root(anchorStrokes[0]));
  const result = {
    connected:
      strokes.length > 0 && anchorStrokes.length > 0 && detached.length === 0,
    detached,
    anchorAttached: anchorStrokes.length > 0,
    missing: strokes.length === 0,
  };
  cache.set(drawing, result);
  return result;
}
const LABELS = { head: "머리", body: "몸통", tail: "꼬리" };
export function snakeConnections(snake: Snake) {
  const parts = ["head", "body", "tail"] as const;
  const reports = Object.fromEntries(
    parts.map((kind) => [kind, drawingConnection(snake.parts[kind])]),
  ) as Record<PartName, ConnectionReport>;
  // Check the real body slots as well, including the safe backbone of a dot.
  if (reports.body.connected) {
    const body = snake.parts.body,
      rig = bodyRig(body),
      head = skinPoint(rig.head, rig.rest, rig.scale);
    const slots = [
      {
        x: rig.source[0].x + head.x / rig.scale,
        y: rig.source[0].y + head.y / rig.scale,
      },
      rig.source.at(-1)!,
    ];
    const touches = (p: Point) =>
      body.strokes.some((s) =>
        s.points.some(
          (q, i) =>
            pointDistance(p, s.points[Math.max(0, i - 1)], q) <=
            s.width / 2 + SLOP,
        ),
      );
    if (!slots.every(touches))
      reports.body = {
        ...reports.body,
        connected: false,
        detached: body.strokes.map((_, i) => i),
      };
  }
  const invalid = parts.filter((kind) => !reports[kind].connected);
  return {
    connected: invalid.length === 0,
    reports,
    invalid,
    message: invalid
      .map((kind) =>
        reports[kind].missing
          ? `${LABELS[kind]} 부위를 그려 주세요.`
          : `${LABELS[kind]} 부위가 떨어져 있습니다. 선을 이어 붙이거나 연결점을 선 위로 옮겨 주세요.`,
      )
      .join(" "),
  };
}
