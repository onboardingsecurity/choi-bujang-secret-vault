import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';
import { pickAlert } from './read-alerts.mjs';

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

// 거부 규칙 목록(차단 후보)과 알림 로그를 만듭니다. 판정기(src/decider.mjs)에는 연결하지 않습니다.
// 현재 판정기 요청 계약에는 출발 주소 항목이 없어, 이 목록은 파일로만 남고 실제 접속 차단은 일어나지 않습니다.
// block만 후보가 되고, 완전한 구문 한 번이면 뚜렷해 건수 기준은 두지 않습니다.
// 같은 주소에서 정상 이벤트가 공격 시도보다 많거나, 주소 형식이 아니거나, 내부·특수 주소면 후보에서 뺍니다.
export async function respond({ root = ROOT, now = new Date() } = {}) {
  const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'known-cve.json'), 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'known-cve' || !Array.isArray(fixture.alerts)) {
    throw new Error('known-cve 경보 묶음 형식이 아닙니다.');
  }
  const expiresAt = new Date(now.getTime() + BLOCK_MINUTES * 60_000).toISOString();
  const rows = fixture.alerts.map(alert => ({ alert, row: pickAlert(alert), result: decide(alert) }));

  // 주소별로 정상 이벤트 수와 공격 시도 수를 셉니다. 정상이 더 많을 때만 그 주소를 보호합니다.
  const tally = new Map();
  for (const { alert, row, result } of rows) {
    const entry = tally.get(row.srcip) ?? { normal: 0, attempts: 0 };
    if (result.action === 'record' && result.confidence === 0) entry.normal += 1;
    else if (result.action !== 'record') entry.attempts += Number(alert.data?.count) || 1;
    tally.set(row.srcip, entry);
  }
  const protectedAddresses = new Set([...tally].filter(([, t]) => t.normal > t.attempts).map(([ip]) => ip));

  const candidates = [];
  const skipped = [];
  for (const { alert, row, result } of rows) {
    if (result.action !== 'block') continue;
    if (!IPV4.test(row.srcip ?? '')) { skipped.push({ alertId: alert.id, why: '주소 형식이 아닙니다' }); continue; }
    if (isInternal(row.srcip)) { skipped.push({ alertId: alert.id, why: '내부·특수 주소는 막지 않습니다' }); continue; }
    if (protectedAddresses.has(row.srcip)) { skipped.push({ alertId: alert.id, why: '같은 주소에 정상 이벤트가 공격 시도보다 많습니다' }); continue; }
    if (candidates.some(c => c.srcip === row.srcip)) continue;
    candidates.push({ srcip: row.srcip, expiresAt, alertId: alert.id, reason: result.reason });
  }

  const lines = rows
    .filter(r => r.result.action !== 'record')
    .map(({ alert, row, result }) => [now.toISOString(), result.action, alert.id, row.srcip, row.user, result.confidence, result.reason].map(oneLine).join(' | '));
  await writeFile(join(root, 'xdr', 'known-cve', 'block-candidates.json'),
    `${JSON.stringify({ schema: 'aleph.xdr.block-candidates.v1', candidates }, null, 2)}\n`);
  if (lines.length) await appendFile(join(root, 'xdr', 'alerts.log'), `${lines.join('\n')}\n`);
  return { candidates, skipped, logged: lines.length };
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
