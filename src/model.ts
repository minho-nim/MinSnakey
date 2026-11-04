import { bodyRig, inkArea, pathLength } from "./geometry";
export type Point = { x: number; y: number };
export type Stroke = { points: Point[]; color: string; width: number };
export type PartName = "head" | "body" | "tail";
export type Drawing = {
  strokes: Stroke[];
  anchor: Point;
  anchorManual?: boolean;
  size: { width: number; height: number };
  collision: Point[];
};
export type Snake = {
  id: string;
  name: string;
  parts: Record<PartName, Drawing>;
  createdAt: number;
};
export type Mode = "auto" | "manual";
export type Stats = {
  length: number;
  curve: number;
  flex: number;
  mass: number;
  acceleration: number;
  maxSpeed: number;
  stamina: number;
  amplitude: number;
  frequency: number;
};
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export const names: Record<PartName, string> = {
  head: "머리",
  body: "몸통",
  tail: "꼬리",
};
export function bounds(strokes: Stroke[]) {
  const p = strokes.flatMap((s) => s.points);
  if (!p.length) return { x: 0, y: 0, w: 1, h: 1 };
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const point of p) {
    x = Math.min(x, point.x);
    y = Math.min(y, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  }
  return { x, y, w: Math.max(12, right - x), h: Math.max(12, bottom - y) };
}
export function drawing(strokes: Stroke[], kind: PartName): Drawing {
  const b = bounds(strokes);
  let anchor = { x: kind === "tail" ? b.x + b.w : b.x, y: b.y + b.h / 2 };
  if(kind!=='body'&&strokes.length){
    let candidate:Point|undefined;
    for(const stroke of strokes)for(const point of stroke.points){if(!candidate||(kind==='head'?point.x<candidate.x:point.x>candidate.x)||(point.x===candidate.x&&Math.abs(point.y-anchor.y)<Math.abs(candidate.y-anchor.y)))candidate=point;}
    if(candidate)anchor={...candidate};
  }
  if (kind === "body" && strokes.length) {
    const longest = [...strokes].sort(
      (a, b) => pathLength(b.points) - pathLength(a.points),
    )[0].points;
    if (longest.length) {
      const a = longest[0],
        z = longest.at(-1)!;
      anchor = { ...(a.x >= z.x ? a : z) };
    }
  }
  return {
    strokes,
    anchor,
    size: { width: b.w, height: b.h },
    collision: [
      { x: b.x, y: b.y },
      { x: b.x + b.w, y: b.y },
      { x: b.x + b.w, y: b.y + b.h },
      { x: b.x, y: b.y + b.h },
    ],
  };
}
export function analyze(s: Snake): Stats {
  const rig = bodyRig(s.parts.body),
    b = bounds(s.parts.body.strokes);
  const length = rig.length,
    curve = rig.curve;
  const area =
    inkArea(s.parts.body.strokes) +
    inkArea(s.parts.head.strokes) +
    inkArea(s.parts.tail.strokes);
  const mass = clamp(0.5 + area / 18000, 0.65, 3.8);
  const flex = clamp(0.9 + curve * 0.17 - b.h / 1000, 0.5, 1.3);
  return {
    length,
    curve,
    flex,
    mass,
    acceleration: clamp(4.6 / mass, 1.7, 5.5),
    maxSpeed: clamp(9.3 + flex - length * 0.25 - mass * 0.18, 6.5, 10),
    stamina: clamp(0.82 + length * 0.04, 0.9, 1.1),
    amplitude: clamp(0.2 + curve * 0.045, 0.2, 0.38),
    frequency: clamp(1.85 - length * 0.065 + flex * 0.15, 1.2, 1.95),
  };
}

export function sampleSnake(index = 0): Snake {
  const colors = ["#3d7755", "#d27b43", "#7e78ad", "#5799a2"];
  const color = colors[index % 4];
  const stroke = (points: Point[], width = 12, c = color): Stroke => ({
    points,
    color: c,
    width,
  });
  const line = (fn: (t: number) => Point, n = 50) =>
    Array.from({ length: n }, (_, i) => fn(i / (n - 1)));
  const head = [
    stroke(
      line((t) => ({
        x: 80 + 51 * Math.cos(t * Math.PI * 2),
        y: 130 + 38 * Math.sin(t * Math.PI * 2),
      })),
      10,
    ),
    stroke(
      [
        { x: 97, y: 117 },
        { x: 98, y: 118 },
      ],
      10,
      "#263b30",
    ),
    stroke(
      [
        { x: 118, y: 140 },
        { x: 132, y: 139 },
      ],
      3,
      "#263b30",
    ),
  ];
  const body = [
    stroke(
      line((t) => ({
        x: 35 + t * (350 + index * 12),
        y: 140 + Math.sin(t * Math.PI * (3 + index * 0.4)) * (22 + index * 6),
      })),
      17 - index,
    ),
  ];
  const tail = [
    stroke(
      line((t) => ({ x: 25 + t * 140, y: 140 + Math.sin(t * Math.PI) * 36 })),
      10,
    ),
  ];
  return {
    id: `sample-${index}`,
    name: ["초록 꼬물이", "귤빛 쌩쌩이", "보라 지그재그", "민트 바람이"][
      index % 4
    ],
    parts: {
      head: drawing(head, "head"),
      body: drawing(body, "body"),
      tail: drawing(tail, "tail"),
    },
    createdAt: Date.now(),
  };
}
