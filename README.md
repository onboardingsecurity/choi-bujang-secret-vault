# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 단계별 기록 목차

이 README에는 설치·실행·중지·복구 안내와 이 목차만 둡니다. 단계별 기록은 `docs/readme/` 폴더의 파일로 나눠 두었습니다. 처음 오는 사람과 다른 코딩 도구는 아래 표에서 단계를 찾아 링크를 여세요. 각 파일의 글은 나누기 전 README의 글을 그대로 옮긴 것이고, 다른 절을 가리키던 말만 링크로 바꿨습니다.

- 저장점을 갱신할 때는 해당 단계(또는 보너스) 파일에 쓰고, 이 표의 요약·결과 칸도 함께 고칩니다. 이 README에는 지금 작동하는 기능과 다시 실행하는 방법만 짧게 둡니다.
- 「심판 결과」 칸은 기록에 적힌 학생 보고를 옮긴 것입니다. 적혀 있지 않은 것은 통과가 아니라 "기록 없음" 또는 "미확인"입니다. 자세한 내용은 [심판 결과와 해결 기록](docs/readme/judge-results.md)을 보세요.
- 단계마다 있는 「확인 기록」과 「남은 약점」은 코딩 도구가 직접 돌린 연습이며 심판 판정이 아닙니다.

| 단계 | 파일 | 한 줄 요약 | 심판 결과(학생 보고) |
| --- | --- | --- | --- |
| 1단계 | 이 README 맨 위 「학생이 하는 일: 세 걸음」 | GitHub 저장소와 Vercel 배포를 만들고 가상 메모 공개 상태를 확인하는 출발점 | 기록 없음(1단계 판정은 포털에서 확인) |
| 2단계 | [docs/readme/step-02.md](docs/readme/step-02.md) | 정적 `data.json`을 없애고 가상 메모 문장이 저장소·배포에 없는지 검색으로 확인 | 기록 없음 |
| 3단계 | [docs/readme/step-03.md](docs/readme/step-03.md) | Supabase Auth 이메일·비밀번호로 로그인·로그아웃, 로그인 전에는 메모 숨김 | 기록 없음 |
| 4단계 | [docs/readme/step-04.md](docs/readme/step-04.md) | 서버가 로그인한 사용자와 메모의 `owner_id`를 비교해 본인 메모만 읽기·수정·삭제 | 기록 없음 |
| 5단계 | [docs/readme/step-05.md](docs/readme/step-05.md) | 브라우저가 Supabase 메모를 직접 부르지 않고 서버 함수로만 접근, 원본 API 주소와 DB 권한 정리 | 통과(재제출 `e59b9b6`, `S05_ORIGINAL_URL_MISSING` 뒤) |
| 6단계 | [docs/readme/step-06.md](docs/readme/step-06.md) | 등록한 기기만 자료실 읽기(`device_registered`) | 기록 없음 |
| 7단계 | [docs/readme/step-07.md](docs/readme/step-07.md) | 평소와 다른 접속은 추가 확인(`step_up_required`) | 통과(3차, `S07_SAME_VERDICT` 두 번 뒤) |
| 8단계 | [docs/readme/step-08.md](docs/readme/step-08.md) | 자료마다 갈 수 있는 구역을 나눔(`own_notes_zone`, `instructor_notice_zone`) | 통과(`S08_OTHER_ZONE_ALLOWED` 뒤) |
| 9단계 | [docs/readme/step-09.md](docs/readme/step-09.md) | 탐지 규칙(`src/detect.mjs`)으로 이상 접속을 찾고 접속 회수를 제안 | 통과(`S09_NO_PROPOSAL` 뒤) |
| 10단계 | [docs/readme/step-10.md](docs/readme/step-10.md) | 백업 사본에서 정책과 메모를 검증한 뒤 복원 (검증 절차는 이 README 아래 「10단계 일부」) | 통과(`S10_BACKUP_UNVERIFIED` 두 번 뒤) |
| 11단계 | [docs/readme/step-11.md](docs/readme/step-11.md) | 설치형 웹앱과 기기 승인(패스키) | 통과(제출한 커밋 기록 없음) |
| 12단계 | [docs/readme/step-12.md](docs/readme/step-12.md) + 이 README의 「설치·실행·중지·복구 안내」 | 탈환 작전실과 설치·실행·중지·복구 안내 | 통과(13번째 제출 `434cace`) |
| 보너스: 웹 주입 | [docs/readme/bonus-web-injection.md](docs/readme/bonus-web-injection.md) | 웹 요청에 섞인 SQL·스크립트·경로 이동·명령 구분자 주입 반복을 판단 | 미확인(학생 보고 없음) |
| 보너스: 무차별 로그인 | [docs/readme/bonus-brute-force.md](docs/readme/bonus-brute-force.md) | 짧은 시간에 몰린 로그인 실패(같은 주소의 연속 실패, 여러 계정에 같은 비밀번호)를 판단 | 미확인(학생 보고 없음) |
| 보너스: 알려진 취약점 | [docs/readme/bonus-known-cve.md](docs/readme/bonus-known-cve.md) | CVE-2021-44228(Log4j) 형태 요청을 판단 | 미확인(학생 보고 없음) |
| 보너스: 몰래 심어진 프로그램 | [docs/readme/bonus-persistence.md](docs/readme/bonus-persistence.md) | 서명 없는 새 서비스, 처음 보는 예약 작업, 시작 폴더 변경을 판단 | 미확인(학생 보고 없음) |
| 보너스: 권한 가로채기 | [docs/readme/bonus-privilege.md](docs/readme/bonus-privilege.md) | 평범한 계정의 관리자 그룹 추가·처음 보는 관리자 명령 같은 권한 상승을 판단 | 미확인(학생 보고 없음) |
| 보너스: 큰 전송 유출(`exfiltration`) | 없음 | 구현하지 않았습니다 | 해당 없음 |

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

