---
name: game-qa
description: "게임을 실제로 돌려 확인할 때 쓴다: 브라우저로 열어 화면 찍기, 봇이 자동으로 플레이하는 시험, 휴대폰 폭 확인, 배포 빌드와 경로 점검."
license: MIT
metadata:
  minoffia-category: 게임
  minoffia-related: game-gameplay, game-debug, ui-check
---

# 게임 시험·출시 점검

> **minoffia 메모:** 출처 majidmanzarpour/threejs-game-skills@8286774 `threejs-qa-release` (MIT, LICENSE 같이 둠). 이름을 game-qa로 바꾸고, 한국어 요약을 붙였다. 원문은 Three.js 3D 브라우저 게임 기준이다.

## 지시서용 요약

- "된다"고 말하기 전에 실제로 돌린다: 빌드 → 브라우저로 열기 → 시작부터 이김/짐·다시 하기까지 한 바퀴.
- 봇 플레이 시험: 키 입력을 흉내 내 몇 초 플레이하고 점수·상태가 바뀌는지 확인한다(템플릿 bot-playtest).
- 휴대폰 400px·PC 1400px에서 콘솔 오류·가로 넘침·터치 동작. 배포 경로(base path)가 맞는지, 디버그 화면이 꺼졌는지.
- 브라우저가 없는 환경이면 설치하려 하지 말고 건너뛴다(미노피아가 결과를 받은 뒤 화면을 찍는다).

## 원문(영어)

# Three.js QA Release

Prove the game works the way a player will meet it, then prepare a shippable build with its known risks.

Resolve `<this-skill-dir>` and local references from the actual loaded skill file; resolve sibling skills beside it before using runner-discovered alternatives. Run the inspector from the game project with its npm dependencies installed.

## References

| File | Read it when |
| --- | --- |
| `references/release-checks.md` | mobile verification, production release, performance evidence, or release-failure traps |
| `references/visual-test-harness.md` | screenshot baselines, visual regression, UI or generated-asset regression protection |
| `references/playtest-bot.md` | release-ready gameplay claims, difficulty and fairness checks, or a loop never driven by scripted input |

## QA pass

For a complete game use the full pass below. For narrow edits select checks covering the affected behavior, states, and target viewports. Reuse valid specialist evidence from the same code revision; the lead owns one consolidated pass. Repeat only after relevant changes, failures, or unresolved concerns. An explicit desktop-only scope does not require adding mobile gameplay.

1. Install dependencies, run build and typecheck, start the dev or preview server.
2. Open the browser target and capture console, page, and network errors.
3. Confirm non-blank, visually varied canvas pixels.
4. Capture active play on each target viewport (desktop and mobile by default), not just the title screen.
5. Exercise the main input, objective progression, fail and retry, and whatever changed most recently.
6. Check HUD text fit, safe areas, touch targets, and responsive layout.
7. When audio changed: user-gesture unlock, SFX triggers, ambience loop start and stop, pause and restart cleanup, mute and volume, decode errors.
8. Decide on a visual test harness. For premium, release-ready, UI-heavy, or generated-asset work a harness is usually worth it; say so either way.
9. Run the bot playtest (`tests/bot-playtest.template.ts` in scaffold games) for release-ready gameplay claims and report its metrics JSON.
10. When animation changed, capture a short unpaused sequence and inspect locomotion, clip transitions, feet, rig deformation, and attack/contact timing using `references/visual-test-harness.md`.

Screenshots alone do not cover gameplay changes.

## Canvas inspector

```bash
node <this-skill-dir>/scripts/inspect-threejs-canvas.mjs --manifest artifacts/evidence.json --url http://127.0.0.1:5188 --seed 42
```

Declare the pass's viewport/state pairs in `artifacts/evidence.json` first, with a fresh run ID; the format and the test-hook contract are in the director's `references/evidence-manifest.md`. One command captures every declared pair in a single browser and prints one line per capture: PASS/FAIL, GPU, pixel metrics, over-budget rows, error counts, and the report and screenshot paths. Open a report file only when its line needs more detail. Include all requested states; do not remove a failing slot to make the manifest pass. For a one-off check, `--state <name> [--mobile]` captures a single view, and omitting `--state` checks only the current view. Scaffold games have their own copy as `npm run inspect:canvas`.

The metrics are the Measured Evidence for the visual scorecard in `threejs-aaa-graphics-builder/references/visual-scorecard.md`. Over-budget rows need a documented tradeoff, and blank-canvas or error conditions exit non-zero.

## Release pass

Inspect package scripts, Vite config, base path, and public assets → gate debug UI, logging, and test helpers → run the production build and preview it on a static server → check the built output on target viewports → review bundle and large assets → document the deploy command, host assumptions, and residual risks.

## Report

Lead with the result and unresolved defects. Put the detailed commands, manifest, captures, motion evidence, controls exercised, issues fixed, and deployment notes in the project's evidence report. Include the harness decision and bot metrics when in scope. Return the artifact path to the lead; passing pixels and acknowledged state hooks do not establish aesthetic quality or successful gameplay by themselves.
