import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';
import { pickAlert } from './pick-alert.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const BLOCK_MINUTES = 60;
const OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4 = new RegExp(`^${OCTET}(\\.${OCTET}){3}$`);

// 로그는 한 줄에 한 건이라, 줄바꿈과 구분자 |는 공백으로 바꿔 한 줄 형식이 깨지지 않게 합니다.
const oneLine = value => String(value ?? '').replace(/[\r\n|]+/g, ' ').trim();

// 낱개 로그인 실패 경보(count·accounts가 없는 실패 경보)를 같은 주소끼리 시간 창 안에서 합칩니다.
// 합친 경보는 이미 집계된 경보와 같은 모양(data.count, 5계정 이상이면 data.accounts)이라 decide를 고치지 않아도 됩니다.
// 이미 집계된 경보와 실패가 아닌 경보는 그대로 둡니다. 시간 창과 계정 기준은 patterns.json에서 읽습니다.
export function gatherFailures(alerts, { windowMinutes, minAccounts }) {
  const windowMs = windowMinutes * 60_000;
  const kept = [];
  const byAddress = new Map();
  alerts.forEach((alert, index) => {
    const time = Date.parse(alert?.timestamp);
    const description = alert?.rule?.description;
    const data = alert?.data ?? {};
    const isRawFailure = typeof description === 'string' && description.includes('실패')
      && data.count === undefined && data.accounts === undefined
      && Number.isFinite(time) && typeof data.srcip === 'string';
    if (!isRawFailure) { kept.push({ index, alert }); return; }
    if (!byAddress.has(data.srcip)) byAddress.set(data.srcip, []);
    byAddress.get(data.srcip).push({ index, alert, time });
  });
  for (const [srcip, items] of byAddress) {
    items.sort((a, b) => a.time - b.time);
    for (let from = 0; from < items.length;) {
      let to = from;
      while (to + 1 < items.length && items[to + 1].time - items[from].time <= windowMs) to += 1;
      const group = items.slice(from, to + 1);
      const users = [...new Set(group.map(item => item.alert.data.srcuser).filter(Boolean))];
      const spraying = users.length >= minAccounts;
      const firstId = group[0].alert.id;
      const lastId = group[group.length - 1].alert.id;
      kept.push({
        index: group[0].index,
        alert: {
          id: group.length === 1 ? firstId : `${firstId}~${lastId}`,
          timestamp: group[0].alert.timestamp,
          rule: {
            level: Math.max(...group.map(item => Number(item.alert.rule.level) || 0)),
            description: `같은 주소에서 ${windowMinutes}분 안에 로그인 실패 ${group.length}건이 쌓였습니다.${spraying ? ` 서로 다른 계정 ${users.length}개.` : ''}`,
          },
          data: {
            srcip,
            srcuser: users.length === 1 ? users[0] : `${users.length}개 계정`,
            count: String(group.length),
            ...(spraying ? { accounts: users.join(',') } : {}),
          },
        },
      });
      from = to + 1;
    }
  }
  return kept.sort((a, b) => a.index - b.index).map(item => item.alert);
}

// 차단 후보 목록과 알림 로그를 만듭니다. 판정기(src/decider.mjs)에는 연결하지 않습니다.
// block만 후보가 되고, 같은 주소에서 순수한 정상 이벤트(실패와 무관한 record)가 실패 건수보다 많으면 그 주소는 후보에서 뺍니다.
export async function respond({ root = ROOT, now = new Date() } = {}) {
  const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'brute-force.json'), 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'brute-force' || !Array.isArray(fixture.alerts)) {
    throw new Error('brute-force 경보 묶음 형식이 아닙니다.');
  }
  const { patterns } = JSON.parse(await readFile(join(HERE, 'patterns.json'), 'utf8'));
  const windowMinutes = patterns[0].condition.windowMinutes;
  const minAccounts = patterns[1].condition.minAccounts;
  if (!(windowMinutes > 0) || !(minAccounts > 0)) throw new Error('patterns.json의 시간 창·계정 기준이 비어 있습니다.');
  const expiresAt = new Date(now.getTime() + BLOCK_MINUTES * 60_000).toISOString();
  const rows = [];
  for (const alert of gatherFailures(fixture.alerts, { windowMinutes, minAccounts })) {
    rows.push({ alert, row: pickAlert(alert), result: decide(alert) });
  }
  // 주소별로 정상 이벤트 수와 실패 수를 셉니다. 정상이 실패보다 많을 때만 그 주소를 보호합니다.
  // 공격자가 같은 주소에서 정상 로그인 한두 번으로 후보에서 빠지는 것을 막기 위해서입니다.
  const tally = new Map();
  for (const { alert, row, result } of rows) {
    const entry = tally.get(row.srcip) ?? { normal: 0, failures: 0 };
    if ((alert.rule?.description ?? '').includes('실패')) entry.failures += Number(alert.data?.count) || 1;
    else if (result.action === 'record') entry.normal += 1;
    tally.set(row.srcip, entry);
  }
  const protectedAddresses = new Set([...tally].filter(([, t]) => t.normal > t.failures).map(([ip]) => ip));
  const candidates = [];
  const skipped = [];
  for (const { alert, row, result } of rows) {
    if (result.action !== 'block') continue;
    if (!IPV4.test(row.srcip ?? '')) { skipped.push({ alertId: alert.id, why: '주소 형식이 아닙니다' }); continue; }
    if (protectedAddresses.has(row.srcip)) { skipped.push({ alertId: alert.id, why: '같은 주소에 정상 이벤트가 실패보다 많습니다' }); continue; }
    if (candidates.some(c => c.srcip === row.srcip)) continue;
    candidates.push({ srcip: row.srcip, expiresAt, alertId: alert.id, reason: result.reason });
  }
  const lines = rows
    .filter(r => r.result.action !== 'record')
    .map(({ alert, row, result }) => [now.toISOString(), result.action, alert.id, row.srcip, row.user, result.confidence, result.reason].map(oneLine).join(' | '));
  await writeFile(join(root, 'xdr', 'brute-force', 'block-candidates.json'),
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
