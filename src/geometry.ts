import { drawingConnection } from "./ink-connection";
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
/** Join end-to-end body strokes before choosing the physical backbone. */
function closedCenterline(path: Point[], width: number) {
  const first = path[0],
    last = path.at(-1)!;
  if (path.length > 5 && distance(first, last) <= width + 1) {
    let left = 0,
      right = 0;
    path.forEach((p, i) => {
      if (p.x < path[left].x) left = i;
      if (p.x > path[right].x) right = i;
    });
    if (path[right].x - path[left].x > 12) {
      const arc = (direction: number) => {
        const points = [path[right]];
        let i = right;
        for (let count = 0; count < path.length; count++) {
          i = (i + direction + path.length) % path.length;
          points.push(path[i]);
          if (i === left) break;
        }
        return points;
      };
      const sample = (points: Point[], t: number) => {
        const target = pathLength(points) * t;
        let length = 0;
        for (let i = 1; i < points.length; i++) {
          const span = distance(points[i - 1], points[i]);
          if (length + span >= target) {
            const k = span ? (target - length) / span : 0;
            return {
              x: points[i - 1].x + (points[i].x - points[i - 1].x) * k,
              y: points[i - 1].y + (points[i].y - points[i - 1].y) * k,
            };
          }
          length += span;
        }
        return points.at(-1)!;
      };
      const a = arc(1),
        b = arc(-1);
      path = Array.from({ length: 25 }, (_, i) => {
        const p = sample(a, i / 24),
          q = sample(b, i / 24);
        return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      });
    }
  }
  return path;
}
function backbone(strokes: Stroke[]) {
  let selected = -1,
    longest = 0;
  strokes.forEach((stroke, i) => {
    const length = pathLength(stroke.points);
    if (length > longest) {
      selected = i;
      longest = length;
    }
  });
  if (selected < 0) return [];
  let path = [...strokes[selected].points];
  const used = new Set([selected]);
  for (let phase = 0; phase < 2; phase++) {
    path = closedCenterline(path, strokes[selected].width);
    for (let pass = 0; pass < strokes.length; pass++) {
      let choice: {
        index: number;
        front: boolean;
        points: Point[];
        length: number;
      } | null = null;
      strokes.forEach((stroke, index) => {
        if (used.has(index) || stroke.points.length < 2) return;
        const length = pathLength(stroke.points);
        if (length < 2) return;
        for (const front of [false, true])
          for (const reverse of [false, true]) {
            const points = reverse
              ? [...stroke.points].reverse()
              : stroke.points;
            const join = front ? points.at(-1)! : points[0],
              end = front ? path[0] : path.at(-1)!;
            const radius = (stroke.width + strokes[selected].width) / 2 + 0.75;
            if (
              distance(join, end) <= radius &&
              (!choice || length > choice.length)
            )
              choice = { index, front, points, length };
          }
      });
      if (!choice) break;
      const chosen = choice as {
        index: number;
        front: boolean;
        points: Point[];
        length: number;
      };
      used.add(chosen.index);
      path = chosen.front
        ? [...chosen.points, ...path]
        : [...path, ...chosen.points];
    }
  }
  return path;
}
export function bodyRig(body: Drawing): BodyRig {
  const found = cache.get(body);
  if (found) return found;
  let longest = backbone(body.strokes),
    total = pathLength(longest);
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

/** Apply only motion relative to the drawn rest pose; never rotate a newly
 * assembled part to match an absolute endpoint angle. */
export function partFrame(rig: BodyRig, nodes: Point[], kind: "head" | "tail") {
  const head = kind === "head",
    last = nodes.length - 1;
  const node = head ? skinPoint(rig.head, nodes, rig.scale) : nodes[last];
  const index = head
    ? Math.min(last, rig.head.bone + 5)
    : Math.max(0, last - 5);
  const restNode = head
    ? skinPoint(rig.head, rig.rest, rig.scale)
    : rig.rest[last];
  const direction = (at: Point, other: Point) =>
    Math.atan2(
      head ? at.y - other.y : other.y - at.y,
      Math.max(0.1, Math.abs(at.x - other.x)),
    );
  const delta =
    direction(node, nodes[index]) - direction(restNode, rig.rest[index]);
  const angle = limit(
    Math.atan2(Math.sin(delta), Math.cos(delta)),
    head ? -0.12 : -0.18,
    head ? 0.12 : 0.18,
  );
  return { node, angle };
}

const fittedRigs = new WeakMap<
  Drawing,
  { head: Drawing; tail: Drawing; rig: BodyRig; factor: number }
>();
/** Fit assembled ink uniformly into a shared race class; source drawings stay intact. */
export function snakeRig(snake: import("./model").Snake): BodyRig {
  const { head, body, tail } = snake.parts,
    previous = fittedRigs.get(body);
  if (previous?.head === head && previous.tail === tail) return previous.rig;
  const base = bodyRig(body);
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity;
  const include = (p: Point, width: number) => {
    left = Math.min(left, p.x - width / 2);
    right = Math.max(right, p.x + width / 2);
    top = Math.min(top, p.y - width / 2);
    bottom = Math.max(bottom, p.y + width / 2);
  };
  body.strokes.forEach((stroke, i) =>
    stroke.points.forEach((_, j) =>
      include(
        skinPoint(base.bindings[i][j], base.rest, base.scale),
        stroke.width * base.scale,
      ),
    ),
  );
  for (const kind of ["head", "tail"] as const) {
    const { node, angle } = partFrame(base, base.rest, kind),
      co = Math.cos(angle),
      si = Math.sin(angle),
      part = snake.parts[kind];
    for (const stroke of part.strokes)
      for (const p of stroke.points) {
        const px = (p.x - part.anchor.x) * base.scale,
          py = (p.y - part.anchor.y) * base.scale;
        include(
          { x: node.x + px * co - py * si, y: node.y + px * si + py * co },
          stroke.width * base.scale,
        );
      }
  }
  const w = Math.max(0.1, right - left),
    h = Math.max(0.1, bottom - top);
  const factor = Math.min(
    6.4 / w,
    1.6 / h,
    Math.max(1, Math.min(1.35, 4.2 / w)),
  );
  const rig = {
    ...base,
    scale: base.scale * factor,
    length: base.length * factor,
    rest: base.rest.map((p) => ({ x: p.x * factor, y: p.y * factor })),
  };
  fittedRigs.set(body, { head, tail, rig, factor });
  return rig;
}
