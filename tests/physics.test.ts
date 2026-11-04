import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleSnake, analyze, drawing } from "../src/model";
import {
  DT,
  createRace,
  createRacer,
  stepRace,
  advance,
  propel,
  standings,
} from "../src/physics";
import { validSnake } from "../src/storage";

test("all four racers complete 100m with finite interpolated finish times", () => {
  const race = createRace(sampleSnake(), "auto");
  for (let i = 0; i < 120 * 95 && !race.done; i++) stepRace(race);
  assert.equal(race.done, true);
  assert.equal(race.timedOut, false);
  for (const r of race.racers) {
    assert.equal(r.distance, 100);
    assert.ok(r.finish !== null && r.finish > 10 && r.finish < 90);
    assert.ok(r.peak <= r.stats.maxSpeed);
    assert.ok(
      r.nodes.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    );
  }
  assert.ok(
    standings(race).every((r, i, a) => !i || r.finish! >= a[i - 1].finish!),
  );
});
test("fixed simulation produces the same results at 30 and 120 fps", () => {
  const a = createRace(sampleSnake(), "auto"),
    b = createRace(sampleSnake(), "auto");
  for (let i = 0; i < 1800; i++) advance(a, 1 / 30);
  for (let i = 0; i < 7200; i++) advance(b, 1 / 120);
  a.racers.forEach((r, i) =>
    assert.ok(Math.abs(r.finish! - b.racers[i].finish!) < DT * 2),
  );
});
test("countdown, pause and restart preserve correct time and position", () => {
  const a = createRace(sampleSnake(), "auto");
  propel(a, -1);
  for (let i = 0; i < 120; i++) stepRace(a);
  assert.equal(a.time, 0);
  assert.ok(a.racers.every((r) => r.distance === 0));
  for (let i = 0; i < 720; i++) stepRace(a);
  const time = a.time,
    distance = a.racers[0].distance,
    nodes = JSON.stringify(a.racers[0].nodes);
  a.paused = true;
  advance(a, 0.2);
  propel(a, 1);
  assert.equal(a.time, time);
  assert.equal(a.racers[0].distance, distance);
  assert.equal(JSON.stringify(a.racers[0].nodes), nodes);
  const b = createRace(sampleSnake(), "auto");
  assert.equal(b.time, 0);
  assert.equal(b.racers[0].speed, 0);
  assert.equal(b.countdown, 3);
});
test("manual rhythm drives shared physics and idle input decelerates", () => {
  const a = createRace(sampleSnake(), "manual");
  a.countdown = 0;
  let side = 1;
  for (let i = 0; i < 120 * 12; i++) {
    if (i % 38 === 0) {
      side = -side;
      propel(a, side);
    }
    stepRace(a);
  }
  const r = a.racers[0],
    speed = r.speed;
  assert.ok(speed > 1);
  assert.ok(r.distance > 10);
  for (let i = 0; i < 120 * 5; i++) stepRace(a);
  assert.ok(r.speed < speed * 0.7);
});
test("manual repeated same side and rapid spam cannot create unbounded drive", () => {
  const a = createRace(sampleSnake(), "manual");
  a.countdown = 0;
  propel(a, 1);
  const impulse = a.racers[0].impulse;
  propel(a, 1);
  propel(a, -1);
  assert.equal(a.racers[0].impulse, impulse);
  for (let i = 0; i < 3600; i++) {
    propel(a, i % 2 ? 1 : -1);
    stepRace(a);
    assert.ok(a.racers[0].speed <= a.racers[0].stats.maxSpeed);
  }
});
test("manual non-finisher ends at time limit and is ranked behind finishers", () => {
  const a = createRace(sampleSnake(), "manual");
  for (let i = 0; i < 120 * 95 && !a.done; i++) stepRace(a);
  assert.equal(a.timedOut, true);
  assert.equal(a.racers[0].finish, null);
  assert.equal(standings(a).at(-1), a.racers[0]);
});
test("backbone links stay inextensible, body types differ, extreme inputs stay finite", () => {
  const a = createRace(sampleSnake(), "auto");
  a.countdown = 0;
  for (let i = 0; i < 600; i++) stepRace(a);
  for (const r of a.racers)
    for (let i = 1; i < r.nodes.length; i++)
      assert.ok(
        Math.abs(
          Math.hypot(
            r.nodes[i].x - r.nodes[i - 1].x,
            r.nodes[i].y - r.nodes[i - 1].y,
          ) - r.links[i - 1],
        ) < 1e-8,
      );
  assert.notEqual(analyze(sampleSnake(0)).mass, analyze(sampleSnake(2)).mass);
  const s = sampleSnake();
  s.parts.body = drawing(
    [{ points: [{ x: 10, y: 10 }], color: "#3d7755", width: 24 }],
    "body",
  );
  const r = createRacer(s);
  assert.ok(Object.values(r.stats).every(Number.isFinite));
});
test("saved drawing validation rejects corrupt and excessive data", () => {
  assert.equal(validSnake(sampleSnake()), true);
  assert.equal(validSnake({}), false);
  const s = sampleSnake();
  s.parts.body.strokes[0].points[0].x = NaN;
  assert.equal(validSnake(s), false);
});

