import { partResistance } from "./part-physics";
import { snakeConnections } from "./connectivity";
import type { Challenge, ReplayInput } from "./challenge";
import { terrainAt, obstaclesFor, type CourseId } from "./courses";
import {
  AIR_DENSITY,
  WATER_DENSITY,
  GRAVITY,
  fluidDrag,
  rollingForce,
  slopeForce,
  submergedCircleArea,
} from "./dynamics";
import { snakeRig } from "./geometry";
import {
  analyze,
  clamp,
  matchedOpponents,
  type Snake,
  type Stats,
  type Mode,
  type Point,
  type PartName,
} from "./model";
export const DT = 1 / 120;
export const DEFAULT_PLAYBACK_RATE = 3;
export type Racer = {
  snake: Snake;
  stats: Stats;
  distance: number;
  speed: number;
  phase: number;
  energy: number;
  nodes: Point[];
  rest: Point[];
  links: number[];
  previous: Point[];
  finish: number | null;
  peak: number;
  drive: number;
  lastSide: number;
  lastInput: number;
  impulse: number;
  inputRate: number;
  jumpHeight: number;
  jumpVelocity: number;
  lastJump: number;
  obstacleHits: number[];
  autoJumps: number[];
  stumbleUntil: number;
  pitch: number;
  pitchVelocity: number;
  hitParts: { part: PartName; obstacle: number; time: number }[];
  telemetry: {
    split20: number | null;
    waterTime: number;
    waterDistance: number;
    waterEntrySpeed: number | null;
    waterMinSpeed: number | null;
    landings: number;
  };
  waterDrag: number;
};
export type Race = {
  course: CourseId;
  inputs: ReplayInput[];
  challenge: Challenge | null;
  ghostInputIndex: number;
  playbackRate: number;
  racers: Racer[];
  mode: Mode;
  time: number;
  countdown: number;
  paused: boolean;
  done: boolean;
  accumulator: number;
  timedOut: boolean;
};
export function createRacer(snake: Snake): Racer {
  const stats = analyze(snake);
  const rig = snakeRig(snake);
  const nodes = rig.rest.map((p) => ({ ...p }));
  const links = nodes
    .slice(1)
    .map((p, i) => Math.hypot(p.x - nodes[i].x, p.y - nodes[i].y));
  return {
    snake,
    stats,
    distance: 0,
    speed: 0,
    phase: 0,
    energy: 1,
    nodes,
    rest: rig.rest,
    links,
    previous: nodes.map((p) => ({ ...p })),
    finish: null,
    peak: 0,
    drive: 0,
    lastSide: 0,
    lastInput: -10,
    impulse: 0,
    inputRate: 1,
    jumpHeight: 0,
    jumpVelocity: 0,
    lastJump: -10,
    obstacleHits: [],
    autoJumps: [],
    stumbleUntil: 0,
    pitch: 0,
    pitchVelocity: 0,
    hitParts: [],
    waterDrag: 0,
    telemetry: {
      split20: null,
      waterTime: 0,
      waterDistance: 0,
      waterEntrySpeed: null,
      waterMinSpeed: null,
      landings: 0,
    },
  };
}
export function createRace(
  snake: Snake,
  mode: Mode,
  course: CourseId = "sprint",
  challenge: Challenge | null = null,
): Race {
  const connection = snakeConnections(snake);
  if (!connection.connected) throw new Error(connection.message);
  if (challenge && !snakeConnections(challenge.snake).connected)
    throw new Error(
      "상대 뱀의 부위가 떨어져 있습니다. 새 도전 링크를 받아주세요.",
    );
  return {
    course,
    inputs: [],
    challenge,
    ghostInputIndex: 0,
    playbackRate: 1,
    racers: [
      createRacer(snake),
      ...(challenge
        ? [
            createRacer({
              ...challenge.snake,
              id: "opponent:" + challenge.snake.id,
            }),
            ...matchedOpponents(snake).slice(1).map(createRacer),
          ]
        : matchedOpponents(snake).map(createRacer)),
    ],
    mode,
    time: 0,
    countdown: 3,
    paused: false,
    done: false,
    accumulator: 0,
    timedOut: false,
  };
}
function applyInput(r: Racer, side: number, time: number, rate = 1) {
  const interval = (time - r.lastInput) / rate;
  if (side === r.lastSide || interval < 0.12) return false;
  const ideal = 1 / (r.stats.frequency * 2),
    quality = clamp(1 - Math.abs(interval - ideal) / ideal, 0.2, 1);
  r.impulse = Math.min(1.1, r.impulse + 0.4 + 0.35 * quality);
  r.inputRate = rate;
  r.lastInput = time;
  r.lastSide = side;
  return true;
}
export function propel(race: Race, side: number, rate = race.playbackRate) {
  if (
    race.paused ||
    race.done ||
    race.countdown > 0 ||
    race.mode !== "manual" ||
    race.racers[0].finish !== null
  )
    return;
  if (applyInput(race.racers[0], side, race.time, clamp(rate, 1, 24)))
    race.inputs.push({ time: race.time, side, rate: clamp(rate, 1, 24) });
}
function launchJump(r: Racer, time: number) {
  if (
    r.finish !== null ||
    r.jumpHeight > 0 ||
    time - r.lastJump < 0.2 ||
    time < r.stumbleUntil
  )
    return false;
  const energy =
    Math.min(80, Math.max(35, r.stats.drivePower * 1.75)) * r.energy;
  r.jumpVelocity = Math.min(9, Math.sqrt((2 * energy) / r.stats.mass));
  r.jumpHeight = 0.001;
  r.pitchVelocity += clamp(
    (((r.stats.centerOfMass - r.stats.parts.body.centerX) *
      r.stats.mass *
      r.jumpVelocity) /
      (r.stats.inertia + 0.1)) *
      0.12,
    -0.8,
    0.8,
  );
  r.lastJump = time;
  r.energy = clamp(r.energy - energy / r.stats.energyCapacity, 0.55, 1);
  return true;
}
export function jump(race: Race) {
  if (
    obstaclesFor(race.course).length === 0 ||
    race.mode !== "manual" ||
    race.paused ||
    race.done ||
    race.countdown > 0
  )
    return;
  if (launchJump(race.racers[0], race.time))
    race.inputs.push({ time: race.time, side: 0, kind: "jump" });
}
function replayInput(
  r: Racer,
  input: ReplayInput,
  time: number,
  course: CourseId,
) {
  if (input.kind === "jump") {
    if (obstaclesFor(course).length > 0) launchJump(r, time);
  } else applyInput(r, input.side, time, input.rate || 1);
}
function autoJump(r: Racer, time: number, course: CourseId) {
  if (r.jumpHeight > 0 || r.finish !== null) return;
  obstaclesFor(course).forEach((obstacle, i) => {
    const gap = obstacle.start - r.distance - r.stats.headReach;
    const launchSpeed = Math.min(
      9,
      Math.sqrt(
        (2 * Math.min(80, Math.max(35, r.stats.drivePower * 1.75)) * r.energy) /
          r.stats.mass,
      ),
    );
    const discriminant = Math.max(
      0,
      launchSpeed ** 2 - 2 * GRAVITY * (obstacle.height + 0.08),
    );
    const rise = (launchSpeed - Math.sqrt(discriminant)) / GRAVITY,
      fall = (launchSpeed + Math.sqrt(discriminant)) / GRAVITY;
    const bodySpan =
      r.stats.headReach -
      r.nodes.reduce((min, p) => Math.min(min, p.x), 0) +
      r.stats.tailReach +
      obstacle.end -
      obstacle.start;
    const drag =
      (0.5 * AIR_DENSITY * r.stats.dragCoefficient * r.stats.frontalArea) /
      r.stats.mass;
    const travel = (t: number) =>
      drag > 1e-8 ? Math.log1p(drag * r.speed * t) / drag : r.speed * t;
    const trigger = Math.max(
      travel(rise) + 0.06,
      (travel(rise) + travel(fall) - bodySpan) / 2,
    );
    if (gap <= trigger && gap > -0.5 && !r.autoJumps.includes(i)) {
      if (launchJump(r, time)) r.autoJumps.push(i);
    }
  });
}
// Active backbone, inextensible links, and lateral contact work. This is a
// bounded game locomotion model, not a full rigid-body/bio-mechanical solver.
export function stepRacer(
  r: Racer,
  dt: number,
  drive: number,
  time: number,
  terrain = { grade: 0, waterDepth: 0 },
) {
  if (r.finish !== null) return;
  if (r.jumpHeight > 0 || r.jumpVelocity > 0) {
    r.jumpHeight += r.jumpVelocity * dt - 0.5 * GRAVITY * dt * dt;
    r.jumpVelocity -= GRAVITY * dt;
    if (r.jumpHeight <= 0) {
      r.jumpHeight = 0;
      r.telemetry.landings++;
      r.speed *=
        1 -
        Math.min(
          0.15,
          Math.abs(r.pitch) * (0.32 - 0.18 * r.stats.parts.tail.balance),
        );
      r.pitchVelocity += clamp(
        r.pitch * Math.abs(r.jumpVelocity) * 0.08,
        -0.8,
        0.8,
      );
      r.jumpVelocity = 0;
    }
  }

  const s = r.stats,
    n = r.nodes.length;
  r.previous = r.nodes.map((p) => ({ ...p }));
  r.drive += (drive - r.drive) * Math.min(1, dt * 8);
  r.phase += dt * Math.PI * 2 * s.frequency * (0.28 + 0.72 * r.drive);
  const amp = s.amplitude * (0.2 + 0.8 * r.drive);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1),
      envelope = 0.3 + 0.7 * Math.sin(t * Math.PI * 0.8);
    const before = r.rest[Math.max(0, i - 1)],
      after = r.rest[Math.min(n - 1, i + 1)];
    const dx = after.x - before.x,
      dy = after.y - before.y,
      d = Math.hypot(dx, dy) || 1;
    const wave = amp * envelope * Math.sin(r.phase - t * Math.PI * 3.2);
    const stiffness = Math.min(1, dt * 22 * s.flex);
    r.nodes[i].x += (r.rest[i].x - (dy / d) * wave - r.nodes[i].x) * stiffness;
    r.nodes[i].y += (r.rest[i].y + (dx / d) * wave - r.nodes[i].y) * stiffness;
  }
  r.nodes[0].x = 0;
  for (let k = 0; k < 8; k++)
    for (let i = 1; i < n; i++) {
      const a = r.nodes[i - 1],
        b = r.nodes[i],
        dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy) || 1,
        link = r.links[i - 1];
      b.x = a.x + (dx * link) / d;
      b.y = a.y + (dy * link) / d;
    }
  let contactWork = 0;
  for (let i = 1; i < n; i++) {
    const p = r.nodes[i],
      a = r.nodes[i - 1],
      normalVelocity = (p.y - r.previous[i].y) / dt;
    const slope = (p.y - a.y) / Math.max(0.001, r.links[i - 1]);
    contactWork += Math.abs(normalVelocity * slope);
  }
  contactWork /= n - 1;
  r.energy = clamp(
    r.energy - (dt * r.drive * s.drivePower) / (0.65 * s.energyCapacity),
    0.55,
    1,
  );
  const coupling = clamp(contactWork * 5, 0, 1);
  const fluid = partResistance(
      s.parts,
      r.speed,
      terrain.waterDepth,
      r.jumpHeight,
      r.pitch,
      s.centerOfMass,
    ),
    wet = fluid.wet;
  const normalForce =
    r.jumpHeight > 0
      ? 0
      : Math.max(
          0,
          (s.mass * GRAVITY) / Math.sqrt(1 + terrain.grade ** 2) -
            fluid.buoyancy,
        );
  const tractionLimit = s.grip * (wet ? 0.65 : 1) * normalForce;
  const motorForce =
    Math.min(
      terrain.grade > 0.1 ? s.drivePower / 0.9 : s.driveForce,
      s.drivePower / Math.max(0.5, r.speed),
    ) *
    s.efficiency *
    r.energy *
    coupling *
    r.drive;
  const share = clamp(fluid.immersed.tail * 0.6, 0, 0.5);
  const tailSweep = Math.abs(r.nodes.at(-1)!.y - r.previous.at(-1)!.y) / dt;
  const tailReaction =
    fluidDrag(WATER_DENSITY, 0.6, s.parts.tail.finArea, tailSweep) * 0.6;
  // Fin work shares the same motor output, never creates extra power.
  const thrust =
    Math.min(motorForce * (1 - share), tractionLimit) +
    Math.min(motorForce * share, tailReaction);
  const air = fluid.air,
    water = fluid.water.head + fluid.water.body + fluid.water.tail;
  r.waterDrag = water;
  if (wet) {
    r.telemetry.waterTime += dt;
    r.telemetry.waterEntrySpeed ??= r.speed;
    r.telemetry.waterMinSpeed = Math.min(
      r.telemetry.waterMinSpeed ?? r.speed,
      r.speed,
    );
  }
  const grounded = r.jumpHeight === 0,
    k = grounded ? 10 + 12 * s.parts.tail.balance : 0,
    damping = grounded ? 5 + 5 * s.parts.tail.balance : 0.35;
  r.pitchVelocity += (-k * r.pitch - damping * r.pitchVelocity) * dt;
  r.pitchVelocity = clamp(r.pitchVelocity, -2, 2);
  r.pitch = clamp(r.pitch + r.pitchVelocity * dt, -0.35, 0.35);
  const ground = s.rollingCoefficient * normalForce;
  const resistance = air + water + ground + slopeForce(s.mass, terrain.grade);
  const limit =
    terrain.grade < 0 ? Math.min(18, s.maxSpeed * 1.35) : s.maxSpeed;
  r.speed = clamp(r.speed + (dt * (thrust - resistance)) / s.mass, 0, limit);
  const before = r.distance;
  r.distance += r.speed * dt;
  if (wet) r.telemetry.waterDistance += r.distance - before;
  if (r.telemetry.split20 === null && before < 20 && r.distance >= 20)
    r.telemetry.split20 =
      time -
      dt +
      (dt * (20 - before)) / Math.max(0.000001, r.distance - before);
  r.peak = Math.max(r.peak, r.speed);
  if (r.distance >= 100) {
    r.finish =
      time -
      dt +
      (dt * (100 - before)) / Math.max(0.000001, r.distance - before);
    r.distance = 100;
    r.jumpHeight = 0;
    r.jumpVelocity = 0;
  }
}
export function stepRace(race: Race, dt = DT) {
  if (race.paused || race.done) return;
  if (race.countdown > 0) {
    race.countdown = Math.max(0, race.countdown - dt);
    return;
  }
  if (race.challenge?.mode === "manual") {
    const inputs = race.challenge.inputs;
    while (
      race.ghostInputIndex < inputs.length &&
      inputs[race.ghostInputIndex].time <= race.time + dt / 2
    ) {
      const input = inputs[race.ghostInputIndex++];
      replayInput(race.racers[1], input, race.time, race.course);
    }
  }
  if (obstaclesFor(race.course).length > 0)
    race.racers.forEach((r, i) => {
      const automatic =
        i === 0
          ? race.mode === "auto"
          : i === 1 && race.challenge
            ? race.challenge.mode === "auto"
            : true;
      if (automatic) autoJump(r, race.time, race.course);
    });
  race.time += dt;
  race.racers.forEach((r, i) => {
    let drive = 1;
    if (
      (i === 0 && race.mode === "manual") ||
      (i === 1 && race.challenge?.mode === "manual")
    ) {
      r.impulse = Math.max(0, r.impulse - (dt * 1.25) / r.inputRate);
      drive = clamp(r.impulse, 0, 1);
    }
    if (race.time < r.stumbleUntil) drive *= 0.15;
    stepRacer(r, dt, drive, race.time, terrainAt(race.course, r.distance));
    if (obstaclesFor(race.course).length > 0 && r.finish === null)
      obstaclesFor(race.course).forEach((obstacle, index) => {
        if (r.obstacleHits.includes(index)) return;
        const s = r.stats,
          tail = r.nodes.at(-1)!.x;
        const intervals: Record<PartName, [number, number]> = {
          head: [r.nodes[0].x, r.nodes[0].x + s.headReach],
          body: [
            r.nodes.reduce((min, p) => Math.min(min, p.x), 0),
            r.nodes.reduce((max, p) => Math.max(max, p.x), 0),
          ],
          tail: [tail - s.tailReach, tail],
        };
        const part = (["head", "body", "tail"] as const).find((kind) => {
          const span = intervals[kind],
            height =
              r.jumpHeight -
              Math.sin(r.pitch) * (s.parts[kind].centerX - s.centerOfMass);
          return (
            r.distance + span[1] >= obstacle.start &&
            r.distance + span[0] <= obstacle.end &&
            height < obstacle.height
          );
        });
        if (part) {
          const oldSpeed = r.speed;
          const retained =
            part === "head"
              ? 0.48 - (0.12 * s.parts.head.mass) / s.mass
              : part === "body"
                ? 0.52
                : 0.72 - (0.12 * s.parts.tail.mass) / s.mass;
          r.speed *= retained;
          r.obstacleHits.push(index);
          r.hitParts.push({ part, obstacle: index, time: race.time });
          r.pitchVelocity += clamp(
            (((oldSpeed - r.speed) *
              s.mass *
              (s.parts[part].centerX - s.centerOfMass)) /
              s.inertia) *
              0.12,
            -1.6,
            1.6,
          );
          r.stumbleUntil = race.time + (part === "tail" ? 0.4 : 0.7);
          r.energy = clamp(
            r.energy - (part === "tail" ? 0.02 : 0.035),
            0.55,
            1,
          );
        }
      });
  });
  race.timedOut = race.time >= 90;
  race.done = race.timedOut || race.racers.every((r) => r.finish !== null);
}
export function advance(race: Race, elapsed: number, playbackRate = 1) {
  if (race.paused || race.done) return;
  let wallTime = Number.isFinite(elapsed) ? clamp(elapsed, 0, 0.25) : 0;
  // Keep the countdown readable in real time; only racing is accelerated.
  if (race.countdown > 0) {
    const used = Math.min(wallTime, race.countdown);
    race.countdown -= used;
    wallTime -= used;
  }
  const rate = Number.isFinite(playbackRate) ? clamp(playbackRate, 1, 24) : 1;
  // Clamp real frame gaps before scaling so 6x playback also works at low FPS.
  race.playbackRate = rate;
  race.accumulator += wallTime * rate;
  while (race.accumulator >= DT) {
    stepRace(race);
    race.accumulator -= DT;
  }
}
export function finishRace(race: Race) {
  if (race.done) return;
  race.paused = false;
  race.countdown = 0;
  // Continue the exact current state and controls. Manual racers receive no
  // invented inputs; if they cannot finish, the existing 90-second limit applies.
  for (let i = 0; i < Math.ceil(91 / DT) && !race.done; i++) stepRace(race);
  race.accumulator = 0;
}
export function verifyChallengeRecord(challenge: Challenge) {
  const replay = createRace(challenge.snake, challenge.mode, challenge.course);
  replay.countdown = 0;
  let inputIndex = 0;
  while (!replay.done) {
    while (
      inputIndex < challenge.inputs.length &&
      challenge.inputs[inputIndex].time <= replay.time + DT / 2
    ) {
      const input = challenge.inputs[inputIndex++];
      if (input.kind === "jump") jump(replay);
      else propel(replay, input.side, input.rate || 1);
    }
    stepRace(replay);
  }
  return (
    replay.racers[0].finish !== null &&
    Math.abs(replay.racers[0].finish! - challenge.targetTime) < DT * 2
  );
}
export function standings(race: Race) {
  return [...race.racers].sort((a, b) =>
    a.finish !== null && b.finish !== null
      ? a.finish - b.finish
      : a.finish !== null
        ? -1
        : b.finish !== null
          ? 1
          : b.distance - a.distance,
  );
}
export function previewRacer(snake: Snake, time: number) {
  const r = createRacer(snake);
  for (let i = 0; i < r.nodes.length; i++)
    r.nodes[i].y += Math.sin(time * 2.6 - i * 0.55) * 0.055;
  return r;
}
