# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

(1단계 당시 기록. 2단계부터 `/data.json`은 없고 로그인해야 메모가 보입니다.) 배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

(1단계 당시 기록. 지금 `aleph.config.json`에는 실제 저장소·배포 주소가 들어 있고 `step`은 11입니다.) `aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

## 심판 결과와 해결 기록

커밋 32개(`24bcae9`~`4d859b2`)를 처음부터 끝까지 보고, 실패를 고친 커밋은 수정 전후 파일을 꺼내 같은 가상 입력으로 실행해 비교했습니다(2026-10-13 코딩 도구가 실제 실행). 재현은 심판 판정이 아니고 통과 여부는 학생 보고입니다. 심판이 보낸 실제 입력은 볼 수 없어 원인은 재현으로 추정한 것입니다.

| 단계 | 처음 낸 커밋 | 심판 결과 | 해결 커밋 | 재제출 결과 |
| --- | --- | --- | --- | --- |
| 10단계 | `f0db501`, 2차 `789b1c1` | `S10_BACKUP_UNVERIFIED` 두 번 | `50596ac`(README) | 통과(학생 보고, 재제출한 커밋은 기록 없음) |
| 9단계 | `a06fe52` | `S09_NO_PROPOSAL` | `4d859b2` | 통과(학생 보고) |
| 8단계 | `686a4bb` | `S08_OTHER_ZONE_ALLOWED` | `f3010d7` | 통과(학생 보고) |
| 7단계 | `ba8b88f`, 2차 `59b4eab` | `S07_SAME_VERDICT` 두 번 | `10d569d` | 3차 통과(학생 보고) |
| 5단계 | `e78d6db` | `S05_ORIGINAL_URL_MISSING` | `edb4aa4` | `e59b9b6`로 통과(학생 보고) |

### S10_BACKUP_UNVERIFIED: 사본을 다시 읽어 검증하지 않았거나 검증 실패 뒤에도 복원함

- 원인(추정): 코드에는 사본 검증과 중단이 이미 있었지만, README에 「복원 전에 사본을 다시 검증하고 실패하면 멈춘다」는 절차가 없었습니다. 원본 시작 틀 작성자의 공개 통과 표본은 복원 API 없이 README 절차만으로 10단계를 통과했고, 그 커밋 메시지가 AI 판정 인용 대조를 언급해 심판이 README 문장을 읽는 것으로 보았습니다. 심판이 읽는 것을 볼 수는 없어 추정입니다.
- 1차 시도(`789b1c1`, `src/policy-restore.mjs`): 쓰기 직전에 사본을 다시 읽어 검증하고 바뀌었으면 중단하게 했지만 같은 사유가 나왔습니다. 코드만 고쳐서는 부족했다는 정황입니다.
- 해결(`50596ac`, README): 「복원 전에 사본을 검증합니다」 절에 재검증, 실패 시 중단, 실행 전 버전·바뀔 항목 표시, 운영 정책 불변을 코드와 시험으로 확인한 동작만 적었습니다. 이 커밋 뒤 재제출에서 통과했습니다(학생 보고). 코드 수정(`789b1c1`)이 통과에 필요했는지는 알 수 없습니다.

### S09_NO_PROPOSAL: 복합 의심 사건에 회수 제안이 없음

- 원인: `a06fe52`의 `detect()`는 사건에 `network: 'unusual'`과 16자리 `deviceId`가 모두 있을 때만 `propose_revocation`을 냈습니다. 두 칸은 계약(`docs/DETECT_EVENTS.md`)에 없는 추정 이름이고 계약의 사건은 `at`·`method`·`identity.sub` 세 값뿐이라, 계약 모양의 다량 조회에는 제안이 나오지 않았습니다.
- 해결(`4d859b2`, `src/detect.mjs`): `findContractBurst`를 더했습니다. 한 사용자의 `GET` 사건에 네트워크 값이 하나도 없으면 계약대로 10분 구간 120건 초과일 때 `{ action: 'propose_revocation', reasonCode: 'burst_read', subject }`를 냅니다. 네트워크 값이 있는 사건은 원래 복합 규칙만 따르고, 입력 읽기와 `decide()`는 바꾸지 않았습니다.
- 재현(수정 전 → 후): 계약 모양 121건이 `{"action":"observe"}` → `burst_read` 제안. `detect:test` 연습 6줄 중 통과가 4줄 → 6줄.
- 시험: `test/detect-input.test.mjs`에 계약 모양 시험과 연습 6줄 시험을 더해 전체 86개 통과.
- 한계: 계약 모양 사건의 제안 대상은 기기가 아니라 사용자입니다. 재제출 묶음의 설명(`bundle-notes.json`)은 이 수정 전 내용이었습니다.

### S08_OTHER_ZONE_ALLOWED: 판정기가 다른 구역이나 메모 전체 목록을 엶

- 원인: `686a4bb`의 `src/decider.mjs` 구역 표에 `['own_notes_zone', 'GET', '/notes']`가 있어 등록 기기의 메모 목록 요청(`GET /notes`, `GET /api/notes`)이 `allow`였습니다. 공지·강사 자료 쓰기는 처음부터 `deny`였습니다.
- 해결(`f3010d7`, `src/decider.mjs`): 구역 표에서 목록 줄 하나를 뺐습니다. 목록은 어느 규칙에도 맞지 않아 `starter.deny`로 거부되고, 메모 한 건(`GET`·`PUT /notes/:id`)은 그대로 허용입니다. 학생 화면의 목록은 판정기를 거치지 않고 자료 API가 주인 기준으로 거릅니다.
- 재현(수정 전 → 후): 메모 목록 `GET /notes`·`GET /api/notes`가 `allow` → `deny`. 메모 한 건 `GET`은 `allow`, 공지 수정 `PUT /notices/:id`는 `deny`로 전후가 같습니다.
- 시험: `test/decider-zones.test.mjs`의 목록 기대를 거부로 바꾸고 목록·공지 쓰기 거부 시험을 더해 66개 통과(당시).
- 한계: `:id` 자리의 목록처럼 보이는 값(`/notes/all`)과 요청의 `service` 항목은 판정기가 가리지 않습니다(8단계 약점).

### S07_SAME_VERDICT: 정상 접속과 복합 이상 접속의 판정이 같음

- 원인: 판정기는 추가 확인(`step_up`)을 낼 때 `process.stderr.write`로 기록 줄을 남겼습니다. 판정기 파일 하나를 `process`가 없는 격리 환경에서 부르면 이 줄에서 `process is not defined` 오류가 나서 복합 이상 요청은 판정을 돌려주지 못하고, 이 줄을 지나지 않는 정상 요청만 `allow`를 돌려줍니다.
- 2차 제출(`59b4eab`)은 기준 값만 넓혔습니다(심야 0~5시 → 22시~5시, 10분 안 10건 → 15분 안 5건). 기록 줄은 그대로라 같은 결과가 나왔습니다.
- 해결(`10d569d`, `src/decider.mjs`): 기록 줄을 `try { globalThis.process?.stderr?.write?.(…) } catch {}`로 바꿔, 기록을 쓸 수 없어도 판정은 그대로 돌려주게 했습니다.
- 재현(정상 / 복합 이상): 일반 환경에서는 세 커밋 모두 `allow / step_up`이라 로컬 연습(`fixture:7`과 같은 요청)으로는 문제가 보이지 않았습니다. 격리 환경에서는 `467bb7c`(1차와 같은 판정기)와 `59b4eab`가 `allow / 오류`, `10d569d`가 `allow / step_up`입니다.
- 한계: 1차 코드도 같은 오류를 냈으므로 기준 값을 넓힌 것이 통과에 필요했는지는 알 수 없습니다(넓힌 기준은 그대로 둠). 심판이 오류를 어떻게 처리하는지는 볼 수 없습니다.

### S05_ORIGINAL_URL_MISSING: 원본 API 주소를 찾지 못함

- 원인: `e78d6db`(5단계 저장점)는 `originalApiUrl`을 `aleph.config.json`에만 적었고, 빌드가 만드는 배포본 `/aleph.json`(`scripts/deployment-identity.mjs`)에는 싣지 않았습니다. 심판이 배포본에서 주소를 찾지 못한 것으로 보입니다.
- 해결(`edb4aa4`, `scripts/deployment-identity.mjs`): `originalApiUrlOf`를 더해 5단계 이상에서 `/aleph.json`에 `originalApiUrl`을 싣고, 쿼리·해시·계정 정보가 없는 `https` 경로가 아니면 빌드를 실패시킵니다.
- 재현(수정 전 → 후): 같은 5단계 설정으로 만든 `/aleph.json`에 `originalApiUrl`이 없음 → 있음.
- 확인: 배포본 `/aleph.json`에 값이 실린 것은 8단계 저장점 대조에서 읽기 요청으로 확인했습니다. 통과한 재제출 커밋은 `e59b9b6`(2026-10-07)입니다(학생이 알려 줌). `e59b9b6`은 화면의 공개 키를 `/api/config`로 옮기고 `/aleph.json`에 `allowedRoutes`를 더한 커밋이며, 코드를 비교하면 `edb4aa4`의 `originalApiUrl` 부분을 그대로 갖고 있어 이 수정이 들어 있습니다. `edb4aa4`(10-06) 자체를 제출했는지는 기록이 없습니다.

### 심판 결과가 아닌 실패와 해결

| 실패 | 원인 | 해결 | 확인 |
| --- | --- | --- | --- |
| 3단계 배포 빌드 실패 | `5e0d024`에서 `step`을 3으로 올렸지만 `scripts/deployment-identity.mjs`가 `[1, 2]`만 받음 | `8d0d898`: `[1, 2, 3]`으로 고침. 그 뒤 저장점마다 같은 줄에 새 단계를 더함 | 재현: `5e0d024`는 빌드 식별 실패, `8d0d898`은 성공 |
| `npm run test:package` 실패 | 시험은 `api/` 바로 아래 함수가 `ai.js`·`threat-intel.js`뿐이어야 하는데, 2단계 `ff3d095`부터 `notes.js`, 그 뒤 `_notes.js`·`config.js`가 있었음 | `75dfd56`: `api/config.js` → `api/config/index.js`(주소 `/api/config` 그대로), `api/_notes.js` → `src/notes-api.mjs`, 불러오는 경로만 수정 | 커밋별 `api/` 목록으로 확인. 7단계 기록: 전체 43개 통과(`test:package` 포함), 배포 뒤 주소·로그인 동작 확인 |
| 8단계 구현 커밋 푸시 거부(`GH007`) | 커밋 이메일이 비공개 주소 | `0cfbb22` 하나만 noreply 주소로 고쳐 푸시 | 8단계 기록 |
| 8단계 첫 묶음의 설명이 7단계 내용 | `bundle-notes.json`을 갱신하지 않음 | 설명을 8단계로 바꿔 묶음을 다시 만듦 | 8단계 기록 |

실패를 고친 것이 아닌 커밋: `67ff4fd`·`35bae81`(2단계 저장점에서 자리표시자 주소를 실제 저장소·배포 주소로 바꿈), `1fbf583`(모든 응답에 `nosniff` 헤더 추가), `e59b9b6`(화면의 공개용 키를 `/api/config`로 옮기고 `/aleph.json`에 `allowedRoutes` 추가).

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
| 3 | 설치한 앱 창에서 「앱: 설치한 앱 창에서 열림」, 「기기 승인: 서버 확인 전」 | 설치만으로 자료가 열리면 안 됨 | 주소창의 설치 아이콘 | 설치는 미실행(학생의 화면은 「앱: 브라우저 탭에서 열림」이었음). 탭에서 로그인·기기 확인 뒤 「기기 승인: 서버가 승인된 기기로 확인함」으로 바뀌는 것은 학생 화면으로 확인. 설치한 앱 창에서 「설치한 앱 창에서 열림」이 나오는지는 미실행 |
| 4 | 한 번 온라인으로 연 뒤 오프라인에서 새로고침하면 오프라인 안내만 보임 | 오프라인에서 메모가 보이면 안 됨 | 개발자 도구 Network > Offline | 학생이 개발자 도구 Network의 Offline으로 확인(방법 1): 오프라인 안내 상자가 켜짐(학생 보고). 코딩 도구가 배포본에 새 Chrome 프로필(Chrome 155, 로그인 없음)로 확인: 서비스 워커 활성화, 저장된 것은 `/offline.html` 한 장뿐, 서비스 워커까지 오프라인일 때 새로고침하면 「지금은 오프라인입니다」 안내만 나옴. Network의 Offline만으로는 서비스 워커의 요청이 막히지 않아 첫 화면이 그대로 나올 수 있음(Application > Service workers의 Offline으로 확인). 학생이 이 안내 페이지를 직접 본 것은 미확인 |
| 5 | A로 로그인하면 승인 화면만 보이고 메모 없음 → 「이 기기 승인 요청」 → 「승인 대기」 | 대기 상태에서 메모가 보이거나 `/api/notes`가 열리면 안 됨(403) | 브라우저 | 학생이 실행, 화면 사진 확인: 승인 요청 뒤 「내 맥북 · 승인 대기」(기기 번호 `d64f36a8`)와 승인 요청 완료 메시지가 보임. 대기 상태에서 메모가 안 보인 것과 `/api/notes`의 403 응답은 사진으로 확인하지 못함 |
| 6 | SQL Editor에서 승인 → 「승인된 이 기기로 확인」 → 기존 자료실의 추가·수정·삭제 정상 | | 브라우저, SQL Editor | 학생이 실행(학생 보고와 화면 사진 확인): 승인한 뒤 「서버가 이 기기의 서명을 확인했습니다.」가 나왔고, 자료실이 열려 메모 삭제(「삭제했습니다.」)가 됨. 추가·수정은 사진으로 확인하지 못함 |
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
| 설치한 앱 창, 승인하지 않은 다른 브라우저의 같은 계정 A, 로그인한 토큰으로 메모 API를 직접 호출한 403(`device_not_verified`) | 미실행 | 설치는 선택 확인이고, 나머지는 시험(`test/device-approval.test.mjs`)으로만 확인 |
| `npm run bundle` 재실행, 심판 제출 | 미실행 | 이 기록을 커밋한 뒤 다시 실행해야 함 |

### 11단계의 남은 약점 (해소되지 않음)

- **심판 토큰을 기기 검사에서 뺀 것은 추정에 근거합니다.** 심판이 패스키 흐름을 거칠 수 없다고 보았습니다. 심판이 심판 토큰으로 "승인 전에는 자료가 없음"을 시험한다면 이 점에서 실패할 수 있습니다. 11단계 기기 승인용 운영 계약은 이 저장소와 공식 시작 틀에 없습니다.
- 동기화되는 패스키(iCloud 키체인·Google 비밀번호 관리자 등)는 같은 계정의 다른 기기로 복사됩니다. 서버는 `synced`로 표시만 하고 막지 않으므로, 관리하는 기기만 허용하려면 `synced`가 `false`인 기기만 승인해야 합니다.
- 기기 확인은 로그인 세션(`session_id`)에 1시간 묶입니다. 그 사이 그 탭의 토큰을 빼낸 공격자는 같은 세션으로 자료를 읽을 수 있습니다. 로그아웃해도 이미 발급된 액세스 토큰은 만료(최대 1시간)까지 서버 검증을 통과합니다(Supabase 공개키로 로컬 검증).
- 승인은 SQL Editor에서 사람이 합니다. 기기 이름·기기 번호·요청 시각으로 본인 기기인지 판단해야 하며, 승인 기록은 `approved_at` 한 칸뿐입니다(별도 감사 이력 없음).
- 패스키는 고정 배포 주소(`publicAppUrl`)에만 묶입니다. 배포마다 바뀌는 주소나 로컬 화면에서는 기기 승인을 할 수 없습니다.
- 새로고침하면 다시 로그인하고 기기를 확인해야 합니다(토큰을 브라우저 저장소에 두지 않는 대가). 오프라인에서는 자료를 볼 수 없습니다.
- 요청 횟수 제한이 없어 승인 요청을 많이 보내 대기 행을 쌓을 수 있습니다.
- 자기 점검(`npm run bundle`)은 로그인하지 않으므로 승인 전 403과 승인 뒤 정상 화면은 미실행으로 남습니다. 자기 점검은 20개까지라 로그인 없는 메모 쓰기 3개(`anonymous_write`)와 복원 요청 2개(`restore_without_login`)를 각각 한 항목으로 묶었습니다(요청은 전과 같이 모두 보냄).
- 이전 단계의 약점은 그대로입니다(10·9·8단계 약점 목록 참고).

## 10단계 기록 (11단계에서 일부 바뀜): 백업에서 자료실을 되살립니다

(11단계부터 복원 API `POST /api/restore/note`도 승인된 기기로 확인된 학생 로그인 세션에서만 자료를 다룹니다. 아래의 자기 점검 항목 `anonymous_restore`·`fake_token_restore`는 11단계에서 `restore_without_login` 하나로 묶였습니다.)

침해 전에 검증한 정책·메모 사본에서 대상만 복원합니다. 저장점에서 `aleph.config.json`의 `step`을 10으로 올렸고 `scripts/deployment-identity.mjs`와 `src/attack-check.mjs`가 10단계를 받도록 고쳤습니다. 빌드가 만드는 배포본 `/aleph.json`에는 10단계부터 `restoreRoute`도 실립니다(5단계에서 `originalApiUrl`이 설정에만 있어 `S05_ORIGINAL_URL_MISSING`을 받은 일을 되풀이하지 않기 위함이며, `POST /api/…` 모양이 아니면 빌드가 실패합니다). 자기 점검(`src/attack-check.mjs`)에는 복원 경로에 토큰 없는 요청(`anonymous_restore`)과 가짜 토큰 요청(`fake_token_restore`)만 실제로 보내고, 다른 로그인 계정의 복원 요청(`restore_other_user`)은 미실행으로 남겼습니다. `test/step9-savepoint.test.mjs`는 `test/step10-savepoint.test.mjs`로 바꿨습니다. 판정기 규칙은 더하지 않아 `RULE_IDS` 5개는 그대로이고 모두 구현에 쓰입니다. 아래 결과는 직접 돌린 연습이며 심판 판정이 아닙니다.

### 복원 전에 사본을 검증합니다

정책 되돌리기(src/policy-restore.mjs)와 메모 한 건 복원(POST /api/restore/note)은 아래 순서를 지킵니다. 각 동작은 시험(test/policy-restore.test.mjs, test/note-restore.test.mjs)으로 확인했고, 직접 돌린 연습이며 심판 판정이 아닙니다.

1. 복원할 때마다 사본을 다시 검증합니다. 정책 사본(backup/policy.v1.json)은 미리보기와 실제 실행에서 매번 파일을 새로 읽어 검증합니다. 메모 사본(backup/note.v1.json)은 복원 함수와 함께 배포되며, 복원 요청마다 다시 검증합니다.
2. 검증은 사본의 형식과 버전 표기를 확인하고, SHA-256 해시를 다시 계산해 사본에 적힌 해시와 대조하는 것입니다.
3. 사본이 없거나 검증에 실패하면 복원하지 않고 멈춥니다. 이때는 아무것도 쓰지 않고, 검증 실패를 성공으로 적지 않습니다. 정책 명령은 「중단: …」을 출력하고 종료 코드 1로 끝납니다. 메모 복원은 사본이 변조되었으면 503 BACKUP_INVALID를 돌려주고, 사본 파일이 없으면 복원 함수를 불러오지 못해 복원하지 않습니다(로컬에서 확인).
4. 실행 전에 복원할 버전과 바뀔 항목을 보여 줍니다. 정책 미리보기(node src/policy-restore.mjs)는 복원할 버전, 사본 해시 앞 12자리, 실행하면 바뀌는 항목과 바뀌지 않는 항목을 출력합니다. 실제 변경에는 --apply와 사본 해시 앞 12자리 확인값이 함께 필요하고, 확인값이 다르면 멈춥니다. 메모는 dryRun 요청이 복원할 ID·버전과 할 일(insert·update·none)을 돌려주고 쓰지 않습니다.
5. 정책은 실제로 쓰기 직전에 사본 파일을 한 번 더 읽어 다시 검증합니다. 다시 읽은 사본이 없거나, 검증에 실패하거나, 미리보기 때와 버전·해시가 다르면 쓰지 않고 멈춥니다.
6. 쓴 뒤에는 결과를 다시 읽어 사본과 대조합니다. 정책은 allowedRoutes가 사본과 같고 나머지 키가 그대로인지 확인합니다. 메모는 그 한 건의 ID·소유자·내용 해시가 사본과 같은지 확인하고, 다르면 502 RESTORE_VERIFY_FAILED로 실패를 알립니다.
7. 실제 운영 정책은 건드리지 않습니다. Vercel·Supabase 설정(환경변수, DB 권한)과 배포본, 다른 서비스 규칙은 읽지도 쓰지도 않습니다. 바꾸는 것은 저장소의 시험 정책(aleph.config.json의 allowedRoutes)과 복원 대상 메모 한 건뿐입니다. 감사 기록과 서버 로그는 지우거나 고치지 않습니다.

사본은 침해 전에 만들고 확인한 것입니다. 정책 사본(버전 9단계-통과-시점, 해시 앞 12자리 23c296e3423a)은 9단계 통과 커밋 4d859b2의 규칙 이름 5개·허용 경로 5개와 같습니다(2026-10-14 코딩 도구가 git으로 대조). 메모 사본은 가상 침해 전에 dryRun 결과가 none, 즉 DB의 행과 사본의 해시가 같았습니다(학생 보고). 두 사본은 만든 커밋(정책 3cc7a2f, 메모 4389517) 이후 바뀌지 않았습니다(git diff로 확인).

### 만든 것

| 기능 | 파일 | 실행 | 하는 일 |
| --- | --- | --- | --- |
| 정책 차이 보기 | `src/policy-diff.mjs`, `backup/policy.v1.json` | `node src/policy-diff.mjs` | 사본(규칙 이름 5개·허용 경로 5개와 SHA-256)을 검증한 뒤 현재와 다른 항목만 보여 줍니다. 읽기 전용이며 첫 두 줄에 복원할 버전과 변경 범위가 나옵니다. 사본이 없거나 검증에 실패하면 종료 코드 1로 중단합니다. |
| 정책 되돌리기 | `src/policy-restore.mjs` | `node src/policy-restore.mjs`(미리보기) | `aleph.config.json`의 `allowedRoutes`만 사본으로 되돌립니다. 기본은 미리보기이고 실제 변경은 `--apply --confirm=<사본 해시 앞 12자리>`를 함께 줘야 합니다. 쓰기 직전에 사본 파일을 다시 읽어 검증하고, 미리보기 때와 버전·해시가 다르면 쓰지 않고 멈춥니다. 쓴 뒤 다시 읽어 다른 키가 그대로인지 확인합니다. |
| 메모 한 건 복원 | `api/restore/note.js`, `src/note-restore.mjs`, `backup/note.v1.json`, `scripts/note-backup.mjs` | `POST /api/restore/note` | 사본에서 지정한 한 건만 복원합니다. 아래에서 설명합니다. |

- 서비스·경로: 기존 메모 API와 같은 Vercel 서버 함수 서비스, `POST /api/restore/note`. 요청 본문은 `{id, title, body}`(복원 전 확인은 `dryRun: true` 추가)이고 `Authorization: Bearer`(로그인 토큰)가 필요합니다. 자원 ID는 `notes.own`. `aleph.config.json`의 `restoreRoute`(전에는 `null`)에 이 경로를 적었고, `allowedRoutes`에는 넣지 않았습니다(`:id` 경로와 같은 깊이에 기능 경로를 두지 않으려는 8단계 방침, 그리고 정책 사본과 어긋나지 않게 하려는 선택입니다).
- 사본 `backup/note.v1.json`: 메모 ID, 소유자 사용자 ID의 SHA-256, 제목·본문의 SHA-256만 있습니다(지금은 시험 계정 B의 가상 메모 1건). 제목·본문·사용자 ID 원문은 없고, 사본 전체의 해시로 변조를 검사합니다. 본문 원본은 Git에 올라가지 않는 `backup/private/`에만 두며 `node scripts/note-backup.mjs <메모ID> <소유자ID> backup/private/<파일>.json`으로 해시만 사본에 적습니다.
- 복원 순서: 요청 모양 검사(모르는 키·`owner_id`·여러 건은 거부) → 사본 검증(틀리면 503으로 중단) → 사본에 ID가 있고 로그인한 사용자의 해시가 소유자 해시와 같은지 → 요청의 제목·본문 해시가 사본과 같은지 → DB의 같은 ID 행을 읽어 남의 행이면 거부 → 없으면 추가(`insert`), 다르면 그 한 건만 수정(`update`), 같으면 쓰지 않음(`none`) → 쓴 뒤 다시 읽어 ID·소유자·내용 해시가 사본과 같으면 `verified: true`.
- 보존: 다른 메모는 삭제·수정하지 않고(삭제 호출이 없음), 복원 성공 때는 감사·서버 로그에 쓰지 않으며(거부 때만 아래의 한 줄), 다른 서비스 규칙과 운영 설정은 읽지도 쓰지도 않습니다. 새 서버 전용 키나 환경변수는 필요 없습니다.
- 거부: 사본에 없는 ID와 소유자가 아닌 계정은 같은 `404 NOT_FOUND`, 내용 해시가 다르면 `422`, 본문의 `owner_id`는 `403`, 같은 ID의 행이 남의 것이면 덮어쓰지 않고 `404`, 로그인이 없으면 `401`, `POST`가 아니면 `405`. 거부 사유는 응답이 아니라 서버 로그 한 줄(`notes_denied reason=…`)로만 남습니다.

### 다시 실행하는 순서 (복구 뒤 1~9단계의 정상·금지 요청)

복구(정책 되돌리기, 메모 복원)를 한 뒤 위에서부터 차례로 실행합니다. 저장소 루트에서 실행하는 명령은 가상 요청 연습이며 심판 판정이 아닙니다. `상태` 칸은 이 README를 쓰는 시점에 실제로 실행한 결과만 적었고, 실행하지 않은 것은 미실행입니다. 자기 점검은 `npm run bundle`(학생 실행, 커밋 789b1c1의 묶음)이 배포 주소로 보낸 로그인 없는 요청이고, 읽기 요청은 2026-10-14 코딩 도구가 배포본(커밋 789b1c1)에 보낸 로그인 없는 요청입니다.

| 순서 | 단계 | 정상 요청 | 거부되어야 할 요청 | 방법 | 상태 |
| --- | --- | --- | --- | --- | --- |
| 0 | 10 | `node src/policy-diff.mjs`가 `차이 없음` | 사본을 지우거나 고치면 중단(종료 코드 1) | 저장소 루트 | 메모 복원 시험 뒤와 2026-10-14에 코딩 도구가 실행: `차이 없음` |
| 1 | 1 | 배포 주소 `/`가 열림 | 공개 `/data.json`이 열리면 안 됨 → 404 | 브라우저·`curl -i <배포주소>/data.json` | `/data.json` 404·메모 내용 없음(자기 점검과 읽기 요청), `/` 200(읽기 요청) |
| 2 | 2 | 화면 메모는 로그인 뒤에만 보임 | GitHub 최신 파일과 배포 `/` 원본에 가상 메모 문장이 없어야 함 | 위 「2단계 확인 절차」의 검색식 | 미실행 |
| 3 | 3 | A로 로그인해 메모 추가·수정·삭제 | 로그인 없는 `/api/notes`와 가짜 토큰은 401 | 시크릿 창, `curl -i <배포주소>/api/notes` | 로그인 없는 `GET`·`POST /api/notes`, `GET`·`PUT`·`DELETE /api/notes/:id`와 가짜 토큰 `GET /api/notes`가 모두 401·메모 내용 없음(자기 점검). A로 로그인한 추가·수정·삭제는 미실행 |
| 4 | 4 | A가 자기 메모를 읽기·추가·수정·삭제 | A가 B의 메모 ID로 읽기·수정·삭제하면 404, 남의 `owner_id`를 본문에 보내면 403 | A·B 시크릿 창 | A의 B 메모 읽기 404는 실행함(아래). 나머지는 미실행 |
| 5 | 5 | `/aleph.json`에 `originalApiUrl`이 있음 | anon 키로 원본 API를 직접 읽으면 거부(401) | `npm run bundle`의 자기 점검(배포 주소로 실제 요청을 보내므로 학생이 실행) | anon 키 직접 읽기 401·메모 내용 없음(자기 점검), 배포본 `/aleph.json`에 `originalApiUrl` 있음(읽기 요청) |
| 6 | 6 | 등록 기기의 `GET`은 허용 | 미등록 기기는 `deny`(`device_not_registered`) | `npm run decider:test` | 메모 복원 시험 뒤 네 줄 모두 `통과`(코딩 도구가 실제 실행, 학생 보고도 같음) |
| 7 | 7 | 정상 접속은 `allow` | 복합 이상 접속은 `step_up` | `npm run fixture:7`, `npm run decider:test` | `decider:test` 위와 같음. `fixture:7`은 정상 사건 `allow`, 복합 이상 사건 `step_up`(코딩 도구가 실제 실행) |
| 8 | 8 | 내 메모 한 건 `GET`·`PUT`은 허용 | 메모 목록·공지 쓰기는 `deny`, 로그인 없는 `/api/notes`는 401과 `X-Resource-Id: notes.own`, B의 A 자료 요청은 404 | `node --test "test/*.test.mjs"`, `curl -i <배포주소>/api/notes`, A·B 시크릿 창 | `node --test` 108개 모두 통과(789b1c1, 코딩 도구가 실제 실행. 그 전의 107개는 학생 보고도 같음). 로그인 없는 `/api/notes`는 401과 `X-Resource-Id: notes.own`(자기 점검과 읽기 요청). 아래 「복원 시험」에서 A→B 요청 404만 실행했고 B→A 요청은 미실행 |
| 9 | 9 | 정상 사건은 제안 없음 | 복합 의심 사건과 120건 초과 조회는 `propose_revocation` | `npm run detect:test`(6줄 모두 `통과`) | 6줄 모두 `통과`(코딩 도구가 실제 실행, 학생 보고도 같음) |

복구가 제대로 됐다면 위 순서 끝에서 확인할 것: 정책 사본과 현재가 같고(`node src/policy-diff.mjs`), 되살린 메모는 소유자 본인에게만 보이며, 전에 거부되던 요청(공개 `/data.json`, 로그인 없는 요청, 남의 메모, 미등록 기기, 이상 접속)이 다시 거부됩니다. 이 순서 중 실행한 것은 위 표의 상태 칸에 적었고, 나머지는 미실행입니다.

### 10단계 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| `node --test "test/*.test.mjs"` | 코딩 도구가 실제 실행 | 정책 차이 5개·정책 되돌리기 5개·메모 복원 11개를 더해 107개 통과(푸시 전). 가짜 DB로 추가·수정·무변경·`dryRun`과 거부 사례(다른 계정, 사본에 없는 ID, 해시 불일치, 남의 행, `owner_id`, 모양 오류, 변조된 사본)를 확인했고 삭제 호출이 불리면 실패하도록 했습니다 |
| 정책 차이 보기: 사본 삭제·변조 | 코딩 도구가 실제 실행 | 각각 `사본이 없습니다`, `사본 해시가 내용과 다릅니다`로 종료 코드 1. 사본은 원래대로 되돌림 |
| 정책 되돌리기: 가상 침해(경로 하나 삭제·하나 추가)를 임시로 만들어 복원 | 코딩 도구가 실제 실행 | 미리보기에 바뀔 항목 2건, 틀린 확인값은 거부, 올바른 확인값으로 복원하면 `aleph.config.json`이 원래 파일과 같아짐. 처음에 확인값 오타로 한 번 거부된 뒤 다시 실행했습니다 |
| 정책 되돌리기의 쓰기 직전 재검증(커밋 789b1c1) | 코딩 도구가 실제 실행 | 다시 읽은 사본이 없거나, 변조되었거나, 미리보기 때와 버전이 다르면 `aleph.config.json`을 쓰지 않고 멈춤(시험 1개 추가, 전체 108개 통과). `node src/policy-diff.mjs`는 `차이 없음` |
| 푸시 `52f12a9`·`4389517`, 배포본 `/aleph.json`의 커밋 | 코딩 도구가 푸시하고 읽기 요청으로 확인 | 배포본 커밋이 `52f12a9`(새 경로가 `GET`에 405와 `X-Resource-Id: notes.own`), 이어 `4389517`로 반영됨 |
| 시험 계정 B의 가상 메모 1건 복원 시험 | 학생이 B 화면 콘솔에서 실행, 결과는 학생 보고(코딩 도구는 응답을 직접 보지 못함) | 사본과 같을 때 `dryRun`은 `none`. 본문을 수정한 뒤 `dryRun`은 `update`, 복원 실행은 `verified: true`이고 새로고침한 화면의 본문이 돌아왔으며 한 번 더 실행하면 `none`. 메모를 삭제한 뒤 `dryRun`은 `insert`, 복원은 `201`과 `verified: true`이고 새로고침한 화면에 메모가 돌아옴 |
| 계정 A의 시크릿 창에서 B의 메모 복원 요청·읽기 요청, A의 목록 요청 | 학생이 실행, 코딩 도구가 콘솔 화면 사진 확인 | 복원 요청 `404 NOT_FOUND`, B의 메모 읽기 `404 NOT_FOUND`, A의 목록 `200`(메모 1건, B의 메모 포함 `false`). 두 404는 서버가 거부한 정상 결과이고 브라우저가 빨간 오류로 표시했을 뿐입니다 |
| 위 A 요청 뒤 B 화면의 메모가 그대로인지 | 학생 보고(코딩 도구는 화면을 보지 못함) | 그대로임 |
| Vercel Logs의 `notes_denied reason=not_owner`(복원 경로) | 학생 보고(코딩 도구는 로그 화면을 보지 못함) | 해당 줄이 있음 |
| 정책 되돌리기의 배포본 반영 | 미실행 | 되돌린 설정을 푸시·배포해 `/aleph.json`에서 확인하지 않았음 |
| 1~9단계 정상·금지 요청 재실행 | 일부 실행 | 시험 명령 4개(`node --test`, `decider:test`, `detect:test`, `fixture:7`), `npm run bundle`의 자기 점검, 코딩 도구의 읽기 요청을 실행했습니다. 로그인 화면과 A·B 계정으로 보내는 요청은 미실행입니다. 위 표의 상태 칸을 보세요 |
| 저장점 설정 대조 | 코딩 도구가 실제 실행 | `step` 10. `repoUrl`·`allowedRoutes`·`originalApiUrl`·`judgeIssuer`·`identityProvider`는 9단계와 같고 바꾸지 않았으며 `restoreRoute`는 `POST /api/restore/note`입니다. 빌드 식별(가짜 Vercel 환경값)이 `step` 10과 `restoreRoute`를 싣고 `step` 11, `restoreRoute`가 없거나 `GET`·주소 전체·쿼리가 든 값은 거부. 자기 점검(가짜 `fetch`)은 20항목으로 형식·중복·길이 통과이며 실제 배포 주소에는 요청을 보내지 않음. 전체 시험 107개 통과 |
| `npm run bundle` (커밋 789b1c1) | 학생이 실행, 코딩 도구가 묶음 확인 | 단계 10, 바뀐 파일 2개, 규칙 5개, 직접 점검 20개. 실제 요청 12개는 모두 401·404 또는 `X-Resource-Id: notes.own`이고 메모 내용 없음, 미실행 5개, 확인 불가 3개. 처음에는 `bundle-notes.json`이 없어 실패했고, 다시 만든 뒤 성공했습니다. 묶음과 설명 파일은 커밋하지 않습니다 |
| 심판의 10단계 제출 | 학생 보고 | 두 번 제출해 두 번 모두 `S10_BACKUP_UNVERIFIED`로 거부(두 번째는 커밋 789b1c1, 첫 번째 커밋은 기록 없음). 그 뒤 「복원 전에 사본을 검증합니다」를 이 절에 적은 커밋 `50596ac` 이후의 재제출은 통과(학생 보고) |

### 10단계의 남은 약점 (해소되지 않음)

- 사본의 신뢰는 Git 이력에 달려 있습니다. 사본 검증은 사본 파일에 적힌 해시와 대조하는 방식이라, 사본 파일과 그 안의 해시를 함께 바꾸면 통과합니다. 그래서 사본을 만든 커밋(정책 `3cc7a2f`, 메모 `4389517`)과 지금 사본이 같은지 git으로 따로 대조해야 합니다(`git diff 3cc7a2f HEAD -- backup/policy.v1.json`, `git diff 4389517 HEAD -- backup/note.v1.json`의 출력이 없으면 같음. 2026-10-14 코딩 도구가 실행해 같음을 확인). 외부에 따로 서명·보관한 사본은 아닙니다.
- 정책 되돌리기는 `allowedRoutes`만 고칩니다. 판정기 규칙(`RULE_IDS`)은 코드라 이름 목록으로 되돌릴 수 없고 차이만 알립니다(종료 코드 2). 되돌린 설정이 배포본에 반영되려면 푸시·배포가 필요합니다.
- 본문 원본은 학생의 로컬 `backup/private/` 파일뿐입니다. Git에 없으므로 분실하면 그 메모는 복원할 수 없습니다. 복원 요청은 본문을 요청으로 받아 해시를 대조하며, 본문은 서버 로그에 쓰지 않지만 Vercel 요청 기록의 보존 범위는 확인하지 못했습니다.
- 소유자 해시는 사용자 ID의 SHA-256입니다. 공개 저장소에 올라가 있어, 후보 UUID를 아는 사람이 대조할 수는 있습니다. 복원 권한은 이 해시가 아니라 로그인 토큰의 사용자 ID로 판단합니다.
- 감사 이력을 따로 기록하는 곳이 이 저장소에 없습니다. 거부는 서버 로그 한 줄로 남지만 복원 성공은 로그 줄을 남기지 않습니다. 복원이 일어났다는 기록은 응답과 DB 행뿐입니다. 복원한 행은 같은 `note_id`로 새로 만들어지므로 DB 내부의 순번 `id`는 이전과 다를 수 있습니다.
- `restoreRoute`와 `allowedRoutes`를 심판이 어떻게 보는지는 알 수 없습니다. `restoreRoute`가 허용 경로 목록에 없다는 이유로 거부될 수도 있습니다.
- 사본은 메모 1건뿐이고 한 번에 한 건만 복원합니다. 여러 건을 한꺼번에 복원하는 기능은 없습니다.
- 이전 단계의 약점은 그대로입니다(9단계·8단계 약점 목록 참고).

## 9단계 현재 상태: 도플갱어를 찾고 권한을 거둡니다

가상 사건에서 복합 이상 패턴을 찾으면, 허용·거부 응답과는 별개인 탐지 결과로 `propose_revocation`(회수 제안)을 냅니다. 실제 회수와 걸린 시간은 심판이 가상 사건을 보내 확인하며, 이 결과는 직접 돌린 연습이고 심판 판정이 아닙니다.

- 입력 정리(`src/detect.mjs`의 `readDetectEvent`·`readDetectEvents`): 가상 사건에서 시각(`at`)·요청 종류(`method`)·가명 사용자(`identity.sub`)·기기(`deviceId`)·판정(`decision`)·네트워크(`network`)만 읽습니다. 그 밖의 이름(본문·토큰·이름 등)과 상속된 값은 복사하지 않고, 필수 값(시각·메서드·사용자)이 틀리면 사건을 버립니다. 사용자는 영문·숫자·`_`·`-` 64자 이하만 받아 한글 이름이나 공백이 든 값은 버립니다. 기기(16자리 소문자 16진수)·판정(`allow`·`deny`·`step_up`)·네트워크(`usual`·`unusual`)가 틀리면 `null`로 낮추고 사건은 유지합니다. 사건은 10,000건까지만 읽습니다.
- 복합 의심 규칙(`findCompoundSuspects`): 네트워크 값이 있는 사건에서는 같은 사용자의 `GET`이 10분 구간에서 120건을 넘고, 그 구간에 `network`가 `unusual`인 사건이 함께 있을 때만 의심입니다(이유 코드 `unusual_network_burst`). 평소 네트워크(`usual`)의 다량 조회, 네트워크만 낯선 사건, 120건 이하는 의심이 아닙니다. 지역은 읽지 않습니다.
- 계약 모양 사건(`findContractBurst`): 한 사용자의 `GET` 사건에 네트워크 값이 하나도 없으면 `docs/DETECT_EVENTS.md`대로 10분 구간 120건 초과만으로 `{ action: 'propose_revocation', reasonCode: 'burst_read', subject }`를 냅니다(정확히 120건은 `observe`). 이 경우 계약에 기기 칸이 없어 대상은 사용자 한 명이고 기기를 지어내지 않습니다. 심판의 `S09_NO_PROPOSAL`(복합 의심 사건에 회수 제안이 없음)을 받고 추가했고, 이 수정의 재제출에서 9단계를 통과했습니다(학생 보고). 원인 추정은 아래 확인 기록을 보세요.
- 회수 제안(`detect`): 의심 구간의 `unusual` 사건이 모두 유효한 같은 기기 한 개에서 왔을 때만 `{ action: 'propose_revocation', reasonCode, subject, deviceId, suspicious }`를 냅니다. 기기가 둘 이상이거나 없으면 제안 없이 `{ action: 'observe', suspicious }`만 돌려주고, 정상 사건은 전처럼 `{ action: 'observe' }`입니다. 같은 사용자의 다른 기기(낯선 네트워크가 아닌 사건의 기기)는 대상이 아닙니다.
- 바뀌지 않은 것: `decide()`의 허용·거부 응답 형식과 판정기 규칙 5개, 자료실 주소와 허용 경로 5개, 브라우저 화면, DB와 권한. **회수 API를 만들지 않았고 기기 권한도 바꾸지 않았습니다.** 이 함수는 제안만 돌려줍니다.
- 저장점에서 `aleph.config.json`의 `step`을 9로 올렸고 `scripts/deployment-identity.mjs`와 `src/attack-check.mjs`가 9단계를 받도록 고쳤습니다. 자기 점검에는 `detect_compound_revocation`을 확인 불가로 더했습니다(탐지 함수는 반 엔진이 부르는 쪽이라 이 스크립트가 요청으로 시험할 수 없습니다). `test/step8-savepoint.test.mjs`는 `test/step9-savepoint.test.mjs`로 바꿨습니다.

### 9단계 확인 순서

1. 저장소 루트에서 `node --test "test/*.test.mjs"`를 실행합니다. 정상 결과는 86개 모두 통과입니다. 그냥 `node --test`는 `scripts/`의 연습 파일까지 시험으로 잡아 `detect-test.mjs` 때문에 1개가 실패합니다.
2. `npm run detect:test`: 6줄이 모두 `통과`입니다(S09 수정 전에는 "10분 안에 121건"·"폭주 조회 200건" 2줄이 `확인 필요`였습니다).
3. 복합 의심 사건만 제안, 정상 사건은 제안 없음: `test/detect-input.test.mjs`의 시험이 확인합니다. 거부되어야 할 결과(제안이 나오면 안 되는 경우)는 조회만 많은 사건, 네트워크만 낯선 사건, 120건 이하, 낯선 네트워크 기기가 둘 이상이거나 없는 경우입니다.
4. 이 명령들은 가상 사건 연습이며 심판 판정이나 엔진 실측이 아닙니다. 새 커밋마다 `npm run bundle`을 다시 실행해야 합니다.

### 9단계 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| `node --test "test/*.test.mjs"` | 코딩 도구가 실제 실행, 학생도 실행(75개 시점) | 구현 커밋 `f9173f9` 시점 85개 통과, 저장점 뒤에도 85개 통과, S09 수정 뒤 86개 통과 |
| `npm run detect:test` | 같음 | 저장점 시점: 4줄 통과, 121건·폭주 200건 2줄 `확인 필요`. S09 수정 뒤: 6줄 모두 통과 |
| `npm run decider:test`, `npm run fixture:7` | 코딩 도구가 실제 실행 | 네 줄 통과, 정상 `allow`·복합 이상 `step_up` |
| 입력 정리 직접 실행: 비밀값이 든 가상 사건과 한글 이름 사건 | 학생이 실행 | 다섯 칸만 출력되고 한글 이름 사건은 `null` |
| 보안 점검: 비밀값 키워드 검사, 파일·네트워크·`process`·로그 사용, 제외 대상 | 코딩 도구가 실제 실행 | 통과(키워드에 걸린 것은 시험용 가짜 문자열뿐, `src/detect.mjs`에 `import`·`fetch`·`process`·`console` 없음, `bundle-notes.json`·`artifacts/`는 `.gitignore`) |
| 푸시 `f9173f9`(구현 커밋) | 코딩 도구가 실행 | 푸시 완료 (Vercel 배포 성공은 확인하지 못함) |
| 푸시 `a06fe52`(저장점), `4d859b2`(S09 수정) | 코딩 도구가 실행 | 푸시 완료. `a06fe52`의 배포 완료는 학생 보고 |
| 저장점 설정 대조 | 코딩 도구가 실제 실행 | `step` 9. `repoUrl`·`allowedRoutes`·`originalApiUrl`·`judgeIssuer`·`identityProvider`는 8단계와 같고 바꾸지 않음. `RULE_IDS` 5개는 모두 구현에 쓰임(9단계는 판정기 규칙을 더하지 않음). 빌드 식별은 `step` 9를 받고 `step` 10은 거부. 자기 점검 가짜 `fetch` 시험 통과, 실제 배포 주소에는 요청을 보내지 않음 |
| 실제 회수와 경과 시간 | **확인 불가** | 심판이 가상 사건으로 확인하며 운영 반 엔진의 사건 전달·접속 회수는 이 저장소에 연결되어 있지 않습니다 |
| `npm run bundle` | 학생 쪽에서 실행(코딩 도구는 실행하지 않음) | 재제출 묶음: 로컬 `artifacts/submission.json`이 단계 9·커밋 `4d859b2`·바뀐 파일 3개·직접 점검 17개이고, 푸시(17:05) 1분 뒤인 17:06에 만들어졌습니다. 이 파일은 `npm run bundle`만 씁니다. 묶음 설명(`bundle-notes.json`)은 16:41 저장점 때 내용이라 S09 수정은 설명에 없습니다. 첫 제출(`a06fe52`)의 묶음은 덮어써져 확인할 수 없습니다 |
| 심판의 9단계 제출(`a06fe52`) | 학생 보고 | `S09_NO_PROPOSAL`: 복합 의심 사건에 `propose_revocation`이 없음 |
| S09 재현 | 코딩 도구가 실제 실행 | 원인 추정: 회수 제안이 계약에 없는 `network`·`deviceId` 칸이 모두 있을 때만 나와서, 계약 모양 사건(시각·메서드·사용자 세 값) 121건은 `observe`였습니다. `detect:test`도 같은 2줄이 실패하고 있었습니다. 심판이 보낸 사건은 볼 수 없어 이 원인은 추정입니다 |
| S09 수정 `4d859b2`의 재제출 | 학생 보고 | 9단계 통과. 첫 제출(`a06fe52`)과 재제출 사이에 바뀐 탐지 코드는 `src/detect.mjs`의 계약 모양 사건 회수 제안(`findContractBurst`) 하나였습니다 |

### 9단계의 남은 약점 (해소되지 않음)

- **사건 칸 이름은 추정입니다.** `docs/DETECT_EVENTS.md`에는 `at`·`method`·`identity.sub` 세 값뿐입니다. `deviceId`·`decision`·`network`는 7·6단계 판정기 계약의 이름을 따라 정한 선택 항목이며, 심판이 다른 이름으로 보내면 복합 규칙의 기기 지목 제안은 나오지 않습니다(그 경우 네트워크 값이 없는 사건으로 보고 계약대로 120건 초과 제안만 냅니다). 해당 문서는 고치지 않았습니다.
- 계약 모양 사건의 회수 제안은 기기가 아니라 사용자를 대상으로 하며, 심판이 "가상 기기 한 개"를 기대한다면 이 경우에는 맞지 않을 수 있습니다. 계약에 기기 칸이 없어 기기를 지어내지 않았습니다.
- S09 원인(회수 제안이 추정한 칸 이름이 모두 있을 때만 나옴)은 재현으로 추정한 것이며 확정은 아닙니다. 계약 모양 사건의 제안을 더한 `4d859b2`의 재제출에서 통과한 정황만 있고, 심판이 보낸 사건과 확인 항목은 볼 수 없습니다. 심판 사건이 달라지면 다시 실패할 수 있습니다.
- S09 원인 후보 2(입력 검사가 시각 모양·사용자 문자·사건 수 상한에서 사건을 버림)와 3(결과 칸이 심판 기대와 다름)은 근거가 없어 고치지 않았고, 통과 뒤에도 그대로 두었습니다. 같은 코드가 다시 나오면 후보 2부터 봅니다.
- 이유 코드 `unusual_network_burst`가 운영 등록부에 있는지 확인하지 못했습니다.
- 실제 경로에는 네트워크·기기 값이 없어 이 규칙은 가상 사건에서만 작동합니다(7단계의 `signals`와 같은 약점).
- 낯선 네트워크 사건의 기기가 둘 이상이면 어느 기기가 도플갱어인지 정할 수 없어 제안하지 않습니다. 이 경우 회수 제안은 나오지 않고 `suspicious`만 남습니다.
- 사용자마다 첫 의심 구간 하나만 보고하고, 여러 사용자가 의심이면 `detect()`는 기기가 있는 첫 사용자만 제안합니다(나머지는 `suspicious`에만 있음).
- 10분 구간은 경계가 고정이 아니라 사건마다 움직이는 구간이고 `[시작, 시작+10분)`으로 셉니다. 정확히 10분 간격의 두 사건은 같은 구간이 아닙니다(계약 문서의 "어느 10분 구간"을 이렇게 해석한 추측).
- 시각은 사건의 `at` 값만 믿고 순서가 뒤섞여도 정렬해 읽지만, 엔진이 사건을 어떤 시각 기준으로 만드는지는 알 수 없습니다.
- 이전 단계의 약점은 그대로입니다(8단계 약점 목록 참고).

## 8단계 현재 상태: 자료마다 갈 수 있는 구역을 나눕니다

같은 계정으로 로그인해도 내 메모와 강사 공지를 같은 권한으로 열지 않도록, 자원을 구역으로 나누고 판정기와 자료 API 두 곳에서 확인합니다. 이 결과는 직접 돌린 연습과 학생 화면 확인이며 심판 판정이 아닙니다.

- 자원 ID(`src/resources.mjs`): 내 메모 `notes.own`, 강사 공지 `notices.instructor`. 서버 함수가 자기 구역을 정해 `guard`에 넘기고, `guard`가 401·405를 포함한 모든 응답에 `X-Resource-Id`로 붙입니다. 요청의 헤더·쿼리·본문에 든 값은 쓰지 않습니다. **강사 공지는 ID만 예약했고 연결된 주소·자료·API 함수가 없습니다**(`/api/notices`는 404).
- 판정기 구역 규칙(`src/decider.mjs`의 `zoneOf`, `RULE_IDS` 5개): 엔진이 확인한 `subjectId`(공백 없는 문자열)·`deviceId`(16자리 소문자 16진수)가 있고, `queryLength`가 0이며, `method`·`route`·`path`가 아래 표와 정확히 맞을 때만 구역이 정해집니다. 표에 없는 경로·메서드는 구역이 없어 `starter.deny`가 거부합니다. 기기 규칙(6단계)이 가장 먼저입니다.

| 규칙 | 메서드·경로 | 판정 |
| --- | --- | --- |
| `own_notes_zone` | `GET·PUT /notes/:id` (`/api`가 앞에 붙은 모양도 받음) | 허용(`approved`). 7단계 추가 확인 규칙은 그대로 적용 |
| `instructor_notice_zone` | `PUT /notices/:id` (같은 두 모양) | 항상 거부(`starter_not_ready`). 강사임을 증명하는 값이 계약에 없음 |
| 그 밖 | | `starter.deny`로 거부 |

- 메모 목록 `GET /notes`(`/api/notes`)는 판정기가 열지 않습니다. 판정기가 보기에는 여러 사람의 자료를 한꺼번에 여는 경로이기 때문입니다(심판의 `S08_OTHER_ZONE_ALLOWED` 대응. 처음 제출한 `686a4bb`에서는 허용했고, 목록을 막은 `f3010d7`의 재제출에서 8단계를 통과했습니다(학생 보고)). 학생 화면의 목록은 판정기를 거치지 않으며, 자료 API가 주인 기준으로 거릅니다.
- `:id` 칸은 자료 ID 한 칸(영문·숫자·`_`·`-`, 64자 이하)만 받습니다. 같은 깊이에 `export` 같은 기능 경로를 두지 않았고, 쿼리로 기능을 고르지 않습니다. 경로가 `/notes/export`여도 `:id` 자리의 값으로만 읽히며, 자료 ID가 아니면 API가 404로 거부합니다.
- 자료 API(`src/notes-api.mjs`의 `checkNoteOwner`, `api/notes/*`): 검증된 토큰의 사용자와 DB에 저장된 `owner_id`를 읽기·수정·삭제마다 대조하고, 목록도 돌아온 행의 `owner_id`를 한 번 더 걸러 냅니다. 요청 본문·메뉴의 `role`은 읽지 않습니다. 남의 메모·주인 없는 메모·없는 메모는 전과 같은 404이고, 거부 사유는 응답이 아니라 서버 로그 한 줄(`notes_denied reason=<사유> resource=<자원ID> method=<메서드>`)로만 남깁니다. 사용자 ID·메모 ID·토큰·본문은 로그에 쓰지 않습니다. 시험을 위해 핸들러의 로그인 검사 뒤 부분을 `handleNotes`·`handleNote`로 나눴습니다.
- 바뀌지 않은 것: 자료실 주소와 허용 경로 5개, 브라우저 화면(메뉴 변경 없음), DB와 권한, 6단계 기기 규칙, 7단계 추가 확인 규칙. **바뀐 것: 6단계의 "등록 기기의 쓰기는 모두 거부"가 내 메모 `PUT`에 한해 열렸습니다.** `POST`·`DELETE`는 판정기에서 계속 거부입니다.
- 저장점에서 `aleph.config.json`의 `step`을 8로 올렸고 `scripts/deployment-identity.mjs`와 `src/attack-check.mjs`가 8단계를 받도록 고쳤습니다. 자기 점검에는 `resource_id_header`와 `instructor_notice_edit`(비로그인 요청, 실제로 보냄), `decider_zone_rules`(확인 불가)를 더했습니다.

### 8단계 확인 순서

1. 저장소 루트에서 `node --test "test/*.test.mjs"`를 실행합니다. 정상 결과는 66개 모두 통과입니다. 그냥 `node --test`는 `scripts/`의 연습 파일까지 시험으로 잡아서, 9단계 시작 틀인 `detect-test.mjs` 때문에 1개가 실패합니다.
2. `npm run decider:test`: 네 줄이 모두 `통과`입니다(이 연습은 구역 규칙을 다루지 않으며, 구역 시험은 `test/decider-zones.test.mjs`입니다).
3. 배포 뒤 로그인 없이 `curl -i https://choi-bujang-secret-vault-ten.vercel.app/api/notes`: 정상 결과는 `401`과 `X-Resource-Id: notes.own`이고 메모 내용이 없습니다.
4. 화면에서 계정 A로 로그인해 메모 추가·수정·삭제를 눌러 봅니다. 전과 똑같이 동작해야 합니다.
5. 거부되어야 할 결과: **다른 계정 B의** 시크릿 창에서, 로그인 세션 토큰을 출력하지 않는 콘솔 명령으로 A의 메모 ID에 `GET`·`PUT`·`DELETE`를 보내면 세 개 모두 `404 NOT_FOUND`이고 A의 메모는 그대로입니다. 같은 계정에서 실행하면 주인의 정상 요청이라 200이 나오고 메모가 실제로 바뀌거나 삭제되니, 버려도 되는 메모로만 하세요.
6. Vercel 대시보드의 Logs에서 `notes_denied`를 검색하면 5번 시각에 `reason=not_owner resource=notes.own method=GET`(·`PUT`·`DELETE`)가 보입니다.
7. 이 명령들은 가상 요청과 본인 계정 시험이며 심판 판정이 아닙니다. 새 커밋마다 `npm run bundle`을 다시 실행해야 합니다.

### 8단계 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| `node --test "test/*.test.mjs"` | 코딩 도구가 실제 실행 | 구현 커밋 `0cfbb22` 시점 61개, 저장점 시험 3개를 더한 뒤 64개, S08 수정 시험 2개를 더한 뒤 66개 통과 |
| `npm run decider:test`, `npm run fixture:7` | 같음 | 네 줄 통과, 정상 `allow`·복합 이상 `step_up` |
| 공격 입력 시험: 줄바꿈·`//api`·`/api/api`·`%2F`·유니코드 숫자·소문자 메서드·구역과 경로 불일치 등 13종, 5MB 경로, `null`·배열 등 요청 객체 6종, `__proto__`로 `deviceRegistered` 위조 | 코딩 도구가 가짜 입력으로 실행 | 모두 `deny`, 예외 없음, 5MB 경로도 1.1ms. 요청 객체에 `deviceRegistered`가 **상속값으로만** 있으면 `allow`가 되지만 JSON 요청에서는 생기지 않고 6단계부터 있던 동작이라 고치지 않았습니다 |
| 푸시 `0cfbb22`(구현 커밋) | 코딩 도구가 실행 | 처음에는 커밋 이메일(비공개 주소)이 GitHub 보호(GH007)에 걸려 거부되었고, 학생이 허락한 뒤 아직 푸시되지 않은 그 커밋 하나만 noreply 주소로 고쳐 푸시했습니다 |
| 배포본 `/aleph.json` | 코딩 도구가 읽기 요청 | 구현 커밋 `0cfbb22`가 반영됨(`step` 7). 저장점 커밋 `686a4bb`도 반영됨(`step` 8, 학생도 확인) |
| 배포본 비로그인 요청 | 코딩 도구가 읽기 요청 | `GET`·`POST /api/notes`, `GET·PUT·DELETE /api/notes/:id`, `/api/notes/export`는 모두 401과 `X-Resource-Id: notes.own`, `PUT /api/notes`는 405, `/data.json`·`/api/notices`·`PUT /api/notices/:id`는 404, `/api/config` 200 |
| A의 메모 읽기·추가·수정·삭제 | 학생 보고 | 정상(코딩 도구는 화면을 보지 못함) |
| B가 A의 메모를 직접 요청, 첫 시도 | 학생이 콘솔에서 실행, 코딩 도구가 결과 사진 확인 | 같은 계정에서 실행되어 `GET`·`PUT`·`DELETE`가 모두 200이었습니다. 주인 본인의 정상 요청이라 서버 동작은 맞지만 메모 1건이 수정된 뒤 삭제되었고, 이 시험은 무효로 보고 제외했습니다 |
| B가 A의 메모를 직접 요청, 재시도 | 학생이 시크릿 창 B에서 실행, 코딩 도구가 결과 사진 확인 | B 목록에 A의 메모가 없음을 먼저 확인한 뒤 `GET`·`PUT`·`DELETE`가 모두 `404 {"error":"NOT_FOUND"}`, A 화면에서 메모의 제목·본문이 그대로(학생 보고) |
| Supabase API 로그(학생이 보여 준 화면 사진) | 학생 화면, 코딩 도구가 사진 확인 | 재시도 시각에 `note_id` 조건의 읽기 3건이 있고 `PATCH`·`DELETE`는 없음 |
| Vercel Logs(학생이 보여 준 화면 사진) | 같음 | `notes_denied reason=not_owner resource=notes.own method=GET`·`PUT`·`DELETE` 확인, 사용자 ID·메모 ID·토큰 없음. 일부 `GET` 줄은 메시지 2개 중 첫 번째가 Node 경고라 화면에서 `notes_denied`가 직접 보이지 않았습니다(다른 시각의 `GET` 줄에서는 보임) |
| 저장점 설정 대조 | 코딩 도구가 실제 실행 | `step` 8, `repoUrl`은 Git origin·배포본과 일치, `allowedRoutes`·`originalApiUrl`·`judgeIssuer`는 배포본과 일치, `identityProvider`는 비밀 없음. `RULE_IDS` 5개는 모두 구현에 쓰임. `publicAppUrl`은 고정 별칭(`…-ten.vercel.app`)이고 빌드가 만든 `/aleph.json`은 배포마다 다른 `VERCEL_URL`을 써서 서로 다릅니다(시작 틀의 방식이고 바꾸지 않았으며 심판의 처리는 알 수 없음) |
| 자기 점검 모양 확인 | 코딩 도구가 가짜 `fetch`로 실행 | 8단계 16항목(형식·중복·길이 통과). 실제 배포 주소에는 요청을 보내지 않음 |
| `npm run bundle` (`686a4bb`) | 학생이 실행한 뒤 코딩 도구가 다시 생성 | 학생이 처음 만든 묶음에는 `bundle-notes.json`의 7단계 설명이 그대로 들어 있었습니다. 설명을 8단계 내용으로 바꿔 다시 만든 묶음은 단계 8, 바뀐 파일 5개, 규칙 5개, 직접 점검 16개(실제 요청 10개는 모두 401·404이고 메모 내용 없음, 미실행 4개, 확인 불가 2개)입니다. 두 묶음 중 어느 것을 제출했는지는 확인하지 못했습니다 |
| 심판의 8단계 제출 (`686a4bb`) | 학생 보고 | `S08_OTHER_ZONE_ALLOWED`: 판정기가 반 공지·강사 자료에 대한 쓰기를 허용하거나 메모 전체 목록 경로를 열어 둠 |
| S08 재현: 가상 요청 31건을 판정기에 넣기 | 코딩 도구가 실제 실행 | 수정 전에는 메모 목록 `GET /notes`·`GET /api/notes` 2건이 `allow`였습니다(원인). 공지·강사 자료 쓰기 20건(`POST`·`PUT`·`PATCH`·`DELETE` × 경로 5종)과 메모의 다른 쓰기 3건은 `deny`, 메모 한 건 3건은 `allow`였습니다. 수정 뒤에는 목록 2건이 `deny`이고 나머지는 같습니다 |
| S08 수정 `f3010d7`의 재제출 | 학생 보고 | 8단계 통과. 재제출 때의 최신 커밋은 `f3010d7`입니다(로컬 푸시 기록상 16:13에 푸시됐고 다음 푸시는 9단계의 `f9173f9`). 첫 제출(`686a4bb`)과 재제출 사이에 바뀐 판정 코드는 구역 표에서 목록 `GET /notes` 줄을 뺀 것 하나였습니다. 그때의 묶음은 이후 9단계 묶음으로 덮어써져 확인할 수 없습니다 |

### 8단계의 남은 약점 (해소되지 않음)

- **판정기 단독으로는 B가 A의 메모를 거부하지 못합니다.** 계약에 자료 주인 항목이 없어 같은 구역이면 `allow`가 나옵니다. 막는 곳은 자료 API이고, 판정기만 따로 시험하는 심판이라면 이 점에서 실패할 수 있습니다. 판정기는 Vercel의 메모 API에 연결되어 있지 않고 반 엔진이 부르므로, 판정기가 `allow`를 내도 API 검사는 따로 항상 실행됩니다.
- **저장된 강사 권한 대조는 구현하지 않았습니다.** 비교할 강사 권한 자료가 DB에 없고 공지 API도 없습니다. 지금은 강사 예외가 어디에도 없어서 학생이 강사 권한을 얻을 길이 없고, 진짜 강사도 공지를 수정할 수 없습니다. 공지 API를 만들 때는 저장된 강사 권한 대조를 반드시 함께 만들어야 하며, 학생이 SQL Editor에서 직접 실행하는 작업이 필요합니다.
- 판정기가 받는 `route`가 `/notes/:id`인지 `/api/notes/:id`인지 확인하지 못해 두 모양을 모두 받게 했습니다(추측). 심판이 실제로 보내는 값은 알 수 없습니다.
- 구역 거부에 쓴 이유 코드 `starter_not_ready`와 허용 코드 `approved`가 운영 등록부(`allowedReasonCodes`)에 있는지 확인하지 못했습니다. 등록되지 않은 새 코드는 만들지 않았습니다.
- 판정기의 `:id` 문자 범위(영문·숫자·`_`·`-`)는 API의 UUID 검사보다 넓습니다. UUID가 아닌 ID는 API가 404로 거부하므로 자료는 나가지 않습니다. 그러나 판정기만 보면 `/notes/all`·`/notes/export`처럼 목록으로 보이는 값도 메모 한 건으로 허용합니다(S08 원인 후보 2, 고치지 않음). `:id`를 UUID로만 제한하면 시작 틀 연습 요청(`/notes/demo`)이 거부됩니다.
- 판정기는 요청의 `service` 항목을 보지 않습니다. 공지가 다른 서비스에서 메모와 같은 경로 모양으로 오면 구별하지 못합니다(S08 원인 후보 3, 근거가 없어 고치지 않음).
- S08 원인(판정기가 메모 목록 경로를 허용)은 가상 요청 31건으로 재현해 찾은 것이며 확정은 아닙니다. 목록 줄만 뺀 `f3010d7`의 재제출에서 통과한 정황만 있고, 심판이 보낸 요청은 볼 수 없습니다. 후보 2·3은 통과 뒤에도 고치지 않았습니다.
- 거부 사유 로그는 Vercel Logs의 보존 기간에 의존합니다. 서버 로그 줄은 학생이 대시보드에서만 볼 수 있어 코딩 도구는 직접 보지 못했습니다. Vercel 로그에 `url.parse()` 폐기 경고(`DEP0169`)가 함께 보이는데, 이 저장소의 `api/`·`src/`에는 `url.parse`가 없고 어느 라이브러리에서 나오는지는 확인하지 못했습니다.
- 이전 단계의 약점은 그대로입니다: 같은 id로 `POST`하면 409로 id의 존재가 드러남, 요청 횟수 제한 없음, 옛 공개 커밋과 배포 이력의 노출, 7단계의 실제 경로 `signals`가 없어 추가 확인이 심판의 가상 신호에서만 작동함.

## 7단계 기록 (8단계에서 일부 바뀜): 평소와 다른 접속은 다시 확인

- `src/decider.mjs`에 접속 정보 입력 검사(`readAccessInfo`)와 규칙 `step_up_required`를 더했습니다(7단계 당시 `RULE_IDS`: `starter.deny`, `device_registered`, `step_up_required`. 8단계에서 구역 규칙 2개가 더해짐). 기기 규칙(6단계)이 먼저이고, 그 뒤 등록 기기의 내 메모 읽기·수정(8단계부터. 7단계 당시는 읽기 `GET`만)에서 이 규칙을 봅니다.
- 입력 검사: 계약(`docs/DECIDER_REQUEST.md`)에 있는 `signals`와 `recentEvents`만 읽고 출처를 구분합니다. `judge_fixture`(심판의 가상 신호, 실제 위치 증거 아님), `none`(실제 경로, 정보 없음), `untrusted`(출처 불명·모양 불일치), `missing`(없음)입니다. 없거나 이상한 값은 `null`로 남고 `local`·`usual`·14시 같은 정상값으로 채우지 않습니다. `headers`·`geo`·`device` 같은 이름이 요청에 있어도 읽지 않으므로 위조한 클라이언트 헤더는 접속 정보로 승격되지 않습니다. 브라우저가 보낸 위치는 근거로 쓰지 않습니다.
- 규칙: 심야 시각(22시~다음 날 5시), 처음 보는 네트워크(`unusual`), 15분(900초) 안 5건 이상의 대량 조회가 **모두** 있을 때만 `step_up`과 이유 코드 `step_up_required`를 돌려줍니다. 엔진이 다시 확인했다고 알려 준 새 요청(`stepUp.verified` 참, 나이 0~900초)은 다시 판정해 `allow`입니다. 지역은 근거가 아니라 참고 사유(`foreign_region`)이고, 지역 하나로는 추가 확인도 거부도 하지 않습니다. 이 규칙은 `deny`를 만들지 않습니다.
- 사유 기록: 확인 전 `step_up`일 때 `step_up_required request=<요청 ID> evidence=<근거 이름들>` 한 줄을 오류 출력(stderr)에 남깁니다. 계정·기기·쿼리 지문·접속 값·토큰은 쓰지 않으며, 요청 ID가 UUID 모양이 아니면 `unknown`으로 적습니다. 이 줄이 어디에 저장되는지는 엔진 쪽 사정이라 확인할 수 없습니다. 심판이 판정기 파일을 `process`가 없는 격리 환경에서 부를 가능성이 있어(스타터 저장소 2026-10-08 안내는 XDR 보너스의 `decide.mjs`에 대한 글이고 7단계 판정기를 직접 가리키지 않아 추측입니다), 기록은 쓸 수 있을 때만 쓰고 실패해도 판정은 그대로 돌려줍니다.
- 자료실 주소(`/api/notes` 등), 브라우저 화면, 6단계 기기 규칙은 바꾸지 않았습니다. 저장점에서 `aleph.config.json`의 `step`을 7로 올렸고 `scripts/deployment-identity.mjs`와 `src/attack-check.mjs`가 7단계를 받도록 고쳤습니다. 자기 점검에는 `unusual_access_step_up` 항목을 확인 불가로 추가했습니다.
- 기준 값(22시~5시, 15분 안 5건)은 요구사항에 숫자가 없어 이 파일에서 정한 연습용 값입니다. 처음에는 0~5시, 10분 안 10건이었으나 심판의 `S07_SAME_VERDICT` 결과를 보고 넓혔습니다(심판이 보낸 값은 알 수 없어 추측입니다). 재확인 나이와 조회 시간 창 900초는 계약의 최대값에 맞췄습니다. 그 뒤 같은 결과가 다시 나와 격리 환경에서 기록 줄이 오류를 내는 문제를 찾아 고쳤고(`10d569d`), 이 수정을 처음 낸 3차 제출에서 7단계가 통과했습니다. 넓힌 기준은 그대로 두었습니다. 다시 재현해 보니 1차 제출 코드(`467bb7c`)도 격리 환경에서 같은 오류를 내서, 기준을 넓힌 것이 통과에 필요했는지는 알 수 없습니다(위 「심판 결과와 해결 기록」).

### 7단계 확인 순서

1. 저장소 루트에서 `npm run decider:test`를 실행합니다. 정상 결과는 네 줄이 모두 `통과`입니다: 등록 기기의 정상 요청(허용), 미등록 기기의 가상 요청(거부), 복합 이상 접속(추가 확인), 다시 확인한 복합 이상 접속(허용). 복합 이상 접속 줄에서는 사유 기록 한 줄이 함께 찍힙니다.
2. `npm run fixture:7`: 정상 사건 `allow`, 복합 이상 사건 `step_up`이 정상입니다.
3. `node --test test/decider-input.test.mjs test/decider-stepup.test.mjs`: 입력 검사·위조 입력·경계·기록 줄·격리 환경(`process` 없음) 시험 19개가 통과해야 합니다.
4. 거부·추가 확인되어야 할 결과: 미등록 기기는 복합 이상이어도 `deny`·`device_not_registered`, 복합 이상 접속은 다시 확인하기 전까지 `step_up`, 지역만 다른 요청은 `allow`입니다.
5. 이 명령은 가상 요청 연습이며 심판 판정이나 엔진 실측이 아닙니다.

### 7단계 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| `npm run decider:test` | 코딩 도구가 실제 실행, 학생도 실행 | 네 줄 모두 통과 |
| `npm run fixture:7` | 코딩 도구가 실제 실행 | 정상 사건 `allow`, 복합 이상 사건 `step_up` |
| 입력 검사·추가 확인 시험 2개 파일 | 코딩 도구가 실제 실행(학생은 17개였을 때 실행) | 19개 통과 (격리 환경 시험, 기록 실패 시험 포함) |
| 전체 시험 | 코딩 도구가 실제 실행 | 43개 통과(`node --test "test/*.test.mjs"` 기준. 그냥 `node --test`는 `scripts/`의 연습 파일까지 잡아 9단계 시작 틀 `detect-test.mjs` 때문에 1개가 더 실패함. 당시 `test:package` 1개 실패는 `api/` 위치 이동으로 해소, 아래 줄 참고) |
| 저장점 설정 대조: `step` 7로 가짜 Vercel 환경값을 넣은 빌드 식별, 가짜 `fetch`로 자기 점검 모양 확인 | 코딩 도구가 실제 실행 | 빌드 식별이 `step` 7·허용 경로 5개·`originalApiUrl`을 만들고 `step` 8은 거부. `repoUrl`·`publicAppUrl`·`identityProvider`·`allowedRoutes`가 구현과 일치. 자기 점검 13항목(형식·중복·길이 통과)이며 `unusual_access_step_up`은 확인 불가, 로그인 상태 점검 3개와 `unregistered_device`는 미실행. 네트워크 요청은 보내지 않음 |
| 판정기 커밋 `467bb7c`의 푸시 | 코딩 도구가 실행 | 푸시 완료 (Vercel 배포 성공은 확인하지 못함) |
| 저장점 커밋 `ba8b88f`의 푸시 | 코딩 도구가 실행 | 푸시 완료 (배포본은 아래 `/aleph.json` 줄) |
| 제공 엔진의 재로그인 전 자료 차단과 새 요청 허용 실측 | **확인 불가** | 엔진 본체, 연결 방법, 실측 환경이 저장소와 요구사항에 주어지지 않았습니다. 요청 쪽 입력 항목(`stepUp`)만 계약에 있습니다. 가상 사건 규칙만 시험했고 실제 자료 차단은 미실행입니다 |
| 배포본 `/aleph.json` | 코딩 도구가 읽기 요청 | `step` 7, 커밋 `ba8b88f` 확인 (규칙이 들어 있는 커밋) |
| 심판의 7단계 제출(`ba8b88f`) | 학생 보고 | 6단계 기기 규칙은 통과. 7단계는 `S07_SAME_VERDICT`(정상 접속과 복합 이상 접속의 판정이 같음). 심판이 보낸 값은 화면에 나오지 않아 원인을 확정하지 못했습니다 |
| 기준 값을 넓힌 커밋 `59b4eab`의 2차 제출 | 학생 보고 | 같은 `S07_SAME_VERDICT` |
| 격리 환경 재현: 판정기 파일 하나를 `process`가 없는 환경에서 실행 | 코딩 도구가 실제 실행 | 이전 코드는 정상 `allow`, 지역 급변 복합 이상은 오류(`process is not defined`)였습니다. 오류를 "조치 없음"(`allow`)으로 처리하면 두 판정이 같아 S07과 같은 모양입니다. 기록 줄을 고친 뒤에는 정상 `allow`, 복합 이상 `step_up`입니다 |
| 기록 줄을 고친 커밋 `10d569d`의 3차 제출 | 학생 보고 | 7단계 통과. 2차와 3차 사이에 바뀐 판정 코드는 기록 줄 수정 하나였습니다. 배포본 `/aleph.json`은 `step` 7, 커밋 `10d569d`였습니다(코딩 도구가 읽기 요청으로 확인) |
| 파일 위치 이동 `75dfd56`(`api/config.js`→`api/config/index.js`, `api/_notes.js`→`src/notes-api.mjs`) | 코딩 도구가 실제 실행 | 전체 시험 43개 통과(`test:package` 포함), 가짜 설정값으로 메모 API 직접 호출 시 토큰 없음·엉터리 토큰 401. 배포본 `/aleph.json`은 `step` 7, 커밋 `75dfd56`이고 `/api/config` 200, 로그인 없는 `/api/notes`·`/api/notes/:id` 401을 읽기 요청으로 확인. 로그인 후 메모 읽기·추가·수정·삭제는 학생이 배포 화면에서 새 가상 계정으로 확인했고, Supabase `notes` 테이블에서 행의 추가·수정·삭제도 확인함(학생 보고, 코딩 도구는 직접 보지 못함) |
| `npm run bundle` (`ba8b88f`) | 학생이 실행, 코딩 도구가 묶음 확인 | 단계 7, 규칙 3개, 직접 점검 13개(실제 요청 8개 모두 401·404이고 메모 내용 없음, 미실행 4개, 확인 불가 1개). 새 커밋마다 다시 실행해야 합니다 |

### 7단계의 남은 약점 (해소되지 않음)

- 실제 경로에서는 계약상 `signals`가 `none`이라 시각·네트워크 근거가 없어서, 이 규칙은 심판의 가상 신호(`judge_fixture`)에서만 작동합니다.
- 새로 로그인했는지는 엔진이 검증해야 합니다. 판정기는 `stepUp`이 계약 모양일 때만 재확인으로 받아들이며, 계약 문서가 "이 값만 보고 재인증 확인 요청을 건너뛰지 않는다"고 한 점은 엔진에 맡겨 둔 상태입니다.
- 이유 코드 `step_up_required`가 운영 등록부(`allowedReasonCodes`)에 있는지 확인하지 못했습니다. `decider:test`가 이 코드를 기대하는 것만 근거입니다.
- 사건 종류(`kind`)를 구분하지 않고 최근 900초의 건수를 모두 합산합니다. `hour`의 기준 시간대(UTC인지 현지인지)는 계약에 없어 그대로 비교합니다.
- 등록 기기의 쓰기(`POST`·`PUT`·`DELETE`)는 6단계부터 거부된 채였고, 8단계에서 내 메모 `PUT`만 열렸습니다(`POST`·`DELETE`는 그대로 거부).
- 사유 기록 줄은 stderr로만 나가며 저장소에는 보관하는 곳이 없습니다. 격리 환경(`process` 없음)에서는 기록이 남지 않고 판정만 돌려줍니다.
- S07 원인(격리 환경의 기록 줄 오류)은 재현으로 추정한 것이며 확정은 아닙니다. 기록 줄 수정 뒤 3차 제출에서 통과한 정황만 있고, 심판이 판정기를 어떤 환경에서 부르고 오류를 어떻게 처리하는지는 볼 수 없습니다. 지역 급변을 근거로 쓰지 않는 규칙은 그대로이므로, 심판 사건이 달라지면 다시 실패할 수 있습니다.

## 6단계 기록 (7단계에서 일부 바뀜): 등록한 기기만 자료실 읽기

- `src/decider.mjs`에 규칙 `device_registered`를 더했습니다(6단계 당시 `RULE_IDS`: `starter.deny`, `device_registered`. 7단계에서 `step_up_required`가 더해짐). 반 엔진이 넣어 준 `request.deviceRegistered`가 `true`이고 동작(`method`)이 `GET`일 때만 `allow`(이유 코드 `approved`)입니다. `false`이거나 값이 없거나 `true`가 아닌 값이면 `deny`와 `device_not_registered`입니다. 등록 기기의 쓰기(`POST`·`PUT`·`DELETE`)는 이 규칙이 허용하지 않으며, 기존 `starter.deny`가 그대로 거부합니다(8단계에서 내 메모 `PUT`만 구역 규칙으로 열림).
- 판단에는 계약(`docs/DECIDER_REQUEST.md`)에 있는 `deviceRegistered`와 `method`만 씁니다. 계약에 없는 `request.device` 같은 값이나 브라우저가 보낸 사용자 번호·기기 상태는 쓰지 않습니다. 인증서·CA·서명 키는 만들지 않았습니다.
- 판정기는 Vercel의 메모 API에 연결되어 있지 않고 반 엔진이 부릅니다. 자료실 주소(`/api/notes` 등)와 브라우저 화면은 바꾸지 않았습니다.
- 저장점에서 `aleph.config.json`의 `step`을 6으로 올렸습니다. 이에 맞춰 `scripts/deployment-identity.mjs`(빌드가 만드는 `public/aleph.json`)와 `src/attack-check.mjs`가 6단계를 받도록 고쳤습니다. 자기 점검에는 `unregistered_device` 항목을 미실행으로 추가했습니다(이 스크립트는 기기 등록 요청을 보내지 않습니다).
- 2단계에서 `vercel.json`에 넣은 `X-Content-Type-Options: nosniff` 응답 헤더도 그대로입니다.
- 현재 작동하는 것: 이메일 로그인, 본인 메모 읽기·추가·수정·삭제(`/api/notes`, `/api/notes/:id`), 원본 API 직접 접근 거부(5단계 기록), 판정기의 기기 등록 규칙(이 단계). 판정기는 가상 요청으로만 시험했습니다.

### 6단계 확인 순서

이번 단계에는 따로 설치할 접속 프로그램이 없습니다.

1. 저장소 루트에서 `npm run decider:test`를 실행합니다.
2. 정상 결과는 `통과 · 등록 기기의 정상 요청`과 `통과 · 미등록 기기의 가상 요청` 두 줄입니다(7단계 규칙이 더해진 지금은 네 줄이며 위 7단계 확인 순서를 따릅니다). 첫 줄은 등록 기기 요청이 `allow`로 허용됐다는 뜻입니다. 둘째 줄은 미등록 기기 요청이 `deny`와 `device_not_registered`로 거부됐다는 뜻이며, 시험이 결정과 이유 코드를 함께 대조합니다.
3. 미등록 기기 요청이 허용되거나 이유 코드가 다르면 둘째 줄이 `확인 필요 · 미등록 기기의 가상 요청`으로 바뀌고 명령이 실패(종료 코드 1)합니다.
4. 이 명령은 가상 요청 연습이며 심판 판정이 아닙니다. 미등록 기기로 들어오는 공격은 심판이 시험합니다.

### 6단계 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| `npm run decider:test` | 코딩 도구가 실제 실행 | 등록 기기의 정상 요청 통과, 미등록 기기의 가상 요청 통과 (종료 코드 0) |
| 같은 가상 요청에서 값만 바꿔 `decide`에 직접 넣기 | 같음 | 등록 기기 GET은 `allow`·`approved`. 미등록(`false`)·값 없음·문자열 `"true"`는 `deny`·`device_not_registered`. 등록 기기 POST는 `deny`·`starter_not_ready` |
| 저장점 설정 대조: `step` 6으로 가짜 Vercel 환경값을 넣은 빌드 식별, 가짜 `fetch`로 자기 점검 모양 확인 | 코딩 도구가 실제 실행 | 빌드 식별이 `step` 6·허용 경로 5개·`originalApiUrl`을 만들고 `step` 7은 거부. 자기 점검 12항목(형식·중복 통과), 네트워크 요청은 보내지 않음 |
| 심판의 미등록 기기 공격 | 미실행 | 심판이 맡습니다 |
| 재배포(커밋 `89d6d78`, `step` 6) | 학생 보고 | 배포 성공 (코딩 도구는 Vercel 화면을 보지 못함) |
| `npm run bundle` | 학생이 실행, 코딩 도구가 생성된 묶음을 확인 | 제출 묶음 생성 성공(단계 6, 바뀐 파일 5개, 규칙 2개, 직접 점검 12개). 실제 요청 8개: `/data.json` 404, 로그인 없는 `/api/notes` 5개 경로와 가짜 토큰 요청은 모두 401, anon 키로 `originalApiUrl` 읽기 401(메모 내용 없음) |
| 자기 점검의 로그인 상태 점검 3개, `unregistered_device` | 미실행 | 이 스크립트는 로그인·기기 등록 요청을 보내지 않습니다 |

### 6단계의 남은 약점 (해소되지 않음)

- 요청 자체가 `null`·`undefined`여도 `decide`는 예외 없이 `deny`·`device_not_registered`를 돌려줍니다. 이때 응답에는 `requestId`가 없어 형식이 맞지 않으므로, 계약 문서대로 엔진이 접근을 허용하지 않아야 합니다. 엔진의 실제 처리는 이 저장소에서 확인하지 못했습니다.
- 허용 이유 코드 `approved`는 계약 문서의 응답 예시에서 가져왔습니다. 운영 등록부(`allowedReasonCodes`)는 이 저장소에 없어 등록 여부를 확인하지 못했습니다.
- 경로(`route`) 문자열은 검사하지 않습니다. 반 엔진이 허용 경로를 먼저 확인하며, 계약 예시(`GET /notes/:id`)와 `aleph.config.json`(`GET /api/notes/:id`) 중 어느 모양이 들어오는지 이 저장소에서 확정할 수 없습니다.
- 등록 기기의 쓰기(`POST`·`PUT`·`DELETE`)는 거부됩니다. 심판의 정상 요청에 쓰기가 섞여 있는지 6단계 카드에서 확인하지 못했습니다.
- `step` 6 재배포의 성공은 학생 보고이고, 코딩 도구는 Vercel 화면이나 배포본의 `/aleph.json`을 직접 확인하지 못했습니다.

## 보너스: 웹 주입 공격 탐지 현재 상태

연습 경보(`xdr/fixtures/web-injection.json`, 가상 26건)만 다루는 부품입니다. 무차별 로그인 보너스와 같은 구조이고, 6~8단계 전이라 ZTNA 판정기(`src/decider.mjs`)에는 연결하지 않았습니다. (보너스 당시 판정기 규칙 `RULE_IDS`는 시작 틀 그대로였고, 6단계에서 `device_registered`가 더해졌지만 이 보너스와는 여전히 연결되지 않았습니다.) 이 결과는 직접 돌린 연습이며 심판 판정이 아닙니다.

- `xdr/web-injection/decide.mjs`: `decide(alert)` 하나만 내보내며 다른 파일·패키지를 불러오지 않고 파일·네트워크도 쓰지 않습니다. 반환은 `{ action, confidence, reason }`이고 0.85 이상 block, 0.5 이상 alert, 그 아래 record입니다. 뚜렷한 신호(SQL 구문, 스크립트 태그, `../` 반복, 명령 구분자)가 같은 주소에서 8번 이상 반복돼야 block입니다. 낱말만 닮은 단서(select, SQL, 스크립트 등)는 설명에 "공격이 아니다"라고 적혀 있어도 alert까지만 올립니다.
- `xdr/web-injection/patterns.json`: 근거 패턴 4개(`sql_injection_repeat`, `script_injection_repeat`, `path_traversal_repeat`, `command_separator_repeat`)와 기준 값입니다. 모두 ATT&CK T1190이 근거이고 `decide.mjs` 맨 위 상수와 값이 같습니다.
- `xdr/web-injection/respond.mjs`: 반복 횟수가 없는 낱개 주입 경보를 같은 주소·같은 패턴끼리 2분 창 안에서 합쳐 `decide`에 넘기고, block만 차단 후보(`block-candidates.json`, 만료 60분·근거 경보 번호 포함)로 만들며 block·alert를 `xdr/alerts.log`에 한 줄씩 쌓습니다. 같은 주소에서 정상 이벤트가 주입 시도보다 많으면 그 주소는 후보에서 뺍니다.
- `xdr/web-injection/read-alerts.mjs`: 경보에서 시각·주소·계정·수준·설명만 뽑고 비밀값 모양은 가립니다. 확인용이며 `decide.mjs`는 불러오지 않습니다.
- 다시 실행: `npm run xdr:run -- web-injection`(결과 `result.json`), `node xdr/web-injection/respond.mjs`(후보·알림), `node xdr/web-injection/read-alerts.mjs`(경보 26건 / 뽑은 줄 26줄 일치 확인), `node --test test/xdr-web-respond.test.mjs`. 산출물(`result.json`, `block-candidates.json`, `alerts.log`)은 Git에서 제외했습니다.

### 기준 값의 출처

- 시간 창 2분(120초)과 SQL 반복 8회: Wazuh 웹 규칙 31152(SQL 주입 반복)의 `timeframe`·`frequency`를 따랐습니다.
- 스크립트·경로·명령 구분자에도 8회를 쓴 것은 연습 경보에 맞춘 이 모듈의 임의 값입니다. Wazuh 31154(스크립트)와 31153(공통 웹 공격)은 10회인데, 연습 경보의 명확한 공격 중 스크립트 9번과 경로 8번이 있어 10을 쓰면 block되지 않기 때문입니다.
- `command_separator_repeat`는 요청 신호 목록(SQL 구문·스크립트 태그·`../` 반복)에 없던 패턴입니다. 연습 경보 wi-06이 명확한 공격이라 같은 T1190 범위에서 더했습니다. 필요 없으면 `patterns.json`과 `decide.mjs`의 같은 항목을 함께 지우면 됩니다.

### 웹 주입 보너스 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| 연습 경보 26건의 `xdr:run` | 코딩 도구가 실제 실행 | block 8 / alert 9 / record 9. 명확한 공격 8건 전부 block, 애매한 9건 전부 alert, 정상 9건 전부 record |
| 읽기 모듈의 건수 비교 | 같음 | 경보 26건 / 뽑은 줄 26줄 일치 |
| `test/xdr-web-respond.test.mjs`와 기존 xdr 시험 | 같음 | 19개 통과 |
| 보안·요구 자기 점검 29항목 | 같음 | 28개 통과, 1개 실패(판정기 연결, 아래) |
| 실제 배포 주소·Supabase에 대한 요청 | 미실행 | 이번 보너스는 배포와 DB를 건드리지 않았습니다 |
| `npm run bundle`과 `attack-check.mjs` | 미실행 | 이번 보너스에서 바꾸지 않았고 실행하지 않았습니다 |

### 웹 주입 보너스의 남은 약점 (해소되지 않음)

- **판정기에 연결하지 않았습니다.** 차단 후보는 파일로만 남고 실제 접속 차단은 일어나지 않습니다. 현재 판정기 요청 계약에는 출발 주소 항목이 없습니다.
- **후보 만료(60분)를 강제하는 곳이 없습니다.** 후보 파일은 실행할 때마다 새로 쓰므로 경보가 적은 시점에 다시 돌리면 만료 전에 후보가 사라질 수 있습니다.
- 신호를 경보 설명의 한국어 문구와 요청 주소에서 읽습니다. 연습 경보에는 실제 공격 구문이 없어서 주소의 실제 구문 모양(UNION SELECT, script 태그, `../` 반복)은 가짜 입력 시험으로만 확인했습니다. 다른 문구의 경보는 정상(record)으로 처리되어 놓칠 수 있습니다.
- 시간 창이 고정이라 창 경계에서 나뉜 공격(예: 5건 + 5건)은 둘 다 alert로 남을 수 있습니다.
- IPv6 주소는 후보에서 빠집니다(알림 로그에는 남습니다). `alerts.log`는 계속 쌓이고 정리 규칙이 없습니다.
- 주소 단위 차단뿐이라 주소를 바꾸는 공격과 공용 주소(NAT) 사정은 구분하지 못합니다.
- 기준 값(8회)은 연습 경보에 맞춘 값이고 시험 자료도 가짜입니다. 심판 경보의 형식은 이 저장소에서 확인할 수 없습니다.
- `npm run test:package`는 이전 단계부터 실패했으나, `api/config.js`를 `api/config/index.js`로, `api/_notes.js`를 `src/notes-api.mjs`로 옮겨 통과합니다(주소·동작 불변, 시험·기준표는 고치지 않음).

## 보너스: 무차별 로그인 공격 탐지 현재 상태

연습 경보(`xdr/fixtures/brute-force.json`, 가상 28건)만 다루는 부품입니다. 6~8단계 전이라 ZTNA 판정기(`src/decider.mjs`)에는 연결하지 않았습니다. (보너스 당시 판정기 규칙 `RULE_IDS`는 시작 틀 그대로였고, 6단계에서 `device_registered`가 더해졌지만 이 보너스와는 여전히 연결되지 않았습니다.) 이 결과는 직접 돌린 연습이며 심판 판정이 아닙니다.

- `xdr/brute-force/decide.mjs`: `decide(alert)` 하나만 내보내며 다른 파일·패키지를 불러오지 않고 파일·네트워크도 쓰지 않습니다. 반환은 `{ action, confidence, reason }`입니다. 확신도 0.85 이상이면 block, 0.5 이상이면 alert, 그 아래는 record입니다.
- `xdr/brute-force/patterns.json`: 근거 패턴 두 개(같은 주소의 실패 연속 T1110.001, 여러 계정에 같은 비밀번호 T1110.003)와 기준 값입니다. `decide.mjs` 맨 위 상수와 값이 같습니다.
- `xdr/brute-force/respond.mjs`: 낱개 실패 경보를 같은 주소끼리 2분 창 안에서 합쳐 `decide`에 넘기고, block만 차단 후보(`block-candidates.json`, 만료 60분·근거 경보 번호 포함)로 만들며, block·alert를 `xdr/alerts.log`에 한 줄씩 쌓습니다. 같은 주소에서 정상 이벤트가 실패보다 많으면 그 주소는 후보에서 뺍니다.
- `xdr/brute-force/read-alerts.mjs`(+`pick-alert.mjs`): 경보에서 시각·주소·계정·수준·설명만 뽑고 비밀값 모양은 가립니다. 확인용이며 `decide.mjs`는 불러오지 않습니다.
- 다시 실행: `npm run xdr:run -- brute-force`(결과 `result.json`), `node xdr/brute-force/respond.mjs`(후보·알림), `node xdr/brute-force/read-alerts.mjs`(경보 28건 / 뽑은 줄 28줄 일치 확인), `node --test test/xdr-respond.test.mjs`. `result.json`, `block-candidates.json`, `alerts.log`는 실행 때마다 만들어지는 산출물이라 Git에서 제외했습니다.

### 기준 값의 출처

- 시간 창 2분(120초): Wazuh 기본 sshd 무차별 대입 규칙(5712·5719·5763)의 `timeframe`을 따랐습니다.
- block 기준 15건과 계정 5개: 연습 경보에 맞춘 이 모듈의 임의 값입니다. ATT&CK도 Wazuh도 정하지 않은 값입니다. 같은 Wazuh 규칙의 8회는 경보를 올리는 기준이라 block 기준으로 쓰지 않았습니다. 쓰면 애매한 시도(bf-18)까지 막힙니다.
- "같은 비밀번호": 코드가 비밀번호를 직접 비교하지 못합니다. 경보 설명에 "같은 비밀번호"라는 문구가 있을 때만 계정 수로 block하고, 없으면 실패가 15건 이상일 때만 block합니다.

### 보너스 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| 연습 경보 28건의 `xdr:run` | 코딩 도구가 실제 실행 | block 10 / alert 9 / record 9. 명확한 공격 10건 전부 block, 애매한 9건 전부 alert, 정상 9건 전부 record |
| 읽기 모듈의 건수 비교 | 같음 | 경보 28건 / 뽑은 줄 28줄 일치 |
| `test/xdr-respond.test.mjs`와 `test/xdr-run.test.mjs` | 같음 | 12개 통과 |
| 보안·요구 자기 점검 37항목 | 같음 | 36개 통과, 1개 실패(판정기 연결, 아래) |
| 실제 배포 주소·Supabase에 대한 요청 | 미실행 | 이번 보너스는 배포와 DB를 건드리지 않았습니다 |
| `npm run bundle`과 `attack-check.mjs` | 미실행 | 이번 보너스에서 바꾸지 않았고 다시 실행하지 않았습니다 |

### 보너스의 남은 약점 (해소되지 않음)

- **판정기에 연결하지 않았습니다.** 차단 후보는 파일로만 남고 실제 접속 차단은 일어나지 않습니다. 6~8단계 판정기가 생기고 요청 계약에 쓸 수 있는 값이 정해져야 합니다. 현재 계약에는 출발 주소 항목이 없습니다.
- **후보 만료(60분)를 강제하는 곳이 없습니다.** 후보 파일은 `respond.mjs`를 실행할 때마다 새로 쓰므로, 경보가 적은 시점에 다시 돌리면 만료 전에 후보가 사라질 수 있습니다.
- 시간 창이 고정이라 창 경계에서 나뉜 공격(예: 12건 + 12건)은 둘 다 alert로 남을 수 있습니다.
- IPv6 주소는 후보에서 빠집니다(알림 로그에는 남습니다).
- 경보 설명의 한국어 문구("실패", "성공했", "계정 N개")에 의존합니다. 다른 문구의 경보는 정상(record)으로 처리되어 놓칠 수 있습니다.
- `alerts.log`는 계속 쌓이고 정리 규칙이 없습니다.
- 주소 단위 차단뿐이라 주소를 바꾸는 공격과 공용 주소(NAT) 사정은 구분하지 못합니다.
- 비밀번호 정보가 없는 낱개 경보의 느린 스프레이(15건 미만)는 alert에 머뭅니다.
- 기준 값(15건·5계정)은 연습 경보에 맞춘 값이고 시험 자료도 가짜입니다. 심판 경보의 형식은 이 저장소에서 확인할 수 없습니다.
- `npm run test:package`는 이전 단계부터 실패했으나, `api/config.js`를 `api/config/index.js`로, `api/_notes.js`를 `src/notes-api.mjs`로 옮겨 통과합니다(주소·동작 불변, 시험·기준표는 고치지 않음).

## 5단계 현재 상태

- 브라우저 코드(`public/index.html`)에는 메모 자료를 Supabase에서 직접 읽거나 고치는 곳이 없습니다. Supabase 호출은 로그인(`signInWithPassword`·`signOut`·`getSession`·`onAuthStateChange`)뿐이고, 메모 읽기·추가·수정·삭제는 `/api/notes`와 `/api/notes/:id` 서버 함수로만 갑니다. 서버 함수의 로그인·소유자 검사와 서버 전용 설정(`SUPABASE_URL`, `SUPABASE_SECRET_KEY`)은 4단계 그대로입니다.
- 로그인(Auth)에 쓰는 공개용 키는 HTML 소스가 아니라 `/api/config`에서 받습니다. 환경변수 `SUPABASE_PUBLISHABLE_KEY`가 없으면 로그인 화면이 동작하지 않습니다(503). `public/aleph.json`에는 3단계부터 `allowedRoutes`도 실립니다. 배포본에 실린 것은 8단계 저장점 대조에서 확인했으며(8단계 확인 기록), `/api/config`는 `allowedRoutes`에 넣지 않았습니다.
- `aleph.config.json`의 `originalApiUrl`은 쿼리 없는 원본 자료 경로 `https://eyrodbkzyapsuiudjjft.supabase.co/rest/v1/notes`입니다. 심판은 이 주소를 anon 키로 직접 요청해 거부되는지 봅니다.
- 5단계부터 `npm run build`가 만드는 배포 설정 `public/aleph.json`에도 `originalApiUrl`이 실립니다. 쿼리·해시가 없는 `https://` 경로가 아니면 빌드가 실패합니다. 심판이 `S05_ORIGINAL_URL_MISSING`으로 거부해서 추가했고, 재제출에서 5단계를 통과했습니다(학생 보고). 배포본 `/aleph.json`에 `originalApiUrl`이 실린 것은 8단계 저장점 대조에서 코딩 도구가 확인했습니다.
- DB(`public.notes`): 학생이 SQL Editor에서 `revoke all on table public.notes from public, anon, authenticated;`와 `service_role`의 SELECT·INSERT·UPDATE·DELETE `grant`를 직접 실행했습니다. 이 SQL은 저장소에 없습니다. RLS 켬과 정책 4개(`notes_*_own`)는 남겨 두었으며, 권한이 없으므로 직접 접근에는 쓰이지 않는 두 번째 방어선입니다. 아래 4단계 기록의 `authenticated` 권한 설명은 이 변경으로 대체됩니다. API 응답의 `body`는 DB 열 `content`입니다.
- 다시 실행: `npm run test:r5`(CRUD는 다루지 않음)와 `npm run bundle`. 배포 뒤 시크릿 창에서 A로 로그인해 추가·수정·삭제를 눌러 보고, 로그아웃 상태의 `/api/notes`가 401인지 봅니다. `npm run bundle`의 자기 점검은 토큰 없는 요청, 가짜 토큰 요청, anon 키로 `originalApiUrl` 직접 읽기만 보냅니다.

### 5단계 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| 적용 전 `role_table_grants`·`pg_policies` | 학생이 SQL Editor에서 실행한 화면을 코딩 도구가 확인 | authenticated의 SELECT·INSERT·UPDATE·DELETE, 정책 4개 (anon·PUBLIC 없음) |
| 적용 후 `role_table_grants`·`pg_policies` | 같은 방식 | postgres·service_role만 남음, 정책 4개 유지 |
| A의 추가·수정·삭제, 로그아웃 상태 `/api/notes` | 학생 보고 | 정상 (코딩 도구는 화면을 보지 못함) |
| 토큰 없는 `GET·POST /api/notes` | 코딩 도구가 배포 주소로 실제 요청 | 모두 401 |
| anon 키로 `originalApiUrl` GET | 코딩 도구가 실제 요청 | HTTP 401(`42501`), 메모 내용 없음 |
| 키 없이 `originalApiUrl` GET | 코딩 도구가 실제 요청 | HTTP 401 |
| anon 키 POST·PATCH·DELETE, authenticated 직접 호출 | 미실행 | 권한 표로만 확인 |
| B의 타인 메모 접근 404 | 미실행 | 이번 단계에서 확인하지 않음 |
| `npm run bundle` 자기 점검의 로그인 상태 점검 | 미실행 | 미실행 |
| 심판의 5단계 첫 제출(저장점 `e78d6db` 뒤) | 학생 보고(커밋 `edb4aa4` 설명에 기록) | `S05_ORIGINAL_URL_MISSING`으로 거부. 당시 `originalApiUrl`은 `aleph.config.json`에만 있고 빌드가 만드는 배포본 `/aleph.json`에는 없었습니다 |
| S05 수정 뒤 재제출 | 학생 보고 | 5단계 통과. 수정 `edb4aa4`는 빌드가 만드는 `/aleph.json`에 `originalApiUrl`을 싣는 것 하나였습니다. 통과한 재제출 커밋은 다음 날의 `e59b9b6`(화면의 공개 키를 `/api/config`로 옮기고 `/aleph.json`에 `allowedRoutes` 추가)입니다(학생이 알려 줌). 코드를 비교하면 `e59b9b6`은 `edb4aa4`의 `originalApiUrl` 부분을 그대로 갖고 있어 S05 수정이 들어 있었습니다. 로컬 푸시 기록은 10-13부터만 남아 있어 제출 시각은 확인할 수 없습니다 |
| 배포본 `/aleph.json`의 `originalApiUrl` | 코딩 도구가 읽기 요청(8단계 저장점 대조) | 실려 있고 `aleph.config.json`의 값과 같음 |

### 5단계의 남은 약점 (해소되지 않음)

- 같은 id로 `POST /api/notes`를 보내면 409(`ID_EXISTS`)로 id의 존재가 드러납니다.
- 요청 횟수 제한이 없습니다.
- 옛 공개 커밋(`24bcae9`)과 옛 배포 이력에 남은 노출은 해소되지 않았습니다.
- authenticated 역할의 Data API 직접 접근은 심판이 재현할 수 없어 점수에서 제외되며, 권한 표로만 확인했습니다.
- `api/ai.js`와 `api/threat-intel.js`는 아직 501 빈 틀입니다.

## 4단계 기록 (5단계에서 일부 바뀜)

- 서버(`src/notes-api.mjs`, `api/notes/index.js`, `api/notes/[id].js`)가 검증된 사용자 ID와 DB의 `owner_id`를 비교합니다. 읽기·수정·삭제는 본인 메모만 되고, 남의 메모와 `owner_id`가 빈 메모는 없는 메모와 같은 404로 거부합니다(id의 존재를 알려 주지 않음). 수정·삭제는 SQL 조건에도 `owner_id = 본인`을 다시 걸어 확인 직후 바뀌는 경우도 막습니다.
- 추가·수정 본문에 본인이 아닌 `owner_id`가 들어 있으면 403으로 거부합니다. 추가할 때 `owner_id`는 항상 검증된 토큰의 사용자 ID로 저장합니다. 한 건 응답은 `{id,title,body}`, 수정 본문은 `{title,body}`이며 `owner_id`는 응답에 나가지 않습니다. 허용 경로는 3단계와 같습니다.
- (5단계에서 `authenticated`의 직접 권한은 회수됨) DB(`public.notes`)는 `PUBLIC`·`anon`·`authenticated`의 권한을 회수한 뒤 `authenticated`에 SELECT·INSERT·UPDATE·DELETE만 주고, RLS 정책 4개(`notes_select_own`, `notes_insert_own`, `notes_update_own`, `notes_delete_own`)가 `auth.uid() = owner_id`일 때만 허용합니다. UPDATE는 기존 행(USING)과 새 행(WITH CHECK)을 모두 검사합니다. 앱 API는 서버 키(`service_role`)로 RLS를 우회하므로, 앱에서의 본인 행 제한은 위 API 검사가 맡고 RLS는 Data API 직접 접근을 막는 장치입니다. 이 SQL은 저장소에 없고 학생이 SQL Editor에서 직접 실행했습니다.
- 소유자 연결: 기존 가상 메모 3건은 계정 A, 시험 메모 `SAMPLE_NOTE_B_1`은 계정 B 소유입니다. 가상 메모 `훈련 행정 자료` 1건은 `owner_id`가 비어 있어 일부러 남겼고, 누구도 접근할 수 없어야 합니다.
- 다시 실행: `npm run test:r5`로 시험하고, 배포 뒤 시크릿 창 두 개에서 A·B로 각각 로그인해 자기 메모만 보이는지, 상대 메모 id로 읽기·수정·삭제 시 404인지 확인합니다. `npm run bundle`의 자기 점검은 토큰 없는 요청, 가짜 토큰 요청, anon 키의 Data API 직접 읽기만 보냅니다. 로그인 상태 점검은 미실행으로 남깁니다.

### 4단계 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| 토큰 없음·가짜 토큰으로 `/api/notes`와 `/api/notes/:id` 5개 메서드 | 코딩 도구가 배포 주소로 실제 요청 | 모두 401 |
| 배포 `/data.json` | 코딩 도구가 실제 요청 | 404 |
| anon 키로 Supabase `notes` 직접 GET·POST·PATCH·DELETE | 코딩 도구가 실제 요청 | 모두 401(`42501`), 메모 내용 없음 |
| 적용 후 `has_table_privilege`와 `pg_policies` | 학생이 SQL Editor에서 실행한 결과를 코딩 도구가 확인 | anon 전부 false, authenticated는 SELECT·INSERT·UPDATE·DELETE만 true, 정책 4개 |
| A·B 로그인 상태의 자기 메모 읽기·추가·수정·삭제, 상대 메모 404, 남의 `owner_id` 403, 주인 없는 메모 404 | 학생이 시험 스크립트를 직접 실행 | 학생 보고: 전부 통과 (코딩 도구는 결과 화면을 보지 못함) |
| `npm run bundle`의 자기 점검 중 로그인 상태 점검 | 미실행 | 미실행 |

### 4단계의 남은 약점 (해소되지 않음)

- 같은 id로 `POST /api/notes`를 보내면 409(`ID_EXISTS`)로 그 id가 이미 있다는 사실이 드러납니다. 메모 내용은 노출되지 않으며 화면은 id를 보내지 않습니다.
- 요청 횟수 제한이 없습니다.
- 옛 공개 커밋(`24bcae9`)과 옛 배포 이력에 남은 노출은 해소되지 않았습니다.
- authenticated 역할의 Data API 직접 접근은 심판이 재현할 수 없어 점수에서 제외됩니다. 그 보호는 GRANT와 RLS 정책 설계로 남아 있으며, 직접 호출 시험은 하지 않았습니다.
- 시험에 쓴 계정 비밀번호가 대화에 노출되어 학생이 바꿔야 합니다.

## 3단계 기록 (4단계에서 일부 바뀜)

- 화면(`/`)에서 Supabase Auth 이메일·비밀번호로 로그인·로그아웃합니다. 로그인 전에는 메모가 보이지 않고, 로그인 실패 이유는 화면에 표시됩니다.
- 서버(`src/notes-api.mjs`)가 요청의 `Authorization: Bearer` 토큰을 `src/verify-login.mjs`로 검사합니다. 토큰이 없거나 검사에 실패하면 자료 없이 401로 거부합니다. 본문의 `userId`·`role`·`owner_id`는 읽지 않고, 추가할 때 `owner_id`는 검사를 통과한 토큰의 사용자 ID로 저장합니다.
- 로그인한 계정은 가상 메모를 추가·수정·삭제할 수 있습니다. 경로는 `GET·POST /api/notes`, `GET·PUT·DELETE /api/notes/:id`이며 `aleph.config.json`의 `allowedRoutes`에 같은 목록이 있습니다. 목록 GET은 내 `owner_id`의 메모만 돌려줍니다.
- 로그인 발급자 정보(`identityProvider`: 발급자·공개키 주소·대상)는 `aleph.config.json`에 있고 비밀 키는 없습니다. 화면 소스에는 키를 적지 않고, 로그인에 쓰는 Project URL과 publishable key는 서버 함수 `/api/config`(환경변수 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`)가 내려 줍니다. 브라우저가 Auth를 직접 호출하므로 이 공개용 값은 실행 중 브라우저에 내려옵니다. 서버 전용 키는 Vercel 환경변수 `SUPABASE_SECRET_KEY`에만 있습니다.
- DB는 `notes` 표에 `note_id uuid`(API의 `id`)와 `service_role`의 추가·수정·삭제 권한을 학생이 SQL Editor에서 직접 더한 상태여야 합니다.
- 다시 실행: `npm run test:r5`로 시험하고, 배포 뒤 시크릿 창에서 로그인 전 화면과 `/api/notes`(401)를 확인한 뒤 가상 계정 A로 로그인해 추가·수정·삭제와 로그아웃을 눌러 봅니다. `npm run bundle`의 자기 점검은 토큰 없는 요청과 가짜 토큰 요청만 보내며, 로그인 상태 점검은 미실행으로 남깁니다.

### 3단계의 약점과 4단계 후 상태

- 소유자 검사가 없던 약점과 `owner_id`가 빈 메모를 id로 조회할 수 있던 약점은 4단계에서 API와 RLS로 막았습니다(위 4단계 기록 참고).
- 409로 id의 존재가 드러나는 점, 요청 횟수 제한이 없는 점, 옛 공개 커밋과 배포 이력의 노출은 해소되지 않았습니다.

## 2단계 기록 (3단계에서 일부 바뀜)

- 정적 `data.json`과 `public/data.json`을 최신 커밋에서 제거했습니다. `npm run build`는 더 이상 메모를 복사하지 않습니다.
- 메모는 `api/notes/index.js`(GET `/api/notes`)가 학습용 DB의 `notes` 표(`title`, `content`, `id`)에서 읽어 옵니다. 화면(`/`)은 이 API를 부릅니다.
- (2단계 당시) `/api/notes`는 공개 주소이고 로그인 확인이 없었습니다. 3단계에서 로그인 확인을 붙였습니다. 그래서 DB에는 가상 메모만 두며, 서버 키는 함수 안에서만 쓰이고 응답·화면·로그에 나가지 않습니다.
- **이전 공개 커밋과 배포 이력에는 예전 정적 메모가 그대로 남아 있습니다.** 이번 변경은 이력을 지우지 않습니다.
- Vercel 환경변수 입력란에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 직접 넣으세요. 값은 코드·Git·채팅에 적지 않습니다.
- 다시 실행: `npm run test:r5`로 시험하고, 배포 뒤 `https://<배포주소>/api/notes`를 엽니다.

## 2단계 확인 절차: 가상 메모 문장 검색

1. **GitHub 최신 파일** (저장소 루트에서): `git ls-files | xargs grep -lE "실습용 가상 (과제|포트폴리오|리추얼|행정) 기록"`. 결과가 한 줄도 없어야 합니다. (`db/seed-notes.sql`은 `.gitignore`에 있어 추적되지 않습니다.)
2. **배포 파일**: 배포 주소의 `/data.json`이 404인지 열어 보고, `/`의 화면 원본 보기(View Source)에서 메모 문장(위 검색식과 같은 형태)을 찾습니다. 화면의 카드는 `/api/notes` 응답으로 채워지므로 원본에는 문장이 없어야 합니다.
3. 아래 표에 실제로 실행한 결과만 적습니다. 실행하지 않은 칸은 미실행으로 둡니다.

| 확인 | 결과 | 비고 |
| --- | --- | --- |
| GitHub 최신 파일 검색 | 미실행 | |
| 배포 `/data.json` | 미실행 | |
| 배포 `/` 원본의 문장 | 미실행 | |

### 남은 약점 (해소되지 않음)

- **과거 노출은 해소되지 않았습니다.** 옛 공개 커밋(`24bcae9`)의 `data.json`과 옛 배포 주소에는 가상 메모가 남아 있습니다. 이번 변경은 최신 파일만 바꾸며, 옛 커밋·배포 이력을 지우지 않습니다. 위 검색이 통과해도 이 노출이 사라졌다는 뜻이 아닙니다.
- (3단계에서 로그인 확인을 붙임) 위 3단계 약점 목록을 보세요.
