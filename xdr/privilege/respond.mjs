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
const USER = /^[A-Za-z0-9._-]{1,64}$/;

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
// 현재 판정기 요청 계약(docs/DECIDER_REQUEST.md)에는 계정 이름(srcuser)도 출발 주소(srcip)도 없고, 요청의 subjectId는 가명이라
// 경보의 계정과 이을 근거가 없습니다. 그래서 이 목록은 파일로만 남고 실제 접속 격리는 일어나지 않습니다.
// 규칙의 대상은 계정과 출발 주소의 쌍입니다. 연습 경보에서 user01~user05는 공격과 정상 양쪽에 나오므로 계정만 막으면 정상 로그인이 막히고,
// 주소만 막으면 같은 주소를 쓰는 다른 사용자가 막힐 수 있습니다. 쌍으로 막으면 그 계정이 그 주소에서 올 때만 막힙니다.
// block만 후보가 되고, 같은 쌍에서 정상 이벤트(record)가 공격 시도(record가 아닌 것)보다 많거나, 계정·주소 형식이 아니거나,
// 내부·특수 주소면 후보에서 뺍니다. 한 쌍에 block 경보가 여럿이면 규칙은 한 건이고 근거 경보 번호(alertIds)에 모두 적습니다.
export async function respond({ root = ROOT, now = new Date() } = {}) {
  const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'privilege.json'), 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'privilege' || !Array.isArray(fixture.alerts)) {
    throw new Error('privilege 경보 묶음 형식이 아닙니다.');
  }
  const expiresAt = new Date(now.getTime() + BLOCK_MINUTES * 60_000).toISOString();
  const rows = fixture.alerts.map(alert => ({ alert, row: pickAlert(alert), result: decide(alert) }));

  // 쌍별로 정상 이벤트 수와 공격 시도 수를 셉니다. 정상이 더 많을 때만 그 쌍을 보호합니다.
  const pairOf = row => JSON.stringify([row.user, row.srcip]);
  const tally = new Map();
  for (const { row, result } of rows) {
    const entry = tally.get(pairOf(row)) ?? { normal: 0, attempts: 0 };
    if (result.action === 'record') entry.normal += 1;
    else entry.attempts += 1;
    tally.set(pairOf(row), entry);
  }
  const protectedPairs = new Set([...tally].filter(([, t]) => t.normal > t.attempts).map(([pair]) => pair));

  const candidates = [];
  const skipped = [];
  for (const { alert, row, result } of rows) {
    if (result.action !== 'block') continue;
    if (!USER.test(row.user ?? '')) { skipped.push({ alertId: alert.id, why: '계정 형식이 아닙니다' }); continue; }
    if (!IPV4.test(row.srcip ?? '')) { skipped.push({ alertId: alert.id, why: '주소 형식이 아닙니다' }); continue; }
    if (isInternal(row.srcip)) { skipped.push({ alertId: alert.id, why: '내부·특수 주소는 막지 않습니다' }); continue; }
    if (protectedPairs.has(pairOf(row))) { skipped.push({ alertId: alert.id, why: '같은 계정·주소에 정상 이벤트가 공격 시도보다 많습니다' }); continue; }
    const same = candidates.find(c => c.user === row.user && c.srcip === row.srcip);
    if (same) { same.alertIds.push(alert.id); continue; }
    candidates.push({ user: row.user, srcip: row.srcip, expiresAt, alertIds: [alert.id], reason: result.reason });
  }

  const lines = rows
    .filter(r => r.result.action !== 'record')
    .map(({ alert, row, result }) => [now.toISOString(), result.action, alert.id, row.srcip, row.user, result.confidence, result.reason].map(oneLine).join(' | '));
  await writeFile(join(root, 'xdr', 'privilege', 'block-candidates.json'),
    `${JSON.stringify({ schema: 'aleph.xdr.block-candidates.v1', candidates }, null, 2)}\n`);
  if (lines.length) await appendFile(join(root, 'xdr', 'alerts.log'), `${lines.join('\n')}\n`);
  return { candidates, skipped, logged: lines.length };
}

// 판정기 쪽에서 쓸 수 있는 확인 함수입니다. 계정과 주소가 모두 목록에 있고 만료 시각 전이면 그 규칙을, 아니면 null을 돌려줍니다.
// 지금은 어떤 파일도 이 함수를 부르지 않습니다(위 설명의 이유로 판정기에 연결하지 않음).
export function blockingRule(candidates, user, srcip, now = new Date()) {
  if (!Array.isArray(candidates) || typeof user !== 'string' || typeof srcip !== 'string') return null;
  return candidates.find(c => c?.user === user && c?.srcip === srcip && Date.parse(c.expiresAt) > now.getTime()) ?? null;
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
