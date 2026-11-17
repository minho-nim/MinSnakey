---
name: game-ui
description: "점수판(HUD)·메뉴·일시정지·이김/짐 화면·설정·터치 버튼을 만들 때 쓴다. 휴대폰 안전 영역, 글자가 넘치지 않게, 게임 화면과 어울리게."
license: MIT
metadata:
  minoffia-category: 게임
  minoffia-related: game-gameplay, game-qa, ui-check
---

# 게임 화면 만들기

> **minoffia 메모:** 출처 majidmanzarpour/threejs-game-skills@8286774 `threejs-game-ui-designer` (MIT, LICENSE 같이 둠). 이름을 game-ui로 바꾸고, 한국어 요약을 붙였다. 원문은 Three.js 3D 브라우저 게임 기준이다.

## 지시서용 요약

- 점수판은 꼭 필요한 숫자만, 게임을 가리지 않는 가장자리에. 중요한 상태(생명·남은 시간)는 색이 아니라 모양으로도 구분.
- 시작·일시정지·이김·짐·다시 하기 화면을 모두 만든다. 다시 하기 버튼은 엄지로 누르기 쉬운 크기(48px 이상).
- 휴대폰: 노치·홈 막대(안전 영역)를 피하고, 가로·세로 전환에서도 깨지지 않게. 긴 글자는 줄이거나 줄바꿈.

## 원문(영어)

# Three.js Game UI Designer

Make game UI intentional, readable, responsive, and specific to the genre.

Preserve the user's requested scope and style. For a narrow HUD fix, retain the existing design and check the changed state and target viewports. For a complete UI pass, use the full workflow below. Mobile input is required when mobile is a target, not because a desktop-only game has UI.

## Reference

`references/ui-patterns.md` — hierarchy and required states, HUD zones, menus, touch controls, responsive constraints, style cohesion, and state wiring. Read it before designing HUDs, menus, overlays, touch controls, or responsive layout.

Load `threejs-image-generator` when logos, icons, GUI art, faction marks, menu backgrounds, or 2D HUD assets would raise the quality. `threejs-3d-generator` only for genuine 3D menu objects and diegetic props, not flat HUD elements.

## Workflow

1. Capture desktop and mobile screenshots of what exists.
2. Inventory the UI states: gameplay, pause, settings, fail and retry, win or milestone, loading, touch controls.
3. Set the hierarchy: survival and status, then objective, then feedback, then flavor.
4. Replace utility stat cards with authored clusters, meters, badges, icons, alerts, and modal states.
5. Use stable dimensions, safe-area padding, text-fit constraints, and hover/pressed/focus/disabled states.
6. Wire UI to game state rather than duplicating game rules inside UI code.
7. Check text fit and overlap with the longest likely values, safe areas, touch targets, and real state changes on both viewports.

## What goes wrong

A generic dashboard of stat cards · UI covering the player, threats, or the next decision · text that shifts and clips on mobile · decorative panels that reduce readability · touch controls that look right but emit no intents.

## Report

UI intent and states covered, files changed, target-viewport screenshots, text-fit and overlap findings, safe-area and touch-target evidence where applicable, and remaining risks. Feed these results into the lead's consolidated pass rather than rerunning unchanged game-wide checks.
