[← 메인 README(목차)로 돌아가기](../../README.md#단계별-기록-목차)

## 11단계 현재 상태: 나만의 접속 앱을 완성합니다

자료실을 설치형 웹앱 화면(manifest 포함)으로 다듬고 기기 승인 흐름을 붙였습니다. 따로 설치하는 접속 프로그램은 없습니다. **앱 설치는 화면을 앱 창으로 여는 것일 뿐 기기 확인이 아니며, 이 기기의 승인 여부는 서버가 정합니다.** 저장점에서 `aleph.config.json`의 `step`을 11로 올렸고 `scripts/deployment-identity.mjs`와 `src/attack-check.mjs`가 11단계를 받도록 고쳤습니다(`test/step10-savepoint.test.mjs` → `test/step11-savepoint.test.mjs`). 아래 결과는 직접 돌린 연습이며 심판 판정이 아닙니다.

### 만든 것

| 기능 | 파일 | 하는 일 |
| --- | --- | --- |
| 설치형 웹앱 설정 | `public/manifest.webmanifest`, `public/icons/` | 앱 이름 「BYTE BACK 내 자료실」(짧은 이름 「내 자료실」), `standalone`, 아이콘 192·512. 설명에 "앱 설치는 기기 확인이 아니며, 기기 승인 여부는 서버가 정합니다"를 적었습니다. |
| 오프라인 안내 | `public/sw.js`, `public/offline.html` | 서비스 워커는 오프라인 안내 페이지 한 장만 저장합니다. 화면 이동이 네트워크에서 실패할 때만 안내를 보여 주고, 메모·로그인 토큰·기기 승인 결과·`/api/` 응답은 저장하거나 가로채지 않습니다. |
| 상태 표시 | `public/index.html` | 「앱」(브라우저 탭 / 설치한 앱 창)과 「기기 승인」(서버 확인 전·미등록·승인 대기·승인된 기기 있음·서버가 확인함·회수됨)을 따로 보여 줍니다. 기기 승인 칸은 서버 응답(`GET /api/device/status`)으로만 바뀌고, 설치 여부로는 바뀌지 않습니다. |
| 기기 승인 요청·결과 화면 | `public/index.html` | 로그인 뒤 서버가 이번 로그인 세션을 승인된 기기로 확인하기 전에는 메모를 불러오지도 그리지도 않고 승인 화면만 보여 줍니다. |
| 기기 승인 서버 | `api/device/status.js`·`challenge.js`·`register.js`·`verify.js`, `src/device-approval.mjs` | 패스키(WebAuthn) 등록은 승인 대기(`pending`)로만 저장하고, 승인된 기기의 서명을 검증한 뒤에만 세션을 확인 상태로 기록합니다. 검증은 `@simplewebauthn/server` 13.3.3(버전 고정)을 씁니다. 자원 ID는 `devices.own`입니다. |
| 자료 API의 기기 검사 | `src/notes-api.mjs`(`guard`·`deviceGate`), `src/device-session.mjs`, `src/verify-login.mjs` | 메모·복원 API는 학생 로그인 세션이 승인된 기기로 확인되었을 때만 자료를 줍니다. 아니면 `403 DEVICE_NOT_APPROVED`, 기록을 읽지 못하면 `503 DEVICE_CHECK_UNAVAILABLE`이고 자료는 없습니다. |

### 기기 승인 흐름

1. 로그인(Supabase 이메일·비밀번호)합니다. 로그인 토큰은 브라우저 저장소(localStorage)에 두지 않고 그 탭의 메모리에만 둡니다(`persistSession: false`). 새로고침하면 다시 로그인합니다.
2. 「이 기기 승인 요청」: 서버가 이번 로그인 세션에 5분짜리 챌린지를 내고, 기기가 패스키를 만듭니다. 서버는 출처(고정 배포 주소)·챌린지·사용자 확인(지문·얼굴·화면 잠금)을 검증한 뒤 공개키와 자격 ID만 `devices` 표에 `status = 'pending'`으로 저장합니다. **기기 개인키는 기기 인증기 안에서 만들어지고 밖으로 나오지 않으며, 브라우저 저장소(localStorage·sessionStorage·IndexedDB·쿠키)에도 넣지 않습니다.**
3. 승인: 학생(관리자)이 Supabase SQL Editor에서 그 행을 `approved`로 바꿉니다(아래 SQL). 앱에는 승인 API가 없고, 요청 본문에 `status`·`approved`·`owner_id` 같은 값이 있으면 요청 전체를 400으로 거부합니다. **승인 요청 버튼만으로는 권한이 생기지 않습니다.**
4. 「승인된 이 기기로 확인」: 서버가 승인된 내 기기에만 챌린지 서명을 요청하고 서명·출처·챌린지·서명 횟수를 검증합니다. 챌린지는 꺼내는 즉시 지워 한 번만 쓰입니다. 맞으면 이번 로그인 세션(토큰의 `session_id`)을 1시간 동안 확인 상태로 기록합니다.
5. 그 뒤에만 `/api/notes`·`/api/notes/:id`·`/api/restore/note`가 자료를 줍니다. 확인 기록이 없거나 시간이 지났거나 기기가 회수(`revoked`)되면 403입니다. 화면은 서버가 `sessionVerified: true`라고 답할 때만 자료실을 열고, 자료 API가 403을 주면 다시 닫습니다.

- 판정기(`src/decider.mjs`)는 바꾸지 않았습니다. 계약(`docs/DECIDER_REQUEST.md`)에 기기 승인 항목이 없어 `request.device` 같은 값을 만들지 않았고, 엔진이 주는 `deviceRegistered`는 6단계 규칙이 그대로 처리합니다. `RULE_IDS` 5개는 그대로이고 모두 구현에 쓰입니다.
- 심판 토큰(운영 발급자가 ES256으로 서명한 15분짜리 시험 신원)은 기기 검사에서 뺍니다. 패스키 승인 흐름을 거칠 수 없는 신원이라, 적용하면 1~10단계의 정상 요청 시험(A의 메모 읽기·추가 등)이 모두 403이 되기 때문입니다. 심판 토큰은 기기 승인 API도 쓸 수 없습니다(`403 STUDENT_LOGIN_REQUIRED`).
- 거부 사유는 응답이 아니라 서버 로그 한 줄로만 남습니다: `notes_denied reason=device_not_verified`(확인 전·시간 지남), `device_not_approved`(대기·회수), `device_proof_invalid`(서명 검증 실패), `device_request_invalid`(모르는 키·승인된 척하는 값), `device_check_failed`(기록을 읽지 못함).

### 학생이 Supabase SQL Editor에서 실행할 SQL (한 번, 배포 확인 전에)

비밀값은 없습니다. 실행 전에는 학생 로그인의 자료 API가 `503 DEVICE_CHECK_UNAVAILABLE`로 닫혀 있습니다(열어 두지 않음).

```sql
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  label text not null check (char_length(label) between 1 and 40),
  credential_id text not null unique,
  public_key text not null,
  sign_count bigint not null default 0,
  synced boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create table if not exists public.device_sessions (
  session_id uuid primary key,
  owner_id uuid not null,
  challenge text,
  challenge_purpose text check (challenge_purpose in ('register', 'verify')),
  challenge_expires_at timestamptz,
  device_id uuid references public.devices (id) on delete cascade,
  verified_at timestamptz,
  expires_at timestamptz
);
alter table public.devices enable row level security;
alter table public.device_sessions enable row level security;
revoke all on table public.devices, public.device_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.devices, public.device_sessions to service_role;
```

승인과 회수(화면의 「기기 번호」는 `id`의 앞 8자리입니다. 먼저 조회해 본인이 방금 요청한 기기인지 이름·시각으로 확인하세요):

```sql
select id, label, status, synced, created_at from public.devices where status = 'pending' order by created_at;
update public.devices set status = 'approved', approved_at = now() where id = '<조회한 id>' and status = 'pending' returning id, label, status;
-- 회수: 그 기기로 확인된 세션도 바로 닫힙니다(자료 API가 매 요청 기기 상태를 다시 봄).
update public.devices set status = 'revoked' where id = '<조회한 id>' returning id, label, status;
```

### 11단계 확인 순서

| 순서 | 정상 결과 | 거부되어야 할 결과 | 방법 | 상태 |
| --- | --- | --- | --- | --- |
| 1 | `node --test "test/*.test.mjs"` 121개 통과 | | 저장소 루트 | 코딩 도구가 실행: 121개 통과 |
| 2 | `/manifest.webmanifest` 200, 개발자 도구 Application > Manifest에 이름·아이콘, 설치 가능 | | Chrome에서 배포 주소 | 코딩 도구가 배포본에 읽기 요청: `/manifest.webmanifest` 200(이름·짧은 이름·`standalone`·아이콘 192·512), 아이콘 2개 200. 개발자 도구 Application > Manifest 화면은 학생이 보고하지 않아 미확인 |
| 3 | 설치한 앱 창에서 「앱: 설치한 앱 창에서 열림」, 「기기 승인: 서버 확인 전」 | 설치만으로 자료가 열리면 안 됨 | 주소창의 설치 아이콘 | 처음 화면은 「앱: 브라우저 탭에서 열림」이었고(학생 화면), 나중에 설치한 앱 창에서 「설치한 앱 창에서 열림」이 나오는 것을 학생이 확인(학생 보고, 화면 사진은 없음). 탭에서 로그인·기기 확인 뒤 「기기 승인: 서버가 승인된 기기로 확인함」으로 바뀌는 것은 학생 화면으로 확인 |
| 4 | 한 번 온라인으로 연 뒤 오프라인에서 새로고침하면 오프라인 안내만 보임 | 오프라인에서 메모가 보이면 안 됨 | 개발자 도구 Network > Offline | 학생이 개발자 도구 Network의 Offline으로 확인(방법 1): 오프라인 안내 상자가 켜짐(학생 보고). 코딩 도구가 배포본에 새 Chrome 프로필(Chrome 155, 로그인 없음)로 확인: 서비스 워커 활성화, 저장된 것은 `/offline.html` 한 장뿐, 서비스 워커까지 오프라인일 때 새로고침하면 「지금은 오프라인입니다」 안내만 나옴. Network의 Offline만으로는 서비스 워커의 요청이 막히지 않아 첫 화면이 그대로 나올 수 있음(Application > Service workers의 Offline으로 확인). 학생이 이 안내 페이지를 직접 본 것은 미확인 |
| 5 | A로 로그인하면 승인 화면만 보이고 메모 없음 → 「이 기기 승인 요청」 → 「승인 대기」 | 대기 상태에서 메모가 보이거나 `/api/notes`가 열리면 안 됨(403) | 브라우저 | 학생이 실행, 화면 사진 확인: 승인 요청 뒤 「시험 기기 · 승인 대기」(기기 번호는 가림)와 승인 요청 완료 메시지가 보임. 대기 상태에서 메모가 안 보인 것과 `/api/notes`의 403 응답은 사진으로 확인하지 못함 |
| 6 | SQL Editor에서 승인 → 「승인된 이 기기로 확인」 → 기존 자료실의 추가·수정·삭제 정상 | | 브라우저, SQL Editor | 학생이 실행(학생 보고와 화면 사진 확인): 승인한 뒤 「서버가 이 기기의 서명을 확인했습니다.」가 나왔고, 자료실이 열려 메모 삭제(「삭제했습니다.」)가 됨. 메모 추가·수정도 정상이었음(학생 보고, 화면 사진은 없음) |
| 7 | | 승인하지 않은 다른 브라우저의 A·계정 B는 자료 없음(403), 승인을 회수하면 다시 403, Vercel Logs에 `notes_denied reason=device_not_verified`·`device_not_approved` | 시크릿 창, SQL Editor, Vercel Logs | 학생이 실행(학생 보고): 회수 뒤 메모 추가를 누르면 메모가 추가되지 않고 자료실이 닫히며(「서버가 이 기기 확인을 인정하지 않음」), Vercel Logs에 `notes_denied reason=device_not_approved resource=notes.own method=POST` 줄이 있음(학생이 줄을 보내 줌). 시크릿 창의 계정 B는 로그인하면 승인 화면만 보이고 메모가 없으며 「승인된 이 기기로 확인」은 `HTTP 409 NO_APPROVED_DEVICE`(학생 보고). 화면은 서버가 확인하기 전에는 메모 API를 부르지 않아 `device_not_verified` 줄은 이 시험에서 생기지 않고, 그 줄은 다른 클라이언트가 토큰으로 직접 요청할 때 생기는 것으로 코드·시험으로만 확인(실제 요청은 미실행). 승인하지 않은 다른 브라우저의 같은 계정 A는 미실행 |
| 8 | 1~10단계 결과 유지: `/data.json` 404, 로그인 없는 `/api/notes`·복원·기기 API 401 | | `npm run bundle`(자기 점검) | 코딩 도구가 커밋 `4b07d75`에서 실행: 단계 11, 직접 점검 20개 중 실제 요청은 모두 401·404이고 메모 내용 없음(미실행 6개, 확인 불가 3개). 제출 직전에 최신 커밋에서 다시 실행해야 하고, 이 기록은 그 결과를 쓰지 않음 |

### 11단계 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| `node --test "test/*.test.mjs"` | 코딩 도구가 실제 실행 | 121개 통과(기존 108개 + 화면 5개 + 기기 승인 7개 + 저장점 1개). 가짜 패스키 인증기(P-256)와 가짜 DB로 확인한 것: 등록은 `pending`, 승인 전 403, 승인 뒤 그 기기의 서명으로만 세션이 열림, 다른 출처·다른 서비스·사용자 확인 없음·다른 키·재사용 챌린지·서명 횟수 역행은 400, 승인된 척하는 값은 400이고 저장 안 됨, 남의 기기 404·대기 기기 403, 확인 뒤 회수·시간 초과는 다시 403, 같은 계정의 다른 로그인 세션은 따로 확인, 기록을 읽지 못하면 503, 심판 토큰은 기기 검사 제외·기기 API 403 |
| 서버 함수 연결 | 코딩 도구가 가짜 환경값으로 `api/` 함수를 직접 호출(외부 요청 없음) | 로그인 없는·가짜 토큰·승인된 척하는 본문의 기기 API 요청은 모두 401과 `X-Resource-Id: devices.own`, 메모·복원 API도 401과 `notes.own` |
| `decider:test`, `detect:test`, `fixture:7`, `test:package` | 코딩 도구가 실제 실행 | 4줄·6줄 통과, 정상 `allow`·복합 이상 `step_up`, 3개 통과 |
| 판정기 형식 점검(가상 요청 19종) | 코딩 도구가 실제 실행 | 읽은 이름은 계약의 11개뿐(`role`·`identity`·`device`·`geo` 없음), `ruleIds`는 모두 `RULE_IDS` 안. `requestId`가 없는 요청 2종만 돌려줄 ID가 없음(6단계부터의 약점) |
| 새로 받은 저장소에서 `npm install` | 코딩 도구가 커밋 `929f829`를 새로 복제해 실행 | `node_modules` 없이 종료 코드 0, 취약점 0, 잠금 파일 변화 없음 |
| 빌드 식별(가짜 Vercel 환경값) | 코딩 도구가 실제 실행 | `step` 11·`restoreRoute`·허용 경로 5개·`originalApiUrl`을 싣고, `step` 12는 거부 |
| 배포본(커밋 `4b07d75`)에 로그인 없는 읽기 요청 | 코딩 도구가 실제 요청 | `/manifest.webmanifest`·`/sw.js`·`/offline.html`·아이콘 2개 200, `/data.json` 404, 기기 API 4개와 메모·복원 API는 로그인 없음·가짜 토큰으로 모두 401(`X-Resource-Id: devices.own`·`notes.own`) |
| `npm run bundle` (커밋 `4b07d75`) | 코딩 도구가 실행 | 단계 11, 바뀐 파일 6개, 규칙 5개, 직접 점검 20개(실제 요청은 모두 401·404이고 메모 내용 없음, 미실행 6개, 확인 불가 3개). 묶음과 설명 파일은 커밋하지 않음. 이후 커밋이 더 생겨 제출 전에 다시 실행해야 함 |
| 승인 결과 표시 `bfba3c6` | 코딩 도구가 푸시·배포 확인 | 승인 요청 결과가 페이지 맨 아래 작은 글씨로만 나와 놓치기 쉬워, 버튼 아래에 단계(1/3~3/3)·HTTP 상태·서버 오류 코드와 함께 표시하게 했습니다. 서버·판정기는 바꾸지 않음 |
| 기기 승인 흐름 실제 시험(승인 요청 → SQL Editor 승인 → 기기 확인 → 메모 삭제 → 회수) | 학생이 실행, 화면 사진 확인(「확인 순서」 5~7의 상태 칸) | 승인 요청은 대기로만 저장되고, 승인·서명 확인 뒤 자료실이 열리며 회수하면 닫힘. 등록된 패스키는 「다른 기기로 동기화되는 패스키」(`synced`)로 표시됨 |
| 회수 뒤 서버의 403과 로그, 승인하지 않은 계정 B(순서 7) | 학생이 실행·보고 | 위 순서 7의 상태 칸과 같음. 모두 기대한 결과였음 |
| 승인된 기기에서 메모 추가·수정, 설치한 앱 창에서 「설치한 앱 창에서 열림」 | 학생 보고 | 둘 다 정상(화면 사진은 없음) |
| 승인하지 않은 다른 브라우저의 같은 계정 A, 로그인한 토큰으로 메모 API를 직접 호출한 403(`device_not_verified`) | 미실행 | 시험(`test/device-approval.test.mjs`)으로만 확인 |
| `npm run bundle` 재실행 (커밋 `0163a29`) | 코딩 도구가 실행 | 단계 11, 바뀐 파일 1개, 규칙 5개, 직접 점검 20개(실제 요청 11개는 모두 거부되고 메모 내용 없음, 미실행 6개, 확인 불가 3개). 묶음과 설명 파일은 커밋하지 않음 |
| 심판의 11단계 제출 | 학생 보고 | 통과. 거부 사유 코드는 보고되지 않았고, 제출한 커밋은 기록이 없음. 코드는 `bfba3c6`부터 `5e52985`까지 같음(git으로 대조, 2026-10-14) |

### 11단계의 남은 약점 (해소되지 않음)

- **심판 토큰을 기기 검사에서 뺀 것은 추정에 근거합니다.** 11단계는 통과했지만(학생 보고), 심판이 무엇을 어떻게 시험했는지는 볼 수 없어 이 설계가 옳았다고 확정하지 못합니다. 심판이 패스키 흐름을 거칠 수 없다고 보았습니다. 심판이 심판 토큰으로 "승인 전에는 자료가 없음"을 시험한다면 이 점에서 실패할 수 있습니다. 11단계 기기 승인용 운영 계약은 이 저장소와 공식 시작 틀에 없습니다.
- 동기화되는 패스키(iCloud 키체인·Google 비밀번호 관리자 등)는 같은 계정의 다른 기기로 복사됩니다. 서버는 `synced`로 표시만 하고 막지 않으므로, 관리하는 기기만 허용하려면 `synced`가 `false`인 기기만 승인해야 합니다.
- 기기 확인은 로그인 세션(`session_id`)에 1시간 묶입니다. 그 사이 그 탭의 토큰을 빼낸 공격자는 같은 세션으로 자료를 읽을 수 있습니다. 로그아웃해도 이미 발급된 액세스 토큰은 만료(최대 1시간)까지 서버 검증을 통과합니다(Supabase 공개키로 로컬 검증).
- 승인은 SQL Editor에서 사람이 합니다. 기기 이름·기기 번호·요청 시각으로 본인 기기인지 판단해야 하며, 승인 기록은 `approved_at` 한 칸뿐입니다(별도 감사 이력 없음).
- 패스키는 고정 배포 주소(`publicAppUrl`)에만 묶입니다. 배포마다 바뀌는 주소나 로컬 화면에서는 기기 승인을 할 수 없습니다.
- 새로고침하면 다시 로그인하고 기기를 확인해야 합니다(토큰을 브라우저 저장소에 두지 않는 대가). 오프라인에서는 자료를 볼 수 없습니다.
- 요청 횟수 제한이 없어 승인 요청을 많이 보내 대기 행을 쌓을 수 있습니다.
- 자기 점검(`npm run bundle`)은 로그인하지 않으므로 승인 전 403과 승인 뒤 정상 화면은 미실행으로 남습니다. 자기 점검은 20개까지라 로그인 없는 메모 쓰기 3개(`anonymous_write`)와 복원 요청 2개(`restore_without_login`)를 각각 한 항목으로 묶었습니다(요청은 전과 같이 모두 보냄).
- 이전 단계의 약점은 그대로입니다(10·9·8단계 약점 목록 참고).

