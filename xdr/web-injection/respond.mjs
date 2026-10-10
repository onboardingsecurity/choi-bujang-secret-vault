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

// 반복 횟수(count)가 없는 낱개 주입 경보를 같은 주소·같은 패턴끼리 시간 창 안에서 합칩니다.
// 어느 패턴인지는 decide의 reason 맨 앞 이름을 그대로 씁니다. 이미 집계된 경보와 정상 경보는 그대로 둡니다.
export function gatherRepeats(alerts, { windowMinutes }) {
  const windowMs = windowMinutes * 60_000;
  const kept = [];
  const groups = new Map();
  alerts.forEach((alert, index) => {
    const time = Date.parse(alert?.timestamp);
    const srcip = alert?.data?.srcip;
    const out = decide(alert);
    const isRaw = alert?.data?.count === undefined && out.action === 'alert'
      && Number.isFinite(time) && typeof srcip === 'string';
    if (!isRaw) { kept.push({ index, alert }); return; }
    const key = `${srcip}\u0000${out.reason.split(':')[0]}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ index, alert, time });
  });
  for (const items of groups.values()) {
    items.sort((a, b) => a.time - b.time);
    for (let from = 0; from < items.length;) {
      let to = from;
      while (to + 1 < items.length && items[to + 1].time - items[from].time <= windowMs) to += 1;
      const group = items.slice(from, to + 1);
      const first = group[0].alert;
      const last = group[group.length - 1].alert;
      kept.push({
        index: group[0].index,
        alert: {
          id: group.length === 1 ? first.id : `${first.id}~${last.id}`,
          timestamp: first.timestamp,
          rule: { level: Math.max(...group.map(item => Number(item.alert.rule?.level) || 0)), description: first.rule.description },
          data: { ...first.data, count: String(group.length) },
        },
      });
      from = to + 1;
    }
  }
  return kept.sort((a, b) => a.index - b.index).map(item => item.alert);
}

// 차단 후보 목록과 알림 로그를 만듭니다. 판정기(src/decider.mjs)에는 연결하지 않습니다.
// block만 후보가 되고, 같은 주소에서 정상 이벤트가 주입 시도 반복 수보다 많으면 그 주소는 후보에서 뺍니다.
export async function respond({ root = ROOT, now = new Date() } = {}) {
  const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'web-injection.json'), 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'web-injection' || !Array.isArray(fixture.alerts)) {
    throw new Error('web-injection 경보 묶음 형식이 아닙니다.');
  }
  const { patterns } = JSON.parse(await readFile(join(HERE, 'patterns.json'), 'utf8'));
  const windowMinutes = patterns[0].condition.windowMinutes;
  if (!(windowMinutes > 0)) throw new Error('patterns.json의 시간 창이 비어 있습니다.');
  const expiresAt = new Date(now.getTime() + BLOCK_MINUTES * 60_000).toISOString();
  const rows = [];
  for (const alert of gatherRepeats(fixture.alerts, { windowMinutes })) {
    rows.push({ alert, row: pickAlert(alert), result: decide(alert) });
  }
  // 주소별로 정상 이벤트 수와 주입 시도 반복 수를 셉니다. 정상이 더 많을 때만 그 주소를 보호합니다.
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
    if (protectedAddresses.has(row.srcip)) { skipped.push({ alertId: alert.id, why: '같은 주소에 정상 이벤트가 주입 시도보다 많습니다' }); continue; }
    if (candidates.some(c => c.srcip === row.srcip)) continue;
    candidates.push({ srcip: row.srcip, expiresAt, alertId: alert.id, reason: result.reason });
  }
  const lines = rows
    .filter(r => r.result.action !== 'record')
    .map(({ alert, row, result }) => [now.toISOString(), result.action, alert.id, row.srcip, row.user, result.confidence, result.reason].map(oneLine).join(' | '));
  await writeFile(join(root, 'xdr', 'web-injection', 'block-candidates.json'),
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
