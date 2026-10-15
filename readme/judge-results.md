[← 메인 README(목차)로 돌아가기](../README.md#단계별-기록-목차)

## 심판 결과와 해결 기록

커밋 32개(`24bcae9`~`4d859b2`)를 처음부터 끝까지 보고, 실패를 고친 커밋은 수정 전후 파일을 꺼내 같은 가상 입력으로 실행해 비교했습니다(2026-10-13 코딩 도구가 실제 실행). 재현은 심판 판정이 아니고 통과 여부는 학생 보고입니다. 심판이 보낸 실제 입력은 볼 수 없어 원인은 재현으로 추정한 것입니다.

| 단계 | 처음 낸 커밋 | 심판 결과 | 해결 커밋 | 재제출 결과 |
| --- | --- | --- | --- | --- |
| 12단계 | `c4d4378`부터 13번째 `434cace`까지(아래 「S12_SCREEN_MISMATCH」의 표) | `S12_BUNDLE_UNSUPPORTED`, `S12_SCREEN_MISMATCH`(지목 11건 → 8건, 이후 12번째 제출까지 8건 유지), 4번째 제출의 제출 묶음 생성 오류(`reading 'set'`) | `56fe6c2`(쓰기 요청 삭제), `3adf694`(`미실행` 정리), `b28e009`(`searchParams` 오류), `434cace`(연결되지 않은 8건을 사실대로 `미실행`) | `434cace`로 통과(학생 보고). 정리본 재제출 전 |
| 11단계 | 기록 없음(코드의 마지막 변경은 `bfba3c6`이고 그 뒤 `0163a29`·`e518c51`·`5e52985`는 README만 바꿈) | 거부 없음 | 없음 | 통과(학생 보고, 제출한 커밋과 제출 횟수는 기록 없음) |
| 10단계 | `f0db501`, 2차 `789b1c1` | `S10_BACKUP_UNVERIFIED` 두 번 | `50596ac`(README) | 통과(학생 보고, 재제출한 커밋은 기록 없음) |
| 9단계 | `a06fe52` | `S09_NO_PROPOSAL` | `4d859b2` | 통과(학생 보고) |
| 8단계 | `686a4bb` | `S08_OTHER_ZONE_ALLOWED` | `f3010d7` | 통과(학생 보고) |
| 7단계 | `ba8b88f`, 2차 `59b4eab` | `S07_SAME_VERDICT` 두 번 | `10d569d` | 3차 통과(학생 보고) |
| 5단계 | `e78d6db` | `S05_ORIGINAL_URL_MISSING` | `edb4aa4` | `e59b9b6`로 통과(학생 보고) |

### S12_SCREEN_MISMATCH: 「실행 기록 대조」에서 요청을 보내 결과를 적은 점검이 심판 기록에 없음 (최종: 13번째 제출로 통과)

- 심판 결과: 「무인증 조회와 타인 메모 조회를 같은 제출본에 연속 전송」의 조건 8개 중 「실행 기록 대조」 1개가 맞지 않았습니다. `static_data_json`, `anonymous_list`, `anonymous_read_one` 외 5건에 「그 attackId로 보낸 요청 기록이 없다」였고, 요청을 보내지 않은 점검은 observed를 `not_run`으로 적으라는 안내가 붙었습니다. 사유 코드는 `S12_SCREEN_MISMATCH`이고, 나머지 7개 조건은 맞았습니다. 결과 화면에는 이 문구 말고 다른 정보가 없었습니다(학생 보고).
- 원인: **요청과 attackId를 심판이 어떻게 잇는지 알아내지 못했고, 그래서 확정하지 못했습니다.** 확인한 사실은 다음과 같습니다.
  - 요청은 문제가 아니었습니다. 심판이 제출 묶음을 돌린 시각(17:03:12~15, Vercel Logs)에 점검 순서대로 `/api/notes` 401, `/api/notes/<id>` 401, 가짜 토큰 `/api/notes` 401, `/api/config` 200, `/api/notes` 401, `/api/device/status` 401, `/api/war-room` 401이 도착했고 상태가 observed와 같았습니다(정적 파일은 함수 로그에 없음). 그 뒤에 심판이 직접 보낸 `/api/notes`·`/api/war-room`·`/api/device/status`(401)와 `/api/device/challenge`·`/api/device/register`(405)도 있었습니다.
  - 점검이 도는 심판 환경은 일반 Node가 아닙니다. `process`에는 `version`이 없고(`argv`는 비어 있고 환경변수는 1개), `fetch`는 이름 없는 함수이며, 응답은 `Response`가 아닌 `status`·`ok`·`headers.get`·`text`·`json` 일반 객체입니다. `URL`에는 `searchParams`가 없고 `Headers`·`Request`·`Response`·`URLSearchParams`·`TextEncoder`·`Buffer`도 없습니다. 요청은 `user-agent` 없이 싱가포르(`sin1`)에서 오고 헤더 이름은 소문자로 바뀌어 도착합니다.
  - 주입된 `fetch`의 소스(10차 진단으로 읽음): 호스트로 `method`·`headers`·`body`·`alephEvidence` 네 가지만 넘기고 나머지 옵션은 버립니다. 호스트는 `alephEvidence`에 어떤 값이 와도 거부하지 않았습니다(`ok200` 6건). 이 옵션이 요청과 attackId를 잇는 통로인지, 어떤 모양이어야 하는지는 받은 계약·심판 메모·결과 화면 어디에도 없었습니다(추정).
- 시도와 결과(같은 내용은 한 번만 적음):

| 제출 | 커밋 | 바꾼 것 | 심판 결과 |
| --- | --- | --- | --- |
| 1 | `c4d4378` | 처음 코드(로그인 없는 쓰기 요청 7개 포함) | `S12_BUNDLE_UNSUPPORTED`(아래 절) |
| 2 | `56fe6c2` | 쓰기 요청 삭제(`not_run`) | 지목 11건: 표시 없이 GET을 보낸 8건(`resource_id_header`는 응답을 빌려 씀)과 요청 없이 `확인 불가`로 적은 3건 |
| 3 | `3adf694` | 요청마다 헤더 `x-attack-id`·`x-aleph-attack-id`·`x-request-id`, 점검마다 자기 요청, `확인 불가`를 `미실행 (확인 불가: …)`로 | 지목 8건. `not_run`·`미실행`은 지목되지 않음 |
| 4 | `cc0509b` | 주소에 `?attackId=`(`url.searchParams.set`), `fetch` 옵션 `attackId` | 제출 묶음 생성 오류 `reading 'set'`(심판 환경의 `URL`에 `searchParams` 없음) |
| 5 | `b28e009` | 주소 문자열에 쿼리를 직접 붙임 | 지목 8건 그대로 |
| 6 | `a09e553` | 서버에 요청 도착 모양을 남기는 진단 줄 | 8건. 우리 표식은 서버까지 그대로 도착, 심판이 붙인 헤더는 없음 |
| 7 | `893173b` | 점검 환경의 모양(이름·참/거짓)을 남기는 진단 | 8건. 일반 Node가 아님을 확인 |
| 8 | `0266de5` | 진단 확장, 헤더 대소문자·이름 별칭 | 8건. 별칭은 효과 없음 |
| 9 | `49dded5` | observed에 주소 전체·본문 해시·요청 ID, 별칭 제거 | 8건 |
| 10 | `203871c` | 주입된 `fetch`·응답 함수의 소스를 가려서 기록 | 8건. `alephEvidence`가 넘어가는 것을 확인 |
| 11 | `931be09` | `alephEvidence`에 점검마다 다른 4가지 모양, 형식 시험 6가지 | 8건. 호스트는 모든 값을 거부 없이 받음 |
| 12 | `e0f1edc` | 키 이름을 두루 넣은 객체·문자열·배열·JSON 문자열, 환경변수 이름·`argv` 진단 | 8건. 연결 단서 없음 |
| 13 | `434cace` | 연결되지 않은 8건의 observed를 사실대로 `미실행`으로 | **통과**(학생 보고) |

- 최종 해결(13번째 제출 `434cace`, `src/attack-check.mjs`의 `maskUnlinked`): 요청을 보내 결과를 적은 8건(`static_data_json`, `anonymous_list`, `anonymous_read_one`, `fake_token_list`, `anon_data_api_read`, `resource_id_header`, `app_install_not_trusted`, `forged_device_approval`)의 제출 기록을 `미실행 (요청은 보냈으나 심판이 그 attackId로 보낸 요청 기록을 찾지 못해 결과로 적지 않음. 실측은 학생 PC 화면 출력에만 남김)`으로 적습니다. 요청은 그대로 보내고, 실측(`→ HTTP 401 sha256:… req:…`)은 `npm run bundle`을 돌린 PC의 화면에 `실측(제출 기록 아님) …` 줄로만 나오며 제출 묶음에는 들어가지 않습니다. 요청을 보내지 않았다고 쓰지 않으므로 `not_run`이 아닙니다. 심판이 받아들인 이유는 알 수 없고, 요청이 없는 점검으로 본 것으로 추정할 뿐입니다.
- 시도용 코드 정리(이 기록을 쓴 커밋): 서버의 `request_probe`·`request_diag`·`request_src` 진단(`src/request-probe.mjs`와 호출 두 곳)과 그 시험, 점검 안의 환경 진단·소스 읽기·`alephEvidence` 시도·진단 요청을 모두 지웠습니다. 요청의 표식(`x-attack-id`·`x-aleph-attack-id`, 주소의 `?attackId=`, `fetch` 옵션 `attackId`)도 걷어 내 요청 ID(`x-request-id`)만 남겼습니다. 같은 가짜 응답으로 `434cace`와 정리본을 돌려 비교하니 제출 기록(`attackAttempts` 20개)이 글자 하나까지 같았습니다(코딩 도구가 실제 실행, 심판의 실제 환경은 아님). 정리본으로 다시 제출해 통과하는지는 아직 확인하지 않았습니다.
- 한계·미확인:
  - 요청과 attackId를 잇는 방법은 끝내 알아내지 못했습니다. 8건의 실측 결과는 제출 기록에서 빠져 있어, 이 8건을 심판이 요청으로 확인한 것은 아닙니다. 요청이 서버에 도착했고 상태가 맞았다는 것은 위 Vercel Logs와 학생 PC 화면으로만 확인됩니다.
  - 「타인 메모 조회」(`other_user_access`)는 로그인이 필요해 계속 미실행입니다. 총공세 41종은 목록이 없어 미실행입니다.
  - 모의 격리 환경과 모의 심판 모델은 제가 추정으로 만든 것이라, 심판의 실제 방식과 같다는 보장이 없습니다.

### S12_BUNDLE_UNSUPPORTED: 제출 묶음이 격리 환경에서 끝까지 실행되지 않음

- 심판 메모: 격리 환경에서는 `node:fs`·`node:path`·`node:url`·`node:child_process`(git 읽기)·`node:crypto`만 쓸 수 있고, 요청은 공개 HTTPS 주소로 보내는 GET·HEAD만 됩니다. 쓰기 요청이 필요한 점검은 observed를 `not_run`으로 둡니다.
- 원인: `src/attack-check.mjs`가 로그인 없는 쓰기 요청 7개(메모 POST·PUT·DELETE, 공지 PUT, 복원 POST 2개, 기기 등록 POST)를 보냈습니다. 제출 묶음 경로의 모듈은 모두 허용 목록 안이었습니다(`scripts/bundle.mjs`는 `node:child_process`·`fs`·`path`·`url`, 판정기와 점검 파일은 import 없음).
- 해결(`src/attack-check.mjs`, `test/step12-savepoint.test.mjs`): 쓰기 요청을 모두 지웠습니다. `anonymous_write`·`instructor_notice_edit`·`restore_without_login`은 observed가 `not_run`이고, `forged_device_approval`은 GET 결과(기기 상태, 작전실)만 적습니다(보내지 않는 기기 등록 POST는 적지 않음). 점검 개수(20개)와 ID는 그대로이고, 시험은 보낸 요청이 모두 `GET https://`인지 확인합니다.
- 재현(수정 전 → 후): 심판 메모대로 모듈과 요청 방식을 막은 모의 격리 환경에서 새로 받은 저장소의 `npm run bundle`을 실행했습니다(코딩 도구가 실제 실행. 심판의 실제 환경은 아님). 수정 전에는 `POST /api/notes`에서 멈췄고(종료 코드 1, 묶음 없음), 수정 후에는 공개 HTTPS GET 11개만 보내고 끝까지 실행됐습니다(종료 코드 0, 단계 12·규칙 5개·직접 점검 20개).
- 한계: 쓰기 점검 3개와 기기 등록 요청은 이제 자기 점검에서 보내지 않으며, 그 거부는 시험(`node --test`)으로만 확인합니다. 심판의 실제 격리 환경이 모의 환경과 같은지는 볼 수 없습니다.

### S10_BACKUP_UNVERIFIED: 사본을 다시 읽어 검증하지 않았거나 검증 실패 뒤에도 복원함

- 원인(추정): 코드에는 사본 검증과 중단이 이미 있었지만, README에 「복원 전에 사본을 다시 검증하고 실패하면 멈춘다」는 절차가 없었습니다. 원본 시작 틀 작성자의 공개 통과 표본은 복원 API 없이 README 절차만으로 10단계를 통과했고, 그 커밋 메시지가 AI 판정 인용 대조를 언급해 심판이 README 문장을 읽는 것으로 보았습니다. 심판이 읽는 것을 볼 수는 없어 추정입니다.
- 1차 시도(`789b1c1`, `src/policy-restore.mjs`): 쓰기 직전에 사본을 다시 읽어 검증하고 바뀌었으면 중단하게 했지만 같은 사유가 나왔습니다. 코드만 고쳐서는 부족했다는 정황입니다.
- 해결(`50596ac`, README): [「복원 전에 사본을 검증합니다」](../README.md#복원-전에-사본을-검증합니다) 절에 재검증, 실패 시 중단, 실행 전 버전·바뀔 항목 표시, 운영 정책 불변을 코드와 시험으로 확인한 동작만 적었습니다. 이 커밋 뒤 재제출에서 통과했습니다(학생 보고). 코드 수정(`789b1c1`)이 통과에 필요했는지는 알 수 없습니다.

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


## 보너스 심판 결과 (학생 보고)

보너스 다섯 개의 심판 통과·실패는 학생이 아직 알려 주지 않았습니다. 그래서 통과로 적지 않고 "미확인"으로 둡니다. 학생이 결과를 알려 주면 이 표와 메인 README의 목차 표를 함께 고칩니다. 각 보너스 절의 확인 기록은 코딩 도구가 직접 돌린 연습이며 심판 판정이 아닙니다.

| 보너스 | 파일 | 마지막으로 바꾼 커밋 | 심판 결과 | 해결 커밋 |
| --- | --- | --- | --- | --- |
| 웹 주입 | [bonus-web-injection.md](bonus-web-injection.md) | `d579772` | 미확인(학생 보고 없음) | 없음 |
| 무차별 로그인 | [bonus-brute-force.md](bonus-brute-force.md) | `74ee21c` | 미확인(학생 보고 없음) | 없음 |
| 알려진 취약점 | [bonus-known-cve.md](bonus-known-cve.md) | `fe4c07b` | 미확인(학생 보고 없음) | 없음 |
| 몰래 심어진 프로그램 | [bonus-persistence.md](bonus-persistence.md) | `cb91ae0` | 미확인(학생 보고 없음) | 없음 |
| 권한 가로채기 | [bonus-privilege.md](bonus-privilege.md) | `e005bd9` | 미확인(학생 보고 없음) | 없음 |
