# web/ 앱 1차 구현 diff 검토 | Codex

검토일: 2026-10-27 · 7건 전부 반영 (관리자 역할, Docker /data 권한, 리다이렉트 검증, 로그인 속도 제한, 비밀번호 변경 시 세션 무효화, WAL 안전 백업, 운영 환경 기본 비밀번호 거부)

staged 변경사항만 기준으로 리뷰했습니다. 코드는 수정하지 않았습니다.

## 발견 사항

1. **[높음] 일반 사용자도 계정을 추가·삭제할 수 있어 권한 상승이 가능합니다.**  
   [settings/actions.ts](/Users/gido/Ai-Projects/animals/web/src/app/(app)/settings/actions.ts:8), [settings/page.tsx](/Users/gido/Ai-Projects/animals/web/src/app/(app)/settings/page.tsx:15)

   `addUser()`와 `removeUser()`는 로그인 여부만 검사합니다. 사용자 테이블에는 role/admin 컬럼도 없습니다. 따라서 새로 만들어진 동료 계정도 다른 계정을 만들거나 삭제할 수 있습니다. 자기 자신만 삭제하지 못할 뿐, 최초 운영자 계정을 삭제하고 별도의 계정을 생성하는 것도 가능합니다.

   설정 화면 설명은 “운영자가 동료 계정을 만들어 줍니다”라고 되어 있어 의도와 구현이 불일치합니다. 관리자 역할을 저장하고 서버 액션마다 관리자 권한을 검증해야 합니다.

2. **[높음] 기본 Docker Compose 실행이 `/data` 권한 문제로 실패할 수 있습니다.**  
   [docker-compose.yml](/Users/gido/Ai-Projects/animals/web/docker-compose.yml:14), [Dockerfile](/Users/gido/Ai-Projects/animals/web/Dockerfile:18)

   이미지 빌드 시 `/data`를 `node` 소유로 만들지만, Compose의 `./data:/data` bind mount가 그 디렉터리를 덮어씁니다. 호스트에 `./data`가 없다면 Docker가 보통 root 소유로 생성하므로, UID 1000의 `node` 사용자가 `archive.sqlite`를 만들지 못하고 최초 요청에서 `SQLITE_CANTOPEN`/`EACCES`가 발생할 수 있습니다.

   새 환경에서 `docker compose up`하는 경로를 반드시 검증해야 합니다. named volume 사용, 호스트 디렉터리 사전 생성 및 UID 조정, 또는 명시적인 초기화 절차가 필요합니다.

3. **[중간] 로그인 후 리다이렉트 검사가 backslash 기반 외부 리다이렉트를 충분히 막지 못합니다.**  
   [login/actions.ts](/Users/gido/Ai-Projects/animals/web/src/app/login/actions.ts:11), [login/actions.ts](/Users/gido/Ai-Projects/animals/web/src/app/login/actions.ts:20)

   `next`가 `/`로 시작하고 `//`로 시작하지 않는지만 확인합니다. `/\attacker.example` 같은 값은 검사를 통과하며, URL 처리 계층이나 브라우저에서 backslash가 slash로 정규화되면 scheme-relative 외부 URL이 될 수 있습니다. 공격자는 피해자에게 조작된 `/login?next=...` 링크를 보내 정상 로그인 직후 피싱 사이트로 이동시킬 수 있습니다.

   문자열 prefix 검사 대신 허용된 내부 pathname으로 파싱·정규화하거나, 명시적인 경로 allowlist를 사용하는 편이 안전합니다.

