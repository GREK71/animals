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
cp .env.example .env   # SESSION_SECRET(32자 이상) 입력. ADMIN_PASSWORD는 비워 둬도 됨
npm run dev            # http://localhost:3000
```

첫 실행 때 `web/data/archive.sqlite`가 만들어지고 예시 데이터가 들어간다. 예시 데이터를 넣지 않으려면 `SEED_EXAMPLES=false`.

계정이 하나도 없으면 첫 접속 때 `/setup` 화면(마스터 등록)이 열리고, 여기서 만든 첫 계정이 마스터가 된다. 아무나 선점하지 못하도록 서버 시작 로그에 찍히는 설정 토큰(`data/setup-token.txt`)을 입력해야 하며, 계정이 만들어지면 토큰은 지워진다. `.env`에 ADMIN_PASSWORD를 넣어 두면 그 값으로 운영자 계정(ADMIN_USERNAME, 기본 admin)을 자동으로 만들고 `/setup`은 건너뛴다.

### NAS 배포 (Docker)

```
cd web
cp .env.example .env   # 값 채우기
docker compose up -d --build
```

- 데이터는 `web/data`(컨테이너의 `/data`)에 SQLite 파일 하나로 저장된다. 이 폴더를 NAS 백업(Hyper Backup, 스냅샷)에 포함한다.
- 포트는 3000. 외부 접속은 포트 포워딩 대신 Tailscale 같은 VPN을 권장한다.
- HTTPS 리버스 프록시 뒤에 두면 `.env`에 `COOKIE_SECURE=true`.
- 역할은 마스터 > 관리자 > 멤버. 첫 계정(`/setup`에서 만들거나 ADMIN_USERNAME)이 유일한 마스터이며 지울 수 없다. 마스터와 관리자가 설정 화면에서 관리자/멤버 계정을 만들고 지운다. 관리자는 마스터 계정을 관리할 수 없다.
- 로그인은 IP·아이디별 5회 실패 시 10분 잠금. 비밀번호를 바꾸면 다른 기기의 세션은 모두 풀린다.
- 백업: 설정 화면의 "지금 백업 파일 만들기"가 WAL까지 합친 스냅샷을 `data/backups/`에 만든다. NAS 백업은 `web/data` 폴더 전체를 대상으로 한다.

### Vultr 등 VPS 배포 (Docker)

Ubuntu 기준. 서버에 root로 접속한 뒤:

```
apt-get update && apt-get install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sh
git clone https://github.com/GREK71/animals.git /opt/animals
cd /opt/animals/web
cp .env.example .env
sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$(openssl rand -hex 32)/" .env
docker compose up -d --build
ufw allow OpenSSH && ufw allow 3000/tcp && ufw --force enable
```

- `docker compose logs archive | grep 토큰` 으로 설정 토큰을 확인한다 (또는 `cat data/setup-token.txt`).
- 브라우저에서 `http://서버IP:3000` 을 열면 `/setup` 마스터 등록 화면이 나온다. 토큰과 아이디·비밀번호를 넣으면 계정이 만들어지고 바로 로그인된다.
- 코드가 바뀌면 `cd /opt/animals && git pull && cd web && docker compose up -d --build`.
- 데이터는 `/opt/animals/web/data` 에 남는다. 컨테이너를 지워도 유지된다.
- 도메인을 붙이면 Caddy 같은 리버스 프록시로 HTTPS를 두고 `.env`에 `COOKIE_SECURE=true`.

### 레퍼런스 업로드와 씬 프롬프트 생성

- 캐릭터 › 비주얼 가이드 탭의 레퍼런스 슬롯(얼굴 앵커, 캐릭터 시트, Soul ID 학습 세트, 동물형 앵커)에 PNG/JPG/WEBP를 올린다. 장당 20MB. 파일은 `data/uploads/`에 저장되고 로그인한 사용자만 `/files/<id>`로 볼 수 있다.
- 에피소드 › 샷 · 생성 탭의 샷마다 "GPT 요청문 복사"가 있다. ChatGPT에 캐릭터 시트 이미지를 첨부하고 요청문을 붙여넣으면 한국어 브리프, 힉스필드 Soul 2.0 키프레임 프롬프트(영어), Kling 3.0 모션 프롬프트(영어), 제작 메모 네 블록으로 답한다. 결과를 입력 칸에 붙여 저장하면 버전으로 쌓이고, 복사 버튼으로 힉스필드에 넣는다.
- 힉스필드에서 확정한 키프레임을 샷의 "시작 프레임"으로 올려 두면 팀이 같은 화면에서 확인할 수 있다.
- 선택 사항: `.env`에 `ANTHROPIC_API_KEY`를 넣으면 같은 화면에 "AI로 씬 프롬프트 만들기" 버튼이 생겨 Claude(claude-opus-5-5)가 직접 생성한다 (건당 150원 안팎). 키가 없으면 버튼이 보이지 않는다.

### 구조

- `src/app/setup` 첫 마스터 계정 등록 (계정이 없을 때만), `src/app/login` 로그인 (서버 액션), `src/app/api/login` 스크립트용 로그인 API
- `src/proxy.ts` 세션 쿠키 없으면 /login으로
- `src/app/(app)/*` 홈, 캐릭터, 장소, 에피소드(샷·생성, 프롬프트 조합, 게시), 소재, 미정 항목, 설정
- `src/lib/db.ts` 문서형 SQLite 저장소, `src/lib/seed.ts` 예시 데이터
- `src/lib/files.ts` 업로드 저장·검증, `src/app/files/[id]` 파일 서빙, `src/lib/prompts.ts` Claude로 샷 프롬프트 생성
