# 꼬물 레이스 — 개발 에이전트 안내

이 저장소는 AI Office와 독립된 손그림 뱀 경주 게임이다. AI Office는 작업을 전달하는 관리 도구이며, 이 저장소의 런타임 의존성이 아니다.

- Node.js 22 이상 (검증: 24). 설치 `npm ci`, 실행 `npm run dev`, 검증 `npm run check`.
- 브라우저 검증 `npm run test:e2e`. 기본 Chromium `/usr/bin/chromium`, 다른 머신은 `CHROMIUM_PATH` 지정. 호환 Chromium 설치 필요.
- 구현 기준: `docs/SPEC.md`. 100m 완성도가 우선. 미구현 코스는 비활성화 상태 유지.
- 원본 head/body/tail strokes와 기존 브라우저 데이터를 보존한다. 저장 스키마 변경에는 마이그레이션 필요.
- 물리 연산은 `src/physics.ts`에 고정 간격으로 구현. 자동/수동/CPU는 같은 엔진 사용. 우승자 사전 지정 금지.
- UI 텍스트는 한국어, 모바일 우선. 펜/추진 입력은 Pointer Events 사용.
- 외부 AI, API 키, 로그인, 서버 DB를 추가하지 않는다.
- 실제 확인한 테스트만 성공으로 보고한다. 알려진 제한은 README에 기록한다.
- 작업별 브랜치에서 변경하고 검증 결과와 함께 PR을 만든다. 운영 배포/기존 프로젝트 변경은 명시적 요청이 있어야 한다.
- 이 문서는 자율적인 외부 메시지 전송이나 AI Office/다른 저장소 수정 권한을 부여하지 않는다.
