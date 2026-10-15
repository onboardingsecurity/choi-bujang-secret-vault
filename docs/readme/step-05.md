[← 메인 README(목차)로 돌아가기](../../README.md#단계별-기록-목차)

## 5단계 현재 상태

- 브라우저 코드(`public/index.html`)에는 메모 자료를 Supabase에서 직접 읽거나 고치는 곳이 없습니다. Supabase 호출은 로그인(`signInWithPassword`·`signOut`·`getSession`·`onAuthStateChange`)뿐이고, 메모 읽기·추가·수정·삭제는 `/api/notes`와 `/api/notes/:id` 서버 함수로만 갑니다. 서버 함수의 로그인·소유자 검사와 서버 전용 설정(`SUPABASE_URL`, `SUPABASE_SECRET_KEY`)은 4단계 그대로입니다.
- 로그인(Auth)에 쓰는 공개용 키는 HTML 소스가 아니라 `/api/config`에서 받습니다. 환경변수 `SUPABASE_PUBLISHABLE_KEY`가 없으면 로그인 화면이 동작하지 않습니다(503). `public/aleph.json`에는 3단계부터 `allowedRoutes`도 실립니다. 배포본에 실린 것은 8단계 저장점 대조에서 확인했으며(8단계 확인 기록), `/api/config`는 `allowedRoutes`에 넣지 않았습니다.
- `aleph.config.json`의 `originalApiUrl`은 쿼리 없는 원본 자료 경로 `https://eyrodbkzyapsuiudjjft.supabase.co/rest/v1/notes`입니다. 심판은 이 주소를 anon 키로 직접 요청해 거부되는지 봅니다.
- 5단계부터 `npm run build`가 만드는 배포 설정 `public/aleph.json`에도 `originalApiUrl`이 실립니다. 쿼리·해시가 없는 `https://` 경로가 아니면 빌드가 실패합니다. 심판이 `S05_ORIGINAL_URL_MISSING`으로 거부해서 추가했고, 재제출에서 5단계를 통과했습니다(학생 보고). 배포본 `/aleph.json`에 `originalApiUrl`이 실린 것은 8단계 저장점 대조에서 코딩 도구가 확인했습니다.
- DB(`public.notes`): 학생이 SQL Editor에서 `revoke all on table public.notes from public, anon, authenticated;`와 `service_role`의 SELECT·INSERT·UPDATE·DELETE `grant`를 직접 실행했습니다. 이 SQL은 저장소에 없습니다. RLS 켬과 정책 4개(`notes_*_own`)는 남겨 두었으며, 권한이 없으므로 직접 접근에는 쓰이지 않는 두 번째 방어선입니다. 아래 [4단계 기록](step-04.md)의 `authenticated` 권한 설명은 이 변경으로 대체됩니다. API 응답의 `body`는 DB 열 `content`입니다.
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

