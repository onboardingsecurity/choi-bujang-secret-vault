import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { decide, readAccessInfo, RULE_IDS } from '../src/decider.mjs';

const { normal, suspicious } = fixtureRequests();
const none = { source: 'none', region: 'unknown', network: 'unknown', hour: 0 };
const UNKNOWN = { virtual: false, region: null, network: null, hour: null };

test('심판의 가상 신호는 출처 judge_fixture와 virtual로 표시되어 읽힌다', () => {
  const info = readAccessInfo(normal);
  assert.deepEqual(info.signals, { origin: 'judge_fixture', virtual: true, region: 'local', network: 'usual', hour: 14 });
  assert.deepEqual(info.events, []);
  const odd = readAccessInfo(suspicious);
  assert.deepEqual(odd.signals, { origin: 'judge_fixture', virtual: true, region: 'foreign', network: 'unusual', hour: 3 });
  assert.deepEqual(odd.events, [{ kind: 'risk_signal', ageSeconds: 60, count: 20 }]);
});

test('실제 경로(source none)는 정보 없음으로 읽고 어떤 값도 채우지 않는다', () => {
  assert.deepEqual(readAccessInfo({ ...normal, signals: none }).signals, { origin: 'none', ...UNKNOWN });
  // source가 none인데 지역·네트워크가 unknown이 아니면 모순이므로 믿지 않는다.
  assert.deepEqual(readAccessInfo({ ...normal, signals: { ...none, region: 'local' } }).signals, { origin: 'untrusted', ...UNKNOWN });
  assert.deepEqual(readAccessInfo({ ...normal, signals: { ...none, network: 'usual' } }).signals, { origin: 'untrusted', ...UNKNOWN });
});

test('위조한 클라이언트 헤더·위치 이름은 읽지 않고 신뢰하는 접속 정보로 승격되지 않는다', () => {
  const forged = {
    ...normal, signals: none, recentEvents: [],
    headers: { 'x-forwarded-for': '203.0.113.9', 'x-vercel-ip-country': 'KR', 'x-device-registered': 'true' },
    clientHeaders: { 'x-region': 'local' }, geo: { country: 'KR' }, device: { approved: true }, role: 'instructor',
    region: 'local', network: 'usual', hour: 14,
  };
  assert.deepEqual(readAccessInfo(forged).signals, { origin: 'none', ...UNKNOWN });
  // signals 안에 헤더 이름을 끼워 넣어도 계약의 네 이름이 아니므로 출처 불명으로 본다.
  const stuffed = { ...normal, signals: { ...normal.signals, headers: { 'x-forwarded-for': '203.0.113.9' } } };
  assert.deepEqual(readAccessInfo(stuffed).signals, { origin: 'untrusted', ...UNKNOWN });
});

test('출처가 judge_fixture·none이 아니면 값이 그럴듯해도 출처 불명이다', () => {
  for (const source of ['header', 'x-forwarded-for', 'browser', 'geoip', 'client', 'JUDGE_FIXTURE', '', null, 1, undefined]) {
    const info = readAccessInfo({ ...normal, signals: { ...normal.signals, source } });
    assert.deepEqual(info.signals, { origin: 'untrusted', ...UNKNOWN }, String(source));
  }
});

test('없거나 이상한 값은 null로 남고 정상값으로 채워지지 않는다', () => {
  const bad = (patch) => readAccessInfo({ ...normal, signals: { ...normal.signals, ...patch } }).signals;
  assert.equal(bad({ region: 'unknown' }).region, null);
  assert.equal(bad({ region: 'abroad' }).region, null);
  assert.equal(bad({ region: undefined }).region, null);
  assert.equal(bad({ network: 'unknown' }).network, null);
  assert.equal(bad({ network: 7 }).network, null);
  for (const hour of [-1, 24, 3.5, '3', null, undefined, NaN, Infinity]) assert.equal(bad({ hour }).hour, null, String(hour));
  assert.equal(bad({ hour: 0 }).hour, 0);
  assert.equal(bad({ hour: 23 }).hour, 23);
  // 값 하나가 이상해도 나머지 정상 항목은 그대로이고, 이상한 항목만 알 수 없음이다.
  assert.deepEqual(bad({ region: 'abroad' }), { origin: 'judge_fixture', virtual: true, region: null, network: 'usual', hour: 14 });
  for (const missing of [undefined, null, 'x', 5, [], true]) {
    assert.deepEqual(readAccessInfo({ ...normal, signals: missing }).signals, { origin: 'missing', ...UNKNOWN }, String(missing));
  }
  for (const request of [undefined, null, {}, 'x']) {
    assert.deepEqual(readAccessInfo(request), { signals: { origin: 'missing', ...UNKNOWN }, events: null });
  }
});

test('최근 사건은 모양이 하나라도 틀리면 전체가 null이고 빈 배열로 채워지지 않는다', () => {
  const events = recentEvents => readAccessInfo({ ...normal, recentEvents }).events;
  const good = { kind: 'risk_signal', ageSeconds: 5, count: 2 };
  assert.deepEqual(events([good]), [good]);
  assert.deepEqual(events([]), []);
  for (const bad of [undefined, null, 'x', {}, [null], [{ ...good, extra: 1 }], [{ kind: 'risk_signal', ageSeconds: 5 }],
    [{ ...good, kind: 'Risk Signal' }], [{ ...good, kind: 7 }], [{ ...good, ageSeconds: -1 }], [{ ...good, ageSeconds: '5' }],
    [{ ...good, ageSeconds: NaN }], [{ ...good, count: 1.5 }], [{ ...good, count: -1 }], [{ ...good, count: '2' }],
    [good, null], Array.from({ length: 13 }, () => good)]) {
    assert.equal(events(bad), null, JSON.stringify(bad));
  }
  assert.equal(events(Array.from({ length: 12 }, () => good)).length, 12);
});

test('입력 검사를 더해도 판정 결과는 그대로이고 위조 헤더로 미등록 기기가 통과하지 못한다', async () => {
  assert.ok(RULE_IDS.includes('device_registered'));
  const allow = await decide(normal);
  assert.equal(allow.decision, 'allow');
  assert.equal(allow.reasonCode, 'approved');
  const forged = { ...normal, deviceRegistered: false, headers: { 'x-device-registered': 'true' },
    device: { registered: true }, signals: { ...normal.signals, source: 'header' } };
  const denied = await decide(forged);
  assert.equal(denied.decision, 'deny');
  assert.equal(denied.reasonCode, 'device_not_registered');
  assert.equal((await decide(null)).decision, 'deny');
});
