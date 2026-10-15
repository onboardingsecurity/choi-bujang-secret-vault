[← 메인 README(목차)로 돌아가기](../README.md#단계별-기록-목차)

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