import { bodyRig, skinPoint, eraseStrokes } from "../src/geometry";
test("source-path rig preserves every drawn point at rest, including loops", () => {
  const s = sampleSnake();
  const points = Array.from({ length: 101 }, (_, i) => ({
    x: 240 + Math.cos((i / 100) * Math.PI * 3) * 100,
    y: 170 + Math.sin((i / 100) * Math.PI * 3) * 75,
  }));
  s.parts.body = drawing([{ points, color: "#365939", width: 12 }], "body");
  const rig = bodyRig(s.parts.body),
    origin = rig.source[0];
  points.forEach((p, i) => {
    const q = skinPoint(rig.bindings[0][i], rig.rest, rig.scale);
    assert.ok(
      Math.hypot(
        q.x - (p.x - origin.x) * rig.scale,
        q.y - (p.y - origin.y) * rig.scale,
      ) < 1e-8,
    );
  });
  assert.ok(rig.rest.some((p) => Math.abs(p.y) > 0.3));
});
test("drawn ink and pen thickness change mass; source dimensions are retained", () => {
  const a = sampleSnake(),
    b = structuredClone(a);
  b.parts.head.strokes = b.parts.head.strokes.map((s) => ({
    ...s,
    width: s.width * 2,
  }));
  assert.ok(analyze(b).mass > analyze(a).mass);
  const rig = bodyRig(a.parts.body);
  assert.equal(rig.scale, bodyRig(a.parts.body).scale);
  assert.ok(rig.source.length > 16);
});
test("eraser cuts the touched part of a sparse stroke and leaves its ends", () => {
  const strokes = [
    {
      points: [
        { x: 10, y: 100 },
        { x: 470, y: 100 },
      ],
      color: "#365939",
      width: 8,
    },
  ];
  const erased = eraseStrokes(strokes, { x: 240, y: 100 }, 18);
  assert.equal(erased.length, 2);
  assert.ok(erased[0].points.at(-1)!.x < 220);
  assert.ok(erased[1].points[0].x > 260);
  assert.equal(strokes[0].points.length, 2);
});

test("default part connectors lie on actual source ink, including single dots", () => {
  for (const kind of ["head", "tail"] as const) {
    const points = [
      { x: 20, y: 40 },
      { x: 90, y: 170 },
      { x: 160, y: 40 },
    ];
    const part = drawing([{ points, color: "#365939", width: 8 }], kind);
    assert.ok(
      points.some((p) => p.x === part.anchor.x && p.y === part.anchor.y),
    );
    const dot = drawing(
      [{ points: [{ x: 70, y: 20 }], color: "#365939", width: 8 }],
      kind,
    );
    assert.deepEqual(dot.anchor, { x: 70, y: 20 });
  }
});

