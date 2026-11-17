---
name: game-gameplay
description: "게임의 핵심 반복(플레이 → 보상 → 다시), 입력·카메라·충돌·물리, 레벨과 적·아이템, 저장을 만들 때 쓴다. Vite + Three.js 게임 뼈대(시작 템플릿)도 들어 있다."
license: MIT
metadata:
  minoffia-category: 게임
  minoffia-related: game-design, game-ui, game-qa
---

# 게임 규칙·구조 만들기

> **minoffia 메모:** 출처 majidmanzarpour/threejs-game-skills@8286774 `threejs-gameplay-systems` (MIT, LICENSE 같이 둠). 이름을 game-gameplay로 바꾸고, 한국어 요약을 붙였다. 원문은 Three.js 3D 브라우저 게임 기준이다.

## 지시서용 요약

- 코드보다 먼저 한 장짜리 설계 메모: 핵심 반복, 이기고 지는 조건, 조작, 화면 크기별 카메라.
- 게임 상태(점수·생명·레벨)는 한 곳에 두고, 그리기·입력·충돌을 나눠 둔다(시스템별 파일).
- "손맛": 입력 반응은 바로, 맞았을 때 짧은 멈춤·흔들림·소리. 휴대폰 터치와 키보드를 둘 다.
- 2D 게임에도 핵심 반복·상태 관리·손맛 부분은 그대로 쓴다. Three.js 시작 템플릿은 3D 게임을 새로 만들 때만.

## 원문(영어)

# Three.js Gameplay Systems

Create or evolve a playable browser game loop with clear ownership, responsive controls, deterministic update order, and a space that shapes player decisions.

Resolve `<this-skill-dir>` and local references from the actual loaded skill file; resolve sibling skills beside it before using runner-discovered alternatives.

## References

| File | Read it when |
| --- | --- |
| `references/game-feel.md` | tuning feel, juice, impact, hitstop, screenshake, or claiming polished gameplay |
| `references/genre-design.md` | designing levels, arenas, tracks, waves, holes, puzzles, encounters, or difficulty curves |
| `references/physics-engine-selection.md` | adding or changing physics, collision-heavy gameplay, vehicles, rolling balls, character controllers, sensors, moving platforms |

## Start here

```bash
python3 <this-skill-dir>/scripts/create_threejs_game.py ./my-game
```

Copies `assets/threejs-vite-game/`, rewrites the project name, and gives the game its own visual test and canvas inspector. `--force` copies into a non-empty directory, overwriting files that collide with the scaffold and leaving everything else in place.

## Design first

For broad game creation or a substantial design change, write three short artifacts or update the existing ones. A narrow mechanic fix uses the existing design and preserves unrelated systems:

**Design brief.** Player promise (the fantasy in one sentence) · target feeling · primary verb · secondary verbs · what the player repeats every 5–30 seconds · what changes across 1–5 minutes · how they lose, learn, and restart · what is rewarded and what creates risk · what a better player does differently · how the next decision is communicated · non-goals for this slice.

**Core loop contract.** `Player does [verb] to achieve [objective] while [pressure] creates risk; success gives [reward], failure causes [cost/retry].` Then prove each clause in code: the verb is mapped to real input, the objective is visible in world or HUD, pressure exists inside the first playable minute, reward changes state rather than only visuals, failure teaches what happened, and restart is fast enough to invite another attempt.

**Level or encounter plan.** Spatial format · what the camera can and cannot see · player start, first decision, first threat, first reward · landmarks · how challenge escalates every 20–60 seconds or per wave/hole/lap · recovery beats · how hazards are telegraphed · which pieces are modular or parameterized.

"Explore a cool scene" is not a design brief. A brief needs decisions, pressure, feedback, and consequence.

## Build

1. Inspect existing structure, scripts, dependencies, loop, input, camera, entities, state, UI, diagnostics.
2. Keep small ownership boundaries: `core`, `game`, `entities`, `systems`, `assets`, `ui`, `tests`.
3. Implement in playable increments — input, state, entity, collision, feedback, HUD and audio hooks, diagnostics — so something is playable at every step.
   Establish one representative encounter at the intended camera scale with the actual hero and feedback before expanding content. Enemy, reward, and prop variety should serve the genre's decisions, not a universal asset quota.
4. Tune feel: movement, acceleration, camera follow and FOV, hitstop, impact feedback, cooldowns, difficulty, restart.
5. Keep hot paths allocation-light and update order explicit.
6. Route all gameplay randomness through the scaffold's seeded RNG so the deterministic test hooks keep working.

For coordinated work, define input intents, entity/asset interfaces, and events before delegating independent modules. Report changed behavior and local checks to the lead, who owns the consolidated browser pass. When a user changes requirements, update the existing brief and pending tasks instead of restarting completed work.

Gameplay code emits audio events; `threejs-audio-generator` produces the actual assets and the runtime audio matrix.

## Stack

TypeScript, Vite, Three.js modules, `three/addons/...` for official controls, loaders, and post-processing. `lil-gui` for live-tuned constants. Web Audio for runtime playback. Physics engine choice, timestep, and collider strategy follow `references/physics-engine-selection.md` — Rapier by default when the game needs real simulation.

## What goes wrong

A static demo instead of a playable loop · mechanics bolted onto a scene that was built first · a core loop described but never proven through real input, pressure, reward, and fail/retry · a track or arena that decorates rather than shapes decisions · a mechanic that compiles but no input can trigger · camera and controls that lag or hide the next decision · state changes that never reach UI, audio, or VFX · abstractions built before any mechanic needed them.

## Report

Behavior and controls, the three design artifacts for broad builds, architecture choices and tuned values, changed files, and what you saw when you played it. Note the physics engine, timestep, and collider strategy when physics is in scope.
