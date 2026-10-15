import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';
import { pickAlert, redact } from './read-alerts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const BLOCK_MINUTES = 60;
const OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4 = new RegExp(`^${OCTET}(\\.${OCTET}){3}$`);

// 로그는 한 줄에 한 건이라, 줄바꿈과 구분자 |는 공백으로 바꿔 한 줄 형식이 깨지지 않게 합니다.
const oneLine = value => String(value ?? '').replace(/[\r\n|]+/g, ' ').trim();

// 우리 쪽 망이거나 특수 주소면 거부 규칙에 넣지 않습니다. 정상 사용자와 내 PC를 막지 않기 위해서입니다.
// 문서용 대역(192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)은 연습 경보에서 쓰므로 막지 않는 주소로 보지 않습니다.
function isInternal(ip) {
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

// 거부 규칙 목록(차단 후보)과 알림 로그를 만듭니다. 판정기(src/decider.mjs)와 decide.mjs에는 손대지 않습니다.
// decide.mjs는 판단 결과만 돌려주고, 파일 쓰기는 이 파일만 합니다.
// 현재 판정기 요청 계약(docs/DECIDER_REQUEST.md)에는 목적지(dstip)도 출발 주소(srcip)도 계정(srcuser)도 없으므로, 이 목록을 판정기가 읽어 실제로 접속을 거부하는 연결은 없습니다.
// 그래서 이 목록은 파일로만 남고 실제 목적지 차단은 일어나지 않습니다. 계약에 없는 항목을 만들어 쓰지 않기로 했습니다. 운영 쪽이 계약에 값을 더해야 풀립니다.
// 이번 규칙의 대상은 목적지 주소입니다(과제가 "그 목적지를 막는다"고 했습니다). 목적지 규칙은 그 목적지로 가는 모든 사용자에게 걸리므로
// 앞 보너스(계정과 출발 주소의 쌍)보다 엄격하게, 정상 전송이 한 건이라도 그 목적지로 간 기록이 있으면 후보에서 뺍니다.
// block만 후보가 되고, 한 목적지에 block 경보가 여럿이면 규칙은 한 건이고 근거 경보 번호(alertIds)에 모두 적습니다.
// 이 기준(정상 한 건이라도 있으면 제외)은 연습 경보 30건에 맞춘 이 모듈의 값입니다. 정상 전송이 섞여 있는 목적지를 놓치는 대신 정상 사용자를 막지 않는 쪽을 골랐습니다.
export async function respond({ root = ROOT, now = new Date() } = {}) {
  const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'exfiltration.json'), 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'exfiltration' || !Array.isArray(fixture.alerts)) {
    throw new Error('exfiltration 경보 묶음 형식이 아닙니다.');
  }
  const expiresAt = new Date(now.getTime() + BLOCK_MINUTES * 60_000).toISOString();
  // 읽기 모듈은 목적지를 뽑지 않으므로(요구사항 1번은 다섯 값만) 목적지만 여기서 따로 읽고, 비밀값 모양은 같은 방식으로 가립니다.
  const rows = fixture.alerts.map(alert => ({ alert, row: pickAlert(alert), dstip: redact(alert?.data?.dstip), result: decide(alert) }));

  // 목적지마다 정상 이벤트(record)가 한 건이라도 있으면 그 목적지는 보호합니다.
  const withNormal = new Set(rows.filter(r => r.result.action === 'record' && r.dstip).map(r => r.dstip));

  const candidates = [];
  const skipped = [];
  for (const { alert, dstip, result } of rows) {
    if (result.action !== 'block') continue;
    if (!IPV4.test(dstip ?? '')) { skipped.push({ alertId: alert.id, why: '목적지 주소 형식이 아닙니다' }); continue; }
    if (isInternal(dstip)) { skipped.push({ alertId: alert.id, why: '내부·특수 주소는 막지 않습니다' }); continue; }
    if (withNormal.has(dstip)) { skipped.push({ alertId: alert.id, why: '정상 전송이 같은 목적지로 간 기록이 있습니다' }); continue; }
    const same = candidates.find(c => c.dstip === dstip);
    if (same) { same.alertIds.push(alert.id); continue; }
    candidates.push({ dstip, expiresAt, alertIds: [alert.id], reason: result.reason });
  }

  const lines = rows
    .filter(r => r.result.action !== 'record')
    .map(({ alert, row, dstip, result }) => [now.toISOString(), result.action, alert.id, row.srcip, row.user, result.confidence, `${result.reason} (목적지 ${dstip ?? '없음'})`].map(oneLine).join(' | '));
  await writeFile(join(root, 'xdr', 'exfiltration', 'block-candidates.json'),
    `${JSON.stringify({ schema: 'aleph.xdr.block-candidates.v1', candidates }, null, 2)}\n`);
  if (lines.length) await appendFile(join(root, 'xdr', 'alerts.log'), `${lines.join('\n')}\n`);
  return { candidates, skipped, logged: lines.length };
}

// 판정기 쪽에서 쓸 수 있는 확인 함수입니다. 목적지가 목록에 있고 만료 시각 전이면 그 규칙을, 아니면 null을 돌려줍니다.
// 지금은 어떤 파일도 이 함수를 부르지 않습니다(위 설명의 이유로 판정기에 연결하지 않음).
export function blockingRule(candidates, dstip, now = new Date()) {
  if (!Array.isArray(candidates) || typeof dstip !== 'string') return null;
  return candidates.find(c => c?.dstip === dstip && Date.parse(c.expiresAt) > now.getTime()) ?? null;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { candidates, skipped, logged } = await respond();
    process.stdout.write(`차단 후보 ${candidates.length}건 / 제외 ${skipped.length}건 / 알림 ${logged}줄\n`);
  } catch (error) {
    process.stderr.write(`respond 첫 오류: ${error.message}\n`);
    process.exitCode = 1;
  }
}
