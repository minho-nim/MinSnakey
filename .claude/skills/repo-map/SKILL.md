---
name: repo-map
description: "저장소 지도. 코드를 고치기 전에 한 번, 이미 있는 함수·컴포넌트 목록을 먼저 본다(있는 것은 다시 만들지 않고, 파일은 필요한 것만 연다). 토큰을 아끼려고 처음에 쓴다."
metadata:
  minoffia-category: 기타
  minoffia-default: "true"
  minoffia-related: code-graph
---

# 저장소 지도

> **minoffia 메모:** 미노피아가 만든 스킬(직접 만듦). 예전에는 지시서마다 이 스크립트를 통째로 붙였는데(약 1,250자), 이제 이 스킬을 가리키는 한 줄로 바꿨다.

## 지시서용 요약

- 저장소 맨 위에서 `node <이 스킬 폴더>/scripts/repo-map.mjs`를 한 번 실행한다(예: `node .agents/skills/repo-map/scripts/repo-map.mjs` 또는 `.claude/skills/...`).
- 나온 목록(폴더별 export 이름)을 먼저 읽고, 이미 있는 함수·컴포넌트는 다시 만들지 말고 쓴다.
- 파일은 필요한 것만 연다. 목록이 길면 `node … 1500`처럼 글자 수 한도를 줄 수 있다(기본 2500자).
- 모델 호출·네트워크 없이 git ls-files만 읽는다. 실행이 안 되면 건너뛴다.
