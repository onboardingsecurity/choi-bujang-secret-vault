# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

## 5단계 현재 상태

- 브라우저 코드(`public/index.html`)에는 메모 자료를 Supabase에서 직접 읽거나 고치는 곳이 없습니다. Supabase 호출은 로그인(`signInWithPassword`·`signOut`·`getSession`·`onAuthStateChange`)뿐이고, 메모 읽기·추가·수정·삭제는 `/api/notes`와 `/api/notes/:id` 서버 함수로만 갑니다. 서버 함수의 로그인·소유자 검사와 서버 전용 설정(`SUPABASE_URL`, `SUPABASE_SECRET_KEY`)은 4단계 그대로입니다.
- `aleph.config.json`의 `originalApiUrl`은 쿼리 없는 원본 자료 경로 `https://eyrodbkzyapsuiudjjft.supabase.co/rest/v1/notes`입니다. 심판은 이 주소를 anon 키로 직접 요청해 거부되는지 봅니다.
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

- 서버(`api/_notes.js`, `api/notes/index.js`, `api/notes/[id].js`)가 검증된 사용자 ID와 DB의 `owner_id`를 비교합니다. 읽기·수정·삭제는 본인 메모만 되고, 남의 메모와 `owner_id`가 빈 메모는 없는 메모와 같은 404로 거부합니다(id의 존재를 알려 주지 않음). 수정·삭제는 SQL 조건에도 `owner_id = 본인`을 다시 걸어 확인 직후 바뀌는 경우도 막습니다.
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
- 서버(`api/_notes.js`)가 요청의 `Authorization: Bearer` 토큰을 `src/verify-login.mjs`로 검사합니다. 토큰이 없거나 검사에 실패하면 자료 없이 401로 거부합니다. 본문의 `userId`·`role`·`owner_id`는 읽지 않고, 추가할 때 `owner_id`는 검사를 통과한 토큰의 사용자 ID로 저장합니다.
- 로그인한 계정은 가상 메모를 추가·수정·삭제할 수 있습니다. 경로는 `GET·POST /api/notes`, `GET·PUT·DELETE /api/notes/:id`이며 `aleph.config.json`의 `allowedRoutes`에 같은 목록이 있습니다. 목록 GET은 내 `owner_id`의 메모만 돌려줍니다.
- 로그인 발급자 정보(`identityProvider`: 발급자·공개키 주소·대상)는 `aleph.config.json`에 있고 비밀 키는 없습니다. 화면에 들어간 Project URL과 publishable key는 공개용 값입니다. 서버 전용 키는 Vercel 환경변수 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`에만 있습니다.
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