import { finishRace } from "../src/physics";
import { trackScale, type RaceCamera } from "../src/render";
test("track zoom stays constant throughout motion and recalculates only on viewport resize", () => {
  const race = createRace(sampleSnake(), "auto"),
    camera: RaceCamera = { x: -2 };
  const initial = trackScale(race, camera, 390, 350);
  for (let i = 0; i < 1200; i++) {
    stepRace(race);
    assert.equal(trackScale(race, camera, 390, 350), initial);
  }
  const resized = trackScale(race, camera, 1080, 420);
  assert.notEqual(resized, initial);
  for (let i = 0; i < 120; i++) {
    stepRace(race);
    assert.equal(trackScale(race, camera, 1080, 420), resized);
  }
  assert.equal(trackScale(race, { x: -2 }, 390, 350), initial);
});
test("fast playback keeps countdown in real time and preserves exact auto results", () => {
  const normal = createRace(sampleSnake(), "auto"),
    fast = createRace(sampleSnake(), "auto");
  for (let i = 0; i < 60; i++) {
    advance(normal, 1 / 60, 1);
    advance(fast, 1 / 60, 6);
  }
  assert.equal(normal.time, 0);
  assert.equal(fast.time, 0);
  assert.equal(normal.countdown, fast.countdown);
  for (let i = 0; i < 3600; i++) advance(normal, 1 / 60, 1);
  for (let i = 0; i < 900; i++) advance(fast, 1 / 30, 6);
  normal.racers.forEach((r, i) =>
    assert.equal(fast.racers[i].finish, r.finish),
  );
});
test("result shortcut computes remaining race from current state without altering prior finish records", () => {
  const direct = createRace(sampleSnake(), "auto"),
    full = createRace(sampleSnake(), "auto");
  for (let i = 0; i < 700; i++) {
    stepRace(direct);
    stepRace(full);
  }
  direct.paused = true;
  finishRace(direct);
  while (!full.done) stepRace(full);
  assert.equal(direct.done, true);
  direct.racers.forEach((r, i) =>
    assert.equal(r.finish, full.racers[i].finish),
  );
  const times = direct.racers.map((r) => r.finish);
  finishRace(direct);
  assert.deepEqual(
    direct.racers.map((r) => r.finish),
    times,
  );
});
test("result shortcut never invents manual inputs or converts control mode", () => {
  const manual = createRace(sampleSnake(), "manual");
  finishRace(manual);
  assert.equal(manual.done, true);
  assert.equal(manual.mode, "manual");
  assert.equal(manual.racers[0].finish, null);
  assert.equal(manual.racers[0].distance, 0);
  assert.equal(manual.timedOut, true);
  assert.ok(manual.racers.slice(1).every((r) => r.finish !== null));
});

