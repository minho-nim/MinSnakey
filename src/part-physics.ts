import type { PartName, Point } from "./model";
import {
  bound,
  fluidDrag,
  submergedCircleArea,
  AIR_DENSITY,
  WATER_DENSITY,
} from "./dynamics";
export type PartProfile = {
  mass: number;
  centerX: number;
  diameter: number;
  frontalArea: number;
  dragCoefficient: number;
  exposure: number;
  finArea: number;
  balance: number;
};
export type PartProfiles = Record<PartName, PartProfile>;
export function partResistance(
  parts: PartProfiles,
  speed: number,
  waterDepth: number,
  jumpHeight: number,
  pitch: number,
  centerOfMass: number,
) {
  const water = { head: 0, body: 0, tail: 0 },
    immersed = { head: 0, body: 0, tail: 0 };
  let air = 0,
    buoyancy = 0;
  for (const kind of ["head", "body", "tail"] as const) {
    const p = parts[kind];
    air += fluidDrag(
      AIR_DENSITY,
      p.dragCoefficient,
      p.frontalArea * p.exposure,
      speed,
    );
    const depth = Math.max(
      0,
      waterDepth - jumpHeight + Math.sin(pitch) * (p.centerX - centerOfMass),
    );
    const area = waterDepth > 0 ? submergedCircleArea(p.diameter, depth) : 0;
    immersed[kind] = p.frontalArea ? bound(area / p.frontalArea, 0, 1) : 0;
    water[kind] = fluidDrag(
      WATER_DENSITY,
      p.dragCoefficient * 1.15,
      area * p.exposure,
      speed,
    );
    buoyancy += WATER_DENSITY * 9.81 * (p.mass / 1050) * immersed[kind];
  }
  return {
    air,
    water,
    immersed,
    buoyancy,
    wet: Object.values(immersed).some((v) => v > 0),
  };
}
export function inertiaOf(parts: PartProfiles, length: number) {
  const mass = Object.values(parts).reduce((n, p) => n + p.mass, 0),
    centerOfMass =
      Object.values(parts).reduce((n, p) => n + p.mass * p.centerX, 0) / mass;
  const inertia = Math.max(
    0.08,
    Object.values(parts).reduce(
      (n, p) =>
        n + p.mass * ((p.centerX - centerOfMass) ** 2 + p.diameter ** 2 / 8),
      0,
    ) +
      (parts.body.mass * length ** 2) / 12,
  );
  return { centerOfMass, inertia };
}
export const PART_DRAW_TIPS = {
  head: {
    title: "머리 · 저항과 충돌",
    tips: ["작고 길쭉하게 → 저항 ↓", "크고 무겁게 → 앞쪽 쏠림 ↑"],
    note: "눈·입 장식은 무게에 넣지 않아요.",
  },
  body: {
    title: "몸통 · 추진과 지구력",
    tips: [
      "길고 적당히 굵게 → 힘·지구력 ↑",
      "너무 굵거나 구불구불 → 저항·손실 ↑",
    ],
    note: "오른쪽이 머리, 왼쪽이 꼬리예요.",
  },
  tail: {
    title: "꼬리 · 물속 추진과 착지",
    tips: ["넓게 → 물을 미는 힘·물 저항 ↑", "길게 → 착지 흔들림 ↓ · 무게 ↑"],
    note: "오른쪽 연결점에서 왼쪽으로 그려요.",
  },
} as const;

export function partTraitLabels(
  stats: import("./model").Stats,
  kind: PartName,
) {
  const label = (n: number, a: number, b: number, words: string[]) =>
    words[n < a ? 0 : n < b ? 1 : 2];
  const p = stats.parts[kind];
  if (kind === "head")
    return [
      "저항 " +
        label(p.frontalArea * p.dragCoefficient, 0.045, 0.13, [
          "적음",
          "보통",
          "큼",
        ]),
      "앞쪽 무게 " +
        label(p.mass / stats.mass, 0.2, 0.38, ["가벼움", "보통", "묵직함"]),
    ];
  if (kind === "body")
    return [
      "추진 " + label(stats.drivePower, 30, 43, ["약함", "보통", "강함"]),
      "지구력 " + label(stats.stamina, 0.7, 1.2, ["낮음", "보통", "높음"]),
    ];
  return [
    "물 추진 " + label(p.finArea, 0.03, 0.12, ["약함", "보통", "강함"]),
    "착지 균형 " + label(p.balance, 0.25, 0.5, ["낮음", "보통", "높음"]),
  ];
}
