# 미노피아판에서 바꾼 것

- 출처: Nutlope/hallmark@04977e1 `skills/hallmark` v2.0.0 (MIT, LICENSE 같이 둠).
- 뺀 것
  - 그림 생성 스크립트(imagegen, 시험 포함): Together AI 유료 그림 생성. 추가 결제 0원 규칙. `TOGETHER_API_KEY`가 없으면 comp 단계는 저절로 건너뛴다.
  - 설치 스크립트 세 개(install, install-hook, lint-hook): 전역 설치·편집 훅 설치. 스킬 넣기는 미노피아 '프로젝트에 넣기'로만.
  - `references/themes/*.jpg`(5.6MB): 테마 미리보기 사진. 프로젝트 저장소를 가볍게 하려고. shortcut: 테마 사진 없음, 그림 예시가 꼭 필요하면 원문에서 다시 받기.
- 고친 것: SKILL.md 앞머리(한국어 설명·분류)와 짧은 메모, references/flow.md에서 뺀 스크립트를 가리키던 세 곳.
- 검사: `node scripts/refcheck.mjs`, `node --test scripts/*.test.mjs`.