import {
  fluidDrag,
  AIR_DENSITY,
  WATER_DENSITY,
  vehicleCharacteristics,
  slopeForce,
} from "../src/dynamics";
import { RULES_VERSION } from "../src/model";
import { best } from "../src/storage";
import { challengeLink, readChallenge, validChallenge } from "../src/challenge";
import { verifyChallengeRecord } from "../src/physics";
test("fluid drag follows density, area and velocity-squared law", () => {
  const drag = fluidDrag(AIR_DENSITY, 0.4, 0.1, 5);
  assert.equal(fluidDrag(AIR_DENSITY, 0.4, 0.1, 10), drag * 4);
  assert.equal(fluidDrag(AIR_DENSITY, 0.4, 0.2, 5), drag * 2);
  assert.ok(
    Math.abs(
      fluidDrag(WATER_DENSITY, 0.4, 0.1, 5) / drag -
        WATER_DENSITY / AIR_DENSITY,
    ) < 1e-9,
  );
});
test("same engine and geometry: added mass reduces acceleration and raises traction limit", () => {
  const shape = {
    length: 4,
    mass: 1,
    size: 0.6,
    thickness: 0.18,
    curve: 0.2,
    headLoad: 0.5,
    flex: 1,
  };
  const a = vehicleCharacteristics(shape),
    b = vehicleCharacteristics({ ...shape, mass: 2 });
  assert.equal(a.drivePower, b.drivePower);
  assert.ok(b.acceleration < a.acceleration);
  assert.equal(b.traction, a.traction * 2);
  assert.ok(b.maxSpeed < a.maxSpeed);
  assert.equal(slopeForce(2, 0.1), slopeForce(1, 0.1) * 2);
  assert.equal(slopeForce(1, -0.1), -slopeForce(1, 0.1));
});
test("larger frontal bulk increases area quadratically and lowers terminal speed", () => {
  const shape = {
    length: 4,
    mass: 1,
    size: 0.4,
    thickness: 0.1,
    curve: 0.2,
    headLoad: 0.5,
    flex: 1,
  };
  const a = vehicleCharacteristics(shape),
    b = vehicleCharacteristics({ ...shape, size: 0.8 });
  assert.ok(Math.abs(b.frontalArea / a.frontalArea - 4) < 1e-9);
  assert.ok(b.maxSpeed < a.maxSpeed);
});
test("hills and water courses finish using the same simulation with distinct results", () => {
  const times: number[] = [];
  for (const course of ["sprint", "hills", "puddles"] as const) {
    const race = createRace(sampleSnake(), "auto", course);
    finishRace(race);
    assert.equal(race.timedOut, false);
    assert.ok(race.racers.every((r) => r.finish !== null));
    times.push(race.racers[0].finish!);
  }
  assert.notEqual(times[0], times[1]);
  assert.ok(times[2] > times[0]);
});
test("personal records preserve legacy entries while comparing only matching rules and courses", () => {
  const id = sampleSnake().id,
    legacy = { snakeId: id, mode: "auto" as const, time: 3, date: 1 };
  const current = {
    ...legacy,
    time: 12,
    rulesVersion: RULES_VERSION,
    course: "sprint" as const,
  };
  const water = { ...current, time: 19, course: "puddles" as const };
  const data = { snakes: [], records: [legacy, current, water] };
  assert.equal(best(data, id, "auto"), 12);
  assert.equal(best(data, id, "auto", "legacy"), 3);
  assert.equal(best(data, id, "auto", RULES_VERSION, "puddles"), 19);
  assert.equal(data.records.length, 3);
});
test("automatic challenge link preserves original artwork, course and verified race time", async () => {
  const race = createRace(sampleSnake(), "auto", "puddles");
  finishRace(race);
  const link = await challengeLink(race, "https://example.com/game/");
  const invite = await readChallenge(new URL(link).hash);
  assert.ok(invite);
  assert.deepEqual(invite.snake.parts, race.racers[0].snake.parts);
  assert.equal(invite.course, "puddles");
  assert.ok(verifyChallengeRecord(invite));
  const battle = createRace(sampleSnake(2), "auto", invite.course, invite);
  finishRace(battle);
  assert.ok(Math.abs(battle.racers[1].finish! - invite.targetTime) < DT * 2);
  assert.equal(validChallenge({ ...invite, rules: "old" }), false);
  assert.equal(
    verifyChallengeRecord({ ...invite, targetTime: invite.targetTime + 3 }),
    false,
  );
});
test("manual challenge replays only actual accepted controls and matches original finish", async () => {
  const race = createRace(sampleSnake(), "manual");
  race.countdown = 0;
  let side = 1;
  for (let tick = 0; tick < 120 * 90 && !race.done; tick++) {
    if (tick % 34 === 0) {
      side = -side;
      propel(race, side);
    }
    stepRace(race);
  }
  assert.ok(race.racers[0].finish !== null);
  assert.ok(race.inputs.length > 10);
  const link = await challengeLink(race, "https://example.com/");
  const invite = (await readChallenge(new URL(link).hash))!;
  assert.ok(verifyChallengeRecord(invite));
  const battle = createRace(sampleSnake(2), "manual", invite.course, invite);
  finishRace(battle);
  assert.equal(battle.racers[0].finish, null);
  assert.ok(
    Math.abs(battle.racers[1].finish! - race.racers[0].finish!) < DT * 2,
  );
});
test("corrupt challenge links are rejected without executing or accepting their record", async () => {
  await assert.rejects(() => readChallenge("#challenge=broken"));
  assert.equal(await readChallenge("#hello"), null);
  assert.equal(validChallenge({ v: 1 }), false);
});

test("reasonable slower alternating manual inputs still overcome ground resistance", () => {
  const race = createRace(sampleSnake(), "manual");
  race.countdown = 0;
  let side = 1;
  for (let tick = 0; tick < 120 * 10; tick++) {
    if (tick % 61 === 0) {
      side = -side;
      propel(race, side);
    }
    stepRace(race);
  }
  assert.ok(race.racers[0].distance > 0.1);
});

