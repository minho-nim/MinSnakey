# GitHub 업로드와 공개 플레이 주소

현재 작업 공간에서 게임 코드와 자동 배포 워크플로를 준비했다. GitHub 저장소는 https://github.com/minho-nim/snake-race 이다. GitHub Pages 최초 설정과 배포 성공 확인은 필요하다.

## 최초 연결

1. GitHub에서 `snake-race` 공개 저장소를 만든다. README를 포함해도 된다.
2. 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택한다.
3. 저장소 URL을 개발 채팅에 알려주면 게임 코드와 `.github/workflows/pages.yml`을 업로드한다.
4. 워크플로의 Build와 Deploy가 성공하면 Pages에서 확인된 주소로 접속한다.

새 저장소 생성과 Pages 설정은 현재 GitHub 연결 도구가 지원하지 않아 저장소 소유자가 해야 한다. 코드 업로드 도구는 연결돼 있다. 업로드 후 권한 오류가 발생하면 GitHub 연결이 해당 새 저장소에 접근하도록 허용해야 한다.

## 이후 업데이트

main에 변경 사항을 올리면 설치 → 타입 검사 → 시뮬레이션 테스트 → 빌드 → GitHub Pages 배포가 자동으로 실행된다. `dist`만 서비스하고 개발 소스·테스트 코드는 배포 아티팩트에 포함하지 않는다.

워크플로는 GitHub 기본 GITHUB_TOKEN을 사용하며 별도 토큰 입력은 필요 없다. 실제 배포 성공과 공개 페이지 동작을 확인한 뒤 사용자에게 링크를 보고한다.
