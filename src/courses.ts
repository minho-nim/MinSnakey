export type CourseId = "combined" | "sprint" | "hills" | "puddles" | "hurdles";
export const COURSES = [
  {
    id: "combined",
    name: "종합경기",
    icon: "★",
    description:
      "메인 경기 · 출발 가속 → 언덕 → 물 저항 → 점프 · 종합 체형 승부",
  },
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
export const COMBINED_HILLS = [{ start: 20, end: 42, grade: 0.4 }];
export const COMBINED_WATER = [
  { start: 50, end: 58 },
  { start: 64, end: 72 },
];
export const COMBINED_OBSTACLES = [
  { start: 80, end: 81, height: 0.45 },
  { start: 92, end: 93, height: 0.55 },
];
export const hillsFor = (course: CourseId) =>
  course === "combined" ? COMBINED_HILLS : course === "hills" ? HILLS : [];
export const waterZonesFor = (course: CourseId) =>
  course === "combined"
    ? COMBINED_WATER
    : course === "puddles"
      ? WATER_ZONES
      : [];
export const obstaclesFor = (course: CourseId) =>
  course === "combined"
    ? COMBINED_OBSTACLES
    : course === "hurdles"
      ? OBSTACLES
      : [];
export function terrainAt(course: CourseId, distance: number) {
  for (const hill of hillsFor(course)) {
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
    waterDepth: waterZonesFor(course).some(
      (z) => distance >= z.start && distance < z.end,
    )
      ? 0.035
      : 0,
  };
}