import { HILLS, OBSTACLES, terrainAt } from "../src/courses";
import { jump } from "../src/physics";
test("two hills have continuous endpoints and clearly positive and negative steep grades", () => {
  assert.equal(HILLS.length, 2);
  for (const hill of HILLS) {
    const span = hill.end - hill.start;
    assert.ok(terrainAt("hills", hill.start + span / 4).grade >= 0.35);
    assert.ok(terrainAt("hills", hill.start + (span * 3) / 4).grade <= -0.35);
    assert.ok(Math.abs(terrainAt("hills", hill.end).elevation) < 1e-10);
  }
  assert.equal(terrainAt("hills", 45).grade, 0);
});
test("automatic racers jump each hurdle and clear all three with their actual body length", () => {
  const race = createRace(sampleSnake(), "auto", "hurdles");
  finishRace(race);
  for (const r of race.racers) {
    assert.ok(r.finish !== null);
    assert.equal(r.autoJumps.length, OBSTACLES.length);
    assert.equal(r.obstacleHits.length, 0);
  }
});
test("manual jump obeys gravity, prevents double jump and freezes with pause", () => {
  const race = createRace(sampleSnake(), "manual", "hurdles");
  jump(race);
  assert.equal(race.inputs.length, 0);
  race.countdown = 0;
  jump(race);
  assert.equal(race.inputs.length, 1);
  jump(race);
  assert.equal(race.inputs.length, 1);
  for (let i = 0; i < 30; i++) stepRace(race);
  const height = race.racers[0].jumpHeight;
  assert.ok(height > 0.5);
  race.paused = true;
  advance(race, 0.2, 24);
  assert.equal(race.racers[0].jumpHeight, height);
  race.paused = false;
  for (let i = 0; i < 300; i++) stepRace(race);
  assert.equal(race.racers[0].jumpHeight, 0);
});
test("hitting a hurdle slows the racer once; airborne clearance avoids the impact", () => {
  const ground = createRace(sampleSnake(), "manual", "hurdles"),
    air = createRace(sampleSnake(), "manual", "hurdles");
  for (const race of [ground, air]) {
    race.countdown = 0;
    const r = race.racers[0];
    r.distance = OBSTACLES[0].start - r.stats.headReach + 0.05;
    r.speed = 8;
    r.drive = 1;
    r.impulse = 1;
  }
  air.racers[0].jumpHeight = 1;
  stepRace(ground);
  stepRace(air);
  assert.equal(ground.racers[0].obstacleHits.length, 1);
  assert.equal(air.racers[0].obstacleHits.length, 0);
  assert.ok(ground.racers[0].speed < air.racers[0].speed * 0.6);
});
test("24x playback is equivalent to 1x and does not drop simulation time", () => {
  const normal = createRace(sampleSnake(), "auto", "hurdles"),
    fast = createRace(sampleSnake(), "auto", "hurdles");
  for (let i = 0; i < 60 * 35; i++) advance(normal, 1 / 60, 1);
  for (let i = 0; i < 30 * 6; i++) advance(fast, 1 / 30, 24);
  normal.racers.forEach((r, i) =>
    assert.equal(r.finish, fast.racers[i].finish),
  );
});
test("manual jump and accelerated input cadence are recorded and reproduced in shared challenges", async () => {
  const race = createRace(sampleSnake(), "manual", "hurdles");
  race.countdown = 0;
  let side = 1;
  for (let frame = 0; frame < 60 * 25 && !race.done; frame++) {
    if (frame % 18 === 0) {
      side = -side;
      propel(race, side);
    }
    if (frame % 57 === 0) jump(race);
    advance(race, 1 / 60, 3);
  }
  assert.ok(race.racers[0].finish !== null);
  assert.ok(race.inputs.some((i) => i.kind === "jump"));
  assert.ok(race.inputs.some((i) => i.rate === 3));
  const link = await challengeLink(race, "https://example.com/");
  const invite = (await readChallenge(new URL(link).hash))!;
  assert.ok(verifyChallengeRecord(invite));
  const ghost = createRace(sampleSnake(2), "manual", "hurdles", invite);
  finishRace(ghost);
  assert.ok(Math.abs(ghost.racers[1].finish! - invite.targetTime) < DT * 2);
});
test("changed morphology rules require new challenges on every course", async () => {
  const race = createRace(sampleSnake(), "auto");
  finishRace(race);
  const invite = (await readChallenge(
    new URL(await challengeLink(race, "https://example.com")).hash,
  ))!;
  assert.equal(validChallenge({ ...invite, rules: "morphology-v1" }), false);
  assert.equal(validChallenge({ ...invite, rules: "morphology-v2" }), false);
  assert.equal(
    validChallenge({ ...invite, rules: "morphology-v1", course: "hills" }),
    false,
  );
});

import worker from "../share-server/worker";
import { decode } from "fast-png";
import { socialChallengeURLs } from "../src/challenge";

