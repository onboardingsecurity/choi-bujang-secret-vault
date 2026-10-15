[← 메인 README(목차)로 돌아가기](../../README.md#단계별-기록-목차)

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
2. 정상 결과는 `통과 · 등록 기기의 정상 요청`과 `통과 · 미등록 기기의 가상 요청` 두 줄입니다(7단계 규칙이 더해진 지금은 네 줄이며 위 [7단계 확인 순서](step-07.md)를 따릅니다). 첫 줄은 등록 기기 요청이 `allow`로 허용됐다는 뜻입니다. 둘째 줄은 미등록 기기 요청이 `deny`와 `device_not_registered`로 거부됐다는 뜻이며, 시험이 결정과 이유 코드를 함께 대조합니다.
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

