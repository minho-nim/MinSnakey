---
name: code-graph
description: "코드 연결 그래프. 바꿀 곳이 여러 파일에 걸칠 때, 파일을 하나씩 열기 전에 관련 함수·파일과 영향받는 곳을 먼저 찾는다. 한 파일만 고치는 일에는 쓰지 않는다."
metadata:
  minoffia-category: 기타
  minoffia-related: repo-map
---

# 코드 연결 그래프

> **minoffia 메모:** 미노피아가 만든 스킬. graphify(graphifyy, 버전 고정)를 쓴다. 설치·실행이 안 되면 건너뛰고 repo-map만 쓴다.

## 지시서용 요약

- 준비(한 번): `echo graphify-out/ >> .git/info/exclude; pip install -q graphifyy==0.9.95 && graphify update . > /dev/null`
- 찾기: `graphify query "<영어 핵심어 2~4개>" --budget 800` (코드 이름은 영어로 검색)
- 영향: `graphify affected "<바꿀 함수 이름>"`
- 끝나면 graphify-out 폴더를 지운다(커밋하지 않는다).
