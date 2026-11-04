# GitHub 업로드와 공개 플레이 주소

GitHub 저장소: https://github.com/minho-nim/snake-race
공개 게임 주소: https://minho-nim.github.io/snake-race/

저장소 생성과 Pages Source=GitHub Actions 설정을 완료했고, GitHub Actions의 Build·Deploy 성공 및 반환된 게임 주소를 확인했다.

## 이후 업데이트

main에 변경 사항을 올리면 설치 → 타입 검사 → 시뮬레이션 테스트 → 빌드 → GitHub Pages 배포가 자동으로 실행된다. `dist`만 서비스하고 개발 소스·테스트 코드는 배포 아티팩트에 포함하지 않는다.

워크플로는 GitHub 기본 GITHUB_TOKEN을 사용하며 별도 토큰 입력은 필요 없다. 실제 배포 성공과 공개 페이지 동작을 확인한 뒤 사용자에게 링크를 보고한다.
