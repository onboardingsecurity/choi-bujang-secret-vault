import test from 'node:test';
import assert from 'node:assert/strict';
import { detect, findCompoundSuspects, readDetectEvent, readDetectEvents } from '../src/detect.mjs';
import { checkDetection } from '../scripts/detect-test.mjs';

const normal = { at: '2026-10-01T00:00:00.000Z', method: 'GET', identity: { sub: 'learner_fixture' },
  deviceId: '0123456789abcdef', decision: 'allow' };
const suspicious = { ...normal, at: '2026-10-01T03:00:00.000Z', decision: 'step_up' };

test('정상 사건과 의심 사건에서 다섯 값만 읽는다', () => {
  assert.deepEqual(readDetectEvent(normal), { at: normal.at, method: 'GET', subject: 'learner_fixture',
    deviceId: '0123456789abcdef', decision: 'allow', network: null });
  assert.equal(readDetectEvent(suspicious).decision, 'step_up');
});

test('계약의 세 값만 있는 사건도 읽고 기기·판정은 null', () => {
  const event = readDetectEvent({ at: normal.at, method: 'GET', identity: { sub: 'learner_fixture' } });
  assert.deepEqual(event, { at: normal.at, method: 'GET', subject: 'learner_fixture', deviceId: null, decision: null, network: null });
});

test('메모 내용·토큰·실명 같은 다른 이름은 결과에 복사하지 않는다', () => {
  const dirty = { ...normal, body: 'MEMO_TEXT', token: 'TOKEN_VALUE', name: '홍길동',
    identity: { sub: 'learner_fixture', email: 'a@example.com', token: 'TOKEN_VALUE' } };
  const text = JSON.stringify(readDetectEvent(dirty));
  for (const secret of ['MEMO_TEXT', 'TOKEN_VALUE', '홍길동', 'example.com']) assert.ok(!text.includes(secret));
  assert.deepEqual(Object.keys(readDetectEvent(dirty)), ['at', 'method', 'subject', 'deviceId', 'decision', 'network']);
});

test('이상한 필수 값은 사건을 버리고 값은 남기지 않는다', () => {
  const bad = [null, 'x', [], {}, { ...normal, at: 'yesterday' }, { ...normal, at: '2026-10-01' },
    { ...normal, method: 'get' }, { ...normal, method: 'TRACE' },
    { ...normal, identity: { sub: '홍길동' } }, { ...normal, identity: { sub: 'a b' } },
    { ...normal, identity: { sub: 'x'.repeat(65) } }, { ...normal, identity: 'learner_fixture' }];
  for (const raw of bad) assert.equal(readDetectEvent(raw), null);
});

test('이상한 기기·판정 값은 null로 낮추고 사건은 유지한다', () => {
  for (const deviceId of ['ABCDEF0123456789', '0123', 5, {}]) assert.equal(readDetectEvent({ ...normal, deviceId }).deviceId, null);
  for (const decision of ['ALLOW', 'revoke', 1]) assert.equal(readDetectEvent({ ...normal, decision }).decision, null);
});

test('상속된 값은 읽지 않는다', () => {
  const inherited = Object.create({ at: normal.at, method: 'GET', identity: { sub: 'learner_fixture' } });
  assert.equal(readDetectEvent(inherited), null);
});

test('목록 읽기: 쓸 수 있는 사건과 버린 건수', () => {
  const result = readDetectEvents([normal, null, suspicious, { ...normal, method: 'X' }]);
  assert.equal(result.events.length, 2);
  assert.equal(result.rejected, 2);
  assert.throws(() => readDetectEvents('x'), /invalid_detection_events/);
  assert.throws(() => detect(undefined), /invalid_detection_events/);
});

test('사건이 너무 많으면 앞쪽만 읽고 나머지는 버린 것으로 센다', () => {
  const result = readDetectEvents(Array.from({ length: 10005 }, () => normal));
  assert.equal(result.events.length, 10000);
  assert.equal(result.rejected, 5);
});


const START = Date.UTC(2026, 9, 1, 0, 0, 0);
function reads(count, { network, owner = 'learner_fixture', step = 2, unusualAt = -1 } = {}) {
  return Array.from({ length: count }, (_, i) => ({
    at: new Date(START + i * step * 1000).toISOString(), method: 'GET', identity: { sub: owner },
    ...(network ? { network: i === unusualAt || unusualAt === -1 ? network : 'usual' } : {}),
  }));
}

test('정상 사건은 전과 똑같이 observe 하나만 돌려준다', () => {
  assert.deepEqual(detect([normal, suspicious]), { action: 'observe' });
  assert.deepEqual(detect(reads(30, { network: 'usual' })), { action: 'observe' });
});

test('다량 조회와 낯선 네트워크가 함께일 때만 의심', () => {
  const both = detect(reads(121, { network: 'unusual', unusualAt: 60 }));
  assert.deepEqual(both, { action: 'observe',
    suspicious: [{ subject: 'learner_fixture', reasonCode: 'unusual_network_burst', deviceId: null }] });
  assert.deepEqual(detect(reads(121, { network: 'usual' })), { action: 'observe' });
  assert.deepEqual(detect(reads(100, { network: 'unusual' })), { action: 'observe' });
  assert.deepEqual(detect(reads(120, { network: 'unusual' })), { action: 'observe' });
});