test("body weight changes actual acceleration and finish time substantially", () => {
  const thin = sampleSnake(),
    heavy = structuredClone(thin);
  for (const part of ["head", "body", "tail"] as const) {
    for (const stroke of thin.parts[part].strokes) stroke.width *= 0.25;
    for (const stroke of heavy.parts[part].strokes) stroke.width *= 2.8;
  }
  const a = analyze(thin),
    b = analyze(heavy);
  assert.ok(a.acceleration > b.acceleration * 3);
  const lightRace = createRace(thin, "auto"),
    heavyRace = createRace(heavy, "auto");
  finishRace(lightRace);
  finishRace(heavyRace);
  assert.ok(heavyRace.racers[0].finish! > lightRace.racers[0].finish! * 1.3);
});

test("personal share page exposes crawler metadata and a real unique snake PNG", async () => {
  const race = createRace(sampleSnake(), "auto");
  finishRace(race);
  const urls = await socialChallengeURLs(
    race,
    "https://minho-nim.github.io/snake-race/",
    2,
  );
  const before = JSON.stringify(race.racers[0].snake);
  const page = await worker.fetch(
    new Request(urls.share, { headers: { "User-Agent": "KakaoTalk-Scrap" } }),
  );
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes("이겨 봐!"));
  assert.ok(html.includes('property="og:image:width" content="1200"'));
  assert.ok(
    html.includes(
      'location.replace("https://minho-nim.github.io/snake-race/#challenge=',
    ),
  );
  assert.ok(html.includes(urls.image.replaceAll("&", "&amp;")));
  const response = await worker.fetch(new Request(urls.image));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  const bytes = new Uint8Array(await response.arrayBuffer()),
    png = decode(bytes);
  assert.equal(png.width, 1200);
  assert.equal(png.height, 630);
  const other = createRace(sampleSnake(2), "auto");
  finishRace(other);
  const different = await socialChallengeURLs(other, "https://example.com/", 0);
  const otherBytes = new Uint8Array(
    await (await worker.fetch(new Request(different.image))).arrayBuffer(),
  );
  assert.notDeepEqual(bytes, otherBytes);
  assert.equal(JSON.stringify(race.racers[0].snake), before);
  assert.equal(
    (await worker.fetch(new Request(urls.image, { method: "HEAD" }))).status,
    200,
  );
  assert.equal(
    (await worker.fetch(new Request(urls.share, { method: "POST" }))).status,
    405,
  );
  for (const d of ["invalid", "<script>", "a".repeat(24001)])
    assert.equal(
      (
        await worker.fetch(
          new Request("https://example.com/c?d=" + encodeURIComponent(d)),
        )
      ).status,
      400,
    );
});

import { COURSES, obstaclesFor, waterZonesFor } from "../src/courses";
test("combined main course includes flat start, hills, water and hurdles with shared physics", async () => {
  assert.equal(COURSES[0].id, "combined");
  assert.equal(terrainAt("combined", 5).grade, 0);
  assert.ok(terrainAt("combined", 25).grade > 0.35);
  assert.ok(terrainAt("combined", 53).waterDepth > 0);
  assert.equal(obstaclesFor("combined").length, 2);
  assert.equal(waterZonesFor("combined").length, 2);
  const race = createRace(sampleSnake(), "auto", "combined");
  finishRace(race);
  for (const r of race.racers) {
    assert.ok(r.finish !== null);
    assert.equal(r.autoJumps.length, 2);
  }
  const invite = (await readChallenge(
    new URL(await challengeLink(race, "https://example.com/")).hash,
  ))!;
  assert.equal(invite.course, "combined");
  assert.ok(verifyChallengeRecord(invite));
  const flat = createRace(sampleSnake(), "auto", "sprint");
  finishRace(flat);
  assert.ok(race.racers[0].finish! > flat.racers[0].finish!);
});
test("hurdle impact starts a brief fall that suppresses propulsion then recovers", () => {
  const race = createRace(sampleSnake(), "manual", "hurdles");
  race.countdown = 0;
  const r = race.racers[0];
  r.distance = 25 - r.stats.headReach + 0.05;
  r.speed = 8;
  r.impulse = 1;
  stepRace(race);
  assert.ok(r.stumbleUntil > race.time);
  assert.ok(r.speed < 4);
  jump(race);
  assert.equal(r.jumpHeight, 0);
  for (let i = 0; i < 100; i++) stepRace(race);
  assert.ok(race.time > r.stumbleUntil);
  jump(race);
  assert.ok(r.jumpHeight > 0);
});
