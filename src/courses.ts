export type CourseId = "sprint" | "hills" | "puddles";
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
    description: "오르막·내리막 · 출력 대비 무게 승부",
  },
  {
    id: "puddles",
    name: "물웅덩이 달리기",
    icon: "≈",
    description: "얕은 물 2구간 · 수중 저항과 접지력 승부",
  },
] as const;
export const WATER_ZONES = [
  { start: 28, end: 34 },
  { start: 62, end: 68 },
];
export function courseInfo(id: CourseId) {
  return COURSES.find((c) => c.id === id)!;
}
export function terrainAt(course: CourseId, distance: number) {
  if (course === "hills" && distance >= 18 && distance <= 82) {
    const phase = ((distance - 18) / 64) * Math.PI * 2;
    return {
      grade: 0.14 * Math.sin(phase),
      elevation: ((0.14 * 64) / (Math.PI * 2)) * (1 - Math.cos(phase)),
      waterDepth: 0,
    };
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
