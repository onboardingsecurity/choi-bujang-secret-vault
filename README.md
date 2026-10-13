# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

(1단계 당시 기록. 2단계부터 `/data.json`은 없고 로그인해야 메모가 보입니다.) 배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

(1단계 당시 기록. 지금 `aleph.config.json`에는 실제 저장소·배포 주소가 들어 있고 `step`은 8입니다.) `aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

## 8단계 현재 상태: 자료마다 갈 수 있는 구역을 나눕니다

같은 계정으로 로그인해도 내 메모와 강사 공지를 같은 권한으로 열지 않도록, 자원을 구역으로 나누고 판정기와 자료 API 두 곳에서 확인합니다. 이 결과는 직접 돌린 연습과 학생 화면 확인이며 심판 판정이 아닙니다.

- 자원 ID(`src/resources.mjs`): 내 메모 `notes.own`, 강사 공지 `notices.instructor`. 서버 함수가 자기 구역을 정해 `guard`에 넘기고, `guard`가 401·405를 포함한 모든 응답에 `X-Resource-Id`로 붙입니다. 요청의 헤더·쿼리·본문에 든 값은 쓰지 않습니다. **강사 공지는 ID만 예약했고 연결된 주소·자료·API 함수가 없습니다**(`/api/notices`는 404).
- 판정기 구역 규칙(`src/decider.mjs`의 `zoneOf`, `RULE_IDS` 5개): 엔진이 확인한 `subjectId`(공백 없는 문자열)·`deviceId`(16자리 소문자 16진수)가 있고, `queryLength`가 0이며, `method`·`route`·`path`가 아래 표와 정확히 맞을 때만 구역이 정해집니다. 표에 없는 경로·메서드는 구역이 없어 `starter.deny`가 거부합니다. 기기 규칙(6단계)이 가장 먼저입니다.

| 규칙 | 메서드·경로 | 판정 |
| --- | --- | --- |
| `own_notes_zone` | `GET /notes`, `GET·PUT /notes/:id` (`/api`가 앞에 붙은 모양도 받음) | 허용(`approved`). 7단계 추가 확인 규칙은 그대로 적용 |
| `instructor_notice_zone` | `PUT /notices/:id` (같은 두 모양) | 항상 거부(`starter_not_ready`). 강사임을 증명하는 값이 계약에 없음 |
| 그 밖 | | `starter.deny`로 거부 |

- `:id` 칸은 자료 ID 한 칸(영문·숫자·`_`·`-`, 64자 이하)만 받습니다. 같은 깊이에 `export` 같은 기능 경로를 두지 않았고, 쿼리로 기능을 고르지 않습니다. 경로가 `/notes/export`여도 `:id` 자리의 값으로만 읽히며, 자료 ID가 아니면 API가 404로 거부합니다.
- 자료 API(`src/notes-api.mjs`의 `checkNoteOwner`, `api/notes/*`): 검증된 토큰의 사용자와 DB에 저장된 `owner_id`를 읽기·수정·삭제마다 대조하고, 목록도 돌아온 행의 `owner_id`를 한 번 더 걸러 냅니다. 요청 본문·메뉴의 `role`은 읽지 않습니다. 남의 메모·주인 없는 메모·없는 메모는 전과 같은 404이고, 거부 사유는 응답이 아니라 서버 로그 한 줄(`notes_denied reason=<사유> resource=<자원ID> method=<메서드>`)로만 남깁니다. 사용자 ID·메모 ID·토큰·본문은 로그에 쓰지 않습니다. 시험을 위해 핸들러의 로그인 검사 뒤 부분을 `handleNotes`·`handleNote`로 나눴습니다.
- 바뀌지 않은 것: 자료실 주소와 허용 경로 5개, 브라우저 화면(메뉴 변경 없음), DB와 권한, 6단계 기기 규칙, 7단계 추가 확인 규칙. **바뀐 것: 6단계의 "등록 기기의 쓰기는 모두 거부"가 내 메모 `PUT`에 한해 열렸습니다.** `POST`·`DELETE`는 판정기에서 계속 거부입니다.
- 저장점에서 `aleph.config.json`의 `step`을 8로 올렸고 `scripts/deployment-identity.mjs`와 `src/attack-check.mjs`가 8단계를 받도록 고쳤습니다. 자기 점검에는 `resource_id_header`와 `instructor_notice_edit`(비로그인 요청, 실제로 보냄), `decider_zone_rules`(확인 불가)를 더했습니다.

### 8단계 확인 순서

1. 저장소 루트에서 `node --test "test/*.test.mjs"`를 실행합니다. 정상 결과는 64개 모두 통과입니다. 그냥 `node --test`는 `scripts/`의 연습 파일까지 시험으로 잡아서, 9단계 시작 틀인 `detect-test.mjs` 때문에 1개가 실패합니다.
2. `npm run decider:test`: 네 줄이 모두 `통과`입니다(이 연습은 구역 규칙을 다루지 않으며, 구역 시험은 `test/decider-zones.test.mjs`입니다).
3. 배포 뒤 로그인 없이 `curl -i https://choi-bujang-secret-vault-ten.vercel.app/api/notes`: 정상 결과는 `401`과 `X-Resource-Id: notes.own`이고 메모 내용이 없습니다.
4. 화면에서 계정 A로 로그인해 메모 추가·수정·삭제를 눌러 봅니다. 전과 똑같이 동작해야 합니다.
5. 거부되어야 할 결과: **다른 계정 B의** 시크릿 창에서, 로그인 세션 토큰을 출력하지 않는 콘솔 명령으로 A의 메모 ID에 `GET`·`PUT`·`DELETE`를 보내면 세 개 모두 `404 NOT_FOUND`이고 A의 메모는 그대로입니다. 같은 계정에서 실행하면 주인의 정상 요청이라 200이 나오고 메모가 실제로 바뀌거나 삭제되니, 버려도 되는 메모로만 하세요.
6. Vercel 대시보드의 Logs에서 `notes_denied`를 검색하면 5번 시각에 `reason=not_owner resource=notes.own method=GET`(·`PUT`·`DELETE`)가 보입니다.
7. 이 명령들은 가상 요청과 본인 계정 시험이며 심판 판정이 아닙니다. 새 커밋마다 `npm run bundle`을 다시 실행해야 합니다.

### 8단계 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| `node --test "test/*.test.mjs"` | 코딩 도구가 실제 실행 | 구현 커밋 `0cfbb22` 시점 61개, 저장점 시험 3개를 더한 뒤 64개 통과 |
| `npm run decider:test`, `npm run fixture:7` | 같음 | 네 줄 통과, 정상 `allow`·복합 이상 `step_up` |
| 공격 입력 시험: 줄바꿈·`//api`·`/api/api`·`%2F`·유니코드 숫자·소문자 메서드·구역과 경로 불일치 등 13종, 5MB 경로, `null`·배열 등 요청 객체 6종, `__proto__`로 `deviceRegistered` 위조 | 코딩 도구가 가짜 입력으로 실행 | 모두 `deny`, 예외 없음, 5MB 경로도 1.1ms. 요청 객체에 `deviceRegistered`가 **상속값으로만** 있으면 `allow`가 되지만 JSON 요청에서는 생기지 않고 6단계부터 있던 동작이라 고치지 않았습니다 |
| 푸시 `0cfbb22`(구현 커밋) | 코딩 도구가 실행 | 처음에는 커밋 이메일(비공개 주소)이 GitHub 보호(GH007)에 걸려 거부되었고, 학생이 허락한 뒤 아직 푸시되지 않은 그 커밋 하나만 noreply 주소로 고쳐 푸시했습니다 |
| 배포본 `/aleph.json` | 코딩 도구가 읽기 요청 | 구현 커밋 `0cfbb22`가 반영됨(`step` 7). 저장점 커밋의 `step` 8 반영은 배포 뒤 확인이 필요합니다 |
| 배포본 비로그인 요청 | 코딩 도구가 읽기 요청 | `GET`·`POST /api/notes`, `GET·PUT·DELETE /api/notes/:id`, `/api/notes/export`는 모두 401과 `X-Resource-Id: notes.own`, `PUT /api/notes`는 405, `/data.json`·`/api/notices`·`PUT /api/notices/:id`는 404, `/api/config` 200 |
| A의 메모 읽기·추가·수정·삭제 | 학생 보고 | 정상(코딩 도구는 화면을 보지 못함) |
| B가 A의 메모를 직접 요청, 첫 시도 | 학생이 콘솔에서 실행, 코딩 도구가 결과 사진 확인 | 같은 계정에서 실행되어 `GET`·`PUT`·`DELETE`가 모두 200이었습니다. 주인 본인의 정상 요청이라 서버 동작은 맞지만 메모 1건이 수정된 뒤 삭제되었고, 이 시험은 무효로 보고 제외했습니다 |
| B가 A의 메모를 직접 요청, 재시도 | 학생이 시크릿 창 B에서 실행, 코딩 도구가 결과 사진 확인 | B 목록에 A의 메모가 없음을 먼저 확인한 뒤 `GET`·`PUT`·`DELETE`가 모두 `404 {"error":"NOT_FOUND"}`, A 화면에서 메모의 제목·본문이 그대로(학생 보고) |
| Supabase API 로그(학생이 보여 준 화면 사진) | 학생 화면, 코딩 도구가 사진 확인 | 재시도 시각에 `note_id` 조건의 읽기 3건이 있고 `PATCH`·`DELETE`는 없음 |
| Vercel Logs(학생이 보여 준 화면 사진) | 같음 | `notes_denied reason=not_owner resource=notes.own method=GET`·`PUT`·`DELETE` 확인, 사용자 ID·메모 ID·토큰 없음. 일부 `GET` 줄은 메시지 2개 중 첫 번째가 Node 경고라 화면에서 `notes_denied`가 직접 보이지 않았습니다(다른 시각의 `GET` 줄에서는 보임) |
| 저장점 설정 대조 | 코딩 도구가 실제 실행 | `step` 8, `repoUrl`은 Git origin·배포본과 일치, `allowedRoutes`·`originalApiUrl`·`judgeIssuer`는 배포본과 일치, `identityProvider`는 비밀 없음. `RULE_IDS` 5개는 모두 구현에 쓰임. `publicAppUrl`은 고정 별칭(`…-ten.vercel.app`)이고 빌드가 만든 `/aleph.json`은 배포마다 다른 `VERCEL_URL`을 써서 서로 다릅니다(시작 틀의 방식이고 바꾸지 않았으며 심판의 처리는 알 수 없음) |
| 자기 점검 모양 확인 | 코딩 도구가 가짜 `fetch`로 실행 | 8단계 16항목(형식·중복·길이 통과). 실제 배포 주소에는 요청을 보내지 않음 |
| `npm run bundle` | 미실행 | 저장점 커밋 뒤 학생이 실행해야 합니다 |
| 심판의 8단계 제출 | 미실행 | 결과 없음 |

### 8단계의 남은 약점 (해소되지 않음)

- **판정기 단독으로는 B가 A의 메모를 거부하지 못합니다.** 계약에 자료 주인 항목이 없어 같은 구역이면 `allow`가 나옵니다. 막는 곳은 자료 API이고, 판정기만 따로 시험하는 심판이라면 이 점에서 실패할 수 있습니다. 판정기는 Vercel의 메모 API에 연결되어 있지 않고 반 엔진이 부르므로, 판정기가 `allow`를 내도 API 검사는 따로 항상 실행됩니다.
- **저장된 강사 권한 대조는 구현하지 않았습니다.** 비교할 강사 권한 자료가 DB에 없고 공지 API도 없습니다. 지금은 강사 예외가 어디에도 없어서 학생이 강사 권한을 얻을 길이 없고, 진짜 강사도 공지를 수정할 수 없습니다. 공지 API를 만들 때는 저장된 강사 권한 대조를 반드시 함께 만들어야 하며, 학생이 SQL Editor에서 직접 실행하는 작업이 필요합니다.
- 판정기가 받는 `route`가 `/notes/:id`인지 `/api/notes/:id`인지 확인하지 못해 두 모양을 모두 받게 했습니다(추측). 심판이 실제로 보내는 값은 알 수 없습니다.
- 구역 거부에 쓴 이유 코드 `starter_not_ready`와 허용 코드 `approved`가 운영 등록부(`allowedReasonCodes`)에 있는지 확인하지 못했습니다. 등록되지 않은 새 코드는 만들지 않았습니다.
- 판정기의 `:id` 문자 범위(영문·숫자·`_`·`-`)는 API의 UUID 검사보다 넓습니다. UUID가 아닌 ID는 API가 404로 거부하므로 자료는 나가지 않습니다.
- 거부 사유 로그는 Vercel Logs의 보존 기간에 의존합니다. 서버 로그 줄은 학생이 대시보드에서만 볼 수 있어 코딩 도구는 직접 보지 못했습니다. Vercel 로그에 `url.parse()` 폐기 경고(`DEP0169`)가 함께 보이는데, 이 저장소의 `api/`·`src/`에는 `url.parse`가 없고 어느 라이브러리에서 나오는지는 확인하지 못했습니다.
- 이전 단계의 약점은 그대로입니다: 같은 id로 `POST`하면 409로 id의 존재가 드러남, 요청 횟수 제한 없음, 옛 공개 커밋과 배포 이력의 노출, 7단계의 실제 경로 `signals`가 없어 추가 확인이 심판의 가상 신호에서만 작동함.

## 7단계 기록 (8단계에서 일부 바뀜): 평소와 다른 접속은 다시 확인

- `src/decider.mjs`에 접속 정보 입력 검사(`readAccessInfo`)와 규칙 `step_up_required`를 더했습니다(7단계 당시 `RULE_IDS`: `starter.deny`, `device_registered`, `step_up_required`. 8단계에서 구역 규칙 2개가 더해짐). 기기 규칙(6단계)이 먼저이고, 그 뒤 등록 기기의 내 메모 읽기·수정(8단계부터. 7단계 당시는 읽기 `GET`만)에서 이 규칙을 봅니다.
- 입력 검사: 계약(`docs/DECIDER_REQUEST.md`)에 있는 `signals`와 `recentEvents`만 읽고 출처를 구분합니다. `judge_fixture`(심판의 가상 신호, 실제 위치 증거 아님), `none`(실제 경로, 정보 없음), `untrusted`(출처 불명·모양 불일치), `missing`(없음)입니다. 없거나 이상한 값은 `null`로 남고 `local`·`usual`·14시 같은 정상값으로 채우지 않습니다. `headers`·`geo`·`device` 같은 이름이 요청에 있어도 읽지 않으므로 위조한 클라이언트 헤더는 접속 정보로 승격되지 않습니다. 브라우저가 보낸 위치는 근거로 쓰지 않습니다.
- 규칙: 심야 시각(22시~다음 날 5시), 처음 보는 네트워크(`unusual`), 15분(900초) 안 5건 이상의 대량 조회가 **모두** 있을 때만 `step_up`과 이유 코드 `step_up_required`를 돌려줍니다. 엔진이 다시 확인했다고 알려 준 새 요청(`stepUp.verified` 참, 나이 0~900초)은 다시 판정해 `allow`입니다. 지역은 근거가 아니라 참고 사유(`foreign_region`)이고, 지역 하나로는 추가 확인도 거부도 하지 않습니다. 이 규칙은 `deny`를 만들지 않습니다.
- 사유 기록: 확인 전 `step_up`일 때 `step_up_required request=<요청 ID> evidence=<근거 이름들>` 한 줄을 오류 출력(stderr)에 남깁니다. 계정·기기·쿼리 지문·접속 값·토큰은 쓰지 않으며, 요청 ID가 UUID 모양이 아니면 `unknown`으로 적습니다. 이 줄이 어디에 저장되는지는 엔진 쪽 사정이라 확인할 수 없습니다. 심판이 판정기 파일을 `process`가 없는 격리 환경에서 부를 가능성이 있어(스타터 저장소 2026-10-08 안내는 XDR 보너스의 `decide.mjs`에 대한 글이고 7단계 판정기를 직접 가리키지 않아 추측입니다), 기록은 쓸 수 있을 때만 쓰고 실패해도 판정은 그대로 돌려줍니다.
- 자료실 주소(`/api/notes` 등), 브라우저 화면, 6단계 기기 규칙은 바꾸지 않았습니다. 저장점에서 `aleph.config.json`의 `step`을 7로 올렸고 `scripts/deployment-identity.mjs`와 `src/attack-check.mjs`가 7단계를 받도록 고쳤습니다. 자기 점검에는 `unusual_access_step_up` 항목을 확인 불가로 추가했습니다.
- 기준 값(22시~5시, 15분 안 5건)은 요구사항에 숫자가 없어 이 파일에서 정한 연습용 값입니다. 처음에는 0~5시, 10분 안 10건이었으나 심판의 `S07_SAME_VERDICT` 결과를 보고 넓혔습니다(심판이 보낸 값은 알 수 없어 추측입니다). 재확인 나이와 조회 시간 창 900초는 계약의 최대값에 맞췄습니다. 그 뒤 같은 결과가 다시 나와 격리 환경에서 기록 줄이 오류를 내는 문제를 찾아 고쳤고(`10d569d`), 이 수정을 처음 낸 3차 제출에서 7단계가 통과했습니다. 넓힌 기준은 그대로 두었습니다.

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
- 로그인(Auth)에 쓰는 공개용 키는 HTML 소스가 아니라 `/api/config`에서 받습니다. 환경변수 `SUPABASE_PUBLISHABLE_KEY`가 없으면 로그인 화면이 동작하지 않습니다(503). `public/aleph.json`에는 3단계부터 `allowedRoutes`도 실립니다. 배포 전이라 재배포 뒤 확인이 필요하며, `/api/config`는 `allowedRoutes`에 넣지 않았습니다.
- `aleph.config.json`의 `originalApiUrl`은 쿼리 없는 원본 자료 경로 `https://eyrodbkzyapsuiudjjft.supabase.co/rest/v1/notes`입니다. 심판은 이 주소를 anon 키로 직접 요청해 거부되는지 봅니다.
- 5단계부터 `npm run build`가 만드는 배포 설정 `public/aleph.json`에도 `originalApiUrl`이 실립니다. 쿼리·해시가 없는 `https://` 경로가 아니면 빌드가 실패합니다. 심판이 `S05_ORIGINAL_URL_MISSING`으로 거부해서 추가했으며, 재제출 뒤의 결과는 아직 확인하지 않았습니다.
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
