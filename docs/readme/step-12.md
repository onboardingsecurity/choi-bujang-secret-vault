[← 메인 README(목차)로 돌아가기](../../README.md#단계별-기록-목차)

## 12단계 저장점: 탈환 작전실

`aleph.config.json`의 `step`을 12로 올렸습니다. 아래 결과는 직접 돌린 연습이며 심판 판정이 아닙니다. 12단계 심판 제출은 13번째 제출(`434cace`)로 통과했다고 학생이 보고했습니다(심판 화면은 보지 못했습니다).

| 바꾼 곳 | 내용 |
| --- | --- |
| `scripts/deployment-identity.mjs` | 허용 단계에 12를 더했습니다. 13은 거부합니다. |
| `src/attack-check.mjs` | 12단계를 받습니다. 점검 한도가 20개라 새 항목을 늘리지 않고 `forged_device_approval`에 로그인 없는 `GET /api/war-room` 요청을 합쳤습니다. 로그인한 작전실 요청은 보내지 않고 미실행으로 남습니다. GET만 보내고, 쓰기 요청이 필요한 점검은 `not_run`입니다. 요청마다 요청 ID(`x-request-id`)를 붙이고 응답 본문의 해시를 적습니다. 심판 기록에 연결되지 않은 8건은 제출 기록에 사실대로 `미실행 (…)`으로 적고 실측은 화면 출력에만 남깁니다(위 [「S12_SCREEN_MISMATCH」](judge-results.md)). |
| `test/step12-savepoint.test.mjs` | 11단계 저장점 시험의 이름을 바꾸고 12단계 기대(`step` 12, 13 거부, 작전실 요청 포함)로 고쳤습니다. |

- 판정기(`src/decider.mjs`)는 바꾸지 않았습니다. `RULE_IDS` 5개(`starter.deny`, `device_registered`, `step_up_required`, `own_notes_zone`, `instructor_notice_zone`)는 그대로입니다.
- 확인(2026-10-14, 코딩 도구가 실행): `node --test "test/*.test.mjs"` 142개 통과, `test:package` 3개 통과, `decider:test`·`detect:test` 모두 「통과」, 가짜 Vercel 값으로 만든 빌드 식별이 `step` 12·허용 경로 5개·`restoreRoute`·`originalApiUrl`을 싣고 `step` 13은 거부.
- S12 수정 뒤 확인(2026-10-14, 코딩 도구가 실행): 전체 시험 142개 통과. 새로 받은 저장소에서 `npm install`은 종료 코드 0·취약점 0·잠금 파일 변화 없음. 가상 요청 22종(정상, 미등록, 목록, 공지 수정, 복합 이상, 계약 밖 이름이 섞인 요청, 모양이 틀린 요청 등)에서 판정기가 읽은 이름은 계약의 11개와 그 안의 `signals`·`stepUp`·`recentEvents` 항목뿐이었고(`role`·`identity`·`device`·`geo`는 읽지 않음), 응답은 모두 이름 5개에 `ruleIds`가 `RULE_IDS` 안이었습니다. `requestId`가 없는 입력 5종은 돌려줄 ID가 없습니다(6단계부터의 약점).
- 진단 코드 정리 뒤 확인(코딩 도구가 실행): 전체 시험 143개 통과(지운 진단 시험 12개가 줄어든 숫자), `test:package` 3개 통과, `decider:test` 4줄·`detect:test` 6줄 모두 「통과」, `npm audit` 취약점 0. 같은 가짜 응답으로 `434cace`와 정리본의 `runAttackChecks`를 돌려 비교했을 때 제출 기록(`attackAttempts` 20개)이 글자 하나까지 같았고, 정리본이 보낸 요청은 GET 11개뿐이었습니다(`434cace`는 진단 요청을 더 보냄). 서버의 `guard`·`/api/config`는 진단 줄을 넣기 전(`a09e553`의 바로 앞) 파일과 같습니다.
- 미실행: 정리본의 12단계 심판 재제출, 총공세 41종.

