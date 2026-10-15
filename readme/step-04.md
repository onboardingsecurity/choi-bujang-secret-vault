[← 메인 README(목차)로 돌아가기](../README.md#단계별-기록-목차)

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

