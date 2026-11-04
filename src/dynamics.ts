// SI units throughout: kg, m, s, N and W. Coefficients inferred from a drawing
// are gameplay approximations; the force equations themselves keep their units.
export const GRAVITY = 9.81,
  AIR_DENSITY = 1.225,
  WATER_DENSITY = 1000;
export const bound = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export function fluidDrag(
  density: number,
  coefficient: number,
  area: number,
  speed: number,
) {
  return 0.5 * density * coefficient * area * speed * speed;
}
export function rollingForce(mass: number, coefficient: number, grade = 0) {
  return (coefficient * mass * GRAVITY) / Math.sqrt(1 + grade * grade);
}
export function slopeForce(mass: number, grade: number) {
  return (mass * GRAVITY * grade) / Math.sqrt(1 + grade * grade);
}
export function terminalSpeed(
  power: number,
  mass: number,
  area: number,
  cd: number,
  rolling: number,
) {
  let low = 0,
    high = 18;
  for (let i = 0; i < 55; i++) {
    const v = (low + high) / 2,
      required =
        (fluidDrag(AIR_DENSITY, cd, area, v) + rollingForce(mass, rolling)) * v;
    if (required < power) low = v;
    else high = v;
  }
  return (low + high) / 2;
}
export function submergedCircleArea(diameter: number, depth: number) {
  const r = diameter / 2,
    h = bound(depth, 0, diameter);
  if (!h) return 0;
  const theta = 2 * Math.acos(bound((r - h) / r, -1, 1));
  return 0.5 * r * r * (theta - Math.sin(theta));
}
export type VehicleShape = {
  length: number;
  mass: number;
  size: number;
  thickness: number;
  curve: number;
  headLoad: number;
  flex: number;
};
export function vehicleCharacteristics(shape: VehicleShape) {
  const { length, mass, size, thickness, curve, headLoad, flex } = shape;
  const stability = bound(
    0.65 + (0.28 * length) / 6.5 - 0.1 * curve - 0.1 * headLoad - 0.09 * size,
    0.25,
    0.98,
  );
  const grip = bound(
    0.72 + 0.18 * Math.min(thickness / 0.4, 1) - 0.1 * Math.min(curve, 2),
    0.55,
    0.95,
  );
  const traction = grip * mass * GRAVITY;
  const frontalArea = (Math.PI * Math.max(thickness, size * 0.65) ** 2) / 4;
  const dragCoefficient = bound(
    0.25 + 0.28 / (1 + length / (size + 0.1)) + 0.12 * headLoad + 0.07 * curve,
    0.25,
    1.2,
  );
  const rollingCoefficient =
    0.018 + (0.018 * thickness) / 0.65 + (0.006 * length) / 6.5 + 0.006 * curve;
  // More body can hold more muscle/energy, with bounded output instead of an
  // unlimited advantage from adding strokes or making the body very long.
  const drivePower = bound(20 + 3 * length + 8 * thickness, 22, 44),
    driveForce = drivePower / 3.5;
  const efficiency = (0.76 + (0.24 * flex) / 1.3) * (0.82 + 0.18 * stability);
  const acceleration = bound(
    (Math.min(driveForce * efficiency, traction) -
      rollingForce(mass, rollingCoefficient)) /
      mass,
    0.25,
    10.5,
  );
  const maxSpeed = terminalSpeed(
    drivePower * efficiency,
    mass,
    frontalArea,
    dragCoefficient,
    rollingCoefficient,
  );
  const energyCapacity = bound(
    900 + 180 * length + 350 * thickness,
    1200,
    2500,
  );
  const stamina = bound(energyCapacity / drivePower / 65, 0.65, 1.5);
  return {
    stability,
    grip,
    traction,
    frontalArea,
    dragCoefficient,
    rollingCoefficient,
    drivePower,
    driveForce,
    efficiency,
    acceleration,
    maxSpeed,
    energyCapacity,
    stamina,
  };
}