(1단계 당시 기록. 2단계부터 `/data.json`은 없고 로그인해야 메모가 보입니다.) 배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

(1단계 당시 기록. 지금 `aleph.config.json`에는 실제 저장소·배포 주소가 들어 있고 `step`은 12입니다.) `aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

## 설치·실행·중지·복구 안내 (12단계)

검사한 커밋은 `93d1e41`입니다(코드 기준이며 이 안내를 넣는 커밋은 README만 바꿉니다). 아래에서 「실행함」은 2026-10-14에 직접 실행한 결과이고, 심판 판정이 아닙니다. 실행하지 않은 것은 「미실행」으로 적었습니다. 비밀값은 어디에도 적지 않았고, 값이 필요한 곳은 이름만 적었습니다.

### 누가 만들었나

| 구분 | 내용 |
| --- | --- |
| 제공된 시작 틀 (첫 커밋 `24bcae9`) | `docs/`의 요청·사건 계약, `package/` 안내 양식, `xdr/fixtures/` 가상 경보 6종, `scripts/bundle.mjs`·`build-public.mjs`·`deployment-identity.mjs`·`xdr-run.mjs`, 미구현 뼈대 `api/ai.js`·`api/threat-intel.js`(모든 요청에 501). `src/decider.mjs`·`src/detect.mjs`·`src/attack-check.mjs`·`public/index.html`·`src/verify-login.mjs`도 시작점은 시작 틀이었고, 이후 학생이 고쳤습니다. |
| 제공된 **ALEPH SDP 엔진** (이 저장소에 없음) | 요청의 신원·기기·경로를 확인한 뒤 `decide(request)`를 부르는 반 엔진, 사건을 `detect`에 넘기고 접속을 실제로 회수하는 운영 쪽, 심판 접수 서버(`judgeIssuer`). 이 저장소에서는 부를 수 없어서 엔진이 실제 경로에서 부르는 결과, 사건 전달, 접속 회수는 시험하지 못했습니다(미실행). |
| 학생이 만든 것 | 판정기 규칙 5개(`src/decider.mjs`의 `RULE_IDS`), 탐지 규칙(`src/detect.mjs`), 자료실 메모 API(`api/notes/`, `src/notes-api.mjs`), 로그인 검증(`src/verify-login.mjs`), 접속 앱(`public/index.html`, `manifest.webmanifest`, `sw.js`, `offline.html`, 아이콘), 기기 승인(`api/device/`, `src/device-approval.mjs`, `src/device-session.mjs`), 복원(`src/policy-diff.mjs`, `src/policy-restore.mjs`, `api/restore/note.js`, `backup/`), 탈환 작전실(`api/war-room/`, `src/war-room.mjs`), 요청 표(`scripts/recon-table.mjs`), 웹 주입·무차별 로그인 보너스(`xdr/web-injection/`, `xdr/brute-force/`), 시험(`test/`). |

### 설치

1. Node.js 22 이상과 Git이 필요합니다(`package.json`의 `engines`). 이 PC는 Node 24.18.1에서 실행했습니다.
2. 저장소를 받고 저장소 루트에서 `npm install`을 실행합니다. 의존 패키지는 `@simplewebauthn/server`, `@supabase/supabase-js`, `jose` 세 개이며 버전이 고정되어 있습니다.
   - 정상: 종료 코드 0, `found 0 vulnerabilities`(실행함, 새 PC에서 `node_modules` 없이 실행). 이 단계를 건너뛰면 시험이 `ERR_MODULE_NOT_FOUND`로 실패합니다.
3. Vercel에서 이 GitHub 저장소를 새 프로젝트로 연결합니다. 빌드 명령 `npm run build`와 공개 폴더 `public`은 `vercel.json`에 있습니다. 빌드는 Vercel이 주는 저장소·커밋·배포 주소가 없으면 일부러 실패합니다.
4. 환경변수는 Vercel의 비밀 입력란에 직접 넣습니다. 값은 저장소·채팅·화면 캡처에 남기지 않습니다.

   | 이름 | 용도 |
   | --- | --- |
   | `SUPABASE_URL` | Supabase 프로젝트 주소 |
   | `SUPABASE_SECRET_KEY` | 서버 전용 키. 서버 함수만 씁니다 |
   | `SUPABASE_PUBLISHABLE_KEY` | 로그인 화면용 공개 키. `/api/config`로 내려갑니다. 없으면 로그인이 503 |

5. Supabase에 표를 만듭니다. 기기 승인용 `devices`·`device_sessions` 표의 SQL은 아래 [「11단계 현재 상태」](docs/readme/step-11.md)에 있습니다. 메모 표 `public.notes`의 SQL은 이 저장소에 없고 학생이 SQL Editor에서 직접 만들었습니다([5단계 기록](docs/readme/step-05.md)). 새 프로젝트에서 처음부터 복구하려면 이 표 구조와 권한을 다시 만들어야 하며, 이 절차는 미실행입니다.
6. 배포 뒤 `curl -s <배포주소>/aleph.json`의 `"commit"`이 방금 푸시한 커밋으로 시작하는지 봅니다(실행함: `93d1e41` 확인).

### 실행

| 하려는 일 | 명령(저장소 루트) | 정상 결과 | 상태 |
| --- | --- | --- | --- |
| 전체 시험 | `node --test "test/*.test.mjs"` | 143개 통과 | 실행함(진단 코드 정리 뒤) |
| 시작 틀 시험 | `npm run test:package` | 3개 통과 | 실행함 |
| 판정기 연습 | `npm run decider:test` | 4줄 모두 「통과」 | 실행함 |
| 탐지 연습 | `npm run detect:test` | 6줄 모두 「통과」 | 실행함 |
| 배포본 요청 표 | `npm run recon:table` | 실제 API 줄이 모두 「기대와 일치」(일치 19, 다름 0), `artifacts/recon-table.md` 생성 | 실행함(로그인 없는 줄만) |
| 로컬 가상 화면 | `npm run build -- --local` | 가상 화면만 확인. 서버 함수·로그인·패스키는 동작하지 않음 | 미실행 |
| 제출 묶음 | `npm run bundle` | 단계 12, 규칙 5개, 직접 점검 20개(GET만 보냄. 제출 기록에는 요청을 보낸 8건을 `미실행 (…)`, 보내지 않은 12건을 `not_run`·`미실행`으로 적고, 보낸 8건의 실측은 화면 출력에만 나옴) | 학생이 `434cace`로 제출해 통과(13번째 제출, 학생 보고). 시도용 코드를 지운 정리본의 제출 기록이 `434cace`와 같음을 모의로 확인(코딩 도구), 정리본의 심판 재제출은 미확인 |

- 판정기와 탐지 연습은 가상 요청이고 엔진의 실제 결과가 아닙니다. 통과해도 엔진의 사건 전달·접속 회수가 연결됐다는 뜻이 아닙니다.
- 접속 앱 사용: 배포 주소를 열고 로그인 → 「이 기기 승인 요청」 → Supabase SQL Editor에서 `devices`의 그 행을 `approved`로 → 「승인된 이 기기로 확인」 → 자료실과 「탈환 작전실」이 열립니다(2026-10-14 새 Windows PC에서 학생이 실행). 패스키는 고정 배포 주소에만 묶여 로컬에서는 승인할 수 없습니다.

### 중지

서버는 Vercel의 서버 함수라 따로 켜 둔 프로세스가 없습니다. 판정기·탐지·표 명령은 한 번 실행하고 끝나므로 중지할 것이 없습니다(실행 중이면 `Ctrl+C`). 「중지」는 접속을 끊는 일을 뜻합니다.

| 하려는 일 | 방법 | 결과 | 상태 |
| --- | --- | --- | --- |
| 한 기기의 자료 접근 중지 | SQL Editor에서 `update public.devices set status = 'revoked' where id = '<id>' returning id, label, status;` | 그 기기로 확인된 세션도 바로 닫힙니다(자료 API가 요청마다 기기 상태를 다시 봄). 화면에는 주기적으로 상태를 조회하는 타이머가 없고, 상태 조회나 자료 API의 403(`DEVICE_NOT_APPROVED`)을 받을 때 회수를 알고 자료실을 닫습니다. | 실행함(2026-10-14): 시험 기기를 `revoked`로 바꾼 뒤 「추가」를 눌렀더니 Vercel Logs에 `POST /api/notes` 403과 `notes_denied reason=device_not_approved resource=notes.own method=POST`가 14:12:25(GMT+9)에 남음(학생이 줄을 붙여 줌, 화면 사진은 없음). 처음 시도에서 줄이 없던 것은 회수 뒤 메모 요청을 보내지 않고 상태 조회만 했기 때문으로 보임 |
| 탐지가 낸 회수 제안 | `detect()`는 `propose_revocation`을 돌려줄 뿐 실제로 회수하지 않습니다. 회수는 위 SQL로 사람이 합니다. | | 엔진의 실제 회수는 미실행 |
| 서비스 전체 중지 | Vercel 프로젝트의 배포를 내리는 일은 Vercel 대시보드에서 합니다. 이 저장소의 코드는 하지 않습니다. | | 미실행 |

- 한계: 이미 발급된 로그인 토큰은 만료(최대 1시간)까지 서버 검증을 통과합니다. 기기 회수는 그 토큰으로 오는 자료 요청을 403으로 막지만 토큰을 무효로 만들지는 않습니다.

### 복구

복구는 침해 전에 검증한 사본에서 대상만 되돌립니다. 복원 전에 사본을 다시 검증하고, 실패하면 멈추는 규칙은 아래 10단계 절 「복원 전에 사본을 검증합니다」를 따릅니다.

1. 정책 확인: `node src/policy-diff.mjs` → 정상은 `차이 없음`(실행함: 사본 `9단계-통과-시점`, 차이 0건). 다르면 `node src/policy-restore.mjs`로 미리보기를 보고, 실제 변경은 `--apply --confirm=<사본 해시 앞 12자리>`를 함께 줄 때만 합니다.
2. 메모 한 건 복원: 로그인한 승인된 기기에서 `POST /api/restore/note`에 `dryRun: true`를 먼저 보냅니다. 로그인이 없거나 사본에 없는 ID, 소유자가 아닌 계정은 거부됩니다. 실제 배포본의 복원은 이번에 다시 실행하지 않았습니다(미실행, 시험으로는 확인).
3. 잘못 배포했을 때: Git에서는 `git revert <커밋>`으로 되돌리는 커밋을 만들고(`git reset --hard`는 쓰지 않습니다), Vercel의 이전 배포로 되돌리는 일은 Vercel 대시보드에서 합니다. 둘 다 이번에 실행하지 않았습니다(미실행). 기존 메모와 학습 DB 자료를 지우는 명령은 넣지 않았습니다.
4. 기기를 잃어버렸거나 의심스러울 때: 위 「중지」의 회수 SQL. 이 PC를 다시 쓰려면 회수된 행을 되살리지 말고 새로 승인 요청을 합니다.
5. 복구 뒤에는 위 「실행」의 시험과 `npm run recon:table`을 다시 돌려 앞의 정상·거부 결과가 그대로인지 봅니다. 메모·정책 복원 뒤의 1~9단계 순서 표는 아래 [10단계 절 「다시 실행하는 순서」](docs/readme/step-10.md)에 있습니다.

### 재현 순서 (새로 받은 저장소에서)

1. `npm install` → 2. `node --test "test/*.test.mjs"`(143개) → 3. `npm run decider:test`, `npm run detect:test` → 4. 환경변수 세 개를 Vercel에 넣고 배포 → 5. `curl -s <배포주소>/aleph.json`으로 커밋 확인 → 6. `curl -i <배포주소>/api/war-room`이 401과 `X-Resource-Id: warroom.own`(실행함) → 7. `npm run recon:table` → 8. 브라우저에서 로그인·기기 승인·작전실 확인 → 9. `npm run bundle`.

### 새로 확인한 것 (2026-10-14, 학생이 Vercel Logs에서 붙여 준 줄)

- 작전실 화면 수치와 서버 기록의 대조: `war_room_view request=24ba6783-… rules=5 detect=not_connected devices_approved=2 devices_pending=0 devices_revoked=0 policy_verified=true policy_version=9단계-통과-시점 policy_sha=23c296e3423a policy_changed=0 note_verified=true note_version=9단계-통과-시점 note_entries=1`. 줄의 칸 12개는 `recordOf`가 만드는 칸과 같고, 값은 저장소와 맞습니다(규칙 5개, 정책 사본 해시 앞 12자리 `23c296e3423a`, 차이 0건, 메모 사본 1건). 화면에 2가 보였다는 것은 학생 보고이고 화면 사진은 없습니다.
- 회수 뒤 서버의 거부 기록: `POST /api/notes` 403과 `notes_denied reason=device_not_approved resource=notes.own method=POST`(위 「중지」 표 참고).

### 아직 확인하지 못한 것

- 반 엔진이 실제 경로에서 부르는 판정기와 탐지의 결과, 실제 접속 회수, 총공세 41종(목록이 저장소에 없음).
- 로그인 정상 요청 줄(`recon:table`의 로그인 요청). 기기 확인을 마친 로그인 토큰을 터미널로 가져올 방법이 앱에 없어 미실행으로 남겼고, 대신 화면에서 직접 확인했습니다.
- 12단계의 「실행 기록 대조」에서 요청과 attackId를 잇는 방법(끝내 확인하지 못함. 요청을 보낸 8건의 실측은 제출 기록에 없고 학생 PC 화면 출력에만 남음).
- 배포 로그에서 서버 함수 개수 한도 오류 여부(배포는 성공했고 한도 오류는 보지 못했으나 따로 찾아보지 않음).

## 10단계 일부: 복원 전에 사본을 검증합니다 (심판 판정과 연결된 절차)

10단계의 나머지 기록은 [docs/readme/step-10.md](docs/readme/step-10.md)에 있습니다. 아래 절은 심판이 README 문장을 읽을 수 있다는 추정(`S10_BACKUP_UNVERIFIED`, [심판 결과](docs/readme/judge-results.md))에 따라 메인 README에 남겼습니다.

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

