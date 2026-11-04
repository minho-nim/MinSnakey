import { bodyRig } from "./geometry";
import {
  analyze,
  clamp,
  sampleSnake,
  type Snake,
  type Stats,
  type Mode,
  type Point,
} from "./model";
export const DT = 1 / 120;
export const DEFAULT_PLAYBACK_RATE = 1.5;
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
};
export type Race = {
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
  const rig = bodyRig(snake.parts.body);
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
  };
}
export function createRace(snake: Snake, mode: Mode): Race {
  return {
    racers: [
      createRacer(snake),
      ...[1, 2, 3].map((i) => createRacer(sampleSnake(i))),
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
export function propel(race: Race, side: number) {
  if (race.paused || race.done || race.countdown > 0 || race.mode !== "manual")
    return;
  const r = race.racers[0],
    interval = race.time - r.lastInput;
  if (side === r.lastSide || interval < 0.12) return;
  const ideal = 1 / (r.stats.frequency * 2),
    quality = clamp(1 - Math.abs(interval - ideal) / ideal, 0.2, 1);
  r.impulse = Math.min(1.1, r.impulse + 0.62 * quality);
  r.lastInput = race.time;
  r.lastSide = side;
}
// Active backbone, inextensible links, and lateral contact work. This is a
// bounded game locomotion model, not a full rigid-body/bio-mechanical solver.
export function stepRacer(r: Racer, dt: number, drive: number, time: number) {
  if (r.finish !== null) return;
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
  r.energy = clamp(r.energy - (dt * r.drive * 0.004) / s.stamina, 0.65, 1);
  const traction = clamp(contactWork * 5, 0.0, 1.35) * r.drive;
  const force = s.acceleration * traction * r.energy;
  const drag = 0.2 * r.speed + 0.033 * r.speed * r.speed;
  const fatigueLimit = s.maxSpeed * (0.85 + 0.15 * r.energy);
  r.speed = clamp(r.speed + dt * (force - drag), 0, fatigueLimit);
  const before = r.distance;
  r.distance += r.speed * dt;
  r.peak = Math.max(r.peak, r.speed);
  if (r.distance >= 100) {
    r.finish =
      time -
      dt +
      (dt * (100 - before)) / Math.max(0.000001, r.distance - before);
    r.distance = 100;
  }
}
export function stepRace(race: Race, dt = DT) {
  if (race.paused || race.done) return;
  if (race.countdown > 0) {
    race.countdown = Math.max(0, race.countdown - dt);
    return;
  }
  race.time += dt;
  race.racers.forEach((r, i) => {
    let drive = 1;
    if (i === 0 && race.mode === "manual") {
      r.impulse = Math.max(0, r.impulse - dt * 1.25);
      drive = clamp(r.impulse, 0, 1);
    }
    stepRacer(r, dt, drive, race.time);
  });
  race.timedOut = race.time >= 90;
  race.done = race.timedOut || race.racers.every((r) => r.finish !== null);
}
export function advance(race: Race, elapsed: number, playbackRate=1) {
  if (race.paused || race.done) return;
  let wallTime=Number.isFinite(elapsed)?clamp(elapsed,0,.25):0;
  // Keep the countdown readable in real time; only racing is accelerated.
  if(race.countdown>0){const used=Math.min(wallTime,race.countdown);race.countdown-=used;wallTime-=used;}
  const rate=Number.isFinite(playbackRate)?clamp(playbackRate,1,6):1;
  // Clamp real frame gaps before scaling so 6x playback also works at low FPS.
  race.accumulator += wallTime*rate;
  while (race.accumulator >= DT) {
    stepRace(race);
    race.accumulator -= DT;
  }
}
export function finishRace(race:Race){
  if(race.done)return;
  race.paused=false;
  race.countdown=0;
  // Continue the exact current state and controls. Manual racers receive no
  // invented inputs; if they cannot finish, the existing 90-second limit applies.
  for(let i=0;i<Math.ceil(91/DT)&&!race.done;i++)stepRace(race);
  race.accumulator=0;
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
