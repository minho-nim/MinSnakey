import type { CourseId } from "./courses";
import { RULES_VERSION } from "./model";
import type { Mode, Snake, Stroke, PartName } from "./model";
const KEY = "kkumul-race:v1";
export type RecordEntry = {
  rulesVersion?: string;
  course?: CourseId;
  snakeId: string;
  mode: Mode;
  time: number;
  date: number;
};
export type Saved = { snakes: Snake[]; records: RecordEntry[] };
const parts: PartName[] = ["head", "body", "tail"];
export function validSnake(value: unknown): value is Snake {
  if (!value || typeof value !== "object") return false;
  const s = value as Snake;
  return (
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    s.name.length <= 60 &&
    parts.every((k) => {
      const d = s.parts?.[k];
      return (
        d &&
        Number.isFinite(d.anchor?.x) &&
        Number.isFinite(d.anchor?.y) &&
        Array.isArray(d.strokes) &&
        d.strokes.length > 0 &&
        d.strokes.length <= 100 &&
        d.strokes.every(
          (st: Stroke) =>
            typeof st.color === "string" &&
            /^#[0-9a-f]{6}$/i.test(st.color) &&
            st.width >= 1 &&
            st.width <= 40 &&
            Array.isArray(st.points) &&
            st.points.length > 0 &&
            st.points.length <= 3000 &&
            st.points.every(
              (p) =>
                Number.isFinite(p.x) &&
                Number.isFinite(p.y) &&
                Math.abs(p.x) <= 2000 &&
                Math.abs(p.y) <= 2000,
            ),
        )
      );
    })
  );
}
export function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      snakes: Array.isArray(raw.snakes)
        ? raw.snakes.filter(validSnake).slice(0, 20)
        : [],
      records: Array.isArray(raw.records)
        ? raw.records
            .filter(
              (r: RecordEntry) =>
                typeof r.snakeId === "string" &&
                ["auto", "manual"].includes(r.mode) &&
                Number.isFinite(r.time) &&
                r.time > 0 &&
                Number.isFinite(r.date),
            )
            .slice(-200)
        : [],
    };
  } catch {
    return { snakes: [], records: [] };
  }
}
export function save(data: Saved): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
export function best(
  data: Saved,
  snakeId: string,
  mode: Mode,
  rulesVersion = RULES_VERSION,
  course: CourseId = "sprint",
) {
  const times = data.records
    .filter(
      (r) =>
        r.snakeId === snakeId &&
        r.mode === mode &&
        (r.rulesVersion || "legacy") === rulesVersion &&
        (r.course || "sprint") === course,
    )
    .map((r) => r.time);
  return times.length ? Math.min(...times) : null;
}

export function previousRulesBest(
  data: Saved,
  snakeId: string,
  mode: Mode,
  course: CourseId,
) {
  const times = data.records
    .filter(
      (r) =>
        r.snakeId === snakeId &&
        r.mode === mode &&
        (r.course || "sprint") === course &&
        (r.rulesVersion || "legacy") !== RULES_VERSION,
    )
    .map((r) => r.time);
  return times.length ? Math.min(...times) : null;
}