4. **[중간] 공개 로그인 경로에 속도 제한이 없어 온라인 비밀번호 대입과 CPU 고갈에 취약합니다.**  
   [api/login/route.ts](/Users/gido/Ai-Projects/animals/web/src/app/api/login/route.ts:5), [login/actions.ts](/Users/gido/Ai-Projects/animals/web/src/app/login/actions.ts:8), [session.ts](/Users/gido/Ai-Projects/animals/web/src/lib/session.ts:49)

   화면의 서버 액션과 `/api/login` 모두 무제한으로 호출할 수 있습니다. 특히 `bcrypt.compareSync()`가 요청마다 Node 이벤트 루프를 동기적으로 점유하므로, 병렬 로그인 시도는 brute force뿐 아니라 간단한 서비스 거부 공격으로 이어질 수 있습니다.

   IP/계정별 제한과 지연 또는 잠금 정책이 필요하며, 비동기 bcrypt 비교도 고려해야 합니다. 두 로그인 진입점 모두 같은 제한을 적용해야 합니다.

5. **[중간] 비밀번호 변경 후 기존 세션이 계속 유효합니다.**  
   [settings/actions.ts](/Users/gido/Ai-Projects/animals/web/src/app/(app)/settings/actions.ts:20), [session.ts](/Users/gido/Ai-Projects/animals/web/src/lib/session.ts:36)

   세션은 서명된 쿠키 안의 `userId`만 신뢰하고, 사용자 레코드에는 세션 버전이나 비밀번호 변경 시각이 없습니다. 따라서 비밀번호를 바꿔도 이미 탈취된 세션은 최대 14일 동안 그대로 사용할 수 있습니다.

   비밀번호 변경을 계정 침해 대응으로도 사용할 예정이라면 `session_version` 같은 서버 측 값을 검증하거나, 변경 후 기존 세션을 일괄 폐기할 방법이 필요합니다.

6. **[중간] WAL 모드인데 “SQLite 파일 하나”만 백업하도록 안내해 최근 데이터가 빠질 수 있습니다.**  
   [db.ts](/Users/gido/Ai-Projects/animals/web/src/lib/db.ts:34), [settings/page.tsx](/Users/gido/Ai-Projects/animals/web/src/app/(app)/settings/page.tsx:41)

   DB는 WAL 모드이므로 커밋된 최신 변경이 `archive.sqlite-wal`에 남아 있을 수 있습니다. 실행 중 `archive.sqlite`만 복사하는 백업은 최신 변경을 누락하거나 일관되지 않을 수 있습니다. 화면의 “SQLite 파일 하나”라는 설명과 NAS에서 해당 폴더를 백업하라는 안내가 서로도 다소 모호합니다.

   SQLite backup API, `VACUUM INTO`, 안전한 checkpoint 후 복사, 또는 DB·WAL·SHM을 일관된 스냅샷으로 보관하는 절차가 필요합니다.

7. **[낮음] 운영 환경 밖에서는 자동으로 알려진 기본 관리자 비밀번호가 생성됩니다.**  
   [db.ts](/Users/gido/Ai-Projects/animals/web/src/lib/db.ts:51)

   `ADMIN_PASSWORD`가 없으면 `admin / changeme`가 만들어집니다. `SESSION_SECRET`만 production에서 강제되므로, `NODE_ENV`가 잘못 설정된 스테이징·직접 실행 환경이나 외부에 노출된 개발 서버는 즉시 침해될 수 있습니다. 경고 로그만으로는 충분하지 않으며, 비밀번호 미설정 시 시작을 거부하는 편이 안전합니다.

## 추가 관찰

- 서버 액션들은 변경 전에 `requireUser()`를 호출하고 있어, 단순히 세션 쿠키가 존재한다는 proxy 검사만 믿지는 않습니다. 이 부분은 적절합니다.
- SQL 값들은 prepared statement로 전달되어 현재 호출부에서 값 기반 SQL injection은 보이지 않습니다.
- `COOKIE_SECURE` 기본값이 `false`이므로 HTTPS 배포에서는 반드시 명시적으로 `true`로 설정해야 합니다. 현재 Compose 기본값 그대로 역방향 프록시 뒤에 배포하면 세션 쿠키가 Secure로 표시되지 않습니다.
