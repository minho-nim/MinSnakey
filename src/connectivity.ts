import { bodyRig, skinPoint } from "./geometry";
import type { Snake, PartName, Point } from "./model";
import { drawingConnection, type ConnectionReport } from "./ink-connection";
export { drawingConnection, type ConnectionReport } from "./ink-connection";
const pointDistance = (p: Point, a: Point, b: Point) => {
  const x = b.x - a.x,
    y = b.y - a.y,
    t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * x + (p.y - a.y) * y) / (x * x + y * y || 1)),
    );
  return Math.hypot(p.x - a.x - t * x, p.y - a.y - t * y);
};
const SLOP = 0.75;
const LABELS = { head: "머리", body: "몸통", tail: "꼬리" };
export function snakeConnections(snake: Snake) {
  const parts = ["head", "body", "tail"] as const;
  const reports = Object.fromEntries(
    parts.map((kind) => [kind, drawingConnection(snake.parts[kind], kind)]),
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
