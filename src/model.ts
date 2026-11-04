import { vehicleCharacteristics } from "./dynamics";
import { snakeRig, inkArea, pathLength } from "./geometry";
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
export const RULES_VERSION = "morphology-v4";
export type Stats = {
  frontalArea: number;
  dragCoefficient: number;
  rollingCoefficient: number;
  drivePower: number;
  driveForce: number;
  efficiency: number;
  energyCapacity: number;
  traction: number;
  headReach: number;
  tailReach: number;
  size: number;
  thickness: number;
  stability: number;
  grip: number;
  headLoad: number;
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
  if (kind !== "body" && strokes.length) {
    let candidate: Point | undefined;
    for (const stroke of strokes)
      for (const point of stroke.points) {
        if (
          !candidate ||
          (kind === "head" ? point.x < candidate.x : point.x > candidate.x) ||
          (point.x === candidate.x &&
            Math.abs(point.y - anchor.y) < Math.abs(candidate.y - anchor.y))
        )
          candidate = point;
      }
    if (candidate) anchor = { ...candidate };
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
  const rig = snakeRig(s),
    body = s.parts.body,
    bodyBounds = bounds(body.strokes);
  const length = rig.length,
    curve = rig.curve;
  const bodyPath = body.strokes.reduce(
    (n, stroke) => n + Math.max(1, pathLength(stroke.points)),
    0,
  );
  const meanWidth = bodyPath ? inkArea(body.strokes) / bodyPath : 12;
  const thickness = clamp(meanWidth * rig.scale, 0.03, 0.65);
  const headBounds = bounds(s.parts.head.strokes),
    tailBounds = bounds(s.parts.tail.strokes);
  const headArea = s.parts.head.strokes.length
    ? headBounds.w * headBounds.h * rig.scale ** 2
    : 0;
  const tailArea = s.parts.tail.strokes.length
    ? tailBounds.w * tailBounds.h * rig.scale ** 2
    : 0;
  const ink =
    inkArea(body.strokes) +
    inkArea(s.parts.head.strokes) +
    inkArea(s.parts.tail.strokes);
  const mass = clamp(
    0.4 +
      ((ink * (rig.scale * 95) ** 2) / 10500) ** 1.35 +
      Math.min(headArea + tailArea, 12) * 0.13,
    0.45,
    7.5,
  );
  // Size is occupied body bulk, not body length a second time.
  const size = clamp(
    thickness +
      Math.sqrt(headArea) * 0.55 +
      Math.min(bodyBounds.h * rig.scale, 2) * 0.15,
    0.08,
    2.5,
  );
  const long = clamp((length - 1.5) / 5, 0, 1),
    weight = clamp((mass - 0.45) / 7.05, 0, 1),
    bulk = clamp((size - 0.08) / 1.52, 0, 1);
  const headLoad = clamp(
    headArea / Math.max(0.1, length * thickness + 0.1),
    0,
    3,
  );
  const flex = clamp(
    1.25 - 0.22 * bulk - 0.2 * weight + 0.1 * Math.min(curve, 1) - 0.1 * long,
    0.45,
    1.3,
  );
  const vehicle = vehicleCharacteristics({
    length,
    mass,
    size,
    thickness,
    curve,
    headLoad,
    flex,
  });
  return {
    length,
    curve,
    flex,
    mass,
    size,
    thickness,
    headLoad,
    ...vehicle,
    headReach: Math.min(5, headBounds.w * rig.scale),
    tailReach: Math.min(5, tailBounds.w * rig.scale),
    amplitude: clamp(0.2 + curve * 0.04 + flex * 0.02, 0.2, 0.38),
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
  let head = [
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
  let body = [
    stroke(
      line((t) => ({
        x: 35 + t * (350 + index * 12),
        y: 140 + Math.sin(t * Math.PI * (3 + index * 0.4)) * (22 + index * 6),
      })),
      17 - index,
    ),
  ];
  let tail = [
    stroke(
      line((t) => ({ x: 25 + t * 140, y: 140 + Math.sin(t * Math.PI) * 36 })),
      10,
    ),
  ];
  // Every CPU uses its actual drawing for both rendering and physical stats.
  // Keep the player's familiar sample (index 0) unchanged.
  const kind = index % 4;
  if (kind === 1) {
    // Angular little dragon: triangular snout, horns, sawtooth body and tail.
    head = [
      stroke(
        [
          { x: 28, y: 135 },
          { x: 65, y: 104 },
          { x: 139, y: 133 },
          { x: 72, y: 157 },
          { x: 28, y: 135 },
        ],
        8,
      ),
      stroke(
        [
          { x: 48, y: 116 },
          { x: 44, y: 87 },
          { x: 70, y: 106 },
        ],
        6,
      ),
      stroke(
        [
          { x: 88, y: 120 },
          { x: 89, y: 121 },
        ],
        8,
        "#263b30",
      ),
      stroke(
        [
          { x: 112, y: 141 },
          { x: 135, y: 135 },
        ],
        3,
        "#263b30",
      ),
    ];
    body = [
      stroke(
        line((t) => ({
          x: 35 + t * 310,
          y: 140 + Math.asin(Math.sin(t * Math.PI * 6)) * 19,
        })),
        14,
      ),
    ];
    tail = [
      stroke(
        [
          { x: 25, y: 140 },
          { x: 65, y: 118 },
          { x: 98, y: 147 },
          { x: 125, y: 128 },
          { x: 155, y: 140 },
        ],
        7,
      ),
    ];
  } else if (kind === 2) {
    // Round dumpling: wide cheeks, two protruding eyes, a chunky low body.
    head = [
      stroke(
        line((t) => ({
          x: 83 + 55 * Math.cos(t * Math.PI * 2),
          y: 137 + 43 * Math.sin(t * Math.PI * 2),
        })),
        13,
      ),
      ...[65, 104].map((x) =>
        stroke(
          line(
            (t) => ({
              x: x + 12 * Math.cos(t * Math.PI * 2),
              y: 99 + 14 * Math.sin(t * Math.PI * 2),
            }),
            24,
          ),
          6,
        ),
      ),
      ...[67, 107].map((x) =>
        stroke(
          [
            { x, y: 96 },
            { x: x + 1, y: 97 },
          ],
          6,
          "#263b30",
        ),
      ),
      stroke(
        line(
          (t) => ({ x: 80 + t * 37, y: 143 + 9 * Math.sin(t * Math.PI) }),
          20,
        ),
        4,
        "#263b30",
      ),
    ];
    body = [
      stroke(
        line((t) => ({
          x: 35 + t * 255,
          y: 140 + Math.sin(t * Math.PI * 4) * 14,
        })),
        27,
      ),
    ];
    tail = [
      stroke(
        line((t) => ({ x: 25 + t * 95, y: 140 + Math.sin(t * Math.PI) * 24 })),
        17,
      ),
    ];
  } else if (kind === 3) {
    // Slender ribbon fish: pointed head, long sweeping body, forked tail.
    head = [
      stroke(
        [
          { x: 28, y: 137 },
          { x: 78, y: 112 },
          { x: 148, y: 137 },
          { x: 78, y: 153 },
          { x: 28, y: 137 },
        ],
        7,
      ),
      stroke(
        [
          { x: 105, y: 129 },
          { x: 106, y: 130 },
        ],
        7,
        "#263b30",
      ),
      stroke(
        [
          { x: 140, y: 138 },
          { x: 151, y: 138 },
        ],
        3,
        "#263b30",
      ),
      stroke(
        [
          { x: 55, y: 121 },
          { x: 43, y: 99 },
          { x: 83, y: 116 },
        ],
        4,
      ),
    ];
    body = [
      stroke(
        line(
          (t) => ({
            x: 35 + t * 470,
            y: 140 + Math.sin(t * Math.PI * 2.5) * 32,
          }),
          70,
        ),
        9,
      ),
    ];
    tail = [
      stroke(
        [
          { x: 25, y: 140 },
          { x: 80, y: 140 },
          { x: 136, y: 108 },
          { x: 117, y: 140 },
          { x: 136, y: 166 },
          { x: 80, y: 140 },
        ],
        5,
      ),
    ];
  }
  return {
    id: `sample-${index}`,
    name: ["초록 꼬물이", "귤빛 뿔룡이", "보라 통통이", "민트 리본이"][
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

const opponentCache = new WeakMap<Snake, Snake[]>();
/** Select nearby equipment classes from actual drawings, never race progress. */
export function matchedOpponents(player: Snake): Snake[] {
  const cached = opponentCache.get(player);
  if (cached) return cached;
  const pace = (s: Stats) =>
    100 / Math.max(1, s.maxSpeed) +
    s.maxSpeed / (2 * Math.max(0.25, s.acceleration));
  const target = pace(analyze(player));
  const opponents = [1, 2, 3].map((index) => {
    const template = sampleSnake(index),
      desired = target * [0.98, 1.04, 1.09][index - 1];
    let chosen = template,
      error = Infinity;
    for (let j = 0; j < 18; j++) {
      const factor = 0.45 + j * 0.23;
      const candidate = {
        ...template,
        parts: Object.fromEntries(
          (["head", "body", "tail"] as const).map((kind) => [
            kind,
            {
              ...template.parts[kind],
              strokes: template.parts[kind].strokes.map((stroke) => ({
                ...stroke,
                width: clamp(stroke.width * factor, 1, 40),
              })),
            },
          ]),
        ) as Snake["parts"],
      };
      const difference = Math.abs(Math.log(pace(analyze(candidate)) / desired));
      if (difference < error) {
        chosen = candidate;
        error = difference;
      }
    }
    return chosen;
  });
  opponentCache.set(player, opponents);
  return opponents;
}