test('낯선 네트워크 사건이 조회 구간 밖이면 의심이 아니다', () => {
  const burst = reads(121, { network: 'usual' });
  const far = { at: new Date(START + 3 * 3600 * 1000).toISOString(), method: 'GET',
    identity: { sub: 'learner_fixture' }, network: 'unusual' };
  assert.deepEqual(detect([...burst, far]), { action: 'observe' });
});

test('사용자·요청 종류·10분 구간이 다르면 합산하지 않는다', () => {
  const mixed = [...reads(70, { network: 'unusual' }), ...reads(70, { network: 'unusual', owner: 'other_fixture' })];
  assert.deepEqual(detect(mixed), { action: 'observe' });
  assert.deepEqual(detect(reads(121, { network: 'unusual' }).map(e => ({ ...e, method: 'PUT' }))), { action: 'observe' });
  assert.deepEqual(detect(reads(200, { network: 'unusual', step: 7 })), { action: 'observe' });
});

test('의심 결과에는 사용자와 이유 코드만 있고 순서가 뒤섞여도 같다', () => {
  const shuffled = reads(121, { network: 'unusual' }).reverse();
  const result = findCompoundSuspects(readDetectEvents(shuffled).events);
  assert.deepEqual(result, [{ subject: 'learner_fixture', reasonCode: 'unusual_network_burst', deviceId: null }]);
  const text = JSON.stringify(detect([{ ...normal, body: 'MEMO_TEXT', token: 'TOKEN_VALUE' }]));
  assert.ok(!text.includes('MEMO_TEXT') && !text.includes('TOKEN_VALUE'));
});

test('이상한 network 값은 낯선 것으로 치지 않고 네트워크 값이 없는 사건으로 본다', () => {
  for (const network of ['UNUSUAL', 'foreign', 1, {}]) assert.equal(readDetectEvent({ ...normal, network }).network, null);
  const result = detect(reads(121).map(e => ({ ...e, network: 'UNUSUAL' })));
  assert.notEqual(result.reasonCode, 'unusual_network_burst');
  assert.deepEqual(result, { action: 'propose_revocation', reasonCode: 'burst_read', subject: 'learner_fixture' });
});

test('계약 모양 사건(네트워크 값 없음)은 계약대로 120건 초과만 회수 제안', async () => {
  assert.deepEqual(detect(reads(121)), { action: 'propose_revocation', reasonCode: 'burst_read', subject: 'learner_fixture' });
  assert.deepEqual(detect(reads(120)), { action: 'observe' });
  const twoUsers = [...reads(121), ...reads(30, { owner: 'other_fixture' })];
  assert.equal(detect(twoUsers).subject, 'learner_fixture');
  const results = await checkDetection(detect);
  assert.deepEqual(results.filter(item => !item.passed), []);
});

const DEVICE_A = '0123456789abcdef';
const DEVICE_B = 'fedcba9876543210';
function withDevices(events, pick) {
  return events.map((e, i) => ({ ...e, deviceId: pick(i, e) }));
}

test('복합 의심에 기기 한 개가 확인되면 대상·이유가 있는 회수 제안을 낸다', () => {
  const events = withDevices(reads(121, { network: 'unusual', unusualAt: 60 }), () => DEVICE_A);
  const result = detect(events);
  assert.equal(result.action, 'propose_revocation');
  assert.equal(result.reasonCode, 'unusual_network_burst');
  assert.equal(result.subject, 'learner_fixture');
  assert.equal(result.deviceId, DEVICE_A);
});

test('낯선 네트워크 사건의 기기만 대상이고 같은 사용자의 정상 기기는 대상이 아니다', () => {
  const events = withDevices(reads(121, { network: 'unusual', unusualAt: 60 }), i => (i === 60 ? DEVICE_B : DEVICE_A));
  assert.equal(detect(events).deviceId, DEVICE_B);
});

test('낯선 네트워크 기기가 둘 이상이거나 기기 값이 없으면 제안하지 않는다', () => {
  const two = withDevices(reads(121, { network: 'unusual' }), i => (i % 2 ? DEVICE_A : DEVICE_B));
  const noDevice = reads(121, { network: 'unusual' });
  const badDevice = withDevices(reads(121, { network: 'unusual' }), () => 'NOT-A-DEVICE');
  for (const events of [two, noDevice, badDevice]) {
    const result = detect(events);
    assert.equal(result.action, 'observe');
    assert.equal(result.suspicious.length, 1);
  }
});

test('정상 사건은 회수 제안을 내지 않는다', () => {
  for (const events of [
    withDevices(reads(121, { network: 'usual' }), () => DEVICE_A),
    withDevices(reads(120, { network: 'unusual' }), () => DEVICE_A),
    withDevices(reads(30, { network: 'unusual' }), () => DEVICE_A),
    [normal, suspicious],
  ]) assert.deepEqual(detect(events), { action: 'observe' });
});

test('회수 제안은 정해진 값만 담고 비밀값을 복사하지 않는다', () => {
  const events = withDevices(reads(121, { network: 'unusual' }), () => DEVICE_A)
    .map(e => ({ ...e, body: 'MEMO_TEXT', token: 'TOKEN_VALUE' }));
  const result = detect(events);
  assert.deepEqual(Object.keys(result), ['action', 'reasonCode', 'subject', 'deviceId', 'suspicious']);
  const text = JSON.stringify(result);
  assert.ok(!text.includes('MEMO_TEXT') && !text.includes('TOKEN_VALUE'));
});
