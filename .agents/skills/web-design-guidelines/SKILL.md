---
name: web-design-guidelines
description: "웹 화면 규칙 점검. 화면 코드를 검토할 때 접근성(버튼 이름·라벨·키보드), 글자·숫자 표기, 불러오기·빈 상태, 터치, 성능 같은 웹 화면 규칙 목록으로 파일:줄 단위 문제를 찾는다. 화면을 직접 열어 보는 ui-check와 같이 쓴다."
license: MIT
metadata:
  minoffia-category: 시험·점검
  minoffia-related: ui-check, frontend-ui-engineering, hallmark
  minoffia-default: "true"
---

# 웹 화면 규칙 점검

> **minoffia 메모:** 출처 vercel-labs/agent-skills `skills/web-design-guidelines`(MIT)와 그 규칙 원본 vercel-labs/web-interface-guidelines@434b7f9 `command.md`(MIT, LICENSE 같이 둠). 원래 스킬은 쓸 때마다 인터넷에서 규칙을 새로 받아 그대로 따르는데, 내용이 바뀌어도 알 수 없어서 규칙을 이 폴더의 `guidelines.md`로 고정해 두었다. 규칙을 새로 받으려면 소유자 승인 뒤 이 파일을 바꾸는 PR로.

## 지시서용 요약

1. 같은 폴더의 `guidelines.md`를 읽는다(인터넷에서 받지 않는다).
2. 바뀐 화면 파일(지시서 범위 안)만 그 규칙으로 검사한다.
3. 결과는 `파일:줄 — 문제 — 고칠 방법` 한 줄씩. 고칠 수 있는 것은 고치고, 못 고친 것은 "남은 문제"에.
4. 화면을 직접 열어 보는 확인(콘솔 오류·가로 넘침)은 ui-check로.
