# 이후 AI Office에서 개발 지시하기

게임은 독립 저장소로 관리한다. AI Office의 서비스 링크 목록과 개발 작업 대상 설정은 별개다.

현재 구현: 게임 코드, AGENTS.md, 설치 스크립트, 테스트 명령. 원격 저장소는 minho-nim/MinSnakey를 사용한다. AI Office 실행 연동은 아직 구현하지 않았다.

등록에 필요한 값:

- 프로젝트 식별자: MinSnakey
- 저장소 URL: https://github.com/minho-nim/MinSnakey
- 기본 브랜치: main
- 작업 브랜치: task/<작업-ID>
- 전용 Codex 환경: 저장소 연결 후 설치 명령 `bash scripts/setup.sh`
- 검증: `npm run check`, 브라우저가 있으면 `npm run test:e2e`
- 시작 지침: AGENTS.md를 읽고 docs/SPEC.md 및 해당 작업 범위에 따라 수정
- 완료 결과: 변경 요약, 테스트 결과, 알려진 제한, PR URL

예시 지시:

> MinSnakey 저장소의 AGENTS.md를 읽고, 100m 게임의 수동 조작 버튼을 개선해라. 기존 그림과 기록은 보존한다. npm run check와 모바일 브라우저 검증 후 PR을 만들고 결과를 보고하라. 운영 배포는 하지 않는다.

AI Office의 실제 에이전트 실행 API/권한 방식에 맞춰 작업 전달 어댑터를 구현해야 한다. 브라우저 게임에 GitHub 토큰이나 에이전트 자격증명을 넣지 않는다. 저장소 생성 이후 전용 클라우드 환경을 연결하면 현재 환경과 독립적으로 작업을 시작할 수 있다.
