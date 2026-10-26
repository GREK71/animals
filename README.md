# ANIMAL HOUSE | 수인 쉐어하우스 기획

AI 인플루언서 채널 "수인 쉐어하우스"의 기획 문서와 제작 아카이브 화면 시안.

- 화면 시안 (클릭형): https://grek71.github.io/animals/
- 화면 기획서: [docs/screen-plan.md](docs/screen-plan.md)
- 콘텐츠 계획 (첫 3편 샷·프롬프트): [docs/content-plan.md](docs/content-plan.md)
- 도윤 비주얼 기준: [docs/visual-doyoon.md](docs/visual-doyoon.md)
- Codex 검토 결과: [reviews/](reviews/)

시안 HTML을 고친 뒤에는 `python3 scripts/build-index.py`로 `docs/index.html`을 다시 만든다.
레퍼런스 이미지(`visual/`)는 저장소에 포함하지 않는다.

## 웹앱 (web/)

로그인이 있는 실제 아카이브 앱. Next.js 16 + SQLite(better-sqlite3) + iron-session. 화면 기획서 v0.2의 MVP 범위를 따른다.

### 로컬 실행

```
cd web
npm install
cp .env.example .env   # SESSION_SECRET(32자 이상), ADMIN_PASSWORD 입력
npm run dev            # http://localhost:3000
```

첫 실행 때 `web/data/archive.sqlite`가 만들어지고 운영자 계정(ADMIN_USERNAME / ADMIN_PASSWORD, 기본 admin / changeme)과 예시 데이터가 들어간다. 예시 데이터를 넣지 않으려면 `SEED_EXAMPLES=false`.

### NAS 배포 (Docker)

```
cd web
cp .env.example .env   # 값 채우기
docker compose up -d --build
```

- 데이터는 `web/data`(컨테이너의 `/data`)에 SQLite 파일 하나로 저장된다. 이 폴더를 NAS 백업(Hyper Backup, 스냅샷)에 포함한다.
- 포트는 3000. 외부 접속은 포트 포워딩 대신 Tailscale 같은 VPN을 권장한다.
- HTTPS 리버스 프록시 뒤에 두면 `.env`에 `COOKIE_SECURE=true`.
- 동료 계정은 관리자가 로그인 후 설정 화면에서 만든다. 첫 계정(ADMIN_USERNAME)이 관리자이며, 운영 환경(NODE_ENV=production)에서는 ADMIN_PASSWORD 없이는 시작하지 않는다.
- 로그인은 IP·아이디별 5회 실패 시 10분 잠금. 비밀번호를 바꾸면 다른 기기의 세션은 모두 풀린다.
- 백업: 설정 화면의 "지금 백업 파일 만들기"가 WAL까지 합친 스냅샷을 `data/backups/`에 만든다. NAS 백업은 `web/data` 폴더 전체를 대상으로 한다.

### 구조

- `src/app/login` 로그인 (서버 액션), `src/app/api/login` 스크립트용 로그인 API
- `src/proxy.ts` 세션 쿠키 없으면 /login으로
- `src/app/(app)/*` 홈, 캐릭터, 장소, 에피소드(샷·생성, 프롬프트 조합, 게시), 소재, 미정 항목, 설정
- `src/lib/db.ts` 문서형 SQLite 저장소, `src/lib/seed.ts` 예시 데이터
