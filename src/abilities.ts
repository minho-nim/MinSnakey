import type { Stats } from "./model";
export const ABILITIES = [
  {
    key: "acceleration",
    label: "가속력",
    min: 0.25,
    max: 10.5,
    hint: "같은 추진력이라면 가벼울수록 출발이 빨라요",
  },
  {
    key: "maxSpeed",
    label: "최고속도",
    min: 1,
    max: 14,
    hint: "출력과 공기저항·지면저항의 균형으로 정해져요",
  },
  {
    key: "stamina",
    label: "지구력",
    min: 0.45,
    max: 1.8,
    hint: "길고 굵은 몸은 체력을 오래 유지해요",
  },
  {
    key: "flex",
    label: "유연성",
    min: 0.45,
    max: 1.3,
    hint: "가볍고 날씬하면 몸을 쉽게 굽혀요",
  },
  {
    key: "stability",
    label: "안정성",
    min: 0.25,
    max: 0.98,
    hint: "균형 잡힌 머리와 완만한 굴곡이 유리해요",
  },
  {
    key: "traction",
    label: "접지력",
    min: 3,
    max: 75,
    hint: "굵고 묵직하면 파동의 힘을 지면에 잘 전달해요",
  },
] as const;
export function abilityScore(
  stats: Stats,
  key: (typeof ABILITIES)[number]["key"],
) {
  const rule = ABILITIES.find((r) => r.key === key)!;
  return Math.round(
    Math.max(
      0,
      Math.min(100, ((stats[key] - rule.min) / (rule.max - rule.min)) * 100),
    ),
  );
}
export function bodyType(stats: Stats) {
  if (stats.mass >= 3.0) return "묵직한 접지형";
  if (stats.length >= 4.5) return "긴 지구력형";
  if (stats.mass < 1.2 && stats.length < 3.2) return "가벼운 가속형";
  return "균형형";
}
export function bodyTip(stats: Stats) {
  if (stats.headLoad > 1.8) return "머리가 몸통에 비해 커서 안정성이 낮아져요.";
  if (stats.mass >= 3.0)
    return "접지력은 좋지만 출발 가속과 최고속도에 부담이 있어요.";
  if (stats.length >= 4.5)
    return "긴 몸은 직진 안정성과 출력 여유가 있지만 무게도 늘어요.";
  if (stats.mass < 1.2)
    return "가벼워서 가속에 유리하지만 지면에 전달할 수 있는 힘은 작아요.";
  return "여섯 능력치의 장단점을 비교하며 모양을 바꿔보세요.";
}
