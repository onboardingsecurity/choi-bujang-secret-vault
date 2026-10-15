[← 메인 README(목차)로 돌아가기](../../README.md#단계별-기록-목차)

## 3단계 기록 (4단계에서 일부 바뀜)

- 화면(`/`)에서 Supabase Auth 이메일·비밀번호로 로그인·로그아웃합니다. 로그인 전에는 메모가 보이지 않고, 로그인 실패 이유는 화면에 표시됩니다.
- 서버(`src/notes-api.mjs`)가 요청의 `Authorization: Bearer` 토큰을 `src/verify-login.mjs`로 검사합니다. 토큰이 없거나 검사에 실패하면 자료 없이 401로 거부합니다. 본문의 `userId`·`role`·`owner_id`는 읽지 않고, 추가할 때 `owner_id`는 검사를 통과한 토큰의 사용자 ID로 저장합니다.
- 로그인한 계정은 가상 메모를 추가·수정·삭제할 수 있습니다. 경로는 `GET·POST /api/notes`, `GET·PUT·DELETE /api/notes/:id`이며 `aleph.config.json`의 `allowedRoutes`에 같은 목록이 있습니다. 목록 GET은 내 `owner_id`의 메모만 돌려줍니다.
- 로그인 발급자 정보(`identityProvider`: 발급자·공개키 주소·대상)는 `aleph.config.json`에 있고 비밀 키는 없습니다. 화면 소스에는 키를 적지 않고, 로그인에 쓰는 Project URL과 publishable key는 서버 함수 `/api/config`(환경변수 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`)가 내려 줍니다. 브라우저가 Auth를 직접 호출하므로 이 공개용 값은 실행 중 브라우저에 내려옵니다. 서버 전용 키는 Vercel 환경변수 `SUPABASE_SECRET_KEY`에만 있습니다.
- DB는 `notes` 표에 `note_id uuid`(API의 `id`)와 `service_role`의 추가·수정·삭제 권한을 학생이 SQL Editor에서 직접 더한 상태여야 합니다.
- 다시 실행: `npm run test:r5`로 시험하고, 배포 뒤 시크릿 창에서 로그인 전 화면과 `/api/notes`(401)를 확인한 뒤 가상 계정 A로 로그인해 추가·수정·삭제와 로그아웃을 눌러 봅니다. `npm run bundle`의 자기 점검은 토큰 없는 요청과 가짜 토큰 요청만 보내며, 로그인 상태 점검은 미실행으로 남깁니다.

### 3단계의 약점과 4단계 후 상태

- 소유자 검사가 없던 약점과 `owner_id`가 빈 메모를 id로 조회할 수 있던 약점은 4단계에서 API와 RLS로 막았습니다(위 [4단계 기록](step-04.md) 참고).
- 409로 id의 존재가 드러나는 점, 요청 횟수 제한이 없는 점, 옛 공개 커밋과 배포 이력의 노출은 해소되지 않았습니다.

