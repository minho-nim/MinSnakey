import type { Drawing, Point, Stroke } from "./model";
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const limit = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export type Binding = { bone: number; t: number; normal: number };
export type BodyRig = {
  source: Point[];
  rest: Point[];
  scale: number;
  length: number;
  curve: number;
  head: Binding;
  bindings: Binding[][];
};
const cache = new WeakMap<Drawing, BodyRig>();
export function pathLength(points: Point[]) {
  let n = 0;
  for (let i = 1; i < points.length; i++)
    n += distance(points[i - 1], points[i]);
  return n;
}
export function project(point: Point, path: Point[]): Binding {
  let best = Infinity,
    binding = { bone: 0, t: 0, normal: 0 };
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i],
      b = path[i + 1],
      dx = b.x - a.x,
      dy = b.y - a.y,
      d = Math.hypot(dx, dy) || 1;
    const raw = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (d * d),
      t = limit(raw, 0, 1);
    const error = Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
    if (error < best) {
      best = error;
      binding = {
        bone: i,
        t: raw,
        normal: ((point.x - a.x) * -dy + (point.y - a.y) * dx) / d,
      };
    }
  }
  return binding;
}
export function skinPoint(
  binding: Binding,
  nodes: Point[],
  scale: number,
): Point {
  const a = nodes[binding.bone],
    b = nodes[binding.bone + 1],
    dx = b.x - a.x,
    dy = b.y - a.y,
    d = Math.hypot(dx, dy) || 1;
  return {
    x: a.x + dx * binding.t - (dy / d) * binding.normal * scale,
    y: a.y + dy * binding.t + (dx / d) * binding.normal * scale,
  };
}
export function bodyRig(body: Drawing): BodyRig {
  const found = cache.get(body);
  if (found) return found;
  let longest: Point[] = [];
  let total = 0;
  for (const s of body.strokes) {
    const length = pathLength(s.points);
    if (length > total) {
      total = length;
      longest = s.points;
    }
  }
  // An isolated dot gets a short, safe backbone without replacing its artwork.
  if (total < 1) {
    const p = longest[0] || body.strokes[0]?.points[0] || { x: 240, y: 210 };
    longest = [
      { x: p.x + 6, y: p.y },
      { x: p.x - 6, y: p.y },
    ];
    total = 12;
  }
  if (longest[0].x < longest.at(-1)!.x) longest = [...longest].reverse();
  const cumulative = [0];
  for (let i = 1; i < longest.length; i++)
    cumulative.push(cumulative[i - 1] + distance(longest[i - 1], longest[i]));
  const source: Point[] = [];
  let segment = 1;
  for (let i = 0; i < 25; i++) {
    const target = (total * i) / 24;
    while (segment < cumulative.length - 1 && cumulative[segment] < target)
      segment++;
    const a = longest[segment - 1],
      b = longest[segment],
      span = cumulative[segment] - cumulative[segment - 1];
    const t = span ? (target - cumulative[segment - 1]) / span : 0;
    source.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  const length = limit(total / 95, 1.5, 6.5),
    scale = length / Math.max(0.001, pathLength(source));
  const origin = source[0],
    rest = source.map((p) => ({
      x: (p.x - origin.x) * scale,
      y: (p.y - origin.y) * scale,
    }));
  const direct = distance(source[0], source.at(-1)!);
  const rig = {
    source,
    rest,
    scale,
    length,
    head: body.anchorManual
      ? project(body.anchor, source)
      : { bone: 0, t: 0, normal: 0 },
    curve: limit(total / Math.max(24, direct) - 1, 0, 3),
    bindings: body.strokes.map((s) => s.points.map((p) => project(p, source))),
  };
  cache.set(body, rig);
  return rig;
}
export function inkArea(strokes: Stroke[]) {
  return strokes.reduce(
    (sum, s) => sum + Math.max(s.width, pathLength(s.points)) * s.width,
    0,
  );
}
export function eraseStrokes(
  strokes: Stroke[],
  point: Point,
  radius: number,
): Stroke[] {
  const result: Stroke[] = [];
  for (const stroke of strokes) {
    let run: Point[] = [];
    const flush = () => {
      if (run.length) {
        const stride = Math.max(1, Math.ceil(run.length / 3000));
        result.push({
          ...stroke,
          points: run.filter((_, i) => i % stride === 0).slice(0, 3000),
        });
      }
      run = [];
    };
    const dense: Point[] = [];
    stroke.points.forEach((p, i) => {
      if (!i) {
        dense.push(p);
        return;
      }
      const a = stroke.points[i - 1],
        steps = Math.ceil(distance(a, p) / Math.max(3, radius / 2));
      for (let j = 1; j <= steps; j++)
        dense.push({
          x: a.x + ((p.x - a.x) * j) / steps,
          y: a.y + ((p.y - a.y) * j) / steps,
        });
    });
    for (const p of dense) {
      if (distance(p, point) <= radius + stroke.width / 2) flush();
      else run.push(p);
    }
    flush();
  }
  return result.slice(0, 100);
}

/** Broad neck direction keeps a wavy/vertical endpoint from turning the face
 * downward or backward. The actual attachment point stays on the source ink. */
export function partFrame(rig: BodyRig, nodes: Point[], kind: "head" | "tail") {
  const head = kind === "head",
    last = nodes.length - 1;
  const node = head ? skinPoint(rig.head, nodes, rig.scale) : nodes[last];
  const other =
    nodes[head ? Math.min(last, rig.head.bone + 5) : Math.max(0, last - 5)];
  const dx = head ? node.x - other.x : other.x - node.x;
  const dy = head ? node.y - other.y : other.y - node.y;
  const angle = limit(
    Math.atan2(dy, Math.max(0.1, Math.abs(dx))),
    head ? -0.22 : -0.35,
    head ? 0.22 : 0.35,
  );
  return { node, angle };
}
