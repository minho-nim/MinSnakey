export type CourseId = "sprint" | "hills" | "puddles" | "hurdles";
export const COURSES = [
  {
    id: "sprint",
    name: "100m 달리기",
    icon: "⚑",
    description: "평지 직선 · 가속력과 공기저항 승부",
  },
  {
    id: "hills",
    name: "언덕 달리기",
    icon: "⌁",
    description: "가파른 언덕 2개 · 오르막 감속·내리막 가속",
  },
  {
    id: "puddles",
    name: "물웅덩이 달리기",
    icon: "≈",
    description: "얕은 물 2구간 · 수중 저항과 접지력 승부",
  },
  {
    id: "hurdles",
    name: "점프 장애물 달리기",
    icon: "↟",
    description: "장애물 3개 · 타이밍에 맞춰 점프!",
  },
] as const;
export const WATER_ZONES = [
  { start: 28, end: 34 },
  { start: 62, end: 68 },
];
export const HILLS = [
  { start: 16, end: 38, grade: 0.42 },
  { start: 52, end: 72, grade: 0.36 },
];
export const OBSTACLES = [
  { start: 25, end: 26, height: 0.45 },
  { start: 48, end: 49.2, height: 0.65 },
  { start: 73, end: 74, height: 0.55 },
];
export const HILL_VISUAL_RATIO = 0.65;
export const JUMP_VISUAL_RATIO = 0.4;
export function courseInfo(id: CourseId) {
  return COURSES.find((c) => c.id === id)!;
}
export function terrainAt(course: CourseId, distance: number) {
  if (course === "hills")
    for (const hill of HILLS) {
      if (distance >= hill.start && distance <= hill.end) {
        const span = hill.end - hill.start,
          phase = ((distance - hill.start) / span) * Math.PI * 2;
        return {
          grade: hill.grade * Math.sin(phase),
          elevation:
            ((hill.grade * span) / (Math.PI * 2)) * (1 - Math.cos(phase)),
          waterDepth: 0,
        };
      }
    }
  return {
    grade: 0,
    elevation: 0,
    waterDepth:
      course === "puddles" &&
      WATER_ZONES.some((z) => distance >= z.start && distance < z.end)
        ? 0.035
        : 0,
  };
}
