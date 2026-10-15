[← 메인 README(목차)로 돌아가기](../../README.md#단계별-기록-목차)

## 보너스: 웹 주입 공격 탐지 현재 상태

연습 경보(`xdr/fixtures/web-injection.json`, 가상 26건)만 다루는 부품입니다. 무차별 로그인 보너스와 같은 구조이고, 6~8단계 전이라 ZTNA 판정기(`src/decider.mjs`)에는 연결하지 않았습니다. (보너스 당시 판정기 규칙 `RULE_IDS`는 시작 틀 그대로였고, 6단계에서 `device_registered`가 더해졌지만 이 보너스와는 여전히 연결되지 않았습니다.) 이 결과는 직접 돌린 연습이며 심판 판정이 아닙니다.

- `xdr/web-injection/decide.mjs`: `decide(alert)` 하나만 내보내며 다른 파일·패키지를 불러오지 않고 파일·네트워크도 쓰지 않습니다. 반환은 `{ action, confidence, reason }`이고 0.85 이상 block, 0.5 이상 alert, 그 아래 record입니다. 뚜렷한 신호(SQL 구문, 스크립트 태그, `../` 반복, 명령 구분자)가 같은 주소에서 8번 이상 반복돼야 block입니다. 낱말만 닮은 단서(select, SQL, 스크립트 등)는 설명에 "공격이 아니다"라고 적혀 있어도 alert까지만 올립니다.
- `xdr/web-injection/patterns.json`: 근거 패턴 4개(`sql_injection_repeat`, `script_injection_repeat`, `path_traversal_repeat`, `command_separator_repeat`)와 기준 값입니다. 모두 ATT&CK T1190이 근거이고 `decide.mjs` 맨 위 상수와 값이 같습니다.
- `xdr/web-injection/respond.mjs`: 반복 횟수가 없는 낱개 주입 경보를 같은 주소·같은 패턴끼리 2분 창 안에서 합쳐 `decide`에 넘기고, block만 차단 후보(`block-candidates.json`, 만료 60분·근거 경보 번호 포함)로 만들며 block·alert를 `xdr/alerts.log`에 한 줄씩 쌓습니다. 같은 주소에서 정상 이벤트가 주입 시도보다 많으면 그 주소는 후보에서 뺍니다.
- `xdr/web-injection/read-alerts.mjs`: 경보에서 시각·주소·계정·수준·설명만 뽑고 비밀값 모양은 가립니다. 확인용이며 `decide.mjs`는 불러오지 않습니다.
- 다시 실행: `npm run xdr:run -- web-injection`(결과 `result.json`), `node xdr/web-injection/respond.mjs`(후보·알림), `node xdr/web-injection/read-alerts.mjs`(경보 26건 / 뽑은 줄 26줄 일치 확인), `node --test test/xdr-web-respond.test.mjs`. 산출물(`result.json`, `block-candidates.json`, `alerts.log`)은 Git에서 제외했습니다.

### 기준 값의 출처

- 시간 창 2분(120초)과 SQL 반복 8회: Wazuh 웹 규칙 31152(SQL 주입 반복)의 `timeframe`·`frequency`를 따랐습니다.
- 스크립트·경로·명령 구분자에도 8회를 쓴 것은 연습 경보에 맞춘 이 모듈의 임의 값입니다. Wazuh 31154(스크립트)와 31153(공통 웹 공격)은 10회인데, 연습 경보의 명확한 공격 중 스크립트 9번과 경로 8번이 있어 10을 쓰면 block되지 않기 때문입니다.
- `command_separator_repeat`는 요청 신호 목록(SQL 구문·스크립트 태그·`../` 반복)에 없던 패턴입니다. 연습 경보 wi-06이 명확한 공격이라 같은 T1190 범위에서 더했습니다. 필요 없으면 `patterns.json`과 `decide.mjs`의 같은 항목을 함께 지우면 됩니다.

### 웹 주입 보너스 확인 기록

| 확인 | 실행한 쪽 | 결과 |
| --- | --- | --- |
| 연습 경보 26건의 `xdr:run` | 코딩 도구가 실제 실행 | block 8 / alert 9 / record 9. 명확한 공격 8건 전부 block, 애매한 9건 전부 alert, 정상 9건 전부 record |
| 읽기 모듈의 건수 비교 | 같음 | 경보 26건 / 뽑은 줄 26줄 일치 |
| `test/xdr-web-respond.test.mjs`와 기존 xdr 시험 | 같음 | 19개 통과 |
| 보안·요구 자기 점검 29항목 | 같음 | 28개 통과, 1개 실패(판정기 연결, 아래) |
| 실제 배포 주소·Supabase에 대한 요청 | 미실행 | 이번 보너스는 배포와 DB를 건드리지 않았습니다 |
| `npm run bundle`과 `attack-check.mjs` | 미실행 | 이번 보너스에서 바꾸지 않았고 실행하지 않았습니다 |

### 웹 주입 보너스의 남은 약점 (해소되지 않음)

- **판정기에 연결하지 않았습니다.** 차단 후보는 파일로만 남고 실제 접속 차단은 일어나지 않습니다. 현재 판정기 요청 계약에는 출발 주소 항목이 없습니다.
- **후보 만료(60분)를 강제하는 곳이 없습니다.** 후보 파일은 실행할 때마다 새로 쓰므로 경보가 적은 시점에 다시 돌리면 만료 전에 후보가 사라질 수 있습니다.
- 신호를 경보 설명의 한국어 문구와 요청 주소에서 읽습니다. 연습 경보에는 실제 공격 구문이 없어서 주소의 실제 구문 모양(UNION SELECT, script 태그, `../` 반복)은 가짜 입력 시험으로만 확인했습니다. 다른 문구의 경보는 정상(record)으로 처리되어 놓칠 수 있습니다.
- 시간 창이 고정이라 창 경계에서 나뉜 공격(예: 5건 + 5건)은 둘 다 alert로 남을 수 있습니다.
- IPv6 주소는 후보에서 빠집니다(알림 로그에는 남습니다). `alerts.log`는 계속 쌓이고 정리 규칙이 없습니다.
- 주소 단위 차단뿐이라 주소를 바꾸는 공격과 공용 주소(NAT) 사정은 구분하지 못합니다.
- 기준 값(8회)은 연습 경보에 맞춘 값이고 시험 자료도 가짜입니다. 심판 경보의 형식은 이 저장소에서 확인할 수 없습니다.
- `npm run test:package`는 이전 단계부터 실패했으나, `api/config.js`를 `api/config/index.js`로, `api/_notes.js`를 `src/notes-api.mjs`로 옮겨 통과합니다(주소·동작 불변, 시험·기준표는 고치지 않음).

