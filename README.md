# 지역아동센터 업무도구

지역아동센터·방과후 돌봄 현장에서 쓰는 로컬 저장형 웹앱입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## GitHub Pages 배포

이 프로젝트는 GitHub Pages 무료 주소로 바로 배포할 수 있게 설정되어 있습니다.

### 1. GitHub 저장소 만들기

- GitHub에서 새 저장소를 만듭니다.
- 이 프로젝트를 `main` 브랜치로 푸시합니다.

### 2. GitHub Pages 활성화

- 저장소 `Settings` → `Pages`로 이동합니다.
- `Build and deployment`를 `GitHub Actions`로 선택합니다.
- 이후 `main` 브랜치에 푸시하면 자동으로 배포됩니다.

### 3. 무료 주소 사용

- 기본 무료 주소는 아래 형태입니다.
- `https://사용자이름.github.io/저장소이름/`

이 프로젝트는 `HashRouter`를 사용하므로 새로고침 시 라우팅이 깨지지 않습니다.

### 4. 커스텀 도메인 연결 선택사항

- 별도 도메인이 있다면 저장소 `Settings` → `Pages`에서 `Custom domain`으로 연결합니다.
- 무료 주소만 쓸 경우 이 단계는 필요 없습니다.

## 배포 워크플로

- GitHub Actions 파일: `.github/workflows/deploy-pages.yml`
- Vite base 경로는 GitHub Pages 환경에 맞게 자동 적용됩니다.
