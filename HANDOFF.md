# 10단계 핸드오프 (백업에서 자료실을 되살립니다)

기준 시점: 2026-10-13. 코드는 `f0db501`까지 푸시했고 작업 폴더는 깨끗합니다. 이 파일은 아직 커밋하지 않았습니다. 비밀값은 없습니다.

## 지금 상태 한 줄 요약
10단계 구현과 저장점 커밋은 끝났고, **배포 확인 → `npm run bundle` → 1~9단계 재확인 → 심판 제출**이 남았습니다. 시험은 107개 통과이며 직접 돌린 연습이라 심판 판정이 아닙니다.

## 만든 기능

| 기능 | 파일 | 실행 |
| --- | --- | --- |
| 정책 차이 보기 | `src/policy-diff.mjs`, `backup/policy.v1.json` | `node src/policy-diff.mjs` |
| 정책 되돌리기 | `src/policy-restore.mjs` | `node src/policy-restore.mjs`(미리보기), 실제는 `--apply --confirm=<해시 앞 12자리>` |
| 메모 한 건 복원 | `api/restore/note.js`, `src/note-restore.mjs`, `backup/note.v1.json`, `scripts/note-backup.mjs` | `POST /api/restore/note` (`dryRun: true`로 실행 전 확인) |

## 내가 해야 할 일 (위에서부터 차례로)

1. **배포 확인**
   - Vercel에서 `f0db501` 배포가 Ready인지 봅니다.
   - 실행: `curl -s https://choi-bujang-secret-vault-ten.vercel.app/aleph.json`
   - 정상: `"step": 10`, `"commit"`이 `f0db501`로 시작, `"restoreRoute": "POST /api/restore/note"`.
   - 이전 값이면 1~2분 뒤 다시 실행합니다.
2. **제출 묶음 만들기** (배포 주소로 실제 요청을 보냅니다)
   - 실행: `npm run bundle`
   - 정상: `단계 10 · 커밋 f0db501… · 규칙 5개 · 직접 점검 20개`.
   - 오류가 나면 첫 오류 한 줄만 근거로 한 가지만 고칩니다.
3. **1~9단계 재확인** — README 「10단계 현재 상태」의 표 순서를 따릅니다. 아래 미실행 칸을 채웁니다.
4. **README 기록 갱신** — 2·3번 결과를 알려 주면 `npm run bundle`과 미실행 줄을 실제 결과로 고칩니다. 이 변경은 커밋·푸시가 따로 필요합니다.
5. **심판 제출** — 배포본 커밋이 최신인지 확인한 뒤 제출합니다. 결과가 거부면 코드와 사유 코드를 그대로 알려 주세요.

## 아직 하지 않은 확인 (미실행)

| 항목 | 방법 | 정상 / 거부되어야 할 결과 |
| --- | --- | --- |
| 배포본 `/data.json` | `curl -i <배포주소>/data.json` | 404 |
| 로그인 없는 요청 | `curl -i <배포주소>/api/notes` | 401, `X-Resource-Id: notes.own`, 메모 내용 없음 |
| 로그인 화면과 메모 추가·수정·삭제 | A로 로그인해 화면에서 누름 | 정상 동작. 로그아웃 상태에서는 메모가 안 보임 |
| B가 A의 메모를 요청(8단계 5번) | B 시크릿 창에서 A의 메모 ID로 `GET`·`PUT`·`DELETE` | 모두 404, A의 메모는 그대로. **같은 계정에서 실행하면 실제로 바뀌거나 삭제되니 버려도 되는 메모만 사용** |
| 정책 되돌리기의 배포본 반영 | 설정을 되돌린 뒤 푸시·배포, `/aleph.json`의 `allowedRoutes` 확인 | 사본과 같은 5개 |
| 심판 제출 | 포털 | 아직 제출하지 않음 |

이미 확인한 것: 시험 107개, `decider:test` 4줄, `detect:test` 6줄, `fixture:7`, 정책 차이 없음, B의 메모 복원(추가·수정·무변경·`dryRun`), A의 복원·읽기 요청 404와 A의 정상 목록 200, B 메모 유지, Vercel Logs의 `notes_denied` 줄(학생 보고).

## 지켜야 할 것

- 세션 토큰·비밀번호·서버 전용 키는 코드, Git, 채팅, 콘솔 출력에 넣지 않습니다. 콘솔 복원 명령은 토큰을 출력하지 않는 형태만 씁니다.
- 본문 원본은 `backup/private/`(Git 제외)에만 있습니다. 분실하면 그 메모는 복원할 수 없으니 따로 보관하세요.
- `bundle-notes.json`과 `artifacts/submission.json`은 커밋하지 않습니다. 설명은 10단계 내용으로 이미 바꿔 두었습니다.
- `judgeIssuer`와 `identityProvider`는 바꾸지 않습니다.
- 되돌리기 요청이 오면 `git status`·`git diff`로 변경을 구분하고 `git reset --hard`는 쓰지 않습니다.

## 알려진 약점 (README 「10단계의 남은 약점」 참고)

- 사본의 신뢰는 Git 이력에 달려 있습니다(파일과 해시를 함께 바꾸면 통과). 사본은 `3cc7a2f`, `4389517`에 있습니다.
- `restoreRoute`가 `allowedRoutes`에 없다는 이유로 심판이 거부할 수도 있습니다. 거부 사유가 이것이면 첫 수정은 `allowedRoutes`에 넣는 것이 아니라 먼저 사유 코드를 확인하는 것입니다(정책 사본과 어긋나면 `node src/policy-diff.mjs`가 차이를 보입니다).
- 정책 되돌리기는 `allowedRoutes`만 고칩니다. 판정기 규칙 코드는 `git` 이력으로 직접 확인합니다.
- 복원 성공은 서버 로그 줄을 남기지 않고, 감사 이력을 따로 저장하는 곳이 없습니다.

## 다음 세션에 줄 첫 프롬프트 (복사해서 사용)

```
이 폴더는 1~10단계까지 만든 같은 자료실이야. HANDOFF.md, AGENTS.md, README.md의 「10단계 현재 상태」, git status, git log -1을 읽고 마지막 커밋과 README 기록이 맞는지 대조해 줘. 어긋나면 먼저 알려 줘. 아직 아무 파일도 고치지 마. 내가 npm run bundle 결과와 배포본 확인 결과를 하나씩 알려 줄게.
```
